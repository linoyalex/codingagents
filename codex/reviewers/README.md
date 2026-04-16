# Codex Reviewer Invocation Guide

This folder contains the prompt instructions for the current Codex reviewers.

Use one reviewer per fresh Codex run. Keep each run scoped to one artifact and one
output file.

## General Rules

- Prefer a fresh Codex session for each review
- Resolve the active feature slug from `.claude/handoff.json` when possible
- If the feature slug is missing, invalid, or ambiguous, stop and ask for it
- Treat `.claude/handoff.json` as context only, not the primary review surface
- Codex reviews are advisory only; they do not change the Claude pipeline automatically
- Write review artifacts into `docs/features/<feature>/` so later phases can find them
- On re-review, open any existing phase-relevant review artifact in `docs/features/<feature>/` first and inspect inline `## Resolution Notes` or `## Resolutions` before writing the new artifact
- Treat inline response notes as claims to verify, not as proof that the finding is resolved

## Recommended Output Files

- Code review: `docs/features/<feature>/review-codex-code-<feature>.md`
- Test design review: `docs/features/<feature>/review-codex-tests-<feature>.md`
- Architecture review: `docs/features/<feature>/review-codex-architecture-<feature>.md`
- PRD review: `docs/features/<feature>/review-codex-prd-<feature>.md`

## review-code

Use this when reviewing the implementation diff on the current branch.

```text
Use codex/reviewers/review-code.md.

First resolve the active feature slug from .claude/handoff.json. If it is missing,
invalid, or ambiguous, stop and ask me for the feature slug.

Review git diff main...HEAD on the current branch as an independent second opinion.
Prioritize correctness, security, missing tests, error handling, and boundary
conditions.
Use the diff as the primary review surface. Open an unchanged file only if needed to
verify a specific finding.
Use .claude/handoff.json only for acceptance criteria, relevant files, and known risks.
If `docs/features/<feature>/review.md` or `docs/features/<feature>/review-codex-code-<feature>.md`
already exists, read it first and inspect any `## Resolution Notes` / `## Resolutions`
section before re-reviewing.
Write the result to docs/features/<feature>/review-codex-code-<feature>.md.
Do not modify production code.
```

## review-test-design

Use this when reviewing test coverage and test quality for the current branch.

```text
Use codex/reviewers/review-test-design.md.

First resolve the active feature slug from .claude/handoff.json. If it is missing,
invalid, or ambiguous, stop and ask me for the feature slug.

Review the current branch's tests for this feature against
docs/features/<feature>/prd.md.
Focus on acceptance-criteria coverage, missing negative cases, boundary conditions,
authorization coverage, and weak assertions.
Use .claude/handoff.json only for acceptance criteria, relevant files, and known risks.
If `docs/features/<feature>/review-test-design-<feature>.md` or
`docs/features/<feature>/review-codex-tests-<feature>.md` already exists, read it first
and inspect any `## Resolution Notes` / `## Resolutions` section before re-reviewing.
Write the result to docs/features/<feature>/review-codex-tests-<feature>.md.
Keep the review findings first and scoped to test design.
```

## review-architecture

Use this when reviewing the feature architecture before or alongside implementation.

```text
Use codex/reviewers/review-architecture.md.

First resolve the active feature slug from .claude/handoff.json. If it is missing,
invalid, or ambiguous, stop and ask me for the feature slug.

Review docs/features/<feature>/architecture.md against docs/features/<feature>/prd.md
on the current branch.
Focus on unjustified complexity, missing failure modes, dependency risks, scaling
assumptions, and mismatches with the PRD.
Use .claude/handoff.json only for acceptance criteria, relevant files, and known risks.
If `docs/features/<feature>/review-architecture-<feature>.md` or
`docs/features/<feature>/review-codex-architecture-<feature>.md` already exists, read it
first and inspect any `## Resolution Notes` / `## Resolutions` section before re-reviewing.
Write the result to docs/features/<feature>/review-codex-architecture-<feature>.md.
Keep the review advisory and findings first.
```

## review-prd

Use this when reviewing the feature PRD before architecture or implementation.

```text
Use codex/reviewers/review-prd.md.

First resolve the active feature slug from .claude/handoff.json. If it is missing,
invalid, or ambiguous, stop and ask me for the feature slug.

Review docs/features/<feature>/prd.md on the current branch.
Focus on ambiguity, missing acceptance criteria, UX gaps, unclear edge cases,
accessibility expectations, and testability.
Use .claude/handoff.json only for acceptance criteria and risk context when relevant.
If `docs/features/<feature>/review-prd-<feature>.md` or
`docs/features/<feature>/review-codex-prd-<feature>.md` already exists, read it first and
inspect any `## Resolution Notes` / `## Resolutions` section before re-reviewing.
Write the result to docs/features/<feature>/review-codex-prd-<feature>.md.
Keep the review scoped, findings first, and advisory only.
```

## Suggested Follow-Up

After a Codex run, optionally log usage with:

```bash
./codex/log-usage.sh <feature> <phase> <agent> <model> <input_tokens> <output_tokens> <duration_seconds> <verification_passed>
```
