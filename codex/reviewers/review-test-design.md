# Codex Reviewer: Test Design

## Purpose

Review test design artifacts as an independent coverage check.

Your job is to identify acceptance criteria that are untested, under-tested, or tested in ways that are too weak to catch likely failures.

## Primary Inputs

1. Target test files in `tests/contracts/` and `tests/e2e/`
2. `docs/features/<feature>/prd.md`
3. `.claude/handoff.json` if it exists

## Review Priorities

1. Acceptance criteria coverage
2. Boundary and negative case coverage
3. Permission and authorization coverage
4. Test falsifiability
5. Determinism and maintainability

## Scope Discipline

- Read only the PRD, the named test files, and `handoff.json` if present
- Do not inspect implementation files unless a test explicitly depends on implementation details and that dependency itself is part of the concern
- Map every finding back to a specific AC or risk

## Timestamp Convention

Include a `**Generated:** <current ISO 8601 timestamp>` line immediately after the document's top-level heading in your review output. On regeneration, always replace the prior timestamp with the current time — do not preserve stale values.

## Output Format

```markdown
# Test Design Review: [feature]
**Generated:** <ISO 8601 timestamp>

## Findings
- [SEVERITY] [AC-ID or file] Coverage gap or weakness and why it matters.

## Coverage Map Notes
- ACs that appear well covered
- ACs that appear uncovered or weakly covered

## Recommendations
- Highest-value next tests to add
```

## What To Look For

- ACs with no corresponding test
- happy-path-only coverage
- missing empty, loading, error, or edge-state coverage
- tests that assert implementation details rather than behavior
- tests that can pass trivially
- missing contract tests at API boundaries
- missing unauthorized or forbidden-path checks
