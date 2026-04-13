## Code Review: feature/ISS-024-014-033-review-hardening
**Generated:** 2026-04-14T00:15:00Z
**Date:** 2026-04-14 | **Reviewer:** code-reviewer agent | **Reviewed in separate context from authoring phase**
**Diff:** `git diff main...HEAD`
**Review round:** 3 (fresh independent review)

---

### Summary

This branch implements review-layer hardening across 3 tickets (ISS-024, ISS-014, ISS-033) with 18 acceptance criteria. The changes are additive: a new required `source_spec` field in the handoff schema, a Reviewer Independence section in the code-review skill, adversarial stance and separate-context enforcement in both gate roles, source_spec-first prompt injection in gate commands, pipeline phase tagging in CLAUDE.md, and all 7 phase commands updated with source_spec in their handoff templates. The path traversal guard in checkpoint.js uses layered validation (schema pattern, JS guard for `..`, prefix allowlist, file-existence check). All 70 tests pass across 4 suites (contracts, e2e, integration, unit). Source and installed copies are byte-identical for all touched files.

---

### Verdict: APPROVE

All 18 ACs are satisfied. The prior review's BLOCKING finding (commands 1-3, 5, 7 missing source_spec) was fixed in commit `6516d13`. No new BLOCKING or HIGH findings. The implementation matches the PRD and architecture doc. The code is correct, the tests are comprehensive, and the conventions are followed.

---

### Findings

#### praise: Layered path traversal defense

The `source_spec` validation in [checkpoint.js:158-175](hooks/checkpoint.js#L158-L175) validates at three levels: schema-level regex pattern (`^(docs/|https://github\.com/)`), JS-level guards for `..` segments and absolute paths, and file-existence check via `fs.existsSync`. This matches the trust boundary model in the architecture doc and exceeds the security audit's HIGH recommendation.

#### praise: Test quality — structural anchors throughout

The test suite consistently uses structural anchors (heading names like `## Reviewer Independence`, field names like `source_spec`) rather than prose-bound assertions. This follows the project convention from ISS-010 and will survive future wording refinements without false failures. The split-pattern technique for the `.skip` self-match guard in the E2E regression test is clever.

#### suggestion (LOW): Prior review.md was committed to the branch

The previous review round's `review.md` (with a now-resolved BLOCKING finding and conditional APPROVE) was committed to the branch in an earlier phase. This review replaces it. No action needed — this is expected behavior in the re-review workflow.

#### suggestion (MEDIUM): `produced_by` remains optional in schema

The separate-context check in review.md and security-gate.md depends on `produced_by` being present in the handoff. The field is not in the schema's `required` array. If an agent omits `produced_by`, the role check silently passes (no halt). This is acceptable as defense-in-depth — the PRD only requires `source_spec` to be required (AC14), and the architecture doc acknowledges the `produced_by` check is a layered mitigation, not a hard guarantee. Consider promoting `produced_by` to required in a future batch if all commands already populate it.

#### question (LOW): Architect line limit 100 to 200

[commands/architect.md](commands/architect.md) changes the output limit from 100 to 200 lines. This is not traced to any of the 18 ACs. The prior review investigated and found it in a separate commit with rationale (the review-hardening arch doc itself is 97 lines). Not blocking, but it's a scope creep marker worth noting.

---

### AC Cross-Reference

| AC | Status | Evidence |
|----|--------|----------|
| AC1 | PASS | `## Reviewer Independence` heading in [SKILL.md](skills/code-review/SKILL.md); PRD-first + hypotheses-to-falsify + field tracing |
| AC2 | PASS | "Trace fields through the schema -> validate -> transform chain" in Reviewer Independence section |
| AC3 | PASS | [commands/review.md](commands/review.md) loads source_spec before diff, treats handoff as secondary |
| AC4 | PASS | skills/code-review/SKILL.md = 152 lines, under 250 budget |
| AC5 | PASS | Both [ROLE_CODE_REVIEWER.md](ROLE_CODE_REVIEWER.md) and [ROLE_SECURITY.md](ROLE_SECURITY.md) have `## Adversarial Stance` sections |
| AC6 | PASS | Separate context required in both roles + commands; produced_by check; architecture discloses same-agent-different-role limitation with residual risk |
| AC7 | PASS | CLAUDE.md pipeline tags phases 1-3,5 as (authoring), 4,6 as (gate/review) |
| AC8 | PASS | ROLE_CODE_REVIEWER.md prompts: guard failures, stale state, unauthorized access, trust boundaries |
| AC9 | PASS | Both gate roles have explicit read-only constraint (no src/ writes) |
| AC10 | PASS | Both review.md and security-gate.md include "Reviewed in separate context from authoring phase" header template |
| AC11 | PASS | All 6 sub-criteria verified: (a) adversarial in both roles, (b) source_spec required in schema, (c) commands halt on missing, (d) separate context enforced, (e) read-only in both roles, (f) pipeline tagged |
| AC12 | PASS | review.md instructs reading source_spec before diff |
| AC13 | PASS | Both review.md and security-gate.md have source_spec-first prompt injection |
| AC14 | PASS | source_spec in required array + property definition with type/pattern/description |
| AC15 | PASS | CLAUDE.md documents precedence: ticket file > GitHub issue URL > other declared source |
| AC16 | PASS | review.md halts with explicit error when source_spec missing or unresolvable; checkpoint.js validates file existence |
| AC17 | PASS | Regression tests guard source_spec in schema, source_spec in review command, adversarial in both roles |
| AC18 | PASS | CLAUDE.md references source_spec handling; review.md references Reviewer Independence |

---

### Test Assessment

- [x] New code has corresponding tests — 66 new tests across contracts (46), integration (10), e2e (14)
- [x] Edge cases are covered — bugfix with ticket source_spec, same-role halt, missing source_spec, path traversal, file not found
- [x] No skipped tests introduced — E2E regression test self-verifies no `.skip` in the suite
- [x] Tests are testing behaviour, not implementation — structural anchors used throughout

---

### Convention Compliance

- [x] Follows project folder structure — tests in `tests/contracts/`, `tests/e2e/`, `tests/integration/`; roles as `ROLE_UPPER_SNAKE.md`
- [x] Naming conventions respected — kebab-case for commands/skills, UPPER_SNAKE for roles
- [x] No `any` types without documented reason — JavaScript codebase, not applicable
- [x] No hardcoded values — validation uses relative-path patterns, not hardcoded project paths
- [x] Commit messages follow format — `feat:`, `test:`, `fix:`, `chore:` prefixes with WHY explanations
- [x] Source/installed copies in sync — verified byte-identical for checkpoint.js, review.md, security-gate.md, SKILL.md
