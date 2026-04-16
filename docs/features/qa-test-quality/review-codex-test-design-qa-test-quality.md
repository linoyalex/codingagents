# Test Design Review: qa-test-quality
**Generated:** 2026-04-16T01:45:54Z

## Findings
- [MEDIUM] [AC12 / tests/contracts/qa-test-quality.test.js] The no-regression coverage is too weak for what AC12 promises. The only AC12-specific check scans the two new feature test files for `.skip`/`xit` markers ([tests/contracts/qa-test-quality.test.js](/Users/linoy/projects/codingagents/tests/contracts/qa-test-quality.test.js:396)). But the PRD requires that all previously passing tests continue to pass when the full suite runs ([docs/features/qa-test-quality/prd.md](/Users/linoy/projects/codingagents/docs/features/qa-test-quality/prd.md:50)). A change could break unrelated existing tests without introducing skipped cases here, and this design would still go green.
- [MEDIUM] [Integration Wiring / tests/integration/qa-test-quality.integration.test.js] The command-to-skill wiring assertion can false-pass on incidental text. The main integration test treats any `/tdd/` match in `commands/test-design.md` as proof that the command references the TDD skill ([tests/integration/qa-test-quality.integration.test.js](/Users/linoy/projects/codingagents/tests/integration/qa-test-quality.integration.test.js:57)). That does not verify the command actually loads the skill via the intended wiring surface, so the integration chain could pass even if the formal skill reference were broken but the file still mentioned “TDD” somewhere else.
- [MINOR] [AC11 / tests/contracts/qa-test-quality.test.js] The artifact-type table test verifies row count and category presence, but not the required rationale. AC11 says the table must include the three categories from AC10 and their rationale ([docs/features/qa-test-quality/prd.md](/Users/linoy/projects/codingagents/docs/features/qa-test-quality/prd.md:48)). The current tests count rows and look for declarative/executable/config terms ([tests/contracts/qa-test-quality.test.js](/Users/linoy/projects/codingagents/tests/contracts/qa-test-quality.test.js:354), [tests/contracts/qa-test-quality.test.js](/Users/linoy/projects/codingagents/tests/contracts/qa-test-quality.test.js:374)), so a table with bare category names and no “why” column could still satisfy the suite.

## Coverage Map Notes
- Well covered: AC1, AC3, AC4, AC5, AC6, AC8, AC9, AC10, AC13, and AC14 each have clear structural anchor checks plus at least one stronger semantic spot-check where appropriate.
- Well covered: AC2, AC3a, AC7, and AC8a are materially protected now that the design uses explicit labels in `SKILL.md` and structural headings in the sibling file.
- Weakly covered: AC11 is only partially protected because rationale is not asserted.
- Weakly covered: AC12 is represented by a local “no skipped tests” guard rather than a true regression gate.
- Weakly covered: the integration chain exists, but the command→skill hop is checked with an overly broad `/tdd/` match instead of the explicit wiring surface.

## Recommendations
- Replace the AC12-specific skip scan with a test-design note or verification expectation that points to the actual full-suite regression command, and keep the skip check only as a supplemental guard.
- Strengthen the integration wiring assertion to anchor on the Skill References table or the exact `tdd` skill path rather than any `tdd` substring.
- Add an assertion that the artifact-type table includes a rationale column or equivalent explanatory cell for each category, not just category names.
