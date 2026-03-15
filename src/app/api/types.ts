/**
 * types.ts
 * --------
 * Shared TypeScript types and Zod schemas for Skill Service MCP Server
 * Based on SKILL.md frontmatter format analysis
 */

import { z } from "zod";

/**
 * Skill metadata source information
 * Matches the metadata.source structure found in SKILL.md files
 */
export const SkillSourceSchema = z.object({
  repository: z
    .string()
    .optional()
    .describe("Source repository URL (e.g., 'https://github.com/user/repo')"),
  path: z
    .string()
    .optional()
    .describe("Path within the repository (e.g., 'skills/my-skill')"),
  license_path: z
    .string()
    .optional()
    .describe("Path to license file (e.g., 'LICENSE.txt')"),
});

export type SkillSource = z.infer<typeof SkillSourceSchema>;

/**
 * Additional skill metadata
 * Matches the metadata object found in some SKILL.md files
 */
export const SkillMetadataSchema = z.object({
  category: z
    .string()
    .optional()
    .describe("Metadata category (separate from plugin_domain)"),
  source: SkillSourceSchema.optional().describe("Source information"),
});

export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;

/**
 * Main Skill schema
 * Combines all fields found across 11 SKILL.md files
 * Used for input validation in index_skill tool
 */
export const SkillSchema = z.object({
  // Required fields (from SKILL.md frontmatter)
  skill_id: z
    .string()
    .min(1, "skill_id is required")
    .max(256, "skill_id must not exceed 256 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "skill_id must be kebab-case (lowercase letters, numbers, hyphens)",
    )
    .describe("Unique identifier for the skill (kebab-case, e.g., 'mcp-builder')"),

  skill_name: z
    .string()
    .min(1, "skill_name is required")
    .max(256, "skill_name must not exceed 256 characters")
    .describe("Display name of the skill"),

  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(4096, "Description must not exceed 4096 characters")
    .describe("Detailed description of what the skill does"),

  // Optional fields (found in various SKILL.md files)
  version: z
    .string()
    .optional()
    .default("1.0.0")
    .describe("Version string (e.g., '1.0.0')"),

  author: z
    .string()
    .optional()
    .describe("Author or creator of the skill"),

  category: z
    .string()
    .optional()
    .describe("Category classification (e.g., 'development', 'integration')"),

  tags: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Tags for categorization and search (alias for capabilities)"),

  capabilities: z
    .array(z.string())
    .optional()
    .default([])
    .describe("List of capabilities or skills provided"),

  plugin_domain: z
    .string()
    .optional()
    .describe("Domain category (e.g., 'development', 'automation')"),

  provider_id: z
    .string()
    .optional()
    .describe("Provider or organization identifier"),

  license: z
    .string()
    .optional()
    .describe("License type (e.g., 'MIT', 'Apache-2.0')"),

  user_invocable: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether users can directly invoke this skill"),

  metadata: SkillMetadataSchema.optional().describe(
    "Additional metadata (category, source info)",
  ),

  // Auto-generated fields (not in input, but in output)
  triggers: z
    .array(z.string())
    .optional()
    .describe("Auto-generated trigger words for search (computed from name/description/tags)"),

  path: z
    .string()
    .optional()
    .describe("File system path to SKILL.md (for catalog skills)"),
});

export type Skill = z.infer<typeof SkillSchema>;

/**
 * Search request schema
 * Used for search_skills tool input validation
 */
export const SearchRequestSchema = z.object({
  query: z
    .string()
    .min(1, "Query is required")
    .max(500, "Query must not exceed 500 characters")
    .describe("Natural language search query"),

  top_k: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe("Maximum number of results to return"),

  filter_expr: z
    .string()
    .optional()
    .describe("Optional Milvus filter expression (e.g., 'plugin_domain == \"development\"')"),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

/**
 * Search result schema
 * Represents a skill with additional search metadata
 */
export const SearchResultSchema = SkillSchema.extend({
  rerank_score: z
    .number()
    .optional()
    .describe("Relevance score from reranking (0.0 - 1.0)"),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Create collection request schema
 * Used for create_collection tool input validation
 */
export const CreateCollectionRequestSchema = z.object({
  drop_if_exists: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, drops existing collection first (DESTRUCTIVE!)"),
});

export type CreateCollectionRequest = z.infer<
  typeof CreateCollectionRequestSchema
>;

/**
 * Health check response schema
 */
export const HealthCheckResponseSchema = z.object({
  status: z.string(),
  services: z
    .object({
      voyage_ai: z.boolean().optional(),
      zilliz: z.boolean().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export type HealthCheckResponse = z.infer<
  typeof HealthCheckResponseSchema
>;

/**
 * Catalog skill schema
 * Extended skill with catalog-specific fields
 */
export const CatalogSkillSchema = SkillSchema.extend({
  category: z.string().describe("Auto-assigned category based on rules"),
  triggers: z.array(z.string()).describe("Generated trigger words"),
  path: z.string().describe("Path to SKILL.md file"),
});

export type CatalogSkill = z.infer<typeof CatalogSkillSchema>;

/**
 * Catalog response schema
 */
export const CatalogResponseSchema = z.object({
  skills: z.array(CatalogSkillSchema),
  bundles: z.record(z.string(), z.array(z.string())).optional(),
  config: z.object({
    version: z.string(),
    categories: z.object({
      rules: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          keywords: z.array(z.string()),
        }),
      ),
      fallback: z.string(),
    }),
  }),
});

export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;
