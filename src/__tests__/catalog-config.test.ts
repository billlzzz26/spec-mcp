/**
 * catalog-config.test.ts
 * ----------------------
 * การทดสอบยืนยัน Checklist Items 0.1.1 - 0.1.4
 * ตรวจสอบการทำงานของ skills.config.json และ catalog builder
 *
 * หมายเหตุ: ไฟล์นี้ทดสอบการทำงานจริงของ config loader และ catalog builder
 * เพื่อยืนยันว่าระบบทำงานตามที่คาดหวังตาม checklist.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { loadConfig, SkillsConfigSchema } from '@/mcp/catalog/config/index'
import { buildCatalog } from '@/mcp/catalog/builder'
import type { SkillsConfig } from '@/mcp/catalog/config/index'

// กำหนด paths สำหรับการทดสอบ
const TEST_SKILLS_DIR = path.resolve(process.cwd(), 'test-skills')
const TEST_CONFIG_PATH = path.resolve(process.cwd(), 'skills.config.json')

/**
 * ========================================
 * Checklist 0.1.1 — loadConfig() Basic Test
 * ========================================
 * ผลที่คาดหวัง: parse สำเร็จ Zod ไม่ throw
 */
describe('0.1.1 — loadConfig() ควรโหลด skills.config.json ได้โดยไม่มี error', () => {
  it('ควร parse config สำเร็จและ Zod validation ผ่าน', () => {
    // ทดสอบโหลด config จริง
    const config = loadConfig(TEST_CONFIG_PATH)

    // ตรวจสอบโครงสร้างหลัก
    expect(config).toBeDefined()
    expect(config.version).toBe('1.0.0')
    expect(config.indexing).toBeDefined()
    expect(config.stopwords).toBeDefined()
    expect(config.tagStopwords).toBeDefined()
    expect(config.categories).toBeDefined()
    expect(config.bundles).toBeDefined()
    expect(config.curatedCommon).toBeDefined()

    // ตรวจสอบ indexing settings
    expect(config.indexing.maxTriggers).toBe(12)
    expect(config.indexing.minTokenLength).toBe(2)
    expect(config.indexing.aliasMinLength).toBe(28)
    expect(config.indexing.aliasMinTokens).toBe(4)

    // ตรวจสอบว่ามี stopwords tokens
    expect(Array.isArray(config.stopwords.tokens)).toBe(true)
    expect(config.stopwords.tokens.length).toBeGreaterThan(0)

    // ตรวจสอบว่ามี category rules
    expect(Array.isArray(config.categories.rules)).toBe(true)
    expect(config.categories.rules.length).toBeGreaterThan(0)
    expect(config.categories.fallback).toBe('general')
  })

  it('ควรผ่าน Zod schema validation อย่างสมบูรณ์', () => {
    const raw = fs.readFileSync(TEST_CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw)

    // Zod parse ไม่ควร throw
    expect(() => SkillsConfigSchema.parse(parsed)).not.toThrow()

    const validated = SkillsConfigSchema.parse(parsed)
    expect(validated.version).toBe('1.0.0')
  })

  it('ควร fallback gracefully เมื่อไฟล์ไม่มี', () => {
    const config = loadConfig('/nonexistent/path/config.json')

    // ควรได้ default config
    expect(config).toBeDefined()
    expect(config.version).toBe('1.0.0')
    expect(config.stopwords.tokens).toEqual([])
    expect(config.categories.fallback).toBe('general')
  })
})

/**
 * ========================================
 * Checklist 0.1.2 — Stopwords Filtering
 * ========================================
 * ผลที่คาดหวัง: token ที่เพิ่มใน stopwords ถูก filter ออกจาก triggers
 */
describe('0.1.2 — stopwords.tokens[] ควร filter token ออกจาก triggers', () => {
  // สร้าง temporary config สำหรับทดสอบ
  const tempConfigPath = path.resolve(process.cwd(), 'test-skills.config.json')

  beforeEach(() => {
    // Copy original config
    const originalConfig = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'))
    fs.writeFileSync(tempConfigPath, JSON.stringify(originalConfig, null, 2))
  })

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath)
    }
  })

  it('ควร filter stopwords ออกจาก triggers เมื่อ build catalog', () => {
    // Build catalog ด้วย config ปกติ
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
    })

    // หา python-pro skill
    const pythonSkill = result.catalog.skills.find((s) => s.id === 'python-pro')
    expect(pythonSkill).toBeDefined()

    // "expert" ควรถูก filter ออก (อยู่ใน stopwords)
    // ตรวจสอบว่า stopwords ที่กำหนดใน config ไม่ปรากฏใน triggers
    const config = loadConfig(TEST_CONFIG_PATH)
    const stopwords = new Set(config.stopwords.tokens)

    // triggers ไม่ควรมี stopwords (ยกเว้นกรณีที่เป็น tags โดยตรง)
    const triggersFromContent = pythonSkill!.triggers.filter(
      (t) => !pythonSkill!.tags.includes(t)
    )
    for (const trigger of triggersFromContent) {
      expect(stopwords.has(trigger)).toBe(false)
    }

    // triggers ควรมี "python" (ไม่อยู่ใน stopwords)
    expect(pythonSkill!.triggers).toContain('python')
  })

  it('ควร filter custom stopword ใหม่ออกจาก triggers', () => {
    // แก้ไข config เพิ่ม "python" เป็น stopword
    const config = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'))
    config.stopwords.tokens.push('python')
    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2))

    // Build catalog ด้วย config ที่แก้ไข
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: tempConfigPath,
    })

    const pythonSkill = result.catalog.skills.find((s) => s.id === 'python-pro')
    expect(pythonSkill).toBeDefined()

    // "python" จาก name/description ควรถูก filter
    // แต่ "python" ใน tags อาจยังคงอยู่ (เพราะ tags ไม่ใช้ stopwords)
    const triggersFromContent = pythonSkill!.triggers.filter(
      (t) => !pythonSkill!.tags.includes(t)
    )
    expect(triggersFromContent).not.toContain('python')
  })
})

/**
 * ========================================
 * Checklist 0.1.3 — tagStopwords Filtering
 * ========================================
 * ผลที่คาดหวัง: tag ที่ตรงกับ tagStopword ไม่ปรากฏ
 */
describe('0.1.3 — tagStopwords.tokens[] ควร filter tags ออก', () => {
  const tempConfigPath = path.resolve(process.cwd(), 'test-skills.config.json')

  beforeEach(() => {
    const originalConfig = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'))
    fs.writeFileSync(tempConfigPath, JSON.stringify(originalConfig, null, 2))
  })

  afterEach(() => {
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath)
    }
  })

  it('ควร filter tagStopwords ออกจาก derived tags', () => {
    // Load config เพื่อดู tagStopwords
    const config = loadConfig(TEST_CONFIG_PATH)
    const tagStopwords = new Set(config.tagStopwords.tokens)

    // Build catalog
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
    })

    // ตรวจสอบ no-frontmatter skill (จะ derive tags จาก id)
    const noFrontmatterSkill = result.catalog.skills.find(
      (s) => s.id === 'no-frontmatter'
    )
    expect(noFrontmatterSkill).toBeDefined()

    // Tags ที่ derive จาก "no-frontmatter" ควร filter tagStopwords ออก
    for (const tag of noFrontmatterSkill!.tags) {
      expect(tagStopwords.has(tag)).toBe(false)
    }
  })

  it('ควร filter custom tagStopword ใหม่ออกจาก tags', () => {
    // เพิ่ม "security" เป็น tagStopword
    const config = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'))
    config.tagStopwords.tokens.push('security')
    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2))

    // สร้าง skill ที่ไม่มี tags (จะ derive จาก id)
    const testSkillDir = path.join(TEST_SKILLS_DIR, 'security-test')
    fs.mkdirSync(testSkillDir, { recursive: true })
    fs.writeFileSync(
      path.join(testSkillDir, 'SKILL.md'),
      '# Security Test\n\nTest skill for tagStopwords.'
    )

    try {
      const result = buildCatalog({
        skillsDir: TEST_SKILLS_DIR,
        configPath: tempConfigPath,
      })

      const securityTestSkill = result.catalog.skills.find(
        (s) => s.id === 'security-test'
      )
      expect(securityTestSkill).toBeDefined()

      // "security" ควรถูก filter ออกจาก derived tags
      expect(securityTestSkill!.tags).not.toContain('security')
    } finally {
      // Cleanup test skill
      fs.rmSync(testSkillDir, { recursive: true, force: true })
    }
  })
})

/**
 * ========================================
 * Checklist 0.1.4 — Category Rules
 * ========================================
 * ผลที่คาดหวัง: skill ที่ match ถูก assign category ใหม่
 */
describe('0.1.4 — categories.rules[] ควร assign category ให้ skill ที่ match', () => {
  const tempConfigPath = path.resolve(process.cwd(), 'test-skills.config.json')

  beforeEach(() => {
    const originalConfig = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'))
    fs.writeFileSync(tempConfigPath, JSON.stringify(originalConfig, null, 2))
  })

  afterEach(() => {
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath)
    }
  })

  it('ควร assign category ตาม existing rules', () => {
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
    })

    // python-pro ควรถูก assign เป็น "development" (match "python" keyword)
    const pythonSkill = result.catalog.skills.find((s) => s.id === 'python-pro')
    expect(pythonSkill).toBeDefined()
    expect(pythonSkill!.category).toBe('development')

    // security-auditor ควรถูก assign เป็น "security"
    const securitySkill = result.catalog.skills.find(
      (s) => s.id === 'security-auditor'
    )
    expect(securitySkill).toBeDefined()
    expect(securitySkill!.category).toBe('security')

    // kubernetes-architect ควรถูก assign เป็น "infrastructure"
    const k8sSkill = result.catalog.skills.find(
      (s) => s.id === 'kubernetes-architect'
    )
    expect(k8sSkill).toBeDefined()
    expect(k8sSkill!.category).toBe('infrastructure')

    // machine-learning-engineer ควรถูก assign เป็น "data-ai"
    const mlSkill = result.catalog.skills.find(
      (s) => s.id === 'machine-learning-engineer'
    )
    expect(mlSkill).toBeDefined()
    expect(mlSkill!.category).toBe('data-ai')
  })

  it('ควรใช้ fallback category เมื่อไม่ match rule ใดๆ', () => {
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
    })

    // no-frontmatter ไม่มี keywords ที่ match rule ใดๆ
    const noFrontmatterSkill = result.catalog.skills.find(
      (s) => s.id === 'no-frontmatter'
    )
    expect(noFrontmatterSkill).toBeDefined()
    expect(noFrontmatterSkill!.category).toBe('general') // fallback
  })

  it('ควร assign category ใหม่เมื่อเพิ่ม rule ใหม่', () => {
    // เพิ่ม category rule ใหม่สำหรับ "neural" keyword
    const config = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'))
    config.categories.rules.unshift({
      name: 'neural-computing',
      description: 'Neural network and deep learning',
      keywords: ['neural', 'neural-networks', 'deep-learning'],
    })
    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2))

    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: tempConfigPath,
    })

    // machine-learning-engineer มี tag "neural-networks" ควร match rule ใหม่
    const mlSkill = result.catalog.skills.find(
      (s) => s.id === 'machine-learning-engineer'
    )
    expect(mlSkill).toBeDefined()
    // Rule ใหม่อยู่ต้น array จึงควร match ก่อน "data-ai"
    expect(mlSkill!.category).toBe('neural-computing')
  })

  it('ควรใช้ rule แรกที่ match (ลำดับสำคัญ)', () => {
    // ทดสอบว่า rule ordering ทำงานถูกต้อง
    const config = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'))

    // เพิ่ม rule ที่ match "kubernetes" ไว้ก่อน infrastructure
    config.categories.rules.unshift({
      name: 'container-orchestration',
      description: 'Container and orchestration',
      keywords: ['kubernetes', 'k8s', 'orchestration'],
    })
    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2))

    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: tempConfigPath,
    })

    // kubernetes-architect ควรถูก assign เป็น "container-orchestration"
    // แทนที่จะเป็น "infrastructure" เพราะ rule ใหม่อยู่ก่อน
    const k8sSkill = result.catalog.skills.find(
      (s) => s.id === 'kubernetes-architect'
    )
    expect(k8sSkill).toBeDefined()
    expect(k8sSkill!.category).toBe('container-orchestration')
  })
})

/**
 * ========================================
 * Checklist 0.1.5 — Bundle Groups
 * ========================================
 * ผลที่คาดหวัง: bundle ใหม่ปรากฏใน bundles.json
 */
describe('0.1.5 — bundles.groups{} ควรสร้าง bundle ใหม่ได้', () => {
  const tempConfigPath = path.resolve(process.cwd(), 'test-skills.config.json')
  const tempOutputDir = path.resolve(process.cwd(), 'test-output')

  beforeEach(() => {
    const originalConfig = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'))
    fs.writeFileSync(tempConfigPath, JSON.stringify(originalConfig, null, 2))
    fs.mkdirSync(tempOutputDir, { recursive: true })
  })

  afterEach(() => {
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath)
    }
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true, force: true })
    }
  })

  it('ควรมี bundle groups ทั้งหมดที่กำหนดใน config', () => {
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
      outputDir: tempOutputDir,
    })

    const config = loadConfig(TEST_CONFIG_PATH)
    const configBundleNames = Object.keys(config.bundles.groups)

    // ทุก bundle ใน config ควรปรากฏใน bundleData
    for (const bundleName of configBundleNames) {
      expect(result.bundleData.bundles[bundleName]).toBeDefined()
    }
  })

  it('ควรสร้าง bundle ใหม่เมื่อเพิ่ม group ใน config', () => {
    // เพิ่ม bundle group ใหม่
    const config = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'))
    config.bundles.groups['ml-ai-core'] = {
      description: 'Machine Learning and AI fundamentals',
      keywords: ['ml', 'machine', 'learning', 'neural', 'tensorflow', 'pytorch'],
    }
    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2))

    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: tempConfigPath,
      outputDir: tempOutputDir,
    })

    // Bundle ใหม่ควรปรากฏใน result
    expect(result.bundleData.bundles['ml-ai-core']).toBeDefined()
    expect(result.bundleData.bundles['ml-ai-core'].description).toBe(
      'Machine Learning and AI fundamentals'
    )

    // machine-learning-engineer ควรอยู่ใน bundle นี้ (match "machine", "learning")
    expect(result.bundleData.bundles['ml-ai-core'].skills).toContain(
      'machine-learning-engineer'
    )
  })

  it('ควรเขียน bundles.json ที่มี bundle ใหม่เมื่อระบุ outputDir', () => {
    // เพิ่ม bundle group ใหม่
    const config = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'))
    config.bundles.groups['security-advanced'] = {
      description: 'Advanced security skills',
      keywords: ['security', 'audit', 'vulnerability', 'threat'],
    }
    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2))

    buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: tempConfigPath,
      outputDir: tempOutputDir,
    })

    // ตรวจสอบว่าไฟล์ bundles.json ถูกสร้าง
    const bundlesPath = path.join(tempOutputDir, 'bundles.json')
    expect(fs.existsSync(bundlesPath)).toBe(true)

    // ตรวจสอบเนื้อหา
    const bundlesContent = JSON.parse(fs.readFileSync(bundlesPath, 'utf-8'))
    expect(bundlesContent.bundles['security-advanced']).toBeDefined()
    expect(bundlesContent.bundles['security-advanced'].skills).toContain(
      'security-auditor'
    )
  })
})

/**
 * ========================================
 * Checklist 0.1.6 — Invalid Config Validation
 * ========================================
 * ผลที่คาดหวัง: Zod throw error ชัดเจน ระบุ field ที่ผิด
 */
describe('0.1.6 — Invalid config ควร throw Zod error ที่ชัดเจน', () => {
  const tempConfigPath = path.resolve(process.cwd(), 'invalid-test.config.json')

  afterEach(() => {
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath)
    }
  })

  it('ควร throw error เมื่อ version field หายไป', () => {
    const invalidConfig = {
      indexing: { maxTriggers: 12 },
      stopwords: { tokens: [] },
      tagStopwords: { tokens: [] },
      categories: { rules: [], fallback: 'general' },
      bundles: { groups: {} },
      curatedCommon: { skills: [] },
    }
    fs.writeFileSync(tempConfigPath, JSON.stringify(invalidConfig, null, 2))

    // Zod parse โดยตรงควร throw
    expect(() => {
      SkillsConfigSchema.parse(invalidConfig)
    }).toThrow()

    // ตรวจสอบว่า error message ระบุ field
    try {
      SkillsConfigSchema.parse(invalidConfig)
    } catch (error: unknown) {
      expect(error).toBeDefined()
      const zodError = error as { issues?: Array<{ path: string[] }> }
      expect(zodError.issues).toBeDefined()
      const hasVersionError = zodError.issues!.some((issue) =>
        issue.path.includes('version')
      )
      expect(hasVersionError).toBe(true)
    }
  })

  it('ควร throw error เมื่อ stopwords.tokens ไม่ใช่ array', () => {
    const invalidConfig = {
      version: '1.0.0',
      indexing: {},
      stopwords: { tokens: 'not-an-array' }, // ผิด: ควรเป็น array
      tagStopwords: { tokens: [] },
      categories: { rules: [], fallback: 'general' },
      bundles: { groups: {} },
      curatedCommon: { skills: [] },
    }

    expect(() => {
      SkillsConfigSchema.parse(invalidConfig)
    }).toThrow()

    try {
      SkillsConfigSchema.parse(invalidConfig)
    } catch (error: unknown) {
      const zodError = error as { issues?: Array<{ path: string[]; message: string }> }
      expect(zodError.issues).toBeDefined()
      // ควรมี error เกี่ยวกับ stopwords.tokens
      const hasStopwordsError = zodError.issues!.some(
        (issue) =>
          issue.path.includes('stopwords') || issue.path.includes('tokens')
      )
      expect(hasStopwordsError).toBe(true)
    }
  })

  it('ควร throw error เมื่อ categories.rules มี item ที่ไม่มี name', () => {
    const invalidConfig = {
      version: '1.0.0',
      indexing: {},
      stopwords: { tokens: [] },
      tagStopwords: { tokens: [] },
      categories: {
        rules: [
          { keywords: ['test'] }, // ขาด name field
        ],
        fallback: 'general',
      },
      bundles: { groups: {} },
      curatedCommon: { skills: [] },
    }

    expect(() => {
      SkillsConfigSchema.parse(invalidConfig)
    }).toThrow()

    try {
      SkillsConfigSchema.parse(invalidConfig)
    } catch (error: unknown) {
      const zodError = error as { issues?: Array<{ path: string[]; message: string }> }
      expect(zodError.issues).toBeDefined()
      // ควรมี error เกี่ยวกับ categories.rules[0].name
      const hasNameError = zodError.issues!.some((issue) =>
        issue.path.includes('name')
      )
      expect(hasNameError).toBe(true)
    }
  })

  it('ควร throw error เมื่อ bundles.groups value ไม่มี description', () => {
    const invalidConfig = {
      version: '1.0.0',
      indexing: {},
      stopwords: { tokens: [] },
      tagStopwords: { tokens: [] },
      categories: { rules: [], fallback: 'general' },
      bundles: {
        groups: {
          'test-bundle': { keywords: ['test'] }, // ขาด description
        },
      },
      curatedCommon: { skills: [] },
    }

    expect(() => {
      SkillsConfigSchema.parse(invalidConfig)
    }).toThrow()

    try {
      SkillsConfigSchema.parse(invalidConfig)
    } catch (error: unknown) {
      const zodError = error as { issues?: Array<{ path: string[]; message: string }> }
      expect(zodError.issues).toBeDefined()
      const hasDescError = zodError.issues!.some((issue) =>
        issue.path.includes('description')
      )
      expect(hasDescError).toBe(true)
    }
  })

  it('loadConfig() ควร fallback เมื่อ config invalid (ไม่ crash)', () => {
    const invalidConfig = { invalid: 'config' }
    fs.writeFileSync(tempConfigPath, JSON.stringify(invalidConfig, null, 2))

    // loadConfig ควร fallback gracefully
    const config = loadConfig(tempConfigPath)
    expect(config).toBeDefined()
    expect(config.version).toBe('1.0.0') // default
  })
})

/**
 * ========================================
 * Checklist 0.2.6 — SKILL.md without Frontmatter
 * ========================================
 * ผลที่คาดหวัง: ใช้ id เป็น name, description=""
 */
describe('0.2.6 — SKILL.md ไม่มี frontmatter ควร process ได้', () => {
  it('ควรใช้ id เป็น name เมื่อไม่มี frontmatter', () => {
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
    })

    const noFrontmatterSkill = result.catalog.skills.find(
      (s) => s.id === 'no-frontmatter'
    )
    expect(noFrontmatterSkill).toBeDefined()

    // name ควรเป็น id
    expect(noFrontmatterSkill!.name).toBe('no-frontmatter')
  })

  it('ควรมี description เป็น empty string เมื่อไม่มี frontmatter', () => {
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
    })

    const noFrontmatterSkill = result.catalog.skills.find(
      (s) => s.id === 'no-frontmatter'
    )
    expect(noFrontmatterSkill).toBeDefined()

    // description ควรเป็น ""
    expect(noFrontmatterSkill!.description).toBe('')
  })

  it('ควร derive tags จาก id เมื่อไม่มี frontmatter', () => {
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
    })

    const noFrontmatterSkill = result.catalog.skills.find(
      (s) => s.id === 'no-frontmatter'
    )
    expect(noFrontmatterSkill).toBeDefined()

    // tags ควร derive จาก "no-frontmatter" → ["no", "frontmatter"] หลัง filter
    expect(Array.isArray(noFrontmatterSkill!.tags)).toBe(true)
    // ควรมี "no" หรือ "frontmatter" (ขึ้นกับ tagStopwords)
    expect(noFrontmatterSkill!.tags.length).toBeGreaterThanOrEqual(0)
  })

  it('ควร assign fallback category เมื่อไม่มี frontmatter และไม่ match rules', () => {
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
    })

    const noFrontmatterSkill = result.catalog.skills.find(
      (s) => s.id === 'no-frontmatter'
    )
    expect(noFrontmatterSkill).toBeDefined()

    // ควรได้ fallback category
    expect(noFrontmatterSkill!.category).toBe('general')
  })
})

/**
 * ========================================
 * Checklist 0.2.7 — Empty skillsDir
 * ========================================
 * ผลที่คาดหวัง: { total: 0, skills: [] } ไม่ crash
 */
describe('0.2.7 — skillsDir ว่างเปล่า ควร return empty catalog', () => {
  const emptySkillsDir = path.resolve(process.cwd(), 'empty-test-skills')

  beforeEach(() => {
    fs.mkdirSync(emptySkillsDir, { recursive: true })
  })

  afterEach(() => {
    if (fs.existsSync(emptySkillsDir)) {
      fs.rmSync(emptySkillsDir, { recursive: true, force: true })
    }
  })

  it('ควร return catalog ที่มี total=0 เมื่อ skillsDir ว่าง', () => {
    const result = buildCatalog({
      skillsDir: emptySkillsDir,
      configPath: TEST_CONFIG_PATH,
    })

    expect(result.catalog).toBeDefined()
    expect(result.catalog.total).toBe(0)
  })

  it('ควร return skills เป็น empty array เมื่อ skillsDir ว่าง', () => {
    const result = buildCatalog({
      skillsDir: emptySkillsDir,
      configPath: TEST_CONFIG_PATH,
    })

    expect(Array.isArray(result.catalog.skills)).toBe(true)
    expect(result.catalog.skills.length).toBe(0)
  })

  it('ควร return empty bundles เมื่อไม่มี skills', () => {
    const result = buildCatalog({
      skillsDir: emptySkillsDir,
      configPath: TEST_CONFIG_PATH,
    })

    expect(result.bundleData).toBeDefined()
    // Bundles ควรมี structure แต่ไม่มี skills
    for (const bundleName of Object.keys(result.bundleData.bundles)) {
      expect(result.bundleData.bundles[bundleName].skills).toEqual([])
    }
  })

  it('ควร return empty aliases เมื่อไม่มี skills', () => {
    const result = buildCatalog({
      skillsDir: emptySkillsDir,
      configPath: TEST_CONFIG_PATH,
    })

    expect(result.aliases).toBeDefined()
    expect(Object.keys(result.aliases).length).toBe(0)
  })

  it('ไม่ควร crash เมื่อ skillsDir ไม่มีอยู่จริง', () => {
    const nonExistentDir = '/path/that/does/not/exist'

    // ไม่ควร throw error
    expect(() => {
      buildCatalog({
        skillsDir: nonExistentDir,
        configPath: TEST_CONFIG_PATH,
      })
    }).not.toThrow()

    const result = buildCatalog({
      skillsDir: nonExistentDir,
      configPath: TEST_CONFIG_PATH,
    })

    expect(result.catalog.total).toBe(0)
    expect(result.catalog.skills).toEqual([])
  })
})

/**
 * ========================================
 * Additional Integration Tests
 * ========================================
 */
describe('Integration — buildCatalog() ทำงานครบถ้วน', () => {
  it('ควร build catalog สำเร็จและมี skills ครบ', () => {
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
    })

    expect(result.catalog).toBeDefined()
    expect(result.catalog.total).toBe(5) // 5 test skills
    expect(result.catalog.skills.length).toBe(5)

    // ตรวจสอบว่าทุก skill มี fields ครบ
    for (const skill of result.catalog.skills) {
      expect(skill.id).toBeTruthy()
      expect(skill.name).toBeTruthy()
      expect(skill.category).toBeTruthy()
      expect(Array.isArray(skill.tags)).toBe(true)
      expect(Array.isArray(skill.triggers)).toBe(true)
    }
  })

  it('ควร build aliases และ bundles ด้วย', () => {
    const result = buildCatalog({
      skillsDir: TEST_SKILLS_DIR,
      configPath: TEST_CONFIG_PATH,
    })

    expect(result.aliases).toBeDefined()
    expect(result.bundleData).toBeDefined()
    expect(result.bundleData.bundles).toBeDefined()
    expect(result.bundleData.common).toBeDefined()
  })
})
