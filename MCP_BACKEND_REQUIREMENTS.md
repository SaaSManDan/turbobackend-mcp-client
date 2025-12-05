# Backend Requirements for MCP Client

This document lists what the backend needs to support the MCP client package.

## Required Endpoint

### POST `/mcp`

The backend must have an `/mcp` endpoint that:

1. **Accepts POST requests** with JSON body
2. **Validates authentication** via `Authorization: Bearer <API_KEY>` header
3. **Accepts JSON-RPC formatted requests** like:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "spin_up_new_backend_project",
       "arguments": {
         "projectName": "my-app",
         "includeAuth": true
       }
     },
     "id": "123"
   }
   ```
4. **Returns SSE stream** with `Content-Type: text/event-stream` header

## SSE Stream Format

The backend must send Server-Sent Events in this format:

### Progress Events
```
id: 1
data: {"jsonrpc":"2.0","method":"notifications/progress","params":{"progress":25,"message":"Creating project structure..."}}

id: 2
data: {"jsonrpc":"2.0","method":"notifications/progress","params":{"progress":50,"message":"Installing dependencies..."}}
```

### Final Result Event
```
id: 3
data: {"jsonrpc":"2.0","result":{"content":[{"type":"text","text":"Project created successfully!"}]}}
```

### Error Event
```
id: 3
data: {"jsonrpc":"2.0","error":{"code":-32603,"message":"Failed to create project"}}
```

## Authentication Middleware

The backend needs middleware that:
- Validates the API key from `Authorization` header
- Sets context variables like `project_id`, `user_id`, `mcp_key_id`
- Returns 401 if authentication fails

## Tools to Support

The backend must handle these tool names:
1. `spin_up_new_backend_project` - Creates a new Nitro.js backend project
2. `modify_backend_code` - Modifies or adds code to existing projects

## Check Your Backend

Ask your backend Kiro:
"Does this backend have a POST /mcp endpoint that accepts JSON-RPC requests and returns SSE streams? Check if mcpHandler.js exists and is being used in a route."
