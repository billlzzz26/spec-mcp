#!/bin/bash
# setup.sh - Setup script for Skill Embedding Service

set -e

echo "🔧 Setting up Skill Embedding Service..."

# Check Python version
echo "Checking Python version..."
python3 --version

# Create virtual environment if not exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Install Modal
pip install modal

# Login to Modal
echo ""
echo "🔑 Modal login required..."
modal token new

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env template..."
    cat > .env << EOF
# Voyage AI - Get from https://dash.voyageai.com
VOYAGE_API_KEY=pa-xxxxxxxxxxxxxxxxxxxxxxxx

# Zilliz Cloud - Get from https://cloud.zilliz.com
ZILLIZ_URI=https://in03-xxxx.serverless.aws-eu-central-1.cloud.zilliz.com
ZILLIZ_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
ZILLIZ_COLLECTION=skill_embeddings
EMBEDDING_DIM=1024

# API Key for MCP (optional)
SKILL_SERVICE_API_KEY=bl-1nk-xxxxxxxxxxxxxxxxxxxxxxxx
SKILL_SERVICE_WORKSPACE=billlzzz10
EOF
    echo "⚠️  Please update .env with your actual credentials"
fi

# Setup MCP server
if [ -d "mcp-server" ] && [ -f "mcp-server/package.json" ]; then
    echo ""
    echo "📦 Setting up MCP server..."
    cd mcp-server
    npm install
    npm run build
    cd ..
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your credentials"
echo "2. Create secrets in Modal Dashboard:"
echo "   - voyage-secret (VOYAGE_API_KEY)"
echo "   - zilliz-secret (ZILLIZ_URI, ZILLIZ_TOKEN, ZILLIZ_COLLECTION, EMBEDDING_DIM)"
echo "3. Deploy: modal deploy app.py"
echo "4. Create collection: curl -X POST <collection-url> -H 'Content-Type: application/json' -d '{\"drop_if_exists\": false}'"
