import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createCatalogHandler } from "./catalog/catalog";

const WORKSPACE = "billlzzz10";
const BASE_MODAL_URL = `https://${WORKSPACE}--skill-embedding-service`;
const SEARCH_URL = `${BASE_MODAL_URL}-search-skills-http.modal.run`;
const API_KEY = process.env.SKILL_SERVICE_API_KEY || "";
const SKILLS_DIR = process.env.SKILLS_DIR || "./skills";
const CONFIG_PATH = process.env.CONFIG_PATH || "./skilldex.config.json";

// Create catalog handler
const catalogHandler = createCatalogHandler({
  skillsDir: SKILLS_DIR,
  configPath: CONFIG_PATH,
});

async function postRequest(endpoint: string, data: unknown): Promise<unknown> {
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

const server = new McpServer({
  name: "skill-embedding-service",
  version: "1.0.0",
});

server.registerTool(
  "search_skills",
  {
    title: "Search Skills",
    description:
      "Search for skills using semantic search with AI-powered reranking.",
    inputSchema: z
      .object({
        query: z.string().min(1).max(500),
        top_k: z.number().int().min(1).max(20).default(5),
        filter_expr: z.string().optional(),
      })
      .strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params: { query: string; top_k: number; filter_expr?: string }) => {
    try {
      const results = await postRequest(SEARCH_URL, {
        query: params.query,
        top_k_rerank: params.top_k,
        filter_expr: params.filter_expr,
      });

      if (!Array.isArray(results) || results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: Array.isArray(results)
                ? `No skills found matching "${params.query}"`
                : JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      const lines = [
        `# Search Results for "${params.query}"`,
        "",
        `Found ${results.length} skill(s):`,
        "",
      ];

      for (const skill of results) {
        lines.push(`## ${skill.skill_name} (\`${skill.skill_id}\`)`);
        lines.push("");
        lines.push(skill.description);
        if (skill.capabilities?.length > 0) {
          lines.push(`**Capabilities**: ${skill.capabilities.join(", ")}`);
        }
        if (skill.rerank_score) {
          lines.push(`**Relevance Score**: ${skill.rerank_score.toFixed(3)}`);
        }
        lines.push("---");
        lines.push("");
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
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

export const GET = async () => {
  return new Response(
    JSON.stringify({ status: "ok", tools: ["search_skills"] }),
    { headers: { "Content-Type": "application/json" } },
  );
};

export const POST = async () => {
  return new Response(
    JSON.stringify({ error: "Use MCP protocol for tool calls" }),
    { status: 405, headers: { "Content-Type": "application/json" } },
  );
};

export { server };

// Register catalog tools using handler
server.registerTool(
  "list_skills",
  {
    title: "List Skills",
    description: "List all available skills with optional filtering.",
    inputSchema: z
      .object({
        category: z.string().optional(),
        bundle: z.string().optional(),
        limit: z.number().default(50),
      })
      .strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: { category?: string; bundle?: string; limit?: number }) => {
    try {
      const result = catalogHandler("list_skills", params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
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

server.registerTool(
  "get_skill",
  {
    title: "Get Skill",
    description: "Get full detail of a skill by id or alias.",
    inputSchema: z
      .object({
        id: z.string(),
      })
      .strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: { id: string }) => {
    try {
      const result = catalogHandler("get_skill", params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
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

server.registerTool(
  "list_bundles",
  {
    title: "List Bundles",
    description: "List all bundles and their included skills.",
    inputSchema: z.object({}).strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    try {
      const result = catalogHandler("list_bundles", {});
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
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
