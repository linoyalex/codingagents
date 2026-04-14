# Test Design Review: code-review-skill-hardening
**Generated:** 2026-04-14T16:25:22Z

## Findings
- [MEDIUM] [AC2] The tests do not directly enforce the PRD’s “flagging any divergence” part of the drift-check behavior. In [tests/contracts/code-review-skill-hardening.test.js](/Users/linoy/projects/codingagents/tests/contracts/code-review-skill-hardening.test.js) and [tests/e2e/code-review-skill-hardening.spec.js](/Users/linoy/projects/codingagents/tests/e2e/code-review-skill-hardening.spec.js), AC2 coverage proves path mapping, sibling-file existence, and sync checks exist, but it does not assert that the methodology tells the reviewer to raise a finding when divergence is detected. That leaves a false-positive path where the docs could say “compare source to installed” without saying what conclusion the reviewer must draw from a mismatch.
- [MEDIUM] [AC4] The prohibition on assigning BLOCKING severity to an unverified finding is only weakly tested. The contract suite checks that `reproduction.md` mentions escalation, but it does not require the same slice of guidance to also state the negative rule that BLOCKING is not allowed unless escalated. That can pass on a document that mentions escalation in some other context while still omitting the core severity constraint from the PRD.
- [MEDIUM] [AC3] The PRD’s multi-suite selection rule is not directly tested. AC3 requires that when multiple suites exist, the reviewer runs the suites that cover files touched by the diff, but the current tests only assert command discovery (`CLAUDE.md`, `package.json`, or equivalent), missing-command handling, and flaky rerun behavior. They do not falsify a methodology that always runs one generic suite or ignores touched-file scoping entirely.

## Coverage Map Notes
- Well covered: AC1 has good structural protection across `SKILL.md` and `impact-analysis.md`, including the producer/consumer grep seam.
- Well covered: AC5 is strongly represented by the broad anchor/meta coverage, sibling-file existence checks, and source/installed sync assertions.
- Well covered: AC6 is covered on both the skill side and the `commands/review.md` side, including the cross-reference to `security-gate.md`.
- Weak or under-specified: AC2 still under-tests the “raise a finding on divergence” consequence; AC3 under-tests multi-suite selection; AC4 under-tests the explicit “no BLOCKING on unverified findings without escalation” constraint.

## Recommendations
- Add one AC2 assertion that the drift-check procedure tells the reviewer to record/raise a finding on any source-installed mismatch, ideally at the same severity promised by the design.
- Tighten AC4 by asserting one contiguous reproduction-policy slice contains `unverified`, the BLOCKING prohibition, and the escalation rule together.
- Add an AC3 assertion for multi-suite selection, such as requiring language about choosing suites that cover the files touched by the diff rather than a single generic command.

## Resolutions (2026-04-14)
- **AC2 divergence:** Added test `AC2: automated-checks.md drift check instructs raising a finding on any divergence` — asserts `/finding|flag|HIGH|divergen/i` in the drift-check procedure. Addresses the false-positive path.
- **AC4 BLOCKING prohibition:** Added test `AC4: reproduction.md contains a contiguous policy slice with unverified + BLOCKING prohibition + escalation` — extracts the Reproduction Requirement section and asserts all three concepts plus the negative rule `/may not.*BLOCKING/i` appear together.
- **AC3 multi-suite selection:** Added test `AC3: automated-checks.md test suite step requires scoping suites to files touched by the diff` — asserts `/touch|cover|scope|affected/i` in the test suite execution procedure.
- **RCA:** Root causes mapped to ISS-043 (behavioral binding, multi-behavior coverage) and ISS-045 (adversarial contract robustness). Evidence added to both tickets. No new tickets needed.
