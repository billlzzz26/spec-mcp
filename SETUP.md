# Setup Guide

## การติดตั้งเบื้องต้น

### 1. ติดตั้ง Dependencies

```bash
npm install
# หรือ
npm run setup
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` (อยู่แล้ว):

```env
# Modal Backend API
NEXT_PUBLIC_MODAL_API_BASE=https://billlzzz10--skill-embedding-service
SKILL_SERVICE_API_KEY=your_api_key_here
```

### 3. VSCode Configuration

โปรเจกต์มี `.vscode/settings.json` และ `.vscode/extensions.json` ติดตั้งแล้ว:

**Extensions ที่แนะนำ:**
- Prettier — Code Formatter
- ESLint
- Tailwind CSS IntelliSense
- Python (สำหรับ app.py)
- Pylance

**Settings:**
- Auto-formatting on save
- ESLint auto-fix
- Line rulers at 80/120 chars
- TypeScript support

## Scripts

### Development

```bash
# Start Next.js dev server
npm run dev

# Start Python backend (Modal)
npm run dev:python

# Run both (ในแยก terminal)
npm run dev & npm run dev:python
```

### Testing

```bash
# รัน tests ทั้งหมด
npm test

# รัน tests + watch mode
npm test

# รัน tests + UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:debug
```

### Building & Production

```bash
# Type checking
npm run type-check

# Lint check
npm run lint:check
npm run lint  # + auto-fix

# Format code
npm run format

# Build
npm run build
npm start
```

### Setup & Maintenance

```bash
# Clean install (remove node_modules + .next)
npm run setup:clean

# Pre-commit checks
npm run precommit
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # หน้า Home
│   ├── layout.tsx                  # Root layout + Analytics
│   ├── api/
│   │   └── route.ts                # MCP API bridge
│   └── globals.css                 # Tailwind + theme tokens
├── components/
│   ├── ui/                         # shadcn/ui components
│   └── metric-widget/
│       ├── MetricDashboard.tsx     # Main dashboard container
│       ├── MetricCard.tsx          # Individual metric card
│       ├── MetricChart.tsx         # Recharts visualization
│       └── index.ts                # Barrel export
├── lib/
│   ├── metric-widget.ts            # Service layer: data generation
│   ├── metric-api.ts               # API bridge: connect to Modal
│   └── mcp/                        # MCP utilities (if any)
├── mcp/
│   ├── server/
│   │   ├── index.ts                # MCP server + tool registration
│   │   └── tools/
│   │       ├── index.ts            # Barrel export
│   │       ├── search.ts           # search_skills tool
│   │       ├── index_skill.ts      # index_skill tool
│   │       ├── create-collection.ts # create_collection tool
│   │       └── health-check.ts     # health_check tool
│   ├── catalog/
│   │   ├── index.ts                # Barrel export
│   │   ├── handler.ts              # Catalog request handler
│   │   ├── builder.ts              # Catalog parsing logic
│   │   ├── types.ts                # Catalog types
│   │   └── config/
│   │       └── index.ts            # Config loading
│   └── types.ts                    # Global MCP types
└── __tests__/
    ├── metric-widget.test.ts       # Service layer tests
    ├── MetricCard.test.tsx         # Component tests
    ├── mcp-server.test.ts          # MCP server tests
    └── setup.ts                    # Test environment setup
```

## Testing

### Unit Tests (metric-widget)

```bash
npm test metric-widget.test
```

ทดสอบ:
- `formatValue()` — formatting numbers/percentages
- `calculateTrend()` — trend detection logic
- `getMetricWidgetData()` — data generation consistency (seeded random)
- `METRIC_CONFIGS` — config structure

### Component Tests (MetricCard)

```bash
npm test MetricCard.test
```

ทดสอบ:
- Rendering metric data
- Expand/collapse toggle
- Time range selection
- Refresh callback
- Loading state
- Trend badge display

### MCP Tests (mcp-server)

```bash
npm test mcp-server.test
```

ทดสอบ:
- Server instantiation
- Tool registration
- Barrel exports (tools, catalog)
- Catalog handler integration
- Module structure (ESM imports)

## Troubleshooting

### Hydration Mismatch

**Problem:** Browser console shows "Hydration failed..."

**Solution:** โค้ดได้ทำการแก้ไขแล้วด้วย:
1. Hooks ทั้งหมดอยู่ก่อน early return
2. `isMounted` state เพื่อ skip SSR render
3. Seeded random generator สำหรับ consistent data

### Backend Connection Failed

**Problem:** "Backend disconnected - ใช้ mock data"

**Solution:**
1. ตรวจสอบ `.env.local` มีค่า `NEXT_PUBLIC_MODAL_API_BASE`
2. ตรวจสอบ Modal app (`app.py`) กำลัง run
3. ตรวจสอบ API key ถูกต้อง
4. ดูที่ browser console สำหรับ network errors

### Tests Failing

**Problem:** Tests fail with module not found

**Solution:**
1. ตรวจสอบ `vitest.config.ts` alias `@` ชี้ไป `./src`
2. ตรวจสอบ `src/test/setup.ts` มี globals + mocks
3. รัน `npm run type-check` เพื่อ verify TypeScript
4. ลองใช้ `npm run setup:clean` for fresh install

## Performance Tips

1. **Build:** `npm run build` ดำเนินการ Next.js optimization
2. **Analyze:** ใช้ `next/bundle-analyzer` (ยังไม่ installed)
3. **Profiling:** ใช้ React DevTools profiler
4. **Metrics:** Vercel Analytics ติดตั้งแล้ว

## Additional Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Vitest](https://vitest.dev)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Recharts](https://recharts.org)

## Contact & Support

สำหรับคำถาม ติดต่อทีมพัฒนา หรือเปิด GitHub issue
