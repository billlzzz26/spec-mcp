/**
 * src/mcp/catalog/index.ts
 * ─────────────────────────
 * Public catalog API — barrel exports สำหรับ cleaner imports
 *
 * ใช้:
 *   import { buildCatalog, createCatalogHandler } from '@/mcp/catalog'
 *   instead of:
 *   import { buildCatalog } from '@/mcp/catalog/builder'
 *   import { createCatalogHandler } from '@/mcp/catalog/handler'
 */

export { buildCatalog } from './builder.js'
export type { CatalogSkill, Catalog, BundleData, CatalogResult } from './builder.js'

export { createCatalogHandler, catalogTools } from './handler.js'
export type { CatalogState } from './types.js'

export { loadConfig } from './config/index.js'
export type { SkillsConfig } from './config/index.js'
