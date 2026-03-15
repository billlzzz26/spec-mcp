/**
 * types.ts
 * --------
 * Type definitions for Skill Catalog
 */

// ─── Skill Types ──────────────────────────────────────────────────────────────

export interface RawSkill {
  id: string
  name: string
  description: string
  tags?: string[]
  path: string
}

export interface CatalogSkill {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  triggers: string[]
  path: string
}

export interface Catalog {
  generatedAt: string
  total: number
  skills: CatalogSkill[]
}

export interface BundleData {
  bundles: Record<string, { description: string; skills: string[] }>
  common: string[]
}

export interface BuildCatalogOptions {
  skillsDir: string
  configPath: string
  outputDir?: string
}

export interface CatalogResult {
  catalog: Catalog
  aliases: Record<string, string>
  bundleData: BundleData
}

// ─── MCP Tool Handler Types ──────────────────────────────────────────────────

export interface CatalogState {
  catalog: Catalog
  aliases: Record<string, string>
  bundleData: BundleData
  config: any // SkillsConfig - avoid circular dependency
  configPath: string
  skillsDir: string
}
