/**
 * MCP Request Handler
 * Routes MCP requests to appropriate handlers
 */

import { nanoid } from 'nanoid';
import { getToolDefinitions } from './mcpTools.js';
import { formatSuccess, formatError, formatToolResult } from './mcpFormatter.js';
import { createSSEStream } from './sseStream.js';
import { addJob } from '../services/jobQueue.js';
import pool from '../services/dbConnectors/postgresConnector.js';
import { redis } from '../services/dbConnectors/redisConnector.js';

export async function handleMCPRequest(requestBody, event) {
  try {
    // Validate JSON-RPC format
    if (!requestBody.jsonrpc || requestBody.jsonrpc !== "2.0") {
      return formatError(requestBody.id || null, -32600, "Invalid JSON-RPC version");
    }
    
    if (!requestBody.method) {
      return formatError(requestBody.id || null, -32600, "Missing method");
    }
    
    // Extract project_id, user_id, mcp_key_id from event.context (set by mcpAuth)
    const { project_id, user_id, mcp_key_id } = event.context;
    
    // Handle different methods
    if (requestBody.method === "tools/list") {
      const tools = getToolDefinitions();
      return formatSuccess(requestBody.id, { tools });
    }
    
    if (requestBody.method === "tools/call") {
      // Validate params
      if (!requestBody.params || !requestBody.params.name) {
        return formatError(requestBody.id, -32602, "Missing tool name");
      }
      
      const toolName = requestBody.params.name;
      const toolArguments = requestBody.params.arguments || {};
      
      // Generate unique streamId and request_id
      const streamId = nanoid();
      const request_id = nanoid();
      const created_at = Math.floor(Date.now() / 1000);
      
      // Insert record into mcp_requests table
      try {
        await pool.query(
          `INSERT INTO ${process.env.PG_DB_SCHEMA}.mcp_requests 
           (request_id, mcp_key_id, tool_name, request_params, response_status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [request_id, mcp_key_id, toolName, JSON.stringify(toolArguments), 'pending', created_at]
        );
      } catch (dbError) {
        console.error('Database error:', dbError);
        return formatError(requestBody.id, -32603, "Internal error: Failed to create request record");
      }
      
      // Create SSE stream
      const stream = createSSEStream(event);
      
      // Send initial empty event
      stream.sendEvent(1, "");
      
      // Add job to queue
      const queueName = toolName === "spin_up_new_backend_project" ? "spin-up-project" : "modify-code";
      
      try {
        await addJob(queueName, {
          project_id,
          user_id,
          request_id,
          toolName,
          params: toolArguments
        }, streamId);
      } catch (jobError) {
        console.error('Job queue error:', jobError);
        
        // Update mcp_requests table with error status
        await pool.query(
          `UPDATE ${process.env.PG_DB_SCHEMA}.mcp_requests 
           SET response_status = $1 
           WHERE request_id = $2`,
          ['error', request_id]
        );
        
        const errorResult = formatSuccess(requestBody.id, formatToolResult("Failed to queue job", true));
        stream.sendComplete(errorResult);
        stream.close();
        return;
      }
      
      // Subscribe to Redis pub/sub for streamId
      const subscriber = redis.duplicate();
      await subscriber.subscribe(streamId);
      
      subscriber.on('message', async function(channel, message) {
        try {
          const data = JSON.parse(message);
          
          if (data.complete) {
            // Update mcp_requests table with final status
            const finalStatus = data.isError ? 'error' : 'success';
            await pool.query(
              `UPDATE ${process.env.PG_DB_SCHEMA}.mcp_requests 
               SET response_status = $1 
               WHERE request_id = $2`,
              [finalStatus, request_id]
            );
            
            // Send final result
            const result = formatSuccess(requestBody.id, formatToolResult(data.content, data.isError));
            stream.sendComplete(result);
            
            // Cleanup
            await subscriber.unsubscribe(streamId);
            await subscriber.quit();
            stream.close();
          } else {
            // Send progress update
            stream.sendProgress(data.message, data.progress || 0);
          }
        } catch (parseError) {
          console.error('Error parsing Redis message:', parseError);
        }
      });
      
      // Don't return anything - SSE stream is handling the response
      return;
    }
    
    // Method not found
    return formatError(requestBody.id, -32601, `Method not found: ${requestBody.method}`);
    
  } catch (error) {
    console.error('MCP Handler error:', error);
    return formatError(requestBody.id || null, -32603, "Internal error");
  }
}
