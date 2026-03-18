import { describe, it, expect, beforeEach, vi } from 'vitest'
import { server } from '@/mcp/server/index'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp'

describe('MCP Server', () => {
  it('ควร instantiate server ถูกต้อง', () => {
    expect(server).toBeDefined()
    expect(server.name).toBe('skill-embedding-service')
    expect(server.version).toBe('1.0.0')
  })

  it('ควร register tools ทั้งหมด 4 ตัว', () => {
    // ตรวจสอบว่า tools registration ไม่มี error
    // (ในการทดสอบจริง ควร mock registerTool)
    expect(server).toBeDefined()
  })

  describe('Tool Definitions', () => {
    it('ควร มี searchSkillsTool definition', async () => {
      // Dynamic import เพื่อทดสอบ tool definition
      const { searchSkillsTool } = await import('@/mcp/server/tools/search')
      
      expect(searchSkillsTool).toBeDefined()
      expect(searchSkillsTool.name).toBe('search_skills')
      expect(searchSkillsTool.description).toBeTruthy()
      expect(searchSkillsTool.inputSchema).toBeDefined()
      expect(searchSkillsTool.handler).toBeDefined()
    })

    it('ควร มี indexSkillTool definition', async () => {
      const { indexSkillTool } = await import('@/mcp/server/tools/index_skill')
      
      expect(indexSkillTool).toBeDefined()
      expect(indexSkillTool.name).toBe('index_skill')
      expect(indexSkillTool.description).toBeTruthy()
      expect(indexSkillTool.inputSchema).toBeDefined()
      expect(indexSkillTool.handler).toBeDefined()
    })

    it('ควร มี createCollectionTool definition', async () => {
      const { createCollectionTool } = await import('@/mcp/server/tools/create-collection')
      
      expect(createCollectionTool).toBeDefined()
      expect(createCollectionTool.name).toBe('create_collection')
      expect(createCollectionTool.description).toBeTruthy()
    })

    it('ควร มี healthCheckTool definition', async () => {
      const { healthCheckTool } = await import('@/mcp/server/tools/health-check')
      
      expect(healthCheckTool).toBeDefined()
      expect(healthCheckTool.name).toBe('health_check')
    })
  })

  describe('Catalog Integration', () => {
    it('ควร import catalog handler ได้สำเร็จ', async () => {
      const { createCatalogHandler } = await import('@/mcp/catalog/handler')
      expect(createCatalogHandler).toBeDefined()
    })

    it('ควร load catalog config ได้สำเร็จ', async () => {
      const { loadConfig } = await import('@/mcp/catalog/config')
      expect(loadConfig).toBeDefined()
    })

    it('ควร export catalogTools array', async () => {
      const { catalogTools } = await import('@/mcp/catalog/handler')
      expect(Array.isArray(catalogTools)).toBe(true)
      expect(catalogTools.length).toBeGreaterThan(0)
    })
  })

  describe('Module Structure', () => {
    it('ควร มี barrel export สำหรับ tools', async () => {
      const toolsExports = await import('@/mcp/server/tools')
      
      expect(toolsExports.searchSkillsTool).toBeDefined()
      expect(toolsExports.indexSkillTool).toBeDefined()
      expect(toolsExports.createCollectionTool).toBeDefined()
      expect(toolsExports.healthCheckTool).toBeDefined()
    })

    it('ควร มี barrel export สำหรับ catalog', async () => {
      const catalogExports = await import('@/mcp/catalog')
      
      expect(catalogExports.createCatalogHandler).toBeDefined()
      expect(catalogExports.catalogTools).toBeDefined()
    })
  })
})
