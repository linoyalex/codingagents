## Code Review: feature/ISS-022-integration-tests
**Generated:** 2026-04-13T17:00:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD`

### Summary

This branch adds three-level test coverage guidance (unit, integration, E2E) to the TDD skill, wires an integration test output slot and blocking verification into the `test-design` command, and updates `PIPELINE_GUIDE.md` Phase 3 deliverables. The implementation correctly addresses a prior Codex BLOCKING finding (command had no output slot for integration tests) and passed all 90 tests, including 23 new feature contract tests and the full regression suite.

### Verdict: APPROVE

---

### Findings

praise (HIGH): Prior BLOCKING finding addressed cleanly

**File:** `commands/test-design.md:29` and `.claude/commands/test-design.md:29`
The Codex code review flagged as BLOCKING that the `test-design` command had no output slot for integration tests — the skill required `[feature].integration.test.*` but the command only listed `tests/contracts/` and `tests/e2e/`. The GREEN commit added `tests/integration/$ARGUMENTS.integration.test.ts` and the corresponding test `AC5b` validates this. Both source and installed copies are byte-identical. This is exactly the right fix and the right test for it.

---

issue (MEDIUM): `commands/test-design.md` integration verification block does not specify the output path

**File:** `commands/test-design.md:37-40`
The new blocking verification text reads: "Integration test verification (blocking): at least one test must import the production entry point AND contain an assertion on visible output." This is correct guidance, but the block does not explicitly state *which file* must satisfy this — it is separated from the output-path rule on line 29 by several unrelated rules. A QA agent reading fast might write the integration test shell in `tests/integration/` but the blocking gate does not tie back to that file. There is no bug here — the check is present and blocking — but co-locating the check with the output path rule, or adding a parenthetical "(the integration test file created above)", would make the two rules feel like one coherent instruction rather than two disconnected bullets.
Recommendation: Add `(this check applies to the integration test file listed above)` inline in the blocking verification sentence, or move the verification bullet immediately after the output-path bullet.

---

issue (MEDIUM): Architecture doc does not include a "Call Chain" or "Integration Points" section — AC7 gap is not recorded

**File:** `docs/features/integration-test-coverage/architecture.md`
The TDD skill (AC7) now requires: if the architecture doc lacks a Call Chain or Integration Points section, the QA agent must add an `ARCH GAP` comment to the integration test file and set `known_risks` in handoff.json. The architecture doc for this very feature does not include a Call Chain section. The contract tests for this feature (`tests/contracts/integration-test-coverage.test.js`) do not have an `ARCH GAP` comment at the top, and the current `handoff.json` does not list `known_risks`. The feature is dogfooding its own rule and missing it. This is MEDIUM (not BLOCKING) because the gap affects only this feature's own artifacts, not any shipped guidance, and the rule is correctly implemented in the skill.
Recommendation: Either add `// ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA` as the first comment in `tests/contracts/integration-test-coverage.test.js`, or add a Call Chain section to the architecture doc describing the test command → TDD skill → output path chain.

---

question (LOW): ISS-036 new ticket created during this branch — is that in scope?

**File:** `docs/issues/tickets/ISS-036.md`
A new ticket (ISS-036) was created during this branch, prompted by a Codex BLOCKING finding about command↔skill wiring drift. The ticket is well-formed and the backlog was updated correctly. This is fine and matches the pattern of discovering systemic issues during feature work. No action needed from the developer — flagging it so the reviewer record is clear about scope: ISS-036 is a new backlog item, not implemented in this branch.

---

issue (LOW): Handoff phase field is 5, not 6

**File:** `.claude/handoff.json:4`
The handoff produced by the developer records `"phase": 5`. This is the handoff *into* Phase 6 (review), so the number is defensible as "last completed phase = 5", but the schema comment in `CLAUDE.md` describes phase as "pipeline phase number" which is ambiguous. The checkpoint.js validation accepts 1-7 so this does not break anything. However, the convention established by prior handoffs (e.g., Phase 7 documentation handoff records `"phase": 7`) is to record the *current* phase, not the prior one. This will be overwritten by the Phase 6 handoff so it is self-correcting.
No action required — this reviewer will produce a Phase 6 handoff that sets `"phase": 6` correctly.

---

### Test Assessment

- [x] New code has corresponding tests (23 new contract tests in `tests/contracts/integration-test-coverage.test.js`)
- [x] Edge cases are covered (AC7 gap-handling, import-only shell rejection, byte-identity sync)
- [x] No skipped tests introduced (grep confirms zero `.skip` / `xtest` / `xit`)
- [x] Tests use structural anchors, not phrase-binding (heading names, template field labels; consistent with ISS-010 convention)

### Convention Compliance

- [x] Follows project folder structure (`skills/tdd/`, `commands/`, `tests/contracts/`, `docs/features/`)
- [x] Naming conventions respected (source and installed copies both updated; ISS-009 byte-identity pattern followed)
- [x] No `any` types (JS, not TypeScript; no type bypasses found)
- [x] No hardcoded absolute paths in framework files
- [x] Commit messages follow WHY convention (`feat:`, `test:`, `refactor:` prefixes with clear rationale)
- [x] Skill size budget respected (105 total lines, 23 new contract tests confirm ≤150 prose limit passes)
- [x] Module boundaries respected (did not touch `skills/code-review/`, `commands/review.md`, `src/`)

### AC Checklist

| AC | Description | Status |
|----|-------------|--------|
| AC1 | Three-level coverage section in TDD skill | PASS — `## Three-Level Test Coverage` heading present |
| AC2 | Integration test definition: entry point + visible effect | PASS — text and naming convention present |
| AC3 | Fixture validation against production schema | PASS — rule in Coverage Rules section |
| AC4 | Degenerate input rule with minimum set (empty, whitespace, max-length) | PASS — all three boundary values named |
| AC5 | Phase 3 blocking verification — import + assertion, not advisory | PASS — blocking gate text present; output path wired |
| AC6 | PIPELINE_GUIDE.md includes integration tests in Phase 3 | PASS — item 6 added to Phase 3 deliverables |
| AC7 | Architecture dependency with gap-handling (ARCH GAP + known_risks) | PASS in skill; NOT applied to this feature's own artifacts (see MEDIUM finding) |
| AC8 | No regression; skill within size budget | PASS — 90/90 tests passing |
