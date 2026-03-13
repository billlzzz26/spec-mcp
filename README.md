# skill-embedding-service

Semantic Skill Search service บน **Modal Serverless** โดยใช้ **Voyage AI** (embedding + rerank) และ **Zilliz Cloud** (vector store)

## Architecture

```
User Query
    │
    ▼
Modal Serverless (search_skills)
    │
    ├── 1. Voyage embed_query() → query vector
    ├── 2. Zilliz search_similar() → top-20 candidates
    └── 3. Voyage rerank-2 → top-5 results
```

## Project Structure

```
skill-embedding-service/
├── requirements.txt     # pinned dependencies
├── modal_setup.py       # Modal App, image, secrets
├── voyage_client.py     # Voyage AI wrapper (embed + rerank)
├── zilliz_client.py     # Zilliz Cloud wrapper (insert + search)
├── skill_indexer.py     # index_skill, batch_index_skills
├── skill_search.py      # search_skills (semantic + rerank)
├── modal_deploy.py      # App entry, web endpoints, local_entrypoint
└── README.md
```

## Setup

### 1. สร้าง Secrets ใน Modal Dashboard

ไปที่ https://modal.com/secrets แล้วสร้าง:

**`voyage-secret`**
```
VOYAGE_API_KEY=pa-xxxxxxxxxxxxxxxxxxxxxxxx
```

**`zilliz-secret`**
```
ZILLIZ_URI=https://in03-xxxx.zillizcloud.com:443
ZILLIZ_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
ZILLIZ_COLLECTION=skill_embeddings
EMBEDDING_DIM=1024
```

> **หมายเหตุ:** `ZILLIZ_URI` และ `ZILLIZ_TOKEN` ดูได้จาก Zilliz Cloud Console → Cluster → Connect

### 2. ติดตั้ง Modal CLI

```bash
pip install modal
modal token new   # login ผ่าน browser
```

### 3. Deploy

```bash
modal deploy modal_deploy.py
```

### 4. ทดสอบ local

```bash
modal run modal_deploy.py
```

## API Endpoints

หลัง deploy จะได้ HTTPS URLs:

### Search Skills
```bash
POST https://<workspace>--skill-embedding-service-search-skills-http.modal.run

Body:
{
  "query": "สร้างนิยายแฟนตาซี",
  "top_k_rerank": 5,
  "filter_expr": "plugin_domain == 'writing'"
}
```

### Index Skill
```bash
POST https://<workspace>--skill-embedding-service-index-skill-http.modal.run

Body:
{
  "skill_id": "ajarn.writing.fiction.plot-generator",
  "skill_name": "Plot Generator",
  "description": "Generate fiction plot ideas",
  "capabilities": ["creative writing", "plot", "storytelling"],
  "plugin_domain": "writing",
  "provider_id": "ajarn",
  "version": "1.0.0"
}
```

## Remote Call (Python)

```python
import modal

# Search
fn = modal.Function.lookup("skill-embedding-service", "search_skills")
result = fn.remote("สร้างนิยายแฟนตาซี", top_k_rerank=5)
print(result)

# Batch index
batch_fn = modal.Function.lookup("skill-embedding-service", "batch_index_skills")
results = batch_fn.remote([skill1, skill2, skill3])
```

## Changelog

### v1.1.0 (Fixed)
- `modal.Stub` → `modal.App` (Stub deprecated ใน Modal v0.60+)
- `.pip_install_from_requirements()` → `.uv_pip_install()` (เร็วกว่า)
- `python_version` 3.11 → 3.12
- `@stub.function()` → `@app.function()` ทุกไฟล์
- `.call()` → `.remote()` ทุกที่ (call() deprecated)
- `stub.run()` → `app.run()`
- Zilliz: `host`/`port` → `uri`/`token` (Zilliz Cloud API)
- `connections.connect()` ใช้ uri + token แทน host + port
- `metric_type`: IP → COSINE (ดีกว่าสำหรับ normalized vectors)
- `embed_texts()` สำหรับ documents, `embed_query()` สำหรับ queries
- `rerank-1` → `rerank-2` (Voyage latest)
- `batch_index_skills`: sequential loop → `.map()` (parallel)
- เพิ่ม load state guard ใน `search_similar()`
- เพิ่ม HTTP web endpoints สำหรับ search และ index
