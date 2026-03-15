# Skill Service Roadmap

**Last Updated:** March 15, 2025

---

## Current Status

### ✅ Completed (Layer 0-1)

**Layer 0 - Catalog & Config:**
- ✅ `skills.config.json` - Full schema with 95 stopwords, 8 categories, 5 bundles
- ✅ `catalog.ts` (688 lines) - Builder with aliases, bundles, categories
- ✅ 5 MCP Catalog Tools implemented
- ⏳ Testing pending (no real skills directory yet)

**Layer 1 - Vector Search:**
- ✅ Modal app deployed (444 lines)
- ✅ 4 HTTP endpoints live
- ✅ Voyage AI integration (voyage-2, rerank-2)
- ✅ Zilliz Cloud integration (HNSW, COSINE)
- ⏳ End-to-end testing pending

### ❌ Not Started (Layer 2-4)

**Layer 2 - Tracking & Metrics:** 0/22 items
**Layer 3 - Evaluation:** 0/10 items
**Layer 4 - Dashboard:** 1/6 items (UI components only)

---

## Phase 1: Foundation ✅

**Status:** Complete

- [x] Modal deployment setup
- [x] Voyage AI integration
- [x] Zilliz Cloud integration
- [x] Catalog builder (688 lines)
- [x] MCP tools (9 total)
- [x] Next.js UI with dark mode
- [x] Unit tests (6 tests)
- [x] E2E tests (30+ tests)

**Deployed:** https://modal.com/apps/billlzzz10/main/deployed/skill-embedding-service

---

## Phase 2: Testing & Validation

**Status:** Pending

### 2.1 Catalog Testing
- [ ] Create skills directory with SKILL.md files
- [ ] Test buildCatalog() with real data
- [ ] Verify alias generation
- [ ] Test bundle grouping
- [ ] Test category assignment

### 2.2 Vector Search Testing
- [ ] Health check endpoint test
- [ ] Create collection test
- [ ] Index skill test (single + batch)
- [ ] Search skills test (semantic + rerank)
- [ ] Filter expression test

### 2.3 Integration Testing
- [ ] End-to-end: index → search → results
- [ ] MCP tool testing via host
- [ ] Error handling scenarios
- [ ] Rate limiting test

---

## Phase 3: Tracking & Metrics (Layer 2)

**Status:** Not Started

### 3.1 Database Setup
- [ ] PostgreSQL setup
- [ ] Drizzle ORM configuration
- [ ] Migration scripts
- [ ] Schema: skill_invocation_logs, assertion_results

### 3.2 Hook System
- [ ] preInvocation() hook
- [ ] postInvocation() hook
- [ ] errorInvocation() hook
- [ ] withTracking() wrapper
- [ ] submitFeedback() function

### 3.3 MCP Tracking Tools
- [ ] log_invocation tool
- [ ] get_skill_metrics tool
- [ ] get_error_report tool
- [ ] MCP integration

---

## Phase 4: Evaluation (Layer 3)

**Status:** Not Started

### 4.1 Assertion System
- [ ] output_is_json assertion
- [ ] has_required_fields assertion
- [ ] latency_under_ms assertion
- [ ] token_under assertion
- [ ] Custom assertions

### 4.2 Eval Runner
- [ ] run_eval MCP tool
- [ ] Test case persistence
- [ ] compare_versions tool
- [ ] Eval report generation

---

## Phase 5: Dashboard (Layer 4)

**Status:** Partial (UI only)

### 5.1 Analytics Charts
- [ ] Active Hours heatmap
- [ ] Top Skills chart
- [ ] Error Trends chart
- [ ] Trigger Accuracy metric

### 5.2 Real-time Features
- [ ] SSE/WebSocket setup
- [ ] Live updates
- [ ] Connection status

---

## Next Steps (Beyond Spec)

- [ ] Skill Versioning (Git SHA tracking)
- [ ] Trigger Accuracy logging
- [ ] TTL auto-fail for in_progress
- [ ] Skill Dependency Graph
- [ ] A/B Testing support
- [ ] Skill Recommendation
- [ ] Multi-provider auth
- [ ] Skill Health Score

---

## Timeline

| Phase | Status | Items | ETA |
|-------|--------|-------|-----|
| Phase 1: Foundation | ✅ Done | 20+ | March 2025 |
| Phase 2: Testing | ⏳ Pending | 24 | TBD |
| Phase 3: Tracking | ⏳ Pending | 22 | TBD |
| Phase 4: Evaluation | ⏳ Pending | 10 | TBD |
| Phase 5: Dashboard | ⏳ Pending | 6 | TBD |

---

## Resources

- [Checklist](../checklist.md) - Full verification checklist
- [OpenSpec](./OPENSPEC.md) - Technical specification
- [README](../README.md) - Project overview
