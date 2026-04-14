# Test Design Review: review-hardening
**Generated:** 2026-04-13T15:17:38Z

## Findings
- [MEDIUM] [AC6 / AC11 / Same-Agent Review] The updated suites now cover the documented limitation and the deterministic `produced_by` same-role check, but they still stop short of a stronger misuse path that would falsify same-agent-different-role continuity. The remaining AC6 protection is still largely structural and documentary: contract/e2e tests assert that the architecture discloses the limitation and that the commands check `produced_by`, while the integration suite only exercises `checkpoint.js` field handling ([tests/contracts/review-hardening.test.js](/Users/linoy/projects/codingagents/tests/contracts/review-hardening.test.js), [tests/integration/review-hardening.integration.test.js](/Users/linoy/projects/codingagents/tests/integration/review-hardening.integration.test.js), [tests/e2e/review-hardening.spec.js](/Users/linoy/projects/codingagents/tests/e2e/review-hardening.spec.js)). That is a reasonable proxy, but it can still pass without proving that a realistic same-agent role-switch attempt would be caught anywhere beyond the documented residual-risk boundary.

## Coverage Map Notes
- Well covered: AC7 now has exact phase-mapping assertions in both contract and e2e tests; AC15 now has explicit precedence and URL-acceptance checks; AC14-17 have clear schema/command/error-path regression guards; AC1-5 and AC9-10 still have strong structural coverage across the intended review-hardening artifacts.
- Weak or uncovered: AC6 remains only partially covered because the highest-risk same-agent-different-role bypass is acknowledged and bounded, but not exercised through a higher-fidelity misuse test.

## Recommendations
- Add one higher-fidelity AC6 misuse test that models a same-agent role switch more concretely than the current `produced_by`/documentation proxy, even if the final assertion is still bounded by the architecture's admitted residual-risk seam.
