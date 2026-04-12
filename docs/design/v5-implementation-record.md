# codingagents v5 — Implementation Record

## Purpose

This document records what was proposed, designed, reviewed, and implemented in codingagents v5. It serves as a reference for what shipped, why decisions were made, and what was intentionally deferred to vNext.

---

## What v5 Delivered

### Tier 1: Adopted

All five Tier 1 items from the original proposal were implemented.

#### 1) Structured Handoff Design

- `.claude/handoff.json` is the mandatory machine-readable contract between pipeline phases.
- Schema defined in `schemas/handoff.schema.json` with required fields: `feature`, `phase`, `goal`, `scope`, `relevant_files`, `acceptance_criteria`, `verification_commands`.
- Optional fields: `constraints`, `known_risks`, `produced_by`, `timestamp`.
- `additionalProperties: false` — unexpected fields are rejected.

#### 2) Memory and Instruction Governance

- Added "Phase Handoff Protocol" section to CLAUDE.md.
- Added "Memory & Instruction Governance" section to CLAUDE.md with placement rules and line limits:
  - CLAUDE.md: ~250 lines max, always loaded
  - Skills: ~100 lines each, loaded on demand
  - Handoff packets: ~50 lines, ephemeral
- Rules: no duplication across locations, skills never pasted into CLAUDE.md, quarterly review of agent memory.

#### 3) Security and Permission Model (Least-Privilege Defaults)

- Code reviewer and security reviewer already had `disallowedTools: [Edit, Write]` — confirmed and preserved.
- All 8 role files updated with Phase Handoff instructions including `produced_by` for attribution.

#### 4) Transition Gates

- `handoff.json` validation is a **blocking gate** — the Stop hook (`checkpoint.js`) exits with non-zero if handoff is missing or invalid.
- Full schema validation: required field checks, type checks (string, integer, array), range constraints (phase 1-7), unexpected property rejection.
- `verification-gate/SKILL.md` updated with handoff validation commands that match the hook's enforcement.
- Handoff validation is the one non-safety blocking requirement from day one. Other gates are warning-first.
- Added `.claude/handoff.json` missing/invalid to the no-go criteria list.

#### 5) Handoff Hook Integration

- `checkpoint.js` (Stop hook):
  - Validates `.claude/handoff.json` as a blocking gate.
  - Detects the completed phase from pipeline artifacts across all 7 phases.
  - Uses handoff metadata for feature and `produced_by` attribution.
  - Logs token usage with agent/model attribution from handoff `produced_by` + model routing map.
  - Tracks iteration count per feature + phase for retry visibility.
  - Writes diagnostic checkpoint even on failure.
- `restore-context.js` (SessionStart hook):
  - Loads `.claude/handoff.json` as primary context (feature, goal, scope, files, ACs, verification commands, risks).
  - Falls back gracefully to archived turns when handoff doesn't exist.
  - Records session start time and feature context for later Stop/PreCompact logging.
- `archive-context.js` (PreCompact hook):
  - Logs a token usage snapshot (`entry_type: "snapshot"`) before compaction.
  - Existing turn-archiving behavior preserved.

### Infrastructure Addition: Token Usage Tracking

- All sessions log to `.claude/token-usage.jsonl` via lifecycle hooks.
- JSONL schema with 15 fields: timestamp, feature, phase, agent, model, iteration, cycle, input/output/total/cache tokens, duration, verification_passed, token_source, entry_type.
- Iteration-aware: first-pass costs tracked separately from retry overhead.
- Agent/model attribution inferred from handoff `produced_by` field + pipeline model routing map.
- PreCompact snapshots capture token state before context loss.
- Codex logs to the same file via `codex/log-usage.sh`.
- Reporting via `codex/report-usage.sh` with per-phase, per-iteration breakdown.

### Codex Review Layer (Optional)

- Four reviewer instruction files: `review-code.md`, `review-test-design.md`, `review-architecture.md`, `review-prd.md`.
- Input packet schema: `codex/templates/review-brief.json`.
- Standardized output format: `codex/templates/review-output.md`.
- Non-blocking, advisory reviews — Claude pipeline never waits on Codex.
- Shared token tracking via `codex/log-usage.sh` (same JSONL schema).
- Reporting via `codex/report-usage.sh`.
- Codex workflow documented in `codex/README.md`, including:
  - recommended `review-code` kickoff prompt
  - usage logging command
  - reporting command
  - rollout order for the other three reviewers
- `codex/fresh-context-playbook.md` retained in the source repo as operator guidance for low-token runs.
- Rollout strategy: start with code review only (~4-6K tokens), add others after validation.
- Full ceiling: ~12-17K tokens if all four checkpoints activated.

### Deployment Tooling

- `init.sh` — one-command setup for new projects (roles, commands, skills, hooks, schemas, CLAUDE.md, .gitignore). Idempotent. `--codex` flag for optional Codex layer.
- `upgrade.sh` — v4.1 migration with backup, confirmation prompt, and version-specific migration logic. `--codex` flag for Codex layer.
- `migrations/v4.1-to-v5.sh` — version-specific migration steps.
- `.codingagents-version` file at `.claude/.codingagents-version` for version tracking.
- `.gitignore-template` — single source of truth for runtime artifact patterns, consumed by both scripts.

### Documentation Updates

- `PIPELINE.md` — added Baseline Metrics section with budget targets per phase, retry allowance, and Codex review layer budgets.
- `CLAUDE.md` — added Phase Handoff Protocol and Memory & Instruction Governance sections.
- `QUICKSTART.md` — operator quickstart covering automated setup, upgrade instructions, and safe command invocation.
- `README.md` — full rewrite for v5.

---

## Key Design Decisions Made During Implementation

1. **Handoff is blocking, other gates are warning-first.** Handoff validation is the one non-safety blocking requirement. This ensures the structured-handoff investment is enforceable, not optional.

2. **Artifact-based phase detection, handoff-based attribution.** The Stop hook detects the completed phase from pipeline artifacts and uses the handoff for feature and `produced_by` attribution. This is more reliable than the original incomplete heuristics, but it is still artifact-driven rather than purely handoff-driven.

3. **Agent/model attribution from handoff + routing map.** Stop hook reads `produced_by` from handoff for the current agent and infers the model from the pipeline routing table. SessionStart records timing and feature context, not authoritative agent/model identity.

4. **Session state as bridge between hooks.** `.claude/.session-state.json` is written by SessionStart and read by Stop/PreCompact. This passes start time, feature, agent, and model across the session lifecycle without requiring agent cooperation.

5. **Codex as optional integrated review lane.** Codex shares data formats (JSONL schema, handoff schema) and metrics, but not execution infrastructure (hooks, gates, pipeline orchestration). The Claude pipeline works identically with or without Codex.

6. **Deployment scripts consume .gitignore-template.** Both `init.sh` and `upgrade.sh` read from `.gitignore-template` rather than inlining entries, creating a single source of truth for runtime artifact patterns.

7. **Least-privilege expressed in role prompts.** `allowedTools` and `disallowedTools` are in the role file frontmatter, not in hooks. This keeps permissions visible to anyone reading the role definition.

---

## Review Process

This implementation was iteratively reviewed by Codex across multiple rounds. Key findings addressed:

- Handoff gate was initially advisory (warning-only) — changed to blocking with `process.exit(1)`.
- Phase detection was incomplete (missing phases 3, 5, 7) — expanded to cover all 7 phases.
- Handoff validation was field-presence-only — upgraded to full schema validation (types, ranges, unexpected properties).
- Token logs initially recorded `agent: "unknown"` — fixed with handoff-based attribution and model routing map.
- `.gitignore` entries were inlined in scripts — refactored to consume `.gitignore-template`.
- Codex invocation guidance was initially scattered — consolidated into `codex/README.md` and the main `README.md`.
- Version strings were inconsistent (`vnext-tier1` vs `v5`) — unified to `v5` across all implementation files.
- Verification-gate skill's manual validation commands didn't match the hook's enforcement — upgraded to full schema validation.

---

## Codex-Specific Notes

The Codex layer that shipped in v5 is intentionally small and manual-first.

What is implemented:

- Manual invocation of `review-code`, `review-test-design`, `review-architecture`, and `review-prd`
- Shared token logging into `.claude/token-usage.jsonl`
- Shared reporting via `codex/report-usage.sh`
- Operator-facing guidance in:
  - `codex/README.md`
  - `codex/fresh-context-playbook.md`

What is not implemented:

- Automatic Codex triggering from Claude hooks
- CI-based Codex review orchestration
- Blocking Codex gates
- Shared hook infrastructure between Claude and Codex

Practical rollout guidance:

- Start with `review-code` only.
- Treat the other three reviewers as staged additions after value is demonstrated.
- Keep Codex findings injected back into the Claude pipeline at 500 tokens or less.
- Use Codex as an independent reviewer, not a competing implementation lane.

---

## Shipped File Map

### Structured Handoffs

| File | Type | Purpose |
|---|---|---|
| `schemas/handoff.schema.json` | New | JSON schema definition for handoff artifact |
| `.claude/handoff.json` | Runtime | Written per phase by agents, validated by Stop hook |

### Token Tracking

| File | Type | Purpose |
|---|---|---|
| `.claude/token-usage.jsonl` | Runtime | Append-only session log (Claude + Codex entries) |
| `.claude/.session-state.json` | Runtime | Bridge between SessionStart and Stop hooks |

### Hooks

| File | Type | Purpose |
|---|---|---|
| `hooks/checkpoint.js` | Updated | Stop hook — handoff validation (blocking), token logging, phase detection |
| `hooks/restore-context.js` | Updated | SessionStart hook — handoff loading with archived-turns fallback |
| `hooks/archive-context.js` | Updated | PreCompact hook — token snapshot + turn archiving |
| `hooks/settings.json` | Existing | Hook configuration (unchanged) |

### Roles (all 8 updated with Phase Handoff instructions)

| File | Phase | Key constraint |
|---|---|---|
| `ROLE_PRODUCT_OWNER.md` | 1 | Write only |
| `ROLE_UX_DESIGNER.md` | 1 | No Edit |
| `ROLE_ARCHITECT.md` | 2 | No Edit |
| `ROLE_QA.md` | 3 | No Edit |
| `ROLE_SECURITY.md` | 4 | Read-only (no Edit, no Write) |
| `ROLE_DEVELOPER.md` | 5 | Full tools except WebFetch |
| `ROLE_CODE_REVIEWER.md` | 6 | Read-only (no Edit, no Write) |
| `ROLE_DOCUMENTATION_SPECIALIST.md` | 7 | No Edit |

### Skills

| File | Type | Purpose |
|---|---|---|
| `skills/verification-gate/SKILL.md` | Updated | Added handoff validation section + schema checks + no-go criteria |

### Deployment

| File | Type | Purpose |
|---|---|---|
| `init.sh` | New | One-command project setup (`--codex` for optional Codex layer) |
| `upgrade.sh` | New | v4.1 migration with backup and confirmation (`--codex` supported) |
| `migrations/v4.1-to-v5.sh` | New | Version-specific migration logic |
| `.gitignore-template` | New | Single source of truth for runtime artifact ignore patterns |
| `.claude/.codingagents-version` | Runtime | Version tracking (written by init/upgrade scripts) |

### Codex Review Layer

| File | Type | Purpose |
|---|---|---|
| `codex/reviewers/review-code.md` | New | Diff-based code review instructions (start here) |
| `codex/reviewers/review-test-design.md` | New | Test coverage review instructions |
| `codex/reviewers/review-architecture.md` | New | Architecture risk review instructions |
| `codex/reviewers/review-prd.md` | New | PRD completeness review instructions |
| `codex/templates/review-brief.json` | New | Input packet schema for Codex reviews |
| `codex/templates/review-output.md` | New | Standardized output format |
| `codex/log-usage.sh` | New | Manual token logging for Codex runs |
| `codex/report-usage.sh` | New | Token usage reporting (reads .claude/token-usage.jsonl) |
| `codex/fresh-context-playbook.md` | Existing | Low-token patterns for Codex agents |
| `codex/README.md` | Updated | Codex workflow and invocation guidance |

### Documentation

| File | Type | Purpose |
|---|---|---|
| `README.md` | Rewritten | Full v5 documentation |
| `CLAUDE.md` | Updated | Added Phase Handoff Protocol + Memory & Instruction Governance |
| `PIPELINE.md` | Updated | Added Baseline Metrics section with budget targets |
| `QUICKSTART.md` | Updated | Operator quickstart covering automated setup, upgrade instructions, and safe command invocation |

---

## What Was NOT Implemented (Deferred to vNext)

See [vnext-recommendations.md](vnext-recommendations.md) for full details on deferred items.
