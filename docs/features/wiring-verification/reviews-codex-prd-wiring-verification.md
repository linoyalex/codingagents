# PRD Review: wiring-verification
**Generated:** 2026-04-13T20:10:21Z

## Findings
- [HIGH] [Primary Input] `docs/features/wiring-verification/prd.md` is missing, so the feature does not currently meet the reviewer's required primary input. That makes this review inherently partial and leaves downstream phases without a stable source of truth for acceptance criteria, scope, and testable user outcomes.
- [HIGH] [AC2] The requirement is ambiguous about where the Phase 5 wiring check must live: "`commands/implement.md` (or the TDD skill's Phase 5 checklist)." Those are materially different enforcement points. Leaving both valid means different implementations can satisfy the PRD in incompatible ways, and reviewers/tests will not know which location is canonical.
- [HIGH] [AC1 / AC4] The contract between "required artifact" and "command output instruction" is underspecified. The PRD does not define the artifact registry format, how exact the command match must be, whether naming convention alone is enough, or how to handle conditional artifacts. Without that, the proposed contract test risks becoming subjective or brittle.
- [MEDIUM] [AC1] "For each command that loads a skill" is not precise enough to test consistently. The PRD does not define the command↔skill mapping rules for commands that reference multiple skills, skills split across reference files, or skills that impose no named artifact outputs.
- [MEDIUM] [AC3 / Scope] The feature is framed as a general command↔skill wiring safeguard, but the concrete verification requirement only names TDD's three test levels. The PRD should say whether v1 is universal for all artifact-producing skills or intentionally scoped to the TDD/test-design path first.
- [MEDIUM] [AC5] "The wiring test catches the integration-test-coverage gap when run against the pre-fix state" is not operationalized. The PRD does not say whether this is proved via a regression fixture, a historical checkout, or a dedicated negative test case, so the no-regression criterion is hard to automate reliably.

## Missing States
- No UI screen states are needed for this feature.
- A skill has no required named artifacts: the PRD should say whether the command is skipped or must declare "none."
- A skill artifact is conditional or phase-specific rather than always required: the PRD does not define how the registry expresses that.
- The artifact registry is missing or malformed: expected failure mode for the contract test is not stated.
- A command provides a filename pattern but no path, or a path but no naming convention: the PRD does not define whether that is a pass or fail.
- Multiple output locations are acceptable for the same artifact type: the PRD does not define how much flexibility the test should allow.

## Recommendation
- Needs clarification first
