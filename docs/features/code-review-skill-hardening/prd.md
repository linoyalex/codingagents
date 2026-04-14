# Feature: Code Review Skill Hardening
**Generated:** 2026-04-14T15:30:00Z
**Phase:** Specify | Date: 2026-04-14
**Ticket:** [ISS-039](../../issues/tickets/ISS-039.md)

## User Story
As a code-reviewer agent,
I want the code-review skill to include downstream-impact tracing, source/installed drift checks, test suite execution, finding reproduction, and symmetric gate enforcement,
So that systemic review methodology gaps that allowed 4 missed findings in the review-hardening RCA are closed.

## Acceptance Criteria

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
  Then the checks include running the project's test suite — not just grep patterns — and verifying no regressions in existing tests. The reviewer determines the appropriate test command from the project's `CLAUDE.md` Commands section, `package.json` scripts, or equivalent configuration. When multiple test suites exist, the reviewer runs the suites that cover files touched by the diff. If no obvious test command exists for the project, the reviewer notes this gap as a finding rather than silently skipping.

- [ ] **AC4 (Reproduction requirement)**
  Given the reviewer has identified a BLOCKING or HIGH finding,
  When the reviewer finalizes severity,
  Then the methodology requires reproducing the finding with actual commands before assigning the final severity rating. If reproduction is not possible (environment constraints, missing credentials, nondeterministic behavior), the reviewer must mark the finding as "unverified — [reason]" and may not assign BLOCKING severity to an unverified finding without escalating to the user.

- [ ] **AC5 (Regression test)**
  Given the updated `skills/code-review/SKILL.md`,
  When contract tests run,
  Then structural anchor tests verify the presence of: schema impact check section, drift check command, test suite execution step, reproduction requirement, and symmetric gate enforcement instruction — using heading/label anchors, not phrase-binding.

- [ ] **AC6 (Symmetric gate enforcement)**
  Given the Review Methodology specifies a check for one gate command (e.g., `produced_by` in `commands/review.md`),
  When the reviewer applies that check,
  Then the skill explicitly instructs the reviewer to verify the same check exists in all gate commands: `commands/review.md` and `commands/security-gate.md`.

## Reviewer Workflow States

| State | AC2 (Drift check) | AC3 (Test suite) | AC4 (Reproduction) |
|-------|-------------------|-------------------|---------------------|
| Empty | No touched files map to installable paths — skip drift check | No test command found in project config — note as finding | No BLOCKING/HIGH findings identified — skip reproduction |
| Normal | Touched files have installed copies — run diff comparison | Test command found — run suite, report pass/fail | Finding reproduced — severity confirmed |
| Error | Drift-check command cannot map a touched file to an installed copy — note as unresolvable, do not block | Test command fails to start (missing deps, config error) — note as finding, do not block review | Reproduction command errors for environmental reasons — mark "unverified" |
| Permission denied | N/A | N/A | Reproduction requires credentials/network/privileges unavailable in review environment — mark "unverified", escalate if BLOCKING |
| Nondeterministic | N/A | Flaky test failure — re-run once; if still failing, note as finding | Finding reproduces intermittently — mark "unverified — nondeterministic", downgrade from BLOCKING |

## Out of Scope

- **AC4a from ticket (implementer reproduction):** Dropped per owner decision. The "reproduce before declaring fixed" behavior for developers is covered by: (1) AC3 ensures the reviewer runs the test suite on re-review after REQUEST_CHANGES, catching false "resolved" claims; (2) AC4 ensures the reviewer reproduces findings with actual commands; (3) the existing TDD RED phase requires a failing test before a fix. The ISS-036 incident (7 false "resolved" declarations) was caused by neither the developer nor the reviewer running the test suite — AC3 closes this from the reviewer side. If future RCA shows developers still bypass reproduction, a separate ticket should target `/implement`.
- Codex review method changes — those are ISS-027 (already merged).
- Changes to `commands/implement.md` or `skills/tdd/SKILL.md` — this ticket only touches the code-review skill and its invoking command.
- Adding new gate commands beyond `review.md` and `security-gate.md` — these are the only two gate phases in the pipeline.

## Dependencies

- **Batch 2 Branch B (review-hardening) must be merged** — ISS-039 modifies the same files (`skills/code-review/SKILL.md`, `commands/review.md`). ✅ Already merged.
- **ISS-027 (Codex review hardening) is the symmetric counterpart** — ISS-039 is Claude-side; ISS-027 is Codex-side. ✅ Already merged.

## Evidence

- review-hardening Phase 6: Claude missed 4 findings that Codex caught (downstream impact, drift, existing tests, reproduction)
- ISS-036 Phase 5 rework: developer declared findings "resolved" 7 times without reproducing them — root cause was not running the test suite
- All missed findings were systemic methodology gaps, not domain-specific oversights

## RICE Score
Reach: High (every code review) | Impact: High (prevents escaped defects) | Confidence: High (RCA-backed) | Effort: Low (skill + command + tests) | **Score: High**

## Definition of Done
- All ACs pass in contract tests
- `skills/code-review/SKILL.md` updated with new methodology sections
- `commands/review.md` updated if needed
- Source and installed copies are in sync
- No P1/P2 bugs open
