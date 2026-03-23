# CLAUDE.md — Project Instructions & Agent Router

> This file is loaded automatically by Claude Code at the start of every session.
> It is the single source of truth for project conventions and agent routing.
> Keep it current. It is more valuable than any other file in this repo.

---

## Project Overview

<!-- FILL IN: 2-3 sentence description of what this project does and who it's for -->
<!-- Example: "An AI-powered closet designer that helps users visualise and organise their wardrobe.
Built with Next.js and the Anthropic API. Primary users are fashion-conscious individuals
who want outfit recommendations from their existing clothing." -->

---

## Tech Stack

<!-- FILL IN your actual values -->
```
Runtime:      Node 22 / Python 3.12
Framework:    Next.js 15 / FastAPI
Database:     PostgreSQL via Prisma / Supabase
Auth:         Clerk / NextAuth / Supabase Auth
Storage:      Vercel Blob / AWS S3
Deployment:   Vercel / AWS / Railway
Package mgr:  pnpm / npm / uv
```

---

## Commands

<!-- FILL IN: These exact commands must work from the project root -->
```bash
# Install dependencies
pnpm install

# Start local dev server
pnpm dev

# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Lint and format
pnpm lint

# Type check
pnpm typecheck

# Build for production
pnpm build
```

---

## Agent Router

When a task matches one of the patterns below, invoke the corresponding subagent.
Use the **explicit invocation** syntax: `Use the [agent-name] subagent to [task]`.

| If the task involves... | Use this agent |
|------------------------|---------------|
| Architecture decisions, new modules, service boundaries, ADRs | `architect` |
| Writing features, bug fixes, refactoring, unit tests | `developer` |
| Security review, auth flows, PII handling, dependency CVEs | `security-reviewer` |
| E2E tests, acceptance verification, edge case analysis | `qa` |
| PR/diff review — **always in a fresh context** | `code-reviewer` |
| User stories, acceptance criteria, backlog, feature scope | `product-owner` |
| UI flows, screen states, accessibility, design system | `ux-designer` |
| README, API docs, runbooks, CHANGELOG, this file | `documentation-specialist` |

### Routing Rules

- **Architect before Developer**: Any feature touching multiple systems → run `architect` first, get ADR committed, then run `developer`.
- **Security on auth/data**: Any code path touching credentials, payments, or PII → run `security-reviewer` before committing.
- **Code Reviewer in fresh context**: Never reuse the same session that wrote the code for review.
- **QA shift left**: Run `qa` against the spec *before* implementation to identify edge cases early.

---

## Code Conventions

<!-- FILL IN: Project-specific patterns all agents must follow -->

### Must Follow
- [ ] <!-- e.g. All API routes must validate input with Zod before touching the database -->
- [ ] <!-- e.g. All async functions must handle the rejection case explicitly -->
- [ ] <!-- e.g. No direct database access from UI components -->
- [ ] <!-- e.g. All new environment variables must be added to .env.example with a description -->

### Naming
- <!-- e.g. React components: PascalCase -->
- <!-- e.g. Utility functions: camelCase -->
- <!-- e.g. Database tables: snake_case -->
- <!-- e.g. API endpoints: kebab-case, versioned /api/v1/... -->

### Folder Structure
```
src/
├── app/          # Next.js app router pages and layouts
├── components/   # Shared UI components
├── lib/          # Business logic and utilities
├── server/       # Server-only code (API, DB)
└── types/        # Shared TypeScript types
```

---

## Absolute Constraints (Agents Must Never Violate)

These are non-negotiable. If a task would require violating one, stop and ask.

- ❌ Never commit secrets, API keys, or credentials to source code
- ❌ Never access the database directly from a UI component or page
- ❌ Never add a new npm/pip dependency without checking if an existing one covers the need
- ❌ Never use `any` in TypeScript without an explicit `// TODO: type this` comment
- ❌ Never remove or skip an existing test to make the suite pass
- ❌ Never deploy to production without the full test suite passing
<!-- Add your project-specific constraints here -->

---

## Known Gotchas

<!-- FILL IN: Things that have tripped up agents (or humans) before -->
- <!-- e.g. The auth callback URL must be updated in Clerk dashboard when changing domains -->
- <!-- e.g. Prisma client must be regenerated after schema changes: `pnpm db:generate` -->
- <!-- e.g. The image upload endpoint has a 4MB limit — validate client-side first -->
- <!-- e.g. Environment variables prefixed with NEXT_PUBLIC_ are exposed to the browser -->

---

## Architecture Notes

<!-- FILL IN: Key decisions that all agents should be aware of -->

### Data Flow
<!-- e.g. Diagram or description of how data moves through the system -->

### ADR Index
<!-- Link to your Architecture Decision Records -->
- [ADR-001: ...](docs/decisions/ADR-001.md)

### Patterns in Use
<!-- e.g. Repository pattern for all DB access via src/server/repositories/ -->
<!-- e.g. Service layer between routes and repositories -->

---

## Agent Memory

The following agents maintain persistent memory across sessions for this project.
Their memory files are committed to version control:

- `architect` → `.claude/agent-memory/architect/MEMORY.md`
- `documentation-specialist` → `.claude/agent-memory/documentation-specialist/MEMORY.md`

Do not manually edit these files. They are maintained by the agents themselves.

---

*Last updated: <!-- DATE -->*
*Updated by: <!-- documentation-specialist agent or human -->`*
