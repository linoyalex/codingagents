# Automated Testing Strategy for `codingagents` (Revised)

## Purpose

`codingagents` mixes two very different classes of behavior:

- **Deterministic framework infrastructure**: shell scripts, hooks, schemas, role metadata, file layout
- **Probabilistic agent behavior**: prompt adherence, review quality, implementation quality, refusal behavior

A practical testing strategy must treat these separately. The framework should first prove that its **deterministic plumbing** works reliably and cheaply in CI. Only after that should it add **LLM-dependent contract and evaluation tests** that are slower, costlier, and less stable.

This revised strategy keeps the original 4-layer structure, but makes it implementation-ready for the current repository.

---

## Guiding Principles

1. **Fast deterministic tests are the PR gate.**
   Shell scripts, hooks, schemas, metadata, and file layout should be testable without network access or API keys.

2. **LLM-dependent tests are local or nightly.**
   Anything requiring Claude/Codex execution should not block ordinary pull requests.

3. **Prefer single-source-of-truth validation over drift-detection tests.**
   If hook validation and JSON schema can be unified, that is better than merely testing that two duplicated validators still match.

4. **Add coverage in order of failure cost.**
   Broken install/upgrade scripts and broken hooks are higher-risk than review-quality regressions.

---

## Current State

The repo already has meaningful Layer 1 coverage:

- [`tests/test-install-scripts.sh`](../../tests/test-install-scripts.sh)
  Covers deterministic behavior of:
  - `init.sh`
  - `upgrade.sh`
  - legacy version migration
  - component-level version tracking (`core=v5`, `codex=v5`)
  - Codex optional install behavior
  - idempotent reruns
  - unknown flag rejection
  - verbose mode output
  - on-disk verification of installed files and directories

What is still missing:

- unit-style coverage for `hooks/checkpoint.js`
- unit-style coverage for `hooks/restore-context.js`
- unit-style coverage for `hooks/archive-context.js`
- validation of role frontmatter structure and permissions metadata
- validation that hook handoff validation and `schemas/handoff.schema.json` do not diverge

---

## Layer 1: Deterministic Infrastructure Tests

## Goal

Ensure the framework works correctly without involving any LLMs.

## Scope

- install/upgrade scripts
- migrations
- hooks
- schemas
- role frontmatter
- file layout / runtime artifacts

## Recommended Tooling

Use the tools already natural to this repo:

- **Shell test runner** for shell scripts
  - Keep and extend [`tests/test-install-scripts.sh`](../../tests/test-install-scripts.sh)
  - Optionally migrate later to Bats, but not required now
- **Built-in `node:test`** for hook tests
  - Prefer Node’s standard test runner over Jest/Vitest
  - Rationale: this repo has Node scripts but no JS package/test-toolchain yet

## Immediate Work Items

### 1. Maintain and extend install/upgrade tests

Keep shell-based functional coverage for:

- fresh `init.sh` install
- `init.sh --codex`
- rerun/idempotency
- legacy version migration
- upgrade of core only
- upgrade/install of Codex only
- upgrade of core + Codex together
- version-file migration from legacy single-line format
- verbose mode
- unknown flag rejection

### 2. Refactor hooks to be testable

This is a prerequisite for hook coverage.

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

Apply this to all three hooks:

- `hooks/checkpoint.js`
- `hooks/restore-context.js`
- `hooks/archive-context.js`

### 3. Add `node:test` coverage for hooks

#### `checkpoint.js`

Test:

- valid `handoff.json` passes
- missing handoff fails
- malformed JSON fails
- missing required fields fail
- unexpected properties fail
- feature-scoped phase detection works
- token log entry format is correct
- iteration counting increments correctly
- checkpoint output is written as expected

#### `restore-context.js`

Test:

- valid handoff restores formatted session context
- archived turns are used when handoff is absent
- session-state file is written with expected fields
- malformed handoff/archive inputs fail gracefully

#### `archive-context.js`

Test:

- token snapshot entry is appended
- transcript scoring/selection behaves predictably
- archive file is created and merged correctly
- malformed stdin/session payload fails non-blockingly

### 4. Add role frontmatter validation

This is a high-value, cheap deterministic check.

Validate every `ROLE_*.md` file for:

- required frontmatter exists
- YAML is parseable
- `model` field is present and valid
- `tools` / `disallowedTools` structure is valid
- no contradiction where the same tool is both allowed and disallowed
- read-only roles do not accidentally gain write/edit capability

### 5. Address schema drift risk

There are two acceptable approaches, in this order of preference:

#### Preferred

Use a shared validation source in `checkpoint.js`, derived from `schemas/handoff.schema.json` or a common validation module.

#### Acceptable short-term fallback

Add a deterministic test that compares the inline validation behavior in `checkpoint.js` to the schema expectations in `schemas/handoff.schema.json`.

---

## Layer 2: Artifact and Contract Tests

## Goal

Validate pipeline artifacts and handoff boundaries using real agent runs, but keep them out of normal PR gating.

## Status

**Local or nightly only. Not a PR gate.**

## Why

These tests require:

- API credentials
- non-zero token spend
- longer runtime
- tolerance for transient LLM failures

## Recommended Approach

Use temporary throwaway target repos bootstrapped by `init.sh`, then invoke one pipeline phase at a time with explicit inputs.

Key design rules:

- pass the feature slug explicitly whenever possible
- set timeouts
- record logs/artifacts for debugging
- treat retries as part of the harness, not the test logic
- validate output artifacts, not exact wording

## First Realistic Layer 2 Scenario

### Phase 1 Contract Test

Test objective:

- a single-shot `/specify` run creates:
  - `docs/features/<feature>/prd.md`
  - `.claude/handoff.json`
- handoff validates against schema
- PRD contains required structural sections

### Harness requirements

Before invoking Claude, bootstrap a temp repo with:

- `.claude/agents/`
- `.claude/commands/`
- `.claude/skills/`
- `.claude/helpers/`
- `.claude/schemas/`
- `CLAUDE.md`
- `docs/features/`

The easiest way to satisfy this is:

1. create temp repo
2. run `bash /path/to/codingagents/init.sh`
3. invoke the phase under test

### Important constraint

Do **not** let the test depend on the model choosing a particular slug implicitly. Either:

- prompt with the exact slug expected, or
- discover the created feature directory dynamically before asserting

## Future Layer 2 Scenarios

- Phase 2 creates `architecture.md` with expected sections
- Phase 3 creates contract/E2E tests for the chosen feature slug
- Phase 4 creates `security-audit.md`
- Phase 6 creates `review.md`
- role-specific artifact checks for minimum required structure

## Not Recommended Yet

- asserting exact text
- asserting “agent never used tool X” unless a reliable tool-call capture harness exists

For now, treat tool constraints as a Layer 1 metadata/policy test, not a runtime artifact test.

---

## Layer 3: Behavioral Evaluations

## Goal

Evaluate probabilistic outputs against important framework constraints.

## Status

**Deferred until Layer 1 is solid and at least one Layer 2 scenario is stable.**

## Recommended Tools

Any evaluator framework is acceptable:

- Promptfoo
- Braintrust
- custom scripts

Tool choice matters less than disciplined scope.

## Candidate Scenarios

- developer is asked to violate a hard architectural constraint; success means refusal or correction
- security reviewer is given an architecture doc with a deliberate OWASP-style issue; success means the issue is flagged
- code reviewer sees a diff with a hardcoded secret; success means a `BLOCKING` finding

## Operational Guidance

| Parameter | Recommendation |
|---|---|
| Cost per run | Small, bounded scenario sets only |
| Runtime | Expect tens of seconds per scenario |
| Frequency | Nightly or pre-release |
| PR gate | No |

These tests are most useful once deterministic failures are already rare.

---

## Layer 4: End-to-End Smoke Pipeline

## Goal

Run a full representative feature cycle as an integration safety net.

## Status

**Nightly only. Not a PR gate.**

## Why

A full cycle is:

- costly
- slow
- operationally fragile
- difficult to debug when several phases fail at once

That makes it appropriate as a regression canary, not as routine developer feedback.

## Candidate Workflow

1. bootstrap a temp repo with `init.sh`
2. run `/specify`
3. run `/architect`
4. run `/test-design`
5. optionally stop before `/implement` if no target app exists
6. validate:
   - expected artifacts exist
   - handoffs validate
   - token log is produced
   - checkpoint advances sensibly

## Important note

Because `codingagents` is a framework repo, not an application repo, a full `/implement` + compile/test cycle is only meaningful inside a dedicated fixture project. The strategy should explicitly use a **fixture app** for any full-cycle E2E run.

## Budget Guidance

Do not use a vague threshold like “significantly exceeds ~63K.”

Instead:

- define a warning threshold
- define a fail threshold
- version those thresholds alongside the test harness

Example:

- warning: > 90K tokens
- failure: > 120K tokens

These numbers should be revised after collecting real baseline data.

---

## CI vs Local/Nightly Split

## PR Gate

Only deterministic checks should block PRs:

- shell functional tests
- hook tests
- frontmatter validation
- schema consistency checks

## Local / Nightly

- single-phase contract tests using real LLM runs
- behavioral evaluations
- end-to-end pipeline smoke tests

This split keeps routine contribution workflows fast, cheap, and reliable.

---

## Recommended Implementation Order

1. **Keep Layer 1 shell coverage as the install/upgrade backbone**
   - continue extending [`tests/test-install-scripts.sh`](../../tests/test-install-scripts.sh)

2. **Refactor hooks to be importable/testable**
   - all three hooks, not just `checkpoint.js`

3. **Add `node:test` coverage for hooks**
   - phase detection
   - handoff validation
   - token logging
   - archive/restore behavior

4. **Add role frontmatter validation**
   - cheap, deterministic, high-value

5. **Reduce schema drift risk**
   - shared validator preferred
   - comparison test acceptable as intermediate step

6. **Add one Layer 2 scenario**
   - Phase 1 contract test only
   - local/nightly only

7. **Add Layer 3 and Layer 4 only after Layers 1-2 are stable**

---

## Feasibility Summary

| Test Surface | Feasibility | Effort | Priority |
|---|---|---|---|
| Install/upgrade shell tests | High | Already underway | Maintain |
| Hook refactor for testability | High | 0.5-1 day | Immediate |
| Hook tests with `node:test` | High | 1-2 days | Next |
| Role frontmatter validation | High | 0.5 day | Quick win |
| Schema drift reduction/checking | High | 0.5 day | Quick win |
| Layer 2 single-phase contract test | Medium | 1 day | After Layer 1 |
| Layer 3 behavioral evals | Medium | 2-3 days | Later |
| Layer 4 nightly E2E smoke | Medium | 1-2 days | Later |

---

## What Success Looks Like

After the next testing milestone, the repo should have:

- robust deterministic coverage for install/upgrade scripts
- robust deterministic coverage for all hooks
- structural validation for role metadata and handoff schema behavior
- one real artifact-contract test that proves a phase boundary works end-to-end

That would provide meaningful regression protection without prematurely building a heavy evaluation stack.

---

## Review Feedback (2026-04-03)

### Overall Assessment

v2 is significantly improved over v1 and is implementable as-is. The CI vs nightly split is explicit, `node:test` is the right tooling call, existing coverage is properly mapped, and Layer 2/4 have concrete operational parameters. The gaps below are refinements, not blockers.

### Gap 1: Command and Skill Frontmatter Validation

The doc calls out role frontmatter (ROLE_*.md) but two other file types have YAML frontmatter that should be validated in the same pass:

- **Commands** (`commands/*.md`) — `description` (required, string), `user-invocable` (required, boolean)
- **Skills** (`skills/*/SKILL.md`) — `name`, `description`, `version` (all required strings)

Same cheap structural test, same Layer 1 priority. If we're validating role metadata, commands and skills should be in scope.

### Gap 2: Artifact-vs-Handoff Phase Authority Test Case

The hook test list for `checkpoint.js` is missing the bug class we just fixed: `phaseFromHandoff()` taking priority over `detectPhase()` when artifacts exist. A stale-but-valid handoff could report the wrong phase.

Add to the checkpoint.js test list:
- artifact-based detection takes priority over handoff.phase when both are present
- stale handoff (phase 2) with phase 4 artifacts on disk returns phase 4, not phase 2
- handoff.phase is only used as fallback when detectPhase returns phase 0

### Gap 3: Shell `pipefail` Interaction Testing

We hit a real production bug where `get_component_version` crashed under `set -euo pipefail` because `grep` in a pipeline returns exit 1 on no match. The Layer 1 shell tests should explicitly cover:

- Functions that return empty strings when a key is missing (no crash under pipefail)
- Functions that operate on missing files (no crash under errexit)
- Functions that handle version files with no matching component entry

These are where real bugs hide in bash scripts with strict error modes. The existing test suite exercises the happy paths but not the empty-result edge cases directly.

### Gap 4: Tool Constraint Verification in Layer 2

The "Not Recommended Yet" section dismisses tool-call constraint testing, but tool constraints (`disallowedTools`) are a core safety property. If the `security-reviewer` writes a file, or the `code-reviewer` edits code, that's a serious failure.

A practical approach that requires no LLM judge:

1. Snapshot the working tree before the agent run (`git status --porcelain`)
2. Run the agent
3. Diff the working tree after
4. For read-only roles, assert no new/modified files outside expected output paths

This is deterministic file-system checking, not behavioral evaluation. It belongs in Layer 2 as a standard post-run assertion.

### Gap 5: Schema Drift — Concrete Unification Path

The preferred approach says "derive from schema or a common validation module" but doesn't say how. The practical path:

```js
// In checkpoint.js, replace hardcoded field checks with:
const schema = require('./schemas/handoff.schema.json');
const required = schema.required;  // ['feature', 'phase', 'goal', ...]
const properties = schema.properties;

// Validate required fields
const missing = required.filter(f => !(f in handoff));

// Validate types from schema.properties[field].type
for (const [field, def] of Object.entries(properties)) {
  if (field in handoff && typeof handoff[field] !== def.type) { ... }
}
```

This eliminates drift entirely — there's one source of truth. The schema is already available at runtime via `require()` since it's a JSON file. The test then only needs to verify that checkpoint.js loads the schema (not that it reimplements it).

### Gap 6: `restore-context.js` Graceful Failure Definition

The test list says "malformed handoff/archive inputs fail gracefully" but doesn't define what graceful means. Specify the expected behavior:

- Exit code 0 (non-blocking — a broken handoff should not prevent session start)
- Fall back to archived turns if handoff is malformed
- Log a warning to stderr (not stdout, to avoid polluting agent context)
- Still write `.claude/.session-state.json` with defaults

Without this, test authors won't know what to assert.

### Gap 7: Codex Layer Coverage

The Codex reviewer prompts, templates, and scripts are framework files but appear in no test layer. At minimum:

**Layer 1 (deterministic):**
- Reviewer .md files exist and contain expected sections (`## Primary Inputs`, `## Output Format`, `## Severity`)
- `log-usage.sh` and `report-usage.sh` pass `shellcheck` or at least `bash -n` syntax check
- Templates (`review-brief.json`, `review-output.md`) exist and parse correctly

**Layer 2 (artifact):**
- `log-usage.sh` correctly appends a JSONL entry with expected fields
- `report-usage.sh` produces parseable output given a known token-usage.jsonl fixture

### Priority Adjustment

Based on these gaps, the recommended implementation order becomes:

1. Refactor hooks to be importable/testable (unchanged)
2. Add `node:test` coverage for hooks — **include artifact-vs-handoff priority tests**
3. Add frontmatter validation for roles, commands, **and skills**
4. Unify schema validation in checkpoint.js to load from JSON schema directly
5. Add pipefail edge case tests to shell test suite
6. Add one Layer 2 scenario with **file-modification assertions for read-only roles**
7. Add Codex layer structural validation
8. Layer 3 and 4 after all above are stable
