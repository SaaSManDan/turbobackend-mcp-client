#!/usr/bin/env node

/**
 * TurboBackend MCP Server Client
 * Connects IDE to TurboBackend API via MCP protocol
 */

// 7. Import dependencies
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createParser } from 'eventsource-parser';
import { getToolDefinitions } from './utils/mcpTools.js';
import { nanoid } from 'nanoid';
import * as z from 'zod/v3';

// 8. Read environment variables
const API_KEY = process.env.TURBOBACKEND_API_KEY;
const API_URL = process.env.TURBOBACKEND_API_URL || 'https://api.turbobackend.com';

if (!API_KEY) {
  console.error('Error: TURBOBACKEND_API_KEY environment variable is required');
  process.exit(1);
}

// 9. Create the MCP Server instance (will be initialized in main)
let mcpServer;

// 12 & 13. Function to call backend tool with streaming support
async function callBackendTool(toolName, toolArguments) {
  // Generate unique request ID
  const requestId = nanoid();
  
  // Add API key to arguments so backend can identify the user
  const argumentsWithKey = {
    ...toolArguments,
    _apiKey: API_KEY
  };
  
  // Prepare JSON-RPC request body
  const requestBody = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: argumentsWithKey
    },
    id: requestId
  };
  
  try {
    // Make HTTP POST to backend MCP endpoint
    const response = await fetch(`${API_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Check if response is SSE stream
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/event-stream')) {
      // Handle streaming response
      return await handleSSEStream(response);
    } else {
      // Handle non-streaming response
      const result = await response.json();
      return result;
    }
    
  } catch (error) {
    console.error('Error calling tool:', error);
    throw error;
  }
}

// 13. Handle streaming responses from backend
async function handleSSEStream(response) {
  let finalResult = null;
  let streamError = null;
  
  const parser = createParser({
    onEvent: function(event) {
      // Handle events without explicit type (defaults to 'message' in SSE)
      if (event.data) {
        try {
          const data = JSON.parse(event.data);

          // Check for progress notifications
          if (data.method === 'notifications/progress') {
            // Send progress notification to IDE
            mcpServer.server.notification({
              method: 'notifications/progress',
              params: data.params
            });
          }
          // Check for final result (JSON-RPC format)
          else if (data.result) {
            finalResult = data.result;
          }
          // Check for final result (plain object format with complete flag)
          else if (data.complete !== undefined) {
            finalResult = data;
          }
          // Check for error
          else if (data.error) {
            streamError = new Error(data.error.message || 'Tool execution failed');
          }

        } catch (parseError) {
          console.error('Error parsing SSE event:', parseError);
        }
      }
    }
  });
  
  // Process the stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      parser.feed(chunk);
    }

    if (streamError) {
      throw streamError;
    }

    if (!finalResult) {
      throw new Error('Stream ended without final result');
    }

    return finalResult;
  } catch (error) {
    console.error('Error reading stream:', error);
    throw error;
  }
}

// 14. Start the server
async function main() {
  try {
    // Create server instance
    mcpServer = new McpServer(
      {
        name: 'turbobackend',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Register tools with Zod v3 schemas
    mcpServer.tool(
      'spin_up_new_backend_project',
      'Creates a new Nitro.js backend project with optional features',
      {
        userPrompt: z.string().optional(),
        projectName: z.string(),
        includeAuth: z.boolean().optional(),
        includeDatabase: z.boolean().optional(),
        includeRedis: z.boolean().optional(),
        includeEmail: z.boolean().optional()
      },
      async function(args) {
        return await callBackendTool('spin_up_new_backend_project', args);
      }
    );

    // mcpServer.tool(
    //   'modify_backend_code',
    //   'Modifies or adds code to an existing backend project',
    //   {
    //     userPrompt: z.string().optional(),
    //     projectPath: z.string(),
    //     modificationType: z.enum(['add_route', 'add_middleware', 'add_service', 'add_database_table', 'modify_existing_file']),
    //     fileContent: z.string(),
    //     filePath: z.string(),
    //     additionalContext: z.record(z.any()).optional()
    //   },
    //   async function(args) {
    //     return await callBackendTool('modify_backend_code', args);
    //   }
    // );

    mcpServer.tool(
      'modifyProject',
      'Request modifications to an existing backend project. Accepts natural language modification requests that will be processed by an AI agent',
      {
        modificationRequest: z.string()
      },
      async function(args) {
        return await callBackendTool('modifyProject', args);
      }
    );

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('TurboBackend MCP server started successfully');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

main();
