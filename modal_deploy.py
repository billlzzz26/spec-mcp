"""
modal_deploy.py
---------------
Modal App หลัก รวมฟังก์ชัน serverless ทั้งหมดและ web endpoints
แก้ไข:
  - @stub.function() → @app.function()
  - with stub.run(): → with app.run():
  - health.call() → health.remote()
  - search_skills.call() → search_skills.remote()
  - modal.Function.lookup().call() → .remote() (เพิ่มตัวอย่าง remote call)
  - เพิ่ม @app.function() + @modal.web_endpoint() สำหรับ HTTP API
"""
import modal
from modal_setup import app

# Import เพื่อให้ Modal รู้จักฟังก์ชันทั้งหมด (ต้องทำก่อน deploy)
from skill_indexer import index_skill, batch_index_skills
from skill_search import search_skills


# Health check endpoint
@app.function()
def health() -> dict:
    """ตรวจสอบสถานะของ service"""
    return {"status": "ok", "service": "skill-embedding-service"}


# HTTP Web Endpoint: ค้นหาสกิล (expose เป็น REST API)
@app.function()
@modal.web_endpoint(method="POST")
def search_skills_http(body: dict) -> list[dict]:
    """
    HTTP endpoint สำหรับ semantic skill search
    Request body:
    {
        "query": "generate fantasy plot",
        "top_k_rerank": 5,
        "filter_expr": "plugin_domain == 'writing'"  // optional
    }
    """
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


# HTTP Web Endpoint: index สกิลเดียว
@app.function()
@modal.web_endpoint(method="POST")
def index_skill_http(skill_metadata: dict) -> dict:
    """
    HTTP endpoint สำหรับ index skill หนึ่งตัว
    Request body: skill_metadata dict
    """
    return index_skill.local(skill_metadata)


# ===== Local entrypoint สำหรับทดสอบ =====
@app.local_entrypoint()
def main():
    """รัน smoke test เมื่อใช้ `modal run modal_deploy.py`"""
    # ทดสอบ health check
    # แก้ไข: .call() → .remote()
    health_result = health.remote()
    print(f"Health: {health_result}")

    # ทดสอบ search (ต้องมี collection ใน Zilliz แล้ว)
    # แก้ไข: .call() → .remote()
    result = search_skills.remote(
        "สร้างนิยายแฟนตาซี",
        top_k_rerank=3,
    )
    print(f"Search result: {result}")


# ===== ตัวอย่าง remote call จากภายนอก (หลัง deploy) =====
# แก้ไข: modal.Function.lookup().call() → .remote()
#
# import modal
# fn = modal.Function.lookup("skill-embedding-service", "search_skills")
# result = fn.remote("สร้างนิยายแฟนตาซี", top_k_rerank=5)
# print(result)
