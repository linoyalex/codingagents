# codingagents vNext Recommendations

## Purpose

This document captures what remains after v5 shipped. It contains the Tier 2 pilot items, Tier 3 deferred items, and stretch goals that were intentionally excluded from v5. These items should only be adopted after v5 has been validated through baseline measurement and real feature cycles.

For what was implemented in v5, see [v5-implementation-record.md](v5-implementation-record.md).

---

## What v5 Shipped (summary)

The following are done and should not be re-debated:

- Structured handoff.json with schema validation (blocking gate)
- Token usage tracking with JSONL logging, iteration awareness, and agent/model attribution
- Memory and instruction governance rules in CLAUDE.md
- Least-privilege tool permissions (already in place since v4, confirmed in v5)
- Handoff hook integration (checkpoint.js, restore-context.js, archive-context.js)
- Transition gates with handoff validation as the one non-safety blocking requirement
- Codex review layer (4 reviewers, shared token tracking, reporting tools)
- Deployment tooling (init.sh, upgrade.sh, migration scripts, version tracking)
- Baseline metrics section in PIPELINE.md

---

## What Remains: Tier 2 — Pilot Carefully

These items were designed in the v5 proposal but intentionally deferred to post-v5 piloting. Each has defined success criteria. Only adopt after running 2-3 feature cycles with v5 and comparing metrics against the baseline captured in step 3 of the v5 implementation order.

### 6) Model and Reasoning-Effort Routing

**Status:** Not implemented. Requires baseline data.

**What it is:**
- Route by reasoning effort, not just model tier.
- Define explicit upgrade/downgrade triggers:
  - If implementation fails verification once, retry same model with higher effort.
  - If it fails again for the same class of issue, escalate model tier.
- Avoid vague guidance like "use judgment."

**Pilot success criteria:**
- At least one measurable retry-cost reduction on a real feature cycle (fewer tokens spent on retry compared to baseline).

**Risk:**
- If the routing policy is too abstract, it adds prose without changing behavior.

**Prerequisites:**
- Token tracking must be active (shipped in v5).
- At least 3 feature cycles of baseline data to compare against.

**Implementation touchpoints:**
- `hooks/checkpoint.js` — `resolveAgentAndModel()` contains the current model routing map (`modelMap`). Effort routing would add effort-level defaults here or in a new config.
- `hooks/restore-context.js` — `NEXT_AGENT_MAP` maps handoff phase to next agent/model. Effort routing may need to extend this with effort levels.
- `PIPELINE.md` — model assignments table (line ~34). Effort defaults per phase would be documented here.
- `.claude/token-usage.jsonl` — retry data lives here. Use `iteration` > 1 entries to measure retry cost before and after routing changes.
- Role file frontmatter (`model:` field) — currently static. Effort routing may need a `reasoning_effort:` field or equivalent.

---

### 7) Session Strategy Exceptions

**Status:** Not implemented. Requires validation that fresh-session overhead is a real problem.

**What it is:**
- Keep fresh session as the default.
- Allow same-session continuation only when **all** of the following conditions are met:
  1. The follow-up operates on the same ≤5 files as the prior step.
  2. The same acceptance criteria apply — no new ACs introduced.
  3. Estimated input token usage is below 40% of the model's context window. In practice: count prompt tokens from API response metadata where available, or use a conservative proxy (total input character count < 200K characters). This is a guideline, not a precision gate.
  4. No phase boundary is crossed (continuation is within the same pipeline phase).
- Conditions 1, 2, and 4 are mechanically checkable. Condition 3 is an operator guideline.
- Require explicit justification recorded in the session when using the exception.

**Pilot success criteria:**
- Token savings of ≥15% on coupled micro-steps compared to full fresh-session restart, without observable context degradation (no missed ACs, no hallucinated file state).

**Risk:**
- If the exception is too loose, it will erode the discipline that keeps token use low.
- Time-based limits alone do not prevent context bloat — the context utilization check (condition 3) is the real safeguard.

**Prerequisites:**
- Token tracking must show that fresh-session restarts are a meaningful cost driver.

**Implementation touchpoints:**
- `hooks/restore-context.js` — `restoreFromHandoff()` currently loads handoff for every fresh session. Session-reuse logic would add a check here for whether to skip the restore.
- `hooks/checkpoint.js` — `logTokenUsage()` records `duration_seconds`. Compare fresh-session durations vs hypothetical continuation savings.
- `.claude/token-usage.jsonl` — look for patterns where consecutive entries for the same feature + phase have short durations (indicating quick follow-ups that paid full fresh-session overhead).
- `CLAUDE.md` — session rules section. Exception conditions would be documented here.

---

### 8) Safety-Enforcement Hooks

**Status:** Not implemented. Distinct from the Tier 1 handoff hooks that shipped in v5.

**What it is:**
- Add *new* enforcement hooks (not updates to existing hooks):
  - Protected-path write blocking
  - Dangerous command blocking
  - Optional packet-size or compaction caps

**What it is NOT:**
- The handoff hooks shipped in v5 (checkpoint.js, restore-context.js) are Tier 1 infrastructure, not safety enforcement. This item covers *new* blocking behavior beyond handoff validation.

**Risk:**
- Overusing hooks makes the architecture brittle, harder to port, and harder to debug.
- Keep hooks narrow: 2-3 concrete behaviors, not a general policy engine.

**Prerequisites:**
- Tier 1 hooks must be stable for at least 3 feature cycles before adding new blocking behavior on top.

**Implementation touchpoints:**
- `hooks/settings.json` — new hook types would be registered here (e.g., `PreToolUse` for command blocking).
- `hooks/checkpoint.js` — existing blocking behavior for handoff validation. New safety hooks should follow the same pattern (validate → log → exit non-zero on failure).
- `.gitignore-template` — if new hooks produce any runtime artifacts, add them here.
- `init.sh` / `upgrade.sh` — new hook scripts must be added to the copy list.
- Role files — protected-path rules might be expressed as role-level constraints rather than global hooks, depending on design.

---

## Tier 2 Pilot Protocol

Before starting any Tier 2 pilot:

1. Capture baseline metrics using the v5 token tracking system (`.claude/token-usage.jsonl`).
2. Run 2-3 feature cycles with v5 as-is.
3. Define what "success" means for the specific pilot (each item above includes criteria).
4. Run the pilot for 2-3 additional feature cycles.
5. Compare pilot metrics against baseline, including both first-pass and retry token costs.
6. If criteria are not met, revert to the simpler default rather than iterating on the pilot.

---

## What Remains: Tier 3 — Defer Unless Metrics Show a Real Need

These items should only be revisited if pilot metrics show clear evidence of the specific problem they solve.

### 9) Per-Phase Eval Scoring

**Status:** Deferred. Do not revisit until Tier 1 gates have run for at least 3-5 feature cycles.

**What it would be:**
- Subjective quality scoring beyond pass/fail: review quality, security finding quality, defect leakage by phase.
- Reproducible eval runs and scoring for implementation outputs.

**Why it's deferred:**
- Most complex item in the original proposal.
- Risks building an eval framework around a problem that may not be the current bottleneck.
- Premature eval frameworks measure the wrong thing until the process they evaluate has stabilized.

**Revisit trigger:**
- Artifact quality (not process overhead) is identified as the limiting factor based on v5 baseline metrics.

---

### 10) Prompt-Cache-Aware Command Structure

**Status:** Deferred. Over-optimization relative to clearer wins already shipped in v5.

**What it would be:**
- Redesign command templates with static prefix + dynamic suffix for cache friendliness.
- Cache-friendly command construction patterns.

**Why it's deferred:**
- Stable skills and role prompts already provide reusable prefix value.
- Structured handoffs and memory governance (shipped in v5) deliver the real token savings.

**Revisit trigger:**
- Token tracking shows significant cache miss waste that template restructuring would address.

---

### 11) Heavy Parallel-Subagent Cost Controls

**Status:** Deferred. Simple concurrency cap is sufficient unless evidence shows otherwise.

**What it would be:**
- Max concurrent subagents per phase
- Idle timeout + auto-close
- Elaborate spawn governance

**Why it's deferred:**
- No evidence of runaway parallel fan-out yet.
- A simple "max 3 concurrent subagents" rule in CLAUDE.md is sufficient for now.

**Revisit trigger:**
- Pilot metrics show meaningful waste or coordination problems from uncontrolled parallelism.

---

## Stretch Goals (Beyond Tier 3)

These are ideas that emerged during the v5 design process but were never formally proposed. They are recorded here for future consideration, not for near-term implementation.

### Multi-feature handoff tracking

The current handoff system is single-feature — `.claude/handoff.json` is overwritten each phase. If multiple features are in flight simultaneously, handoffs would collide. A future version could use `.claude/handoffs/{feature}/handoff.json` or a feature-indexed lookup, but this adds complexity that isn't justified until multi-feature parallelism is a real workflow.

### Real-time token budget enforcement

v5 tracks token usage after the fact. A future version could warn or halt a session mid-phase if it's approaching its token budget. This would require integration with Claude Code's context reporting (not consistently available today).

### Automated Codex review triggering

v5's Codex reviews are manually invoked. A future version could trigger them automatically via CI or a post-phase hook when a pipeline artifact is committed. This would move Codex from "optional manual step" to "integrated CI check."

### Cross-project baseline comparison

v5's token tracking is per-project. A future version could aggregate JSONL logs across projects to build a cross-project baseline — identifying which project types, feature sizes, or team patterns produce the most efficient pipeline runs.

### Handoff schema versioning

If the handoff schema evolves, older handoffs won't validate against newer schemas. A `schema_version` field in handoff.json would allow the validation logic to handle multiple schema versions gracefully during migration periods.

---

## Decision Log

Decisions made during v5 that constrain future work:

| Decision | Rationale | Impact on vNext |
|---|---|---|
| Handoff is blocking from day one | Ensures structured handoffs are enforceable, not optional | Safety hooks (item 8) must not conflict with handoff validation |
| Artifact-based phase detection, handoff-based attribution | Stop hook detects phase from pipeline artifacts; handoff provides feature and `produced_by` attribution | Multi-feature tracking (stretch goal) must preserve artifact detection reliability |
| Agent/model inferred from handoff + routing map | Avoids requiring agents to self-report | Effort routing (item 6) must update the routing map, not bypass it |
| Codex is advisory, never blocking | Keeps the Claude pipeline independent | Automated Codex triggering (stretch goal) must preserve non-blocking semantics |
| `.gitignore-template` is single source of truth | Prevents drift between install scripts | Any new runtime artifacts must be added to the template, not inlined |
| `init.sh` is idempotent | Safe to run as both setup and repair | Future install modes must preserve idempotency |
