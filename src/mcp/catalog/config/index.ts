/**
 * config/index.ts
 * ---------------
 * Configuration schemas and loader for Skill Catalog
 */

import fs from 'node:fs'
import { z } from 'zod'

// ─── Config Schema ────────────────────────────────────────────────────────────

const CategoryRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  keywords: z.array(z.string()),
})

const BundleGroupSchema = z.record(
  z.string(),
  z.object({
    description: z.string(),
    keywords: z.array(z.string()),
  }),
)

export const SkillsConfigSchema = z.object({
  version: z.string(),
  indexing: z.object({
    maxTriggers: z.number().default(12),
    minTokenLength: z.number().default(2),
    aliasMinLength: z.number().default(28),
    aliasMinTokens: z.number().default(4),
  }),
  stopwords: z.object({ tokens: z.array(z.string()) }),
  tagStopwords: z.object({ tokens: z.array(z.string()) }),
  categories: z.object({
    rules: z.array(CategoryRuleSchema),
    fallback: z.string().default('general'),
  }),
  bundles: z.object({
    groups: BundleGroupSchema,
  }),
  curatedCommon: z.object({
    skills: z.array(z.string()),
  }),
})

export type SkillsConfig = z.infer<typeof SkillsConfigSchema>

// ─── Config Loader ────────────────────────────────────────────────────────────

/**
 * loadConfig — อ่านไฟล์ config จาก disk
 * ถ้าไม่พบไฟล์จะใช้ค่า default แทนเพื่อป้องกัน build crash
 */
export function loadConfig(configPath: string): SkillsConfig {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return SkillsConfigSchema.parse(parsed)
  } catch {
    // Fallback config — ใช้เมื่อ file ไม่มี (เช่น production build ที่ path ไม่ตรง)
    return SkillsConfigSchema.parse({
      version: '1.0.0',
      indexing: {},
      stopwords: { tokens: [] },
      tagStopwords: { tokens: [] },
      categories: { rules: [], fallback: 'general' },
      bundles: { groups: {} },
      curatedCommon: { skills: [] },
    })
  }
}
