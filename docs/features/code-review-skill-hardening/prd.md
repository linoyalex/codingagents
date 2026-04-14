## Feature: Code Review Skill Hardening
**Generated:** 2026-04-14T15:00:00Z
**Phase:** Specify | Date: 2026-04-14
**Ticket:** [ISS-039](../../issues/tickets/ISS-039.md)

### User Story
As a code-reviewer agent,
I want the code-review skill to include downstream-impact tracing, source/installed drift checks, test suite execution, finding reproduction, and symmetric gate enforcement,
So that systemic review methodology gaps that allowed 4 missed findings in the review-hardening RCA are closed.

### Acceptance Criteria

- [ ] **AC1 (Schema impact check)**
  Given a diff that adds or removes a required field in a schema (e.g., `handoff.schema.json`),
  When the reviewer reaches the Impact Analysis step,
  Then the methodology instructs the reviewer to grep for all producers and consumers of that schema and verify each handles the change.

- [ ] **AC2 (Source/installed drift check)**
  Given a diff that touches files in `commands/`, `skills/`, or `hooks/`,
  When the reviewer executes Quick Automated Checks,
  Then the checks include a command comparing each touched source file against its installed copy (`.claude/commands/`, `.claude/skills/`, `.claude/helpers/`) and flagging any divergence.

- [ ] **AC3 (Run existing tests)**
  Given any diff under review,
  When the reviewer executes Quick Automated Checks,
  Then the checks include running the project's test suite (e.g., `node --test`, `npm test`) — not just grep patterns — and verifying no regressions in existing tests.

- [ ] **AC4 (Reproduction requirement)**
  Given the reviewer has identified a BLOCKING or HIGH finding,
  When the reviewer finalizes severity,
  Then the methodology requires reproducing the finding with actual commands before assigning the final severity rating.

- [ ] **AC5 (Regression test)**
  Given the updated `skills/code-review/SKILL.md`,
  When contract tests run,
  Then structural anchor tests verify the presence of: schema impact check section, drift check command, test suite execution step, reproduction requirement, and symmetric gate enforcement instruction — using heading/label anchors, not phrase-binding.

- [ ] **AC6 (Symmetric gate enforcement)**
  Given the Review Methodology specifies a check for one gate command (e.g., `produced_by` in `commands/review.md`),
  When the reviewer applies that check,
  Then the skill explicitly instructs the reviewer to verify the same check exists in all gate commands: `commands/review.md` and `commands/security-gate.md`.

### Screen States

Not applicable — this feature modifies agent skill files and contract tests, not UI.

### Out of Scope

- **AC4a from ticket (implementer reproduction):** Evaluated and determined redundant. ISS-042 already added `known_risks` reading to `/implement`. The "reproduce before declaring fixed" behavior is covered by AC3 (reviewer runs tests) plus existing TDD RED discipline (write failing test before fix). The ISS-036 incident (7 false "resolved" declarations) was caused by not running the test suite, which AC3 addresses.
- Codex review method changes — those are ISS-027 (already merged).
- Changes to `commands/implement.md` or `skills/tdd/SKILL.md` — this ticket only touches the code-review skill and its invoking command.
- Adding new gate commands beyond `review.md` and `security-gate.md` — these are the only two gate phases in the pipeline.

### Dependencies

- **Batch 2 Branch B (review-hardening) must be merged** — ISS-039 modifies the same files (`skills/code-review/SKILL.md`, `commands/review.md`). ✅ Already merged.
- **ISS-027 (Codex review hardening) is the symmetric counterpart** — ISS-039 is Claude-side; ISS-027 is Codex-side. ✅ Already merged.
- **Assumption (AC4a dropped):** AC4a's intent (developer reproduces findings) is subsumed by AC3 (reviewer runs tests) + TDD RED phase. If future RCA shows developers still declare findings fixed without reproduction, a separate ticket should be filed targeting `/implement`.

### Evidence

- review-hardening Phase 6: Claude missed 4 findings that Codex caught (downstream impact, drift, existing tests, reproduction)
- ISS-036 Phase 5 rework: developer declared findings "resolved" 7 times without reproducing them — root cause was not running the test suite
- All missed findings were systemic methodology gaps, not domain-specific oversights

### RICE Score
Reach: High (every code review) | Impact: High (prevents escaped defects) | Confidence: High (RCA-backed) | Effort: Low (skill + command + tests) | **Score: High**

### Definition of Done
- All ACs pass in contract tests
- `skills/code-review/SKILL.md` updated with new methodology sections
- `commands/review.md` updated if needed
- Source and installed copies are in sync
- No P1/P2 bugs open
