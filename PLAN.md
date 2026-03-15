# Skill Service Source Code Restructuring Plan

## Current Issues Identified
1. Duplicate MCP server implementations (src/app/mcp/server.ts and src/app/mcp/route.ts)
2. Large catalog file (src/app/mcp/catalog/catalog.ts at 21k lines)
3. Scattered MCP-related code across multiple directories
4. Inconsistent organization of MCP components

## Proposed Directory Structure
```
src/
├── components/              # UI components (unchanged)
│   └── ui/                  # shadcn/ui components
├── lib/                     # Utility functions
│   └── utils.ts
├── app/                     # Next.js app router
│   ├── page.tsx             # Main skill service widget
│   ├── page.test.tsx        # Tests
│   └── api/                 # API routes
│       └── route.ts         # MCP server endpoint
├── mcp/                     # MCP-specific code (NEW)
│   ├── server/              # MCP server implementation
│   │   ├── index.ts         # Server initialization
│   │   ├── tools/           # MCP tool definitions
│   │   │   ├── search.ts    # search_skills tool
│   │   │   ├── index.ts     # index_skill tool
│   │   │   ├── create-collection.ts  # create_collection tool
│   │   │   └── health-check.ts       # health_check tool
│   │   └── types.ts         # Shared TypeScript types
│   ├── catalog/             # Skill catalog functionality
│   │   ├── builder.ts       # Catalog building logic
│   │   ├── handler.ts       # MCP tool handler
│   │   ├── config/          # Configuration schemas
│   │   │   ├── index.ts     # Config loading/validation
│   │   │   └── skills.config.json  # Skill configuration
│   │   └── index.ts         # Public catalog API
│   └── types.ts             # Shared MCP types
├── cli/                     # CLI interface
│   └── index.ts             # MCP CLI (unchanged)
├── e2e/                     # End-to-end tests
│   └── ui-ux.spec.ts
└── test/                    # Test setup
    └── setup.ts
```

## Implementation Steps

### Phase 1: Create New MCP Structure
1. Create src/mcp/ directory and subdirectories
2. Move and refactor MCP server code from src/app/mcp/ to src/mcp/server/
3. Split catalog functionality into smaller, focused files
4. Update import paths throughout the codebase

### Phase 2: Consolidate Duplicate Code
1. Remove duplicate server.ts files
2. Ensure single source of truth for MCP server configuration
3. Standardize tool registration and handling

### Phase 3: Optimize Large Files
1. Split catalog.ts into multiple focused modules
2. Create barrel exports for cleaner imports
3. Extract configuration handling into separate files

### Phase 4: Update References
1. Update all import paths to reflect new structure
2. Update Next.js app to use new MCP server location
3. Update CLI if needed to use new structure

### Phase 5: Verify and Test
1. Ensure all existing functionality works
2. Run tests to verify no regressions
3. Check that MCP tools are properly registered and accessible

## Benefits of This Structure
- Clear separation of concerns
- Reduced file sizes (no file > 5k lines)
- Eliminates code duplication
- Standardized import patterns
- Easier maintenance and extension
- Better organization of MCP-specific code

## Files to Create/Modify
- src/mcp/server/index.ts (MCP server initialization)
- src/mcp/server/tools/*.ts (Individual MCP tools)
- src/mcp/catalog/builder.ts (Catalog building logic)
- src/mcp/catalog/handler.ts (MCP tool handler for catalog)
- src/mcp/catalog/config/index.ts (Configuration handling)
- Updated imports in src/app/page.tsx and src/app/api/route.ts