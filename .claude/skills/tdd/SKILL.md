---
name: tdd
description: Test-Driven Development execution — Red/Green/Refactor cycle with commit protocol
version: "1.3.0"
---

# Skill: Test-Driven Development

## Top Rules

- Never write production code before a failing test exists.
- If RED fails for the wrong reason, stop. Fix the test/setup mismatch before writing GREEN code.
- Before GREEN, name the concrete cases you are covering: happy path, edge case, and a misuse or abuse case when relevant.
- Do not optimize only for the current tests; implement a general solution for valid inputs.
- Identify the primary production-wiring test: the one that proves the feature is connected to the real runtime seam.

## TDD Cycle

```text
RED:      Run tests -> confirm they fail for the intended reason -> commit "test: [feature] failing tests"
GREEN:    Write minimum code to pass -> run tests -> all pass -> commit "feat: [feature] passing"
          Before committing GREEN, review known_risks from handoff.json (if present) and address or defer each with a rationale.
REFACTOR: Clean up -> tests still pass -> commit "refactor: [feature] cleanup"
```

Before GREEN, write one sentence for the RED failure reason.

Example case selection:
- Happy: valid token resets the password.
- Edge: token expires on the boundary second.
- Misuse/abuse: token for user A cannot reset user B's password.

## Test Structure

Use Arrange / Act / Assert and plain-English test names that describe behavior, not implementation.

## What to Test First

1. One test per acceptance criterion
2. Error and empty states from the spec
3. API contract correctness
4. Permission boundary
5. Primary production wiring
6. Most likely race condition
7. Boundary values and important edge cases
8. `[symmetric-coverage]` Symmetric requirements across all enumerated components
9. `[contract-robustness]` Contract robustness — can the safety invariant be trivially evaded?

## Three-Level Test Coverage

Every feature must have tests at three levels:

```text
Unit/Contract:  Tests modules in isolation. Existing practice.
Integration:    Calls production entry point, asserts feature effect in output.
                Naming: [feature].integration.test.{js,ts,py}
E2E:            Full system shells. Existing practice.
```

An integration test calls the production entry point (not the module directly) and asserts the feature's effect is visible in the output. A test that calls the module directly is a unit test, regardless of how many modules it touches.

Integration tests require the architecture doc to include a Call Chain or Integration Points section. If missing, the QA agent must:
1. Add a `// ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA` comment at the top of the integration test file
2. Set `known_risks: ["Missing Call Chain in arch doc — integration target chosen by QA"]` in handoff.json
Phase 3 may proceed but the gap must be explicitly recorded in both locations.

## Coverage Rules

- Aim for 100% coverage of new logic paths, including error branches.
- Never mock what you do not own.
- Tests should be readable enough to explain the feature to a new maintainer.
- For any AC referencing a real-world data type, read the production schema/type/enum definition before writing fixtures. Confirm fixture values match exactly. Do not invent stand-in shapes.
- When widening a validation constraint (e.g., enum → string), list degenerate values now admitted and add a test for each. Minimum required set: empty string, whitespace-only, and max-length boundary.

## Property-Based Testing

Use selectively for data transformations, mathematical properties, validation logic, or hard constraints. Write example-based tests first; if PBT finds a failure, add it back as a named example-based test.

## Required Artifacts

| Artifact | Pattern | Path | Condition |
|----------|---------|------|-----------|
| Integration test | [feature].integration.test.* | tests/integration/ | Always — every feature must have an integration test at the production entry point |

## Anti-Patterns

- Testing implementation details instead of outcomes
- Happy-path-only coverage
- Flaky tests
- Skipped tests to fake green
- Fake RED states caused by bad setup or unrelated failures
- One-off implementations that only satisfy today's test inputs

[See reference: .claude/skills/tdd/test-quality-rules.md]

## Session Discipline

- Start a fresh session for each feature or each day
- If context reaches 60%, run `/compact`
- If you need more than 10 files, split the task

## Commit Messages

```text
test: [feature] failing tests
feat: [feature] passing
refactor: [feature] cleanup
fix: [feature] [what was broken]
```

---
**STOP CONDITIONS (end of file):**
- Never write production code before a failing test exists.
- If RED fails for the wrong reason, stop and fix the mismatch before writing GREEN code.
- Never skip or remove a test to make the suite pass.
- Do not commit GREEN if lint or typecheck fails.
