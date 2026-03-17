#!/bin/bash

# Exit on error
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Creating Vite + Tauri Desktop App${NC}"
echo -e "${BLUE}   with React + Tailwind + shadcn/ui${NC}"

# Check if project name is provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Usage: ./create-tauri-app.sh <project-name>${NC}"
  exit 1
fi

PROJECT_NAME="$1"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  SED_INPLACE="sed -i ''"
  OS_TYPE="macos"
else
  SED_INPLACE="sed -i"
  OS_TYPE="linux"
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}📦 pnpm not found. Installing pnpm...${NC}"
  npm install -g pnpm
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
  echo -e "${RED}❌ Rust is required for Tauri${NC}"
  echo -e "${YELLOW}   Install from: https://rustup.rs/${NC}"
  exit 1
fi

echo -e "${GREEN}🔨 Creating Vite + React project...${NC}"
pnpm create vite "$PROJECT_NAME" --template react-ts

cd "$PROJECT_NAME"

echo -e "${GREEN}📦 Installing Tauri CLI...${NC}"
pnpm add -D @tauri-apps/cli@latest

echo -e "${GREEN}🔧 Initializing Tauri project...${NC}"
pnpm tauri init -A -f -W

echo -e "${GREEN}📦 Installing dependencies...${NC}"
pnpm install

echo -e "${GREEN}📦 Installing Tailwind CSS...${NC}"
pnpm install -D \
  tailwindcss@3.4.1 \
  postcss \
  autoprefixer \
  tailwindcss-animate

echo -e "${GREEN}📦 Installing shadcn/ui dependencies...${NC}"
pnpm install \
  class-variance-authority \
  clsx \
  tailwind-merge \
  lucide-react \
  next-themes \
  @radix-ui/react-accordion \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-label \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-popover \
  @radix-ui/react-progress \
  @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-slot \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-toast \
  @radix-ui/react-toggle \
  @radix-ui/react-toggle-group \
  @radix-ui/react-tooltip \
  sonner \
  cmdk \
  vaul \
  embla-carousel-react \
  react-day-picker \
  react-resizable-panels \
  date-fns \
  react-hook-form \
  @hookform/resolvers \
  zod

echo -e "${GREEN}⚙️  Creating PostCSS config...${NC}"
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

echo -e "${GREEN}⚙️  Creating Tailwind config...${NC}"
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
EOF

echo -e "${GREEN}🎨 Creating src/index.css...${NC}"
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
EOF

echo -e "${GREEN}🔧 Updating vite.config.ts...${NC}"
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
EOF

echo -e "${GREEN}🔧 Updating tsconfig.json...${NC}"
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
config.compilerOptions = config.compilerOptions || {};
config.compilerOptions.baseUrl = '.';
config.compilerOptions.paths = { '@/*': ['./src/*'] };
fs.writeFileSync('tsconfig.json', JSON.stringify(config, null, 2));
"

echo -e "${GREEN}📝 Creating components.json...${NC}"
cat > components.json << 'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
EOF

echo -e "${GREEN}📁 Creating directory structure...${NC}"
mkdir -p src/{components,lib,hooks,utils}
mkdir -p src/components/ui

echo -e "${GREEN}📝 Creating lib/utils.ts...${NC}"
cat > src/lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF

echo -e "${GREEN}✅ Tauri Desktop App setup complete!${NC}"
echo ""
echo -e "${YELLOW}📦 To get started:${NC}"
echo "  cd $PROJECT_NAME"
echo "  pnpm tauri dev"
echo ""
echo -e "${YELLOW}📦 To add shadcn/ui components:${NC}"
echo "  pnpm dlx shadcn-ui@latest add button"
echo "  pnpm dlx shadcn-ui@latest add card"
echo "  pnpm dlx shadcn-ui@latest add dialog"
echo ""
echo -e "${YELLOW}📦 To build for production:${NC}"
echo "  pnpm tauri build"
echo ""
echo -e "${GREEN}✨ Tech Stack:${NC}"
echo "  ✅ Tauri (Desktop framework)"
echo "  ✅ Vite (Build tool)"
echo "  ✅ React 19"
echo "  ✅ TypeScript"
echo "  ✅ Tailwind CSS"
echo "  ✅ shadcn/ui (40+ components)"
echo "  ✅ Dark mode support"
echo "  ✅ Path aliases (@/)"
echo ""
echo -e "${BLUE}📚 Tauri Documentation:${NC}"
echo "  https://tauri.app/v1/guides/getting-started/setup"
EOF
