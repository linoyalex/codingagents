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
    ▼ Phase 1 — SPECIFY         [product-owner + ux-designer]   model: haiku   (authoring)
    │  Reads: feature request only
    │  Writes: docs/features/<feature>/prd.md
    │
    ▼ Phase 2 — ARCHITECT       [architect]                      model: opus    (authoring)
    │  Reads: docs/features/<feature>/prd.md + CLAUDE.md (arch section only)
    │  Writes: docs/features/<feature>/architecture.md
    │
    ▼ Phase 3 — TEST DESIGN     [qa]                             model: sonnet  (authoring)
    │  Reads: docs/features/<feature>/prd.md + architecture.md only (NOT src/)
    │  Writes: tests/contracts/ + tests/e2e/ (failing shells)
    │
    ▼ Phase 4 — SECURITY GATE   [security-reviewer]              model: opus    (gate/review)
    │  Reads: docs/features/<feature>/prd.md + architecture.md only (NOT src/)
    │  Writes: docs/features/<feature>/security-audit.md
    │
    ▼ Phase 5 — IMPLEMENT       [developer]                      model: sonnet  (authoring)
    │  Reads: docs/features/<feature>/architecture.md + failing test files only
    │  Writes: src/ (TDD: RED commit → GREEN commit → REFACTOR commit)
    │
    ▼ Phase 6 — REVIEW          [code-reviewer] FRESH SESSION    model: sonnet  (gate/review)
    │  Reads: git diff only
    │  Writes: docs/features/<feature>/review.md
    │
    ▼ Phase 7 — DOCUMENT        [documentation-specialist]       model: haiku
       Reads: docs/features/<feature>/prd.md + CHANGELOG.md + CLAUDE.md + latest release-notes/
       Writes: CHANGELOG.md update + release-notes/ entry + CLAUDE.md conventions update
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
- **Artifact timestamps** — every pipeline-generated feature artifact must include a `**Generated:** <ISO 8601>` line immediately after the document's top-level heading. On regeneration, always replace the prior timestamp with the current time. See commands and skill templates for placement details.
- **Skill size budget** — inline skills: ~150 lines instructional prose (templates/tables/examples excluded), 250 total lines triggers split. Progressive disclosure skills: SKILL.md ≤120 prose lines with sibling reference files at `skills/<name>/<reference>.md`. Link format: `[See reference: .claude/skills/<name>/<reference>.md]`. Worked example: `verification-gate` (per-phase reference files). Stop conditions footer rule: pipeline-gating skills (verification-gate, security-audit, tdd, code-review) must end with `**STOP CONDITIONS (end of file):**` — reviewer may skim; footer prevents missing hard constraints.
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

## Phase Handoff Protocol

Every agent must write `.claude/handoff.json` at the end of its phase. This is the canonical
contract between pipeline phases — the next agent reads it at session start.

### Required fields
- `feature` — feature name or ID
- `phase` — pipeline phase number (1-7)
- `goal` — what the next phase should accomplish (one sentence)
- `scope` — what is in scope for the next phase
- `relevant_files` — file paths the next agent should read first
- `acceptance_criteria` — AC IDs the next phase must satisfy
- `verification_commands` — commands to verify the next phase's output
- `source_spec` — resolvable pointer to the originating spec (PRD path, ticket path, or GitHub issue URL). For bugfix handoffs, precedence: ticket file (`docs/issues/tickets/ISS-NNN.md`) > GitHub issue URL > other declared source.

### Optional fields
- `constraints` — hard constraints the next phase must respect
- `known_risks` — open questions or risks for the next phase
- `produced_by` — agent role that produced this handoff
- `timestamp` — ISO 8601 timestamp

The schema is defined in `schemas/handoff.schema.json`. The `checkpoint.js` Stop hook
validates handoff presence; `restore-context.js` loads it as primary context at session start.

---

## Memory & Instruction Governance

### What belongs where

| Content type | Location | Loaded | Max size |
|---|---|---|---|
| Project conventions, agent routing, absolute constraints | `CLAUDE.md` | Always (every session) | ~250 lines |
| Reusable procedures (TDD, code review, security audit) | `skills/*.md` | On demand (by commands) | ~150 lines each |
| Phase-specific context for the next agent | `.claude/handoff.json` | At session start (by hook) | ~50 lines |
| Per-feature briefs and acceptance criteria | `docs/features/<feature>/prd.md`, `docs/features/<feature>/architecture.md` | By phase spec | No hard limit |
| Agent memory (patterns, decisions, tech radar) | `.claude/agent-memory/` | By agent on demand | ~150 lines each |
| Cross-agent memory (settled decisions, codebase map, process) | `docs/memory/` | At session start (via bootstrap) | ~50 lines each |

### Rules
- Do not duplicate information across locations. If it's in a skill, don't repeat it in CLAUDE.md.
- CLAUDE.md must stay under ~250 lines. If it grows beyond this, extract content to skills or handoff packets.
- Skills are loaded on demand by commands, not always-loaded. Do not paste skill content into CLAUDE.md.
- Handoff packets are ephemeral — overwritten each phase. Do not store permanent knowledge in them.
- Review memory files quarterly. Remove entries that are no longer relevant or that duplicate what's in code.

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
