# Roadmap

## Goals

1. **Semantic Search** - ค้นหา skills ด้วยความหมาย ไม่ใช่ keyword
2. **Multi-provider Support** - รองรับ skills จากหลายผู้สร้าง
3. **Performance Tracking** - วัดผลและวิเคราะห์การใช้งาน skills
4. **MCP Integration** - ใช้กับ AI assistants ได้

---

## Next Steps

### Sprint 1 (สัปดาห์นี้)
- [ ] เพิ่ม batch indexing
- [ ] ทดสอบ MCP server ให้ครบทุก tools
- [ ] แก้ rate limit issue ของ Voyage AI

### Sprint 2 (สัปดาห์หน้า)
- [ ] เพิ่ม Hooks system (pre-invocation, error, post-invocation)
- [ ] ตั้งค่า MySQL/PostgreSQL เก็บ logs
- [ ] เขียน schema สำหรับ `skill_invocation_logs`

### Sprint 3 (2 สัปดาห์หน้า)
- [ ] ทำ dashboard แสดง usage stats
- [ ] เพิ่ม assertion system สำหรับวัดผล skills
- [ ] เขียน test cases สำหรับ skills ที่มี

---

## Milestones

| Milestone | Target | Done? |
|-----------|--------|-------|
| Core API + Search | 2026-03-31 | ✅ |
| Analytics + Logging | 2026-04-30 | ⏳ |
| Auto-evaluation | 2026-05-31 | ⏳ |
| Public Release | 2026-06-30 | ⏳ |

---

## TODO List

**High Priority:**
- [ ] เพิ่ม error taxonomy ใน logs
- [ ] ทำ caching สำหรับ queries ที่พบบ่อย
- [ ] เขียน documentation สำหรับ skill creators

**Medium Priority:**
- [ ] เพิ่ม hybrid search (keyword + semantic)
- [ ] ทำ CLI สำหรับจัดการ skills
- [ ] เพิ่ม user feedback collection

**Backlog:**
- [ ] Skill marketplace
- [ ] Plugin SDK
- [ ] Third-party integrations (Slack, Discord)

---

## Success Metrics

- [ ] Search latency < 500ms (p95)
- [ ] Search precision@5 > 0.85
- [ ] API uptime > 99%
- [ ] 50+ skills indexed
