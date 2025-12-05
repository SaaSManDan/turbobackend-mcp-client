/**
 * MCP Tools Registry
 * Defines available tools and their input schemas
 */

export function getToolDefinitions() {
  return [
    {
      name: "spin_up_new_backend_project",
      description: "Creates a new Nitro.js backend project with optional features. This is a long-running operation that streams progress updates.",
      inputSchema: {
        type: "object",
        properties: {
          userPrompt: {
            type: "string",
            description: "The original user prompt/request that triggered this tool call"
          },
          projectName: {
            type: "string",
            description: "Name of the new backend project"
          },
          includeAuth: {
            type: "boolean",
            description: "Include Clerk authentication setup"
          },
          includeDatabase: {
            type: "boolean",
            description: "Include Postgres database setup"
          },
          includeRedis: {
            type: "boolean",
            description: "Include Redis setup"
          },
          includeEmail: {
            type: "boolean",
            description: "Include email service setup"
          }
        },
        required: ["projectName"]
      }
    },
    // {
    //   name: "modify_backend_code",
    //   description: "Modifies or adds code to an existing backend project. Streams progress updates.",
    //   inputSchema: {
    //     type: "object",
    //     properties: {
    //       userPrompt: {
    //         type: "string",
    //         description: "The original user prompt/request that triggered this tool call"
    //       },
    //       projectPath: {
    //         type: "string",
    //         description: "Path to the backend project"
    //       },
    //       modificationType: {
    //         type: "string",
    //         enum: ["add_route", "add_middleware", "add_service", "add_database_table", "modify_existing_file"],
    //         description: "Type of modification to perform"
    //       },
    //       fileContent: {
    //         type: "string",
    //         description: "The code content to add or modify"
    //       },
    //       filePath: {
    //         type: "string",
    //         description: "Relative path where file should be created/modified"
    //       },
    //       additionalContext: {
    //         type: "object",
    //         description: "Extra parameters based on modification type"
    //       }
    //     },
    //     required: ["projectPath", "modificationType", "fileContent", "filePath"]
    //   }
    // },
    {
      name: "modifyProject",
      description: "Request modifications to an existing backend project. Accepts natural language modification requests that will be processed by an AI agent. This is a long-running operation that streams progress updates.",
      inputSchema: {
        type: "object",
        properties: {
          modificationRequest: {
            type: "string",
            description: "Natural language description of the modification to make (e.g., 'Add a new GET /users/:id endpoint', 'Create a middleware for rate limiting', 'Add a new database table for storing user preferences')"
          }
        },
        required: ["modificationRequest"]
      }
    }
  ];
}
