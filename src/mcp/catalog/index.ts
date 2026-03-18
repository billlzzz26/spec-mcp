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

export { buildCatalog } from './builder'
export type { CatalogSkill, Catalog, BundleData, CatalogResult } from './builder'

export { createCatalogHandler, catalogTools } from './handler'
export type { CatalogState } from './types'

export { loadConfig } from './config/index'
export type { SkillsConfig } from './config/index'
