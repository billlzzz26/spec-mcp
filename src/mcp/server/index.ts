import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Import tool definitions
import { searchSkillsTool } from "./tools/search";
import { indexSkillTool } from "./tools/index";
import { createCollectionTool } from "./tools/create-collection";
import { healthCheckTool } from "./tools/health-check";

// Resolve base URL
function getBaseUrl(): string {
  if (process.env.NGROK_URL) return process.env.NGROK_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.BASE_URL) return process.env.BASE_URL;
  return "http://localhost:3000";
}

// Modal deployment URL
const WORKSPACE = "billlzzz10";
const BASE_MODAL_URL = `https://${WORKSPACE}--skill-embedding-service`;

const SEARCH_URL = `${BASE_MODAL_URL}-search-skills-http.modal.run`;
const INDEX_URL = `${BASE_MODAL_URL}-index-skill-http.modal.run`;
const COLLECTION_URL = `${BASE_MODAL_URL}-create-collection-http.modal.run`;

// API Key from environment
const API_KEY = process.env.SKILL_SERVICE_API_KEY || "";

/**
 * Send POST request to Modal endpoint
 */
async function postRequest(endpoint: string, data: any): Promise<any> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Create MCP server instance
const server = new McpServer({
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

// Export request handler for Next.js App Router
export const GET = async (request: Request) => {
  try {
    // Self-fetch the widget UI for MCP host
    const baseUrl = getBaseUrl();
    const widgetUrl = `${baseUrl}/`;
    
    const widgetResponse = await fetch(widgetUrl);
    const widgetHtml = await widgetResponse.text();

    return new Response(widgetHtml, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch widget" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const POST = async (request: Request) => {
  // This would handle MCP protocol messages if needed
  return new Response(
    JSON.stringify({ error: "Use GET for MCP resource" }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
};

export { server };