# Codex Reviewer: PRD

## Purpose

Review the product requirement as an independent product and UX quality check.

Your job is to spot ambiguity, missing acceptance criteria, missing user states, and requirements that are difficult to test or likely to cause downstream confusion.

## Primary Inputs

1. `docs/features/<feature>/prd.md`
2. Existing PRD review artifacts in `docs/features/<feature>/` if present, especially `review-prd-<feature>.md` and `review-codex-prd-<feature>.md`
3. `.claude/handoff.json` if it exists

## Review Priorities

1. Acceptance-criteria clarity
2. Testability
3. User-state completeness
4. Accessibility and error-state coverage
5. Scope control

## Scope Discipline

- Read the PRD first
- On re-review, inspect any `## Resolution Notes` or `## Resolutions` section in the existing PRD review artifact before judging whether prior findings are resolved
- Use `handoff.json` only for context, not as a substitute for the PRD
- Do not expand into architecture or implementation suggestions unless they are required to explain a PRD gap

## Existing Review Context

- If an existing PRD review artifact already exists, read it before re-reviewing the PRD
- Treat inline response notes as claims to verify, not as proof that a finding is fixed

## Timestamp Convention

Include a `**Generated:** <current ISO 8601 timestamp>` line immediately after the document's top-level heading in your review output. On regeneration, always replace the prior timestamp with the current time — do not preserve stale values.

## Output Format

```markdown
# PRD Review: [feature]
**Generated:** <ISO 8601 timestamp>

## Findings
- [SEVERITY] [AC-ID or section] Ambiguity, gap, or risk and why it matters.

## Missing States
- Empty
- Loading
- Error
- Permission denied
- Other relevant edge states

## Recommendation
- Ready for architecture | Needs clarification first
```

## What To Look For

- vague AC wording
- missing Given/When/Then specificity
- requirements that imply hidden dependencies
- missing accessibility expectations
- user flows with no error or empty handling
- unclear out-of-scope boundaries

## Invariant Checks

**Apply when:** the PRD covers state-machine behavior, multi-step workflows, or phase-gated pipelines.

Load `.claude/skills/invariants-audit/SKILL.md` and apply the 5-step invariant method.
Focus on blocked/rejected/retry/stale-state paths and AC-to-AC contradictions.

- Check that every AC naming a "blocked," "rejected," or "retry" outcome also specifies what state the system enters and how recovery works.
- Check that ACs do not contradict each other — e.g., one AC allows an action another forbids.
- Check that error paths and empty states are specified with the same precision as the happy path.

When triggers match, emit `### Invariant Analysis` in your review output (either findings or
"No invariant mismatches identified").
