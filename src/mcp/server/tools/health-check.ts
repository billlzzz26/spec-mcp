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

// API Key from environment
const API_KEY = process.env.SKILL_SERVICE_API_KEY || "";

// Health check tool definition
export const healthCheckTool = {
  name: "health_check",
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
  handler: async () => {
    try {
      const healthUrl = `${BASE_MODAL_URL}-health-check.modal.run`;
      const result = await fetch(healthUrl, {
        method: "GET",
        headers: {
          ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
        },
      }).then(r => r.json());

      return {
        content: [{
          type: "text" as const,
          text: result.status === "ok"
            ? "✅ All services are operational"
            : `⚠️ Service issues detected:\n${JSON.stringify(result, null, 2)}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `❌ Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  },
};