# Code Review: invariants-audit
**Generated:** 2026-04-16T23:45:00Z
**Date:** 2026-04-16 | **Reviewer:** code-reviewer agent (claude-sonnet-4-6)
**Diff:** `git diff main...HEAD`
**Reviewed in separate context from authoring phase**
**Source spec:** `docs/features/invariants-audit/prd.md`

---

## Re-Review (Phase 6, Pass 2)

This is a second pass after the developer resolved all prior findings. The prior review and
its Resolution Notes are preserved below. This section records the findings from the current diff state.

### Summary

The feature branch correctly adds the `invariants-audit` skill with full cross-layer wiring:
SKILL.md at 64 lines, sibling review-categories.md, source/installed byte-identity verified,
4 Claude commands updated with Skill References rows, 4 Codex reviewers updated with `## Invariant Checks`
sections, and a comprehensive wiring test suite (48 node tests + 8 integration tests all passing).
The previously BLOCKING and HIGH items are confirmed resolved.

However, the branch introduces **two new regressions** compared to main: a net of 10 contract
tests that were passing on main now fail on this branch. The primary cause is the `prd-writing/SKILL.md`
refactor that moved the Ticket Fidelity Procedure body to a sibling file without updating the
`clarification-checkpoints.test.js` suite, which checks the content inline. A secondary cause is the
new `invariants-audit` skill not being recorded in `docs/memory/skill-migration-audit.md`, breaking
an AC5 scan that includes all discovered skill names.

**Verdict: REQUEST_CHANGES** — two new regressions must be fixed before merge.

---

### Findings

#### BLOCKING: 9 contract tests newly broken by prd-writing SKILL.md refactor

**File:** `skills/prd-writing/SKILL.md` (diff hunk replacing `## Ticket Fidelity Procedure` body)

**Issue:** The branch moves the entire Ticket Fidelity Procedure content from inline in
`skills/prd-writing/SKILL.md` into a new sibling file `skills/prd-writing/ticket-fidelity.md`
and replaces the body with `[See reference: .claude/skills/prd-writing/ticket-fidelity.md]`.

The `tests/contracts/clarification-checkpoints.test.js` suite (46 tests total) checks
`skills/prd-writing/SKILL.md` directly for Ticket Fidelity Procedure content — it does not
follow `[See reference:]` links. On main: 0 failures. On this branch: 9 failures. Confirmed by
running the suite independently on both branches.

Failing tests:
- AC0 (×3): Ticket Fidelity Procedure instructs transcribing/flagging/detecting drift
- AC0a (×2): verifying against docs/CLAUDE.md / canonical fallback
- AC0b (×1): checking for internal contradictions
- AC0c (×2): handling open-ended scope / "ask the user" alternative
- Ticket-not-found (×1): degraded-mode warning for missing ticket

The content exists in `ticket-fidelity.md` and is correct — the gap is that the test suite
was not updated to resolve sibling references before asserting. This is a test-contract
regression, not a content regression.

**Recommendation:** Either update `clarification-checkpoints.test.js` to resolve `[See reference:]`
links in `prd-writing/SKILL.md` before asserting content (so the test reads the sibling file),
or add the content back inline in `SKILL.md` and put only the extended steps in the sibling.
The refactor itself is sound — the test contract must catch up with the indirection pattern
it already validates for `invariants-audit`.

---

#### BLOCKING: AC5 skill-migration-audit check newly fails because `invariants-audit` is undocumented

**File:** `docs/memory/skill-migration-audit.md` (not modified by this branch)

**Issue:** `tests/contracts/skill-size-convention.test.js` AC5 checks that `skill-migration-audit.md`
mentions every skill discovered in `skills/*/SKILL.md`. The branch adds `skills/invariants-audit/`
but does not update `skill-migration-audit.md`. Result: AC5 passes on main (46 tests clean),
fails on this branch (1 new failure).

Confirmed: same `skill-migration-audit.md` content, same test file — only the addition of
the `invariants-audit` skills directory causes the regression.

**Recommendation:** Add an entry for `invariants-audit` to `docs/memory/skill-migration-audit.md`
in the appropriate category (compliant — 64 lines, progressive disclosure, already split). This
is a 2-3 line update to an existing file.

---

#### PRAISE: Prior findings correctly resolved — verified against diff

All four previously raised items are confirmed fixed:
- `review-feedback-loop.test.js` is committed and passes (3/3 tests green).
- `commands/specify.md`, `.claude/commands/specify.md`, `codex/reviewers/README.md` are committed; contract tests pass against HEAD.
- `### Invariant Analysis` regex tightened to `/emit.*###.*Invariant Analysis/i` across all 4 AC6 tests — verified in diff.
- Sibling-reference resolution test generalized to auto-discover all skills — covers prd-writing and invariants-audit alike.
- `upgrade.sh` dry-run echo now includes `resolve-feature.cjs` — verified in diff.

---

### Acceptance Criteria Verification

| AC | Status | Evidence |
|----|--------|---------|
| AC1: SKILL.md ≤120 prose lines, sibling refs, stop conditions footer | PASS | 64 total lines; `[See reference:]` present; stop conditions footer present |
| AC1a: init.sh + upgrade.sh install to .claude/skills/invariants-audit/ with byte-identity | PASS | Both use `cp -r skills/*`; `diff` shows byte-identity; integration tests pass |
| AC2: 5 review categories documented | PASS | All 5 categories in review-categories.md; wiring tests pass |
| AC3: 5-step invariant method | PASS | All 5 steps in SKILL.md; wiring tests pass |
| AC4: Claude commands Skill References rows | PASS | review.md, architect.md, security-gate.md, test-design.md all updated; 48 wiring tests pass |
| AC5: Codex reviewers ## Invariant Checks sections | PASS | All 4 reviewers: `## Invariant Checks`, `**Apply when:**`, emit instruction; wiring tests pass |
| AC6: Wiring contract tests | PASS | review-feedback-loop.test.js committed and passing; wiring tests 48/48 pass; integration 8/8 pass |
| AC7: When to Use trigger conditions | PASS | `## When to Use` table present with 4 trigger rows |

### Regression Summary

| Suite | Main baseline | Branch | Delta | Source |
|-------|--------------|--------|-------|--------|
| tests/node/*.test.js | 186 pass, 0 fail | 186 pass, 0 fail | 0 | — |
| tests/contracts/*.test.js | 291 pass, 4 fail | 284 pass, 14 fail | -10 net | prd-writing refactor + skill-migration-audit gap |
| tests/integration/*.test.js | pass | 8 pass, 0 fail | +8 new | New feature tests |
| tests/contracts/review-feedback-loop.test.js | not on main | 3 pass, 0 fail | +3 | Correctly committed |

The 4 pre-existing failures on main (AC9 and AC15 in skill-size-convention) are not caused by
this branch and are not blocking for this feature.

---

### Test Assessment

- [x] New code has corresponding tests
- [x] Edge cases covered (byte-identity drift, broken sibling refs, illegal skill paths)
- [x] All test files committed — confirmed for this branch
- [x] Tests test behaviour, not implementation — wiring tests use `extractSection` and structural anchors
- [ ] No regressions introduced — FAILS: 10 contract tests broken by this branch

### Convention Compliance

- [x] Follows project folder structure
- [x] Naming conventions respected
- [x] No hardcoded absolute paths
- [x] Source/installed copies byte-identical for all new skill files
- [x] Commit messages follow format
- [x] Symmetric gate enforcement: review.md and security-gate.md both updated symmetrically
- [ ] New skill not in skill-migration-audit.md — AC5 regression

---

## Resolution Notes (Pass 1 — Prior Review)

- [ADDRESSED] BLOCKING: `tests/contracts/review-feedback-loop.test.js` untracked — committed in `2d10313` (`chore(invariants-audit): commit missed review-feedback-loop tests and working-tree changes`). File is now version-controlled and will run in CI.
- [ADDRESSED] HIGH: `commands/specify.md`, `.claude/commands/specify.md`, `codex/reviewers/README.md` unstaged — all three staged and committed in `2d10313`. Contract tests now pass against HEAD, not just working tree.
- [ADDRESSED] HIGH: `### Invariant Analysis` wiring tests prove string presence, not output-instruction intent — regex changed from `/###\s+Invariant Analysis/` to `/emit.*###.*Invariant Analysis/i` in all 4 AC6 tests in `tests/node/command-skill-wiring.test.js`; block comment and assertion messages updated. Committed in `e396bcf` (`test(invariants-audit): tighten ### Invariant Analysis wiring assertion`).
- [ADDRESSED] MEDIUM: `skills/prd-writing/SKILL.md` sibling reference not covered by tests — replaced the invariants-audit-specific `[See reference:]` resolution test with a generalized test that auto-discovers all `skills/*/SKILL.md` files. Now covers prd-writing, code-review, tdd, verification-gate, and invariants-audit. Committed in `6f6ff4e` (`test(invariants-audit): generalize sibling-reference resolution test to all skills`).
- [ADDRESSED] LOW: `upgrade.sh` dry-run echo listed only three `.cjs` hook files — added `resolve-feature.cjs` to the echo line so the printed plan matches the actual copy commands. Committed in `3e32394` (`fix(upgrade.sh): include resolve-feature.cjs in dry-run echo`).

---

## Resolution Notes (Pass 2 — This Review)

_(To be filled by developer after addressing Pass 2 findings.)_
