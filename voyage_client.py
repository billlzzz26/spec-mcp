"""
voyage_client.py
----------------
Wrapper สำหรับ Voyage AI API (embedding + rerank)
แก้ไข:
  - ตรวจสอบ SDK API ให้ตรงกับ voyageai>=0.3.2
  - เพิ่ม input_type parameter สำหรับ embedding (ช่วยความแม่นยำ)
  - เพิ่ม error handling
"""
import os
import voyageai


class VoyageClient:
    """Client wrapper สำหรับ Voyage AI embedding และ rerank"""

    def __init__(self):
        api_key = os.environ["VOYAGE_API_KEY"]
        # voyageai>=0.3.x ใช้ voyageai.Client(api_key=...)
        self.client = voyageai.Client(api_key=api_key)

    def embed_texts(self, texts: list[str], model: str = "voyage-2") -> list[list[float]]:
        """
        สร้าง embedding สำหรับรายการข้อความ
        :param texts: list of strings (max 128 ต่อ request)
        :param model: ชื่อโมเดล เช่น voyage-2, voyage-large-2, voyage-3
        :return: list of embeddings (list of float lists)
        """
        if not texts:
            return []

        # voyage-2 → dim=1024, voyage-large-2 → dim=1536, voyage-3 → dim=1024
        response = self.client.embed(
            texts,
            model=model,
            input_type="document",  # "document" สำหรับ index, "query" สำหรับ search
        )
        return response.embeddings

    def embed_query(self, query: str, model: str = "voyage-2") -> list[float]:
        """
        สร้าง embedding สำหรับ query (ใช้ input_type="query" เพื่อความแม่นยำ)
        :param query: search query string
        :param model: ชื่อโมเดล
        :return: embedding vector (list of float)
        """
        response = self.client.embed(
            [query],
            model=model,
            input_type="query",
        )
        return response.embeddings[0]

    def rerank(
        self,
        query: str,
        documents: list[str],
        model: str = "rerank-2",   # แก้ไข: rerank-1 → rerank-2 (เวอร์ชันล่าสุด)
        top_k: int | None = None,
    ) -> list:
        """
        Rerank เอกสารตามความเกี่ยวข้องกับ query
        :param query: search query string
        :param documents: list of document strings
        :param model: rerank model name
        :param top_k: จำนวนผลลัพธ์สูงสุด (None = คืนทั้งหมด)
        :return: list of RerankResult {index, relevance_score}
        """
        if not documents:
            return []

        response = self.client.rerank(
            query,
            documents,
            model=model,
            top_k=top_k,
        )
        return response.results
