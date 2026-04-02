# codingagents Framework Development

> This file is auto-loaded by Claude Code alongside the root CLAUDE.md.
> It contains instructions specific to developing the codingagents framework itself.
> It is NOT copied to target projects by init.sh — only the root CLAUDE.md is.

---

## What this repo is

This is the **source repo** for the codingagents framework — the template that gets copied into target projects. When working here, you are modifying the framework itself, not using it on a project.

Key distinction:
- **Root `CLAUDE.md`** = the template that target projects receive via `init.sh`
- **This file (`docs/CLAUDE.md`)** = instructions for developing the framework

---

## Cross-Agent Session Context

Shared memory and design docs that both Claude and Codex sessions should read when working on this repo:

- **Start here:** `docs/memory/session-bootstrap.md` — read-order guide for fresh sessions
- **Settled decisions:** `docs/memory/v5-decisions.md` — do not re-debate these
- **Codebase map:** `docs/memory/codebase-map.md` — key files and where things live
- **Design docs:** `docs/design/v5-implementation-record.md` (what shipped in v5), `docs/design/vnext-recommendations.md` (what's left)

For Codex sessions specifically, also read `docs/memory/codex-rules.md`.

---

## Working model

- Claude and Codex work as complementary agents on this repo.
- Claude builds implementation (hooks, schemas, roles, deployment scripts).
- Codex reviews Claude's work and builds the Codex-specific layer (reviewers, templates, scripts).
- See `docs/memory/review-process.md` for how iterative review works.

---

## File ownership boundaries

| Owner | Files |
|---|---|
| Claude | `hooks/`, `schemas/`, `ROLE_*.md`, `skills/`, `init.sh`, `upgrade.sh`, `migrations/`, root `CLAUDE.md`, `PIPELINE.md`, `HOW_TO_USE.md` |
| Codex | `codex/reviewers/`, `codex/templates/`, `codex/log-usage.sh`, `codex/report-usage.sh`, `codex/README.md` |
| Shared | `docs/design/`, `docs/memory/`, `README.md`, `codex/fresh-context-playbook.md` |

---

## Agent memory

### Per-agent memory (pipeline agents in target projects)
- `architect` → `.claude/agent-memory/architect/MEMORY.md`
- `documentation-specialist` → `.claude/agent-memory/documentation-specialist/MEMORY.md`
- Do not manually edit these. They are maintained by the agents themselves.

### Cross-agent memory (this repo)
- `docs/memory/` — shared context for framework development sessions
- These files are committed to version control and available to both Claude and Codex.
- See `docs/memory/session-bootstrap.md` for the recommended read order.

---

## When modifying the template CLAUDE.md

The root `CLAUDE.md` is a template that `init.sh` copies to target projects. When editing it:

- Do not add codingagents-repo-specific content (that belongs in this file).
- Keep it under ~250 lines.
- All placeholder sections (`<!-- FILL IN -->`) should remain as guidance for target project users.
- Test changes by verifying they make sense in a fresh target project context, not just in this repo.
