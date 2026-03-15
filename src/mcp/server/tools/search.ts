import { z } from "zod";

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

// Search skills tool definition
export const searchSkillsTool = {
  name: "search_skills",
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
  inputSchema: z.object({
    query: z.string()
      .min(1, "Query is required")
      .max(500, "Query must not exceed 500 characters")
      .describe("Natural language search query"),
    top_k: z.number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("Maximum number of results to return"),
    filter_expr: z.string()
      .optional()
      .describe("Optional Milvus filter expression"),
  }).strict(),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async (params: { query: string; top_k: number; filter_expr?: string }) => {
    try {
      const results = await postRequest(SEARCH_URL, {
        query: params.query,
        top_k_rerank: params.top_k,
        filter_expr: params.filter_expr,
      });

      if (!Array.isArray(results)) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      if (results.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: `No skills found matching "${params.query}"`,
          }],
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
        content: [{
          type: "text" as const,
          text: lines.join("\n"),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Error searching skills: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  },
};