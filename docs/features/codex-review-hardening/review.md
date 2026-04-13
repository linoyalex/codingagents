## Code Review: feature/ISS-027-codex-review-hardening
**Generated:** 2026-04-13T23:00:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase.**
**Diff:** `git diff main...HEAD`

---

### Summary

The feature delivers all seven ACs: four new review-method sections in `codex/reviewers/review-code.md`, process docs updated in `docs/memory/codex-rules.md`, two test files with 31 passing tests, and installer script updates in `init.sh`/`upgrade.sh`. The core content changes are high quality — the review-method additions are well-targeted and the test design demonstrates good adversarial thinking (active-line filtering, exclusion caps, phantom-exclusion guards). However, the installer changes introduce unconditional redundant `cp` calls placed outside the existing directory-existence guards, which is a structural correctness issue. One piece of dead code also ships in the test file.

### Verdict: REQUEST_CHANGES

---

### Findings

**issue (blocking): init.sh new `cp` lines are outside the directory-existence guard — redundant and structurally wrong**

Location: `init.sh` lines 101-134, `upgrade.sh` lines 200-216 and 227-235

The new individual `cp` commands are placed **after** the closing `fi` of the `if [ -d "$SCRIPT_DIR/commands" ]` and `if [ -d "$SCRIPT_DIR/skills" ]` blocks. This creates two problems:

1. **Redundancy with data loss risk:** The wildcard `cp -r "$SCRIPT_DIR"/skills/*` already copies every SKILL.md file. The per-file `cp` lines that follow re-copy the same files unconditionally. While harmless at runtime (thanks to `2>/dev/null || true`), this masks whether individual files were actually present — a new skill added to the repo but not to the per-file list would still be installed by the wildcard, making the new `cp` lines an incomplete and misleading inventory.

2. **Guard bypass:** The per-file `cp` commands at lines 101-109 and 117-134 run even if the directory-existence check failed (i.e., if `$SCRIPT_DIR/commands` or `$SCRIPT_DIR/skills` does not exist). The original structure used the `if [ -d ... ]` guard precisely to handle this case. The new lines sidestep it.

The intent was likely to satisfy the `installer-coverage.test.js` path-presence assertion, but the correct fix is to place these lines inside the existing guard blocks (or, better, remove them entirely since the wildcard already covers them, and instead rely on the contract test to enforce completeness).

How to fix: Move the new `cp` lines inside their corresponding `if [ -d ... ]; then ... fi` blocks. In `upgrade.sh`, the same applies — the new lines must remain inside the `if [ "$CORE_NEEDS_UPGRADE" = true ]` block (they are, at lines 200-235), but should also be inside the inner `if [ -d ... ]` sub-guards at lines 195-198 and 222-225.

---

**issue (major): `globSourceFiles()` function and `globSync` import are dead code in `installer-coverage.test.js`**

Location: `tests/node/installer-coverage.test.js` lines 15 and 52-60

`globSync` is imported from `node:fs` at line 15 and a `globSourceFiles(pattern)` helper is defined at lines 52-60. No test in the file calls `globSourceFiles()` — all tests use `collectSourceFiles()`. This means both the import and the function are unreachable dead code. The file comment at line 77 explicitly says "Collect via directory reads to avoid globSync compatibility issues," confirming that `globSourceFiles` was deliberately abandoned but not removed.

Dead code in test files is especially harmful: it creates false impressions of what the test covers, and the `globSync` import will fail silently on Node < 22 (the `globSync` export was added in Node 22.0.0), making CI harder to reason about in mixed-version environments.

How to fix: Remove the `const { globSync } = require('node:fs');` import at line 15 and the entire `globSourceFiles` function at lines 52-60.

---

**suggestion (minor): AC2 test-truthfulness section in `review-code.md` is missing an explicit trigger condition**

Location: `codex/reviewers/review-code.md`, `## Test-Truthfulness Verification` section

The architecture specifies each section must start with a trigger condition so the reviewer knows when to apply it (architecture.md, "Each section includes its trigger condition so the reviewer skips it when inapplicable"). The `## Install-Path Tracing` section has no explicit "Trigger:" statement either, but both AC1/AC2 are missing them while AC3 (`## Parser/Validator Edge-Case Checklist`) and AC4 (`## Unchanged-File Scope Expansion`) are also missing explicit trigger lines in the actual implementation.

The review-code.md additions describe *what to check* but none of the four new sections include an explicit trigger condition sentence (unlike what the architecture doc promised). This risks reviewers applying all checklists to all diffs — the exact "reviewer invents checklist work for inapplicable rules" error state called out in the PRD screen states.

How to fix: Add a one-sentence "When to apply:" or "Trigger:" line at the top of each new section, as specified in the architecture (e.g., "Apply when: the diff introduces or modifies a file in `skills/`, `commands/`, or `hooks/`.").

---

**praise: `installer-coverage.test.js` adversarial test design is exemplary**

The `activeLines()` filter (stripping comment-only lines before checking path presence), the exclusion list cap (`MAX_EXCLUSIONS_PER_SCRIPT = 5`), and the phantom-exclusion guard (`exclusion list entries must correspond to actual source files`) all directly address the Codex review HIGH findings from the architecture review. The test file includes positive and negative regression tests for `activeLines()` itself (lines 1103-1121). This is the level of contract test robustness that ISS-044 is trying to codify as a systemic practice — the team is already doing it here.

---

**suggestion (minor): `init.sh` new per-file `cp` lines have no `mkdir -p` guard for commands, unlike skills**

Location: `init.sh` lines 101-109

The skills block includes `mkdir -p "$TARGET_DIR/.claude/skills/<name>"` before each `cp`. The commands block at lines 101-109 has no `mkdir -p "$TARGET_DIR/.claude/commands/"` preceding the per-file copies. On a fresh system where `.claude/commands/` does not yet exist, these `cp` commands will fail silently (suppressed by `2>/dev/null || true`). The wildcard block at line 98 has the same gap, but the new per-file lines compound it. In `upgrade.sh` the commands section has the same issue at lines 227-235.

This is a silent failure mode: the `|| true` masks the error, tests pass, but the files are not installed.

---

**issue (minor): `handoff.json` `phase` field is stale — still set to `5` after Phase 5 handoff**

Location: `.claude/handoff.json` line 9

The handoff written by Phase 5 sets `"phase": 5`. The Phase 6 reviewer reads this file as primary context at session start. The `phase` field should reflect the phase that produced the handoff (5) but the `goal` already says "Diff-based code review in fresh context" — which is Phase 6's goal, not Phase 5's. This creates a contradiction: the phase number says 5, the goal describes 6's work. Readers of the handoff have to reconcile the mismatch.

Per the CLAUDE.md handoff schema, `phase` should be the phase number of the agent that **produced** the handoff (5). The `goal` should describe what the **next** phase does. On that reading the goal text is correct and the phase field is correct — but the phrasing "Diff-based code review in fresh context" reads as an instruction to Phase 6, not a description of what Phase 5 accomplished. Low-severity ambiguity but worth tidying in Phase 7.

---

### Test Assessment

- [x] New code has corresponding tests — 31 tests across two files, all passing
- [x] Edge cases are covered — active-line filtering, phantom exclusions, exclusion cap, comment-only regression
- [x] No skipped tests introduced
- [ ] Tests are testing behaviour, not implementation — **partial**: `codex-review-method.test.js` tests structural text presence (appropriate for this domain); `installer-coverage.test.js` tests behavioral install contract, but dead `globSourceFiles` function implies an abandoned implementation approach was not fully cleaned up

### Convention Compliance

- [x] Follows project folder structure — tests in `tests/node/`, docs in `docs/features/<feature>/`
- [x] Naming conventions respected
- [x] No `any` types (Node.js plain JS — not applicable)
- [x] No hardcoded secrets or credentials
- [x] Commit messages follow format (chore/feat/fix/security prefixes used correctly)

---

### AC Coverage Matrix

| AC | Requirement | Status | Notes |
|----|-------------|--------|-------|
| AC1 | Installer/source-of-truth rule in review-code.md | PASS | Section present, init.sh + upgrade.sh referenced |
| AC2 | Test-truthfulness rule in review-code.md | PASS | Section present, "test name" + "assertion" present |
| AC3 | Parser edge-case checklist in review-code.md | PASS | Section present, "malformed" present |
| AC4 | Unchanged-file scope guidance in review-code.md | PASS | Section present, "unchanged" + "scope" present |
| AC5 | codex-rules.md updated | PASS | "Review Method Rules" section added with all four rules |
| AC6 | Per-rule regression tests | PASS | 17 tests in codex-review-method.test.js, all passing |
| AC7 | Installer coverage contract test | PASS (tests) / CONCERN (impl) | 14 tests passing; however the init.sh/upgrade.sh changes the tests validate are placed outside directory guards — the contract is satisfied by string presence while the implementation structure is wrong |
