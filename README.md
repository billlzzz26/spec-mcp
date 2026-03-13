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
├── app.py              # Modal App หลัก (รวมทุกอย่างไว้ในไฟล์เดียว)
├── requirements.txt    # Dependencies
├── .gitignore
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
ZILLIZ_URI=https://in03-xxxx.serverless.aws-eu-central-1.cloud.zilliz.com
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
modal deploy app.py
```

### 4. สร้าง Collection (ครั้งแรกเท่านั้น)

```bash
curl -X POST https://<workspace>--skill-embedding-service-create-collection-http.modal.run \
  -H "Content-Type: application/json" \
  -d '{"drop_if_exists": false}'
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
  "filter_expr": "plugin_domain == 'writing'"  // optional
}
```

**ตัวอย่าง:**
```bash
curl -X POST https://billlzzz10--skill-embedding-service-search-skills-http.modal.run \
  -H "Content-Type: application/json" \
  -d '{
    "query": "สร้างนิยายแฟนตาซี",
    "top_k_rerank": 5
  }'
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

**ตัวอย่าง:**
```bash
curl -X POST https://billlzzz10--skill-embedding-service-index-skill-http.modal.run \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "test.writing.plot-generator",
    "skill_name": "Plot Generator",
    "description": "Generate creative fiction plot ideas",
    "capabilities": ["creative writing", "plot", "storytelling"],
    "plugin_domain": "writing",
    "provider_id": "test",
    "version": "1.0.0"
  }'
```

### Create Collection
```bash
POST https://<workspace>--skill-embedding-service-create-collection-http.modal.run

Body:
{
  "drop_if_exists": false
}
```

## Features

- **Semantic Search**: ใช้ Voyage AI voyage-2 model (1024 dimensions) สำหรับ embedding
- **Reranking**: ใช้ Voyage AI rerank-2 เพื่อปรับปรุงความแม่นยำ
- **Vector Store**: Zilliz Cloud (managed Milvus) พร้อม HNSW index
- **Serverless**: Deploy บน Modal - auto-scaling, pay-per-use
- **HTTP API**: REST endpoints พร้อม FastAPI

## Tech Stack

- **Modal**: Serverless compute platform
- **Voyage AI**: Embedding (voyage-2) + Reranking (rerank-2)
- **Zilliz Cloud**: Managed vector database
- **FastAPI**: HTTP endpoints
- **Python 3.12**: Runtime

## Development

### ทดสอบ Local
```bash
modal run app.py
```

### ดู Logs
```bash
modal app logs skill-embedding-service
```

### ดู Deployment
https://modal.com/apps

## Changelog

### v2.0.0 (Current)
- รวมทุกอย่างไว้ใน `app.py` เดียว (ไม่มี import issues)
- Inline VoyageClient และ ZillizClient classes
- เพิ่ม HTTP endpoint สำหรับสร้าง collection
- ใช้ Modal App (ไม่ใช่ Stub ที่ deprecated)
- Python 3.12 + uv pip install

### v1.0.0
- Initial release
- Voyage AI integration
- Zilliz Cloud integration
- Modal serverless deployment
