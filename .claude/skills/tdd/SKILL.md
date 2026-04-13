---
name: tdd
description: Test-Driven Development execution — Red/Green/Refactor cycle with commit protocol
version: "1.2.0"
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

## Coverage Rules

- Aim for 100% coverage of new logic paths, including error branches.
- Never mock what you do not own.
- Tests should be readable enough to explain the feature to a new maintainer.

## Property-Based Testing

Use selectively for data transformations, mathematical properties, validation logic, or hard constraints. Write example-based tests first; if PBT finds a failure, add it back as a named example-based test.

## Anti-Patterns

- Testing implementation details instead of outcomes
- Happy-path-only coverage
- Flaky tests
- Skipped tests to fake green
- Fake RED states caused by bad setup or unrelated failures
- One-off implementations that only satisfy today's test inputs

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
