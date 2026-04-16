## Code Review: feature/ISS-043-045-049-qa-test-quality
**Generated:** 2026-04-16T03:15:00Z
**Date:** 2026-04-16 | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD`
**Reviewed in separate context from authoring phase** | produced_by: qa (not code-reviewer)

### Summary

Phase 3 test design for QA test quality hardening (ISS-043, ISS-045, ISS-049). Three test files (contract/integration/e2e) with ~43 tests total, all in correct RED state. Prior review (review-claude-test-design-qa-test-quality.md) identified 3 actionable findings — all 3 addressed in uncommitted working tree changes. Architecture doc refined with explicit structural anchors. No regressions in existing tests (146/147 pass; 1 pre-existing prd-writing budget failure).

### Verdict: APPROVE

The test design is sound. All 18 ACs have dedicated tests using structural anchors. The 3 feedback resolutions are clean and minimal. The architecture doc refinements improve implementability. One MEDIUM finding (uncommitted changes) must be resolved before Phase 5.

### Findings

#### [MEDIUM]: Uncommitted feedback fixes must be committed before Phase 5

**File:** tests/contracts/qa-test-quality.test.js, tests/e2e/qa-test-quality.spec.js, tests/integration/qa-test-quality.integration.test.js, docs/features/qa-test-quality/architecture.md, CLAUDE.md
**Issue:** The feedback resolutions (semantic spot-check comments, extracted link path, ordering source citation) and architecture doc refinements exist only in the working tree. They are not committed to the branch.
**Suggestion:** Stage and commit these changes (e.g., `test: address review feedback for qa-test-quality`) before proceeding to Phase 4/5. Without this commit, a checkout or reset would lose the fixes.

#### [LOW]: Root CLAUDE.md changes may belong in a separate commit

**File:** CLAUDE.md
**Issue:** Two new conventions were added to root CLAUDE.md ("Review artifact freshness check" in Must Follow, "Review artifacts can go stale" in Known Gotchas). These are good conventions but are framework-wide changes, not specific to the qa-test-quality feature. Bundling them in the same commit as the test design fixes conflates scope.
**Suggestion:** Consider committing the CLAUDE.md convention additions separately (e.g., `docs: add review artifact freshness convention`), since they apply to all features, not just qa-test-quality. This is optional — the changes themselves are correct.

#### [NIT]: AC12 test name overstates coverage

**File:** tests/contracts/qa-test-quality.test.js:394
**Issue:** Test is named "no skipped tests in the qa-test-quality test files" which is accurate, but the AC says "all previously passing tests continue to pass." The structural self-check is a necessary but not sufficient verification of AC12; the full regression gate is the CI suite run.
**Suggestion:** Already noted in prior review. No action needed — just noting for the implementation developer that AC12 completion requires running `node --test` on the full suite at Phase 5 end.

#### praise: Structural anchor strategy is well-documented

The architecture doc's expanded structural anchors table (with "Anchor type" column and "Anchor strategy" note) makes the testing approach highly implementable. The `[symmetric-coverage]` and `[contract-robustness]` bracketed label convention is a clean solution that protects list entries from rewording while keeping them searchable. The test design correctly uses these labels as the primary anchor for AC2 and AC7.

#### praise: Feedback resolutions are minimal and targeted

All 3 fixes are precisely scoped to the finding they address — no scope creep, no unnecessary refactoring. The extracted link path fix (FINDING-5) is particularly well-done: it resolves the `.claude/` prefix to the source path, making it a genuine edge test for link validity rather than just an existence check.

### Test Assessment
- [x] New code has corresponding tests (this IS the test design phase)
- [x] Edge cases are covered (progressive disclosure link resolution, broken chain detection, skill budget composite)
- [x] No skipped tests introduced (AC12 structural check + manual verification)
- [x] Tests are testing behaviour, not implementation (structural anchors, not phrase-binding)

### Convention Compliance
- [x] Follows project folder structure (tests/contracts/, tests/integration/, tests/e2e/)
- [x] Naming conventions respected (kebab-case files, descriptive test names)
- [x] No `any` types without documented reason (n/a — JavaScript)
- [x] No hardcoded values (paths use ROOT_DIR resolution)
- [x] Commit messages follow format ("test: qa-test-quality failing shells (RED)")

### Feedback Resolution Verification

| Prior Finding | Status | Evidence |
|---|---|---|
| FINDING-3: Phrase-bound content assertions need "semantic spot-check" comments | RESOLVED | 5 comments added at lines 77-79, 170-171, 197-198, 224-225, 348-349 in contract tests |
| FINDING-5: Integration edge test uses hardcoded path instead of extracted `match[1]` | RESOLVED | Lines 108-113 in integration test now resolve `match[1]` with `.claude/` prefix stripping |
| FINDING-6: E2E ordering test stricter than PRD without documented source | RESOLVED | Comment at lines 65-67 in E2E test cites `architecture.md § Content Placement Rules` |

### Regression Check

| Suite | Pass | Fail | Notes |
|---|---|---|---|
| tests/contracts/qa-test-quality.test.js | 4 | 28 | RED state correct — implementation not yet created |
| tests/e2e/qa-test-quality.spec.js | 0 | 5 | RED state correct |
| tests/integration/qa-test-quality.integration.test.js | 0 | 6 | RED state correct |
| tests/node/*.test.js (existing) | 146 | 1 | Pre-existing: prd-writing SKILL.md budget — unrelated |

### Symmetric Gate Enforcement

Both `commands/review.md` and `commands/security-gate.md` contain all three gate sections:
- `## Source Spec Verification` (review.md:31, security-gate.md:33)
- `## Separate Context Check` (review.md:39, security-gate.md:41)
- `## Symmetric Gate Enforcement` (review.md:45, security-gate.md:45)

No asymmetry detected.
