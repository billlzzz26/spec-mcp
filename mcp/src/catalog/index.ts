/**
 * catalog/index.ts
 * ----------
 * Skill Catalog Builder — TS port พร้อม MCP tool definitions
 * ใช้ config จาก skills.config.json แทน hardcode ทั้งหมด
 *
 * วิธี integrate เข้า MCP server ที่มีอยู่:
 *   import { catalogTools, handleCatalogTool } from './catalog.js'
 *   // ใน server setup: register catalogTools
 *   // ใน tool handler: delegate ไปที่ handleCatalogTool
 */

import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

// ─── Config Schema ────────────────────────────────────────────────────────────

const CategoryRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  keywords: z.array(z.string()),
})

const BundleGroupSchema = z.record(
  z.object({
    description: z.string(),
    keywords: z.array(z.string()),
  }),
)

const SkillsConfigSchema = z.object({
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

type SkillsConfig = z.infer<typeof SkillsConfigSchema>

// ─── Skill Types ──────────────────────────────────────────────────────────────

interface RawSkill {
  id: string
  name: string
  description: string
  tags?: string[]
  path: string
}

interface CatalogSkill {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  triggers: string[]
  path: string
}

interface Catalog {
  generatedAt: string
  total: number
  skills: CatalogSkill[]
}

interface BundleData {
  bundles: Record<string, { description: string; skills: string[] }>
  common: string[]
}

// ─── Config Loader ────────────────────────────────────────────────────────────

function loadConfig(configPath: string): SkillsConfig {
  const raw = fs.readFileSync(configPath, 'utf-8')
  const parsed = JSON.parse(raw)
  return SkillsConfigSchema.parse(parsed)
}

// ─── Core Utilities ───────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s_]+/)
    .filter(Boolean)
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

function truncate(value: string | undefined, limit: number): string {
  if (!value) return ''
  if (value.length <= limit) return value
  return `${value.slice(0, limit - 3)}...`
}

function normalizeTokens(tokens: string[]): string[] {
  return unique(tokens.map((t) => t.toLowerCase())).filter(Boolean)
}

// ─── Catalog Logic (config-driven) ───────────────────────────────────────────

function deriveTags(skill: RawSkill, tagStopwords: Set<string>): string[] {
  let tags = Array.isArray(skill.tags) ? skill.tags : []
  tags = tags.map((t) => t.toLowerCase()).filter(Boolean)

  if (!tags.length) {
    tags = skill.id
      .split('-')
      .map((t) => t.toLowerCase())
      .filter((t) => t && !tagStopwords.has(t))
  }

  return normalizeTokens(tags)
}

function detectCategory(
  skill: RawSkill,
  tags: string[],
  config: SkillsConfig,
): string {
  const haystack = new Set(
    normalizeTokens([
      ...tags,
      ...tokenize(skill.name),
      ...tokenize(skill.description),
    ]),
  )

  for (const rule of config.categories.rules) {
    for (const keyword of rule.keywords) {
      if (haystack.has(keyword)) return rule.name
    }
  }

  return config.categories.fallback
}

function buildTriggers(
  skill: RawSkill,
  tags: string[],
  stopwords: Set<string>,
  maxTriggers: number,
  minTokenLength: number,
): string[] {
  const tokens = tokenize(`${skill.name} ${skill.description}`).filter(
    (t) => t.length >= minTokenLength && !stopwords.has(t),
  )
  return unique([...tags, ...tokens]).slice(0, maxTriggers)
}

function buildAliases(
  skills: CatalogSkill[],
  config: SkillsConfig,
): Record<string, string> {
  const existingIds = new Set(skills.map((s) => s.id))
  const aliases: Record<string, string> = {}
  const used = new Set<string>()

  for (const skill of skills) {
    if (skill.name && skill.name !== skill.id) {
      const alias = skill.name.toLowerCase()
      if (!existingIds.has(alias) && !used.has(alias)) {
        aliases[alias] = skill.id
        used.add(alias)
      }
    }

    const tokens = skill.id.split('-').filter(Boolean)
    if (
      skill.id.length < config.indexing.aliasMinLength ||
      tokens.length < config.indexing.aliasMinTokens
    )
      continue

    const deduped: string[] = []
    const seen = new Set<string>()
    for (const t of tokens) {
      if (seen.has(t)) continue
      seen.add(t)
      deduped.push(t)
    }

    const aliasTokens =
      deduped.length > 3
        ? [deduped[0], deduped[1], deduped[deduped.length - 1]]
        : deduped

    const alias = unique(aliasTokens).join('-')
    if (!alias || alias === skill.id) continue
    if (existingIds.has(alias) || used.has(alias)) continue

    aliases[alias] = skill.id
    used.add(alias)
  }

  return aliases
}

function buildBundles(skills: CatalogSkill[], config: SkillsConfig): BundleData {
  const skillTokens = new Map<string, Set<string>>()

  for (const skill of skills) {
    const tokens = normalizeTokens([
      ...skill.tags,
      ...tokenize(skill.name),
      ...tokenize(skill.description),
    ])
    skillTokens.set(skill.id, new Set(tokens))
  }

  const bundles: BundleData['bundles'] = {}

  for (const [bundleName, rule] of Object.entries(config.bundles.groups)) {
    const keywords = rule.keywords.map((k) => k.toLowerCase())
    const bundleSkills = skills
      .filter((skill) => {
        const tokenSet = skillTokens.get(skill.id) ?? new Set()
        return keywords.some((k) => tokenSet.has(k))
      })
      .map((s) => s.id)
      .sort()

    bundles[bundleName] = { description: rule.description, skills: bundleSkills }
  }

  const common = config.curatedCommon.skills.filter((id) => skillTokens.has(id))

  return { bundles, common }
}

// ─── Skill File Reader (กำหนดให้ implement ตาม project structure) ─────────────

function listSkillIds(skillsDir: string): string[] {
  if (!fs.existsSync(skillsDir)) return []
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
}

function readSkill(skillsDir: string, skillId: string): RawSkill | null {
  const skillPath = path.join(skillsDir, skillId, 'SKILL.md')
  if (!fs.existsSync(skillPath)) return null

  const content = fs.readFileSync(skillPath, 'utf-8')

  // อ่าน frontmatter (name, description, tags)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  let name = skillId
  let description = ''
  let tags: string[] = []

  if (frontmatterMatch) {
    const fm = frontmatterMatch[1]
    const nameMatch = fm.match(/^name:\s*(.+)$/m)
    const descMatch = fm.match(/^description:\s*(.+)$/m)
    const tagsMatch = fm.match(/^tags:\s*\[([^\]]+)\]$/m)

    if (nameMatch) name = nameMatch[1].trim()
    if (descMatch) description = descMatch[1].trim()
    if (tagsMatch)
      tags = tagsMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, ''))
  }

  return { id: skillId, name, description, tags, path: skillPath }
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

interface BuildCatalogOptions {
  skillsDir: string
  configPath: string
  outputDir?: string   // ถ้า undefined จะไม่ write ไฟล์
}

interface CatalogResult {
  catalog: Catalog
  aliases: Record<string, string>
  bundleData: BundleData
}

function buildCatalog(opts: BuildCatalogOptions): CatalogResult {
  const config = loadConfig(opts.configPath)
  const stopwords = new Set(config.stopwords.tokens)
  const tagStopwords = new Set(config.tagStopwords.tokens)
  const { maxTriggers, minTokenLength } = config.indexing

  const skillIds = listSkillIds(opts.skillsDir)
  const catalogSkills: CatalogSkill[] = []

  for (const skillId of skillIds) {
    const skill = readSkill(opts.skillsDir, skillId)
    if (!skill) continue

    const tags = deriveTags(skill, tagStopwords)
    const category = detectCategory(skill, tags, config)
    const triggers = buildTriggers(skill, tags, stopwords, maxTriggers, minTokenLength)

    catalogSkills.push({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category,
      tags,
      triggers,
      path: skill.path,
    })
  }

  const catalog: Catalog = {
    generatedAt: new Date().toISOString(),
    total: catalogSkills.length,
    skills: catalogSkills.sort((a, b) => a.id.localeCompare(b.id)),
  }

  const aliases = buildAliases(catalog.skills, config)
  const bundleData = buildBundles(catalog.skills, config)

  // เขียนไฟล์ถ้ากำหนด outputDir
  if (opts.outputDir) {
    fs.mkdirSync(opts.outputDir, { recursive: true })
    fs.writeFileSync(
      path.join(opts.outputDir, 'catalog.json'),
      JSON.stringify(catalog, null, 2),
    )
    fs.writeFileSync(
      path.join(opts.outputDir, 'bundles.json'),
      JSON.stringify({ generatedAt: catalog.generatedAt, ...bundleData }, null, 2),
    )
    fs.writeFileSync(
      path.join(opts.outputDir, 'aliases.json'),
      JSON.stringify({ generatedAt: catalog.generatedAt, aliases }, null, 2),
    )
  }

  return { catalog, aliases, bundleData }
}

// ─── MCP Tool Definitions ─────────────────────────────────────────────────────

/**
 * catalogTools — array ของ tool definitions
 * ใช้ register เข้า MCP server ที่มีอยู่แล้ว
 *
 * ตัวอย่าง (ปรับตาม SDK ที่ใช้):
 *   server.tool(t.name, t.description, t.inputSchema, handler)
 */
export const catalogTools = [
  {
    name: 'list_skills',
    description:
      'List all available skills. Filter by category or bundle. Returns id, name, description, tags, triggers.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category (security, infrastructure, data-ai, development, architecture, testing, business, workflow, general)',
        },
        bundle: {
          type: 'string',
          description: 'Filter by bundle name (core-dev, security-core, k8s-core, data-core, ops-core)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 50)',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_skills',
    description:
      'Search skills by keyword using trigger matching. Returns ranked results.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query — matches against triggers, tags, name, description',
        },
        category: {
          type: 'string',
          description: 'Optional: restrict search to a category',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_skill',
    description: 'Get full detail of a skill by id or alias.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'Skill id or alias (e.g. "python-pro", "typescript")',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_bundles',
    description: 'List all bundles and their included skills.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'update_catalog_config',
    description:
      'Add or remove keywords from categories/bundles/stopwords at runtime without restarting.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        target: {
          type: 'string',
          enum: ['category', 'bundle', 'stopwords', 'tagStopwords'],
          description: 'Which section to update',
        },
        name: {
          type: 'string',
          description: 'Category name or bundle name (required for category/bundle)',
        },
        action: {
          type: 'string',
          enum: ['add', 'remove'],
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords to add or remove',
        },
      },
      required: ['target', 'action', 'keywords'],
    },
  },
] as const

// ─── MCP Tool Handler ─────────────────────────────────────────────────────────

interface CatalogState {
  catalog: Catalog
  aliases: Record<string, string>
  bundleData: BundleData
  config: SkillsConfig
  configPath: string
  skillsDir: string
}

/**
 * สร้าง handler ที่ผูกกับ state
 * ใช้:
 *   const handler = createCatalogHandler({ skillsDir, configPath })
 *   // ใน MCP tool dispatcher:
 *   case 'list_skills': return handler('list_skills', args)
 */
export function createCatalogHandler(opts: {
  skillsDir: string
  configPath: string
}) {
  // โหลด catalog ครั้งแรก
  let state: CatalogState = (() => {
    const config = loadConfig(opts.configPath)
    const result = buildCatalog({ skillsDir: opts.skillsDir, configPath: opts.configPath })
    return { ...result, config, configPath: opts.configPath, skillsDir: opts.skillsDir }
  })()

  function rebuild() {
    // เขียน config ที่อัปเดตแล้วกลับลงไฟล์
    fs.writeFileSync(state.configPath, JSON.stringify(state.config, null, 2))
    const result = buildCatalog({
      skillsDir: state.skillsDir,
      configPath: state.configPath,
    })
    state = { ...state, ...result }
  }

  return function handleCatalogTool(
    toolName: string,
    args: Record<string, unknown>,
  ): unknown {
    switch (toolName) {
      // ── list_skills ──────────────────────────────────────────────────────
      case 'list_skills': {
        const { category, bundle, limit = 50 } = args as {
          category?: string
          bundle?: string
          limit?: number
        }

        let skills = state.catalog.skills

        if (bundle) {
          const bundleSkills = new Set(state.bundleData.bundles[bundle]?.skills ?? [])
          skills = skills.filter((s) => bundleSkills.has(s.id))
        }

        if (category) {
          skills = skills.filter((s) => s.category === category)
        }

        return {
          total: skills.length,
          skills: skills.slice(0, limit).map(({ id, name, description, category, tags, triggers }) => ({
            id, name, description, category, tags, triggers,
          })),
        }
      }

      // ── search_skills ─────────────────────────────────────────────────────
      case 'search_skills': {
        const { query, category, limit = 10 } = args as {
          query: string
          category?: string
          limit?: number
        }

        const queryTokens = new Set(
          tokenize(query).filter((t) => t.length >= 2),
        )

        let skills = state.catalog.skills
        if (category) {
          skills = skills.filter((s) => s.category === category)
        }

        // Score: count ของ query tokens ที่ match trigger/tag
        const scored = skills
          .map((skill) => {
            const haystack = new Set([
              ...skill.triggers,
              ...skill.tags,
              ...tokenize(skill.name),
              ...tokenize(skill.description),
            ])
            let score = 0
            for (const t of queryTokens) {
              if (haystack.has(t)) score++
            }
            return { skill, score }
          })
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)

        return {
          query,
          total: scored.length,
          results: scored.map(({ skill, score }) => ({
            id: skill.id,
            name: skill.name,
            description: truncate(skill.description, 200),
            category: skill.category,
            tags: skill.tags,
            triggers: skill.triggers,
            score,
          })),
        }
      }

      // ── get_skill ─────────────────────────────────────────────────────────
      case 'get_skill': {
        const { id } = args as { id: string }

        // resolve alias ก่อน
        const resolvedId = state.aliases[id.toLowerCase()] ?? id

        const skill = state.catalog.skills.find(
          (s) => s.id === resolvedId || s.id === id,
        )

        if (!skill) {
          return { error: `Skill "${id}" not found`, availableAliases: Object.keys(state.aliases) }
        }

        // อ่าน SKILL.md content ถ้ามี
        let content: string | undefined
        if (fs.existsSync(skill.path)) {
          content = fs.readFileSync(skill.path, 'utf-8')
        }

        return { ...skill, content }
      }

      // ── list_bundles ──────────────────────────────────────────────────────
      case 'list_bundles': {
        return {
          bundles: state.bundleData.bundles,
          common: state.bundleData.common,
        }
      }

      // ── update_catalog_config ─────────────────────────────────────────────
      case 'update_catalog_config': {
        const { target, name, action, keywords } = args as {
          target: 'category' | 'bundle' | 'stopwords' | 'tagStopwords'
          name?: string
          action: 'add' | 'remove'
          keywords: string[]
        }

        const kw = keywords.map((k) => k.toLowerCase())

        if (target === 'stopwords') {
          const current = state.config.stopwords.tokens
          state.config.stopwords.tokens = action === 'add'
            ? unique([...current, ...kw])
            : current.filter((t) => !kw.includes(t))
        }

        else if (target === 'tagStopwords') {
          const current = state.config.tagStopwords.tokens
          state.config.tagStopwords.tokens = action === 'add'
            ? unique([...current, ...kw])
            : current.filter((t) => !kw.includes(t))
        }

        else if (target === 'category') {
          if (!name) return { error: '`name` is required for target=category' }
          const rule = state.config.categories.rules.find((r) => r.name === name)
          if (!rule) return { error: `Category "${name}" not found` }

          rule.keywords = action === 'add'
            ? unique([...rule.keywords, ...kw])
            : rule.keywords.filter((k) => !kw.includes(k))
        }

        else if (target === 'bundle') {
          if (!name) return { error: '`name` is required for target=bundle' }
          const group = state.config.bundles.groups[name]
          if (!group) return { error: `Bundle "${name}" not found` }

          group.keywords = action === 'add'
            ? unique([...group.keywords, ...kw])
            : group.keywords.filter((k) => !kw.includes(k))
        }

        // rebuild catalog ด้วย config ใหม่
        rebuild()

        return {
          success: true,
          message: `${action} [${kw.join(', ')}] ${target === 'category' || target === 'bundle' ? `in ${target}:${name}` : `in ${target}`}`,
          catalogTotal: state.catalog.total,
        }
      }

      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { buildCatalog, loadConfig, type Catalog, type CatalogSkill, type SkillsConfig }
