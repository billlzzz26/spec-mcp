/**
 * mcp_server.ts - MCP Server for Skill Embedding Service (TypeScript version)
 * Uses API key authentication (bl-1nk-xxxxxxxxxxxxxxxxxxxxxxxx)
 */
import * as https from 'https';

interface SkillMetadata {
  skill_id: string;
  skill_name: string;
  description: string;
  capabilities: string[];
  plugin_domain?: string;
  provider_id?: string;
  version?: string;
}

interface CollectionResult {
  status?: string;
  error?: string;
}

interface IndexResult {
  status?: string;
  error?: string;
}

interface SearchResult {
  [key: string]: any;
}

// API Key for authentication - ต้องตั้งค่าใน Modal secrets
const API_KEY: string = process.env.SKILL_SERVICE_API_KEY || "";

// Modal deployment URL
const WORKSPACE: string = "billlzzz10";
const BASE_URL: string = `https://${WORKSPACE}--skill-embedding-service`;

const SEARCH_URL: string = `${BASE_URL}-search-skills-http.modal.run`;
const INDEX_URL: string = `${BASE_URL}-index-skill-http.modal.run`;
const COLLECTION_URL: string = `${BASE_URL}-create-collection-http.modal.run`;

/**
 * ตรวจสอบ API key
 * @param key API key to verify
 * @returns true if valid
 */
function verifyApiKey(key: string): boolean {
  if (!API_KEY) {
    return true; // ถ้าไม่มี key ก็ไม่ตรวจ
  }
  return key === API_KEY;
}

/**
 * Send POST request with optional API key
 * @param endpoint URL endpoint
 * @param data Data to send
 * @param apiKey Optional API key for authentication
 * @returns Promise resolving to response data
 */
function postRequest(endpoint: string, data: any, apiKey: string = ""): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(endpoint);
    const options = {
      method: 'POST',
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {})
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e: unknown) {
          reject(new Error(`Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`));
        }
      });
    });

    req.on('error', (error: NodeJS.ErrnoException | null) => {
      reject(error ? new Error(error.message) : new Error('Unknown error'));
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

/**
 * สร้าง collection ใน Zilliz vector database
 * @param dropIfExists ถ้า true จะลบ collection เก่าก่อนสร้างใหม่
 * @param apiKey API key สำหรับ authentication
 * @returns Promise resolving to collection info
 */
export async function createCollection(dropIfExists: boolean = false, apiKey: string = ""): Promise<CollectionResult> {
  if (!verifyApiKey(apiKey)) {
    return { error: "Invalid API key" };
  }

  try {
    const result = await postRequest(COLLECTION_URL, { drop_if_exists: dropIfExists }, apiKey);
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Index skill หนึ่งตัวเข้า vector database
 * @param skillId รหัส unique ของ skill (เช่น "mcp-builder")
 * @param skillName ชื่อ skill
 * @param description คำอธิบาย skill
 * @param capabilities list ของความสามารถ (เช่น ["mcp", "llm"])
 * @param pluginDomain domain ของ plugin
 * @param providerId ผู้ให้บริการ
 * @param version เวอร์ชัน
 * @param apiKey API key สำหรับ authentication
 * @returns Promise resolving to index status
 */
export async function indexSkill(
  skillId: string,
  skillName: string,
  description: string,
  capabilities: string[],
  pluginDomain: string = "",
  providerId: string = "",
  version: string = "1.0.0",
  apiKey: string = ""
): Promise<IndexResult> {
  if (!verifyApiKey(apiKey)) {
    return { error: "Invalid API key" };
  }

  const skillMetadata: SkillMetadata = {
    skill_id: skillId,
    skill_name: skillName,
    description: description,
    capabilities: capabilities,
    plugin_domain: pluginDomain,
    provider_id: providerId,
    version: version
  };

  try {
    const result = await postRequest(INDEX_URL, skillMetadata, apiKey);
    return result;
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * ค้นหา skills ด้วย semantic search
 * @param query คำค้นหา
 * @param topK จำนวนผลลัพธ์ที่ต้องการ
 * @param filterExpr filter expression (เช่น "plugin_domain == 'development'")
 * @param apiKey API key สำหรับ authentication
 * @returns Promise resolving to search results
 */
export async function searchSkills(
  query: string,
  topK: number = 5,
  filterExpr?: string,
  apiKey: string = ""
): Promise<SearchResult[]> {
  if (!verifyApiKey(apiKey)) {
    return [{ error: "Invalid API key" }];
  }

  const data: any = {
    query: query,
    top_k_rerank: topK
  };

  if (filterExpr) {
    data.filter_expr = filterExpr;
  }

  try {
    const result = await postRequest(SEARCH_URL, data, apiKey);
    if (Array.isArray(result)) {
      return result;
    }
    return [result];
  } catch (error) {
    return [{ error: error instanceof Error ? error.message : String(error) }];
  }
}

// Example Usage
if (require.main === module) {
  // การใช้งานต้องมี API Key ที่ถูกต้อง ซึ่งปกติจะตั้งค่าไว้ใน environment variable
  // SKILL_SERVICE_API_KEY="your-secret-api-key"
  
  // หากต้องการทดสอบ ให้ใส่ API Key ของคุณที่นี่
  const TEST_API_KEY = ""; // <--- ใส่ API Key ของคุณที่นี่เพื่อทดสอบ
  
  if (!TEST_API_KEY) {
    console.log("กรุณาตั้งค่า TEST_API_KEY ในไฟล์ mcp_server.ts เพื่อทดสอบการใช้งาน");
  } else {
    // --- 1. สร้าง Collection (ทำครั้งแรก) ---
    console.log("1. Creating collection...");
    // หากมี collection อยู่แล้วและต้องการล้างข้อมูลเก่า ให้ใช้ drop_if_exists=true
    createCollection(true, TEST_API_KEY)
      .then((createResult) => {
        console.log(`Create collection result: ${JSON.stringify(createResult)}\n`);
        
        // --- 2. Index Skills (เพิ่มข้อมูล Skill) ---
        console.log("2. Indexing skills...");
        const skill1 = {
          skillId: "file-writer",
          skillName: "File Writer",
          description: "A tool to write content to a file at a specified path.",
          capabilities: ["file-system", "write"],
          pluginDomain: "local.dev"
        };
        
        return indexSkill(
          skill1.skillId,
          skill1.skillName,
          skill1.description,
          skill1.capabilities,
          skill1.pluginDomain,
          "",
          "1.0.0",
          TEST_API_KEY
        ).then((indexResult1) => {
          console.log(`Indexing '${skill1.skillName}': ${JSON.stringify(indexResult1)}`);
          
          const skill2 = {
            skillId: "react-builder",
            skillName: "React Component Builder",
            description: "Builds modern and interactive user interfaces using React and JSX.",
            capabilities: ["react", "frontend", "ui"],
            pluginDomain: "web.dev"
          };
          
          return indexSkill(
            skill2.skillId,
            skill2.skillName,
            skill2.description,
            skill2.capabilities,
            skill2.pluginDomain,
            "",
            "1.0.0",
            TEST_API_KEY
          ).then((indexResult2) => {
            console.log(`Indexing '${skill2.skillName}': ${JSON.stringify(indexResult2)}\n`);
            
            // --- 3. Search for a skill ---
            console.log("3. Searching for skills...");
            const searchQuery = "how to create a user interface for a website";
            console.log(`Searching for: '${searchQuery}'`);
            
            return searchSkills(searchQuery, 2, undefined, TEST_API_KEY)
              .then((searchResults) => {
                console.log("Search results:");
                searchResults.forEach((result) => {
                  console.log(JSON.stringify(result));
                });
              });
          });
        });
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }
}