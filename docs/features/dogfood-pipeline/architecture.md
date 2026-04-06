# Architecture: Dogfood Pipeline (ISS-005)

**Phase:** Architect | Date: 2026-04-06

## Decision

The dogfood run is a **process validation**, not a code feature. No new modules,
services, or abstractions are introduced. The existing pipeline machinery (checkpoint.js,
restore-context.js, handoff.json, phase commands) is exercised against itself to surface
bugs. Five architectural decisions govern how this works.

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
file during dogfood. Phase 2 (architect) and Phase 7 (documentation) agents must confirm
they loaded `docs/CLAUDE.md` by referencing its header in their output.

**Enforcement:** restore-context.js already loads both files. Agent prompts (ROLE_*.md)
must include the line: "For framework development, use docs/CLAUDE.md as primary context."

## AD3 -- Handoff Flow

**Decision:** Standard handoff.json lifecycle, no modifications. Each phase writes
`.claude/handoff.json`; checkpoint.js validates schema on Stop; restore-context.js loads
it on SessionStart. The dogfood feature name is `invariants-audit` (ISS-001).

**Token log:** checkpoint.js appends to `.claude/token-usage.jsonl` (one JSON line per
phase). Post-run aggregation uses a shell one-liner, not a new tool.

## AD4 -- Token Tracking

**Decision:** After all 7 phases, aggregate `.claude/token-usage.jsonl` via shell one-liner.
Output to `docs/features/dogfood-pipeline/token-report.md`. Variance > 20% triggers backlog entry (AC9).
A dedicated reporting tool was rejected as premature.

## AD5 -- Bug Logging

**Decision:** Bugs discovered during any phase are appended to `docs/issues/backlog.md`
using the existing ticket format. Each entry must include `[phase: N]` tag and a link to
the feature directory. No new tracking system; the backlog is the system of record.

---

## Data Model Changes

None. This is a process feature.

## API Contract

None. No new endpoints.

## Module Boundaries

| Component | Owner | Role in Dogfood |
|-----------|-------|-----------------|
| `hooks/checkpoint.js` | framework | Validates handoff, logs tokens (unchanged) |
| `hooks/restore-context.js` | framework | Loads handoff at session start (unchanged) |
| `schemas/handoff.schema.json` | framework | Schema for handoff validation (unchanged) |
| `docs/features/invariants-audit/` | dogfood run | Receives phase artifacts (prd, arch, tests, etc.) |
| `docs/features/dogfood-pipeline/` | ISS-005 | Meta-feature: this architecture doc, token report |
| `docs/issues/backlog.md` | shared | Receives bug entries from dogfood phases |

No new modules. No code changes to existing modules.

## Failure Modes

| Failure | Detection | Response |
|---------|-----------|----------|
| init.sh fails on own repo | AC1 check fails; `.claude/` incomplete | Fix init.sh before proceeding |
| handoff.json invalid between phases | checkpoint.js logs error, blocks (AC4) | Fix handoff in failing phase, re-run |
| Agent loads root CLAUDE.md instead of docs/ | Phase output references consumer template | Agent re-runs with correct scoping prompt |
| Token log missing or malformed | Aggregation script errors | Manual token count from session metadata |
| Bug not logged to backlog | Post-run audit of phase notes vs backlog | Retroactively add missed entries |

## Fitness Functions

1. **Handoff continuity:** Every phase N handoff.json must have `phase: N` and valid schema.
2. **Artifact isolation:** After phase 3, `docs/features/invariants-audit/` contains only
   spec docs (no src/ artifacts). Verified by `ls` check.
3. **Token budget:** Per-phase variance vs CLAUDE.md budget table stays under 20%.
4. **Bug capture rate:** Every framework issue noted in phase output has a backlog entry.

## Rejected Alternatives

1. **Separate test repo** -- misses repo-specific edge cases (two CLAUDE.md files, self-referential install).
2. **Custom orchestrator script** -- over-engineering; pipeline commands should be used as-is.
3. **Parallel phase execution** -- bypasses handoff validation, which is a primary test target.
