## Code Review: dogfood-pipeline (Re-review)
**Date:** 2026-04-06 | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD`

### Summary
All BLOCKING and HIGH findings from the prior review are addressed. The `checkpoint.js` module now exports its core functions under a `require.main` guard, all 31 node tests pass cleanly (4/4 checkpoint tests, 31/31 suite-wide), and operational log lines correctly route to stderr. Two prior MEDIUM findings remain partially unresolved but are not blocking.

### Verdict: APPROVE

---

### Prior Review Resolution

| Finding | Severity | Status |
|---------|----------|--------|
| `checkpoint.test.js` non-functional — missing `module.exports` + unconditional `main()` call | BLOCKING | RESOLVED — `require.main === module` guard added; `module.exports = { validateHandoff, detectPhase, phaseFromHandoff }` exported; all 4 checkpoint tests now pass |
| `console.log` for operational output polluting stdout (token-tracking, handoff-valid lines) | HIGH | RESOLVED — both lines changed to `console.error`; only the `[checkpoint]` phase summary line remains on stdout |
| Validation logic duplicated between `checkpoint.js` and `skills/verification-gate/SKILL.md` | HIGH | PARTIALLY RESOLVED — a sync comment was added above `validateHandoff()` noting the duplication. The structural duplication still exists but is now explicitly flagged for the next maintainer. Acceptable for now |
| Token env vars (`CLAUDE_CODE_INPUT_TOKENS`) undocumented | MEDIUM | NOT ADDRESSED — no comment in source or docs/CLAUDE.md confirming whether these vars are actually populated by Claude Code at Stop hook time. The code still silently logs `total_tokens: 0` / `token_source: 'estimated'` when they are absent |
| `sed -i ''` macOS-only syntax in `init.sh` | MEDIUM | NOT ADDRESSED — `sed -i '' ...` is still present at `init.sh:54`. This will fail on Linux CI runners |
| `NEXT_AGENT_MAP` misleading naming/comments in `restore-context.js` | LOW | NOT ADDRESSED — name and comment unchanged |

---

### New Findings

#### [MEDIUM]: Token env var uncertainty remains undocumented
**File:** `hooks/checkpoint.js:272-277`
**Issue:** The prior review flagged this and it was not addressed in the fix commit. When `CLAUDE_CODE_INPUT_TOKENS` is not set by the Claude Code runtime, every entry in `token-usage.jsonl` records `total_tokens: 0` and `token_source: 'estimated'`. AC9 requires that "actual per-phase costs are compared to budget targets" — if the token source is always estimated at zero, AC9 cannot be satisfied. There is no test or documentation confirming these env vars are populated by Claude Code's Stop hook event.
**Suggestion:** Add a Known Gotcha entry to `docs/CLAUDE.md`: state whether `CLAUDE_CODE_INPUT_TOKENS` is provided by Claude Code at Stop hook time. If it is not, replace the dead branch with a TODO comment, and update AC9 to note that token tracking is a placeholder until the API provides this data.

#### [MEDIUM]: `sed -i ''` macOS-only syntax remains in `init.sh`
**File:** `init.sh:54`
**Issue:** `sed -i '' "s/..."` is BSD/macOS syntax. GNU sed (Linux) requires `sed -i "s/..."` with no empty-string argument. Any CI that runs on an Ubuntu or Docker runner will fail at the `set_component_version` function.
**Suggestion:** Replace with the portable form: `sed -i.bak "s/..." "$VERSION_FILE" && rm -f "${VERSION_FILE}.bak"`, or use `perl -i -pe` which is portable across both platforms.

---

### Acceptance Criteria Status

| AC | Description | Status |
|----|-------------|--------|
| AC1 | Dogfood install uses required pipeline shape | PASS — `init.sh installs complete .claude/ structure` test passes |
| AC2 | Phases 1-7 execute with valid handoff.json | PASS — E2E test `restore-context outputs handoff context for each phase in a 7-phase chain` passes |
| AC3 | checkpoint.js validates and logs correctly | PASS — 4/4 checkpoint tests pass; token logging and phase detection verified |
| AC4 | Invalid handoff.json produces logged error | PASS — `restore-context logs error to stderr on malformed handoff JSON` passes |
| AC5 | Pre-implementation artifacts contain only spec docs | PASS — dedicated test passes |
| AC6 | CLAUDE.md scoping correct for framework dev | PASS — `commands/architect.md references docs/CLAUDE.md` and `commands/document.md` tests pass |
| AC7 | Gitignore compliance per .gitignore-template | PASS — two gitignore tests pass |
| AC8 | Bugs logged to backlog with phase links | PASS — `backlog.md bug entries include a phase link tag` test passes |
| AC9 | Token usage tracked and compared to budget | PARTIAL — tracking infrastructure is in place but token source is `'estimated'` (0 values) if env vars are not populated; full AC9 requires documentation of this limitation |

---

### Test Assessment
- [x] New code has corresponding tests
- [x] Edge cases are covered — the prior BLOCKING gap (3/4 tests never running) is now closed; all 31 tests pass
- [x] No skipped tests introduced
- [x] Tests are testing behaviour, not implementation — assertions target exit codes and file contents

### Convention Compliance
- [x] Follows project folder structure
- [x] Naming conventions respected
- [x] No `any` types without documented reason — N/A (no TypeScript in changed files)
- [ ] No hardcoded platform-specific values — `sed -i ''` macOS-only (Medium finding above)
- [x] Commit messages follow format — fix commit message clearly labels the prior review findings it resolves
