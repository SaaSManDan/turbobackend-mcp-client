# MCP Package Implementation Guide

## Using Code from Backend Repo

You've copied these files from the backend repo:
- `mcpTools.js` - Contains tool definitions (names, descriptions, schemas)
- `mcpHandler.js` - Reference for understanding the backend's expected request/response format
- `sseStream.js` - Reference for understanding the SSE event format

**How to use them:**
- Import `getToolDefinitions()` from `mcpTools.js` to get tool definitions
- Reference `mcpHandler.js` to see what JSON-RPC format the backend expects
- Reference `sseStream.js` to understand the SSE event structure you'll be parsing

## Part 3: Write the Code

**7. Import dependencies at the top of index.js**
- Import Server from MCP SDK
- Import StdioServerTransport from MCP SDK
- Import fetch (if needed)
- Import EventSource or eventsource-parser

**8. Read environment variables**
- Read `process.env.TURBOBACKEND_API_KEY`
- Read `process.env.TURBOBACKEND_API_URL` (default to your production URL like `https://api.turbobackend.com`)
- If API key is missing, log error to stderr and exit with code 1
  - stderr = standard error, where error messages go (not stdout)
  - Exit code 1 means error (0 means success)

**9. Create the MCP Server instance**
- Create new Server with name "turbobackend" and version "1.0.0"
- This object handles all MCP protocol communication

**10. Define your tools**
- Use the `getToolDefinitions()` function from `mcpTools.js`
- This file already has all your tool definitions with names, descriptions, and input schemas
- Import it: `import { getToolDefinitions } from './mcpTools.js'`
- Call it to get the array of tools

**11. Register tools/list handler**
- Use `server.setRequestHandler` for the "tools/list" method
- Call `getToolDefinitions()` and return the result
- This tells the IDE what tools are available

**12. Register tools/call handler**
- Use `server.setRequestHandler` for the "tools/call" method
- Extract tool name and arguments from the request
- Make HTTP POST to `${TURBOBACKEND_API_URL}/mcp` (your backend's MCP endpoint)
- Send a JSON-RPC formatted request body:
  - `jsonrpc: "2.0"`
  - `method: "tools/call"`
  - `params: { name: toolName, arguments: toolArguments }`
  - `id: <unique-id>`
- Include Authorization header: `Bearer ${TURBOBACKEND_API_KEY}`
- The backend will handle the actual execution (you can reference `mcpHandler.js` to see what it expects)

**13. Handle streaming responses from backend**
- Your backend returns SSE (Server-Sent Events) for tool calls
- Parse the SSE stream using eventsource-parser
- Look for events with these types (check `sseStream.js` in backend for format):
  - Progress events: contain `{ message: string, progress: number }`
  - Complete event: contains `{ complete: true, content: string, isError: boolean }`
- For progress events, send MCP notifications to the IDE:
  - Use `server.notification()` method with progress info
- For complete event, return the final result to the IDE
- Handle any errors in the stream

**14. Start the server**
- Create StdioServerTransport instance
- Call `server.connect(transport)`
- Add error handling for connection issues
- Log any errors to stderr (never to stdout - that's reserved for MCP messages)

## Part 4: Test Locally

**15. Link the package locally**
- In your package directory, run: `npm link`
  - This creates a global symlink to your local package
  - Lets you test it as if it were installed from npm
- Verify it worked: `which turbobackend-mcp` should show a path

**16. Configure in your IDE**
- Open your IDE's mcp.json config file
- Add your server:
```json
{
  "mcpServers": {
    "turbobackend": {
      "command": "turbobackend-mcp",
      "env": {
        "TURBOBACKEND_API_KEY": "your-test-key-here",
        "TURBOBACKEND_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

**17. Test it**
- Restart your IDE or reconnect the MCP server
- Check the MCP output panel for any errors
- Try using one of your tools in the IDE
- Check your backend logs to see if requests are coming through

**18. Debug if needed**
- Check stderr output in IDE's MCP panel
- Add console.error() statements (they go to stderr)
- Verify API key is being read correctly
- Verify HTTP requests are reaching your backend
- Check that responses are being parsed correctly

## Part 5: Publish to npm

**19. Create npm account**
- Go to npmjs.com
- Sign up for an account
- Verify your email

**20. Login from terminal**
- Run: `npm login`
- Enter your npm username, password, and email
- You'll get a one-time password via email

**21. Publish the package**
- Run: `npm publish --access public`
  - `--access public` is required for scoped packages (@turbobackend/...)
  - Without it, npm tries to publish as private (requires paid account)
- Your package is now live on npm!

**22. Test the published package**
- Unlink your local version: `npm unlink -g turbobackend-mcp`
- Update your IDE's mcp.json to use npx:
```json
{
  "mcpServers": {
    "turbobackend": {
      "command": "npx",
      "args": ["-y", "@turbobackend/mcp-server"],
      "env": {
        "TURBOBACKEND_API_KEY": "your-key",
        "TURBOBACKEND_API_URL": "https://api.turbobackend.com"
      }
    }
  }
}
```
- npx will download and run your package automatically
- `-y` flag skips the confirmation prompt

**23. Create a README.md**
- Explain what your package does
- Show installation instructions
- Show example mcp.json configuration
- Explain how to get an API key
- List available tools

## Part 6: Updates

**24. When you need to update**
- Make your changes
- Update version in package.json (follow semver: major.minor.patch)
  - Patch (1.0.1): bug fixes
  - Minor (1.1.0): new features, backwards compatible
  - Major (2.0.0): breaking changes
- Run: `npm publish` again
- Users will get the update next time they run npx
