# Test Design Review: wiring-verification
**Generated:** 2026-04-13T21:12:56Z

## Findings
- [HIGH] [AC1/AC3/AC7/AC8/AC9/AC11] `tests/contracts/wiring-verification.test.js:60-75`, `102-170`, and `189-218`, plus `tests/e2e/wiring-verification.spec.js:81-103` and `142-145`, mostly verify this feature by grepping `tests/node/command-skill-wiring.test.js` for keywords like `Skill References`, `Required Artifacts`, or `assert.throws`. That is not a falsifiable test of the wiring algorithm. These checks can all pass while discovery, registry parsing, condition handling, output-path matching, or error reporting is broken.
- [HIGH] [AC2] The motivating regression is not actually exercised. AC2 requires the pre-fix `skills/tdd/SKILL.md` → `commands/test-design.md` gap to fail with the missing slot identified by skill, artifact, and command (`docs/features/wiring-verification/prd.md:17-20`). But `tests/contracts/wiring-verification.test.js:81-96` only checks that the post-fix command text mentions `integration` and `tests/integration/`, and `189-205` only proves a generic mock command omits that path. That leaves the original escaped defect and the required failure payload untested.
- [MEDIUM] [AC8] The tests drift from the PRD on conditional artifacts. The PRD says conditional artifacts only need the command to mention the artifact by name or pattern (`docs/features/wiring-verification/prd.md:47-50`), but `tests/contracts/wiring-verification.test.js:151-159` requires the same full pattern+path validation as unconditional artifacts and forbids condition-specific handling. Either the spec or the tests need to change; as written, the suite is not aligned to the contract it is supposed to enforce.
- [MEDIUM] [AC4/AC10] The suite overconstrains one area and under-tests another. `tests/e2e/wiring-verification.spec.js:67-79` requires `commands/implement.md` to have an `Output`/`Deliverables` section even though AC4 only requires a Phase 5 checklist instruction (`docs/features/wiring-verification/prd.md:27-30`). Meanwhile AC10's no-regression requirement (`docs/features/wiring-verification/prd.md:57-60`) is reduced to checking that two old test files still exist in `tests/contracts/wiring-verification.test.js:177-183`, which would not catch regressions in the existing suite.

## Coverage Map Notes
- AC6 appears partially covered: the contract tests do verify that `skills/tdd/SKILL.md` has a `## Required Artifacts` section and the expected table header.
- AC4 and AC5 appear partially covered at a structural level: the tests do check for artifact-verification language in `commands/implement.md` and `commands/test-design.md`.
- AC11 fixture presence is covered, but the important part of AC11 is gap detection and actionable failure messaging, and that remains weak.
- AC1, AC2, AC3, AC7, AC8, AC9, and AC10 are weak or effectively uncovered behaviorally because the tests rarely execute the contract being described.

## Recommendations
- Replace the keyword-grep assertions with executable tests that run the wiring checker against real markdown inputs and assert exact pass/fail behavior, including which skill, command, artifact, and missing field are reported.
- Add an explicit AC2 regression fixture that models the original `tdd`/`test-design` pre-fix state and asserts the expected failure message, instead of relying on a generic mock gap.
- Resolve the AC8 contract mismatch before implementation: either keep the PRD's "name or pattern mention" rule for conditional artifacts or update the PRD to require full pattern+path matching.
- Rework AC10 into an actual regression guard by running or at least targeting the affected existing suites, and drop the non-PRD `implement.md` Output-section requirement unless the spec is intentionally being expanded.
