## Code Review: rework/ISS-010-skill-reliability
**Date:** 2026-04-10 | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD`

### Summary

This branch is a substantial rework (143 files, ~12K lines added) that consolidates skill files into `.claude/`, adds a structured handoff validation gate to `checkpoint.js`, introduces token tracking, installs new pipeline hook helpers, refreshes four core skill documents for reliability, and adds a full test suite for the new logic. The approach is coherent and well-tested. One `console.log` stdout pollution issue was claimed resolved in a prior review document but remains present in the installed helper.

### Verdict: APPROVE

The single unresolved issue (console.log in archive-context.js) is LOW severity — it is operational output from a PreCompact hook and does not affect correctness. All tests pass. No secrets, no skipped tests, no circular dependencies.

---

### Findings

#### praise (LOW): Test coverage for the new handoff gate is thorough

`tests/node/checkpoint.test.js` and `tests/node/pipeline-handoff-guards.test.js` cover the happy path, invalid handoff, unexpected-properties rejection, artifact-beats-handoff precedence, and the main-function hard-fail path including the checkpoint write. The fixture-based approach (`tests/fixtures/handoff/`) makes the tests easy to understand and extend. `core-skill-contracts.test.js` locking the mirror identity between `skills/` and `.claude/skills/` is a smart regression guard.

---

#### issue (LOW): `console.log` stdout pollution in `.claude/helpers/archive-context.js`

**File:** `.claude/helpers/archive-context.js:86` and `:132`

Two `console.log` calls remain in the installed helper (the one wired into `.claude/settings.json`):
- Line 86: `console.log('[token-tracking] Pre-compaction snapshot logged')`
- Line 132: `console.log('[archive-context] Archived ${scored.length} turns. Total: ${merged.length}')`

The prior review document (`docs/features/skill-reliability-refresh/review-claude-skill-reliability-refresh.md`) states this was "RESOLVED — both lines changed to `console.error`". The `hooks/checkpoint.js` version is indeed fixed, but `archive-context.js` is the file actually installed via `settings.json` and it still uses `console.log`. Claude Code hook output on stdout may interfere with tool output parsing depending on the hook type. These should be `console.error`.

**Recommendation:** Change both to `console.error(...)` to match the pattern established everywhere else in the hook helpers.

---

#### issue (LOW): `.claude/settings.json` is missing a trailing newline

**File:** `.claude/settings.json`

The file ends without a trailing newline (`\ No newline at end of file` in the diff). This is a minor hygiene issue but can produce noisy diffs when editors auto-add a newline on save.

**Recommendation:** Add a trailing newline to the file.

---

#### suggestion (LOW): `NEXT_AGENT_MAP` naming in `restore-context.js` is misleading

**File:** `.claude/helpers/restore-context.js` (referenced in prior known risks)

The constant `NEXT_AGENT_MAP` actually maps the phase that just completed to who runs next — so "NEXT" is correct — but the inline comments say "the agent that will run this session", which contradicts the map key being the producing phase. A reader checking phase 1 sees `architect` and correctly infers the architect runs after specify, but the comment framing is easily confused.

**Recommendation:** Rename the constant to `PHASE_TO_NEXT_AGENT_MAP` or update the comment to "agent that runs the next phase after this handoff".

---

#### question (LOW): Phase 7 heuristic in `detectPhase` conflates CHANGELOG existence with doc completion

**File:** `hooks/checkpoint.js` (and `.claude/helpers/checkpoint.js`)

The Phase 7 heuristic:
```js
test: () => has('review.md') && fs.existsSync(path.join(process.cwd(), 'CHANGELOG.md'))
```
This will fire "DOCUMENT complete" for any project that already has a CHANGELOG.md before Phase 7 actually runs, producing a misleading checkpoint state. A fresh install of this framework on any existing project that has a CHANGELOG will skip directly to reporting Phase 7 complete. The `handoffResult.handoff.phase` is used to determine attribution, but `detectPhase()` is still called to determine what to print to the user.

**Recommendation:** Use a more specific signal — e.g., check that CHANGELOG.md was modified after `review.md` was created, or rely exclusively on the handoff phase number for the printed status and drop the CHANGELOG heuristic.

---

### Test Assessment
- [x] New code has corresponding tests
- [x] Edge cases are covered (invalid JSON, missing fields, unexpected properties, artifact precedence over stale handoff)
- [x] No skipped tests introduced (confirmed: 0 skipped across all test runs)
- [x] Tests are testing behaviour, not implementation (fixture-driven, subprocess invocation for main() path)

### Convention Compliance
- [x] Follows project folder structure
- [x] Naming conventions respected
- [x] No `any` types (project is JS, not TS; no type bypasses found)
- [x] No hardcoded secrets or API keys
- [x] Commit messages follow format
- [ ] One `console.log` issue remains in installed helper (noted above, LOW severity)
