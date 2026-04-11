## Code Review: fix/ISS-009-resolve-feature-coverage (Round 3 — re-review)
**Date:** 2026-04-11 | **Reviewer:** code-reviewer agent (Claude)
**Diff:** `git diff main...HEAD` (24 changed files)
**Prior verdict:** REQUEST_CHANGES (BLOCKING + MAJOR + MEDIUM from Round 2 consolidated Claude+Codex review)

---

### Summary

All three blocking/major findings from the prior consolidated review have been addressed in the committed tree. `hooks/resolve-feature.js` is now committed and byte-identical to `.claude/helpers/resolve-feature.js`. Both `init.sh` and `upgrade.sh` copy it on install/upgrade. The checkpoint.js sync test now uses `assert.equal(source, installed)` byte-identity assertion. The `--args --something` regression test and inline comment are committed. All 70 tests pass with zero skips.

---

### Verdict: APPROVE

---

### Findings

#### [MEDIUM]: `FEATURE_SLUG_RE` rejects the project's own feature naming convention

**File:** `hooks/resolve-feature.js` line 10 (unchanged from prior rounds)

```js
const FEATURE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
```

The project's own feature slugs use uppercase prefixes (`ISS-009-resolve-feature-coverage`). This regex rejects all real feature names from this codebase, forcing the CLI to fall back to `handoff.json` for every pipeline invocation in practice. The fallback works correctly when the handoff is valid, but the explicit-arg path — the more defensive path — is unreachable with any real feature slug from this repo.

This is pre-existing (not introduced in this branch) and tracked as a separate issue. Flagged here for completeness since it affects every command wired in this branch.

---

#### [LOW]: `upgrade.sh` installs `resolve-feature.js` only inside the `CORE_NEEDS_UPGRADE` branch

**File:** `upgrade.sh` lines 183–190 (context around the new line)

The `cp` for `resolve-feature.js` is added inside `if [ "$CORE_NEEDS_UPGRADE" = true ]`. Projects that already have a recent install and are re-running `upgrade.sh` for non-core changes will not receive `resolve-feature.js` if core is already up to date but the file is missing (e.g., was manually deleted or the project pre-dates this branch). `init.sh` has no such guard and always installs. The risk is low given that the file is new and any project with core up to date would have received it in a previous upgrade cycle — but the asymmetry is worth noting.

**Suggestion:** Consider adding a fallback outside the guard: `[ -f "$TARGET_DIR/.claude/helpers/resolve-feature.js" ] || cp ...` to make the installer idempotent for the new file.

---

#### [NIT]: `parseCliArgs` returns `args = ''` when `--args` is followed immediately by another known flag

**File:** `hooks/resolve-feature.js` lines 39–42

The inline comment correctly documents the behaviour: `--args --phase 5` would record `args = ''` and then correctly reject `--phase` as a... wait — `--phase` IS a known flag, so it would be consumed as the value for `--phase`, not rejected. The test covers `--args --feature-slug` (unknown flag), but not `--args --phase 5` (known flag). In the `--args --phase 5` case, `args` would be `''` and `phase` would be `5` — meaning the `--args` value was silently dropped without error. This is unlikely in practice (callers always quote `$ARGUMENTS`) but is not documented.

This is a NIT; the comment is accurate for the unknown-flag case it describes.

---

#### [PRAISE]: All three prior blocking/major findings fully resolved with tests

The developer committed `hooks/resolve-feature.js`, updated both `init.sh` and `upgrade.sh`, upgraded the checkpoint sync test to byte-identity assertion (`assert.equal(source, installed)`), synced `.claude/helpers/checkpoint.js` to match the source, added the `--args --something` regression test, and committed the inline safety-net comment. The prior review explicitly listed the uncommitted working-tree state of each fix — every item is now in the committed tree.

---

#### [PRAISE]: Test suite is well-scoped and teaches the decision matrix

The nine `resolveFeatureTarget` tests using `_handoffOverride` cover the complete decision matrix (INVALID_ARGS, FEATURE_MISMATCH, slug-with-warning, empty-to-handoff, STALE_HANDOFF, NO_FALLBACK). The comment on the test helper (`// These test the core safety logic that ISS-009 exists to protect`) makes the purpose clear to future maintainers. The byte-identity sync tests for both helpers are a meaningful guard against copy drift.

---

### Test Assessment

- [x] New code has corresponding tests
- [x] Edge cases covered: unknown flags, positional tokens, `--args --value` pattern, all six decision-matrix paths
- [x] `checkpoint.js` sync test uses `assert.equal(source, installed)` — byte-identical assertion
- [x] `resolve-feature.js` sync test uses `assert.equal(source, installed)` — byte-identical assertion
- [x] `--args --something` regression test committed
- [x] No skipped tests introduced
- [x] Tests assert behaviour, not implementation

### Convention Compliance

- [x] `hooks/` as canonical source committed and byte-identical to `.claude/helpers/`
- [x] `init.sh` and `upgrade.sh` updated to install `resolve-feature.js`
- [x] No `any` types (JavaScript)
- [x] No hardcoded secrets
- [x] `console.log` diagnostic messages changed to `console.error` (correct — keeps stdout clean for machine-readable output)
- [x] `require.main` guard and `module.exports` present on both `checkpoint.js` and `resolve-feature.js`
- [x] Commit messages follow format and explain why

---

### Verification Notes

- Read `git diff main...HEAD` (24 changed files)
- Ran `node --test tests/node/*.test.js`: 70 pass, 0 fail, 0 skip
- Ran `diff hooks/checkpoint.js .claude/helpers/checkpoint.js`: exit 0 (byte-identical)
- Ran `diff hooks/resolve-feature.js .claude/helpers/resolve-feature.js`: confirmed byte-identical via test pass
- Confirmed `hooks/resolve-feature.js` exists in committed HEAD via `git show HEAD:hooks/resolve-feature.js`
- Confirmed `init.sh` and `upgrade.sh` both include `resolve-feature.js` install line in committed diff
- Confirmed `parseCliArgs` test for `--args --feature-slug` is committed in `tests/node/resolve-feature.test.js:106`
- Confirmed inline safety-net comment committed in `.claude/helpers/resolve-feature.js:40`
- No debug statements, no skipped tests, no secrets in diff
