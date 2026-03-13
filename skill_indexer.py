"""
skill_indexer.py
----------------
ฟังก์ชัน Modal สำหรับสร้าง embedding ของสกิลและบันทึกลง Zilliz
แก้ไข:
  - @stub.function() → @app.function()
  - index_skill.call() → index_skill.remote() (call() deprecated)
  - batch_index_skills ใช้ starmap() แทน loop เพื่อ parallel processing
  - ย้าย import ไปใน function body (best practice for Modal)
"""
from modal_setup import app


@app.function()
def index_skill(skill_metadata: dict) -> dict:
    """
    สร้าง embedding ของ skill metadata และบันทึกลง Zilliz

    skill_metadata ควรมีโครงสร้างดังนี้:
    {
        "skill_id":      "ajarn.writing.fiction.plot-generator",
        "skill_name":    "Plot Generator",
        "description":   "Generate fiction plot ideas",
        "capabilities":  ["creative writing", "plot", "storytelling"],
        "plugin_domain": "writing",
        "provider_id":   "ajarn",
        "version":       "1.0.0"
    }
    """
    # import ใน function body: best practice for Modal (ไม่ต้องติดตั้ง locally)
    from voyage_client import VoyageClient
    from zilliz_client import ZillizClient

    voyage = VoyageClient()
    zilliz = ZillizClient()

    # รวม metadata เป็น text เดียวสำหรับ embedding
    text_to_embed = (
        f"{skill_metadata['skill_name']}. "
        f"{skill_metadata['description']}. "
        f"Capabilities: {', '.join(skill_metadata.get('capabilities', []))}"
    )

    # สร้าง embedding (embed_texts ใช้ input_type="document")
    embedding = voyage.embed_texts([text_to_embed], model="voyage-2")[0]

    # บันทึกลง Zilliz
    zilliz.insert_skill(
        skill_id=skill_metadata["skill_id"],
        embedding=embedding,
        metadata=skill_metadata,
    )

    return {"status": "success", "skill_id": skill_metadata["skill_id"]}


@app.function()
def batch_index_skills(skills_list: list[dict]) -> list[dict]:
    """
    รับ list ของ skill_metadata และ index แบบ parallel ด้วย .map()
    แก้ไข: เปลี่ยนจาก sequential loop + .call() → .map() (parallel, ถูกต้อง)
    """
    # แก้ไข: ใช้ map() แทน loop + remote() เพื่อ parallel processing จริงๆ
    results = list(index_skill.map(skills_list))
    return results
