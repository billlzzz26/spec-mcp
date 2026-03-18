/**
 * src/app/api/route.ts
 * ─────────────────────
 * Next.js API Route — re-export MCP server instance
 *
 * server/index.ts จัดการ register tools ทั้งหมดแล้ว (search, index, create-collection, health-check)
 * route.ts ทำหน้าที่แค่เป็น HTTP handler สำหรับ Next.js App Router
 * ไม่ต้อง register tools ซ้ำที่นี่ — ถ้า register ซ้ำจะเกิด "Tool already registered" error
 */

import { server } from "@/mcp/server";

// Resolve base URL — ใช้ environment variables เพื่อหา base URL (production, ngrok, local)
function getBaseUrl(): string {
  if (process.env.NGROK_URL) return process.env.NGROK_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.BASE_URL) return process.env.BASE_URL;
  return "http://localhost:3000";
}

// Export request handler for Next.js App Router
export const GET = async (request: Request) => {
  try {
    const baseUrl = getBaseUrl();
    const widgetUrl = `${baseUrl}/`;

    const widgetResponse = await fetch(widgetUrl);
    const widgetHtml = await widgetResponse.text();

    return new Response(widgetHtml, {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch widget" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST = async (request: Request) => {
  return new Response(JSON.stringify({ error: "Use GET for MCP resource" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export { server };
