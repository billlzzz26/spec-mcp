/**
 * src/lib/metric-api.ts
 * ─────────────────────
 * Service layer สำหรับเรียก Modal backend API
 *
 * ใช้ modal.app.run endpoints:
 *   - search_skills_http: ค้นหา skills
 *   - index_skill_http: index skill ใหม่
 *   - create_collection_http: สร้าง Zilliz collection
 *   - health_check: ตรวจสอบ health
 *
 * ตัวอย่าง:
 *   const results = await searchSkills("react component builder");
 */

import type { MetricType, TimeRange } from './metric-widget'

const MODAL_API_BASE = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://billlzzz26--skill-embedding-service.modal.run'
const API_KEY = process.env.NEXT_PUBLIC_SKILL_SERVICE_API_KEY || 'test-skill-service-key-for-development-only'

// ─── Type Definitions ──────────────────────────────────────────────────────────

export interface SearchSkillParams {
  query: string
  top_k_embedding?: number
  top_k_rerank?: number
  filter_expr?: string
}

export interface SearchResult {
  skill_id: string
  skill_name: string
  description: string
  capabilities: string[]
  plugin_domain: string
  provider_id?: string
  version?: string
  vector_score: number
  rerank_score: number
}

export interface SkillMetadata {
  skill_id: string
  skill_name: string
  description: string
  capabilities: string[]
  plugin_domain: string
  provider_id?: string
  version?: string
}

export interface HealthCheckResult {
  status: 'ok' | 'error'
  service: string
  errors?: Array<{ service: string; error: string }>
}

// ─── Helper: Make HTTP Request ────────────────────────────────────────────────

async function fetchWithAuth<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  body?: any
): Promise<T> {
  const url = `${MODAL_API_BASE}${endpoint}`

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`API Error (${response.status}): ${errorText}`)
  }

  return response.json() as Promise<T>
}

// ─── Public API Functions ──────────────────────────────────────────────────────

/**
 * ค้นหา skills ด้วย semantic search
 *
 * @param query - Natural language query
 * @param topK - จำนวนผลลัพธ์ที่ต้องการ
 * @returns Array of search results
 */
export async function searchSkills(
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  try {
    const results = await fetchWithAuth<SearchResult[]>(
      '/search_skills_http',
      'POST',
      {
        query,
        top_k_embedding: topK * 4, // ค้นหา 4x กว่านั้นก่อน rerank
        top_k_rerank: topK,
      }
    )
    return results
  } catch (error) {
    console.error('[metric-api] searchSkills error:', error)
    return []
  }
}

/**
 * Index skill ใหม่เข้าในระบบ
 *
 * @param metadata - ข้อมูล skill
 * @returns Status response
 */
export async function indexSkill(
  metadata: SkillMetadata
): Promise<{ status: string; skill_id?: string; error?: string }> {
  try {
    return await fetchWithAuth(
      '/index_skill_http',
      'POST',
      metadata
    )
  } catch (error) {
    console.error('[metric-api] indexSkill error:', error)
    return { status: 'error', error: String(error) }
  }
}

/**
 * สร้าง Zilliz collection สำหรับเก็บ embeddings
 *
 * @param dropIfExists - ลบ collection เก่าถ้ามีอยู่
 * @returns Status response
 */
export async function createCollection(
  dropIfExists: boolean = false
): Promise<{ status: string; collection?: string; dimension?: number; error?: string }> {
  try {
    return await fetchWithAuth(
      '/create_collection_http',
      'POST',
      { drop_if_exists: dropIfExists }
    )
  } catch (error) {
    console.error('[metric-api] createCollection error:', error)
    return { status: 'error', error: String(error) }
  }
}

/**
 * ตรวจสอบ health status ของ backend
 *
 * @returns Health check result
 */
export async function healthCheck(): Promise<HealthCheckResult> {
  try {
    return await fetchWithAuth<HealthCheckResult>(
      '/health_check',
      'GET'
    )
  } catch (error) {
    console.error('[metric-api] healthCheck error:', error)
    return {
      status: 'error',
      service: 'skill-embedding-service',
      errors: [
        { service: 'API Connection', error: String(error) }
      ]
    }
  }
}

/**
 * Fetch metrics from backend (stub สำหรับตัวอย่าง)
 *
 * ในการใช้จริง: backend ควร expose endpoint ที่ส่ง metric data
 * ตัวอย่าง: /metrics/{metricType}?timeRange=24h
 */
export async function fetchMetrics(
  metricType: MetricType,
  timeRange: TimeRange
): Promise<{ currentValue: number; previousValue: number; trend: string }> {
  try {
    // TODO: ลบ hardcode มาใช้ real endpoint จาก app.py แทน
    console.log(`[metric-api] Fetching metrics: ${metricType} for ${timeRange}`)
    return { currentValue: 0, previousValue: 0, trend: 'up' }
  } catch (error) {
    console.error('[metric-api] fetchMetrics error:', error)
    throw error
  }
}
