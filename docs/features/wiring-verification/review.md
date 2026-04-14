## Code Review: feature/ISS-036-wiring-verification

**Generated:** 2026-04-13T15:00:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase**
**Diff:** `git diff main...HEAD`

---

### Summary

The wiring-verification feature delivers a complete 4-stage algorithm that catches command/skill artifact drift. The core library is clean, well-structured, and the error messages throughout are actionable. Two blocking issues require resolution before merge — one is a missing existence guard in the library, the other is stale handoff state left in the diff from a prior phase.

---

### Verdict: REQUEST_CHANGES

Two blocking issues identified. Three non-blocking suggestions included.

---

### Findings

**[BLOCKING] F1: `checkCommandSkillWiring` reads skill files without checking existence first**

In `lib/wiring-check.js`, `checkCommandSkillWiring` calls `read(skillRef.sourcePath)` directly. The Stage 1 unit test loop calls `exists(ref.sourcePath)` and asserts, but the library function itself does not. If `commands/implement.md` declares `skills/structured-logging/SKILL.md` in its `## Skill References` table and that file is later moved or deleted, the wiring check throws a raw `ENOENT` from `fs.readFileSync`, not a named error identifying the skill and command. This violates the principle the implementation correctly applies everywhere else (errors must name the offending component).

Suggested fix: add `if (!exists(skillRef.sourcePath)) { throw new Error(...) }` at the top of `checkCommandSkillWiring` before calling `read()`.

---

**[BLOCKING] F2: `.claude/handoff.json` net diff from main shows Phase 4 content**

The diff under review includes `.claude/handoff.json` changing to `"phase": 4, "produced_by": "security-reviewer"`. The current on-disk state has been corrected to Phase 6 by a prior review cycle, but the diff still accumulates the Phase 4 → Phase 6 change, meaning what lands on main when this branch merges would be correct — but the commit history shows the branch briefly having a Phase 4 handoff in it. More critically, the diff being reviewed here shows the Phase 4 handoff as the net change from main, which is what a rollback would restore. The correct approach is for the developer to ensure the branch commits show Phase 6 as the authored state, not as a correction over Phase 4.

Suggested fix: `git rebase` or amend the commit that introduced the Phase 4 handoff so it is replaced by the Phase 6 handoff, making the diff clean.

---

**[SUGGESTION] F3: Several contract tests grep the wiring test's source text for keyword presence**

In `tests/contracts/wiring-verification.test.js`, AC1, AC3, AC7, AC9, and the fail-closed test assert things like `assert.match(wiringTest, /skip|no required artifacts|no wiring/i)`. This is phrase-binding to implementation details — renaming the local variable `skipped` to `bypassed` or rephrasing a comment would break the contract test even though the behaviour is identical. The project's own coding convention (in `docs/CLAUDE.md`) explicitly calls out: "tests must use structural anchors, not phrase-binding." These assertions should test the observable behaviour (import the library, call the function, assert on the result) rather than scanning the wiring test's source.

---

**[SUGGESTION] F4: `tests/e2e/wiring-verification.spec.js` is misclassified as an E2E test**

The file imports from `lib/wiring-check` and runs entirely in-process against static files. It is a second integration test, not an E2E test. The project's `pnpm test:e2e` command targets a separate runner (likely Playwright) that would either skip or fail on this file. Moving it to `tests/integration/wiring-verification.e2e-chain.test.js` or simply merging it into the existing integration test file would avoid runner confusion.

---

**[SUGGESTION] F5: `extractSection` silently truncates when a sub-heading appears inside the target section**

In `lib/wiring-check.js`, `extractSection` breaks on any `/^#{1,6} /` match after the target heading. A `### Notes` sub-heading inside a `## Required Artifacts` section would cause artifact table rows after it to be silently dropped. For a hard gate, silent truncation is a correctness risk — the check would pass even with incomplete data. Consider breaking only on headings of the same depth or higher (e.g., only `##` or `#` for a `##`-level section), or documenting and testing the constraint explicitly.

---

**[PRAISE] F6: Error messages throughout `lib/wiring-check.js` are consistently actionable**

Every `throw new Error(...)` in the library names the skill, the command, and the specific missing element (pattern, path, column, separator). This is exactly the standard all error messages in this codebase should be held to — the fail-closed heuristic is well-designed, and a developer seeing a failure at 2am would know immediately what file to open and what to add.

---

### Test Assessment

- [x] New code has corresponding tests — contract, unit, integration, e2e layers all present
- [x] Edge cases are covered — conditional artifacts (AC8), multi-path (AC9), empty skill (AC7), malformed table (AC3)
- [x] No skipped tests introduced — the grep hit on `result.skipped, false` is a value comparison inside a test assertion, not a test skip directive
- [ ] Tests are testing behaviour, not implementation — **partial**: contract tests that grep the wiring test's source text for keywords couple the contract layer to implementation details (see F3)

---

### Convention Compliance

- [x] Follows project folder structure (`lib/`, `tests/node/`, `tests/contracts/`, `tests/fixtures/`)
- [x] Naming conventions respected
- [x] No `any` types (JavaScript project — not applicable)
- [x] No hardcoded secrets or credentials
- [x] Duplicate files (`commands/` and `.claude/commands/`) are byte-identical per ISS-009 sync pattern
- [ ] Handoff diff reflects Phase 4 state — see F2

---

### AC Coverage

| AC | Status | Evidence |
|----|--------|---------|
| AC1 | PASS | `checkCommandSkillWiring` in `lib/wiring-check.js` validates pattern + path |
| AC2 | PASS | `commands/test-design.md` Output now includes `tests/integration/` path |
| AC3 | PASS | `parseRequiredArtifacts` throws with skill name on malformed table; tested |
| AC4 | PASS | `## Artifact Wiring Verification` section added to `commands/implement.md` |
| AC5 | PASS | `## Artifact Wiring Verification` section added to `commands/test-design.md` |

---

### Blocking Items (must resolve before merge)

1. **F1** — Add `exists()` guard in `checkCommandSkillWiring` before `read(skillRef.sourcePath)`, throwing a named error on missing file
2. **F2** — Clean up branch so `.claude/handoff.json` diff from main shows Phase 6 state, not Phase 4
