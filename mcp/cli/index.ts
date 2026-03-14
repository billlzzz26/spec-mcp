#!/usr/bin/env ts-node
/**
 * mcp_cli.ts - Command line interface for interacting with the Skill Service via MCP server functions (TypeScript version)
 */
import { createCollection, indexSkill, searchSkills } from '../server';
import * as fs from 'fs';
import * as path from 'path';

interface SkillData {
  skill_id: string;
  skill_name: string;
  description: string;
  capabilities: string[];
  plugin_domain?: string;
  provider_id?: string;
  version?: string;
}

/**
 * Index all skill JSON files in a directory
 * @param directory Path to directory containing skill JSON files
 * @param apiKey API key for authentication
 */
async function indexSkillsFromDirectory(directory: string, apiKey: string = ""): Promise<void> {
  try {
    const files = fs.readdirSync(directory);
    const skillFiles = files.filter(file => path.extname(file) === '.json');
    
    if (skillFiles.length === 0) {
      console.log(`No JSON files found in ${directory}`);
      return;
    }
    
    console.log(`Found ${skillFiles.length} skill files to index...`);
    
    for (const skillFile of skillFiles) {
      try {
        const filePath = path.join(directory, skillFile);
        const skillData = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SkillData;
        
        // Validate required fields
        const requiredFields = ['skill_id', 'skill_name', 'description', 'capabilities'];
        for (const field of requiredFields) {
          if (!(field in skillData) || !skillData[field as keyof SkillData]) {
            console.log(`Skipping ${skillFile}: missing required field '${field}'`);
            continue;
          }
        }
        
        // Set defaults for optional fields
        skillData.plugin_domain = skillData.plugin_domain || '';
        skillData.provider_id = skillData.provider_id || '';
        skillData.version = skillData.version || '1.0.0';
        
        console.log(`Indexing: ${skillData.skill_name} (${skillData.skill_id})`);
        const result = await indexSkill(
          skillData.skill_id,
          skillData.skill_name,
          skillData.description,
          skillData.capabilities,
          skillData.plugin_domain,
          skillData.provider_id,
          skillData.version,
          apiKey
        );
        console.log(`  Result: ${JSON.stringify(result, null, 2)}`);
        
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.log(`Error parsing ${skillFile}: Invalid JSON`);
        } else {
          console.log(`Error indexing ${skillFile}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  } catch (error) {
    console.log(`Error reading directory ${directory}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function printUsage(): void {
  console.log("Usage: ts-node mcp_cli.ts <command> [options]");
  console.log("Commands:");
  console.log("  create-collection [--drop-if-exists]   - Create skill collection");
  console.log("  index <skill_file>                     - Index a single skill from JSON file");
  console.log("  index-skills <directory>               - Index all skills in directory (JSON files)");
  console.log("  search <query> [--top-k <num>]         - Search for skills");
  console.log("  test                                   - Run test sequence");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    return;
  }
  
  const command = args[0];
  const apiKey = process.env.SKILL_SERVICE_API_KEY || "";
  
  if (command === "create-collection") {
    const dropIfExists = args.includes("--drop-if-exists");
    console.log("Creating collection...");
    const result = await createCollection(dropIfExists, apiKey);
    console.log(JSON.stringify(result, null, 2));
    
  } else if (command === "index") {
    if (args.length < 2) {
      console.log("Error: Please provide a skill file path");
      console.log("Usage: ts-node mcp_cli.ts index <skill_file>");
      return;
    }
    
    const skillFile = args[1];
    try {
      const skillData = JSON.parse(fs.readFileSync(skillFile, 'utf8')) as SkillData;
      
      console.log(`Indexing skill from ${skillFile}...`);
      const result = await indexSkill(
        skillData.skill_id,
        skillData.skill_name,
        skillData.description,
        skillData.capabilities,
        skillData.plugin_domain || '',
        skillData.provider_id || '',
        skillData.version || '1.0.0',
        apiKey
      );
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`Error: File ${skillFile} not found`);
      } else if (error instanceof SyntaxError) {
        console.log(`Error: Invalid JSON in ${skillFile}: ${error.message}`);
      } else {
        console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
  } else if (command === "index-skills") {
    if (args.length < 2) {
      console.log("Error: Please provide a directory path");
      console.log("Usage: ts-node mcp_cli.ts index-skills <directory>");
      return;
    }
    
    const directory = args[1];
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      console.log(`Error: ${directory} is not a valid directory`);
      return;
    }
    
    await indexSkillsFromDirectory(directory, apiKey);
    
  } else if (command === "search") {
    if (args.length < 2) {
      console.log("Error: Please provide a search query");
      console.log("Usage: ts-node mcp_cli.ts search <query> [--top-k <num>]");
      return;
    }
    
    const query = args[1];
    let topK = 5;
    
    // Parse optional --top-k argument
    const topKIndex = args.indexOf("--top-k");
    if (topKIndex !== -1 && topKIndex + 1 < args.length) {
      const parsed = parseInt(args[topKIndex + 1], 10);
      if (!isNaN(parsed)) {
        topK = parsed;
      } else {
        console.log("Warning: Invalid value for --top-k, using default 5");
      }
    }
    
    console.log(`Searching for: '${query}' (top_k=${topK})`);
    const results = await searchSkills(query, topK, undefined, apiKey);
    console.log(JSON.stringify(results, null, 2));
    
  } else if (command === "test") {
    console.log("Running test sequence...");
    if (!apiKey) {
      console.log("Warning: SKILL_SERVICE_API_KEY not set, using empty key (may fail)");
    }
    
    // 1. Create collection
    console.log("\n1. Creating collection...");
    const createResult = await createCollection(true, apiKey);
    console.log(`   Result: ${JSON.stringify(createResult)}`);
    
    // 2. Index a test skill
    console.log("\n2. Indexing test skill...");
    const testSkill = {
      skill_id: "test-skill",
      skill_name: "Test Skill",
      description: "A test skill for CLI verification",
      capabilities: ["test", "cli"],
      plugin_domain: "test",
      provider_id: "cli-test",
      version: "1.0.0"
    };
    const indexResult = await indexSkill(
      testSkill.skill_id,
      testSkill.skill_name,
      testSkill.description,
      testSkill.capabilities,
      testSkill.plugin_domain,
      testSkill.provider_id,
      testSkill.version,
      apiKey
    );
    console.log(`   Result: ${JSON.stringify(indexResult)}`);
    
    // 3. Search for the test skill
    console.log("\n3. Searching for test skill...");
    const searchResults = await searchSkills("test skill cli", 3, undefined, apiKey);
    console.log(`   Results: ${JSON.stringify(searchResults, null, 2)}`);
    
    console.log("\nTest sequence completed.");
    
  } else {
    console.log(`Error: Unknown command '${command}'`);
    console.log("Run 'ts-node mcp_cli.ts' for usage information");
  }
}

main().catch(error => {
  console.error("Fatal error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});