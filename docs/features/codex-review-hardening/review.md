## Code Review: codex-review-hardening (Re-review)
**Generated:** 2026-04-13T18:00:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase**
**Diff:** `git diff main...HEAD`

---

### Summary

All four findings from the previous review (BLOCKING, HIGH, MEDIUM, LOW) are verified fixed.
The working tree is clean, `isCoveredByScript()` correctly rejects echo/log false positives
via a copy-command guard, `review-process.md` defers to `codex-rules.md`, and the LOW finding
is resolved by making the test mechanism-agnostic rather than requiring redundant per-file `cp`
lines. All 37 tests pass. All 7 ACs are satisfied.

### Verdict: APPROVE

---

### Findings

**[SUGGESTION] `isCoveredByScript()` ancestor matching does not catch paths without trailing delimiter**

Location: `tests/node/installer-coverage.test.js`, `isCoveredByScript()` function, steps 3-4

The ancestor-directory match checks for `ancestor + '/'`, `ancestor + '"'`, `ancestor + '/*'`,
and `ancestor + "'"`. It does not check `ancestor + ' '` (space) or end-of-line. A hypothetical
line `cp -r skills .claude` (without a trailing `/` on the source) would not be caught. This
is a theoretical gap only — the actual `init.sh` uses `cp -r "$SCRIPT_DIR"/skills/*
"$TARGET_DIR/.claude/skills/"` which does have trailing `/`, so the production case is covered.
Suggest adding `|| line.includes(ancestor + ' ')` to the ancestor checks for completeness, but
this is not blocking given the actual installer content.

---

### Previous Findings Verification

| Finding | Previous Severity | Verification Status |
|---------|------------------|---------------------|
| Working tree contained uncommitted changes to 5 committed files | BLOCKING | FIXED — `git status --short` shows only untracked review artifacts. All working-tree changes have been committed. Test counts match: 18+19=37 tests, all passing. |
| `isCoveredByScript()` ancestor matching accepted echo/log lines as coverage | HIGH | FIXED — `isCopyLine()` guard added using `\bcp\b` and `\brsync\b` word-boundary patterns. The specific false-positive case (`echo "Installing to .claude/skills/ directory"`) returns false. Verified by explicit regression test: `isCoveredByScript: echo/log mentioning ancestor directory does NOT satisfy contract`. |
| `review-process.md` carried duplicate Codex file ownership content with no deferral to `codex-rules.md` | MEDIUM | FIXED — `review-process.md` now has a `## Codex-specific guidance` section pointing to `codex-rules.md` as canonical source. Duplicate file ownership bullets removed and replaced with `See docs/memory/codex-rules.md for the authoritative file ownership table.` Verified by passing test `AC5: review-process.md defers to codex-rules.md for Codex-specific guidance`. |
| Redundant per-file `cp` lines in `init.sh`/`upgrade.sh` appeared as dead code | LOW | ADDRESSED — Developer chose approach (b): made the contract test mechanism-agnostic via `isCoveredByScript()`. The wildcard `cp -r skills/*` in `init.sh` now satisfies the contract directly. No redundant per-file lines are present or needed. `init.sh` and `upgrade.sh` are unchanged in this diff, confirming no dead code was introduced. |

---

### Acceptance Criteria Check

| AC | Requirement | Verdict | Evidence |
|----|-------------|---------|----------|
| AC1 | `review-code.md` requires inspecting installer/upgrade files when diff introduces new dependencies | PASS | `## Install-Path Tracing` section with `init.sh` + `upgrade.sh` references, `**Apply when:**` trigger condition. 3 passing tests. |
| AC2 | Test-truthfulness rule — check test assertion body proves what its name claims | PASS | `## Test-Truthfulness Verification` section with "test name" + "assertion" keywords and trigger condition. 3 passing tests. |
| AC3 | Parser edge-case rule — malformed-input matrix for parsers/validators | PASS | `## Parser/Validator Edge-Case Checklist` section with "malformed" keyword and trigger condition. 2 passing tests. |
| AC4 | Unchanged-file scope guidance | PASS | `## Unchanged-File Scope Expansion` section with "unchanged" + "scope" keywords. 3 passing tests. |
| AC5 | Process docs updated with stronger Codex review expectations | PASS | `docs/memory/codex-rules.md` updated with `## Review Method Rules` section. `review-process.md` defers to `codex-rules.md`. 6 passing tests including the deferral assertion. |
| AC6 | Deterministic test/fixture-backed check protects review prompt | PASS | `tests/node/codex-review-method.test.js`: 18 tests covering AC1-AC5 structural anchors, all passing. |
| AC7 | Installer coverage contract test globs source tree, asserts each file has coverage in init.sh | PASS | `tests/node/installer-coverage.test.js`: 19 tests covering both `init.sh` and `upgrade.sh`, mechanism-agnostic via `isCoveredByScript()`, with `activeLines()` filter, exclusion cap, phantom-exclusion guard, and 5 explicit unit tests of the matching function. All passing. |

---

### Test Assessment

- [x] New code has corresponding tests — both test files cover their respective ACs directly
- [x] Edge cases are covered — `activeLines()` tested for comment filtering (positive + negative), `isCoveredByScript()` tested for literal path, directory copy, loop, no-reference, and echo/log false-positive cases
- [x] No skipped tests introduced — `git diff main...HEAD | grep -n "\.skip\|xtest\|xit\b"` returns empty
- [x] Tests are testing behaviour, not implementation — contract tests verify installer coverage mechanism-agnostically; structural anchor tests verify section presence without phrase-binding

---

### Convention Compliance

- [x] Follows project folder structure — tests in `tests/node/`, docs in `docs/features/<feature>/`, process docs in `docs/memory/`, reviewer prompt in `codex/reviewers/`
- [x] Naming conventions respected — `*.test.js` test files, kebab-case feature directory
- [x] No `any` types — plain JavaScript, no TypeScript
- [x] No hardcoded secrets or credentials — confirmed by scan
- [x] Commit messages follow format — `fix:`, `chore:`, `review:` prefixes used correctly throughout branch history
- [x] Working tree is clean — no uncommitted changes to committed files
