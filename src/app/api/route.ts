import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { server as baseServer } from "@/mcp/server/index.js";
import { createCatalogHandler, catalogTools } from "@/mcp/catalog/handler.js";

// Resolve base URL — ใช้ environment variables เพื่อหา base URL (production, ngrok, local)
function getBaseUrl(): string {
  if (process.env.NGROK_URL) return process.env.NGROK_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.BASE_URL) return process.env.BASE_URL;
  return "http://localhost:3000";
}

// Reuse MCP server instance from src/mcp/server/index.ts
const server = baseServer;

// Initialize catalog handler
// ใช้ default paths หรือสำหรับ production ควร mount actual skill directory
const catalogHandler = createCatalogHandler({
  skillsDir: process.env.SKILLS_DIR || "./skills",
  configPath: process.env.CONFIG_PATH || "./src/mcp/catalog/config/skills.config.json",
});

// Register catalog tools
// Wrap catalog tools ให้ทำงานกับ MCP server
for (const toolDef of catalogTools) {
  server.registerTool(
    toolDef.name,
    {
      title: toolDef.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      description: toolDef.description,
      inputSchema: toolDef.inputSchema as any,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (params: any) => {
      try {
        const result = catalogHandler(toolDef.name, params);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}

// Export request handler for Next.js App Router
export const GET = async (request: Request) => {
  try {
    // Self-fetch widget UI สำหรับ MCP host
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
    return new Response(JSON.stringify({ error: "Failed to fetch widget" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST = async (request: Request) => {
  // TODO: Implement MCP protocol message handler (e.g., JSON-RPC over HTTP)
  return new Response(JSON.stringify({ error: "Use GET for MCP resource" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export { server };
