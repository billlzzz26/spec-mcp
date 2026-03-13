"""
zilliz_client.py
----------------
Wrapper สำหรับ Zilliz Cloud (Milvus protocol)
แก้ไข:
  - Zilliz Cloud ใช้ uri + token ไม่ใช่ host + port
    (host/port ใช้สำหรับ self-hosted Milvus เท่านั้น)
  - เพิ่ม ZILLIZ_URI และ ZILLIZ_TOKEN env vars
  - แก้ drop_if_exists logic ใน create_collection
  - เพิ่ม load() guard: ไม่ load ซ้ำถ้า collection loaded แล้ว
"""
import os
from pymilvus import (
    connections,
    utility,
    Collection,
    CollectionSchema,
    FieldSchema,
    DataType,
)


class ZillizClient:
    """Client wrapper สำหรับ Zilliz Cloud Vector Store"""

    def __init__(self):
        # แก้ไข: Zilliz Cloud ใช้ uri + token
        # ตัวอย่าง uri: "https://in03-xxxx.zillizcloud.com:443"
        self.uri = os.environ["ZILLIZ_URI"]
        self.token = os.environ["ZILLIZ_TOKEN"]
        self.collection_name = os.getenv("ZILLIZ_COLLECTION", "skill_embeddings")
        # voyage-2 output dim = 1024, voyage-large-2 = 1536
        self.dim = int(os.getenv("EMBEDDING_DIM", "1024"))

        # แก้ไข: เชื่อมต่อด้วย uri + token แทน host + port
        connections.connect(
            alias="default",
            uri=self.uri,
            token=self.token,
        )

    def create_collection(self, drop_if_exists: bool = False) -> Collection:
        """สร้าง collection ใหม่ พร้อม HNSW index"""
        # แก้ไข: เพิ่ม logic จัดการ drop_if_exists จริงๆ
        if utility.has_collection(self.collection_name):
            if drop_if_exists:
                utility.drop_collection(self.collection_name)
            else:
                return Collection(self.collection_name)

        fields = [
            FieldSchema(name="id",           dtype=DataType.VARCHAR,      max_length=256,  is_primary=True),
            FieldSchema(name="embedding",    dtype=DataType.FLOAT_VECTOR, dim=self.dim),
            FieldSchema(name="skill_name",   dtype=DataType.VARCHAR,      max_length=256),
            FieldSchema(name="description",  dtype=DataType.VARCHAR,      max_length=4096),
            FieldSchema(name="capabilities", dtype=DataType.JSON),          # เก็บ array เป็น JSON
            FieldSchema(name="plugin_domain",dtype=DataType.VARCHAR,      max_length=256),
            FieldSchema(name="provider_id",  dtype=DataType.VARCHAR,      max_length=256),
            FieldSchema(name="version",      dtype=DataType.VARCHAR,      max_length=50),
        ]
        schema = CollectionSchema(fields, description="Skill embeddings for semantic search")
        collection = Collection(name=self.collection_name, schema=schema)

        # สร้าง HNSW index สำหรับ vector field
        index_params = {
            "metric_type": "COSINE",   # COSINE ดีกว่า IP สำหรับ normalized embeddings
            "index_type": "HNSW",
            "params": {"M": 16, "efConstruction": 200},
        }
        collection.create_index("embedding", index_params)
        return collection

    def get_collection(self) -> Collection:
        """ดึง collection ที่มีอยู่ หรือสร้างใหม่"""
        if utility.has_collection(self.collection_name):
            return Collection(self.collection_name)
        return self.create_collection()

    def insert_skill(self, skill_id: str, embedding: list[float], metadata: dict) -> None:
        """แทรก skill embedding พร้อม metadata ลง Zilliz"""
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

    def search_similar(
        self,
        query_embedding: list[float],
        top_k: int = 10,
        expr: str | None = None,
    ) -> list:
        """ค้นหา skill ที่คล้ายคลึงกับ query embedding"""
        collection = self.get_collection()

        # แก้ไข: ตรวจสอบ load state ก่อน load เพื่อป้องกัน double-load
        load_state = utility.load_state(self.collection_name)
        if str(load_state) != "Loaded":
            collection.load()

        search_params = {
            "metric_type": "COSINE",
            "params": {"ef": 64},
        }
        results = collection.search(
            data=[query_embedding],
            anns_field="embedding",
            param=search_params,
            limit=top_k,
            expr=expr,
            output_fields=[
                "skill_name",
                "description",
                "capabilities",
                "plugin_domain",
                "provider_id",
                "version",
            ],
        )
        return results[0]  # results for first (only) query
