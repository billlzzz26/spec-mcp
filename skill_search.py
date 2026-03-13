"""
skill_search.py
---------------
ฟังก์ชัน Modal สำหรับค้นหาสกิลด้วย Semantic Search + Rerank
แก้ไข:
  - @stub.function() → @app.function()
  - ใช้ embed_query() แทน embed_texts() สำหรับ query (input_type="query")
  - rerank model: rerank-1 → rerank-2 (version ล่าสุด)
  - แยก embed และ search เป็น steps ที่ชัดเจน
  - เพิ่ม type hints
"""
from modal_setup import app


@app.function()
def search_skills(
    query: str,
    top_k_embedding: int = 20,
    top_k_rerank: int = 5,
    filter_expr: str | None = None,
) -> list[dict]:
    """
    ค้นหาสกิลที่เกี่ยวข้องกับ query โดยใช้ 3 ขั้นตอน:
    1. สร้าง query embedding ด้วย Voyage (input_type="query")
    2. Vector search ใน Zilliz เพื่อหา candidates
    3. Rerank candidates ด้วย Voyage rerank-2

    :param query: คำค้นหา
    :param top_k_embedding: จำนวน candidates จาก Zilliz
    :param top_k_rerank: จำนวนผลลัพธ์สุดท้ายหลัง rerank
    :param filter_expr: Zilliz filter expression เช่น "plugin_domain == 'writing'"
    :return: list of skill dicts เรียงตาม rerank score
    """
    from voyage_client import VoyageClient
    from zilliz_client import ZillizClient

    voyage = VoyageClient()
    zilliz = ZillizClient()

    # ขั้นตอนที่ 1: สร้าง embedding สำหรับ query
    # แก้ไข: ใช้ embed_query() (input_type="query") แทน embed_texts() เพื่อความแม่นยำ
    query_embedding = voyage.embed_query(query, model="voyage-2")

    # ขั้นตอนที่ 2: Vector search ใน Zilliz
    candidates = zilliz.search_similar(
        query_embedding=query_embedding,
        top_k=top_k_embedding,
        expr=filter_expr,
    )

    if not candidates:
        return []

    # เตรียม documents สำหรับ rerank
    documents: list[str] = []
    results_meta: list[dict] = []

    for hit in candidates:
        # ใช้ skill_name + description เพื่อ rerank context ดีขึ้น
        skill_name = hit.entity.get("skill_name", "")
        description = hit.entity.get("description", "")
        doc_text = f"{skill_name}. {description}"
        documents.append(doc_text)
        results_meta.append({
            "skill_id":      hit.id,
            "skill_name":    skill_name,
            "description":   description,
            "capabilities":  hit.entity.get("capabilities"),
            "plugin_domain": hit.entity.get("plugin_domain"),
            "provider_id":   hit.entity.get("provider_id"),
            "version":       hit.entity.get("version"),
            "vector_score":  hit.score,  # COSINE similarity score
        })

    # ขั้นตอนที่ 3: Rerank ด้วย Voyage rerank-2
    rerank_results = voyage.rerank(
        query,
        documents,
        model="rerank-2",   # แก้ไข: rerank-1 → rerank-2
        top_k=top_k_rerank,
    )

    # รวม rerank score เข้ากับ metadata
    final_results: list[dict] = []
    for r in rerank_results:
        meta = results_meta[r.index].copy()
        meta["rerank_score"] = r.relevance_score
        final_results.append(meta)

    # เรียงตาม rerank_score สูงไปต่ำ
    final_results.sort(key=lambda x: x["rerank_score"], reverse=True)
    return final_results
