/**
 * schema.ts
 * ---------
 * Drizzle ORM schema สำหรับ Skill Invocation Tracking
 * ใช้ PostgreSQL (เปลี่ยนเป็น mysql-core ได้ถ้าต้องการ)
 *
 * Run migration:
 *   npx drizzle-kit generate
 *   npx drizzle-kit migrate
 */

import {
  pgTable,
  varchar,
  timestamp,
  jsonb,
  integer,
  boolean,
  text,
  index,
  real,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── skill_invocation_logs ────────────────────────────────────────────────────

export const skillInvocationLogs = pgTable(
  'skill_invocation_logs',
  {
    invocationId:       varchar('invocation_id', { length: 256 }).primaryKey(),
    sessionId:          varchar('session_id', { length: 256 }).notNull(),
    userId:             varchar('user_id', { length: 256 }),
    skillId:            varchar('skill_id', { length: 256 }).notNull(),
    skillVersion:       varchar('skill_version', { length: 50 }),
    pluginDomain:       varchar('plugin_domain', { length: 256 }),

    timestamp:          timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    status:             varchar('status', { length: 50 }).notNull(),
    // 'success' | 'failure' | 'in_progress' | 'cancelled'

    inputParameters:    jsonb('input_parameters'),
    outputData:         jsonb('output_data'),

    // metrics (flattened จาก metrics object)
    durationMs:         integer('duration_ms'),
    totalTokens:        integer('total_tokens'),
    inputTokens:        integer('input_tokens'),
    outputTokens:       integer('output_tokens'),
    cpuUsage:           real('cpu_usage'),          // float: % usage
    memoryUsage:        integer('memory_usage'),    // bytes
    apiCalls:           integer('api_calls'),
    toolCalls:          integer('tool_calls'),

    // error (flattened — แยก assertionResults ไปอีกตาราง)
    errorType:          varchar('error_type', { length: 100 }),
    // HallucinationError | InstructionFollowingError | IntegrationError
    // ContextOverflow | RuntimeError | UnknownError
    errorMessage:       text('error_message'),
    stackTrace:         text('stack_trace'),
    contextSnapshot:    jsonb('context_snapshot'),

    // user feedback
    feedbackRating:     integer('feedback_rating'),    // 1–5
    feedbackComment:    text('feedback_comment'),
  },
  (t) => [
    index('idx_sil_skill_id').on(t.skillId),
    index('idx_sil_session_id').on(t.sessionId),
    index('idx_sil_status').on(t.status),
    index('idx_sil_timestamp').on(t.timestamp),
    index('idx_sil_plugin_domain').on(t.pluginDomain),
  ],
)

// ─── assertion_results ────────────────────────────────────────────────────────

export const assertionResults = pgTable(
  'assertion_results',
  {
    id:            varchar('id', { length: 256 }).primaryKey(),
    invocationId:  varchar('invocation_id', { length: 256 })
                     .notNull()
                     .references(() => skillInvocationLogs.invocationId, {
                       onDelete: 'cascade',
                     }),
    assertionName: varchar('assertion_name', { length: 256 }).notNull(),
    passed:        boolean('passed').notNull(),
    evidence:      text('evidence'),
  },
  (t) => [
    index('idx_ar_invocation_id').on(t.invocationId),
    index('idx_ar_passed').on(t.passed),
  ],
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const invocationRelations = relations(skillInvocationLogs, ({ many }) => ({
  assertionResults: many(assertionResults),
}))

export const assertionRelations = relations(assertionResults, ({ one }) => ({
  invocation: one(skillInvocationLogs, {
    fields: [assertionResults.invocationId],
    references: [skillInvocationLogs.invocationId],
  }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkillInvocationLog    = typeof skillInvocationLogs.$inferSelect
export type NewSkillInvocationLog = typeof skillInvocationLogs.$inferInsert
export type AssertionResult       = typeof assertionResults.$inferSelect
export type NewAssertionResult    = typeof assertionResults.$inferInsert
