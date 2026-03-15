/**
 * hooks.ts
 * --------
 * Hook system สำหรับ Skill Invocation Lifecycle
 *
 * Lifecycle:
 *   pre-invocation → (execution) → token-usage* → error? → post-invocation
 *
 * วิธีใช้:
 *   const hooks = createHookSystem(db)
 *   const ctx = await hooks.preInvocation({ skillId, sessionId, userId, inputParameters })
 *   // ... run skill ...
 *   await hooks.postInvocation(ctx.invocationId, { status: 'success', outputData, durationMs, tokens })
 *   // หรือถ้า error:
 *   await hooks.errorInvocation(ctx.invocationId, error)
 */

import { randomUUID } from 'node:crypto'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import { skillInvocationLogs, assertionResults } from './schema.js'
import type { NewSkillInvocationLog, NewAssertionResult } from './schema.js'

// ─── Hook Payloads ────────────────────────────────────────────────────────────

export interface PreInvocationPayload {
  skillId:         string
  sessionId:       string
  userId?:         string
  skillVersion?:   string
  pluginDomain?:   string
  inputParameters?: Record<string, unknown>
}

export interface PostInvocationPayload {
  status:        'success' | 'failure' | 'cancelled'
  outputData?:   Record<string, unknown>
  durationMs?:   number
  totalTokens?:  number
  inputTokens?:  number
  outputTokens?: number
  cpuUsage?:     number
  memoryUsage?:  number
  apiCalls?:     number
  toolCalls?:    number
  assertions?:   AssertionInput[]
}

export interface AssertionInput {
  assertionName: string
  passed:        boolean
  evidence?:     string
}

export interface ErrorInvocationPayload {
  errorType?:       ErrorType
  errorMessage:     string
  stackTrace?:      string
  contextSnapshot?: Record<string, unknown>
}

export type ErrorType =
  | 'HallucinationError'
  | 'InstructionFollowingError'
  | 'IntegrationError'
  | 'ContextOverflow'
  | 'RuntimeError'
  | 'UnknownError'

export interface TokenUsagePayload {
  inputTokens?:  number
  outputTokens?: number
  totalTokens?:  number
}

// ─── Context ──────────────────────────────────────────────────────────────────

export interface InvocationContext {
  invocationId: string
  skillId:      string
  sessionId:    string
  startedAt:    number   // Date.now()
}

// ─── Hook System ──────────────────────────────────────────────────────────────

export function createHookSystem(db: PostgresJsDatabase<any>) {
  /**
   * pre-invocation hook
   * เรียกก่อน skill จะเริ่มทำงาน — สร้าง record ใน DB ด้วย status = 'in_progress'
   */
  async function preInvocation(payload: PreInvocationPayload): Promise<InvocationContext> {
    const invocationId = randomUUID()
    const now = Date.now()

    const row: NewSkillInvocationLog = {
      invocationId,
      sessionId:       payload.sessionId,
      userId:          payload.userId,
      skillId:         payload.skillId,
      skillVersion:    payload.skillVersion,
      pluginDomain:    payload.pluginDomain,
      inputParameters: payload.inputParameters,
      status:          'in_progress',
      timestamp:       new Date(),
    }

    await db.insert(skillInvocationLogs).values(row)

    return { invocationId, skillId: payload.skillId, sessionId: payload.sessionId, startedAt: now }
  }

  /**
   * post-invocation hook
   * เรียกหลัง skill ทำงานเสร็จ (success หรือ failure) — update record + insert assertions
   */
  async function postInvocation(
    invocationId: string,
    payload: PostInvocationPayload,
  ): Promise<void> {
    await db
      .update(skillInvocationLogs)
      .set({
        status:       payload.status,
        outputData:   payload.outputData,
        durationMs:   payload.durationMs,
        totalTokens:  payload.totalTokens,
        inputTokens:  payload.inputTokens,
        outputTokens: payload.outputTokens,
        cpuUsage:     payload.cpuUsage,
        memoryUsage:  payload.memoryUsage,
        apiCalls:     payload.apiCalls,
        toolCalls:    payload.toolCalls,
      })
      .where(eq(skillInvocationLogs.invocationId, invocationId))

    // insert assertion results ถ้ามี
    if (payload.assertions?.length) {
      const rows: NewAssertionResult[] = payload.assertions.map((a) => ({
        id:            randomUUID(),
        invocationId,
        assertionName: a.assertionName,
        passed:        a.passed,
        evidence:      a.evidence,
      }))
      await db.insert(assertionResults).values(rows)
    }
  }

  /**
   * error hook
   * เรียกเมื่อเกิด exception ระหว่าง skill execution — update errorType, message, trace
   */
  async function errorInvocation(
    invocationId: string,
    payload: ErrorInvocationPayload,
  ): Promise<void> {
    await db
      .update(skillInvocationLogs)
      .set({
        status:          'failure',
        errorType:        payload.errorType ?? 'UnknownError',
        errorMessage:     payload.errorMessage,
        stackTrace:       payload.stackTrace,
        contextSnapshot:  payload.contextSnapshot,
      })
      .where(eq(skillInvocationLogs.invocationId, invocationId))
  }

  /**
   * token-usage hook (optional, mid-execution)
   * เรียกระหว่างทำงานเพื่อ update token count แบบ real-time
   */
  async function tokenUsage(
    invocationId: string,
    payload: TokenUsagePayload,
  ): Promise<void> {
    await db
      .update(skillInvocationLogs)
      .set({
        inputTokens:  payload.inputTokens,
        outputTokens: payload.outputTokens,
        totalTokens:  payload.totalTokens,
      })
      .where(eq(skillInvocationLogs.invocationId, invocationId))
  }

  /**
   * feedback hook
   * เรียกเมื่อ user ให้ rating หลังการใช้งาน
   */
  async function submitFeedback(
    invocationId: string,
    rating: number,
    comment?: string,
  ): Promise<void> {
    await db
      .update(skillInvocationLogs)
      .set({ feedbackRating: rating, feedbackComment: comment })
      .where(eq(skillInvocationLogs.invocationId, invocationId))
  }

  /**
   * Helper: wrap skill execution ด้วย hooks อัตโนมัติ
   * ใช้แทนการเรียก pre/post/error แยกกัน
   *
   * ตัวอย่าง:
   *   const result = await hooks.withTracking(
   *     { skillId: 'python-pro', sessionId, userId },
   *     async (ctx) => {
   *       // run skill...
   *       return { output, assertions: [...] }
   *     }
   *   )
   */
  async function withTracking<T extends { assertions?: AssertionInput[] }>(
    prePayload: PreInvocationPayload,
    fn: (ctx: InvocationContext) => Promise<T & { durationMs?: number }>,
  ): Promise<{ result: T; invocationId: string }> {
    const ctx = await preInvocation(prePayload)
    const t0 = Date.now()

    try {
      const result = await fn(ctx)
      await postInvocation(ctx.invocationId, {
        status:     'success',
        durationMs: result.durationMs ?? Date.now() - t0,
        assertions: result.assertions,
      })
      return { result, invocationId: ctx.invocationId }
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err))
      await errorInvocation(ctx.invocationId, {
        errorMessage: e.message,
        stackTrace:   e.stack,
        errorType:    classifyError(e),
      })
      throw err
    }
  }

  return {
    preInvocation,
    postInvocation,
    errorInvocation,
    tokenUsage,
    submitFeedback,
    withTracking,
  }
}

// ─── Error Classifier ─────────────────────────────────────────────────────────

function classifyError(err: Error): ErrorType {
  const msg = err.message.toLowerCase()
  if (msg.includes('context') && (msg.includes('overflow') || msg.includes('limit')))
    return 'ContextOverflow'
  if (msg.includes('api') || msg.includes('fetch') || msg.includes('network'))
    return 'IntegrationError'
  if (msg.includes('instruction') || msg.includes('format'))
    return 'InstructionFollowingError'
  return 'RuntimeError'
}
