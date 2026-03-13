"""
modal_setup.py
--------------
ตั้งค่า Modal App พร้อมกำหนด image และ secrets
แก้ไข:
  - modal.Stub → modal.App (Stub ถูก deprecated ตั้งแต่ Modal v0.60+)
  - .pip_install_from_requirements() → .uv_pip_install() (เร็วกว่า, รองรับ lockfile)
  - python_version 3.11 → 3.12
"""
import modal

# สร้าง container image พร้อม dependencies
image = (
    modal.Image.debian_slim(python_version="3.12")
    .uv_pip_install(
        "voyageai>=0.3.2",
        "pymilvus>=2.4.0",
        "numpy>=1.26.0",
    )
)

# แก้ไข: modal.Stub → modal.App
app = modal.App(
    name="skill-embedding-service",
    image=image,
    secrets=[
        modal.Secret.from_name("voyage-secret"),   # VOYAGE_API_KEY
        modal.Secret.from_name("zilliz-secret"),   # ZILLIZ_URI, ZILLIZ_TOKEN, ZILLIZ_COLLECTION
    ],
)
