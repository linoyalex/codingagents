# Automated Testing Strategy for `codingagents` (v3)

## Purpose

`codingagents` combines:

- **Deterministic framework infrastructure**
  - shell scripts
  - hook scripts
  - schemas
  - frontmatter metadata
  - file layout and runtime artifacts
- **Probabilistic agent behavior**
  - prompt adherence
  - review quality
  - implementation quality
  - refusal and constraint-following behavior

The testing strategy must reflect that split. The framework should first prove that its deterministic plumbing works reliably, cheaply, and repeatably in CI. LLM-dependent tests should come later, run less often, and never be mistaken for a substitute for deterministic coverage.

---

## Core Principles

1. **PR gates should be deterministic.**
   Infrastructure regressions should be caught without API keys, model availability, or token cost.

2. **LLM-driven tests should be local or nightly.**
   They are useful, but slower, costlier, and more fragile.

3. **Prefer eliminating drift over testing for drift.**
   If two validators can be unified into one source of truth, do that instead of permanently maintaining duplicate logic plus a drift test.

4. **Test the highest-risk failures first.**
   Broken install/upgrade scripts and broken hooks are more dangerous than evaluator-quality gaps.

---

## Current Coverage

The repository already has meaningful deterministic coverage in:

- [`tests/test-install-scripts.sh`](../../tests/test-install-scripts.sh)

That suite covers:

- `init.sh` fresh install
- `init.sh --codex`
- rerun/idempotency behavior
- legacy version migration
- core upgrade
- Codex-only install/upgrade
- combined core + Codex upgrade
- legacy single-line version-file migration
- verbose mode
- unknown flag rejection
- on-disk verification of installed files/directories

What remains uncovered:

- hook logic in:
  - `hooks/checkpoint.js`
  - `hooks/restore-context.js`
  - `hooks/archive-context.js`
- frontmatter validation for:
  - role files
  - command files
  - skill files
- schema/validation drift risk
- Codex-layer structural validation

---

## Layer 1: Deterministic Infrastructure Tests

## Goal

Validate the framework plumbing without running any LLMs.

## Scope

- `init.sh`
- `upgrade.sh`
- migrations
- hooks
- JSON schema
- frontmatter-bearing framework files
- Codex-layer scripts/templates/prompts

## Tooling

Use tools that fit the current repo with minimal overhead:

- **Shell-based functional tests**
  - keep and extend [`tests/test-install-scripts.sh`](../../tests/test-install-scripts.sh)
- **Built-in `node:test`**
  - preferred for hook tests
  - avoids introducing Jest/Vitest and a JS package toolchain solely for framework tests
- **Optional static shell validation**
  - `bash -n` at minimum
  - `shellcheck` if adopted later

---

## Layer 1A: Install and Upgrade Script Coverage

## Goal

Ensure the install and upgrade surfaces remain safe and predictable.

## Keep Existing Coverage

Maintain the current shell suite for:

- fresh install
- optional Codex install
- rerun/idempotency
- legacy migration
- component-level version tracking
- no-op upgrade detection
- codex reinstall when version metadata exists but files are missing
- verbose mode
- unknown flag rejection

## Add Missing Script Edge Cases

The next additions should target strict-shell-mode bugs:

- functions that return an empty result under `set -euo pipefail` must not crash
- missing version-file keys must not crash
- missing files must be handled safely where expected
- version helper functions should return empty values cleanly when a component is absent

This is important because these are the exact kinds of bugs that appear in production bash under `pipefail`.

---

## Layer 1B: Hook Refactor for Testability

## Goal

Make hook logic importable and unit-testable.

## Required Refactor

Current pattern:

```js
function detectPhase() { ... }
main();
```

Target pattern:

```js
function detectPhase() { ... }

if (require.main === module) {
  main();
}

module.exports = {
  detectPhase,
  validateHandoff,
  logTokenUsage,
  main,
};
```

Apply this to all hooks:

- `hooks/checkpoint.js`
- `hooks/restore-context.js`
- `hooks/archive-context.js`

This is the first prerequisite for any meaningful hook test coverage.

---

## Layer 1C: Hook Tests with `node:test`

## `checkpoint.js`

Test:

- valid `handoff.json` passes
- missing handoff fails
- malformed JSON fails
- missing required fields fail
- unexpected properties fail
- token log entry shape is correct
- iteration counting increments correctly
- checkpoint file is written correctly

### Critical phase-authority tests

This bug class must be explicitly covered:

- artifact-based phase detection takes priority over `handoff.phase` when artifacts exist
- stale handoff (for example phase 2) plus later artifacts on disk yields the artifact-derived phase
- `handoff.phase` is used only as fallback when artifact detection returns phase 0

This protects the exact class of regression already seen in the repo.

## `restore-context.js`

Test:

- valid handoff produces the expected formatted context block
- archive fallback is used when handoff is absent
- session-state file is written
- malformed handoff and malformed archive inputs fail gracefully

### Define “fail gracefully”

For `restore-context.js`, graceful failure means:

- exit code `0`
- warning goes to `stderr`, not `stdout`
- archived turns are used if available
- `.claude/.session-state.json` is still written with defaults

Without this definition, the tests are underspecified.

## `archive-context.js`

Test:

- token snapshot entry is appended
- transcript scoring/selection behaves predictably
- archive file is created
- existing archive and new turns merge correctly
- malformed stdin/session payload does not hard-fail the hook

---

## Layer 1D: Metadata and Frontmatter Validation

## Goal

Catch structural metadata regressions cheaply.

## Validate Role Frontmatter

For every `ROLE_*.md`:

- frontmatter exists
- YAML parses
- required fields exist
- `model` values are valid/recognized
- `tools` and `disallowedTools` are structurally valid
- no contradiction where the same tool is both allowed and disallowed
- read-only roles do not accidentally gain write/edit capabilities

## Validate Command Frontmatter

For every `commands/*.md`:

- frontmatter exists
- YAML parses
- `description` exists and is a string
- `user-invocable` exists and is a boolean

## Validate Skill Frontmatter

For every `skills/*/SKILL.md`:

- frontmatter exists
- YAML parses
- `name`, `description`, and `version` exist
- values are strings

This is a cheap extension of the same deterministic validation pass and should be part of Layer 1, not deferred.

---

## Layer 1E: Schema Validation and Drift Prevention

## Goal

Ensure handoff validation logic does not drift from the schema.

## Preferred Approach

Unify validation so `checkpoint.js` loads and derives from `schemas/handoff.schema.json` directly, or from a shared validation module built from that schema.

Practical direction:

```js
const schema = require('../schemas/handoff.schema.json');
const required = schema.required;
const properties = schema.properties;
```

Then derive:

- required fields
- allowed properties
- type expectations
- numeric constraints where practical

## Short-Term Fallback

If unification is not done immediately, add a deterministic test that compares `checkpoint.js` validation behavior against `schemas/handoff.schema.json`.

But the long-term goal should be **removing duplicate sources of truth**, not permanently testing duplicated logic.

---

## Layer 1F: Codex Layer Deterministic Coverage

## Goal

Validate the optional Codex review layer as framework infrastructure.

## Structural Checks

Test that:

- reviewer files exist
- templates exist
- `log-usage.sh` and `report-usage.sh` exist and are executable
- reviewer files contain required sections such as:
  - `## Primary Inputs`
  - `## Output Format`

Note:
Do not overfit these content checks to exact prose. Validate structure, not wording.

## Script Checks

At minimum:

- `bash -n codex/log-usage.sh`
- `bash -n codex/report-usage.sh`

Optional later:

- `shellcheck` on both scripts

## Fixture-Based Checks

With a known token log fixture:

- `codex/log-usage.sh` appends valid JSONL
- `codex/report-usage.sh` produces parseable summary output

These are deterministic and belong in Layer 1 or 1.5, not in LLM evaluation layers.

---

## Layer 2: Artifact and Contract Tests

## Goal

Validate pipeline boundaries using real agent runs.

## Status

**Local or nightly only. Not a PR gate.**

## Why

These tests require:

- API credentials
- token spend
- timeouts/retries
- tolerance for transient failures

## Approach

Use temporary throwaway target repos bootstrapped by `init.sh`, then invoke one phase at a time with explicit inputs.

## Rules for Layer 2

- use a temp repo per run
- bootstrap with `init.sh`
- set timeouts
- capture stdout/stderr/logs
- record artifacts for debugging
- avoid exact-text assertions
- avoid relying on implicit slug derivation when possible

## First Scenario: Phase 1 Contract Test

Validate that a `/specify` run produces:

- `docs/features/<feature>/prd.md`
- `.claude/handoff.json`

Then assert:

- handoff validates against schema
- PRD contains required structural sections

## Read-Only Role Post-Run Assertions

Tool-call capture is not required to test one important safety property.

For read-only roles, use deterministic filesystem assertions:

1. snapshot working tree before the run
2. run the role
3. diff the working tree after
4. assert no modifications outside expected output paths

This belongs in Layer 2 because it validates the artifact effects of a real run without requiring an evaluator model.

Example roles:

- `security-reviewer`
- `code-reviewer`

## Future Layer 2 Scenarios

- Phase 2 architecture artifact contract
- Phase 3 test-design artifact contract
- Phase 4 security-audit artifact contract
- Phase 6 review artifact contract

---

## Layer 3: Behavioral Evaluations

## Goal

Evaluate probabilistic outputs against important constraints and expected reviewer behavior.

## Status

**Deferred until Layer 1 is solid and at least one Layer 2 scenario is stable.**

## Candidate Scenarios

- developer is prompted toward a forbidden architecture shortcut and must refuse/correct
- security reviewer is given a document with a deliberate OWASP-style flaw and must flag it
- code reviewer is given a diff with a hardcoded secret and must mark it `BLOCKING`

## Operational Guidance

| Parameter | Recommendation |
|---|---|
| Cost per run | Small, bounded scenario set |
| Runtime | Tens of seconds per scenario |
| Frequency | Nightly or pre-release |
| PR gate | No |

These are useful only after deterministic failures are mostly under control.

---

## Layer 4: End-to-End Smoke Pipeline

## Goal

Use a full representative feature cycle as an integration canary.

## Status

**Nightly only. Not a PR gate.**

## Important Constraint

Because `codingagents` is a framework repo, not an application repo, full `/implement` validation only makes sense inside a **fixture app**.

So the E2E harness should run against:

- a dedicated fixture application
- or a tiny synthetic project designed for pipeline execution

## Candidate Workflow

1. bootstrap fixture project with `init.sh`
2. run `/specify`
3. run `/architect`
4. run `/test-design`
5. continue into later phases only if the fixture app supports meaningful implementation/testing
6. validate:
   - expected artifacts exist
   - handoffs validate
   - checkpoints advance sensibly
   - token logs are produced

## Budget Guidance

Avoid vague assertions like “significantly exceeds ~63K.”

Instead define explicit thresholds, for example:

- warning: `> 90K`
- failure: `> 120K`

Those thresholds should be versioned alongside the harness and recalibrated after collecting real baseline data.

---

## CI vs Nightly Split

## PR Gate

Only deterministic checks should block PRs:

- install/upgrade shell tests
- hook tests
- metadata/frontmatter validation
- schema consistency/unification checks
- Codex deterministic structural checks

## Local or Nightly

- single-phase contract tests with real LLM runs
- read-only role post-run filesystem assertions
- behavioral evaluations
- E2E smoke pipeline runs

This keeps PR feedback fast and reliable while still enabling deeper regression protection out of band.

---

## Recommended Implementation Order

1. Extend the shell test suite for strict-shell edge cases
2. Refactor all hooks to be importable/testable
3. Add `node:test` coverage for hooks, including artifact-vs-handoff phase authority
4. Add frontmatter validation for roles, commands, and skills
5. Unify schema validation in `checkpoint.js` against the JSON schema
6. Add deterministic Codex-layer structural/script validation
7. Add one Layer 2 scenario:
   - Phase 1 contract test
   - plus read-only role filesystem assertions where practical
8. Add Layer 3 only after Layers 1-2 are stable
9. Add Layer 4 nightly smoke only after a fixture app exists

---

## Feasibility Summary

| Test Surface | Feasibility | Effort | Priority |
|---|---|---|---|
| Install/upgrade shell tests | High | Already underway | Maintain |
| Shell strict-mode edge-case coverage | High | 0.5 day | Immediate |
| Hook refactor for testability | High | 0.5-1 day | Immediate |
| Hook tests with `node:test` | High | 1-2 days | Next |
| Frontmatter validation | High | 0.5 day | Quick win |
| Schema unification | High | 0.5-1 day | Quick win |
| Codex deterministic validation | High | 0.5-1 day | Quick win |
| Layer 2 single-phase contract test | Medium | 1 day | After Layer 1 |
| Layer 3 behavioral evals | Medium | 2-3 days | Later |
| Layer 4 nightly E2E smoke | Medium | 1-2 days plus fixture app | Later |

---

## What Success Looks Like

After the next milestone, the repository should have:

- robust deterministic coverage for install/upgrade scripts
- robust deterministic coverage for all hooks
- structural validation for roles, commands, skills, and Codex assets
- reduced or eliminated schema drift risk
- one real artifact-contract test proving a phase boundary works

That would give the framework meaningful regression protection without prematurely building a large, expensive evaluation system.

---

## Architect Review (2026-04-03)

### Overall Assessment

v3 is ready to implement. The 6 sub-layers (1A-1F) are well-scoped, the implementation order is correct, and the CI/nightly split is unambiguous. This is the version to build from.

The feedback below applies a Pareto filter: what 20% of this plan covers 80% of real failure risk, and what should be cut or deferred to keep the testing investment proportional to the framework's current maturity.

### What to build now (high ROI)

#### 1. Hook refactoring (Layer 1B) — do first, unblocks everything

checkpoint.js is 359 lines, restore-context.js is 152, archive-context.js is 138. The refactor is mechanical — add `if (require.main === module)` guard and `module.exports`. Half a day, no risk.

One thing the proposal misses: **archive-context.js uses regex-based importance scoring** (`IMPORTANCE_SIGNALS` array with patterns like `/BLOCKING|CRITICAL/i`). That scoring logic is a silent regression risk — if someone changes the pattern strings, archived context quality degrades invisibly. The `scoreText()` function is the one function in archive-context.js worth unit-testing immediately, even if the rest of that hook's test suite is deferred.

#### 2. checkpoint.js tests (Layer 1C) — highest-value hook coverage

This hook has the most logic (359 lines), the most bug history (three bugs fixed in a single session), and the most failure modes. The v3 test list is good, but for the first pass reduce scope to just:

- Handoff validation: valid, missing, malformed, missing fields — 4 tests
- Artifact-vs-handoff phase authority — 3 tests
- Token log entry shape — 1 test

That's 8 tests covering the highest-risk functions. Defer iteration counting and checkpoint file assertions initially — they're lower-risk and can be added in a follow-up pass.

#### 3. Frontmatter validation (Layer 1D) — quick win, ship with hook refactoring

The proposal lists 15+ assertions across roles, commands, and skills. Apply Pareto:

- Validate YAML parses in every `ROLE_*.md`, `commands/*.md`, and `skills/*/SKILL.md` — catches typos
- Validate `model` field in roles matches known model IDs — catches the costliest mistake (wrong model tier bills at Opus rates)
- Validate `disallowedTools` doesn't overlap with `tools` — catches safety violations

Skip the string-type checks on description/version fields. If the YAML parses, those are fine.

#### 4. Schema unification (Layer 1E) — eliminate the drift, don't test for it

The v3 proposal correctly says "prefer eliminating drift over testing for drift." The `require()` approach is simple and correct. Ship this with the hook refactor — it's a code improvement, not a test. Once checkpoint.js loads validation rules from the JSON schema, the drift problem is gone permanently.

### What to defer (low ROI right now)

#### 5. restore-context.js and archive-context.js full test suites

These hooks are simpler and have had zero bugs. The graceful-failure definition for restore-context.js is good and should be documented as the spec, but writing 8+ tests for it now is premature. The one exception: test `scoreText()` in archive-context.js because it's the only pure function with non-obvious behavior and silent degradation risk.

#### 6. Codex layer structural validation (Layer 1F)

The Codex layer is explicitly "optional" and "advisory." The reviewer .md files are static prompts that change rarely. `bash -n` on the shell scripts is a fine one-liner in the existing test suite, but building fixture-based JSONL tests for `log-usage.sh` and `report-usage.sh` is over-investment for scripts that are invoked manually. Defer until the Codex layer sees more active development (e.g., the model-agnostic review framework).

#### 7. Layer 2 artifact contract tests

The proposal says "after Layer 1 is solid" which is correct. More specifically: add a Layer 2 test only when you experience a real phase-boundary failure that Layer 1 wouldn't have caught. Building the harness speculatively means maintaining a temp-repo-bootstrapping, timeout-handling, artifact-snapshotting test runner for a failure mode that hasn't happened yet.

Exception: the read-only role filesystem assertion idea is genuinely clever and low-cost. If any Layer 2 test gets built first, make it that one — not the Phase 1 contract test.

#### 8. Layers 3 and 4 — not for v5

Correct to defer. The framework is still evolving rapidly (25+ files changed structurally in a single session). Behavioral evaluations against a moving target produce noise, not signal. Revisit after the doc structure and hook interfaces stabilize for at least one full feature cycle.

### What's missing from v3

#### Gap 1: A test runner entry point

The proposal describes what to test but never defines how to run the full suite. There should be a single command:

```bash
# Run all deterministic tests (PR gate)
bash tests/run-all.sh
```

That script runs `test-install-scripts.sh`, then `node --test tests/hooks/`, then the frontmatter validator. Without this, the tests exist but nobody runs them consistently. This is the difference between "we have tests" and "we run tests."

#### Gap 2: How to handle `process.cwd()` dependency in hooks

All three hooks use `process.cwd()` to find `.claude/`, `docs/features/`, etc. The tests need to run against temp directories, not the real repo. The refactor should make testable functions accept a `cwd` parameter (or the tests should `process.chdir()` into a temp dir before each test). This is a design decision that affects every hook test — it should be decided once, not ad-hoc per test file.

Recommended approach: pass `cwd` as a parameter to exported functions, default to `process.cwd()` for backward compatibility:

```js
function detectPhase(cwd = process.cwd()) {
  const featurePath = path.join(cwd, 'docs', 'features', feature);
  // ...
}
```

This keeps the hooks working identically when invoked as scripts, while making them testable against arbitrary temp directories.

#### Gap 3: `IMPORTANCE_SIGNALS` in archive-context.js

These regex patterns (`/BLOCKING|CRITICAL/i`, `/architecture|pattern|constraint/i`) determine what context survives compaction. If someone changes them, context quality degrades silently with no test failure. This should be in the "build now" list, not deferred with the rest of archive-context.js.

### Revised Pareto implementation order

| Step | What | Effort | Covers |
|------|------|--------|--------|
| 1 | Hook refactor (all 3 hooks: guard `main()`, add exports, accept `cwd` param) | 0.5 day | Unblocks all hook tests |
| 2 | Schema unification (checkpoint.js loads from JSON schema) | 0.5 day | Eliminates drift permanently |
| 3 | checkpoint.js tests (8 tests: validation + phase authority) | 1 day | Covers the buggiest code |
| 4 | Frontmatter validation (YAML parse + model + tool contradictions) | 0.5 day | Catches typos and safety violations |
| 5 | `scoreText()` test for archive-context.js | 0.5 day | Protects context quality |
| 6 | `tests/run-all.sh` entry point | 0.25 day | Makes the suite runnable |
| **Total** | | **~3 days** | **~80% of failure risk covered** |

Everything else (restore-context.js full suite, Codex structural checks, Layer 2 harness, Layers 3-4) waits until after the next feature cycle proves these tests catch real regressions. If they don't catch anything, that's signal too — it means the framework is more stable than assumed and the deferred layers may not be worth building at all.
