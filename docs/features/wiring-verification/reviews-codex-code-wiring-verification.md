# Review: wiring-verification
**Generated:** 2026-04-13T23:52:13Z

## Findings
- [BLOCKING] [tests/integration/wiring-verification.integration.test.js:40] The integration tests invoke `node --test` from inside a `node:test` process via `execSync`. Running this file produces Node's recursive-runner warning instead of executing `tests/node/command-skill-wiring.test.js`, so all three integration tests fail immediately and never validate the wiring checker. Verified with `node --test tests/integration/wiring-verification.integration.test.js`, which returns only `Warning: node:test run() is being called recursively within a test file`.
- [BLOCKING] [tests/contracts/wiring-verification.test.js:114, commands/implement.md:66] The new AC4/AC5 tests require explicit artifact-verification wording, but the command changes only add `## Output` sections and never add the verification step promised by the ticket. As shipped, `node --test tests/contracts/wiring-verification.test.js tests/e2e/wiring-verification.spec.js` fails on AC4, AC5, and the matching E2E assertion because `commands/implement.md` and `commands/test-design.md` do not mention artifact verification at all.
- [MAJOR] [tests/contracts/wiring-verification.test.js:152, tests/e2e/wiring-verification.spec.js:110] The AC8 assertions use negative regexes like `skip.*condition|condition.*skip` against the entire wiring test source. That pattern matches harmless comments such as `Missing section -> skip (AC7)` followed later by `Condition column...`, so the AC8 contract and E2E tests fail even though the implementation does not skip conditional artifacts. This makes the suite brittle and self-failing on documentation text rather than behavior.

## Open Questions
- None.

## Merge Recommendation
- REQUEST CHANGES

## Verification Notes
- Reviewed `git diff main...HEAD` on `feature/ISS-036-wiring-verification`.
- Read `.claude/handoff.json`, `tests/node/command-skill-wiring.test.js`, `tests/integration/wiring-verification.integration.test.js`, `tests/contracts/wiring-verification.test.js`, `tests/e2e/wiring-verification.spec.js`, `commands/implement.md`, `commands/test-design.md`, and `docs/issues/tickets/ISS-036.md`.
- Ran `node --test tests/node/command-skill-wiring.test.js`.
- Ran `node --test tests/integration/wiring-verification.integration.test.js`.
- Ran `node --test tests/contracts/wiring-verification.test.js tests/e2e/wiring-verification.spec.js`.
