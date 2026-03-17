"""
app.py

Modal App หลัก - รวมทุกอย่างไว้ในไฟล์เดียว (Stable Version)
"""
import os
import modal
from modal import Secret
from fastapi import Request, HTTPException, Response
from fastapi.responses import JSONResponse
from typing import TypedDict, NotRequired, Optional, List, Dict, Any
import httpx
import json
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import logging
from pydantic import BaseModel, Field, HttpUrl, validator
from datetime import datetime
import asyncio

===== Logging Configuration =====

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(name)

===== Settings =====

class Settings:
VOYAGE_API_KEY: str = os.environ.get("VOYAGE_API_KEY", "")
ZILLIZ_URI: str = os.environ.get("ZILLIZ_URI", "")
ZILLIZ_TOKEN: str = os.environ.get("ZILLIZ_TOKEN", "")
ZILLIZ_COLLECTION: str = os.getenv("ZILLIZ_COLLECTION", "skill_embeddings")
EMBEDDING_DIM: int = int(os.getenv("EMBEDDING_DIM", "1024"))
SKILL_SERVICE_API_KEY: str = os.getenv("SKILL_SERVICE_API_KEY", "test-skill-service-key-for-development-only")

settings = Settings()

--- ส่วนเดิม (คงไว้ทั้งหมด) ---

from modal import Image
image = (
modal.Image.debian_slim(python_version="3.12")
.uv_pip_install(
"voyageai>=0.3.2",
"pymilvus>=2.4.0",
"numpy>=1.26.0",
"fastapi[standard]",
"boto3>=1.34.0",
"botocore>=1.34.0",
"pydantic>=2.5.0",
)
)

app = modal.App(
name="skill-embedding-service",
image=image,
secrets=[
modal.Secret.from_name("voyage-secret"),
modal.Secret.from_name("zilliz-secret"),
],
)

===== Pydantic Models =====

class TerminalUpdateConfigRequest(BaseModel):
modal_url: str
api_key: str
cloud_storage: Optional[Dict[str, str]] = None
local_agent_enabled: Optional[bool] = None
local_agent_pairing_code: Optional[str] = None

@validator('modal_url')  
def validate_modal_url(cls, v):  
    if not v.startswith(('http://', 'https://')):  
        raise ValueError('modal_url must start with http:// or https://')  
    return v.rstrip('/')

class TerminalExecuteRequest(BaseModel):
command: str = Field(..., min_length=1, max_length=10000)

class StoragePresignRequest(BaseModel):
path: str = Field(..., min_length=1, max_length=1024)
expires: int = Field(3600, ge=60, le=86400)  # 1 minute to 24 hours

class SearchSkillsRequest(BaseModel):
query: str = Field(..., min_length=1)
top_k_rerank: int = Field(5, ge=1, le=50)
filter_expr: Optional[str] = None

class IndexSkillRequest(BaseModel):
skill_id: str
skill_name: str
description: str
capabilities: List[str]
plugin_domain: str
provider_id: Optional[str] = None
version: Optional[str] = None

class CreateCollectionRequest(BaseModel):
drop_if_exists: bool = False

===== Response Wrapper =====

def success_response(data: Any = None) -> dict:
return {"status": "success", "data": data}

def error_response(message: str, detail: Any = None, status_code: int = 400) -> HTTPException:
logger.error(f"Error: {message}, detail: {detail}")
return HTTPException(
status_code=status_code,
content={"status": "error", "message": message, "detail": detail}
)

===== Client Classes (inline) =====

class VoyageClient:
"""Voyage AI client"""
def init(self):
import voyageai
if not settings.VOYAGE_API_KEY:
raise ValueError("VOYAGE_API_KEY not configured")
self.client = voyageai.Client(api_key=settings.VOYAGE_API_KEY)

def embed_texts(self, texts: list[str], model: str = "voyage-2") -> list[list[float]]:  
    if not texts:  
        return []  
    response = self.client.embed(texts, model=model, input_type="document")  
    return response.embeddings  

def embed_query(self, query: str, model: str = "voyage-2") -> list[float]:  
    response = self.client.embed([query], model=model, input_type="query")  
    return response.embeddings[0]  

def rerank(self, query: str, documents: list[str], model: str = "rerank-2", top_k: int | None = None) -> list:  
    if not documents:  
        return []  
    response = self.client.rerank(query, documents, model=model, top_k=top_k)  
    return response.results

class SkillMetadata(TypedDict):
"""Type definition for skill metadata."""
skill_name: str
description: str
capabilities: list[str]
plugin_domain: str
skill_id: NotRequired[str]
provider_id: NotRequired[str]
version: NotRequired[str]

class ZillizClient:
"""Zilliz Cloud client"""

# Field length constants - centralized for maintainability  
MAX_LENGTH_ID = 256  
MAX_LENGTH_NAME = 256  
MAX_LENGTH_DESCRIPTION = 4096  
MAX_LENGTH_DOMAIN = 256  
MAX_LENGTH_PROVIDER = 256  
MAX_LENGTH_VERSION = 50  

# Required metadata keys for validation  
REQUIRED_METADATA_KEYS = frozenset({"skill_name", "description", "capabilities", "plugin_domain"})  

def __init__(self):  
    from pymilvus import connections, utility, Collection, CollectionSchema, FieldSchema, DataType  

    if not settings.ZILLIZ_URI or not settings.ZILLIZ_TOKEN:  
        raise ValueError("ZILLIZ_URI or ZILLIZ_TOKEN not configured")  

    self.uri = settings.ZILLIZ_URI  
    self.token = settings.ZILLIZ_TOKEN  
    self.collection_name = settings.ZILLIZ_COLLECTION  
    self.dim = settings.EMBEDDING_DIM  

    connections.connect(alias="default", uri=self.uri, token=self.token)  

    # Store for later use  
    self._utility = utility  
    self._Collection = Collection  
    self._CollectionSchema = CollectionSchema  
    self._FieldSchema = FieldSchema  
    self._DataType = DataType  

def _create_field_schemas(self) -> list:  
    """Create field schemas for the collection."""  
    return [  
        self._FieldSchema(  
            name="id",  
            dtype=self._DataType.VARCHAR,  
            max_length=self.MAX_LENGTH_ID,  
            is_primary=True  
        ),  
        self._FieldSchema(  
            name="embedding",  
            dtype=self._DataType.FLOAT_VECTOR,  
            dim=self.dim  
        ),  
        self._FieldSchema(  
            name="skill_name",  
            dtype=self._DataType.VARCHAR,  
            max_length=self.MAX_LENGTH_NAME  
        ),  
        self._FieldSchema(  
            name="description",  
            dtype=self._DataType.VARCHAR,  
            max_length=self.MAX_LENGTH_DESCRIPTION  
        ),  
        self._FieldSchema(  
            name="capabilities",  
            dtype=self._DataType.JSON  
        ),  
        self._FieldSchema(  
            name="plugin_domain",  
            dtype=self._DataType.VARCHAR,  
            max_length=self.MAX_LENGTH_DOMAIN  
        ),  
        self._FieldSchema(  
            name="provider_id",  
            dtype=self._DataType.VARCHAR,  
            max_length=self.MAX_LENGTH_PROVIDER  
        ),  
        self._FieldSchema(  
            name="version",  
            dtype=self._DataType.VARCHAR,  
            max_length=self.MAX_LENGTH_VERSION  
        ),  
    ]  

def create_collection(self, drop_if_exists: bool = False):  
    """Create a new collection with the defined schema."""  
    if self._utility.has_collection(self.collection_name):  
        if drop_if_exists:  
            self._utility.drop_collection(self.collection_name)  
        else:  
            return self._Collection(self.collection_name)  

    fields = self._create_field_schemas()  
    schema = self._CollectionSchema(fields, description="Skill embeddings")  
    collection = self._Collection(name=self.collection_name, schema=schema)  

    index_params = {  
        "metric_type": "COSINE",  
        "index_type": "HNSW",  
        "params": {"M": 16, "efConstruction": 200},  
    }  
    collection.create_index("embedding", index_params)  
    return collection  

def get_collection(self):  
    if self._utility.has_collection(self.collection_name):  
        return self._Collection(self.collection_name)  
    return self.create_collection()  

def insert_skill(self, skill_id: str, embedding: list[float], metadata: SkillMetadata) -> None:  
    """Insert a skill with its embedding into the collection."""  
    # Validate metadata has required keys  
    missing_keys = self.REQUIRED_METADATA_KEYS - set(metadata.keys())  
    if missing_keys:  
        raise ValueError(f"Missing required metadata keys: {missing_keys}")  

    # Validate embedding dimension matches expected dimension  
    if len(embedding) != self.dim:  
        raise ValueError(  
            f"Embedding dimension mismatch: expected {self.dim}, got {len(embedding)}"  
        )  

    collection = self.get_collection()  
    data = [  
        [skill_id],  
        [embedding],  
        [metadata.get("skill_name", "")],  
        [metadata.get("description", "")],  
        [metadata.get("capabilities", [])],  
        [metadata.get("plugin_domain", "")],  
        [metadata.get("provider_id", "")],  
        [metadata.get("version", "")],  
    ]  
    collection.insert(data)  
    collection.flush()  

def search_similar(self, query_embedding: list[float], top_k: int = 10, expr: str | None = None) -> list:  
    collection = self.get_collection()  
    collection.load()  

    search_params = {"metric_type": "COSINE", "params": {"ef": 64}}  
    results = collection.search(  
        data=[query_embedding],  
        anns_field="embedding",  
        param=search_params,  
        limit=top_k,  
        expr=expr,  
        output_fields=["skill_name", "description", "capabilities", "plugin_domain", "provider_id", "version"],  
    )  
    return results[0]

===== ส่วนเพิ่มเติมสำหรับ Open Terminal และ Cloud Storage =====

ใช้ Modal Dict สำหรับเก็บ config ของผู้ใช้ (persistent key-value store)

terminal_config_store = modal.Dict.from_name("open-terminal-configs", create_if_missing=True)

Rate limiting store

rate_limit_store = modal.Dict.from_name("rate-limit-store", create_if_missing=True)

Cache store for storage listings

storage_cache_store = modal.Dict.from_name("storage-cache-store", create_if_missing=True)

async def call_terminal_api(user_id: str, method: str, path: str, body: dict = None) -> dict:
"""เรียก Open Terminal instance ของผู้ใช้"""
logger.info(f"Calling terminal API for user {user_id}: {method} {path}")
config: Optional[dict] = terminal_config_store.get(user_id)
if not config:
raise error_response("Terminal config not found for user", status_code=404)

url = config["modal_url"].rstrip("/") + path  
headers = {  
    "Authorization": f"Bearer {config['api_key']}",  
    "Content-Type": "application/json"  
}  
  
timeout = httpx.Timeout(30.0)  # 30 seconds timeout  
  
try:  
    async with httpx.AsyncClient(timeout=timeout) as client:  
        if method.upper() == "GET":  
            resp = await client.get(url, headers=headers, params=body)  
        elif method.upper() == "POST":  
            resp = await client.post(url, headers=headers, json=body)  
        elif method.upper() == "PUT":  
            resp = await client.put(url, headers=headers, json=body)  
        elif method.upper() == "DELETE":  
            resp = await client.delete(url, headers=headers)  
        else:  
            raise error_response("Method not allowed", status_code=405)  
      
    if resp.status_code >= 400:  
        logger.error(f"Terminal API error for user {user_id}: {resp.status_code} - {resp.text}")  
        raise error_response(f"Terminal API error: {resp.status_code}", detail=resp.text, status_code=resp.status_code)  
      
    try:  
        return resp.json()  
    except:  
        return {"text": resp.text}  
except httpx.TimeoutException:  
    logger.error(f"Timeout calling terminal API for user {user_id}")  
    raise error_response("Terminal API timeout", status_code=504)  
except Exception as e:  
    logger.error(f"Error calling terminal API for user {user_id}: {str(e)}", exc_info=True)  
    raise error_response(f"Terminal API error: {str(e)}", status_code=500)

def _get_storage_client(user_id: str):
"""สร้าง boto3 client สำหรับ cloud storage ของ user"""
config: Optional[dict] = terminal_config_store.get(user_id)
if not config or "cloud_storage" not in config:
raise error_response("Cloud storage not configured for user", status_code=404)

storage = config["cloud_storage"]  
endpoint = storage["endpoint"]  
if not endpoint.startswith(("http://", "https://")):  
    endpoint = "https://" + endpoint  
  
try:  
    session = boto3.Session(  
        aws_access_key_id=storage["accessKey"],  
        aws_secret_access_key=storage["secretKey"],  
    )  
    s3_client = session.client(  
        "s3",  
        endpoint_url=endpoint,  
        config=Config(signature_version="s3v4"),  
        region_name="auto"  
    )  
    return s3_client, storage["bucket"]  
except Exception as e:  
    logger.error(f"Error creating storage client for user {user_id}: {str(e)}", exc_info=True)  
    raise error_response(f"Storage client error: {str(e)}", status_code=500)

def _check_api_key(request: Request) -> None:
"""ตรวจสอบ API key จาก header"""
provided_key = request.headers.get("X-API-Key")
if not settings.SKILL_SERVICE_API_KEY or provided_key != settings.SKILL_SERVICE_API_KEY:
logger.warning(f"Invalid API key attempt: {provided_key}")
raise error_response("Invalid or missing API key", status_code=401)

def _check_rate_limit(user_id: str, endpoint: str) -> None:
"""Rate limiting แบบง่าย (100 requests per minute)"""
key = f"{user_id}:{endpoint}"
now = datetime.now().timestamp()
window = 60  # 1 minute

data = rate_limit_store.get(key, {"count": 0, "reset": now + window})  
if now > data["reset"]:  
    data = {"count": 1, "reset": now + window}  
else:  
    data["count"] += 1  
  
if data["count"] > 100:  
    raise error_response("Rate limit exceeded", status_code=429)  
  
rate_limit_store[key] = data

===== Helper Functions (ทำงานใน container) =====

@app.function()
def index_skill(skill_metadata: dict) -> dict:
"""สร้าง embedding และบันทึกลง Zilliz"""
logger.info(f"Indexing skill: {skill_metadata.get('skill_id')}")
required_keys = ['skill_id', 'skill_name', 'description', 'capabilities', 'plugin_domain']
missing = [k for k in required_keys if k not in skill_metadata]
if missing:
logger.error(f"Missing required keys: {missing}")
return {"status": "error", "error": f"Missing required keys: {missing}"}

try:  
    voyage = VoyageClient()  
    zilliz = ZillizClient()  

    text_to_embed = (  
        f"{skill_metadata['skill_name']}. "  
        f"{skill_metadata['description']}. "  
        f"Capabilities: {', '.join(skill_metadata.get('capabilities', []))}"  
    )  

    embedding = voyage.embed_texts([text_to_embed], model="voyage-2")[0]  

    zilliz.insert_skill(  
        skill_id=skill_metadata["skill_id"],  
        embedding=embedding,  
        metadata=skill_metadata,  
    )  

    logger.info(f"Successfully indexed skill: {skill_metadata['skill_id']}")  
    return {"status": "success", "skill_id": skill_metadata["skill_id"]}  
except Exception as e:  
    logger.error(f"Error indexing skill: {str(e)}", exc_info=True)  
    return {"status": "error", "error": str(e)}

@app.function()
def batch_index_skills(skills_list: list[dict]) -> list[dict]:
"""Index หลาย skills แบบ parallel"""
logger.info(f"Batch indexing {len(skills_list)} skills")
results = list(index_skill.map(skills_list))
return results

@app.function()
def search_skills(
query: str,
top_k_embedding: int = 20,
top_k_rerank: int = 5,
filter_expr: str | None = None,
) -> list[dict]:
"""ค้นหา skills ด้วย semantic search + rerank"""
logger.info(f"Searching skills: query='{query}'")
try:
voyage = VoyageClient()
zilliz = ZillizClient()

query_embedding = voyage.embed_query(query, model="voyage-2")  

    candidates = zilliz.search_similar(  
        query_embedding=query_embedding,  
        top_k=top_k_embedding,  
        expr=filter_expr,  
    )  

    if not candidates:  
        logger.info("No candidates found")  
        return []  

    documents = []  
    results_meta = []  

    for hit in candidates:  
        skill_name = hit.entity.get("skill_name", "")  
        description = hit.entity.get("description", "")  
        doc_text = f"{skill_name}. {description}"  
        documents.append(doc_text)  
        results_meta.append({  
            "skill_id": hit.id,  
            "skill_name": skill_name,  
            "description": description,  
            "capabilities": hit.entity.get("capabilities"),  
            "plugin_domain": hit.entity.get("plugin_domain"),  
            "provider_id": hit.entity.get("provider_id"),  
            "version": hit.entity.get("version"),  
            "vector_score": hit.score,  
        })  

    rerank_results = voyage.rerank(  
        query,  
        documents,  
        model="rerank-2",  
        top_k=top_k_rerank,  
    )  

    final_results = []  
    for r in rerank_results:  
        meta = results_meta[r.index].copy()  
        meta["rerank_score"] = r.relevance_score  
        final_results.append(meta)  

    final_results.sort(key=lambda x: x["rerank_score"], reverse=True)  
    logger.info(f"Found {len(final_results)} results")  
    return final_results  
except Exception as e:  
    logger.error(f"Error searching skills: {str(e)}", exc_info=True)  
    return {"error": str(e)}

@app.function()
def create_collection(drop_if_exists: bool = False):
"""สร้าง Zilliz collection"""
logger.info(f"Creating collection (drop_if_exists={drop_if_exists})")
try:
client = ZillizClient()
collection = client.create_collection(drop_if_exists=drop_if_exists)
return {
"status": "success",
"collection": collection.name,
"dimension": client.dim
}
except Exception as e:
logger.error(f"Error creating collection: {str(e)}", exc_info=True)
return {"status": "error", "error": str(e)}

===== HTTP Endpoints สำหรับ Open Terminal (รวม Storage) =====

@app.function()
@modal.fastapi_endpoint(method="GET")
async def terminal_health(request: Request) -> dict:
"""Health check สำหรับ terminal service (public)"""
return success_response({"service": "open-terminal-proxy"})

@app.function()
@modal.fastapi_endpoint(method="GET")
async def terminal_get_config(request: Request) -> dict:
"""ดึง terminal config ของผู้ใช้ (ต้องมี X-User-Id)"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "get_config")  
  
config = terminal_config_store.get(user_id)  
if config is None:  
    return success_response({"config": None})  
  
# ไม่ส่ง API key กลับ (security) และซ่อน secretKey  
safe_config = {k: v for k, v in config.items() if k != "api_key"}  
if "cloud_storage" in safe_config:  
    safe_config["cloud_storage"] = {**safe_config["cloud_storage"]}  
    safe_config["cloud_storage"]["secretKey"] = "********"  
  
logger.info(f"Config retrieved for user {user_id}")  
return success_response({"config": safe_config})

@app.function()
@modal.fastapi_endpoint(method="POST")
async def terminal_update_config(request: Request, body: TerminalUpdateConfigRequest) -> dict:
"""อัปเดต terminal config ของผู้ใช้"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "update_config")  
  
new_config = body.dict(exclude_unset=True)  
  
# ตรวจสอบ cloud_storage ถ้ามี  
if "cloud_storage" in new_config:  
    cs = new_config["cloud_storage"]  
    required_storage_fields = {"provider", "endpoint", "bucket", "accessKey", "secretKey"}  
    if not all(k in cs for k in required_storage_fields):  
        raise error_response("cloud_storage must contain provider, endpoint, bucket, accessKey, secretKey")  
    if cs["provider"] not in ["r2", "minio"]:  
        raise error_response("provider must be 'r2' or 'minio'")  
  
# เก็บ config  
terminal_config_store[user_id] = new_config  
logger.info(f"Config updated for user {user_id}")  
  
return success_response({"message": "Config updated"})

@app.function()
@modal.fastapi_endpoint(method="POST")
async def terminal_test_connection(request: Request, body: dict) -> dict:
"""ทดสอบ connection ไปยัง terminal instance ของผู้ใช้"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "test_connection")  
  
config = terminal_config_store.get(user_id)  
if not config:  
    raise error_response("Config not found", status_code=404)  
  
# ลองเรียก health endpoint ของ terminal instance  
try:  
    url = config["modal_url"].rstrip("/") + "/api/health"  
    headers = {"Authorization": f"Bearer {config['api_key']}"}  
      
    timeout = httpx.Timeout(10.0)  
    async with httpx.AsyncClient(timeout=timeout) as client:  
        resp = await client.get(url, headers=headers)  
      
    if resp.status_code == 200:  
        logger.info(f"Connection test successful for user {user_id}")  
        return success_response({"message": "Connected", "details": resp.json()})  
    else:  
        logger.warning(f"Connection test failed for user {user_id}: HTTP {resp.status_code}")  
        return success_response({"message": f"HTTP {resp.status_code}", "details": resp.text})  
except httpx.TimeoutException:  
    logger.error(f"Connection test timeout for user {user_id}")  
    return success_response({"message": "Connection timeout"})  
except Exception as e:  
    logger.error(f"Connection test error for user {user_id}: {str(e)}", exc_info=True)  
    return success_response({"message": str(e)})

@app.function()
@modal.fastapi_endpoint(method="POST")
async def terminal_execute(request: Request, body: TerminalExecuteRequest) -> dict:
"""Execute คำสั่งบน terminal instance ของผู้ใช้"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "execute")  
  
result = await call_terminal_api(user_id, "POST", "/api/execute", {"command": body.command})  
logger.info(f"Command executed for user {user_id}")  
return success_response(result)

@app.function()
@modal.fastapi_endpoint(method="GET")
async def terminal_list_files(request: Request) -> dict:
"""List files ใน working directory"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "list_files")  
  
path = request.query_params.get("path", ".")  
result = await call_terminal_api(user_id, "GET", "/api/files", {"path": path})  
logger.info(f"List files for user {user_id} at {path}")  
return success_response(result)

@app.function()
@modal.fastapi_endpoint(method="GET")
async def terminal_read_file(request: Request) -> Response:
"""อ่านไฟล์และส่งกลับ (อาจเป็น binary)"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "read_file")  
  
path = request.query_params.get("path")  
if not path:  
    raise error_response("Missing path", status_code=400)  
  
config = terminal_config_store.get(user_id)  
if not config:  
    raise error_response("Config not found", status_code=404)  
  
url = config["modal_url"].rstrip("/") + "/api/file"  
headers = {"Authorization": f"Bearer {config['api_key']}"}  
params = {"path": path}  
  
timeout = httpx.Timeout(60.0)  # longer timeout for file downloads  
try:  
    async with httpx.AsyncClient(timeout=timeout) as client:  
        resp = await client.get(url, headers=headers, params=params)  
      
    content_type = resp.headers.get("content-type", "application/octet-stream")  
    logger.info(f"File read for user {user_id}: {path}")  
    return Response(content=resp.content, media_type=content_type, status_code=resp.status_code)  
except Exception as e:  
    logger.error(f"Error reading file for user {user_id}: {str(e)}", exc_info=True)  
    raise error_response(f"File read error: {str(e)}", status_code=500)

@app.function()
@modal.fastapi_endpoint(method="POST")
async def terminal_write_file(request: Request) -> dict:
"""เขียนไฟล์ (รับ file upload)"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "write_file")  
  
form = await request.form()  
file = form.get("file")  
path = form.get("path")  
if not file or not path:  
    raise error_response("Missing file or path", status_code=400)  
  
content = await file.read()  
  
config = terminal_config_store.get(user_id)  
if not config:  
    raise error_response("Config not found", status_code=404)  
  
url = config["modal_url"].rstrip("/") + "/api/file"  
headers = {"Authorization": f"Bearer {config['api_key']}"}  
files = {"file": (file.filename, content, file.content_type)}  
data = {"path": path}  
  
timeout = httpx.Timeout(60.0)  
try:  
    async with httpx.AsyncClient(timeout=timeout) as client:  
        resp = await client.post(url, headers=headers, files=files, data=data)  
      
    if resp.status_code >= 400:  
        logger.error(f"Write file error for user {user_id}: {resp.status_code} - {resp.text}")  
        raise error_response(f"Write file error: {resp.status_code}", detail=resp.text, status_code=resp.status_code)  
      
    logger.info(f"File written for user {user_id}: {path}")  
    return success_response(resp.json())  
except Exception as e:  
    logger.error(f"Error writing file for user {user_id}: {str(e)}", exc_info=True)  
    raise error_response(f"Write file error: {str(e)}", status_code=500)

===== HTTP Endpoints สำหรับ Cloud Storage (R2/MinIO) =====

@app.function()
@modal.fastapi_endpoint(method="GET")
async def storage_test_config(request: Request) -> dict:
"""ทดสอบว่า storage config ใช้ได้ (list buckets หรือ head bucket)"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "storage_test")  
  
try:  
    s3, bucket = _get_storage_client(user_id)  
    s3.head_bucket(Bucket=bucket)  
    logger.info(f"Storage test successful for user {user_id}")  
    return success_response({"message": f"Bucket '{bucket}' accessible"})  
except ClientError as e:  
    error_code = e.response["Error"]["Code"]  
    logger.error(f"Storage test error for user {user_id}: {error_code}")  
    if error_code == "NoSuchBucket":  
        raise error_response(f"Bucket not found: {bucket}", detail=str(e), status_code=404)  
    elif error_code == "AccessDenied":  
        raise error_response(f"Access denied to bucket: {bucket}", detail=str(e), status_code=403)  
    else:  
        raise error_response(f"Bucket error: {error_code}", detail=str(e), status_code=400)  
except Exception as e:  
    logger.error(f"Storage test error for user {user_id}: {str(e)}", exc_info=True)  
    raise error_response(str(e), status_code=500)

@app.function()
@modal.fastapi_endpoint(method="GET")
async def storage_list_objects(request: Request) -> dict:
"""List objects ใน bucket (optionally with prefix)"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "storage_list")  
  
prefix = request.query_params.get("prefix", "")  
max_keys = int(request.query_params.get("max_keys", "100"))  
  
# Check cache first (5 minute TTL)  
cache_key = f"{user_id}:list:{prefix}"  
cached = storage_cache_store.get(cache_key)  
if cached:  
    logger.info(f"Cache hit for {cache_key}")  
    return success_response(cached)  
  
try:  
    s3, bucket = _get_storage_client(user_id)  
    response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix, MaxKeys=max_keys)  
    contents = response.get("Contents", [])  
    objects = [  
        {  
            "key": obj["Key"],  
            "size": obj["Size"],  
            "last_modified": obj["LastModified"].isoformat(),  
            "etag": obj["ETag"],  
        }  
        for obj in contents  
    ]  
    result = {  
        "objects": objects,  
        "truncated": response.get("IsTruncated", False),  
        "prefix": prefix  
    }  
      
    # Cache for 5 minutes  
    storage_cache_store[cache_key] = result  
    logger.info(f"List objects for user {user_id} with prefix '{prefix}'")  
    return success_response(result)  
except ClientError as e:  
    error_code = e.response["Error"]["Code"]  
    logger.error(f"List objects error for user {user_id}: {error_code}")  
    if error_code == "NoSuchBucket":  
        raise error_response(f"Bucket not found", detail=str(e), status_code=404)  
    elif error_code == "AccessDenied":  
        raise error_response(f"Access denied", detail=str(e), status_code=403)  
    else:  
        raise error_response(f"Storage error: {error_code}", detail=str(e), status_code=400)  
except Exception as e:  
    logger.error(f"List objects error for user {user_id}: {str(e)}", exc_info=True)  
    raise error_response(str(e), status_code=500)

@app.function()
@modal.fastapi_endpoint(method="POST")
async def storage_presign_upload(request: Request, body: StoragePresignRequest) -> dict:
"""สร้าง pre-signed URL สำหรับอัปโหลดไฟล์"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "storage_presign")  
  
try:  
    s3, bucket = _get_storage_client(user_id)  
    url = s3.generate_presigned_url(  
        ClientMethod="put_object",  
        Params={"Bucket": bucket, "Key": body.path},  
        ExpiresIn=body.expires,  
    )  
    logger.info(f"Presigned upload URL for user {user_id}: {body.path}")  
    return success_response({"url": url, "method": "PUT", "expires": body.expires})  
except ClientError as e:  
    error_code = e.response["Error"]["Code"]  
    logger.error(f"Presign upload error for user {user_id}: {error_code}")  
    if error_code == "NoSuchBucket":  
        raise error_response(f"Bucket not found", detail=str(e), status_code=404)  
    elif error_code == "AccessDenied":  
        raise error_response(f"Access denied", detail=str(e), status_code=403)  
    else:  
        raise error_response(f"Storage error: {error_code}", detail=str(e), status_code=400)  
except Exception as e:  
    logger.error(f"Presign upload error for user {user_id}: {str(e)}", exc_info=True)  
    raise error_response(str(e), status_code=500)

@app.function()
@modal.fastapi_endpoint(method="POST")
async def storage_presign_download(request: Request, body: StoragePresignRequest) -> dict:
"""สร้าง pre-signed URL สำหรับดาวน์โหลดไฟล์"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "storage_presign")  
  
try:  
    s3, bucket = _get_storage_client(user_id)  
    url = s3.generate_presigned_url(  
        ClientMethod="get_object",  
        Params={"Bucket": bucket, "Key": body.path},  
        ExpiresIn=body.expires,  
    )  
    logger.info(f"Presigned download URL for user {user_id}: {body.path}")  
    return success_response({"url": url, "method": "GET", "expires": body.expires})  
except ClientError as e:  
    error_code = e.response["Error"]["Code"]  
    logger.error(f"Presign download error for user {user_id}: {error_code}")  
    if error_code == "NoSuchBucket":  
        raise error_response(f"Bucket not found", detail=str(e), status_code=404)  
    elif error_code == "AccessDenied":  
        raise error_response(f"Access denied", detail=str(e), status_code=403)  
    else:  
        raise error_response(f"Storage error: {error_code}", detail=str(e), status_code=400)  
except Exception as e:  
    logger.error(f"Presign download error for user {user_id}: {str(e)}", exc_info=True)  
    raise error_response(str(e), status_code=500)

@app.function()
@modal.fastapi_endpoint(method="DELETE")
async def storage_delete_object(request: Request) -> dict:
"""ลบ object ใน bucket"""
_check_api_key(request)
user_id = request.headers.get("X-User-Id")
if not user_id:
raise error_response("Missing X-User-Id header", status_code=400)

_check_rate_limit(user_id, "storage_delete")  
  
path = request.query_params.get("path")  
if not path:  
    raise error_response("Missing path", status_code=400)  
  
try:  
    s3, bucket = _get_storage_client(user_id)  
    s3.delete_object(Bucket=bucket, Key=path)  
      
    # Invalidate cache for this prefix  
    for key in storage_cache_store.keys():  
        if key.startswith(f"{user_id}:list:"):  
            del storage_cache_store[key]  
      
    logger.info(f"Deleted object for user {user_id}: {path}")  
    return success_response({"message": f"Deleted {path}"})  
except ClientError as e:  
    error_code = e.response["Error"]["Code"]  
    logger.error(f"Delete object error for user {user_id}: {error_code}")  
    if error_code == "NoSuchBucket":  
        raise error_response(f"Bucket not found", detail=str(e), status_code=404)  
    elif error_code == "AccessDenied":  
        raise error_response(f"Access denied", detail=str(e), status_code=403)  
    else:  
        raise error_response(f"Storage error: {error_code}", detail=str(e), status_code=400)  
except Exception as e:  
    logger.error(f"Delete object error for user {user_id}: {str(e)}", exc_info=True)  
    raise error_response(str(e), status_code=500)

===== HTTP Endpoints เดิม (ปรับให้ใช้ Pydantic และ async) =====

@app.function()
@modal.fastapi_endpoint(method="GET")
async def health_check(request: Request) -> dict:
"""Health check endpoint with detailed error reporting."""
logger.info("Health check called")
errors = []

# Check Voyage AI connection  
try:  
    voyage_client = VoyageClient()  
    voyage_client.embed_texts(["test"])  
except Exception as e:  
    logger.error(f"Voyage AI health check failed: {str(e)}", exc_info=True)  
    errors.append({"service": "Voyage AI", "error": str(e)})  

# Check Zilliz connection  
try:  
    zilliz_client = ZillizClient()  
    zilliz_client.get_collection()  
except Exception as e:  
    logger.error(f"Zilliz health check failed: {str(e)}", exc_info=True)  
    errors.append({"service": "Zilliz", "error": str(e)})  

if errors:  
    return {"status": "error", "service": "skill-embedding-service", "errors": errors}  

return {"status": "ok", "service": "skill-embedding-service"}

@app.function()
@modal.fastapi_endpoint(method="POST")
async def search_skills_http(request: Request, body: SearchSkillsRequest) -> dict:
"""HTTP endpoint สำหรับ search"""
_check_api_key(request)
logger.info(f"Search skills request: {body.query}")

result = await asyncio.to_thread(  
    search_skills.local,  
    query=body.query,  
    top_k_rerank=body.top_k_rerank,  
    filter_expr=body.filter_expr,  
)  
  
if isinstance(result, dict) and "error" in result:  
    raise error_response(result["error"], status_code=500)  
  
return success_response(result)

@app.function()
@modal.fastapi_endpoint(method="POST")
async def index_skill_http(request: Request, body: IndexSkillRequest) -> dict:
"""HTTP endpoint สำหรับ index skill"""
_check_api_key(request)
logger.info(f"Index skill request: {body.skill_id}")

result = await asyncio.to_thread(index_skill.local, body.dict())  
  
if result.get("status") == "error":  
    raise error_response(result["error"], status_code=400)  
  
return success_response({"skill_id": result["skill_id"]})

@app.function()
@modal.fastapi_endpoint(method="POST")
async def create_collection_http(request: Request, body: CreateCollectionRequest) -> dict:
"""HTTP endpoint สำหรับสร้าง collection"""
_check_api_key(request)
logger.info(f"Create collection request (drop={body.drop_if_exists})")

result = await asyncio.to_thread(create_collection.local, drop_if_exists=body.drop_if_exists)  
  
if result.get("status") == "error":  
    raise error_response(result["error"], status_code=500)  
  
return success_response({  
    "collection": result["collection"],  
    "dimension": result["dimension"]  
})

===== Local entrypoint =====

@app.local_entrypoint()
def main():
"""ทดสอบ health check"""
result = health_check.remote()
print(f"Health: {result}")
