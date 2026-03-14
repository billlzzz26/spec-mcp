# Project Setup

## Overview
Instructions for setting up and configuring the development environment.

## Rules

### Package Management
- Uses pnpm as package manager (not npm or yarn)
- Install dependencies: pnpm install
- Update dependencies: pnpm update
- Remove dependencies: pnpm remove <package>
- List outdated dependencies: pnpm outdated

### Development Commands
- Start development server: pnpm dev
- Run tests: pnpm test
- Build for production: pnpm build
- Type checking: pnpm typecheck
- Lint code: pnpm lint
- Format code: pnpm format
- Deploy to Modal: modal deploy app.py
- Run local tests: python skill_index_client.py test

### Environment Configuration
- Copy .env.example to .env for local development
- Never commit .env file to repository
- Use environment-specific configuration files
- Validate environment variables on startup