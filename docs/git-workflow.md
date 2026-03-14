# Git Workflow

## Overview
Best practices for using Git in this project.

## Rules

### Branching Strategy
- Create feature branches from main: feature/description
- Make frequent, small commits with descriptive messages
- Use conventional commits format (feat:, fix:, docs:, etc.)
- Squash commits before merging to main
- Create pull requests for all changes
- Require at least one approval before merging
- Delete feature branches after merging
- Rebase feature branches onto main regularly
- Use git stash for temporary changes
- Tag releases with semantic versioning (v1.0.0)
- Write detailed release notes for each version

### Commit Messages
- Use conventional commits format
- Start with a verb in past tense (added, fixed, updated, etc.)
- Keep subject line under 50 characters
- Provide detailed explanation in body when needed
- Reference issues/PRs when applicable: Fixes #123