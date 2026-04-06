# Architecture: Dogfood Pipeline (ISS-005)

**Phase:** Architect | Date: 2026-04-06

## Decision

The dogfood run is a **process validation**, not a code feature. The existing pipeline
machinery is exercised against itself to surface bugs. Five decisions govern how this works.

---

## AD1 -- Install Strategy

**Decision:** Use `init.sh` targeting the repo's own root, identical to how a consumer
project would install. This validates the real install path. After install, verify
`.claude/` contents match AC1's checklist before proceeding.

**Rejected:** Manual file copying or symlinking. Reason: defeats the purpose of dogfooding
the install script itself.

## AD2 -- CLAUDE.md Scoping

**Decision:** Agents read `docs/CLAUDE.md` for framework-development context. The root
`CLAUDE.md` is the consumer template and must not be treated as the governing instruction
file during dogfood.

**Prerequisite fixes (before dogfood validates AC6):**
1. Update `commands/architect.md` and `commands/document.md` to reference `docs/CLAUDE.md`
   instead of generic `CLAUDE.md` when running in a repo that has both files.
2. Claude Code auto-loads both files already — no change to restore-context.js needed for
   loading. The gap is in the command prompts, not the hook.

**Rejected:** Adding CLAUDE.md routing logic to restore-context.js. Reason: overreach for
a hook; the correct fix is in the command prompt text.

## AD3 -- Handoff Flow

**Decision:** Standard handoff.json lifecycle with one prerequisite fix:

`restore-context.js` currently returns `null` silently on malformed JSON or missing
fields (lines 53-57). This violates AC4 which requires error logging and agent
notification. **Before dogfooding**, add stderr diagnostic output when handoff parsing
fails, so the next agent sees the failure reason.

checkpoint.js validates schema on Stop (outbound gate). restore-context.js loads on
SessionStart (inbound). The dogfood feature name is `invariants-audit` (ISS-001).

## AD4 -- Token Tracking

**Decision:** After all 7 phases, aggregate `.claude/token-usage.jsonl` using
`codex/report-usage.sh` (which already exists and reads the budget table from root
`CLAUDE.md` lines 276-286). Output to `docs/features/dogfood-pipeline/token-report.md`.
Variance > 20% per phase triggers backlog entry (AC9).

**Budget source:** Root `CLAUDE.md` is authoritative — it contains the only budget table
in the repo. This is correct: the budget targets are part of the consumer-facing pipeline
spec, not framework-specific.

## AD5 -- Bug Logging

**Decision:** Bugs discovered during any phase are appended to `docs/issues/backlog.md`
using the existing ticket format. Each entry must include `[phase: N]` tag and a link to
the feature directory. No new tracking system; the backlog is the system of record.

---

## Data Model / API Changes

None. This is a process feature — no new tables, fields, or endpoints.

## Prerequisite Framework Fixes

These scoped changes must land before dogfood validates AC4 and AC6:
1. `hooks/restore-context.js`: log to stderr on malformed handoff instead of silent `null`
2. `commands/architect.md` + `commands/document.md`: reference `docs/CLAUDE.md` for repos with both files

## Failure Modes

| Failure | Detection | Response |
|---------|-----------|----------|
| init.sh fails on own repo | AC1 check fails; `.claude/` incomplete | Fix init.sh before proceeding |
| handoff.json invalid between phases | checkpoint.js blocks outbound (Stop hook) | Fix handoff in failing phase, re-run |
| handoff.json corrupted after checkpoint | restore-context.js must log to stderr (prereq fix) | Agent sees error; re-run previous phase |
| Agent loads root CLAUDE.md instead of docs/ | Command prompts must reference docs/CLAUDE.md (prereq fix) | Agent re-runs with corrected command |
| Token log missing or malformed | Aggregation script errors | Manual token count from session metadata |
| Bug not logged to backlog | Post-run audit of phase notes vs backlog | Retroactively add missed entries |

## Fitness Functions

1. **Handoff continuity:** Every phase N handoff.json must have `phase: N` and valid schema.
2. **Artifact isolation:** After phase 3, `docs/features/invariants-audit/` contains only spec docs.
3. **Token budget:** Per-phase variance vs root `CLAUDE.md` budget table (lines 276-286) stays under 20%.
4. **Bug capture rate:** Every framework issue noted in phase output has a backlog entry.

## Rejected Alternatives

1. **Separate test repo** -- misses repo-specific edge cases (two CLAUDE.md files, self-referential install).
2. **Custom orchestrator script** -- over-engineering; pipeline commands should be used as-is.
3. **Parallel phase execution** -- bypasses handoff validation, which is a primary test target.
