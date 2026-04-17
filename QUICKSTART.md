# Quick Start Guide

> **Current as of:** v5.11.0 (2026-04-16)

This is the operator guide for adopting `codingagents` in a project and running the pipeline safely. Use:

- [README.md](README.md) for the overview and current feature set
- [PIPELINE_GUIDE.md](PIPELINE_GUIDE.md) for the full phase contract and behavioral reference

## Install

### New project

```bash
bash /path/to/codingagents/init.sh
```

### New project with Codex review layer

```bash
bash /path/to/codingagents/init.sh --codex
```

### Existing project upgrade

```bash
bash /path/to/codingagents/upgrade.sh
```

### Existing project upgrade with Codex review layer

```bash
bash /path/to/codingagents/upgrade.sh --codex
```

## Upgrade safety

- Strongly avoid upgrading in the middle of an active feature cycle when a release changes gates, handoff requirements, command contracts, or required artifacts.
- The current published release is `5.11.0`, which renames the four hook helpers from `.js` to `.cjs` (so they work in projects with `"type": "module"` in `package.json`). `upgrade.sh` removes the legacy `.js` files automatically and updates `.claude/settings.json` to reference `.cjs`. After upgrading, verify `.claude/helpers/` contains only `.cjs` files. v5.10 (immediately prior) added the Test Quality Rules section to `commands/test-design.md` — re-running `/test-design` for an in-flight feature will produce a higher-quality test plan but won't invalidate older outputs.
- Safest path: finish the current feature before upgrade.
- If you already upgraded mid-cycle, run `/status` first and resume from the last stable phase whose outputs satisfy the new release requirements.

### Known mid-cycle upgrade hazards

- **Handoff field mismatch:** If your current handoff was written before `source_spec` became required (v5.5+), the review command will halt. Fix: add `"source_spec": "docs/features/<feature>/<prd-file>.md"` to `.claude/handoff.json` manually.
- **ESM project incompatibility (RESOLVED in v5.11):** Hook helpers ship as `.cjs` (CommonJS) and work in both ESM and CommonJS projects. If you upgraded from v5.10 or earlier and still see `.js` hook files in `.claude/helpers/`, re-run `upgrade.sh` — it now removes the legacy `.js` copies and rewrites `.claude/settings.json` to reference the `.cjs` files. (Tracked as ISS-055 — closed.)
- **Version detection gap:** `upgrade.sh` currently uses major-only version tracking (`v5`). If you previously upgraded to any v5.x, subsequent minor releases are silently skipped. Workaround: `echo "core=v4.1" > .claude/.codingagents-version` then re-run `upgrade.sh`. ISS-007 (`--force` flag) will fix this permanently.

After install or upgrade:

1. Edit `CLAUDE.md` with your project-specific overview, stack, commands, conventions, constraints, and gotchas.
2. Confirm `.claude/` contains `agents/`, `commands/`, `helpers/`, `skills/`, `schemas/`, and `settings.json`.
3. Run `/status` in a fresh Claude Code session before starting real work.

## Manual setup fallback

Use manual setup only if you cannot use `init.sh` or `upgrade.sh`.

```bash
# 1. Roles
mkdir -p .claude/agents
cp ROLE_*.md .claude/agents/

# 2. Commands
mkdir -p .claude/commands
cp commands/*.md .claude/commands/

# 3. Helpers
mkdir -p .claude/helpers
cp hooks/archive-context.cjs .claude/helpers/
cp hooks/restore-context.cjs .claude/helpers/
cp hooks/checkpoint.cjs .claude/helpers/
cp hooks/resolve-feature.cjs .claude/helpers/

# 4. Skills
mkdir -p .claude/skills
cp -R skills/* .claude/skills/

# 5. Hook config + schemas
cp hooks/settings.json .claude/settings.json
mkdir -p .claude/schemas
cp schemas/*.json .claude/schemas/

# 6. Root CLAUDE.md
cp CLAUDE.md ./CLAUDE.md

# 7. Artifact directories
mkdir -p docs/features release-notes
```

## Command rules

- `/specify` is the only pipeline phase command that should take natural language.
- `/architect`, `/test-design`, `/security-gate`, `/implement`, `/review`, and `/document` should be invoked with only the feature slug.
- If you need to add guidance after Phase 1, put it in a normal message and then run the slash command separately.
- If you are unsure what feature or phase is active, run `/status` first.

Examples:

```text
/specify Add user auth with password reset and account lockout

Address the BLOCKING findings in docs/features/user-auth/review.md, then continue narrowly.
/implement user-auth
```

Do not do this:

```text
/implement user-auth address codex feedback
/review user-auth and check the latest fixes
```

Phases 2-7 use `.claude/helpers/resolve-feature.cjs` and fail closed on malformed args, mismatched slug vs handoff, or stale empty-arg fallback.

## First feature cycle

```bash
claude
/status

# Use plan mode + high effort for specify and architect — these phases
# benefit from alignment before writing and thorough thinking.
# For bug fixes or small refactors, medium effort without plan mode is fine.
/effort high
/plan
/specify Add outfit recommendation feature that suggests 3 outfits from uploaded clothing
/architect outfit-recommendations
# Switch back for execution phases
/effort medium
/test-design outfit-recommendations
/security-gate outfit-recommendations
/implement outfit-recommendations

# Quit and start a fresh session before review
/review outfit-recommendations

# After merge
/document outfit-recommendations
```

## When the pipeline stops

### Phase 4 blocked

If `docs/features/<feature>/security-audit.md` contains any `BLOCKING` findings:

- do not run `/implement` yet
- no new handoff is written
- fix the design by updating the PRD, architecture, and related tests as needed
- re-run `/security-gate <feature>`
- only proceed to `/implement <feature>` after the blocking findings are resolved

### Phase 6 requests changes

If `docs/features/<feature>/review.md` returns `REQUEST_CHANGES`:

- do not run `/document`
- no new handoff is written
- address the findings
- re-run `/review <feature>` in a fresh session

## Resume safely

- Run `/status` at the start of every resumed session.
- Use `/session-note` only for human resumability, not as pipeline truth.
- The machine-readable pipeline truth is `.claude/handoff.json` plus `.claude/pipeline-checkpoint.json`.
- Empty phase-command args can fall back to handoff only when the handoff is valid and from the immediately previous phase.

## Session discipline

- Start a fresh session for each pipeline phase.
- Run `/compact` around 60% context usage.
- Never load more than 10 files in one session unless you are intentionally doing broader review work.
- Use `/session-note` before ending a long session when a human-readable resume note would help.

## Model defaults

| Phase | Model |
|---|---|
| Specify | Haiku |
| Architect | Opus |
| Test Design | Sonnet |
| Security Gate | Opus |
| Implement | Sonnet |
| Review | Sonnet |
| Document | Haiku |

## Common mistakes

- Passing natural language into `/architect`, `/implement`, `/review`, or other later phases.
- Continuing to `/implement` after a Phase 4 `BLOCKING` audit.
- Continuing to `/document` after a Phase 6 `REQUEST_CHANGES` review.
- Reusing the implementation session for `/review`.
- Treating `/session-note` as authoritative pipeline state instead of using `/status`.
