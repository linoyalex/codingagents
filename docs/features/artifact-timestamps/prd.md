## Feature: Artifact Timestamps
**Generated:** 2026-04-12T00:00:00Z
**Phase:** Specify | Date: 2026-04-12

### User Story
As a pipeline operator reviewing feature artifacts across phases and review cycles,
I want every generated artifact to include a visible ISO 8601 timestamp,
so that I can immediately tell when it was produced, whether it predates the current
branch state, and how multiple review documents relate in sequence.

### Acceptance Criteria

- [ ] **AC1 (Convention defined):** Given the pipeline generates feature artifacts,
      When the convention is documented, Then a single timestamp field is defined:
      `**Generated:** <ISO 8601>` placed immediately after the document's top-level
      heading in every generated feature artifact.

- [ ] **AC2 (Command instructions updated):** Given the pipeline commands and
      reviewer prompts that produce the following artifacts, When these are updated,
      Then each requires the agent to include the `**Generated:**` timestamp line:
      - `prd.md` (via `commands/specify.md`)
      - `architecture.md` (via `commands/architect.md`)
      - `security-audit.md` (via `commands/security-gate.md`)
      - `review.md` (via `commands/review.md`)
      - `review-codex-code-*.md` (via `codex/reviewers/review-code.md`)
      - `review-codex-architecture-*.md` (via `codex/reviewers/review-architecture.md`)
      - `review-codex-tests-*.md` (via `codex/reviewers/review-test-design.md`)
      - `review-codex-prd-*.md` (via `codex/reviewers/review-prd.md`)
      - `review-claude-*.md` (via any Claude review that produces a named review file)

- [ ] **AC3 (Regeneration updates timestamp):** Given an artifact that was previously
      generated with a timestamp, When the artifact is regenerated in a later
      phase or review cycle, Then the timestamp is updated to the current time
      rather than preserved from the earlier run.

- [ ] **AC4 (Convention documented):** Given a new contributor reading the pipeline
      guidance, When they look for artifact format conventions, Then the timestamp
      requirement is documented in `docs/CLAUDE.md` under Code Conventions as the
      single canonical source, with a cross-reference from each skill template that
      includes the `**Generated:**` line.

- [ ] **AC5 (Regression test):** Given the updated command/template files, When
      the test suite runs, Then tests verify that:
      (a) every artifact-producing command listed in AC2 references the timestamp
      convention, (b) every artifact-producing skill template contains the
      `**Generated:**` anchor line, and (c) the convention is documented in
      `docs/CLAUDE.md`.

- [ ] **AC6 (No regression):** Given the existing test suite, When all changes are
      applied, Then all existing tests continue to pass.

### Generated Review Artifact Scope

Codex-generated review artifacts are in scope for this feature. When a Codex
reviewer produces or regenerates any named review file, that file must follow
the same timestamp convention as Claude-generated review artifacts:

- `review-codex-code-*.md`
- `review-codex-architecture-*.md`
- `review-codex-tests-*.md`
- `review-codex-prd-*.md`

This also applies to the feature-local artifacts created while implementing this
ticket. If `prd.md`, `architecture.md`, `security-audit.md`, or any review file
for `artifact-timestamps` is regenerated during the work, the regenerated file
must include the `**Generated:** <ISO 8601>` line immediately after the top-level
heading rather than treating the current feature directory as an exception.

### Screen States

Not applicable — this feature modifies pipeline command instructions and documentation
conventions. There are no user-facing screens.

### Out of Scope

- Retroactively adding timestamps to existing artifacts already committed in `docs/features/`
- Validating timestamps at the hook/checkpoint level (e.g., rejecting artifacts with missing timestamps)
- Changing the handoff.json schema (it already has a `timestamp` field)
- Adding timestamps to non-feature artifacts (CHANGELOG.md, release notes, CLAUDE.md)

### Dependencies

- None. This ticket has no hard blockers.

### Assumptions

- Feature artifacts use plain markdown without YAML front-matter. The timestamp
  is a bold metadata line: `**Generated:** 2026-04-12T14:30:00Z`
- Placement is immediately after the document's top-level heading, before any
  other content. This is consistent across all artifact types.
- The agent derives the timestamp from the system clock at generation time.
  No external clock service is needed.

### RICE Score
Reach: High (every feature cycle) | Impact: Medium (traceability, not blocking) | Confidence: High | Effort: Low | **Score: High**

### Definition of Done
- All ACs pass
- Convention documented
- Regression test added
- No existing tests broken
