# Codebase Map

## Hooks (source of truth — copied to target projects via init.sh)

- `hooks/checkpoint.js` — Stop hook. Contains `PHASE_MAP`, `validateHandoff()`, `resolveAgentAndModel()`, `logTokenUsage()`, `detectPhase()`. The most complex file in the system.
- `hooks/restore-context.js` — SessionStart hook. Contains `NEXT_AGENT_MAP`, `restoreFromHandoff()`, `recordSessionStart()`.
- `hooks/archive-context.js` — PreCompact hook. Contains `logTokenSnapshot()`, turn scoring logic.
- `hooks/settings.json` — Hook configuration (maps lifecycle events to scripts).

## Schema

- `schemas/handoff.schema.json` — JSON schema for `.claude/handoff.json`. Required fields, types, ranges defined here.

## Roles

8 files at root (`ROLE_*.md`). Frontmatter has `tools`, `disallowedTools`, `model`. Each has a Phase Handoff section at the end.

## Skills

`skills/*/SKILL.md`. `verification-gate` is the most relevant for vNext — contains handoff validation commands and no-go criteria.

## Deployment

`init.sh`, `upgrade.sh`, `migrations/v4.1-to-v5.sh`, `.gitignore-template`.

## Codex layer

`codex/reviewers/*.md`, `codex/templates/*`, `codex/log-usage.sh`, `codex/report-usage.sh`.

## Documentation

- `CLAUDE.md` — root template (copied to target projects by `init.sh`). Contains pipeline routing, conventions, handoff protocol, memory governance.
- `docs/CLAUDE.md` — framework development instructions (NOT copied to target projects). Contains cross-agent session context, file ownership, working model.
- `README.md`, `PIPELINE.md`, `QUICKSTART.md` — general documentation.

## Design docs and shared memory

- `docs/design/v5-implementation-record.md` — what shipped in v5
- `docs/design/vnext-recommendations.md` — what's left for vNext
- `docs/memory/` — shared cross-agent memory (this directory)
