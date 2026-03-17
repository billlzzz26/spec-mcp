/**
 * handler.ts
 * ----------
 * MCP Catalog Tool Handler
 */

import fs from 'node:fs'
import {
  tokenize,
  unique,
  truncate,
  buildCatalog,
} from './builder.js'
import type { CatalogState } from './types.js'

// ─── MCP Tool Definitions ─────────────────────────────────────────────────────

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

export function createCatalogHandler(opts: {
  skillsDir: string
  configPath: string
}) {
  // โหลด catalog ครั้งแรก
  let state: CatalogState = (() => {
    const result = buildCatalog({ skillsDir: opts.skillsDir, configPath: opts.configPath })
    const { loadConfig } = require('./config/index.js')
    const config = loadConfig(opts.configPath)
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
            : current.filter((t: string) => !kw.includes(t))
        }

        else if (target === 'tagStopwords') {
          const current = state.config.tagStopwords.tokens
          state.config.tagStopwords.tokens = action === 'add'
            ? unique([...current, ...kw])
            : current.filter((t: string) => !kw.includes(t))
        }

        else if (target === 'category') {
          if (!name) return { error: '`name` is required for target=category' }
          const rule = state.config.categories.rules.find((r) => r.name === name)
          if (!rule) return { error: `Category "${name}" not found` }

          rule.keywords = action === 'add'
            ? unique([...rule.keywords, ...kw])
            : rule.keywords.filter((k: string) => !kw.includes(k))
        }

        else if (target === 'bundle') {
          if (!name) return { error: '`name` is required for target=bundle' }
          const group = state.config.bundles.groups[name]
          if (!group) return { error: `Bundle "${name}" not found` }

          group.keywords = action === 'add'
            ? unique([...group.keywords, ...kw])
            : group.keywords.filter((k: string) => !kw.includes(k))
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
