# Skill Service

Semantic skill search service using Voyage AI and Zilliz Cloud deployed on Modal Serverless with MCP (Model Context Protocol) integration.

## Features

- 🔍 **Semantic Search** - AI-powered skill discovery using Voyage AI embeddings
- 📊 **Vector Database** - Zilliz Cloud (Milvus) for efficient similarity search
- 🤖 **MCP Integration** - Model Context Protocol support for AI agent integration
- 📚 **Skill Catalog** - 688-line catalog builder with bundles, aliases, and categories
- 🎨 **Modern UI** - Dark mode interface with responsive design
- 🧪 **Testing** - Unit tests (Vitest) and E2E tests (Playwright)

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Modal Serverless (Python/TypeScript)
- **Database**: Zilliz Cloud (Milvus)
- **Embeddings**: Voyage AI (voyage-2, rerank-2)
- **Protocol**: MCP (Model Context Protocol)

## Project Structure

```
skill-service/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI widget (dark mode)
│   │   ├── page.test.tsx         # Unit tests (6 tests)
│   │   ├── api/route.ts          # MCP API endpoint (5 tools)
│   │   └── mcp/
│   │       ├── route.ts          # MCP server endpoint (3 catalog tools)
│   │       └── catalog/
│   │           └── catalog.ts    # Skill catalog builder (688 lines)
│   ├── components/ui/            # shadcn UI components (6 files)
│   ├── lib/utils.ts              # Utility functions
│   ├── test/setup.ts             # Test setup
│   └── e2e/ui-ux.spec.ts         # Playwright E2E tests (30+ tests)
├── mcp/server/
│   ├── index.ts                  # MCP server entry point
│   └── tools/
│       ├── search.ts             # search_skills tool
│       ├── index.ts              # index_skill tool
│       ├── create-collection.ts  # create_collection tool
│       └── health-check.ts       # health_check tool
├── app.py                        # Modal deployment (444 lines)
├── skills.config.json            # Skills configuration (95 stopwords, 8 categories)
└── skilldex.config.json          # Skilldex configuration
```

## Status

### ✅ Completed (Layer 0-1)

**Layer 0 - Catalog & Config:**
- ✅ `skills.config.json` with full schema (indexing, stopwords, categories, bundles)
- ✅ `catalog.ts` (688 lines) with buildCatalog, buildAliases, buildBundles
- ✅ 5 MCP Catalog Tools: list_skills, search_skills, get_skill, list_bundles, update_catalog_config

**Layer 1 - Vector Search:**
- ✅ Modal app deployed: https://modal.com/apps/billlzzz10/main/deployed/skill-embedding-service
- ✅ 4 HTTP Endpoints:
  - `health_check` - https://billlzzz10--skill-embedding-service-health-check.modal.run
  - `search_skills_http` - https://billlzzz10--skill-embedding-service-search-skills-http.modal.run
  - `index_skill_http` - https://billlzzz10--skill-embedding-service-index-skill-http.modal.run
  - `create_collection_http` - https://billlzzz10--skill-embedding-service-create-collection-http.modal.run
- ✅ Voyage AI integration (voyage-2 embeddings, rerank-2)
- ✅ Zilliz Cloud integration (HNSW index, COSINE metric)

### ❌ Pending (Layer 2-4)

**Layer 2 - Tracking & Metrics:** Not implemented
- Database migration (Drizzle ORM)
- Hook system (preInvocation, postInvocation, errorInvocation)
- MCP tracking tools

**Layer 3 - Evaluation:** Not implemented
- Assertion runner
- Test case persistence
- Version comparison

**Layer 4 - Dashboard:** Partial
- ✅ shadcn/ui components
- ❌ Analytics charts
- ❌ Real-time updates

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+ (for Modal)
- Modal account
- Voyage AI API key
- Zilliz Cloud credentials

### Installation

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (in .venv)
python -m venv .venv
source .venv/bin/activate
pip install modal voyageai pymilvus fastapi

# Set up environment variables
export SKILL_SERVICE_API_KEY="your-api-key"
export VOYAGE_API_KEY="your-voyage-key"
export ZILLIZ_URI="your-zilliz-uri"
export ZILLIZ_TOKEN="your-zilliz-token"
```

### Development

```bash
# Start Next.js dev server
npm run dev

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build
```

### Deploy to Modal

```bash
# Activate venv
source .venv/bin/activate

# Deploy
modal deploy app.py
```

## MCP Tools

### Core Tools (4 tools)

| Tool | Description | Endpoint |
|------|-------------|----------|
| `search_skills` | Semantic search with AI reranking | `/search-skills` |
| `index_skill` | Index a new skill | `/index-skill` |
| `create_collection` | Create Zilliz collection | `/create-collection` |
| `health_check` | Check service health | `/health-check` |

### Catalog Tools (5 tools)

| Tool | Description |
|------|-------------|
| `list_skills` | List skills with category/bundle filtering |
| `search_skills` | Keyword search with trigger matching |
| `get_skill` | Get skill details by ID or alias |
| `list_bundles` | List all bundles and included skills |
| `update_catalog_config` | Update config at runtime |

### Usage Example

```typescript
// Search skills
const results = await mcpClient.callTool("search_skills", {
  query: "build HTML UI with React",
  top_k: 5
});

// List skills by category
const skills = await mcpClient.callTool("list_skills", {
  category: "development",
  limit: 20
});

// Get skill details
const skill = await mcpClient.callTool("get_skill", {
  id: "mcp-builder"
});
```

## Configuration

### skills.config.json

```json
{
  "version": "1.0.0",
  "indexing": {
    "maxTriggers": 12,
    "minTokenLength": 2,
    "aliasMinLength": 28,
    "aliasMinTokens": 4
  },
  "stopwords": { "tokens": [...] },
  "tagStopwords": { "tokens": [...] },
  "categories": {
    "rules": [
      { "name": "security", "keywords": [...] },
      { "name": "infrastructure", "keywords": [...] },
      { "name": "data-ai", "keywords": [...] },
      { "name": "development", "keywords": [...] },
      { "name": "architecture", "keywords": [...] },
      { "name": "testing", "keywords": [...] },
      { "name": "business", "keywords": [...] },
      { "name": "workflow", "keywords": [...] }
    ],
    "fallback": "general"
  },
  "bundles": {
    "groups": {
      "core-dev": {...},
      "security-core": {...},
      "k8s-core": {...},
      "data-core": {...},
      "ops-core": {...}
    }
  },
  "curatedCommon": { "skills": [...] }
}
```

## Testing

### Unit Tests (Vitest)
```bash
npm run test:run
# 6 tests: UI rendering, search functionality, error handling
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
# 30+ tests: UI/UX, accessibility, responsiveness, mobile
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Skill Service Widget UI |
| GET | `/mcp` | MCP resource endpoint |
| POST | `/api` | MCP protocol endpoint |
| GET | `/health-check` | Health check (Modal) |
| POST | `/search-skills` | Semantic search (Modal) |
| POST | `/index-skill` | Index skill (Modal) |
| POST | `/create-collection` | Create collection (Modal) |

## Documentation

- [API Design](docs/api-design.md)
- [Code Style](docs/code-style.md)
- [General Guidelines](docs/general-guidelines.md)
- [Git Workflow](docs/git-workflow.md)
- [OpenSpec](docs/OPENSPEC.md)
- [Performance](docs/performance-optimization.md)
- [Project Setup](docs/project-setup.md)
- [Roadmap](docs/ROADMAP.md)
- [Security](docs/security-practices.md)
- [Testing](docs/testing-guidelines.md)
- [TypeScript](docs/typescript-rules.md)

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request
