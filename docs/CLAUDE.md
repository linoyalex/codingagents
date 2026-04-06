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

## Code Conventions

### Must Follow
- Shell scripts use `set -euo pipefail`
- Skills stay under ~100 lines
- Commands include YAML frontmatter (`description`, `user-invocable: true`)
- Roles include version number, pipeline phase, model spec, allowed/disallowed tools, and DoD
- All JSON schemas use draft-07 with `additionalProperties: false`
- Hook scripts must exit non-zero to block (checkpoint.js) or zero to proceed silently
- No hardcoded absolute paths in any framework file — use relative paths from project root

### Naming
- Roles: `ROLE_UPPER_SNAKE.md` (e.g. `ROLE_CODE_REVIEWER.md`)
- Skills: `skills/kebab-case/SKILL.md` (e.g. `skills/security-audit/SKILL.md`)
- Commands: `commands/kebab-case.md` (e.g. `commands/security-gate.md`)
- Feature artifacts: `docs/features/kebab-case/` (e.g. `docs/features/invariants-audit/`)
- Test fixtures: `tests/fixtures/kebab-case/` matching the component they test

### Folder Structure
```
ROLE_*.md             # Source role definitions (copied to .claude/agents/ by init.sh)
commands/             # Source command files (copied to .claude/commands/ by init.sh)
skills/               # Source skill files (copied to .claude/skills/ by init.sh)
hooks/                # Source hook scripts (copied to .claude/helpers/ by init.sh)
schemas/              # Source schemas (copied to .claude/schemas/ by init.sh)
docs/
├── design/           # Design proposals and implementation records
├── features/         # Per-feature pipeline artifacts (prd, architecture, review, etc.)
├── issues/           # Backlog management (see skills/backlog-management/SKILL.md)
│   ├── backlog.md    # Open ticket index
│   ├── in-progress.md
│   ├── closed.md
│   └── tickets/      # Full ticket details
└── memory/           # Cross-agent shared context
tests/
├── node/             # Node.js test files (run with node --test)
├── fixtures/         # Test fixture data
├── test-install-scripts.sh
└── test-command-contracts.sh
```

---

## Architecture Notes

### Core abstraction: WHO / WHAT / HOW

| Layer | Files | Purpose |
|-------|-------|---------|
| **WHO** (Roles) | `ROLE_*.md` | Identity, constraints, model tier, allowed tools |
| **WHAT** (Commands) | `commands/*.md` | Phase trigger, what to read, what to produce, verification |
| **HOW** (Skills) | `skills/*/SKILL.md` | Reusable procedures, templates, checklists |

Roles are slim (~100 lines). Skills are loaded on demand by commands. Commands orchestrate a phase.

### Phase contract: handoff.json

`handoff.json` is the machine-readable contract between pipeline phases. Each phase writes it; the next phase reads it. Schema: `schemas/handoff.schema.json`. Validated by `checkpoint.js` (Stop hook) as a blocking gate.

### Hooks lifecycle

| Hook | Event | Purpose |
|------|-------|---------|
| `checkpoint.js` | Stop | Validates handoff.json, logs tokens, detects phase, writes pipeline-checkpoint.json |
| `restore-context.js` | SessionStart | Loads handoff.json as primary context for fresh sessions |
| `archive-context.js` | PreCompact | Archives conversation turns before context compaction |

### ADR Index
- [Dogfood proposal](design/dogfood-proposal.md) — using codingagents to develop codingagents

---

## Known Gotchas

- `checkpoint.js` detects pipeline phase from file existence (`docs/features/<feature>/prd.md` → Phase 1 complete). Pre-existing files in `docs/` outside `features/` do not interfere.
- Commands reference installed skill paths (`.claude/skills/...`), not source paths (`skills/...`). The installed copies must exist for slash commands to work.
- `docs/CLAUDE.md` is auto-loaded by Claude Code alongside root `CLAUDE.md`. This file contains framework-specific instructions; root `CLAUDE.md` is the consumer template.
- Root `CLAUDE.md` has placeholder comments (`<!-- e.g. ... -->`) that must stay as guidance for target projects. Do not fill them in with codingagents-specific content.
- `settings.json` (hooks) and `settings.local.json` (permissions) are merged by Claude Code. Installing hooks via `init.sh` does not overwrite permissions.
- The backlog system uses index files + individual ticket files. Status changes cost ~2 lines across 2 index files. See `skills/backlog-management/SKILL.md`.

---

## When modifying the template CLAUDE.md

The root `CLAUDE.md` is a template that `init.sh` copies to target projects. When editing it:

- Do not add codingagents-repo-specific content (that belongs in this file).
- Keep it under ~250 lines.
- All placeholder sections (`<!-- FILL IN -->`) should remain as guidance for target project users.
- Test changes by verifying they make sense in a fresh target project context, not just in this repo.
