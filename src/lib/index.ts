/**
 * tracking/index.ts
 * -----------------
 * Entry point: export ทุกอย่างที่ MCP server ต้องการ
 *
 * ใช้ใน MCP server:
 *
 *   import { metricsTools, createMetricsHandler } from './tracking/index'
 *
 *   const handler = createMetricsHandler(db)
 *
 *   for (const tool of metricsTools) {
 *     server.tool(tool.name, tool.description, tool.inputSchema, (args) =>
 *       handler(tool.name, args as Record<string, unknown>)
 *     )
 *   }
 */

export { metricsTools, createMetricsHandler } from './metrics'
export { createHookSystem }                    from './hooks'
export type { InvocationContext, ErrorType, PreInvocationPayload,
              PostInvocationPayload, AssertionInput } from './hooks'
export { skillInvocationLogs, assertionResults }     from './schema'
export type { SkillInvocationLog, NewSkillInvocationLog,
              AssertionResult }                       from './schema'
