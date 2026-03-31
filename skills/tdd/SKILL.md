---
name: tdd
description: Test-Driven Development execution — Red/Green/Refactor cycle with commit protocol
version: "1.0.0"
---

# Skill: Test-Driven Development

## TDD Cycle (enforce this exact sequence)

```
RED:      Run tests → confirm they ALL fail → commit "test: [feature] failing tests"
GREEN:    Write MINIMUM code to pass → run tests → all pass → commit "feat: [feature] passing"
REFACTOR: Clean up → tests still pass → commit "refactor: [feature] cleanup"
```

**Critical rules:**
- Never write production code before a failing test exists
- Never write more code than needed to make the current test pass
- Never skip the refactor step — it's where quality happens
- Commit after EACH phase, not at the end

## Test Structure: Arrange / Act / Assert

```typescript
test('should_redirect_to_login_when_session_expires', () => {
  // Arrange — set up preconditions
  const expiredSession = createSession({ expiresAt: past() });

  // Act — perform the action under test
  const result = validateSession(expiredSession);

  // Assert — verify the outcome
  expect(result.redirect).toBe('/login');
  expect(result.valid).toBe(false);
});
```

## Test Naming Convention

Use plain English that describes the behaviour, not the implementation:

- ✅ `it_returns_empty_list_when_user_has_no_closets`
- ✅ `should_reject_shoe_count_exceeding_shelf_capacity`
- ❌ `test_getClosets_returns_array` (describes implementation)
- ❌ `test1` (meaningless)

## What to Test (priority order)

1. **One test per Acceptance Criterion** (happy path)
2. **One test per error/empty state** in the spec
3. **API contract**: correct request shape → correct response shape
4. **Permission boundary**: unauthorized user cannot access this endpoint
5. **Most likely race condition** identified in the architecture
6. **Boundary values**: 0, 1, max, max+1
7. **Edge cases**: empty input, null, unicode, very long strings

## Coverage Rules

- Aim for 100% coverage of NEW logic paths, including error branches
- Never mock what you don't own — use real implementations or well-scoped fakes
- Never mock the database in integration tests — use a real test DB or in-memory equivalent
- Tests are documentation — a new developer should understand the feature by reading the tests

## Anti-Patterns to Avoid

- ❌ Testing implementation details (internal function calls instead of outcomes)
- ❌ Happy-path-only tests (miss 80% of real bugs)
- ❌ Flaky tests (fix or delete within the current sprint)
- ❌ Skipping tests with `.skip` or `xtest` to make the suite green
- ❌ Writing tests AFTER the implementation (tests mirror bugs instead of catching them)

## Session Discipline During Implementation

- Start a fresh session for each feature or each day, whichever comes first
- If context reaches 60%: run `/compact` immediately
- Never load more than 10 files in a single session
- If you need more than 10 files, the feature is too large — split it

## Commit Message Format

```
test: [feature] failing tests          # RED phase
feat: [feature] passing                # GREEN phase
refactor: [feature] cleanup            # REFACTOR phase
fix: [feature] [what was broken]       # Bug fixes
```
