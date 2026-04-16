## Code Review: feature/ISS-001-invariants-audit
**Generated:** 2026-04-16T22:15:00Z
**Date:** 2026-04-16 | **Reviewer:** code-reviewer agent (claude-sonnet-4-6)
**Diff:** `git diff main...HEAD`
**Reviewed in separate context from authoring phase**
**Source spec:** `docs/features/invariants-audit/prd.md`

---

### Summary

The diff adds the `invariants-audit` skill with full cross-layer wiring: source and installed
skill files, 5 review categories in a sibling reference file, 4 Claude commands with Skill
References rows, 4 Codex reviewer prompts with `## Invariant Checks` sections, a review feedback
loop in authoring commands and gate commands, and a comprehensive suite of wiring/integration
contract tests. All 186 node tests pass, all 11 installer tests pass, and all command contract
checks pass. The 14 failing contract tests in `tests/contracts/` are all pre-existing on main
and 2 were fixed by this branch.

One BLOCKING finding: a new contract test file is uncommitted. Two HIGH findings: an unstaged
change to `commands/specify.md` leaves an AC untested in committed code, and the `### Invariant
Analysis` contract tests prove string presence but not heading semantics. One MEDIUM finding:
prd-writing refactor introduces a SKILL.md `[See reference:]` that contracts do not verify.

---

### Verdict: REQUEST_CHANGES

One BLOCKING item must be resolved before merge.

---

### Findings

#### BLOCKING: `tests/contracts/review-feedback-loop.test.js` is untracked and uncommitted

**File:** `tests/contracts/review-feedback-loop.test.js` (untracked)

**Issue:** This file contains 3 contract tests that verify the review feedback loop wiring
across authoring commands and Codex reviewers. It exists in the working tree, passes when
run, and the feature's wiring depends on it — but it is not committed to the branch. CI will
never run it. If the commands are later changed, no test will catch regressions in the
feedback loop contract.

The git status shows this file as `??` (untracked). The committed contract test suite covers
`tests/contracts/implement-known-risks.test.js` and `tests/contracts/review-hardening.test.js`
but has no entry for `review-feedback-loop.test.js`.

**Recommendation:** Stage and commit `tests/contracts/review-feedback-loop.test.js` as part
of this branch. A test that only exists on disk but not in version control does not guard
against regression.

---

#### HIGH: `commands/specify.md` review feedback loop changes are unstaged

**File:** `commands/specify.md` and `.claude/commands/specify.md` (modified, not staged)

**Issue:** The contract test `review-feedback-loop.test.js` checks that `commands/specify.md`
contains a `## Review Feedback Loop` section, `review-codex-prd-<feature-slug>.md` reference,
`## Resolution Notes`, and `ADDRESSED | DEFERRED | DISPUTED` pattern. The working tree version
passes. The committed version of `commands/specify.md` (checked via `git show HEAD:commands/specify.md`)
does NOT contain these patterns.

The same applies to `codex/reviewers/README.md`: the contract test checks for
`phase-relevant review artifact` and `## Resolution Notes` in the README, but the committed
`HEAD:codex/reviewers/README.md` does not contain these strings.

In other words: two files that a contract test requires are not committed, meaning the contract
is enforced only against the local working tree, not against what CI would see.

**Recommendation:** Stage and commit the working-tree changes to `commands/specify.md`,
`.claude/commands/specify.md`, and `codex/reviewers/README.md` as part of this branch. Run
`git diff HEAD` to confirm those files are included before pushing.

---

#### HIGH: `### Invariant Analysis` wiring tests prove string presence, not heading semantics (Category 5 invariant)

**File:** `tests/node/command-skill-wiring.test.js` (lines 336–390 in diff)

**Issue:** The AC6 tests check that `### Invariant Analysis` appears inside each Codex
reviewer's `## Invariant Checks` section. The test regex is `/###\s+Invariant Analysis/`.

The actual content in the reviewer files is:

```
When triggers match, emit `### Invariant Analysis` in your review output (either findings or
"No invariant mismatches identified").
```

The regex matches the backtick-quoted text `` `### Invariant Analysis` `` because `###` appears
inline. The test passes. But the test assertion says "marker must be referenced inside
## Invariant Checks" — it verifies the string appears, not that it functions as a structural
heading anchor in the output protocol.

This is a self-referential Category 5 issue: the feature's own tests prove string presence
but not the behavioral outcome (that reviewers actually emit an H3 output heading when triggers
match). The distinction matters: if a future editor changes the instruction to `` `Invariant Analysis`  ``
(removing `###`) the test would fail correctly, but if they change it to
`` `#### Invariant Analysis` `` (wrong heading depth) the test would also fail even though
the behavior is essentially preserved.

**Recommendation:** The test comment should say "references the ### Invariant Analysis
output instruction as prose" rather than "marker must be referenced inside Invariant Checks".
Alternatively, update the regex to `/emit.*###.*Invariant Analysis/i` to better express what
is actually being verified: that the section instructs reviewers to emit the marker. Low
implementation cost; high clarity gain.

---

#### MEDIUM: `skills/prd-writing/SKILL.md` sibling reference not covered by parity sync tests

**File:** `skills/prd-writing/SKILL.md` line 108 (new `[See reference:]` line)

**Issue:** The prd-writing SKILL.md now contains:
```
[See reference: .claude/skills/prd-writing/ticket-fidelity.md]
```

The byte-identity sync test in `tests/node/core-skill-contracts.test.js` covers `invariants-audit`
source/installed parity. However, the broad byte-identity scan in the same file tests "all
committed `.claude` copies stay byte-identical to source skills" — which does cover
`prd-writing/SKILL.md` and `prd-writing/ticket-fidelity.md` transitively (verified:
`diff skills/prd-writing/SKILL.md .claude/skills/prd-writing/SKILL.md` produces no output).

The gap is narrower: no test verifies that all `[See reference:]` links inside `prd-writing/SKILL.md`
resolve to existing installed files, as is done for `invariants-audit` in the integration test.
If `ticket-fidelity.md` is later renamed without updating SKILL.md, the broken reference would
not be caught.

**Recommendation:** Consider adding a sibling-reference resolution test for `prd-writing/SKILL.md`
(or generalize the existing `invariants-audit` integration test to cover all skills with
`[See reference:]` links). Not blocking, but the gap is a future-drift risk.

---

#### LOW: `upgrade.sh` dry-run section references old `.js` filename in echo output

**File:** `upgrade.sh` line 132 in diff

**Issue:** The dry-run printout in `upgrade.sh` was updated to say `checkpoint.cjs` but the
original echo line (line 7 of the diff hunk) now reads:
```
echo "    - Replace hook files (checkpoint.cjs, restore-context.cjs, archive-context.cjs)"
```

This omits `resolve-feature.cjs` from the dry-run description. The actual copy commands
on lines 194–199 include all four `.cjs` files, but the user-facing dry-run summary only
names three. This is cosmetic but could mislead an operator who reads the upgrade plan
before applying it.

**Recommendation:** Add `resolve-feature.cjs` to the dry-run echo line to match what the
script actually does.

---

#### PRAISE: Invariant analysis applied to the feature's own wiring

The self-referential application of the invariants-audit skill to this feature is well executed.
The AC6 tests use `extractSection` to scope assertions to the correct heading — preventing
false positives from incidental keyword matches elsewhere in the file. The `review-categories.md`
category 2 heading test uses a multi-keyword regex (requiring at least two of
blocked/rejected/retry/stale in the heading) specifically to prevent single-word incidental
matches. This is exactly the "tests prove behavior, not syntax" discipline the skill teaches.

---

### Acceptance Criteria Verification

| AC | Status | Evidence |
|----|--------|---------|
| AC1: SKILL.md ≤120 lines, sibling refs, stop conditions footer | PASS | 64 lines; `[See reference:]` present; stop conditions footer present |
| AC1a: init.sh + upgrade.sh install to .claude/skills/invariants-audit/ with byte-identity | PASS | Both use `cp -r skills/*`; byte-identity tests pass |
| AC2: 5 review categories documented | PASS | All 5 categories in review-categories.md; tests pass |
| AC3: 5-step invariant method | PASS | All 5 steps in SKILL.md; tests pass |
| AC4: Claude commands Skill References rows | PASS | review.md, architect.md, security-gate.md, test-design.md all updated; tests pass |
| AC5: Codex reviewers ## Invariant Checks sections | PASS | All 4 reviewers updated; Apply when triggers present; checklist items present |
| AC6: Wiring contract tests | PARTIAL | Tests exist and pass; but review-feedback-loop.test.js is untracked (BLOCKING) |
| AC7: When to Use trigger conditions | PASS | Table present in SKILL.md; test scoped to section |

---

### Test Assessment

- [x] New code has corresponding tests
- [x] Edge cases are covered (byte-identity drift, broken sibling references, illegal skill paths)
- [ ] All test files committed — `tests/contracts/review-feedback-loop.test.js` is untracked (BLOCKING)
- [x] Tests are testing behaviour, not implementation — with the HIGH caveat on the `### Invariant Analysis` tests
- [x] No skipped tests introduced

### Convention Compliance

- [x] Follows project folder structure (skills/invariants-audit/, .claude/skills/invariants-audit/)
- [x] Naming conventions respected
- [x] No `any` types (not applicable — JS only)
- [x] No hardcoded absolute paths
- [x] Source/installed copies are byte-identical for all new skill files
- [x] Commit messages follow format (feat:, fix:, chore:, security:)
- [ ] Uncommitted working-tree changes to specify.md and codex/reviewers/README.md should be staged (HIGH)

---

## Resolution Notes

- [ADDRESSED] BLOCKING: `tests/contracts/review-feedback-loop.test.js` untracked — committed in `2d10313` (`chore(invariants-audit): commit missed review-feedback-loop tests and working-tree changes`). File is now version-controlled and will run in CI.
- [ADDRESSED] HIGH: `commands/specify.md`, `.claude/commands/specify.md`, `codex/reviewers/README.md` unstaged — all three staged and committed in `2d10313`. Contract tests now pass against HEAD, not just working tree.
- [ADDRESSED] HIGH: `### Invariant Analysis` wiring tests prove string presence, not output-instruction intent — regex changed from `/###\s+Invariant Analysis/` to `/emit.*###.*Invariant Analysis/i` in all 4 AC6 tests in `tests/node/command-skill-wiring.test.js`; block comment and assertion messages updated. Committed in `e396bcf` (`test(invariants-audit): tighten ### Invariant Analysis wiring assertion`).
- [ADDRESSED] MEDIUM: `skills/prd-writing/SKILL.md` sibling reference not covered by tests — replaced the invariants-audit-specific `[See reference:]` resolution test with a generalized test that auto-discovers all `skills/*/SKILL.md` files. Now covers prd-writing, code-review, tdd, verification-gate, and invariants-audit. Committed in `6f6ff4e` (`test(invariants-audit): generalize sibling-reference resolution test to all skills`).
- [ADDRESSED] LOW: `upgrade.sh` dry-run echo listed only three `.cjs` hook files — added `resolve-feature.cjs` to the echo line so the printed plan matches the actual copy commands. Committed in `3e32394` (`fix(upgrade.sh): include resolve-feature.cjs in dry-run echo`).
