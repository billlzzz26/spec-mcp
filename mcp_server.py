'''
mcp_server.py
------------
MCP Server สำหรับ Skill Embedding Service
ใช้ API key authentication (bl-1nk-xxxxxxxxxxxxxxxxxxxxxxxx)
'''
import os
import json
import urllib.request
import urllib.error
from typing import Any, Optional, List, Dict

# API Key for authentication - ต้องตั้งค่าใน Modal secrets
API_KEY = os.environ.get("SKILL_SERVICE_API_KEY", "")

# Modal deployment URL
WORKSPACE = "billlzzz10"
BASE_URL = f"https://{WORKSPACE}--skill-embedding-service"

SEARCH_URL = f"{BASE_URL}-search-skills-http.modal.run"
INDEX_URL = f"{BASE_URL}-index-skill-http.modal.run"
COLLECTION_URL = f"{BASE_URL}-create-collection-http.modal.run"


def verify_api_key(key: str) -> bool:
    """ตรวจสอบ API key"""
    if not API_KEY:
        return True  # ถ้าไม่มี key ก็ไม่ตรวจ
    return key == API_KEY


def _post(url: str, data: dict, api_key: str = "") -> dict:
    """Send POST request with optional API key"""
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["X-API-Key"] = api_key
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers=headers
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode('utf-8')}"}
    except Exception as e:
        return {"error": str(e)}


# ===== MCP Tools =====

def create_collection(drop_if_exists: bool = False, api_key: str = "") -> dict:
    """
    สร้าง collection ใน Zilliz vector database
    
    Args:
        drop_if_exists: ถ้า true จะลบ collection เก่าก่อนสร้างใหม่
        api_key: API key สำหรับ authentication
    
    Returns:
        dict with status and collection info
    """
    if not verify_api_key(api_key):
        return {"error": "Invalid API key"}
    
    url = f"https://{COLLECTION_URL}"
    result = _post(url, {"drop_if_exists": drop_if_exists}, api_key)
    return result


def index_skill(
    skill_id: str,
    skill_name: str,
    description: str,
    capabilities: list[str],
    plugin_domain: str = "",
    provider_id: str = "",
    version: str = "1.0.0",
    api_key: str = ""
) -> dict:
    """
    Index skill หนึ่งตัวเข้า vector database
    
    Args:
        skill_id: รหัส unique ของ skill (เช่น "mcp-builder")
        skill_name: ชื่อ skill
        description: คำอธิบาย skill
        capabilities: list ของความสามารถ (เช่น ["mcp", "llm"])
        plugin_domain: domain ของ plugin
        provider_id: ผู้ให้บริการ
        version: เวอร์ชัน
        api_key: API key สำหรับ authentication
    
    Returns:
        dict with status
    """
    if not verify_api_key(api_key):
        return {"error": "Invalid API key"}
    
    skill_metadata = {
        "skill_id": skill_id,
        "skill_name": skill_name,
        "description": description,
        "capabilities": capabilities,
        "plugin_domain": plugin_domain,
        "provider_id": provider_id,
        "version": version,
    }
    
    url = f"https://{INDEX_URL}"
    return _post(url, skill_metadata, api_key)


def search_skills(
    query: str,
    top_k: int = 5,
    filter_expr: Optional[str] = None,
    api_key: str = ""
) -> list[dict]:
    """
    ค้นหา skills ด้วย semantic search
    
    Args:
        query: คำค้นหา
        top_k: จำนวนผลลัพธ์ที่ต้องการ
        filter_expr: filter expression (เช่น "plugin_domain == 'development'")
        api_key: API key สำหรับ authentication
    
    Returns:
        list ของ skill ที่ค้นหาเจอ
    """
    if not verify_api_key(api_key):
        return [{"error": "Invalid API key"}]
    
    url = f"https://{SEARCH_URL}"
    data = {
        "query": query,
        "top_k_rerank": top_k,
    }
    if filter_expr:
        data["filter_expr"] = filter_expr
    
    result = _post(url, data, api_key)
    
    if isinstance(result, list):
        return result
    return [result]


# ===== Example Usage =====
if __name__ == "__main__":
    # การใช้งานต้องมี API Key ที่ถูกต้อง ซึ่งปกติจะตั้งค่าไว้ใน environment variable
    # SKILL_SERVICE_API_KEY="your-secret-api-key"
    
    # หากต้องการทดสอบ ให้ใส่ API Key ของคุณที่นี่
    TEST_API_KEY = "" # <--- ใส่ API Key ของคุณที่นี่เพื่อทดสอบ
    
    if not TEST_API_KEY:
        print("กรุณาตั้งค่า TEST_API_KEY ในไฟล์ mcp_server.py เพื่อทดสอบการใช้งาน")
    else:
        # --- 1. สร้าง Collection (ทำครั้งแรก) ---
        print("1. Creating collection...")
        # หากมี collection อยู่แล้วและต้องการล้างข้อมูลเก่า ให้ใช้ drop_if_exists=True
        create_result = create_collection(drop_if_exists=True, api_key=TEST_API_KEY)
        print(f"Create collection result: {create_result}\n")

        # --- 2. Index Skills (เพิ่มข้อมูล Skill) ---
        print("2. Indexing skills...")
        skill_1 = {
            "skill_id": "file-writer",
            "skill_name": "File Writer",
            "description": "A tool to write content to a file at a specified path.",
            "capabilities": ["file-system", "write"],
            "plugin_domain": "local.dev"
        }
        index_result_1 = index_skill(**skill_1, api_key=TEST_API_KEY)
        print(f"Indexing '{skill_1['skill_name']}': {index_result_1}")

        skill_2 = {
            "skill_id": "react-builder",
            "skill_name": "React Component Builder",
            "description": "Builds modern and interactive user interfaces using React and JSX.",
            "capabilities": ["react", "frontend", "ui"],
            "plugin_domain": "web.dev"
        }
        index_result_2 = index_skill(**skill_2, api_key=TEST_API_KEY)
        print(f"Indexing '{skill_2['skill_name']}': {index_result_2}\n")

        # --- 3. Search for a skill ---
        print("3. Searching for skills...")
        search_query = "how to create a user interface for a website"
        print(f"Searching for: '{search_query}'")
        search_results = search_skills(search_query, top_k=2, api_key=TEST_API_KEY)
        print("Search results:")
        for result in search_results:
            print(result)
