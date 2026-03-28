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

**This project uses a phase-gated pipeline. Invoke agents in order, not ad-hoc.**
Each phase reads only the output of the previous phase — never the full codebase.

### Pipeline Sequence

```
Feature request
    │
    ▼ Phase 1 — SPECIFY         [product-owner + ux-designer]   model: haiku
    │  Reads: feature request only
    │  Writes: docs/prd.md
    │
    ▼ Phase 2 — ARCHITECT       [architect]                      model: opus
    │  Reads: docs/prd.md + CLAUDE.md (arch section only)
    │  Writes: docs/architecture/ARCH-[feature].md
    │
    ▼ Phase 3 — TEST DESIGN     [qa]                             model: sonnet
    │  Reads: docs/prd.md + ARCH-[feature].md only (NOT src/)
    │  Writes: tests/contracts/ + tests/e2e/ (failing shells)
    │
    ▼ Phase 4 — SECURITY GATE   [security-reviewer]              model: opus
    │  Reads: docs/prd.md + ARCH-[feature].md only (NOT src/)
    │  Writes: docs/security-audit-[feature].md
    │
    ▼ Phase 5 — IMPLEMENT       [developer]                      model: sonnet
    │  Reads: ARCH-[feature].md + failing test files only
    │  Writes: src/ (TDD: RED commit → GREEN commit → REFACTOR commit)
    │
    ▼ Phase 6 — REVIEW          [code-reviewer] FRESH SESSION    model: sonnet
    │  Reads: git diff only
    │  Writes: docs/review-[branch].md
    │
    ▼ Phase 7 — DOCUMENT        [documentation-specialist]       model: haiku
       Reads: docs/prd.md + CHANGELOG.md + CLAUDE.md
       Writes: CHANGELOG.md update + CLAUDE.md conventions update
```

### Ad-hoc routing (outside the pipeline)

| Task | Agent | Model |
|------|-------|-------|
| Bug fix (no spec needed) | `developer` | sonnet |
| Security incident / auth change | `security-reviewer` | opus |
| New dependency approval | `architect` | opus |
| Accessibility audit | `ux-designer` | sonnet |
| CLAUDE.md update | `documentation-specialist` | haiku |
| PR review (always fresh context) | `code-reviewer` | sonnet |

### CI/CD (automated, no interactive session)
```bash
# Pre-commit: deterministic, no LLM
pnpm lint && pnpm typecheck && pnpm test

# On PR: lightweight Haiku scan for secrets in diff only
claude -p "Scan for hardcoded secrets: $(git diff main...HEAD)" \
  --model claude-haiku-4-5 --allowedTools "Bash(git diff *)"

# Dependency audit: no LLM
npm audit --audit-level=high
```

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

## Context & Token Management

### Session rules (all agents must follow)
- **Start fresh** for each pipeline phase — never carry a prior phase's session forward
- **60% context = compact now** — run `/compact` before auto-compaction fires; don't wait
- **10 file limit** — never open more than 10 files in a single session; if you need more, you're doing too much at once
- **Read only what the phase spec says** — the pipeline section above defines exactly what each agent reads; no agent should expand that scope

### Preventing context loss across compaction

Install the Ruflo hooks to archive conversation turns before compaction and restore
importance-ranked context at session start:

```bash
npx ruflo@latest init
# Then keep only .claude/settings.json hooks config — skip the rest of Ruflo
```

The hooks to keep in `.claude/settings.json`:
```json
{
  "hooks": {
    "PreCompact": [{
      "matcher": "",
      "hooks": [{"type": "command", "command": "node .claude/helpers/archive-context.js"}]
    }],
    "SessionStart": [{
      "matcher": "",
      "hooks": [{"type": "command", "command": "node .claude/helpers/restore-context.js"}]
    }]
  }
}
```

### Token budget per feature cycle (target)
| Phase | Model | Target tokens |
|-------|-------|--------------|
| 1 Specify | Haiku | ~3K |
| 2 Architect | Opus | ~8K |
| 3 Test Design | Sonnet | ~10K |
| 4 Security Gate | Opus | ~6K |
| 5 Implement | Sonnet | ~25K |
| 6 Review | Sonnet | ~8K |
| 7 Document | Haiku | ~3K |
| **Total** | | **~63K** |

Compare to an unstructured single-session approach: 200K–400K tokens, Opus throughout.

---

The following agents maintain persistent memory across sessions for this project.
Their memory files are committed to version control:

- `architect` → `.claude/agent-memory/architect/MEMORY.md`
- `documentation-specialist` → `.claude/agent-memory/documentation-specialist/MEMORY.md`

Do not manually edit these files. They are maintained by the agents themselves.

---

*Last updated: <!-- DATE -->*
*Updated by: <!-- documentation-specialist agent or human -->`*
