---
description: Write failing test shells from specs (Phase 3)
user-invocable: true
---

## Skill References

| Skill | Source path |
|-------|-------------|
| tdd | skills/tdd/SKILL.md |
| verification-gate | skills/verification-gate/SKILL.md |
| invariants-audit | skills/invariants-audit/SKILL.md |

Use the qa subagent.

First, load your skills:
- Read .claude/skills/tdd/SKILL.md for test structure, naming, and coverage rules
- Read .claude/skills/verification-gate/SKILL.md for Phase 3 verification

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-sonnet-4-6.

Before reading any implementation files, run:
`node .claude/helpers/resolve-feature.cjs --command test-design --phase 3 --args "$ARGUMENTS"`

- If that command exits non-zero, stop and relay the error.
- If it succeeds, treat the returned `feature` as the only valid target for this phase.
- For the rest of this command, use that resolved feature slug in place of `$ARGUMENTS`.

Your task: write failing test shells for feature: $ARGUMENTS

Rules:
- Read ONLY: docs/features/$ARGUMENTS/prd.md + docs/features/$ARGUMENTS/architecture.md + any existing test-design review artifacts in `docs/features/$ARGUMENTS/`
- Do NOT read src/ — tests must be derived from the spec, not the implementation
- Write contract tests to: tests/contracts/$ARGUMENTS.test.ts
- Write integration tests to: tests/integration/$ARGUMENTS.integration.test.ts
- Write E2E tests to: tests/e2e/$ARGUMENTS.spec.ts
- Tests must FAIL when run right now (RED state — no implementation exists yet)
- Use the TDD skill's reliability rules: identify happy, edge, and misuse/abuse cases when relevant, and make sure the first RED failure is for the intended reason
- Cover: one test per AC, one error/empty state per screen, one permission boundary check
- Name the primary production-wiring test seam in the test plan or top-of-file comments so implementation knows which test proves the feature is wired correctly
- Follow test naming conventions from the tdd skill
- Run linter on test files before committing: `npm run lint -- tests/`
  Fix any lint errors — test files must be lint-clean even in RED state
- Integration test verification (blocking): at least one test must import the production entry point
  AND contain an assertion on visible output. Import-only shells, utility imports, or tests that call
  modules directly do not satisfy this check. This is a blocking gate — Phase 3 cannot complete without it.
- Run Phase 3 verification from verification-gate skill
- Run the tests to confirm they fail, then commit with message: "test: $ARGUMENTS failing shells (RED)"

## Review Feedback Loop

Before revising the test plan or RED shells, read any phase-relevant test-design review
artifacts already present in `docs/features/$ARGUMENTS/`, especially:
- `review-test-design-$ARGUMENTS.md`
- `review-codex-tests-$ARGUMENTS.md`

Treat those findings as the review scope unless the user explicitly broadens scope.

When you address a finding, append or refresh a `## Resolution Notes` section in each
review artifact you used. For every finding you touched, add one bullet in this shape:
- [ADDRESSED | DEFERRED | DISPUTED] <finding label or short quote> — <what changed and where, or why it remains open>

Do not delete the original findings. Later reviewers will verify these notes against
the revised test artifacts.

## Test Quality Rules

### Symmetric Testing

When the architecture explicitly enumerates components (e.g., 5 subsections, 3 artifact types, N pipeline phases), write a test for all enumerated components — not just one or two. Incomplete coverage of an explicit list is a common QA gap. If the architecture does not explicitly enumerate components, this rule does not apply.

### Behavioral Binding

Tests must bind to specific behavioral outcomes, not implementation details. Assert what the system does (visible output, state change, side effect), not how it does it internally. Behavioral binding ensures tests survive refactoring and catch real regressions.

### Negative-Pattern Testing

For every must-not constraint in the spec, write a negative assertion that verifies the forbidden pattern is absent. Negative assertions catch regressions where a removed capability is accidentally reintroduced or a safety invariant is violated.

### Adversarial Contract Testing

For each safety invariant or contract, write at least one test that verifies the invariant cannot be trivially evaded — e.g., by commenting out a check, adding an escape hatch, or replacing a constraint with a no-op. If trivial evasion passes the test suite, the contract is not meaningfully enforced.

### Artifact-Type Test Strategy

Route test strategy based on the artifact type being tested:

- **Declarative artifacts** (markdown documents, templates, schemas): use structural assertions — verify headings, required sections, field presence, and structural relationships. Content wording may change; structure must not.
- **Executable artifacts** (shell scripts, JS modules, hooks): use behavioral assertions — run the code and assert on output, exit codes, side effects. Fixture-driven tests with known inputs and expected outputs.
- **Config artifacts** (JSON schemas, settings files): use schema validation and constraint assertions — verify required fields, types, allowed values, and that invalid input is rejected.

For hybrid artifacts that combine types, the executable or config strategy takes precedence over declarative — behavioral correctness outranks structural presence.

## Artifact Wiring Verification

Before committing RED shells, verify that every skill artifact declared in `## Required Artifacts`
has a corresponding output instruction in this command's Output section — check for both the
naming pattern AND the target path. If a skill requires an artifact not yet listed in the Output
section below (e.g., integration tests from the tdd skill), add it before committing.

## Output

- Write contract tests to: tests/contracts/$ARGUMENTS.test.ts
- Write integration tests to: tests/integration/ following [feature].integration.test.* naming pattern
- Write E2E tests to: tests/e2e/$ARGUMENTS.spec.ts

After committing, write .claude/handoff.json with:
  feature: $ARGUMENTS, phase: 3, goal: "Design-time security audit",
  scope: "Phase 4 security gate only", relevant_files: ["docs/features/$ARGUMENTS/prd.md", "docs/features/$ARGUMENTS/architecture.md"],
  acceptance_criteria: [from the PRD], verification_commands: ["ls docs/features/$ARGUMENTS/security-audit.md"],
  source_spec: "docs/features/$ARGUMENTS/prd.md",
  produced_by: "qa", timestamp: current ISO 8601

Then print:
"Phase 3 complete. Next: /security-gate $ARGUMENTS"
