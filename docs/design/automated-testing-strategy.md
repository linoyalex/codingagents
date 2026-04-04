# Automated Testing Strategy for Agents

## Purpose

Testing an LLM agent framework is uniquely challenging because LLM outputs are non-deterministic. To build a robust automated testing strategy for the `codingagents` framework, we must strictly decouple **deterministic infrastructure** (scripts, hooks, schemas) from **probabilistic agent behaviors** (prompt adherence, code logic).

This document proposes a 4-layer testing strategy designed to prevent context bloat regressions, validate structural handoffs, and ensure constraints are respected.

---

## Layer 1: Deterministic Infrastructure Testing

**Goal:** Before testing the AI, test the plumbing. The agents rely entirely on hooks and bash scripts functioning correctly.

- **Bash Scripts (`init.sh`, `upgrade.sh`, migrations):**
  - **Approach:** Use **Bats (Bash Automated Testing System)**.
  - **What to assert:** Idempotency (running `init.sh` multiple times is safe), correct file placement, and successful version migrations. *(Note: partially covered by existing `test-install-scripts.sh`)*.
- **Node.js Hooks (`checkpoint.js`, `restore-context.js`, `archive-context.js`):**
  - **Approach:** Standard test runner like **Jest** or **Vitest**.
  - **What to assert:** 
    - `checkpoint.js` correctly parses `handoff.json` and exits with a non-zero code when required fields are missing.
    - `restore-context.js` accurately extracts context from `handoff.json` and formats the prompt prefix.
    - Hooks correctly format and append logs to `.claude/token-usage.jsonl` with correct iteration logic.

---

## Layer 2: Artifact & Contract Validation

**Goal:** Test *what* the agent outputted, rather than *how* it wrote it. Ensure the pipeline doesn't break between phases.

- **Approach:** Headless CLI test runners triggering single-shot Claude Code commands (`claude -p "..."`).
- **What to assert:**
  - **Artifact Generation:** E.g., Phase 1 (`product-owner`) reliably generates `docs/features/<feature>/prd.md` containing mandatory headers (`### Acceptance Criteria`).
  - **Handoff Schema:** Run `ajv-cli` (or similar JSON schema validator) against `.claude/handoff.json` after isolated phase runs.
  - **Tool Usage Constraints:** Assert that read-only agents (e.g., `code-reviewer`, `security-reviewer`) never write or edit files.

---

## Layer 3: Behavioral Evaluations (LLM-as-a-Judge)

**Goal:** Evaluate probabilistic outputs against strict `CLAUDE.md` constraints using an evaluator model (like Haiku or Sonnet).

- **Approach:** Use an evaluation framework like **Promptfoo** or **Braintrust**.
- **What to assert:**
  - **Constraint Adherence (Negative Testing):** Ask the `developer` to violate a core constraint (e.g., connect to a DB from a UI component). Evaluation passes *only* if the agent refuses or corrects the approach.
  - **Security Reviewer Efficacy:** Provide the `security-reviewer` an architecture doc containing a glaring OWASP vulnerability. Evaluator checks if `security-audit.md` flagged it.
  - **Code Reviewer:** Provide a `git diff` with a hardcoded secret. Assert it is flagged as `BLOCKING`.

---

## Layer 4: End-to-End (E2E) Pipeline Smoke Test

**Goal:** A CI run simulating a full 7-phase feature cycle to ensure the holistic integration works and token tracking budgets are respected.

- **Approach:** A CI script triggering sequential slash commands on a dummy "Hello World" feature.
- **Workflow:**
  1. `claude -p "/specify Add a health check endpoint"` -> Verify `prd.md` and valid `handoff.json`.
  2. `claude -p "/architect health-check"` -> Verify `architecture.md`.
  3. Continue through `/implement` and `/review`.
  4. **Compilation & Tests:** Run project tests (`pnpm test`); fail if the agent's code didn't compile or pass its own tests.
  5. **Budget Assertion:** Parse `.claude/token-usage.jsonl`. Fail if the total cost significantly exceeds the ~63K token baseline.

---

## Implementation Plan / Recommendation

Start by implementing **Layer 1** and **Layer 2**. Avoid expensive and complex LLM evaluations (Layer 3) until the deterministic plumbing and contract validations are fully covered.

### Layer 2 Starting Point: Phase 1 Contract Test

Create a `tests/e2e/phase1-contract.sh` to validate the specific handoff boundary:

```bash
#!/bin/bash
mkdir -p .claude/agents docs/features .claude/schemas
cp ../codingagents/ROLE_PRODUCT_OWNER.md .claude/agents/
cp ../codingagents/schemas/handoff.schema.json .claude/schemas/

# 1. Trigger the agent headlessly
claude -p "Use the product-owner agent to /specify a simple counter widget" --model claude-haiku-4-5

# 2. Assert Artifact Existence
[ -f "docs/features/counter-widget/prd.md" ] || { echo "❌ Failed: prd.md missing"; exit 1; }

# 3. Assert Handoff Contract
[ -f ".claude/handoff.json" ] || { echo "❌ Failed: handoff.json missing"; exit 1; }

# 4. Validate Schema
ajv validate -s .claude/schemas/handoff.schema.json -d .claude/handoff.json || { echo "❌ Failed: Invalid handoff.json"; exit 1; }

echo "✅ Phase 1 Contract Test Passed!"
```

---

## Review Feedback (2026-04-03)

### Overall Assessment

The 4-layer structure and "Layer 1 first" prioritization are correct. The main gaps are in feasibility details, acknowledgment of existing coverage, and missing test surfaces that are cheap to add.

### Gap 1: Existing Coverage Not Mapped

`tests/test-install-scripts.sh` already has 11 tests covering init/upgrade (idempotency, legacy migration, component-level version tracking, on-disk verification, verbose mode, unknown flags). The proposal says "partially covered" but doesn't map what's done vs what's remaining for Layer 1.

What's actually missing for Layer 1:

- **Hook unit tests** — checkpoint.js, restore-context.js, archive-context.js have zero test coverage. These are the most complex deterministic logic in the framework.
- **Token logging validation** — `logTokenUsage()` appends to JSONL but nothing validates output format, iteration counting, or deduplication logic.
- **Schema drift detection** — checkpoint.js does inline validation of handoff.json, but nothing verifies the inline checks match `schemas/handoff.schema.json`. They could drift independently.

### Gap 2: Hook Refactoring Prerequisite

The hooks are not structured as testable modules — they call `main()` at the bottom of the file with no exports. Jest/Vitest can't test individual functions without refactoring to:

```js
// Current (untestable):
function detectPhase() { ... }
function validateHandoff() { ... }
main();

// Needed:
function detectPhase() { ... }
function validateHandoff() { ... }
if (require.main === module) { main(); }
module.exports = { detectPhase, validateHandoff, ... };
```

This refactoring is a prerequisite for Layer 1 hook tests and should be called out as a first step.

### Gap 3: Layer 2 Feasibility Concerns

The Phase 1 contract test example (line 80) has issues that would prevent reliable CI use:

- **Requires a Claude API key in CI** — cost, secrets management, rate limits.
- **Non-deterministic feature naming** — the agent might name the feature `counter-widget`, `simple-counter`, or `counter`. The test hardcodes `counter-widget` in the assertion.
- **No timeout or retry logic** — LLM calls can hang or fail transiently.
- **Assumes `ajv-cli` is installed** — not in the project's dependencies.

Recommendation: distinguish between **CI tests** (fast, deterministic, free — Layer 1 only) and **local/nightly tests** (can be slow, costly — Layers 2-4). For Layer 2, pass the feature slug explicitly rather than letting the LLM derive it.

### Gap 4: Missing Cost and Frequency Guidance for Layers 3-4

Layer 3 (LLM-as-Judge) and Layer 4 (E2E) need concrete operational parameters:

| Parameter | Layer 3 | Layer 4 |
|-----------|---------|---------|
| Estimated cost per run | ~$0.10-0.30 per scenario (agent + evaluator) | ~$0.50-2.00 per full cycle |
| Expected runtime | 30-60s per scenario | 5-15 minutes |
| Recommended frequency | Nightly or pre-release | Nightly only |
| PR gate? | No | No |
| "Significantly exceeds ~63K" threshold | N/A | Define: is 80K a warning? 120K a failure? |

Without these, the layers are aspirational rather than implementable.

### Gap 5: Role Frontmatter Validation (Quick Win)

The YAML frontmatter in role files (`tools`, `disallowedTools`, `model`, `memory`) drives agent behavior but nothing validates it. A cheap deterministic test could catch:

- Missing or malformed frontmatter
- `disallowedTools` entries that aren't valid tool names
- `model` values that don't match real model IDs
- `tools` and `disallowedTools` contradictions (same tool in both lists)

This is purely structural — no LLM needed — and could be added to the Layer 1 test suite in under a day.

### Gap 6: Version Tracking and Component System

The component-level version tracking (`core=v5`, `codex=v5`), legacy migration, and on-disk verification are critical deterministic surfaces. The existing test suite covers them (11 tests), but the strategy doc should acknowledge this as a maintained Layer 1 surface.

### Feasibility Summary

| Test surface | Feasibility | Effort | Priority |
|-------------|------------|--------|----------|
| Hook unit tests (refactor + test) | High | 1-2 days | Next — highest-value deterministic coverage gap |
| Role frontmatter validation | High | Half day | Quick win — add to existing bash test suite |
| Schema drift detection | High | Half day | Compare inline validation in checkpoint.js against JSON schema |
| Layer 2 contract tests (local/nightly) | Medium | 1 day | After Layer 1 is solid. Hardcode slugs for determinism. |
| Layer 3 LLM-as-judge | Low priority | 2-3 days | Defer until Layers 1-2 are stable |
| Layer 4 E2E smoke | Low priority | 1-2 days | Nightly only. Regression safety net, not PR gate. |

### Recommendation

Implement in this order:
1. Refactor hooks to be testable (export functions, guard `main()`)
2. Write Jest/Vitest tests for checkpoint.js (phase detection, handoff validation, token logging)
3. Add role frontmatter validation to the bash test suite
4. Add schema drift detection (compare checkpoint.js inline validation against handoff.schema.json)
5. Then move to Layer 2 with a local-only contract test harness