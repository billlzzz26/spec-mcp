# Skill Embedding Service - Open Specification

**Version:** 1.0.0  
**Status:** Active Development

## Overview

Semantic search service for AI agent skills using:
- **Voyage AI** - Embeddings (voyage-2) + Reranking (rerank-2)
- **Zilliz Cloud** - Vector database (managed Milvus)
- **Modal** - Serverless deployment

## Architecture

```
User Query → Modal → Voyage Embed → Zilliz Search → Voyage Rerank → Results
```

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

- `create_collection` - Create Zilliz collection
- `index_skill` - Index a skill
- `search_skills` - Semantic search
- `health_check` - Check service status

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
./setup.sh
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
| Runtime | Python 3.12 |
| Serverless | Modal |
| Embedding | Voyage AI voyage-2 (1024 dim) |
| Rerank | Voyage AI rerank-2 |
| Vector DB | Zilliz Cloud (Milvus) |
| Web | FastAPI |

## License

MIT
