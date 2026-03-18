import { z } from "zod";

// Modal deployment URL
const WORKSPACE = "billlzzz10";
const BASE_MODAL_URL = `https://${WORKSPACE}--skill-embedding-service`;

const INDEX_URL = `${BASE_MODAL_URL}-index-skill-http.modal.run`;

// API Key from environment
const API_KEY = process.env.SKILL_SERVICE_API_KEY || "";

/**
 * postRequest — ส่ง POST ไปยัง Modal endpoint
 * แยกออกมาเป็น helper เพราะ tools หลายตัวใช้ร่วมกัน
 * (ในอนาคตควร refactor ไปเป็น shared utility)
 */
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

/**
 * indexSkillTool — Index skill ใหม่เข้า vector database
 *
 * สร้าง embedding สำหรับ skill แล้วเก็บใน Zilliz Cloud
 * เพื่อให้ค้นหาผ่าน semantic search ได้ในภายหลัง
 */
export const indexSkillTool = {
  name: "index_skill",
  description: `Index a new skill into the embedding database.

This tool creates an embedding for a skill and stores it in the vector database
for future semantic search.

Args:
  - skill_id (string): Unique identifier for the skill
  - skill_name (string): Display name of the skill
  - description (string): Detailed description of what the skill does
  - capabilities (string[]): Array of capability tags
  - plugin_domain (string, optional): Domain category
  - provider_id (string, optional): Provider identifier
  - version (string, optional): Version string (default: "1.0.0")

Returns:
  Object with status and skill_id on success, or error message on failure.`,
  inputSchema: z.object({
    skill_id: z.string()
      .min(1, "skill_id is required")
      .max(256, "skill_id must not exceed 256 characters")
      .describe("Unique identifier for the skill"),
    skill_name: z.string()
      .min(1, "skill_name is required")
      .max(256, "skill_name must not exceed 256 characters")
      .describe("Display name of the skill"),
    description: z.string()
      .min(10, "Description must be at least 10 characters")
      .max(4096, "Description must not exceed 4096 characters")
      .describe("Detailed description of the skill"),
    capabilities: z.array(z.string())
      .min(1, "At least one capability is required")
      .describe("Array of capability tags"),
    plugin_domain: z.string()
      .optional()
      .describe("Domain category"),
    provider_id: z.string()
      .optional()
      .describe("Provider identifier"),
    version: z.string()
      .optional()
      .default("1.0.0")
      .describe("Version string"),
  }).strict(),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async (params: {
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
        content: [{
          type: "text" as const,
          text: typedResult.status === "success"
            ? `Successfully indexed skill: ${params.skill_name} (${params.skill_id})`
            : `Failed to index skill: ${JSON.stringify(result)}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Error indexing skill: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  },
};
