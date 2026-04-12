## Feature: Artifact Timestamps
**Phase:** Specify | Date: 2026-04-12

### User Story
As a pipeline operator reviewing feature artifacts across phases and review cycles,
I want every generated artifact to include a visible ISO 8601 timestamp,
so that I can immediately tell when it was produced, whether it predates the current
branch state, and how multiple review documents relate in sequence.

### Acceptance Criteria

- [ ] **AC1 (Convention defined):** Given the pipeline generates feature artifacts,
      When the convention is documented, Then a single timestamp field name and
      ISO 8601 format is defined for all generated feature artifacts, placed in a
      consistent location (front-matter or header metadata line).

- [ ] **AC2 (Command instructions updated):** Given the pipeline commands that
      produce `prd.md`, `architecture.md`, `security-audit.md`, `review.md`, and
      Codex review files, When these commands are updated, Then each command's
      instructions require the agent to include the timestamp field in the generated
      artifact.

- [ ] **AC3 (Regeneration updates timestamp):** Given an artifact that was previously
      generated with a timestamp, When the artifact is regenerated in a later
      phase or review cycle, Then the timestamp is updated to the current time
      rather than preserved from the earlier run.

- [ ] **AC4 (Convention documented):** Given a new contributor reading the pipeline
      guidance, When they look for artifact format conventions, Then the timestamp
      requirement is documented in `docs/CLAUDE.md` or the relevant skill so they
      know which artifacts require timestamps and where to place them.

- [ ] **AC5 (Regression test):** Given the updated command/template files, When
      the test suite runs, Then at least one test verifies that the artifact-producing
      commands reference the timestamp convention.

- [ ] **AC6 (No regression):** Given the existing test suite, When all changes are
      applied, Then all existing tests continue to pass.

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

- The timestamp is a human-readable metadata line in the generated markdown, not
  YAML front-matter (since feature artifacts currently use plain markdown without
  front-matter). Format: `**Generated:** 2026-04-12T14:30:00Z`
- The timestamp is placed immediately after the document title heading for consistency.
- Commands instruct the agent to use the current ISO 8601 timestamp at generation
  time. The agent derives the timestamp from the system; no external clock service
  is needed.

### RICE Score
Reach: High (every feature cycle) | Impact: Medium (traceability, not blocking) | Confidence: High | Effort: Low | **Score: High**

### Definition of Done
- All ACs pass
- Convention documented
- Regression test added
- No existing tests broken
