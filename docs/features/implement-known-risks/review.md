## Code Review: feature/ISS-042-implement-known-risks
**Generated:** 2026-04-14T04:30:00Z
**Date:** 2026-04-14 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase** (handoff produced_by: developer)
**Diff:** `git diff main...HEAD`

---

### Summary

This PR adds two prose instructions and a new test suite to close the gap where Phase 5 developers were never explicitly told to read `known_risks` from `.claude/handoff.json`. The implementation is minimal and correct: two lines of instruction added to `commands/implement.md` and `skills/tdd/SKILL.md`, plus 26 tests across contract, integration, and E2E layers. All tests pass. No secrets, no circular dependencies, no skipped tests.

### Verdict: APPROVE

---

### Findings

#### POSITIVE: Test coverage depth exceeds the scope requirement in a good way

The PRD scoped this to "one contract test" (AC3). The implementation delivers 26 tests across three layers (contract, integration, E2E), each targeting a distinct aspect of the feature. The integration tests exercise `resolve-feature.js` behaviorally in isolated temp directories rather than mocking, which is the right approach for a tool that halts a pipeline. The E2E layer adds a no-skipped-tests regression guard that protects the suite itself. This is well-considered test architecture for a prose-only change.

---

#### NOTE (LOW): Architecture specifies `tests/node/core-skill-contracts.test.js` but implementation uses a separate file

**File:** `tests/contracts/implement-known-risks.test.js`
**Observation:** The architecture doc explicitly states "Add a new `test()` block" to `tests/node/core-skill-contracts.test.js`. The implementation creates a feature-isolated file at `tests/contracts/implement-known-risks.test.js` instead. The AC3 acceptance criterion is fully satisfied — structural anchors, no phrase-binding, both files checked. The byte-identity guard in the original `core-skill-contracts.test.js` still runs and catches drift. The functional outcome is equivalent and the isolation is arguably better design.
**Suggestion:** No action required before merge. However, update the architecture doc in a follow-up to reflect the chosen placement, so future reviews do not flag the same deviation as a compliance gap.

---

#### NOTE (LOW): AC2 assertion in contract test requires `rationale` language — barely satisfied

**File:** `tests/contracts/implement-known-risks.test.js:108`
**Observation:** The test asserts `rationale|reason|why|justif` must appear in the GREEN-scoped TDD skill slice. The implementation adds "address or defer each with a rationale" — this satisfies the regex. However, the TDD skill instruction is appended as continuation text inside a code block (the RED/GREEN/REFACTOR text block), not as a separate checklist item. If a future editor moves the code block boundary, the continuation line could fall outside the `GREEN→REFACTOR` slice, causing the test to miss it (the regex depends on REFACTOR appearing as the boundary delimiter).
**Suggestion:** The structural anchor pattern is sound for now. If the TDD cycle section is ever refactored, verify the continuation line placement stays within the GREEN-to-REFACTOR slice. No action needed before merge.

---

#### NOTE (LOW): E2E test asserts `commands/implement.md` invokes `resolve-feature` before GREEN — fragile anchor

**File:** `tests/e2e/implement-known-risks.spec.js:803-806`
**Observation:** The test uses string index comparison (`resolveIdx < greenIdx`) to assert ordering of `resolve-feature` invocation before the GREEN section. This works correctly today (line 18 vs the GREEN section which starts later). However, the test is testing a pre-existing structural property of `implement.md` rather than a behavior introduced by this feature. If `implement.md` is ever reorganized, this assertion could fail for reasons unrelated to `known_risks`.
**Suggestion:** This is a low-risk observation. The test is not wrong — it adds useful regression coverage. But the assertion belongs more naturally in the broader `core-skill-contracts.test.js` suite since it tests `implement.md` structure generally, not the `known_risks` feature specifically. Consider moving it in a follow-up.

---

#### POSITIVE: AC4 conditional language is present and correctly placed

The instruction reads: "If present in .claude/handoff.json, review the known_risks array and address or defer each risk with a rationale before proceeding." The conditional "If present" guard means an empty array or absent field requires no developer action. The contract and E2E tests both verify this conditional property. This correctly satisfies AC4 without over-engineering.

---

### AC Verification

| AC | Satisfied | Evidence |
|----|-----------|----------|
| AC1 | Yes | `commands/implement.md` GREEN section contains `known_risks`, `handoff.json`, and `address/defer` |
| AC2 | Yes | `skills/tdd/SKILL.md` line 22 adds `known_risks` + `rationale` in GREEN-scoped block |
| AC3 | Yes | `tests/contracts/implement-known-risks.test.js` — 12 structural-anchor tests, all passing |
| AC4 | Yes | "If present" conditional in command; AC4 tests in contract and E2E suites pass |
| AC5 | Yes | Behavioral integration tests call `resolve-feature.js` with malformed fixture; non-zero exit confirmed |

### Test Assessment

- [x] New code has corresponding tests (26 tests across 3 layers)
- [x] Edge cases are covered (empty `known_risks`, missing handoff, malformed JSON)
- [x] No skipped tests introduced
- [x] Tests are testing behaviour, not implementation (integration/E2E exercise `resolve-feature.js` in subprocess)

### Convention Compliance

- [x] Follows project folder structure
- [x] Naming conventions respected
- [x] No `any` types (JavaScript, not TypeScript)
- [x] No hardcoded secrets or credentials
- [x] Commit messages follow format (feat/refactor/chore/security)
- [x] Artifact timestamps present in all new docs (`**Generated:**` line)
- [x] Byte-identity between source and installed copies verified by test and confirmed passing
- [x] TDD skill stays under 120-line budget (106 lines)
- [x] Structural anchors used in tests — no phrase-binding
