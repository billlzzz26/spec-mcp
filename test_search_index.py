#!/usr/bin/env python3
"""
Test script for indexing and searching skills using the skill embedding service.
This script indexes a set of test skills and then searches for them to verify
that the vector embeddings from indexing are used correctly in search.
"""

import subprocess
import json
import sys
import os

# Use the same workspace as in skill_index_client.py
WORKSPACE = "billlzzz10"

# Get API key from environment, use default if not set (matches the default in app.py)
API_KEY = os.environ.get("SKILL_SERVICE_API_KEY", "test-skill-service-key-for-development-only")

# Commands for each action (copied from skill_index_client.py) with API key header
COMMANDS = {
    "create-collection": [
        "curl", "-s", "-X", "POST",
        f"https://{WORKSPACE}--skill-embedding-service-create-collection-http.modal.run",
        "-H", "Content-Type: application/json",
        "-H", f"X-API-Key: {API_KEY}",
        "-d", '{"drop_if_exists": false}'
    ],
}

def run_command(cmd):
    """Run shell command and return output"""
    result = subprocess.run(cmd, capture_output=True, text=True, shell=False)
    return result.stdout

def index_skill(skill):
    """Index a single skill using curl"""
    cmd = [
        "curl", "-s", "-X", "POST",
        f"https://{WORKSPACE}--skill-embedding-service-index-skill-http.modal.run",
        "-H", "Content-Type: application/json",
        "-H", f"X-API-Key: {API_KEY}",
        "-d", json.dumps(skill)
    ]
    return run_command(cmd)

def search_skills(query, top_k=5):
    """Search skills using curl"""
    cmd = [
        "curl", "-s", "-X", "POST",
        f"https://{WORKSPACE}--skill-embedding-service-search-skills-http.modal.run",
        "-H", "Content-Type: application/json",
        "-H", f"X-API-Key: {API_KEY}",
        "-d", json.dumps({"query": query, "top_k_rerank": top_k})
    ]
    return run_command(cmd)

# Test skills - unique to avoid conflicts with existing data
TEST_SKILLS = [
    {
        "skill_id": "test-skill-1",
        "skill_name": "Test Skill One",
        "description": "This is a test skill for unit testing",
        "capabilities": ["testing", "unit test"],
        "plugin_domain": "development",
        "provider_id": "test",
        "version": "1.0.0"
    },
    {
        "skill_id": "test-skill-2",
        "skill_name": "Test Skill Two",
        "description": "Another test skill for integration testing",
        "capabilities": ["integration", "testing"],
        "plugin_domain": "development",
        "provider_id": "test",
        "version": "1.0.0"
    }
]

def main():
    print("=== Skill Indexing and Search Test ===\n")
    
    # Step 1: Ensure collection exists (optional, but safe)
    print("1. Ensuring collection exists...")
    result = run_command(COMMANDS["create-collection"])
    print(f"   Result: {result.strip()}\n")
    
    # Step 2: Index test skills
    print("2. Indexing test skills...")
    for skill in TEST_SKILLS:
        print(f"   Indexing: {skill['skill_name']} (ID: {skill['skill_id']})")
        result = index_skill(skill)
        print(f"   Result: {result.strip()}")
    print()
    
    # Step 3: Search for each test skill using relevant queries
    print("3. Searching for indexed skills using vector embeddings...")
    
    # Define test queries that should match our test skills
    test_queries = [
        ("unit test", "test-skill-1"),
        ("integration testing", "test-skill-2"),
        ("test skill", "both"),  # Should match both
    ]
    
    for query, expected_skill_id in test_queries:
        print(f"\n   Query: '{query}'")
        result = search_skills(query, top_k=5)
        print(f"   Raw result:\n{result}")
        
        # Try to parse JSON to check if expected skill is present
        try:
            data = json.loads(result)
            if isinstance(data, list):
                found_skills = [item.get('skill_id') for item in data]
                print(f"   Found skill IDs: {found_skills}")
                if expected_skill_id == "both":
                    # Check if both test skills are in the results
                    if "test-skill-1" in found_skills and "test-skill-2" in found_skills:
                        print("   ✓ Both test skills found in results")
                    else:
                        print("   ✗ Expected both test skills to be found")
                elif expected_skill_id in found_skills:
                    print(f"   ✓ Expected skill '{expected_skill_id}' found in results")
                else:
                    print(f"   ✗ Expected skill '{expected_skill_id}' NOT found in results")
            else:
                print(f"   Unexpected response format: {data}")
        except json.JSONDecodeError:
            print(f"   Could not parse JSON response: {result}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    main()