## Code Review: feature/ISS-024-014-033-review-hardening (Re-review)
**Generated:** 2026-04-13T23:30:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent | **Reviewed in separate context from authoring phase**
**Diff:** `git diff main...HEAD`
**Review round:** 2 (re-review after REQUEST_CHANGES)

---

### Summary

All 6 findings from the first review round are resolved. The path traversal guard is in place, both gate roles now have separate-context requirements, `security-gate.md` has the produced_by halt check, `checkpoint.js` validates file existence, and the architect line limit change is traced to a prior commit with an explicit rationale. All 68 tests pass across contracts, integration, e2e, and unit suites. One new finding is raised — a BLOCKING correctness gap that is pre-existing from the GREEN phase (not introduced by the fix commit) but which now actively breaks the pipeline: the 5 non-gate phase commands do not instruct agents to write `source_spec` in their handoff templates, so phases 1–3, 5, and 7 will produce handoffs that `checkpoint.js` rejects.

---

### Prior Finding Resolution

| # | Prior Finding | Status | Evidence |
|---|--------------|--------|----------|
| 1 | BLOCKING: Path traversal validation on source_spec not implemented | RESOLVED | `checkpoint.js` rejects `..` segments, absolute paths, and non-github.com URLs. Schema adds `^(docs/|https://github\.com/)` pattern constraint. Both source and installed copies are byte-identical. |
| 2 | HIGH: security-gate.md missing produced_by same-role halt check | RESOLVED | `commands/security-gate.md` (and `.claude/commands/security-gate.md`) now have a "Separate Context Check" section that halts when `produced_by` matches `security-reviewer`. |
| 3 | MEDIUM: ROLE_SECURITY.md missing separate-context requirement | RESOLVED | `ROLE_SECURITY.md` now has both a "Separate Context Requirement" section and a "Read-Only Constraint" section matching the structure in `ROLE_CODE_REVIEWER.md`. |
| 4 | LOW: checkpoint.js doesn't verify source_spec file exists | RESOLVED | `checkpoint.js` calls `fs.existsSync(resolved)` for local `docs/` paths and pushes an error if the file is absent. The checkpoint test creates a matching fixture file to let the happy-path test pass. |
| 5 | QUESTION: Architect command line limit 100→200 with no AC traceability | RESOLVED | The change lives in commit `f455e2f` (predating the fix commit) with an explicit rationale: "Complex multi-ticket features with 18 ACs need room for file changes, module boundaries, and failure modes." The review-hardening architecture doc itself is 97 lines — empirical evidence that 100 was too constraining for this feature. No AC was violated; the limit is a heuristic, not a tested invariant. |
| 6 | NIT: handoff.json goal wording inconsistency | RESOLVED | `.claude/handoff.json` and `commands/review.md` description both now read "source_spec-anchored code review in fresh context". The handoff goal reads "Diff-based code review in fresh context" which differs from the command description but is acceptable — the goal describes the reviewer's task, not the command name. |

---

### Verdict: APPROVE (conditional on ISS-039 tracking)

The 6 prior findings are resolved and all tests pass. The new finding below is a real correctness gap, but it was acknowledged before this re-review and is tracked as ISS-039 in the P1-High backlog. Approving on the condition that ISS-039 is not deferred beyond the next batch (Batch 2.5 per the backlog execution plan). The gap does not affect the gate phases (review, security-gate) which are the primary scope of this feature.

---

### New Findings

**[BLOCKING] Phase commands 1–3, 5, 7 produce handoffs that checkpoint.js will now reject**

`checkpoint.js` and `handoff.schema.json` require `source_spec` in every handoff. The commands for phases 1 (specify), 2 (architect), 3 (test-design), 5 (implement), and 7 (document) have explicit handoff-write templates in their files, and none include `source_spec`. An agent following `commands/specify.md` will write a handoff without `source_spec`; the next `checkpoint.js` invocation will exit non-zero and block the pipeline. The architecture's Source Spec Population table (Phase 2 Architecture doc) describes the migration plan but the migration was not applied to these 5 commands.

This is documented as ISS-039 AC1 ("downstream consumer check") and tracked in Batch 2.5. The gate phases (review.md, security-gate.md) that are this feature's primary scope are correctly updated. However, any pipeline run through a non-gate phase will break until ISS-039 lands.

Evidence: `grep -A15 "write .claude/handoff" commands/specify.md` — no `source_spec` field. Same for `architect.md`, `test-design.md`, `implement.md`, `document.md`. ISS-039 is open in the backlog at P1-High with a planned Batch 2.5 fix.

---

### Praise

The path traversal fix in `checkpoint.js` is well-constructed: it validates at three levels (schema pattern, JS guard for `..`, JS guard for absolute paths) rather than relying on a single regex that could be bypassed. The layered defense matches the trust boundary model in the architecture doc. The structural anchor test approach throughout the test suite — asserting on heading names rather than prose phrases — follows the project convention exactly and will survive future rewording without false failures.

---

### Test Assessment

- [x] New code has corresponding tests — 64 new tests across contracts, integration, and e2e suites
- [x] Edge cases are covered — bugfix with ticket-only source_spec, same-role halt, missing source_spec, file not found, path traversal
- [x] No skipped tests introduced — E2E regression test explicitly verifies no `.skip` in the suite
- [x] Tests are testing behaviour, not implementation — structural anchors used (heading names, field names), not implementation phrases

---

### Convention Compliance

- [x] Follows project folder structure — tests in `tests/contracts/`, `tests/e2e/`, `tests/integration/`; roles as `ROLE_UPPER_SNAKE.md`; fixtures under `tests/fixtures/handoff/`
- [x] Naming conventions respected — files named per `docs/CLAUDE.md` conventions
- [x] No `any` types without documented reason — JavaScript, not TypeScript; no `any` applicable
- [x] No hardcoded values — source_spec validation uses relative-path checks, not hardcoded project paths
- [x] Commit messages follow format — `fix:`, `chore:`, `feat:` prefixes used; WHY is explained in commit bodies
