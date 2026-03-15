# Skill Embedding Service - Open Specification

**Version:** 1.0.0
**Status:** Active Development

**Last Updated:** March 15, 2025

## Overview

Semantic search service for AI agent skills using:
- **Voyage AI** - Embeddings (voyage-2) + Reranking (rerank-2)
- **Zilliz Cloud** - Vector database (managed Milvus)
- **Modal** - Serverless deployment
- **MCP** - Model Context Protocol integration

## Architecture

```
User Query → Modal → Voyage Embed → Zilliz Search → Voyage Rerank → Results
                              ↓
                    MCP Host (Claude, Cursor, etc.)
```

## Status

### ✅ Completed (Layer 0-1)

**Layer 0 - Catalog & Config:**
- ✅ `skills.config.json` with full schema
- ✅ `catalog.ts` (688 lines) with builder, aliases, bundles
- ✅ 5 MCP Catalog Tools

**Layer 1 - Vector Search:**
- ✅ Modal app deployed (444 lines)
- ✅ 4 HTTP endpoints
- ✅ Voyage AI + Zilliz integration

### ❌ Pending (Layer 2-4)

- **Layer 2 - Tracking:** Not started
- **Layer 3 - Evaluation:** Not started
- **Layer 4 - Dashboard:** UI only

## API Endpoints

### Search Skills
```bash
POST /search-skills
{
  "query": "build html with react",
  "top_k_rerank": 5,
  "filter_expr": "plugin_domain == 'development'"  // optional
}
```

### Index Skill
```bash
POST /index-skill
{
  "skill_id": "mcp-builder",
  "skill_name": "MCP Builder",
  "description": "Guide for creating MCP servers",
  "capabilities": ["mcp", "llm"],
  "plugin_domain": "development",
  "provider_id": "composio",
  "version": "1.0.0"
}
```

### Health Check
```bash
GET /health-check
```

## MCP Tools

### Core Tools (4 tools)
- `create_collection` - Create Zilliz collection
- `index_skill` - Index a skill
- `search_skills` - Semantic search
- `health_check` - Check service status

### Catalog Tools (5 tools)
- `list_skills` - List skills with filtering
- `search_skills` - Keyword search with scoring
- `get_skill` - Get skill by ID or alias
- `list_bundles` - List all bundles
- `update_catalog_config` - Update config at runtime

## Setup

### 1. Create Modal Secrets

**voyage-secret:**
```
VOYAGE_API_KEY=pa-xxxxxxxxxxxxxxxxxxxxxxxx
```

**zilliz-secret:**
```
ZILLIZ_URI=https://in03-xxxx.serverless.aws-eu-central-1.cloud.zilliz.com
ZILLIZ_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
ZILLIZ_COLLECTION=skill_embeddings
EMBEDDING_DIM=1024
```

### 2. Install & Deploy

```bash
# Node.js dependencies
npm install

# Python dependencies
python -m venv .venv
source .venv/bin/activate
pip install modal voyageai pymilvus fastapi

# Deploy
modal deploy app.py
```

### 3. Create Collection

```bash
curl -X POST <collection-url> \
  -H "Content-Type: application/json" \
  -d '{"drop_if_exists": false}'
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| Backend | Modal Serverless (Python/TypeScript) |
| Embedding | Voyage AI voyage-2 (1024 dim) |
| Rerank | Voyage AI rerank-2 |
| Vector DB | Zilliz Cloud (Milvus) |
| Protocol | MCP (Model Context Protocol) |
| Testing | Vitest (unit), Playwright (E2E) |

## Testing

### Unit Tests
```bash
npm run test:run
# 6 tests: UI rendering, search, error handling
```

### E2E Tests
```bash
npm run test:e2e
# 30+ tests: UI/UX, accessibility, responsive
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

## License

MIT

## Resources

- [README](../README.md) - Project overview
- [Roadmap](./ROADMAP.md) - Development timeline
- [Checklist](../checklist.md) - Verification checklist
