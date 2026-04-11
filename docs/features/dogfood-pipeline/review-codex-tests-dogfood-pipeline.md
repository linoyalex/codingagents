# Test Design Review: dogfood-pipeline

## Findings
- [BLOCKING] [AC2] The current tests do not verify the core pipeline contract: that phases 1-7 execute in order, each phase writes a valid handoff, and the next phase consumes it. The only AC2 checks are a schema range assertion on `phase` (`tests/node/dogfood-pipeline.test.js:45-55`) and an E2E loop that injects synthetic handoffs directly, then asserts `restore-context.js` prints something for each phase (`tests/node/dogfood-pipeline-e2e.test.js:82-112`). That can pass even if real phase commands never write the required handoff shape, write the wrong phase number, or fail to carry forward the expected context between phases.
- [BLOCKING] [AC5] The artifact-isolation test targets the wrong feature directory and is too weak to catch the documented failure mode. The PRD requires that after phases 1-3, `docs/features/invariants-audit/` contains only `prd.md`, `architecture.md`, and `security-audit.md` (`docs/features/dogfood-pipeline/prd.md:16`), but the test inspects `docs/features/dogfood-pipeline/` instead (`tests/node/dogfood-pipeline.test.js:112-116`). It then only checks that every entry has a `.md` extension (`tests/node/dogfood-pipeline.test.js:116-125`), so extra markdown artifacts like review files would still pass. This leaves AC5 effectively unprotected.
- [MAJOR] [AC8] Backlog logging coverage is not falsifiable against the acceptance criterion. AC8 requires bugs found during dogfood phases to be logged to `docs/issues/backlog.md` with links to the phase where they surfaced (`docs/features/dogfood-pipeline/prd.md:19`), but the test ignores `backlog.md` content and only asks whether any ticket anywhere contains phase-like text (`tests/node/dogfood-pipeline.test.js:188-205`). Even if this test were made green by adding one historical phase tag to an unrelated ticket, it still would not prove that dogfood-discovered issues are indexed in the backlog with traceable phase links.
- [MAJOR] [AC9] Token-tracking coverage is almost entirely absent. AC9 requires aggregated per-phase costs compared to budget targets with >20% variance documented (`docs/features/dogfood-pipeline/prd.md:20`), but the only dedicated assertion is that `codex/report-usage.sh` exists and is executable (`tests/node/dogfood-pipeline.test.js:208-219`). There is no test that a dogfood run produces a report, no test that first-pass totals or per-phase totals are computed, and no negative-path check that over-budget phases are surfaced.
- [MAJOR] [AC3] The verification-hook tests only prove that `checkpoint.js` prints token-related text and writes a checkpoint file, not that phase detection is correct or that token logging produced the expected artifact. See `tests/node/dogfood-pipeline.test.js:57-84` and `tests/node/dogfood-pipeline-e2e.test.js:114-138`. Because AC3 explicitly includes token logging, phase detection, and successful handoff validation (`docs/features/dogfood-pipeline/prd.md:14`), the current assertions are too loose to catch regressions in the checkpoint output structure or detected phase.

## Coverage Map Notes
- AC1 appears reasonably covered by a real temp-dir install run in `tests/node/dogfood-pipeline-e2e.test.js:46-80`.
- AC4 has meaningful negative-path coverage via malformed/corrupted handoff tests in `tests/node/dogfood-pipeline.test.js:86-107` and `tests/node/dogfood-pipeline-e2e.test.js:140-169`; these are currently red for a real product gap already captured elsewhere.
- AC6 has direct contract coverage for prompt scoping in `tests/node/dogfood-pipeline.test.js:128-150`; these are currently red for a real product gap already captured elsewhere.
- AC2, AC3, AC5, AC8, and AC9 remain uncovered or weakly covered in ways that can pass without meeting the actual acceptance criteria.
- No review finding here depends on implementation internals beyond what the tests themselves already invoke.

## Recommendations
- Add one end-to-end phase-chain test that executes the real phase artifacts/commands or their exact handoff-writing contracts in sequence and asserts the full handoff payload handed from N to N+1 for AC2.
- Replace the AC5 test with an exact-file-set assertion on `docs/features/invariants-audit/` so extra artifacts fail the test immediately.
- Rework AC8 to assert dogfood-specific backlog linkage: a backlog index entry plus a ticket or artifact reference containing the phase pointer for the surfaced issue.
- Add a report-generation test for AC9 that feeds `token-usage.jsonl` fixture data through the reporting path and asserts both in-budget and >20%-over-budget outcomes.
- Tighten AC3 by asserting the contents of `.claude/token-usage.jsonl` and `pipeline-checkpoint.json`, including detected phase and handoff-valid status.

## Recommendation
Merge recommendation: REQUEST CHANGES.

## Verification Notes
- Read `codex/reviewers/review-test-design.md`, `docs/features/dogfood-pipeline/prd.md`, and `.claude/handoff.json` for AC/risk context.
- Reviewed the targeted dogfood tests in `tests/node/dogfood-pipeline.test.js` and `tests/node/dogfood-pipeline-e2e.test.js`.
- Ran `node --test tests/node/dogfood-pipeline.test.js tests/node/dogfood-pipeline-e2e.test.js` and confirmed current red coverage on AC4, AC6, and the weak AC8 test.
- Accounted for the existing architecture review at `docs/features/dogfood-pipeline/review-codex-architecture-dogfood-pipeline.md` and avoided repeating its implementation-focused findings as test-design findings.
