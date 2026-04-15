# Quick Start Guide

> **Current as of:** v5.9.0 (2026-04-15)

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
- The current published example is `5.9.0`, which adds a `--sync-claude-md` flag to `init.sh` and `upgrade.sh`. Without the flag, behavior is unchanged. If used on a legacy project, managed markers are inserted into CLAUDE.md — review the result to verify user content was preserved.
- Safest path: finish the current feature before upgrade.
- If you already upgraded mid-cycle, run `/status` first and resume from the last stable phase whose outputs satisfy the new release requirements.

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
cp hooks/archive-context.js .claude/helpers/
cp hooks/restore-context.js .claude/helpers/
cp hooks/checkpoint.js .claude/helpers/
cp hooks/resolve-feature.js .claude/helpers/

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

Phases 2-7 use `.claude/helpers/resolve-feature.js` and fail closed on malformed args, mismatched slug vs handoff, or stale empty-arg fallback.

## First feature cycle

```bash
claude
/status

/specify Add outfit recommendation feature that suggests 3 outfits from uploaded clothing
/architect outfit-recommendations
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
