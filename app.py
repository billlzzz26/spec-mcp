"""
app.py
------
Modal App หลัก - รวมทุกอย่างไว้ในไฟล์เดียว
"""
import os
import modal
from modal import Secret

# สร้าง image
image = (
    modal.Image.debian_slim(python_version="3.12")
    .uv_pip_install(
        "voyageai>=0.3.2",
        "pymilvus>=2.4.0",
        "numpy>=1.26.0",
        "fastapi[standard]",
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


# ===== Client Classes (inline) =====

class VoyageClient:
    """Voyage AI client"""
    def __init__(self):
        import voyageai
        self.client = voyageai.Client(api_key=os.environ["VOYAGE_API_KEY"])

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
    """Type definition for skill metadata.
    
    Required fields: skill_name, description, capabilities, plugin_domain
    Optional fields: skill_id, provider_id, version
    """
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
        
        self.uri = os.environ["ZILLIZ_URI"]
        self.token = os.environ["ZILLIZ_TOKEN"]
        self.collection_name = os.getenv("ZILLIZ_COLLECTION", "skill_embeddings")
        self.dim = int(os.getenv("EMBEDDING_DIM", "1024"))
        
        connections.connect(alias="default", uri=self.uri, token=self.token)
        
        # Store for later use
        self._utility = utility
        self._Collection = Collection
        self._CollectionSchema = CollectionSchema
        self._FieldSchema = FieldSchema
        self._DataType = DataType

    def _create_field_schemas(self) -> list:
        """Create field schemas for the collection.

        Returns a list of FieldSchema objects defining the collection structure.
        Centralized field definitions improve maintainability and consistency.
        """
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
        """Create a new collection with the defined schema.

        Args:
            drop_if_exists: If True, drops existing collection before creating new one.

        Returns:
            The created Collection object.
        """
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
        """Insert a skill with its embedding into the collection.

        Args:
            skill_id: Unique identifier for the skill.
            embedding: Vector embedding of the skill.
            metadata: Metadata dictionary containing skill information.

        Raises:
            ValueError: If required metadata keys are missing or embedding dimension is invalid.
        """
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
        
        # Load collection if not loaded
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


# ===== Helper Functions (ทำงานใน container) =====

@app.function()
def index_skill(skill_metadata: dict) -> dict:
    """สร้าง embedding และบันทึกลง Zilliz"""
    # Validate required keys for both index_skill and ZillizClient.insert_skill
    required_keys = ['skill_id', 'skill_name', 'description', 'capabilities', 'plugin_domain']
    missing = [k for k in required_keys if k not in skill_metadata]
    if missing:
        return {"status": "error", "error": f"Missing required keys: {missing}"}
    
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

    return {"status": "success", "skill_id": skill_metadata["skill_id"]}


@app.function()
def batch_index_skills(skills_list: list[dict]) -> list[dict]:
    """Index หลาย skills แบบ parallel"""
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
    try:
        voyage = VoyageClient()
        zilliz = ZillizClient()

        # 1. Embed query
        query_embedding = voyage.embed_query(query, model="voyage-2")

        # 2. Vector search
        candidates = zilliz.search_similar(
            query_embedding=query_embedding,
            top_k=top_k_embedding,
            expr=filter_expr,
        )

        if not candidates:
            return []

        # 3. Prepare for rerank
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

        # 4. Rerank (using rerank-2)
        rerank_results = voyage.rerank(
            query,
            documents,
            model="rerank-2",
            top_k=top_k_rerank,
        )

        # 5. Combine results
        final_results = []
        for r in rerank_results:
            meta = results_meta[r.index].copy()
            meta["rerank_score"] = r.relevance_score
            final_results.append(meta)

        final_results.sort(key=lambda x: x["rerank_score"], reverse=True)
        return final_results
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}


@app.function()
def create_collection(drop_if_exists: bool = False):
    """สร้าง Zilliz collection"""
    client = ZillizClient()
    collection = client.create_collection(drop_if_exists=drop_if_exists)
    return {
        "status": "success",
        "collection": collection.name,
        "dimension": client.dim
    }


# ===== HTTP Endpoints =====

@app.function()
@modal.fastapi_endpoint(method="GET")
def health_check() -> dict:
    """Health check endpoint with detailed error reporting."""
    errors = []
    
    # Check Voyage AI connection
    try:
        voyage_client = VoyageClient()
        # Perform a simple check, e.g., embedding a short text
        voyage_client.embed_texts(["test"])
    except Exception as e:
        errors.append({"service": "Voyage AI", "error": str(e)})

    # Check Zilliz connection
    try:
        zilliz_client = ZillizClient()
        # Perform a simple check, e.g., getting collection info
        zilliz_client.get_collection()
    except Exception as e:
        errors.append({"service": "Zilliz", "error": str(e)})

    if errors:
        return {
            "status": "error",
            "service": "skill-embedding-service",
            "errors": errors,
        }
    
    return {"status": "ok", "service": "skill-embedding-service"}


@app.function()
@modal.fastapi_endpoint(method="POST")
def search_skills_http(body: dict) -> list[dict]:
    """HTTP endpoint สำหรับ search"""
    query = body.get("query", "")
    top_k_rerank = body.get("top_k_rerank", 5)
    filter_expr = body.get("filter_expr", None)

    if not query:
        return []

    return search_skills.local(
        query=query,
        top_k_rerank=top_k_rerank,
        filter_expr=filter_expr,
    )


@app.function()
@modal.fastapi_endpoint(method="POST")
def index_skill_http(skill_metadata: dict) -> dict:
    """HTTP endpoint สำหรับ index skill"""
    return index_skill.local(skill_metadata)


@app.function()
@modal.fastapi_endpoint(method="POST")
def create_collection_http(body: dict) -> dict:
    """HTTP endpoint สำหรับสร้าง collection"""
    drop = body.get("drop_if_exists", False)
    return create_collection.local(drop_if_exists=drop)


# ===== Local entrypoint =====

@app.local_entrypoint()
def main():
    """ทดสอบ health check"""
    result = health_check.remote()
    print(f"Health: {result}")
