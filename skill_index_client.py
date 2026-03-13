#!/usr/bin/env python3
"""
skill_index_client.py - Simple curl wrapper
"""
import subprocess
import json
import sys

WORKSPACE = "billlzzz10"

# Commands for each action
COMMANDS = {
    "create-collection": [
        "curl", "-s", "-X", "POST",
        f"https://{WORKSPACE}--skill-embedding-service-create-collection-http.modal.run",
        "-H", "Content-Type: application/json",
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
        "-d", json.dumps(skill)
    ]
    return run_command(cmd)


def search_skills(query, top_k=5):
    """Search skills using curl"""
    cmd = [
        "curl", "-s", "-X", "POST",
        f"https://{WORKSPACE}--skill-embedding-service-search-skills-http.modal.run",
        "-H", "Content-Type: application/json",
        "-d", json.dumps({"query": query, "top_k_rerank": top_k})
    ]
    return run_command(cmd)


SKILLS = [
    {
        "skill_id": "agent-md-refactor",
        "skill_name": "Agent MD Refactor",
        "description": "Refactor bloated AGENTS.md, CLAUDE.md, or similar agent instruction files to follow progressive disclosure principles",
        "capabilities": ["documentation", "refactoring", "progressive disclosure"],
        "plugin_domain": "development",
        "provider_id": "softaworks",
        "version": "1.0.0"
    },
    {
        "skill_id": "artifacts-builder",
        "skill_name": "Artifacts Builder",
        "description": "Suite of tools for creating elaborate HTML artifacts using React, Tailwind CSS, shadcn/ui",
        "capabilities": ["frontend", "react", "html"],
        "plugin_domain": "development",
        "provider_id": "composio",
        "version": "1.0.0"
    },
    {
        "skill_id": "changelog-generator",
        "skill_name": "Changelog Generator",
        "description": "Automatically creates user-facing changelogs from git commits",
        "capabilities": ["git", "changelog", "release notes"],
        "plugin_domain": "development",
        "provider_id": "composio",
        "version": "1.0.0"
    },
    {
        "skill_id": "create-pull-request",
        "skill_name": "Create Pull Request",
        "description": "Create GitHub pull requests following project conventions using gh CLI",
        "capabilities": ["git", "github", "pull request"],
        "plugin_domain": "development",
        "provider_id": "cline",
        "version": "1.0.0"
    },
    {
        "skill_id": "mcp-builder",
        "skill_name": "MCP Builder",
        "description": "Guide for creating MCP servers that enable LLMs to interact with external services",
        "capabilities": ["mcp", "llm", "api integration"],
        "plugin_domain": "development",
        "provider_id": "composio",
        "version": "1.0.0"
    },
    {
        "skill_id": "skill-creator",
        "skill_name": "Skill Creator",
        "description": "Guide for creating effective skills that extend agent capabilities",
        "capabilities": ["skill development", "agent extensions"],
        "plugin_domain": "development",
        "provider_id": "composio",
        "version": "1.0.0"
    },
]


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    
    if cmd == "create-collection":
        print("Creating collection...")
        print(run_command(COMMANDS["create-collection"]))
    
    elif cmd == "index":
        print("Indexing skills...")
        for skill in SKILLS:
            print(f"Indexing: {skill['skill_name']}")
            result = index_skill(skill)
            print(f"  Result: {result}")
    
    elif cmd == "test":
        queries = [
            "create a new skill for my agent",
            "build html ui with react components",
            "generate changelog from git commits",
        ]
        for q in queries:
            print(f"\nQuery: {q}")
            print(search_skills(q))
    
    elif cmd == "search":
        query = sys.argv[2] if len(sys.argv) > 2 else "test"
        print(search_skills(query))
    
    else:
        print("Usage: python skill_index_client.py [create-collection|index|search|test]")
