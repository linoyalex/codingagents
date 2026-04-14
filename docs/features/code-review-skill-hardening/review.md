## Code Review: feature/ISS-039-code-review-skill-hardening
**Generated:** 2026-04-14T18:00:00Z
**Date:** 2026-04-14 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase.**
**Diff:** `git diff main...HEAD`

### Summary

The feature successfully extends the code-review skill with five new methodology steps (schema impact tracing, source/installed drift check, test suite execution, reproduction requirement, symmetric gate enforcement) using progressive disclosure. All 58 tests pass, source/installed copies are in sync, and the implementation is clean. One significant logical inconsistency exists in AC6's execution: the symmetric gate enforcement instruction directs reviewers to verify a check exists in `commands/security-gate.md`, but that file was deliberately not modified, meaning any reviewer faithfully following AC6 will always produce a HIGH finding on `security-gate.md` in every future review — an unintended perpetual false positive.

### Verdict: REQUEST_CHANGES

---

### Findings

**[HIGH] [F1] AC6 symmetric gate enforcement creates a perpetual false positive — unverified**

**Issue:** The `## Symmetric Gate Enforcement` section in `commands/review.md` instructs reviewers to "confirm the identical check exists in both `commands/review.md` and `commands/security-gate.md`". The architecture document explicitly states `commands/security-gate.md` was not modified (Rejected Alternatives, line 127). Any reviewer faithfully executing the new AC6 step will open `commands/security-gate.md`, find no `## Symmetric Gate Enforcement` section, and be required to raise a HIGH finding — on every review, indefinitely. This turns the gate enforcement instruction into noise that trains reviewers to ignore it.

Verified: `grep -n "symmetric\|gate enforcement" commands/security-gate.md` returned no matches. `grep -n "symmetric\|gate enforcement" commands/review.md` confirmed line 45 has the section only in review.md.

**Suggested fix:** Either (a) add a minimal `## Symmetric Gate Enforcement` section to `commands/security-gate.md` so the current state satisfies the check, or (b) restate the AC6 instruction to define a different invariant — e.g., "verify that each gate command has a `## Separate Context Check` and a `## Source Spec Verification` section" (which both files already have). The contract tests for AC6 must also be updated to assert the chosen invariant is satisfied, not just that the instruction text is present.

---

**[HIGH] [F2] AC6 contract tests do not assert the invariant is satisfied — only that the instruction is present**

**Issue:** The contract test `AC6: commands/review.md contains a symmetric gate enforcement heading` (line 369 in the contract test) verifies the instruction exists in `commands/review.md`. No test reads `commands/security-gate.md` and asserts it contains the symmetric enforcement section (or any other required content). The test suite therefore passes even though the AC6 state is broken. A contract test that verifies a methodology instruction without verifying the condition it is meant to maintain is a false green.

Verified: `grep -n "read.*security.gate\|security.gate.*assert\|security.gate.*match" tests/contracts/code-review-skill-hardening.test.js` returned no matches. The E2E test at line 114 of `tests/e2e/code-review-skill-hardening.spec.js` only checks that `security-gate.md` *exists*, not that it contains the relevant checks.

**Suggested fix:** Add a test that reads `commands/security-gate.md` and asserts the symmetric gate section (or the negotiated invariant from F1) is present in it.

---

**[MEDIUM] [F3] Integration test comment advertises an "ARCH GAP" as accepted technical debt without a ticket reference**

**Issue:** Line 7 of `tests/integration/code-review-skill-hardening.integration.test.js` contains `// ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA`. The `docs/CLAUDE.md` gotchas section notes that "Phase 3 QA agent must note this gap in a comment and mark it in the handoff" — but it also says ISS-023 tracks making Call Chain sections a Phase 2 requirement. Leaving undocumented ARCH GAP comments in committed test files without a backlog ticket reference makes the debt invisible. The comment does not say whether ISS-023 would close this gap, or whether a new ticket is needed.

**Suggested fix:** Either reference the tracking ticket (`// ARCH GAP: ISS-023 — integration target chosen by QA, architecture.md lacks Call Chain section`) or open a ticket and add the reference. Drop the comment if ISS-023 already addresses it.

---

**[MEDIUM] [F4] `automated-checks.md` pre-diff caveat is not covered by any test**

**Issue:** `skills/code-review/automated-checks.md` lines 13-14 contain an important behavioral constraint: "When a skill file itself is part of the diff under review, verify commands against the pre-diff (committed) version of the installed copy, not the working-tree version." This constraint is listed as a MEDIUM known risk in the security-gate handoff. No contract or integration test verifies this instruction is present or that its key phrases survive rewording.

**Suggested fix:** Add a structural anchor test asserting that `automated-checks.md` contains a heading or label matching `/pre.diff|committed version|working.tree/i`. This is the same structural anchor pattern used for all other AC tests in this feature.

---

**[LOW] [F5] E2E self-referential skip-test assertion uses string concatenation to avoid detection, but the technique is fragile and not documented**

**Issue:** In `tests/e2e/code-review-skill-hardening.spec.js` lines 211-216, the test builds the skip pattern dynamically using string concatenation (`'\\.s' + 'kip\\s*\\('`, etc.) to prevent the test file itself from self-matching when its own source is scanned. The technique works, but there is no comment explaining why concatenation is used instead of a literal regex. A future developer maintaining this code may "simplify" it to a literal regex, accidentally breaking the self-exclusion invariant.

**Suggested fix:** Add a one-line comment: `// String concatenation prevents this file from self-matching when the test scans its own source`.

---

**[NIT] [F6] `handoff.json` diff shows intermediate `phase: 4` state committed to branch history**

**Issue:** The `git diff main...HEAD -- .claude/handoff.json` shows a `phase: 4` intermediate state attributed to `produced_by: security-reviewer`. The installed file is correct (`phase: 5`, `produced_by: developer`). This is not a functional issue, but the committed intermediate state could confuse a developer reading the PR history to understand what phase the branch is in.

This is informational only. No action required unless commit history clarity is a project concern.

---

**[PRAISE] [F7] Progressive disclosure implementation is well-executed and budget-compliant**

The refactor correctly separates the three new procedure-heavy sections (impact-analysis, automated-checks, reproduction) into sibling reference files while keeping SKILL.md under the 120 prose-line budget. The contract test's prose-line counting logic (lines 425-446 of the contract test) is careful and correct — it excludes frontmatter, headings, code fences, and table rows. The error/empty state handling in all three sibling files (unresolvable mappings, missing test command, nondeterministic reproduction) is thorough and avoids both silent failures and review-blocking false errors.

---

### Automated Checks
- Debug/console.log: Clean — no matches in implementation files (matches were in documentation text about the check itself)
- Skipped tests: Clean — no `.skip`, `xtest`, or `xit` in the diff
- Type bypasses: Clean — no `as any` or `: any` in the diff
- Source/installed drift: Clean — all 4 skill files (SKILL.md, impact-analysis.md, automated-checks.md, reproduction.md) and commands/review.md are byte-identical to their installed copies
- Test suite: PASS — 41/41 contract tests, 6/6 integration tests, 11/11 E2E tests, 23/23 wiring tests

### Schema Impact
No schema files were changed in this diff — schema impact tracing skipped.

### Test Assessment
- [x] New code has corresponding tests
- [x] Edge cases are covered (empty states, error states, flaky failures, permission denied)
- [x] No skipped tests introduced
- [x] Tests are testing behaviour (structural anchors), not implementation (no phrase-binding)
- [ ] AC6 invariant is tested incompletely — see F2

### Convention Compliance
- [x] Follows project folder structure (`skills/code-review/`, `commands/`, `tests/contracts/`, `tests/e2e/`, `tests/integration/`)
- [x] Naming conventions respected (kebab-case files, `SKILL.md` for skill entry point)
- [x] No `any` types (JavaScript with no TypeScript, not applicable)
- [x] No hardcoded values
- [x] Commit messages follow format (`feat:`, `test:`, `refactor:`, `security:`)
- [ ] AC6 logical self-contradiction not caught before commit — see F1
