/**
 * types.ts
 * --------
 * Shared MCP types for Skill Service
 */

// ─── MCP Tool Definition ──────────────────────────────────────────────────────

export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description?: string
      enum?: string[]
      required?: string[]
    }>
    required?: string[]
  }
}

// ─── Skill Metadata ───────────────────────────────────────────────────────────

export interface SkillMetadata {
  skill_id: string
  skill_name: string
  description: string
  capabilities: string[]
  plugin_domain?: string
  provider_id?: string
  version?: string
  rerank_score?: number
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface APIResponse<T = unknown> {
  status: 'success' | 'error'
  data?: T
  error?: string
}

export interface SearchResponse {
  query: string
  total: number
  results: SkillMetadata[]
}

export interface IndexResponse {
  status: string
  skill_id?: string
  error?: string
}

export interface CollectionResponse {
  status: string
  collection?: string
  dimension?: number
  error?: string
}

export interface HealthResponse {
  status: 'ok' | 'error'
  service?: string
  errors?: Array<{ service: string; error: string }>
}
