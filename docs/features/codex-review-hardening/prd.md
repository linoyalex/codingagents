## Feature: Codex Review Hardening
**Generated:** 2026-04-13T21:00:00Z
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

- [ ] **AC5 (Process docs updated):** Given the review method changes; When documentation is checked; Then `docs/memory/codex-rules.md` is updated as the canonical source of truth for Codex review expectations. If `docs/memory/review-process.md` contains overlapping Codex-specific guidance, it must either defer to `codex-rules.md` or be updated to stay consistent.

- [ ] **AC6 (Regression tests):** Given the updated review prompt/method; When tests run; Then deterministic structural anchor tests protect each of the four new rules from regressing silently: (a) installer/source-of-truth rule (AC1), (b) test-truthfulness rule (AC2), (c) parser edge-case checklist (AC3), (d) unchanged-file scope guidance (AC4). Each rule must have at least one dedicated test assertion.

- [ ] **AC7 (Installer coverage contract test):** Given the source tree contains `skills/*/SKILL.md`, `commands/*.md`, and `hooks/*.js`; When the contract test runs; Then it asserts each source file is operationalized by the installer (`init.sh` and `upgrade.sh`). The test must verify the install contract (every source file reaches the target project), not a specific implementation mechanism — it must pass whether the installer uses literal copy lines, loops, manifests, directory copies, or helper functions. If `upgrade.sh` operationalizes files differently from `init.sh`, both paths must be covered.

---

### Screen States (Developer Experience)

| Workflow | Normal | Error | Success |
|----------|--------|-------|---------|
| **Codex review** | Reviewer follows install-path, test-truthfulness, and edge-case checklists | Reviewer skips a checklist item | All three gap classes checked in first pass |
| **Installer contract test** | Test verifies each source file is operationalized by installer | New source file added but not operationalized by init.sh or upgrade.sh | All source files reachable in target project |
| **Installer via non-literal mechanism** | Installer uses loop, manifest, or directory copy — contract test still passes | Test overfits literal copy lines and false-fails on valid installer | Contract test verifies behavior, not mechanism |
| **Test-truthfulness check** | Reviewer compares test name to assertion body | Test name claims sync check but only asserts one property | Mismatch flagged, test improved |
| **Edge-case enumeration** | Reviewer lists malformed-input shapes from diff | Shapes missed, discovered in re-review | Full matrix covered in first pass |
| **No-test / no-parser diff** | Diff has no test files or parser/validator changes | Reviewer invents checklist work for inapplicable rules | Reviewer correctly skips inapplicable checklists — trigger conditions not met |

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
- **Assumption:** `init.sh` and `upgrade.sh` are the installer/upgrade scripts. AC7's contract test must work regardless of their internal mechanism (literal copies, loops, manifests, etc.).
- **Assumption:** `docs/memory/codex-rules.md` is the canonical Codex review expectations doc (AC5). If it doesn't exist yet, create it.

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
- [ ] Regression tests protect each of the four new rules individually (AC6)
- [ ] Installer coverage contract test passing against both init.sh and upgrade.sh (AC7)
- [ ] No P1/P2 bugs open
