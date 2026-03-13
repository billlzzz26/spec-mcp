# Skill Embedding Service

Semantic skill search service using **Voyage AI** (embedding + rerank) and **Zilliz Cloud** (vector store) deployed on **Modal Serverless**.

## Quick Start

### Setup
```bash
./setup.sh
```

### Deploy
```bash
modal deploy app.py
```

### Test
```bash
python skill_index_client.py test
```

## Docs
- [Open Specification](OPENSPEC.md)
- [Roadmap](ROADMAP.md)
