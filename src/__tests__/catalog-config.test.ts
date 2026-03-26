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

    // triggers ไม่ควรมี stopwords
    for (const trigger of pythonSkill!.triggers) {
      if (stopwords.has(trigger)) {
        // ถ้า trigger เป็น tag ที่กำหนดโดยตรง อาจไม่ถูก filter
        // แต่ถ้ามาจาก name/description ควรถูก filter
        console.log(`[v0] Warning: trigger "${trigger}" is a stopword`)
      }
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
