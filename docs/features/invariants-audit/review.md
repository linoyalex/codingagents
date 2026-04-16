# Code Review: invariants-audit
**Generated:** 2026-04-16T23:59:00Z
**Date:** 2026-04-16 | **Reviewer:** code-reviewer agent (claude-sonnet-4-6)
**Diff:** `git diff main...HEAD`
**Reviewed in separate context from authoring phase**
**Source spec:** `docs/features/invariants-audit/prd.md`

---

## Re-Review (Phase 6, Pass 3)

This is a third pass after the developer resolved the two BLOCKING regressions found in Pass 2.
All prior review sections and Resolution Notes are preserved below. This section records the
verdict from the current diff state.

### Summary

Both Pass 2 BLOCKING regressions are confirmed fixed by independent test execution.
`tests/contracts/clarification-checkpoints.test.js` now passes 46/46 (was 37/46 after the
prd-writing refactor). `docs/memory/skill-migration-audit.md` now contains the `invariants-audit`
entry, and the skill-size-convention AC5 check no longer regresses. All branch-introduced tests
pass; the only remaining failures are the 4 pre-existing AC9 and AC15 failures that exist on
main and are not caused by this branch.

**Verdict: APPROVE** — no blocking items remain. All ACs from the handoff are verified passing.

---

### Pass 3 Regression Verification

#### BLOCKING REGRESSION 1 (Pass 2): clarification-checkpoints 9 failures — FIXED

**Claimed fix:** `readWithSiblings()` helper added to `tests/contracts/clarification-checkpoints.test.js`
to inline `[See reference:]` tokens before asserting content.

**Verification:** `node --test tests/contracts/clarification-checkpoints.test.js`

```
ℹ tests 46
ℹ pass 46
ℹ fail 0
```

Status: CONFIRMED FIXED. 46/46 pass. Zero regressions in this suite.

---

#### BLOCKING REGRESSION 2 (Pass 2): skill-migration-audit missing invariants-audit entry — FIXED

**Claimed fix:** `invariants-audit` Compliant row added to `docs/memory/skill-migration-audit.md`.

**Verification:** Entry confirmed at line 21 of `docs/memory/skill-migration-audit.md`:
```
| invariants-audit | 64 | progressive disclosure | Compliant (split: review-categories.md sibling) |
```

`node --test tests/contracts/skill-size-convention.test.js` now shows 21/24 pass, 3 fail — the
3 failures are the pre-existing AC9 ones (root CLAUDE.md vs docs/CLAUDE.md skill-size sync), not
the AC5 invariants-audit entry check.

Status: CONFIRMED FIXED. No new AC5 failure.

---

### Full Test Suite Results (Pass 3)

| Suite | Result | Notes |
|-------|--------|-------|
| `tests/node/*.test.js` | 186 pass, 0 fail | All node unit tests clean |
| `tests/contracts/*.test.js` | 294 pass, 4 fail | 4 failures are pre-existing AC9 (×3) + AC15 (×1) on main; not caused by this branch |
| `tests/contracts/clarification-checkpoints.test.js` | 46 pass, 0 fail | Regression from Pass 2 confirmed fixed |
| `tests/integration/invariants-audit.integration.test.js` | 8 pass, 0 fail | All AC1/AC1a/AC2/AC6 integration checks pass |

Pre-existing failures verified: `AC9: root CLAUDE.md and docs/CLAUDE.md agree on skill size convention` (×3),
`AC15: documentation states the explicit precedence order for bugfix source_spec` (×1). These are
tracked independently and are not introduced by this branch.

---

### Acceptance Criteria Verification (Pass 3)

| AC | Status | Evidence |
|----|--------|---------|
| AC1: SKILL.md <=120 prose lines, sibling refs, stop conditions footer | PASS | 64 total lines; `[See reference:]` present; stop conditions footer present |
| AC1a: init.sh + upgrade.sh install with byte-identity | PASS | Integration test: installed SKILL.md and review-categories.md byte-identical to source (8/8 pass) |
| AC2: 5 review categories documented | PASS | All 5 categories in review-categories.md; wiring tests pass |
| AC3: 5-step invariant method | PASS | All 5 steps in SKILL.md; wiring tests pass |
| AC4: Claude commands Skill References rows | PASS | review.md, architect.md, security-gate.md, test-design.md all updated |
| AC5: Codex reviewers ## Invariant Checks sections | PASS | All 4 reviewers pass wiring tests; `**Apply when:**` and emit instruction present |
| AC6: Wiring contract tests | PASS | 186/186 node tests pass; 8/8 integration tests pass |
| AC7: When to Use trigger conditions | PASS | `## When to Use` table with 4 trigger rows present in SKILL.md |

### Convention Compliance (Pass 3)

- [x] Follows project folder structure
- [x] Naming conventions respected
- [x] No hardcoded absolute paths
- [x] Source/installed copies byte-identical for all new skill files
- [x] Commit messages follow format
- [x] Symmetric gate enforcement: review.md and security-gate.md both contain Source Spec Verification, Separate Context Check, and Symmetric Gate Enforcement sections
- [x] New skill documented in skill-migration-audit.md — regression fixed
- [x] No skipped tests introduced (`.skip`, `xtest` scan clean)
- [x] No debug statements introduced (`console.log`, `debugger` scan clean)

### Test Assessment (Pass 3)

- [x] New code has corresponding tests
- [x] Edge cases covered (byte-identity drift, broken sibling refs, illegal skill paths)
- [x] All test files committed and version-controlled
- [x] Tests test behaviour, not implementation — structural anchors used throughout
- [x] No regressions introduced — branch adds 0 new failures vs main baseline

---

## Resolution Notes (Pass 1 — Prior Review)

- [ADDRESSED] BLOCKING: `tests/contracts/review-feedback-loop.test.js` untracked — committed in `2d10313` (`chore(invariants-audit): commit missed review-feedback-loop tests and working-tree changes`). File is now version-controlled and will run in CI.
- [ADDRESSED] HIGH: `commands/specify.md`, `.claude/commands/specify.md`, `codex/reviewers/README.md` unstaged — all three staged and committed in `2d10313`. Contract tests now pass against HEAD, not just working tree.
- [ADDRESSED] HIGH: `### Invariant Analysis` wiring tests prove string presence, not output-instruction intent — regex changed from `/###\s+Invariant Analysis/` to `/emit.*###.*Invariant Analysis/i` in all 4 AC6 tests in `tests/node/command-skill-wiring.test.js`; block comment and assertion messages updated. Committed in `e396bcf` (`test(invariants-audit): tighten ### Invariant Analysis wiring assertion`).
- [ADDRESSED] MEDIUM: `skills/prd-writing/SKILL.md` sibling reference not covered by tests — replaced the invariants-audit-specific `[See reference:]` resolution test with a generalized test that auto-discovers all `skills/*/SKILL.md` files. Now covers prd-writing, code-review, tdd, verification-gate, and invariants-audit. Committed in `6f6bf2e` (`test(invariants-audit): generalize sibling-reference resolution test to all skills`).
- [ADDRESSED] LOW: `upgrade.sh` dry-run echo listed only three `.cjs` hook files — added `resolve-feature.cjs` to the echo line so the printed plan matches the actual copy commands. Committed in `3e32394` (`fix(upgrade.sh): include resolve-feature.cjs in dry-run echo`).

---

## Resolution Notes (Pass 2 — Prior Review)

- [ADDRESSED] BLOCKING: 9 contract tests in clarification-checkpoints.test.js broken by prd-writing refactor — added `readWithSiblings()` helper to `tests/contracts/clarification-checkpoints.test.js` that inlines `[See reference: path]` tokens before asserting content, so AC0/AC0a/AC0b/AC0c/Ticket-not-found tests resolve the sibling file. Committed in `a9b9e66` (`test(prd-writing): resolve sibling references before asserting ticket-fidelity content`). Result: 9 fail → 0 fail.
- [ADDRESSED] BLOCKING: `docs/memory/skill-migration-audit.md` missing `invariants-audit` entry — added a Compliant row for `invariants-audit` (64 lines, progressive disclosure, review-categories.md sibling). Committed in `4b3a5d0` (`fix(skill-migration-audit): document invariants-audit skill`). Result: AC5 regression eliminated; skill-size-convention.test.js back to 3 pre-existing AC9 failures only.

---

## Pass 2 Findings (Archived — Resolved)

### Findings (Pass 2)

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
