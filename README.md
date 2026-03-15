# Skill Service

Semantic skill search service using Voyage AI and Zilliz Cloud deployed on Modal Serverless with MCP (Model Context Protocol) integration.

## Features

- 🔍 **Semantic Search** - AI-powered skill discovery using Voyage AI embeddings
- 📊 **Vector Database** - Zilliz Cloud (Milvus) for efficient similarity search
- 🤖 **MCP Integration** - Model Context Protocol support for AI agent integration
- 📚 **Skill Catalog** - 688-line catalog builder with bundles, aliases, and categories
- 🎨 **Modern UI** - Dark mode interface with responsive design
- 🧪 **Testing** - Unit tests (Vitest) and E2E tests (Playwright)

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Modal Serverless (Python/TypeScript)
- **Database**: Zilliz Cloud (Milvus)
- **Embeddings**: Voyage AI
- **Protocol**: MCP (Model Context Protocol)

## Project Structure

```
skill-service/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI widget (dark mode)
│   │   ├── page.test.tsx         # Unit tests (6 tests)
│   │   ├── api/route.ts          # MCP API endpoint (5 tools)
│   │   └── mcp/
│   │       ├── route.ts          # MCP server endpoint (3 catalog tools)
│   │       └── catalog/
│   │           └── catalog.ts    # Skill catalog builder (688 lines)
│   ├── components/ui/            # shadcn UI components (6 files)
│   ├── lib/utils.ts              # Utility functions
│   ├── test/setup.ts             # Test setup
│   └── e2e/ui-ux.spec.ts         # Playwright E2E tests (30+ tests)
├── mcp/server/
│   ├── index.ts                  # MCP server entry point
│   └── tools/
│       ├── search.ts             # search_skills tool
│       ├── index.ts              # index_skill tool
│       ├── create-collection.ts  # create_collection tool
│       └── health-check.ts       # health_check tool
├── skills.config.json            # Skills configuration
└── skilldex.config.json          # Skilldex configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm or npm
- Modal account (for deployment)
- Voyage AI API key
- Zilliz Cloud credentials

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
export SKILL_SERVICE_API_KEY="your-api-key"
export VOYAGE_API_KEY="your-voyage-key"
export ZILLIZ_ENDPOINT="your-zilliz-endpoint"
export ZILLIZ_TOKEN="your-zilliz-token"
```

### Development

```bash
# Start development server
npm run dev

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build

# Start production server
npm run start
```

## MCP Tools

### Core Tools (4 tools)

1. **search_skills** - Search skills using semantic search with AI reranking
   ```json
   {
     "query": "build HTML UI with React",
     "top_k": 5,
     "filter_expr": "plugin_domain == 'development'"
   }
   ```

2. **index_skill** - Index a new skill into the embedding database
   ```json
   {
     "skill_id": "my-skill",
     "skill_name": "My Skill",
     "description": "Skill description...",
     "capabilities": ["mcp", "api"],
     "plugin_domain": "development",
     "version": "1.0.0"
   }
   ```

3. **create_collection** - Create Zilliz vector database collection
   ```json
   {
     "drop_if_exists": false
   }
   ```

4. **health_check** - Check service health status
   ```json
   {}
   ```

### Catalog Tools (5 tools)

5. **list_skills** - List all available skills with filtering
   ```json
   {
     "category": "development",
     "bundle": "core-dev",
     "limit": 50
   }
   ```

6. **search_skills** (Catalog) - Search skills by keyword with scoring
   ```json
   {
     "query": "react component",
     "category": "ui",
     "limit": 10
   }
   ```

7. **get_skill** - Get detailed skill information by ID or alias
   ```json
   {
     "id": "mcp-builder"
   }
   ```

8. **list_bundles** - List all bundles and their included skills
   ```json
   {}
   ```

9. **update_catalog_config** - Update catalog configuration at runtime
   ```json
   {
     "target": "category",
     "name": "development",
     "action": "add",
     "keywords": ["typescript", "javascript"]
   }
   ```

### Usage Example

```typescript
// Connect via MCP host
const result = await mcpClient.callTool("search_skills", {
  query: "build HTML UI with React",
  top_k: 5
});

// List skills
const skills = await mcpClient.callTool("list_skills", {
  category: "development",
  limit: 20
});

// Get skill details
const skill = await mcpClient.callTool("get_skill", {
  id: "mcp-builder"
});
```

## API Endpoints

### POST /api
MCP protocol endpoint for tool calls.

### GET /mcp
MCP resource endpoint for widget UI.

## Configuration

### skilldex.config.json

```json
{
  "version": "1.0.0",
  "indexing": {
    "maxTriggers": 12,
    "minTokenLength": 2,
    "aliasMinLength": 28,
    "aliasMinTokens": 4
  },
  "stopwords": {
    "tokens": ["the", "a", "an", "is", "are"]
  },
  "tagStopwords": {
    "tokens": ["skill", "tool", "function"]
  },
  "categories": {
    "rules": [
      {
        "name": "development",
        "keywords": ["code", "build", "test"]
      }
    ],
    "fallback": "general"
  },
  "bundles": {
    "groups": {
      "core": {
        "description": "Core skills",
        "keywords": ["core", "essential"]
      }
    }
  },
  "curatedCommon": {
    "skills": []
  }
}
```

## Testing

### Unit Tests
```bash
npm run test:run
# 6 tests covering UI components
```

### E2E Tests
```bash
npm run test:e2e
# 30+ tests covering UI/UX, accessibility, responsiveness
```

## Deployment

Deploy to Modal:

```bash
modal deploy app.py
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request
