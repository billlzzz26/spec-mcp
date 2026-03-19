/**
 * metrics.ts
 * ----------
 * MCP tool definitions + handler สำหรับ Layer 2 Tracking & Metrics
 *
 * Tools:
 *   log_invocation      — บันทึก skill invocation พร้อม pre/post/error hooks
 *   get_skill_metrics   — ดู performance metrics ของ skill (latency, tokens, success rate)
 *   get_error_report    — วิเคราะห์ error taxonomy ตาม skill / time range
 *
 * วิธี integrate เข้า MCP server:
 *   import { metricsTools, createMetricsHandler } from './metrics.js'
 *   const handler = createMetricsHandler(db)
 *   for (const tool of metricsTools) {
 *     server.tool(tool.name, tool.description, tool.inputSchema, (args) =>
 *       handler(tool.name, args)
 *     )
 *   }
 */

import { eq, desc, gte, lte, and, sql, count, avg, sum } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { skillInvocationLogs, assertionResults } from './schema'
import { createHookSystem } from './hooks'
import type { ErrorType, AssertionInput } from './hooks'

// ─── MCP Tool Definitions ─────────────────────────────────────────────────────

export const metricsTools = [
  {
    name: 'log_invocation',
    description:
      'Log a skill invocation with full lifecycle (pre → post or error). ' +
      'Use before/after running a skill to track metrics, errors, and assertion results.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        phase: {
          type: 'string',
          enum: ['pre', 'post', 'error', 'feedback'],
          description:
            'Lifecycle phase: "pre" = start tracking, "post" = success/failure result, ' +
            '"error" = exception occurred, "feedback" = user rating',
        },
        // shared
        invocationId: {
          type: 'string',
          description: 'Required for post/error/feedback. Returned from pre phase.',
        },
        // pre phase
        skillId:          { type: 'string', description: '[pre] Skill being invoked' },
        sessionId:        { type: 'string', description: '[pre] Current session id' },
        userId:           { type: 'string', description: '[pre] User id (optional)' },
        skillVersion:     { type: 'string', description: '[pre] Skill version' },
        pluginDomain:     { type: 'string', description: '[pre] Plugin domain' },
        inputParameters:  { type: 'object', description: '[pre] Input params to skill' },
        // post phase
        status: {
          type: 'string',
          enum: ['success', 'failure', 'cancelled'],
          description: '[post] Invocation result status',
        },
        outputData:   { type: 'object',  description: '[post] Output from skill' },
        durationMs:   { type: 'number',  description: '[post] Execution time in ms' },
        totalTokens:  { type: 'number',  description: '[post] Total tokens consumed' },
        inputTokens:  { type: 'number',  description: '[post] Input tokens' },
        outputTokens: { type: 'number',  description: '[post] Output tokens' },
        apiCalls:     { type: 'number',  description: '[post] External API calls made' },
        toolCalls:    { type: 'number',  description: '[post] Internal tool calls made' },
        assertions: {
          type: 'array',
          description: '[post] Assertion results for task success measurement',
          items: {
            type: 'object',
            properties: {
              assertionName: { type: 'string' },
              passed:        { type: 'boolean' },
              evidence:      { type: 'string' },
            },
            required: ['assertionName', 'passed'],
          },
        },
        // error phase
        errorType: {
          type: 'string',
          enum: [
            'HallucinationError', 'InstructionFollowingError', 'IntegrationError',
            'ContextOverflow', 'RuntimeError', 'UnknownError',
          ],
          description: '[error] Error category',
        },
        errorMessage:    { type: 'string', description: '[error] Error message' },
        stackTrace:      { type: 'string', description: '[error] Stack trace' },
        contextSnapshot: { type: 'object', description: '[error] Context at failure time' },
        // feedback phase
        feedbackRating:  { type: 'number', description: '[feedback] Rating 1–5' },
        feedbackComment: { type: 'string', description: '[feedback] User comment' },
      },
      required: ['phase'],
    },
  },
  {
    name: 'get_skill_metrics',
    description:
      'Get performance metrics for a skill: success rate, avg latency, token usage, assertion pass rate. ' +
      'Filter by time range.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        skillId: {
          type: 'string',
          description: 'Skill id to analyze (omit for all skills)',
        },
        from: {
          type: 'string',
          description: 'ISO datetime start (e.g. "2025-01-01T00:00:00Z")',
        },
        to: {
          type: 'string',
          description: 'ISO datetime end (default: now)',
        },
        groupBy: {
          type: 'string',
          enum: ['skill', 'domain', 'day'],
          description: 'Aggregate dimension (default: skill)',
        },
        limit: {
          type: 'number',
          description: 'Max rows (default: 20)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_error_report',
    description:
      'Error taxonomy report: breakdown by errorType, top failing skills, error trends. ' +
      'Supports filter by skillId, errorType, time range.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        skillId: {
          type: 'string',
          description: 'Filter by skill id (omit for all)',
        },
        errorType: {
          type: 'string',
          enum: [
            'HallucinationError', 'InstructionFollowingError', 'IntegrationError',
            'ContextOverflow', 'RuntimeError', 'UnknownError',
          ],
          description: 'Filter by error type',
        },
        from: {
          type: 'string',
          description: 'ISO datetime start',
        },
        to: {
          type: 'string',
          description: 'ISO datetime end (default: now)',
        },
        limit: {
          type: 'number',
          description: 'Max rows per section (default: 10)',
        },
      },
      required: [],
    },
  },
] as const

// ─── Handler ──────────────────────────────────────────────────────────────────

export function createMetricsHandler(db: PostgresJsDatabase<any>) {
  const hooks = createHookSystem(db)

  return async function handleMetricsTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (toolName) {

      // ── log_invocation ─────────────────────────────────────────────────────
      case 'log_invocation': {
        const a = args as Record<string, any>

        switch (a.phase) {
          case 'pre': {
            const ctx = await hooks.preInvocation({
              skillId:         a.skillId,
              sessionId:       a.sessionId,
              userId:          a.userId,
              skillVersion:    a.skillVersion,
              pluginDomain:    a.pluginDomain,
              inputParameters: a.inputParameters,
            })
            return { invocationId: ctx.invocationId, phase: 'pre', status: 'tracked' }
          }

          case 'post': {
            await hooks.postInvocation(a.invocationId, {
              status:       a.status ?? 'success',
              outputData:   a.outputData,
              durationMs:   a.durationMs,
              totalTokens:  a.totalTokens,
              inputTokens:  a.inputTokens,
              outputTokens: a.outputTokens,
              apiCalls:     a.apiCalls,
              toolCalls:    a.toolCalls,
              assertions:   a.assertions as AssertionInput[] | undefined,
            })
            return { invocationId: a.invocationId, phase: 'post', status: 'tracked' }
          }

          case 'error': {
            await hooks.errorInvocation(a.invocationId, {
              errorType:       a.errorType as ErrorType | undefined,
              errorMessage:    a.errorMessage ?? 'Unknown error',
              stackTrace:      a.stackTrace,
              contextSnapshot: a.contextSnapshot,
            })
            return { invocationId: a.invocationId, phase: 'error', status: 'tracked' }
          }

          case 'feedback': {
            await hooks.submitFeedback(a.invocationId, a.feedbackRating, a.feedbackComment)
            return { invocationId: a.invocationId, phase: 'feedback', status: 'tracked' }
          }

          default:
            return { error: `Unknown phase: ${a.phase}` }
        }
      }

      // ── get_skill_metrics ──────────────────────────────────────────────────
      case 'get_skill_metrics': {
        const { skillId, from, to, groupBy = 'skill', limit = 20 } = args as {
          skillId?: string
          from?: string
          to?: string
          groupBy?: 'skill' | 'domain' | 'day'
          limit?: number
        }

        const conditions = buildTimeConditions(from, to)
        if (skillId) conditions.push(eq(skillInvocationLogs.skillId, skillId))

        const where = conditions.length ? and(...conditions) : undefined

        // aggregate metrics
        const rows = await db
          .select({
            skillId:       skillInvocationLogs.skillId,
            pluginDomain:  skillInvocationLogs.pluginDomain,
            totalCalls:    count(),
            successCount:  sql<number>`count(*) filter (where ${skillInvocationLogs.status} = 'success')`,
            failureCount:  sql<number>`count(*) filter (where ${skillInvocationLogs.status} = 'failure')`,
            avgDurationMs: avg(skillInvocationLogs.durationMs),
            avgTokens:     avg(skillInvocationLogs.totalTokens),
            totalTokens:   sum(skillInvocationLogs.totalTokens),
            avgRating:     avg(skillInvocationLogs.feedbackRating),
          })
          .from(skillInvocationLogs)
          .where(where)
          .groupBy(skillInvocationLogs.skillId, skillInvocationLogs.pluginDomain)
          .orderBy(desc(count()))
          .limit(limit)

        // assertion pass rate per skill
        const assertionStats = await db
          .select({
            invocationId: assertionResults.invocationId,
            passedCount:  sql<number>`count(*) filter (where ${assertionResults.passed} = true)`,
            totalCount:   count(),
          })
          .from(assertionResults)
          .innerJoin(
            skillInvocationLogs,
            eq(assertionResults.invocationId, skillInvocationLogs.invocationId),
          )
          .where(where)
          .groupBy(assertionResults.invocationId)

        const totalAssertions = assertionStats.reduce((s, r) => s + Number(r.totalCount), 0)
        const passedAssertions = assertionStats.reduce((s, r) => s + Number(r.passedCount), 0)
        const assertionPassRate = totalAssertions > 0
          ? ((passedAssertions / totalAssertions) * 100).toFixed(1)
          : null

        return {
          filter: { skillId, from, to, groupBy },
          assertionPassRate: assertionPassRate ? `${assertionPassRate}%` : 'N/A',
          metrics: rows.map((r) => ({
            skillId:       r.skillId,
            pluginDomain:  r.pluginDomain,
            totalCalls:    Number(r.totalCalls),
            successRate:   r.totalCalls > 0
              ? `${((Number(r.successCount) / Number(r.totalCalls)) * 100).toFixed(1)}%`
              : 'N/A',
            failureCount:  Number(r.failureCount),
            avgDurationMs: r.avgDurationMs ? Number(r.avgDurationMs).toFixed(0) : null,
            avgTokens:     r.avgTokens ? Number(r.avgTokens).toFixed(0) : null,
            totalTokens:   r.totalTokens ? Number(r.totalTokens) : 0,
            avgRating:     r.avgRating ? Number(r.avgRating).toFixed(2) : null,
          })),
        }
      }

      // ── get_error_report ───────────────────────────────────────────────────
      case 'get_error_report': {
        const { skillId, errorType, from, to, limit = 10 } = args as {
          skillId?: string
          errorType?: ErrorType
          from?: string
          to?: string
          limit?: number
        }

        const conditions = buildTimeConditions(from, to)
        conditions.push(eq(skillInvocationLogs.status, 'failure'))
        if (skillId)   conditions.push(eq(skillInvocationLogs.skillId, skillId))
        if (errorType) conditions.push(eq(skillInvocationLogs.errorType, errorType))

        const where = and(...conditions)

        // taxonomy breakdown
        const taxonomy = await db
          .select({
            errorType:   skillInvocationLogs.errorType,
            count:       count(),
          })
          .from(skillInvocationLogs)
          .where(where)
          .groupBy(skillInvocationLogs.errorType)
          .orderBy(desc(count()))

        // top failing skills
        const topFailing = await db
          .select({
            skillId:      skillInvocationLogs.skillId,
            pluginDomain: skillInvocationLogs.pluginDomain,
            errorType:    skillInvocationLogs.errorType,
            failCount:    count(),
          })
          .from(skillInvocationLogs)
          .where(where)
          .groupBy(
            skillInvocationLogs.skillId,
            skillInvocationLogs.pluginDomain,
            skillInvocationLogs.errorType,
          )
          .orderBy(desc(count()))
          .limit(limit)

        // recent errors (last N)
        const recentErrors = await db
          .select({
            invocationId: skillInvocationLogs.invocationId,
            skillId:      skillInvocationLogs.skillId,
            errorType:    skillInvocationLogs.errorType,
            errorMessage: skillInvocationLogs.errorMessage,
            timestamp:    skillInvocationLogs.timestamp,
          })
          .from(skillInvocationLogs)
          .where(where)
          .orderBy(desc(skillInvocationLogs.timestamp))
          .limit(limit)

        const totalErrors = taxonomy.reduce((s, r) => s + Number(r.count), 0)

        return {
          filter: { skillId, errorType, from, to },
          summary: {
            totalErrors,
            taxonomy: taxonomy.map((r) => ({
              errorType: r.errorType ?? 'UnknownError',
              count: Number(r.count),
              pct: `${((Number(r.count) / totalErrors) * 100).toFixed(1)}%`,
            })),
          },
          topFailingSkills: topFailing.map((r) => ({
            skillId:      r.skillId,
            pluginDomain: r.pluginDomain,
            errorType:    r.errorType,
            failCount:    Number(r.failCount),
          })),
          recentErrors: recentErrors.map((r) => ({
            invocationId: r.invocationId,
            skillId:      r.skillId,
            errorType:    r.errorType,
            errorMessage: r.errorMessage,
            timestamp:    r.timestamp,
          })),
        }
      }

      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  }
}

// ─── Helpers ────────────────────────────────────────���─────────────────────────

function buildTimeConditions(from?: string, to?: string) {
  const conditions = []
  if (from) conditions.push(gte(skillInvocationLogs.timestamp, new Date(from)))
  if (to)   conditions.push(lte(skillInvocationLogs.timestamp, new Date(to)))
  return conditions
}
