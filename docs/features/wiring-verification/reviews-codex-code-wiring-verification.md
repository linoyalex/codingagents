# Review: wiring-verification
**Generated:** 2026-04-13T23:52:13Z

## Findings

- [BLOCKING] [tests/integration/wiring-verification.integration.test.js:40] The integration tests invoke `node --test` from inside a `node:test` process via `execSync`. Running this file produces Node's recursive-runner warning instead of executing `tests/node/command-skill-wiring.test.js`, so all three integration tests fail immediately and never validate the wiring checker. Verified with `node --test tests/integration/wiring-verification.integration.test.js`, which returns only `Warning: node:test run() is being called recursively within a test file`.
  - **Resolution:** Integration tests rewritten to import `lib/wiring-check.js` directly instead of spawning a subprocess. No `execSync` or `child_process` usage remains. All 3 integration tests pass. Fixed in Phase 5 fix cycle 2 (commit 1dd55f0).

- [BLOCKING] [tests/contracts/wiring-verification.test.js:114, commands/implement.md:66] The new AC4/AC5 tests require explicit artifact-verification wording, but the command changes only add `## Output` sections and never add the verification step promised by the ticket. As shipped, `node --test tests/contracts/wiring-verification.test.js tests/e2e/wiring-verification.spec.js` fails on AC4, AC5, and the matching E2E assertion because `commands/implement.md` and `commands/test-design.md` do not mention artifact verification at all.
  - **Resolution:** Both `commands/implement.md` (line 66) and `commands/test-design.md` (line 52) now have a `## Artifact Wiring Verification` section. AC4/AC5 contract tests strengthened with structural anchor (`/^## Artifact Wiring Verification$/m`) plus behavioral `checkCommandSkillWiring` assertions (commit 7eb7036). `tests/e2e/wiring-verification.spec.js` restored with behavioral tests covering AC4 and AC5 (commit ff2aa4e). All 24 contract+E2E tests pass.

- [MAJOR] [tests/contracts/wiring-verification.test.js:152, tests/e2e/wiring-verification.spec.js:110] The AC8 assertions use negative regexes like `skip.*condition|condition.*skip` against the entire wiring test source. That pattern matches harmless comments such as `Missing section -> skip (AC7)` followed later by `Condition column...`, so the AC8 contract and E2E tests fail even though the implementation does not skip conditional artifacts. This makes the suite brittle and self-failing on documentation text rather than behavior.
  - **Resolution:** AC8 tests replaced with behavioral assertions that call `parseRequiredArtifacts` and `checkArtifactWiring` directly against fixture data. No source-text grepping or negative regexes remain. Fixed in Phase 5 fix cycle 2 (commit 1dd55f0), further strengthened in commit 7eb7036.

- [MAJOR] [lib/wiring-check.js:166, 101, 142] Blank-cell parser defect: `split('|').map(trim).filter(Boolean)` silently drops empty table cells, causing column misalignment when interior cells are blank (e.g., empty Condition column `| |`). Affects `parseRequiredArtifacts` (line 166), `parseSkillReferences` (line 101), and header validation (line 142). A blank Pattern or Path cell would have its value silently replaced by the next column's content.
  - **Resolution:** Replaced `filter(Boolean)` with `slice(1, -1)` in all three locations — drops only the leading/trailing empty strings from pipe delimiters while preserving blank interior cells. Added 3 contract tests proving: (1) blank Condition cell parses as `''` without column shift, (2) blank interior Pattern cell stays empty rather than collapsing, (3) `parseSkillReferences` preserves column positions.

## Open Questions
- None.

## Merge Recommendation
- REQUEST CHANGES (original)
- **Updated: ALL FINDINGS RESOLVED** (2026-04-14) — original 3 findings + blank-cell parser defect addressed. Re-verification: 57/57 tests pass across all 5 test files.

## Verification Notes
- Reviewed `git diff main...HEAD` on `feature/ISS-036-wiring-verification`.
- Read `.claude/handoff.json`, `tests/node/command-skill-wiring.test.js`, `tests/integration/wiring-verification.integration.test.js`, `tests/contracts/wiring-verification.test.js`, `tests/e2e/wiring-verification.spec.js`, `commands/implement.md`, `commands/test-design.md`, and `docs/issues/tickets/ISS-036.md`.
- Ran `node --test tests/node/command-skill-wiring.test.js`.
- Ran `node --test tests/integration/wiring-verification.integration.test.js`.
- Ran `node --test tests/contracts/wiring-verification.test.js tests/e2e/wiring-verification.spec.js`.
