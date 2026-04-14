# PRD Review: codex-review-hardening
**Generated:** 2026-04-13T20:44:45Z

## Findings
- [HIGH] [AC7] The installer-coverage contract is too narrow for the regression class the PRD says it is preventing. The problem statement and AC1/AC4 talk about install, upgrade, generation, and other operationalizing files, but AC7 only checks three source globs against `init.sh` copy lines. This can still pass while missing `upgrade.sh` handling, directory bootstrap, or other source-of-truth artifacts that make a changed file usable in a real install.
- [MEDIUM] [AC7] "Asserts each source file has a corresponding copy line in init.sh" is brittle and overfits one installer implementation. If the installer later uses loops, manifests, directory copies, or helper functions, the product behavior could be correct while the written acceptance criterion still fails. That makes the PRD harder to evolve and tests the script text more than the install contract.
- [MEDIUM] [AC5] The documentation target is ambiguous. "`docs/memory/codex-rules.md` or `docs/memory/review-process.md`" leaves no clear source of truth for the stronger Codex review expectations, so downstream work can update one file and still leave the other stale.
- [MEDIUM] [AC6] The regression-test requirement is too weak for the amount of behavior being added. "At least one deterministic test or fixture-backed check" can pass with a single structural assertion while AC1-AC4 regress independently, so the PRD does not clearly protect all three new review-method rules plus the unchanged-file scope rule.

## Missing States
- No UI-specific accessibility states are needed for this feature, but the non-UI workflow states below still need clearer coverage.
- The diff introduces a runtime dependency that is operationalized by `upgrade.sh`, a generated artifact, or a bootstrapped directory rather than a literal `init.sh` copy line: the PRD should say whether AC7 is expected to catch that case or whether it is intentionally out of scope.
- The installer is behaviorally correct but implemented through a manifest, loop, or directory copy: the PRD should define whether that still satisfies AC7.
- A review diff contains no tests or no parser/validator changes: the PRD should clarify the expected reviewer behavior so agents do not invent checklist work where the trigger conditions do not apply.
- Both `docs/memory/codex-rules.md` and `docs/memory/review-process.md` exist and disagree after the change: the PRD should say which one wins.

## Recommendation
- Needs clarification first
