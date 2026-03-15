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

// Create collection tool definition
export const createCollectionTool = {
  name: "create_collection",
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
  inputSchema: z.object({
    drop_if_exists: z.boolean()
      .optional()
      .default(false)
      .describe("If true, drops existing collection first (DESTRUCTIVE!)"),
  }).strict(),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async (params: { drop_if_exists: boolean }) => {
    try {
      const result = await postRequest(COLLECTION_URL, {
        drop_if_exists: params.drop_if_exists,
      });

      return {
        content: [{
          type: "text" as const,
          text: result.status === "success"
            ? `Successfully created collection: ${result.collection} (dimension: ${result.dimension})`
            : `Failed to create collection: ${JSON.stringify(result)}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Error creating collection: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  },
};