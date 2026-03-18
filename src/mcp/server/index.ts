import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Import tool definitions จาก modular tools
import { searchSkillsTool } from "./tools/search";
import { indexSkillTool } from "./tools/index_skill";
import { createCollectionTool } from "./tools/create-collection";
import { healthCheckTool } from "./tools/health-check";

// Create MCP server instance
export const server = new McpServer({
  name: "skill-embedding-service",
  version: "1.0.0",
});

// Register search_skills tool
server.registerTool(
  searchSkillsTool.name,
  {
    title: searchSkillsTool.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    description: searchSkillsTool.description,
    inputSchema: searchSkillsTool.inputSchema,
    annotations: searchSkillsTool.annotations,
  },
  searchSkillsTool.handler,
);

// Register index_skill tool
server.registerTool(
  indexSkillTool.name,
  {
    title: indexSkillTool.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    description: indexSkillTool.description,
    inputSchema: indexSkillTool.inputSchema,
    annotations: indexSkillTool.annotations,
  },
  indexSkillTool.handler,
);

// Register create_collection tool
server.registerTool(
  createCollectionTool.name,
  {
    title: createCollectionTool.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    description: createCollectionTool.description,
    inputSchema: createCollectionTool.inputSchema,
    annotations: createCollectionTool.annotations,
  },
  createCollectionTool.handler,
);

// Register health_check tool
server.registerTool(
  healthCheckTool.name,
  {
    title: healthCheckTool.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    description: healthCheckTool.description,
    inputSchema: healthCheckTool.inputSchema,
    annotations: healthCheckTool.annotations,
  },
  healthCheckTool.handler,
);
