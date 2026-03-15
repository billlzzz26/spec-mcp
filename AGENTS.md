# Skill Service Agent Instructions

Semantic skill search service using Voyage AI and Zilliz Cloud deployed on Modal Serverless.

## Essential Commands
- **Package Manager:** pnpm (not npm or yarn)
- **Install:** `pnpm install`
- **Dev:** `pnpm dev`
- **Test:** `pnpm test`
- **Build:** `pnpm build`
- **Typecheck:** `pnpm typecheck`
- **Lint:** `pnpm lint`
- **Format:** `pnpm format`
- **Deploy:** `modal deploy app.py`
- **Local Test:** `python skill_index_client.py test`

## Detailed Instructions
For specific guidelines, see:
- [General Guidelines](docs/general-guidelines.md)
- [Code Style](docs/code-style.md)
- [TypeScript Rules](docs/typescript-rules.md)
- [Testing Guidelines](docs/testing-guidelines.md)
- [Git Workflow](docs/git-workflow.md)
- [Project Setup](docs/project-setup.md)
- [API Design](docs/api-design.md)
- [Security Practices](docs/security-practices.md)
- [Performance Optimization](docs/performance-optimization.md)

<!-- skilldex:start (auto-generated, do not edit) -->
[Skills Index]|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any tasks covered by indexed skills.|[add-educational-comments]|root:./.agents/skills/add-educational-comments|desc:'Add educational comments to the file specified, or prompt asking for file to comment if one is not provided.'|[agent-md-refactor]|root:./.claude/skills/agent-md-refactor|desc:Refactor bloated AGENTS.md, CLAUDE.md, or similar agent instruction files to follow progressive disclosure principles. Splits monolithic files into organized, linked documentation.|[artifacts-builder]|root:./.claude/skills/artifacts-builder|desc:>-|[changelog-generator]|root:./.claude/skills/changelog-generator|desc:>-|[create-pull-request]|root:./.claude/skills/create-pull-request|desc:>-|[mcp-builder]|root:./.claude/skills/mcp-builder|desc:>-|reference:{evaluation.md,mcp_best_practices.md,node_mcp_server.md,python_mcp_server.md}|[modal]|root:./.claude/skills/modal|[shadcn]|root:./.agents/skills/shadcn|desc:Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset".|{cli.md,customization.md,mcp.md}|rules:{base-vs-radix.md,composition.md,forms.md,icons.md,styling.md}|[skill-creator]|root:./.claude/skills/skill-creator|desc:>-|[ui-ux-pro-max]|root:./.agents/skills/ui-ux-pro-max|desc:"UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples."|[webhook-automation]|root:./.agents/skills/webhook-automation|desc:Build and manage webhook-based integrations for real-time event processing and API connections
<!-- skilldex:end -->
