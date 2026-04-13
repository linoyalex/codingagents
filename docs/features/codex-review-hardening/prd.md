## Feature: Codex Review Hardening
**Generated:** 2026-04-13T12:00:00Z
**Phase:** Specify | **Date:** 2026-04-13 | **Ticket:** ISS-027

---

### User Story

As a **Codex code reviewer**, I want the review method to **explicitly require install-path tracing, test-truthfulness verification, and parser edge-case enumeration**, so that **dependency gaps, misleading tests, and incomplete input coverage are caught in the first review pass rather than discovered across multiple re-reviews**.

---

### Problem Statement

Codex re-reviews of ISS-009 exposed three systemic gaps in `codex/reviewers/review-code.md`:

1. **Install-path blindness:** Reviewer focused on changed helpers but did not follow the new dependency into `init.sh`/`upgrade.sh`, missing that fresh installs would break.
2. **Test-truthfulness gap:** A test named as a source/installed sync check only verified one narrow property, not full parity. The reviewer did not challenge the mismatch between test name and assertion body.
3. **Incomplete edge-case enumeration:** Parser review caught some malformed inputs, but additional cases surfaced only through multiple re-reviews. No checklist enforced systematic enumeration.

These are review-method weaknesses, not product bugs. Fixing them at the reviewer prompt/process level prevents recurrence across all future reviews.

---

### Acceptance Criteria

- [ ] **AC1 (Installer/source-of-truth rule):** Given a diff introduces a new helper, script, or path dependency; When the Codex reviewer evaluates the diff; Then `codex/reviewers/review-code.md` requires inspecting installer (`init.sh`), upgrade (`upgrade.sh`), and generation files that operationalize the dependency.

- [ ] **AC2 (Test-truthfulness rule):** Given a test file is in the diff; When the reviewer reads test names and assertion bodies; Then `codex/reviewers/review-code.md` requires verifying that each test's assertions actually prove what the test name claims, especially for sync/parity/regression tests.

- [ ] **AC3 (Parser edge-case checklist):** Given the diff modifies a parser or validator; When the reviewer checks input handling; Then `codex/reviewers/review-code.md` includes a checklist requiring enumeration of malformed-input shapes and verification of direct coverage for each important shape.

- [ ] **AC4 (Unchanged-file scope):** Given unchanged files that install, generate, copy, or operationalize a changed file; When reviewer determines review scope; Then `codex/reviewers/review-code.md` clarifies these unchanged files are in scope.

- [ ] **AC5 (Process docs updated):** Given the review method changes; When documentation is checked; Then `docs/memory/codex-rules.md` or `docs/memory/review-process.md` reflects the stronger review expectations.

- [ ] **AC6 (Regression test):** Given the updated review prompt/method; When tests run; Then at least one deterministic test or fixture-backed check protects the review method from regressing silently (e.g., structural anchor tests for required sections/headings).

- [ ] **AC7 (Installer coverage contract test):** Given the source tree contains `skills/*/SKILL.md`, `commands/*.md`, and `hooks/*.js`; When the contract test runs; Then it asserts each source file has a corresponding copy line in `init.sh` (and optionally `upgrade.sh`). This catches the recurring pattern where new files are added to source but never copied to target projects.

---

### Screen States (Developer Experience)

| Workflow | Normal | Error | Success |
|----------|--------|-------|---------|
| **Codex review** | Reviewer follows install-path, test-truthfulness, and edge-case checklists | Reviewer skips a checklist item | All three gap classes checked in first pass |
| **Installer contract test** | Test globs source files, asserts copy lines exist | New source file added without copy line in init.sh | All source files have corresponding installer entries |
| **Test-truthfulness check** | Reviewer compares test name to assertion body | Test name claims sync check but only asserts one property | Mismatch flagged, test improved |
| **Edge-case enumeration** | Reviewer lists malformed-input shapes from diff | Shapes missed, discovered in re-review | Full matrix covered in first pass |

---

### Out of Scope

- Claude-side code-review skill changes (ISS-039)
- Reviewer independence / adversarial stance (ISS-024, ISS-014)
- Source-spec verification in handoff (ISS-033)
- TDD skill changes (ISS-022)
- `checkpoint.js` detection fixes (ISS-040)

---

### Dependencies

- **None (no hard blockers).** ISS-027 is at Order 1 in the backlog — no ticket must merge first.
- **Assumption:** `codex/reviewers/review-code.md` exists and is the primary file to modify.
- **Assumption:** `init.sh` is the canonical installer script for AC7's contract test.

---

### RICE Score

| Metric | Value |
|--------|-------|
| Reach | 8/10 |
| Impact | 8/10 |
| Confidence | 9/10 |
| Effort | 3/10 |
| **Score** | **192** |

---

### Definition of Done

- [ ] All 7 ACs pass
- [ ] `codex/reviewers/review-code.md` updated with three new rules (AC1-AC3) and scope clarification (AC4)
- [ ] Process docs updated (AC5)
- [ ] Regression test protects review method (AC6)
- [ ] Installer coverage contract test passing (AC7)
- [ ] No P1/P2 bugs open
