# Test Design Review — invariants-audit
**Generated:** 2026-04-16T21:10:00Z
**Reviewer:** code-reviewer (Claude, fresh context)
**Phase reviewed:** Phase 3 (Test Design)
**Source spec:** docs/features/invariants-audit/prd.md
**Reviewed in separate context from authoring phase.**

---

## Verdict

REQUEST CHANGES

One medium coverage gap (AC5 checklist-item requirement untested), one medium false-green risk on AC3 step patterns, one low false-green risk on AC2 category 2 pattern. All other ACs have solid structural-anchor coverage. No blocking gaps; no tests absent for any AC.

---

## Coverage Matrix

| AC | Test file(s) | Verdict | Notes |
|----|--------------|---------|-------|
| AC1 (skill file + line budget) | `tests/node/core-skill-contracts.test.js`, `tests/integration/invariants-audit.integration.test.js` | PASS | File existence + 120-line budget both tested. |
| AC1a (byte-identity sync) | `tests/node/core-skill-contracts.test.js`, `tests/integration/invariants-audit.integration.test.js` | PASS | SKILL.md and review-categories.md both covered for source vs installed identity. |
| AC2 (5 review categories) | `tests/node/core-skill-contracts.test.js` | PASS with caveat | All 5 categories tested individually via keyword regex. Category 2 pattern is excessively broad (see MEDIUM finding M2). |
| AC3 (5-step method) | `tests/node/core-skill-contracts.test.js` | PASS with caveat | Steps 2–4 use single-word regexes that match incidentally (see MEDIUM finding M1). |
| AC4 (4 commands Skill References row) | `tests/node/command-skill-wiring.test.js` | PASS | Each command tested for heading presence + `invariants-audit` keyword + source path. Structural, not phrase-bound. |
| AC5 (Codex reviewer Invariant Checks section + Apply when trigger + checklist item) | `tests/node/command-skill-wiring.test.js` | PARTIAL — GAP | Section heading and `**Apply when:**` trigger tested for all 4 reviewers. **At least one checklist item derived from AC2 categories is not tested.** PRD AC6 explicitly requires this. |
| AC6 (wiring contract: structural anchors, stop conditions, sibling ref, Invariant Analysis marker) | `tests/node/command-skill-wiring.test.js` | PASS | All structural anchors tested. Marker verified inside section (not floating) via `extractSection`. |
| AC7 (When to Use trigger conditions) | `tests/node/core-skill-contracts.test.js` | PASS | Keyword presence within SKILL.md asserted. Not scoped to `## When to Use` section specifically (see LOW finding L1). |

---

## Findings

### BLOCKING

None.

---

### HIGH

None.

---

### MEDIUM

**M1 — False-green risk: AC3 steps 2–4 use single-word regexes that will match incidental occurrences**

Files: `tests/node/core-skill-contracts.test.js`, lines ~200–226

Steps 2, 3, and 4 of the 5-step method are tested with regexes `/encoded/i`, `/enforced/i`, and `/tested/i`. These words appear routinely in any skill document's prose outside the `## Invariant Review Method` section. The test does not scope the match to that section, so a SKILL.md that names the section but accidentally contains the word "enforced" in a stop conditions footer would pass even if step 3 is missing.

Why it matters: a developer who writes good prose in the wrong section satisfies the test without satisfying the AC.

Suggested fix: scope each step match to the content returned by `extractSection(content, /^## Invariant Review Method$/m)`. If `extractSection` is not available in `core-skill-contracts.test.js`, import it from `lib/wiring-check.js` (it is already exported). Alternatively, use ordered multi-capture: assert the 5 steps appear in sequence within the section, not scattered through the document.

---

**M2 — False-green risk: AC2 category 2 regex matches any document containing "blocked," "rejected," or "retry"**

File: `tests/node/core-skill-contracts.test.js`, line ~158

The pattern `/blocked|rejected|retry|stale.state/i` for category 2 ("blocked / rejected / retry / stale-state paths") will match on common English prose. A review-categories.md that discusses "rejected pull requests" in category 3's spec-vs-impl examples would satisfy this test without documenting category 2 at all.

Why it matters: if the developer writes category 3 content but forgets category 2, CI stays green.

Suggested fix: make the match require proximity of two or more of the category-2 terms, or require the match to appear under a heading that names the category (e.g., after `## 2.` or a heading containing "blocked\|rejected\|stale"). A heading-scoped approach is preferred because it aligns with the structural-anchor convention.

---

### LOW / NIT

**L1 — AC7 trigger-condition test is not scoped to the `## When to Use` section**

File: `tests/node/core-skill-contracts.test.js`, line ~242

The AC7 test matches trigger keywords (`workflow logic`, `state transition`, etc.) anywhere in SKILL.md, not specifically inside `## When to Use`. Because the `## Invariant Review Method` section will also likely reference "workflow logic" and "state transitions," the test could pass even if `## When to Use` is empty or absent.

The `## When to Use` heading is separately tested as a structural anchor (AC6 test), but the AC7 trigger-condition content check does not verify that conditions appear _within_ that section.

Suggested fix: extract the `## When to Use` section via `extractSection` and apply the keyword match to its content, not the full file. This tightens the test without adding fragility.

---

**L2 — AC5 checklist-item test is missing (gap, not phrase-bound)**

File: `tests/node/command-skill-wiring.test.js` — no test exists for this sub-requirement

PRD AC6 states: "each reviewer file contains a `## Invariant Checks` section with an `**Apply when:**` trigger line **and at least one checklist item derived from the review categories (AC2)**." The architecture doc repeats this: "at least one checklist item (line starting with `- `)". The tests verify section heading and trigger but not the checklist item.

This is primarily a coverage gap rather than a false-green risk (the test cannot pass for the wrong reason because it does not exist). Classified LOW because the section heading + trigger tests provide significant coverage, and a developer who adds the section will almost certainly add checklist items. However, the explicit PRD AC6 language means this is an intended contract test that was omitted.

Suggested fix: for each of the 4 Codex reviewers, after extracting the `## Invariant Checks` section, assert that `section` matches `/^- /m` (at least one markdown list item within the section). This is a structural check, not phrase-bound.

---

## RED-state verification

All new tests ran in fresh state (skills/invariants-audit/ does not exist, no commands or reviewers updated). Results are consistent with the expected RED state described in the commit message.

**Tests run:**
- `tests/node/command-skill-wiring.test.js` — 29 new invariants-audit tests: all 29 FAILED (ENOENT for skill files; section-not-found for commands/reviewers). No new tests passed unexpectedly.
- `tests/node/core-skill-contracts.test.js` — 14 new invariants-audit tests: all 14 FAILED (ENOENT). No new tests passed unexpectedly.
- `tests/integration/invariants-audit.integration.test.js` — 8 tests: all 8 FAILED (ENOENT). No new tests passed unexpectedly.

**Pre-existing tests:** Not run in isolation during this review; failures above are confined to new test additions and do not indicate pre-existing test breakage.

**Total new failing tests (RED): 51.** All failures are due to missing source files/missing implementation — the correct RED cause for Phase 3.

---

## Recommendations for Phase 5 (Implement)

1. **Add checklist-item test before implementing** (L2 above). The missing test for AC5's checklist-item requirement means CI will not catch a reviewer file that has the heading and trigger but no checklist. This is an inexpensive addition that closes the gap before implementation locks in the pattern.

2. **Scope AC3 step tests to the method section** (M1 above). Steps 2–4 currently use global keyword matches. Scope them to `extractSection(content, /^## Invariant Review Method$/m)` before implementing SKILL.md, so the first GREEN commit proves the method is in the right section.

3. **Scope AC7 keyword test to `## When to Use`** (L1 above). Low risk, easy fix: import `extractSection` into `core-skill-contracts.test.js` and apply the keyword match to the section content.

4. **AC2 category-2 pattern** (M2 above). The category-2 test will likely pass correctly in practice, but heading-scoped matching would make the intent self-documenting. Consider adding a heading-proximity check before implementing review-categories.md.

5. **No new tests needed for Screen State failure paths** (installer, permission, upgrade). AC1a's byte-identity sync tests catch the "installed-but-stale" and "upgrade path failure" states. The "broken sibling ref" Screen State is caught by AC6's `[See reference:]` link resolution test. The "permission denied" Screen State is a runtime concern, not a content-structure concern, and is correctly out of scope for these contract tests.

6. **No scope creep detected.** All 51 failing tests map directly to ACs in the PRD. No tests assert behaviors the PRD does not require.

7. **No phrase-binding detected.** All content assertions use structural anchors (heading names, keyword families, table-cell patterns). The test suite is safe to refactor skill prose without breaking CI.

---

## Resolution Notes

**Resolved:** 2026-04-16T20:19:00Z
**Resolved by:** qa (Phase 3 — fresh session addressing review feedback)

- [ADDRESSED] M1 — `tests/node/core-skill-contracts.test.js` lines 210–258. AC3 steps 2, 3, and 4 now use `extractSection(content, /^## Invariant Review Method$/m)` from `lib/wiring-check.js` before applying keyword regex. `extractSection` is imported at the top of the file (line 7). Each of the three tests now asserts `section !== null` before the keyword match, so a missing section heading is a named failure, not a false-green.
- [ADDRESSED] M2 — `tests/node/core-skill-contracts.test.js` line 168–173. AC2 category-2 test now uses a heading-scoped regex requiring at least two category-2 terms co-occurring in a heading line (`/^#{1,4}[^#\n]*(blocked[^#\n]*(rejected|retry|stale)|...)/im`). A single incidental occurrence of "blocked" or "rejected" elsewhere in the document will not satisfy this test.
- [ADDRESSED] L1 — `tests/node/core-skill-contracts.test.js` lines 269–282. AC7 test now extracts the `## When to Use` section via `extractSection(content, /^## When to Use$/m)` and applies keyword match to section content only. A `section !== null` guard is added so a missing `## When to Use` heading produces a named failure.
- [ADDRESSED] L2 — `tests/node/command-skill-wiring.test.js` lines 1026–1087. Added 4 new tests (one per Codex reviewer: review-code.md, review-prd.md, review-architecture.md, review-test-design.md). Each extracts the `## Invariant Checks` section via `extractSection` and asserts `section.match(/^- /m)` — at least one markdown list item within the section. All 4 new tests fail in RED state with "section is null" (correct: `## Invariant Checks` not yet implemented).
