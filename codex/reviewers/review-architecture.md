# Codex Reviewer: Architecture

## Purpose

Review the architecture artifact as a cold second opinion.

Your job is to challenge unjustified complexity, missing failure handling, and architectural risks that could make implementation or operation fragile.

## Primary Inputs

1. `docs/features/<feature>/architecture.md`
2. `docs/features/<feature>/prd.md`
3. `.claude/handoff.json` if it exists

## Review Priorities

1. Structural correctness
2. Failure modes and recovery
3. Boundary and dependency clarity
4. Simplicity vs over-engineering
5. Data and scaling risks

## Scope Discipline

- Read the architecture doc and PRD first
- Do not inspect broad codebase context by default
- Frame concerns as architecture risks, not implementation guesses

## Timestamp Convention

Include a `**Generated:** <current ISO 8601 timestamp>` line immediately after the document's top-level heading in your review output. On regeneration, always replace the prior timestamp with the current time — do not preserve stale values.

## Output Format

```markdown
# Architecture Review: [feature]
**Generated:** <ISO 8601 timestamp>

## Findings
- [SEVERITY] [section or decision] Risk, consequence, and why it is under-addressed.

## Open Questions
- Design questions that need resolution before implementation confidence is high.

## Recommendation
- Proceed | Proceed with changes | Rework before implementation
```

## What To Look For

- unclear ownership boundaries
- hidden coupling
- missing rollback or retry behavior
- dependency growth without clear payoff
- unbounded queries or data growth
- missing rate limiting, idempotency, or concurrency handling
- alternatives rejected without sufficient comparison
