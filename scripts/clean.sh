#!/bin/bash
# clean.sh - Clean build artifacts and cache

set -e

echo "🧹 Cleaning up..."

# Python cache
echo "Removing Python cache..."
rm -rf __pycache__/
rm -rf .pytest_cache/
rm -rf *.pyc
rm -rf .mypy_cache/

# Node modules (MCP server)
if [ -d "mcp-server/node_modules" ]; then
    echo "Removing mcp-server/node_modules..."
    rm -rf mcp-server/node_modules/
fi

# Build artifacts (MCP server)
if [ -d "mcp-server/build" ]; then
    echo "Removing mcp-server/build..."
    rm -rf mcp-server/build/
fi

# Modal cache
echo "Removing Modal cache..."
rm -rf .modal/

echo "✅ Clean complete!"
echo ""
echo "To reinstall: ./setup.sh"
