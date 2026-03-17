#!/bin/bash

# Exit on error
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Creating Open WebUI + Docker Setup${NC}"
echo -e "${BLUE}   with LLM Integration (Ollama/OpenAI/Anthropic)${NC}"

# Check if project name is provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Usage: ./create-openwebui-setup.sh <project-name>${NC}"
  exit 1
fi

PROJECT_NAME="$1"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker is required for Open WebUI${NC}"
  echo -e "${YELLOW}   Install from: https://docs.docker.com/get-docker/${NC}"
  exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo -e "${RED}❌ Docker Compose is required${NC}"
  echo -e "${YELLOW}   Install from: https://docs.docker.com/compose/install/${NC}"
  exit 1
fi

echo -e "${GREEN}📁 Creating project directory...${NC}"
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

echo -e "${GREEN}📝 Creating docker-compose.yml...${NC}"
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Open WebUI - Main interface
  open-webui:
    image: ghcr.io/open-webui/open-webui:latest
    container_name: open-webui
    ports:
      - "3000:8080"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - GROQ_API_KEY=${GROQ_API_KEY:-}
      - HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY:-}
      - ENABLE_OLLAMA_API=true
      - ENABLE_OPENAI_API=true
      - WEBUI_SECRET_KEY=${WEBUI_SECRET_KEY:-your-secret-key-change-me}
    volumes:
      - open-webui-data:/app/backend/data
      - ./data:/app/backend/data/uploads
    depends_on:
      - ollama
    networks:
      - webui-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Ollama - Local LLM engine
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
    volumes:
      - ollama-data:/root/.ollama
    networks:
      - webui-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL - Optional database for persistence
  postgres:
    image: postgres:16-alpine
    container_name: webui-postgres
    environment:
      - POSTGRES_USER=webui
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-webui-password}
      - POSTGRES_DB=webui
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - webui-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U webui"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis - Cache layer
  redis:
    image: redis:7-alpine
    container_name: webui-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - webui-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  open-webui-data:
  ollama-data:
  postgres-data:
  redis-data:

networks:
  webui-network:
    driver: bridge
EOF

echo -e "${GREEN}📝 Creating .env file...${NC}"
cat > .env << 'EOF'
# Open WebUI Configuration
WEBUI_SECRET_KEY=your-super-secret-key-change-me-in-production

# LLM API Keys (Optional - only if using cloud providers)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
HUGGINGFACE_API_KEY=

# Database Configuration
POSTGRES_PASSWORD=webui-password-change-me

# Ollama Configuration
OLLAMA_HOST=0.0.0.0:11434

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Open WebUI Settings
ENABLE_OLLAMA_API=true
ENABLE_OPENAI_API=true
DEBUG=false
EOF

echo -e "${GREEN}📝 Creating .env.example file...${NC}"
cat > .env.example << 'EOF'
# Open WebUI Configuration
WEBUI_SECRET_KEY=your-super-secret-key-change-me-in-production

# LLM API Keys (Optional - only if using cloud providers)
# Get your API keys from:
# - OpenAI: https://platform.openai.com/api-keys
# - Anthropic: https://console.anthropic.com/
# - Groq: https://console.groq.com/
# - Hugging Face: https://huggingface.co/settings/tokens
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
HUGGINGFACE_API_KEY=

# Database Configuration
POSTGRES_PASSWORD=webui-password-change-me

# Ollama Configuration
OLLAMA_HOST=0.0.0.0:11434

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Open WebUI Settings
ENABLE_OLLAMA_API=true
ENABLE_OPENAI_API=true
DEBUG=false
EOF

echo -e "${GREEN}📝 Creating docker-compose.prod.yml (Production)...${NC}"
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:latest
    container_name: open-webui-prod
    ports:
      - "80:8080"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
      - HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY}
      - ENABLE_OLLAMA_API=true
      - ENABLE_OPENAI_API=true
      - WEBUI_SECRET_KEY=${WEBUI_SECRET_KEY}
      - DATABASE_URL=postgresql://webui:${POSTGRES_PASSWORD}@postgres:5432/webui
    volumes:
      - open-webui-data:/app/backend/data
      - ./data:/app/backend/data/uploads
    depends_on:
      - ollama
      - postgres
      - redis
    networks:
      - webui-network
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  ollama:
    image: ollama/ollama:latest
    container_name: ollama-prod
    ports:
      - "11434:11434"
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
    volumes:
      - ollama-data:/root/.ollama
    networks:
      - webui-network
    restart: always

  postgres:
    image: postgres:16-alpine
    container_name: webui-postgres-prod
    environment:
      - POSTGRES_USER=webui
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=webui
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - webui-network
    restart: always

  redis:
    image: redis:7-alpine
    container_name: webui-redis-prod
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - webui-network
    restart: always

volumes:
  open-webui-data:
  ollama-data:
  postgres-data:
  redis-data:

networks:
  webui-network:
    driver: bridge
EOF

echo -e "${GREEN}📝 Creating Makefile for easy commands...${NC}"
cat > Makefile << 'EOF'
.PHONY: help up down logs ps build pull restart clean

help:
	@echo "📚 Open WebUI Commands:"
	@echo "  make up              - Start all services"
	@echo "  make down            - Stop all services"
	@echo "  make logs            - View logs (all services)"
	@echo "  make logs-webui      - View Open WebUI logs"
	@echo "  make logs-ollama     - View Ollama logs"
	@echo "  make ps              - Show running containers"
	@echo "  make build           - Build/pull images"
	@echo "  make pull            - Pull latest images"
	@echo "  make restart         - Restart all services"
	@echo "  make clean           - Remove containers and volumes"
	@echo "  make prod-up         - Start production setup"
	@echo "  make prod-down       - Stop production setup"
	@echo "  make shell-webui     - Shell into Open WebUI container"
	@echo "  make shell-ollama    - Shell into Ollama container"
	@echo "  make models          - List available Ollama models"
	@echo "  make pull-model      - Pull a model (e.g., make pull-model MODEL=llama2)"

up:
	@echo "🚀 Starting Open WebUI..."
	docker-compose up -d
	@echo "✅ Open WebUI is running at http://localhost:3000"
	@echo "✅ Ollama API is available at http://localhost:11434"

down:
	@echo "🛑 Stopping Open WebUI..."
	docker-compose down

logs:
	docker-compose logs -f

logs-webui:
	docker-compose logs -f open-webui

logs-ollama:
	docker-compose logs -f ollama

ps:
	docker-compose ps

build:
	docker-compose build

pull:
	docker-compose pull

restart:
	docker-compose restart

clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	@echo "✅ Cleanup complete"

prod-up:
	@echo "🚀 Starting Production Open WebUI..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ Production Open WebUI is running"

prod-down:
	@echo "🛑 Stopping Production Open WebUI..."
	docker-compose -f docker-compose.prod.yml down

shell-webui:
	docker-compose exec open-webui /bin/bash

shell-ollama:
	docker-compose exec ollama /bin/bash

models:
	curl http://localhost:11434/api/tags | jq .

pull-model:
	curl http://localhost:11434/api/pull -d '{"name":"$(MODEL)"}'

# Example: make pull-model MODEL=llama2
EOF

echo -e "${GREEN}📝 Creating README.md...${NC}"
cat > README.md << 'EOF'
# 🤖 Open WebUI + Docker Setup

Complete setup for Open WebUI with Ollama, PostgreSQL, and Redis.

## 🎯 Features

- ✅ **Open WebUI** - Beautiful web interface for LLMs
- ✅ **Ollama** - Local LLM engine (llama2, mistral, neural-chat, etc.)
- ✅ **PostgreSQL** - Persistent database
- ✅ **Redis** - Cache layer
- ✅ **Multi-provider support** - OpenAI, Anthropic, Groq, Hugging Face
- ✅ **Docker Compose** - Easy deployment
- ✅ **Production ready** - Separate production config

## 📋 Prerequisites

- Docker (v20.10+)
- Docker Compose (v1.29+)
- 8GB+ RAM (recommended 16GB for local LLMs)
- 50GB+ disk space (for Ollama models)

## 🚀 Quick Start

### 1. Start Services

```bash
# Development
make up

# Or manually
docker-compose up -d
```

### 2. Access Open WebUI

- **URL**: http://localhost:3000
- **Default credentials**: admin / admin (first login)

### 3. Pull a Model

```bash
# Using Makefile
make pull-model MODEL=llama2

# Or manually
curl http://localhost:11434/api/pull -d '{"name":"llama2"}'

# Available models:
# - llama2 (7B, 13B, 70B)
# - mistral (7B)
# - neural-chat (7B)
# - dolphin-mixtral (8x7B)
# - openchat (3.5)
# - starling-lm (7B)
```

### 4. Configure API Keys (Optional)

Edit `.env` file:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Groq
GROQ_API_KEY=gsk_...

# Hugging Face
HUGGINGFACE_API_KEY=hf_...
```

Then restart:

```bash
make restart
```

## 📊 Available Commands

```bash
# View all commands
make help

# Start services
make up

# Stop services
make down

# View logs
make logs
make logs-webui
make logs-ollama

# Check running containers
make ps

# Restart services
make restart

# Clean everything
make clean

# Production
make prod-up
make prod-down
```

## 🔌 API Endpoints

| Service | URL | Port |
|---------|-----|------|
| Open WebUI | http://localhost:3000 | 3000 |
| Ollama API | http://localhost:11434 | 11434 |
| PostgreSQL | localhost | 5432 |
| Redis | localhost | 6379 |

## 📝 Using Ollama API

### List Models

```bash
curl http://localhost:11434/api/tags
```

### Generate Response

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Why is the sky blue?",
  "stream": false
}'
```

### Streaming Response

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Write a poem about AI",
  "stream": true
}'
```

## 🌐 Multi-Provider Setup

### OpenAI

1. Get API key from https://platform.openai.com/api-keys
2. Add to `.env`: `OPENAI_API_KEY=sk-...`
3. Restart: `make restart`
4. In Open WebUI, select OpenAI models

### Anthropic (Claude)

1. Get API key from https://console.anthropic.com/
2. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart: `make restart`
4. In Open WebUI, select Claude models

### Groq

1. Get API key from https://console.groq.com/
2. Add to `.env`: `GROQ_API_KEY=gsk_...`
3. Restart: `make restart`
4. In Open WebUI, select Groq models

## 🐳 Docker Management

```bash
# View container status
docker-compose ps

# View logs
docker-compose logs -f open-webui

# Shell into container
docker-compose exec open-webui /bin/bash

# Check container health
docker-compose ps

# Rebuild images
docker-compose build --no-cache
```

## 💾 Data Persistence

All data is stored in Docker volumes:

- `open-webui-data` - Open WebUI data
- `ollama-data` - Ollama models
- `postgres-data` - PostgreSQL database
- `redis-data` - Redis cache

To backup:

```bash
docker run --rm -v open-webui-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/open-webui-backup.tar.gz -C /data .
```

## 🔒 Security

### Production Checklist

- [ ] Change `WEBUI_SECRET_KEY` in `.env`
- [ ] Change `POSTGRES_PASSWORD` in `.env`
- [ ] Use strong passwords
- [ ] Enable HTTPS (use reverse proxy like Nginx)
- [ ] Restrict API access
- [ ] Use firewall rules
- [ ] Regular backups

### Using Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Out of Memory

```bash
# Increase Docker memory limit
# Edit Docker Desktop settings or docker daemon.json
```

### Ollama Not Responding

```bash
# Check Ollama logs
make logs-ollama

# Restart Ollama
docker-compose restart ollama
```

### Models Not Loading

```bash
# Check available disk space
df -h

# Pull model again
make pull-model MODEL=llama2
```

## 📚 Resources

- **Open WebUI**: https://github.com/open-webui/open-webui
- **Ollama**: https://ollama.ai
- **Docker**: https://docs.docker.com
- **Models**: https://ollama.ai/library

## 📄 License

MIT

## 🤝 Support

For issues and questions:
- GitHub Issues: https://github.com/open-webui/open-webui/issues
- Ollama Issues: https://github.com/ollama/ollama/issues
EOF

echo -e "${GREEN}📝 Creating scripts directory...${NC}"
mkdir -p scripts

echo -e "${GREEN}📝 Creating backup script...${NC}"
cat > scripts/backup.sh << 'EOF'
#!/bin/bash

# Backup Open WebUI data
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

PROJECT_PREFIX="${COMPOSE_PROJECT_NAME:-$(basename "$(pwd)")}"
OPENWEBUI_VOLUME="${PROJECT_PREFIX}_open-webui-data"
OLLAMA_VOLUME="${PROJECT_PREFIX}_ollama-data"

echo "🔄 Backing up Open WebUI data..."
docker run --rm -v "${OPENWEBUI_VOLUME}:/data" -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine tar czf "/backup/open-webui-$TIMESTAMP.tar.gz" -C /data .

echo "🔄 Backing up Ollama models..."
docker run --rm -v "${OLLAMA_VOLUME}:/data" -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine tar czf "/backup/ollama-$TIMESTAMP.tar.gz" -C /data .

echo "🔄 Backing up PostgreSQL..."
docker-compose exec -T postgres pg_dump -U webui webui | gzip > "$BACKUP_DIR/postgres-$TIMESTAMP.sql.gz"

echo "✅ Backup complete: $BACKUP_DIR/"
ls -lh "$BACKUP_DIR/"
EOF

chmod +x scripts/backup.sh

echo -e "${GREEN}📝 Creating restore script...${NC}"
cat > scripts/restore.sh << 'EOF'
#!/bin/bash

if [ -z "$1" ]; then
  echo "❌ Usage: ./restore.sh <backup-file>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "🔄 Restoring from: $BACKUP_FILE"

# Stop services
docker-compose down

# Remove only the Open WebUI volume being restored
docker volume rm open-webui-data

# Restore
docker run --rm -v open-webui-data:/data -v "$(pwd)":/backup \
  alpine tar xzf "/backup/$BACKUP_FILE" -C /data

# Start services
docker-compose up -d

echo "✅ Restore complete"
EOF

chmod +x scripts/restore.sh

echo -e "${GREEN}📝 Creating health check script...${NC}"
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

echo "🔍 Checking Open WebUI health..."

# Check Open WebUI
if curl -s http://localhost:3000/health > /dev/null; then
  echo "✅ Open WebUI: OK"
else
  echo "❌ Open WebUI: FAILED"
fi

# Check Ollama
if curl -s http://localhost:11434/api/tags > /dev/null; then
  echo "✅ Ollama: OK"
else
  echo "❌ Ollama: FAILED"
fi

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U webui > /dev/null 2>&1; then
  echo "✅ PostgreSQL: OK"
else
  echo "❌ PostgreSQL: FAILED"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis: OK"
else
  echo "❌ Redis: FAILED"
fi

# Show container status
echo ""
echo "📊 Container Status:"
docker-compose ps
EOF

chmod +x scripts/health-check.sh

echo -e "${GREEN}✅ Open WebUI setup complete!${NC}"
echo ""
echo -e "${YELLOW}📦 To get started:${NC}"
echo "  cd $PROJECT_NAME"
echo "  make up"
echo ""
echo -e "${YELLOW}📦 Then access:${NC}"
echo "  🌐 Open WebUI: http://localhost:3000"
echo "  🔌 Ollama API: http://localhost:11434"
echo ""
echo -e "${YELLOW}📦 Pull your first model:${NC}"
echo "  make pull-model MODEL=llama2"
echo ""
echo -e "${YELLOW}📦 View logs:${NC}"
echo "  make logs"
echo ""
echo -e "${GREEN}✨ Tech Stack:${NC}"
echo "  ✅ Open WebUI (Latest)"
echo "  ✅ Ollama (Local LLM)"
echo "  ✅ PostgreSQL 16"
echo "  ✅ Redis 7"
echo "  ✅ Docker Compose"
echo "  ✅ Multi-provider support"
echo ""
echo -e "${BLUE}📚 Resources:${NC}"
echo "  https://github.com/open-webui/open-webui"
echo "  https://ollama.ai"
echo "  https://docs.docker.com"
