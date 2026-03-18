/**
 * src/mcp/server/tools/index.ts
 * ─────────────────────────────
 * Barrel exports สำหรับ MCP tools
 *
 * ใช้:
 *   import { searchSkillsTool, indexSkillTool, createCollectionTool, healthCheckTool } from '@/mcp/server/tools'
 */

export { searchSkillsTool } from './search.js'
export { indexSkillTool } from './index.js'
export { createCollectionTool } from './create-collection.js'
export { healthCheckTool } from './health-check.js'
