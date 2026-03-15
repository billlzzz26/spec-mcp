import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import {
  SkillSchema,
  SearchRequestSchema,
  CreateCollectionRequestSchema,
  type Skill,
  type SearchResult,
} from "./types";

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
const HEALTH_URL = `${BASE_MODAL_URL}-health-check.modal.run`;

// API Key from environment
const API_KEY = process.env.SKILL_SERVICE_API_KEY || "";

/**
 * Send POST request to Modal endpoint
 */
async function postRequest<T = unknown>(
  endpoint: string,
  data: unknown,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Send GET request to Modal endpoint
 */
async function getRequest<T = unknown>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorText}`,
    );
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
  "search_skills",
  {
    title: "Search Skills",
    description: `Search for skills using semantic search with AI-powered reranking.

This tool searches the skill embedding database using natural language queries. 
It uses Voyage AI embeddings and reranking to find the most relevant skills.

Args:
  - query (string): Natural language search query (required)
  - top_k (number): Maximum number of results to return (default: 5, max: 20)
  - filter_expr (string, optional): Milvus filter expression (e.g., "plugin_domain == 'development'")

Returns:
  Array of skill objects with:
  - skill_id: Unique identifier
  - skill_name: Display name
  - description: Skill description
  - capabilities: List of capabilities
  - plugin_domain: Domain category
  - provider_id: Provider identifier
  - version: Version string
  - rerank_score: Relevance score from reranking

Examples:
  - "create a new skill for my agent" -> Finds skill creation tools
  - "build html ui with react components" -> Finds frontend/UI skills
  - "generate changelog from git commits" -> Finds git automation skills`,
    inputSchema: z
      .object({
        query: z
          .string()
          .min(1, "Query is required")
          .max(500, "Query must not exceed 500 characters")
          .describe("Natural language search query"),
        top_k: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(5)
          .describe("Maximum number of results to return"),
        filter_expr: z
          .string()
          .optional()
          .describe("Optional Milvus filter expression"),
      })
      .strict(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params: { query: string; top_k: number; filter_expr?: string }): Promise<{ content: TextContent[] }> => {
    try {
      const results = await postRequest(SEARCH_URL, {
        query: params.query,
        top_k_rerank: params.top_k,
        filter_expr: params.filter_expr,
      });

      if (!Array.isArray(results)) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No skills found matching "${params.query}"`,
            },
          ],
        };
      }

      // Format as markdown
      const lines: string[] = [
        `# Search Results for "${params.query}"`,
        "",
        `Found ${results.length} skill(s):`,
        "",
      ];

      for (const skill of results) {
        lines.push(`## ${skill.skill_name} (\`${skill.skill_id}\`)`);
        lines.push("");
        lines.push(skill.description);
        lines.push("");
        if (skill.capabilities?.length > 0) {
          lines.push(`**Capabilities**: ${skill.capabilities.join(", ")}`);
          lines.push("");
        }
        if (skill.plugin_domain) {
          lines.push(`**Domain**: ${skill.plugin_domain}`);
          lines.push("");
        }
        if (skill.version) {
          lines.push(`**Version**: ${skill.version}`);
          lines.push("");
        }
        if (skill.rerank_score) {
          lines.push(`**Relevance Score**: ${skill.rerank_score.toFixed(3)}`);
        }
        lines.push("");
        lines.push("---");
        lines.push("");
      }

      return {
        content: [
          {
            type: "text" as const,
            text: lines.join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error searching skills: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Register index_skill tool
server.registerTool(
  "index_skill",
  {
    title: "Index Skill",
    description: `Index a new skill into the embedding database.

This tool creates an embedding for a skill and stores it in the vector database
for future semantic search.

Args:
  - skill_id (string): Unique identifier for the skill (e.g., "mcp-builder")
  - skill_name (string): Display name of the skill
  - description (string): Detailed description of what the skill does
  - capabilities (string[]): Array of capability tags
  - plugin_domain (string, optional): Domain category (e.g., "development")
  - provider_id (string, optional): Provider identifier
  - version (string, optional): Version string (default: "1.0.0")

Returns:
  Object with status and skill_id on success, or error message on failure.

Examples:
  - Index a new MCP skill: {
      "skill_id": "my-mcp-skill",
      "skill_name": "My MCP Skill",
      "description": "A skill for doing something useful",
      "capabilities": ["mcp", "api"],
      "plugin_domain": "development"
    }`,
    inputSchema: z
      .object({
        skill_id: z
          .string()
          .min(1, "skill_id is required")
          .max(256, "skill_id must not exceed 256 characters")
          .describe("Unique identifier for the skill"),
        skill_name: z
          .string()
          .min(1, "skill_name is required")
          .max(256, "skill_name must not exceed 256 characters")
          .describe("Display name of the skill"),
        description: z
          .string()
          .min(10, "Description must be at least 10 characters")
          .max(4096, "Description must not exceed 4096 characters")
          .describe("Detailed description of the skill"),
        capabilities: z
          .array(z.string())
          .min(1, "At least one capability is required")
          .describe("Array of capability tags"),
        plugin_domain: z.string().optional().describe("Domain category"),
        provider_id: z.string().optional().describe("Provider identifier"),
        version: z
          .string()
          .optional()
          .default("1.0.0")
          .describe("Version string"),
      })
      .strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params: {
    skill_id: string;
    skill_name: string;
    description: string;
    capabilities: string[];
    plugin_domain?: string;
    provider_id?: string;
    version?: string;
  }) => {
    try {
      const result = await postRequest(INDEX_URL, {
        skill_id: params.skill_id,
        skill_name: params.skill_name,
        description: params.description,
        capabilities: params.capabilities,
        plugin_domain: params.plugin_domain || "",
        provider_id: params.provider_id || "",
        version: params.version || "1.0.0",
      });

      const typedResult = result as { status?: string };

      return {
        content: [
          {
            type: "text" as const,
            text:
              typedResult.status === "success"
                ? `Successfully indexed skill: ${params.skill_name} (${params.skill_id})`
                : `Failed to index skill: ${JSON.stringify(result)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error indexing skill: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Register create_collection tool
server.registerTool(
  "create_collection",
  {
    title: "Create Collection",
    description: `Create a new Zilliz vector database collection for skill embeddings.

This tool initializes the vector database collection that stores skill embeddings.
Run this once before indexing any skills.

Args:
  - drop_if_exists (boolean, optional): If true, drops existing collection before creating new one.
    WARNING: This will delete all indexed skills! Use with caution.

Returns:
  Object with status, collection name, and dimension on success.

Examples:
  - Create new collection: {}
  - Recreate collection (WARNING: deletes all data): {"drop_if_exists": true}`,
    inputSchema: z
      .object({
        drop_if_exists: z
          .boolean()
          .optional()
          .default(false)
          .describe("If true, drops existing collection first (DESTRUCTIVE!)"),
      })
      .strict(),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async (params: { drop_if_exists: boolean }) => {
    try {
      const result = await postRequest(COLLECTION_URL, {
        drop_if_exists: params.drop_if_exists,
      });

      const typedResult = result as { status?: string; collection?: string; dimension?: number };

      return {
        content: [
          {
            type: "text" as const,
            text:
              typedResult.status === "success"
                ? `Successfully created collection: ${typedResult.collection} (dimension: ${typedResult.dimension})`
                : `Failed to create collection: ${JSON.stringify(result)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error creating collection: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
);

// Register health_check tool
server.registerTool(
  "health_check",
  {
    title: "Health Check",
    description: `Check the health status of the skill embedding service.

This tool verifies that all backend services (Voyage AI, Zilliz) are operational.

Args: None

Returns:
  Object with status and detailed error information if any service is down.

Examples:
  - Check service health: {}`,
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
      const healthUrl = `${BASE_MODAL_URL}-health-check.modal.run`;
      const result = await fetch(healthUrl, {
        method: "GET",
        headers: {
          ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
        },
      }).then((r) => r.json());

      return {
        content: [
          {
            type: "text" as const,
            text:
              result.status === "ok"
                ? "✅ All services are operational"
                : `⚠️ Service issues detected:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  },
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
    return new Response(JSON.stringify({ error: "Failed to fetch widget" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST = async (request: Request) => {
  // This would handle MCP protocol messages if needed
  return new Response(JSON.stringify({ error: "Use GET for MCP resource" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export { server };
