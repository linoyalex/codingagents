## Code Review: dogfood/using-codingagents-to-develop-codingagents
**Date:** 2026-04-06 | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD`

### Summary
This is a substantial framework-level change (71 files, 6,331 insertions) that hardens the pipeline with a blocking handoff gate, adds token tracking, ships `init.sh` and `upgrade.sh` as first-class install scripts, and adds a comprehensive test suite. The three targeted AC fixes (AC4: stderr logging, AC6: docs/CLAUDE.md references, AC8: phase tag on tickets) are all correctly implemented. However, `tests/node/checkpoint.test.js` is broken in its current form: it requires `checkpoint.js` as a module to call exported functions that do not exist, which causes `main()` to execute as a side-effect and terminates the test process early via `process.exit(1)`. This is a real defect — the test file only reports 1/4 tests run and that one fails.

### Verdict: REQUEST_CHANGES

---

### Findings

#### [BLOCKING]: checkpoint.test.js tests are non-functional due to missing module.exports
**File:** `tests/node/checkpoint.test.js:26-43` and `hooks/checkpoint.js:359`
**Issue:** `checkpoint.test.js` calls `withProjectCwd(projectDir, (checkpoint) => checkpoint.validateHandoff())`, which relies on `require(CHECKPOINT_SCRIPT)` returning an object with a `validateHandoff` property. But `checkpoint.js` has no `module.exports` statement — it is a standalone script that calls `main()` unconditionally at load time. When the test runner loads the unexpected-property fixture scenario, `main()` calls `process.exit(1)`, which kills the test process entirely. Running `node --test tests/node/checkpoint.test.js` confirms this: only 1 of 4 tests executes and the process exits non-zero. The three unit-level tests (`validateHandoff accepts a valid fixture`, `validateHandoff rejects unexpected properties`, `artifact-based detection beats stale handoff`) never run.
**Suggestion:** Export the internal functions that tests call: add `if (require.main === module) { main(); }` at the bottom of `checkpoint.js`, and add `module.exports = { validateHandoff, detectPhase, phaseFromHandoff };` before that guard. This is a standard Node.js pattern for scripts that are both executable and testable.

#### [HIGH]: console.log used for operational output in hooks — should be stderr
**File:** `hooks/checkpoint.js:4693, 4990, 5046` (line numbers in full diff); specifically `checkpoint.js` lines for token-tracking and handoff-valid log lines
**Issue:** `checkpoint.js` emits operational messages (`[token-tracking] Logged ...`, `[handoff] valid ...`) via `console.log`, which writes to stdout. The Claude Code Stop hook reads stdout as `additionalContext` injected into the session. These operational log lines will appear in the model's context window on every session stop, inflating token usage and potentially confusing the model. The convention established by `restore-context.js` (which correctly uses `console.error` for diagnostics) should be consistent.
**Suggestion:** Change `console.log` calls for `[token-tracking]` and `[handoff] ✓` in `checkpoint.js` to `console.error`. Only output that should appear as session context (i.e., the `[checkpoint]` phase summary line) belongs on stdout.

#### [HIGH]: Validation logic duplicated verbatim between checkpoint.js and verification-gate/SKILL.md
**File:** `hooks/checkpoint.js` (validateHandoff function) and `skills/verification-gate/SKILL.md` (Handoff Validation section)
**Issue:** The full handoff schema validation — required fields list, type checks for each field, allowed-properties list — is duplicated word-for-word in both places. When the schema changes (e.g., a new optional field is added to `schemas/handoff.schema.json`), both locations must be updated in sync. The schema itself already encodes this information.
**Suggestion:** The skill section should reference the schema file and recommend using `ajv` or similar rather than embedding a full copy of the validation logic. Alternatively, extract a shared `validate-handoff.js` helper that both the hook and the skill snippet can reference. At minimum, add a comment in the skill noting it must stay in sync with `checkpoint.js`.

#### [MEDIUM]: Token tracking reads env vars (CLAUDE_CODE_INPUT_TOKENS) that are not documented or verified to exist
**File:** `hooks/checkpoint.js` (logTokenUsage function, env var block)
**Issue:** The implementation reads `process.env.CLAUDE_CODE_INPUT_TOKENS`, `CLAUDE_CODE_OUTPUT_TOKENS`, and `CLAUDE_CODE_CACHE_READ_TOKENS` with a fallback to zero. There is no documentation in the codebase confirming these variables are set by Claude Code at Stop hook time. If they are not actually populated, every entry in `token-usage.jsonl` will have `total_tokens: 0` and `token_source: 'estimated'`, making the log useless for its stated purpose of tracking budget against targets.
**Suggestion:** Add a comment in the code (and in `docs/CLAUDE.md` under Known Gotchas) documenting whether these env vars are actually provided by Claude Code, with a link to any API reference. If they are not provided, remove the dead branch or replace it with a clear TODO comment so future readers know the tracking is a placeholder.

#### [MEDIUM]: init.sh uses sed -i '' (macOS-specific) with no Linux fallback
**File:** `init.sh` (set_component_version function, `sed -i '' ...` line)
**Issue:** `sed -i ''` is the BSD/macOS syntax for in-place edit without backup. On Linux/GNU sed, the correct form is `sed -i` (no argument after `-i`). The script will fail on any Linux CI runner or Docker environment. The broader framework is positioned as a general-purpose tool (`npm/pip` stack mentioned in CLAUDE.md), so Linux compatibility matters.
**Suggestion:** Use a portable approach: `sed -i.bak "..." "$VERSION_FILE" && rm -f "${VERSION_FILE}.bak"`, or detect the platform with `uname` and branch. Alternatively use a `perl -i -pe` one-liner which is portable across both platforms.

#### [LOW]: NEXT_AGENT_MAP in restore-context.js maps handoff phase to the *next* agent, but comments are misleading
**File:** `hooks/restore-context.js:27-36`
**Issue:** The map is named `NEXT_AGENT_MAP` and the comment says "Infer the NEXT agent and model from the handoff phase (the agent that will run this session)". But the function that uses it is called `recordSessionStart` with the comment "Infer who is running NOW". The map entry for phase 1 is `{ agent: 'architect' }` with comment `// after specify → architect runs next`. This means a phase-1 handoff (written by specify) correctly identifies the architect as the next agent. However, `recordSessionStart` is called with `handoffPhase`, which is the phase written by the *previous* agent — so the naming and comments are accurate but the dual-purpose terminology (`NEXT_AGENT_MAP` that is also described as "who is running NOW") creates confusion for maintainers reading the code.
**Suggestion:** Rename `NEXT_AGENT_MAP` to `CURRENT_AGENT_BY_HANDOFF_PHASE` or add a single clear block comment explaining the invariant: "If the handoff says phase N was just completed, then the agent starting NOW is the phase-(N+1) agent, mapped here."

#### [PRAISE]: Tests are well-structured and cover real failure modes
The test suite across `dogfood-pipeline.test.js`, `dogfood-pipeline-e2e.test.js`, `pipeline-handoff-guards.test.js`, and `verification-gate.test.js` follows good practices: each test creates an isolated temp directory with `t.after` cleanup, assertions are behavioral (testing exit codes and file contents, not internal state), and the E2E tests exercise the actual hook scripts via `spawnSync`. The decision to mark tests for not-yet-implemented fixes as `// EXPECTED TO FAIL` with explanatory comments (rather than using `.skip`) is exactly right — it keeps the intent visible without hiding coverage.

---

### Test Assessment
- [x] New code has corresponding tests
- [ ] Edge cases are covered — checkpoint.test.js is non-functional (see BLOCKING finding)
- [x] No skipped tests introduced
- [x] Tests are testing behaviour, not implementation

### Convention Compliance
- [x] Follows project folder structure
- [x] Naming conventions respected
- [ ] No `any` types without documented reason — N/A (no TypeScript in changed files)
- [ ] No hardcoded values — `sed -i ''` is macOS-only (see MEDIUM finding)
- [x] Commit messages follow format
