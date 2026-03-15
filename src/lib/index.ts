/**
 * tracking/index.ts
 * -----------------
 * Entry point: export ทุกอย่างที่ MCP server ต้องการ
 *
 * ใช้ใน MCP server:
 *
 *   import { metricsTools, createMetricsHandler } from './tracking/index.js'
 *
 *   const handler = createMetricsHandler(db)
 *
 *   for (const tool of metricsTools) {
 *     server.tool(tool.name, tool.description, tool.inputSchema, (args) =>
 *       handler(tool.name, args as Record<string, unknown>)
 *     )
 *   }
 */

export { metricsTools, createMetricsHandler } from './metrics.js'
export { createHookSystem }                    from './hooks.js'
export type { InvocationContext, ErrorType, PreInvocationPayload,
              PostInvocationPayload, AssertionInput } from './hooks.js'
export { skillInvocationLogs, assertionResults }     from './schema.js'
export type { SkillInvocationLog, NewSkillInvocationLog,
              AssertionResult }                       from './schema.js'
