/**
 * builder.ts
 * ----------
 * Skill Catalog Builder - build catalog, aliases, and bundles
 */

import fs from 'node:fs'
import path from 'node:path'
import { loadConfig } from './config/index'
import type { SkillsConfig } from './config/index'
import type {
  RawSkill,
  CatalogSkill,
  Catalog,
  BundleData,
  BuildCatalogOptions,
  CatalogResult,
} from './types'

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

// ─── Skill File Reader ────────────────────────────────────────────────────────

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

export function buildCatalog(opts: BuildCatalogOptions): CatalogResult {
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

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  tokenize,
  unique,
  truncate,
  normalizeTokens,
  deriveTags,
  detectCategory,
  buildTriggers,
  buildAliases,
  buildBundles,
  listSkillIds,
  readSkill,
}
