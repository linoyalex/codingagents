## Review: Test Design — QA Test Quality Hardening
**Generated:** 2026-04-15T12:00:00Z
**Phase:** 3 (Test Design) review | Reviewer: Claude | Model: opus
**Source spec:** docs/features/qa-test-quality/prd.md
**Architecture:** docs/features/qa-test-quality/architecture.md

### Summary

3 test files, ~43 tests total across contract (32), integration (6), and E2E (5) levels. All fail in RED state as expected — no false greens. The test design is solid overall, with good structural anchoring and a clear chain-of-custody model (command -> skill -> sibling reference).

### Verdict

**PASS with minor findings.** None block Phase 4 or Phase 5.

---

### Findings

#### FINDING-1: File extension mismatch with command spec — LOW

The test-design command (`commands/test-design.md:38-39`) instructs writing to `.test.ts` / `.spec.ts`, but all three test files use `.js`. This is consistent with the rest of the codebase (all existing tests are `.js`), so it's the right pragmatic choice — the QA agent correctly followed the codebase convention over the template literal. Worth noting for when the command template is next updated; no action needed here.

**Resolution:** None required. Command template is the source of the discrepancy, not the tests.

#### FINDING-2: AC12 approach is incomplete — LOW

The AC12 test (`tests/contracts/qa-test-quality.test.js:394-421`) checks for `.skip` / `xit` / `xtest` markers in the qa-test-quality files themselves. This is a reasonable structural guard against self-skipping, but it does not verify that other existing tests still pass — which is what AC12 ("all previously passing tests continue to pass") actually requires. That is a runtime property verified by running `node --test` on the full suite, not something a structural test can fully capture.

**Recommendation:** The test name could be more precise — e.g., "no skipped tests in qa-test-quality files" rather than implying it verifies full regression. The real AC12 gate is the CI suite run at Phase 5 end.

#### FINDING-3: Content assertions use phrase-binding — LOW-MEDIUM

Several tests use phrase-bound regex to verify section content rather than structural anchors:

- `tests/contracts/qa-test-quality.test.js:79` — `/all.*enumerat|enumerat.*all/i`
- `tests/contracts/qa-test-quality.test.js:168-172` — `/behavio(u?r|ral).*bind|bind.*behavio(u?r|ral)/i`
- `tests/contracts/qa-test-quality.test.js:196` — `/negative.*assert|must.*not|forbidden.*pattern/i`
- `tests/contracts/qa-test-quality.test.js:221` — `/trivial|evad|evasion|commented.out|escape.*hatch/i`
- `tests/contracts/qa-test-quality.test.js:342` — `/hybrid|precedence/i`

This contradicts the convention in `docs/CLAUDE.md` that tests must use structural anchors, not phrase-binding.

**Counterpoint:** These supplement the heading-presence structural anchors with semantic spot-checks — verifying that the section actually talks about what the AC requires, not just that the heading exists. This is arguably a valid two-tier approach (structural anchor for existence + loose content check for intent).

**Recommendation:** Add a brief comment above each phrase-bound content assertion explaining it is an intentional semantic spot-check, not a structural anchor. Alternatively, replace them with structural sub-anchors (e.g., a keyword label in the guidance text that the test matches on).

#### FINDING-4: Integration test happy path is monolithic — LOW

The test at `tests/integration/qa-test-quality.integration.test.js:53-84` packs 8 assertions into a single test. If it fails, the first failing assertion stops execution and masks all subsequent ones. Since the purpose is integration wiring, a single test that "proves the chain works" is conceptually right — but the developer would get better RED-to-GREEN feedback if the 3 chain steps (command has sections, skill has entries, skill links sibling) were separate tests.

**Verdict:** Acceptable for Phase 3 — the integration test's purpose is proving the chain, not fine-grained diagnostics. Contract tests already cover individual assertions.

#### FINDING-5: "INTEGRATION edge" tests are existence checks, not edge cases — LOW

The tests at `tests/integration/qa-test-quality.integration.test.js:101-122` labeled "INTEGRATION edge" verify files exist on disk. These are closer to precondition checks than edge cases. A true edge test would verify: does the link that SKILL.md actually contains point to a real file?

The test at line 105 extracts the `[See reference:]` link path via regex but then hardcodes `skills/tdd/test-quality-rules.md` instead of resolving the extracted path from `match[1]`.

**Recommendation:** Use the extracted `match[1]` path to resolve the file, making it a genuine edge test for link validity.

#### FINDING-6: E2E subsection ordering test is stricter than the PRD — LOW

`tests/e2e/qa-test-quality.spec.js:66-76` asserts a specific subsection order (Symmetric -> Behavioral -> Negative -> Adversarial -> Artifact-Type). The PRD does not specify ordering. The architecture doc lists them in this order but does not call it out as a requirement. This constrains the implementer unnecessarily — reordering for readability would break the test.

**Recommendation:** Either remove the ordering assertions, or add a comment citing the architecture doc as the ordering source so the developer knows it is intentional.

#### FINDING-7: AC14a 3-way compliance test is well-designed — POSITIVE

The composite test at `tests/contracts/qa-test-quality.test.js:470-510` handles the 3-way compliance gate (sibling exists OR under budget OR exception documented) elegantly. The prose-line counting logic correctly excludes frontmatter, code blocks, blank lines, headings, and table rows. One of the better-designed tests in the suite.

#### FINDING-8: ARCH GAP annotation present and correct — POSITIVE

The integration test file correctly includes the `// ARCH GAP: No Call Chain section in architecture.md` comment at line 4 per the TDD skill requirement. The handoff also records this as a known risk. Good protocol compliance.

#### FINDING-9: Drift sync tests cover the new sibling file — POSITIVE

Both contract tests (`tests/contracts/qa-test-quality.test.js:516-538`) and E2E tests (`tests/e2e/qa-test-quality.spec.js:136-154`) verify byte-identity for all 3 file pairs including the new `test-quality-rules.md`. This catches the most common implementation gap (editing source but forgetting the installed copy).

---

### AC Coverage Matrix

| AC | Contract | Integration | E2E | Verdict |
|----|----------|-------------|-----|---------|
| AC1 | 3 tests | 1 (in chain) | 1 (in chain) | Covered |
| AC2 | 2 tests | 1 (in chain) | 1 (in chain) | Covered |
| AC3 | 1 test | — | — | Covered |
| AC3a | 2 tests | 2 (chain + misuse) | 1 (in chain) | Covered |
| AC4 | 2 tests | 1 (in chain) | 1 (in chain) | Covered |
| AC5 | 2 tests | 1 (in chain) | 1 (in chain) | Covered |
| AC6 | 2 tests | 1 (in chain) | 1 (in chain) | Covered |
| AC7 | 2 tests | 1 (in chain) | 1 (in chain) | Covered |
| AC8 | 1 test | — | — | Covered |
| AC8a | 1 test | 2 (chain + misuse) | 1 (in chain) | Covered |
| AC9 | 2 tests | 1 (in chain) | 1 (in chain) | Covered |
| AC10 | 3 tests | 1 (in chain) | 1 (in chain) | Covered |
| AC11 | 2 tests | — | 1 (table check) | Covered |
| AC11a | 1 test | — | — | Covered |
| AC12 | 1 test (partial) | — | — | Partial (see FINDING-2) |
| AC13 | 2 tests | — | 1 (in chain) | Covered |
| AC14 | 1 test | 1 (edge) | 1 (in chain) | Covered |
| AC14a | 1 test (composite) | — | — | Covered |

All 18 ACs have at least one dedicated test. AC12 is the only one with a caveat — runtime regression requires a full suite run, not a structural test.

---

### Pre-existing Failures (not caused by this feature)

Two tests in other files fail independently:

1. `tests/node/core-skill-contracts.test.js` — `skills/prd-writing/SKILL.md` exceeds 120-line budget
2. `tests/contracts/skill-size-convention.test.js` — root and docs/CLAUDE.md skill-size rules diverge

These are unrelated to qa-test-quality and should not block this feature.

---

### Actionable Items for Phase 5

1. **FINDING-3:** Add comments above phrase-bound content assertions explaining they are semantic spot-checks — **RESOLVED:** Added "Semantic spot-check" comments above all 5 phrase-bound assertions in `tests/contracts/qa-test-quality.test.js` (lines 79, 168-172, 196, 221, 342).
2. **FINDING-5:** Use extracted link path instead of hardcoded path in integration edge test — **RESOLVED:** `tests/integration/qa-test-quality.integration.test.js` line 101-114 now resolves the path from `match[1]` instead of hardcoding `skills/tdd/test-quality-rules.md`.
3. **FINDING-6:** Document ordering source or remove ordering assertions in E2E test — **RESOLVED:** Added comment in `tests/e2e/qa-test-quality.spec.js` citing `architecture.md § Content Placement Rules` as the ordering source.
