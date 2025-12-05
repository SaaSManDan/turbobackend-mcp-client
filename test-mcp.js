#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const server = new McpServer(
  { name: 'test', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.tool(
  'test-tool',
  'A test tool',
  { name: z.string() },
  async function(args) {
    return { content: [{ type: 'text', text: `Hello ${args.name}` }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Test server started');
}

main();
