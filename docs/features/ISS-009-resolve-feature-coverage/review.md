# Review: ISS-009-resolve-feature-coverage

**Date:** 2026-04-11 | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD` on branch `fix/ISS-009-resolve-feature-coverage`

---

## Summary

The branch correctly closes the ISS-009 safety hole: unknown CLI flags and stray positional tokens now cause `resolve-feature.js` to exit non-zero, and all six pipeline commands (Phases 2-7) are verified to invoke `resolve-feature.js` with the correct `--phase` and `--args "$ARGUMENTS"` binding. All 68 tests pass. Two findings below require attention before merge.

---

## Findings

### issue (HIGH): `hooks/resolve-feature.js` does not exist — hardened parser lives only in `.claude/helpers/`

**File:** `hooks/` directory (absent from diff)

The `parseCliArgs` hardening (unknown-flag rejection, positional-token rejection) was applied to `.claude/helpers/resolve-feature.js` but no corresponding `hooks/resolve-feature.js` exists. The `hooks/` directory is the source-of-truth for installed copies: `hooks/checkpoint.js` is the source that gets installed to `.claude/helpers/checkpoint.js`. If `resolve-feature.js` follows the same pattern, a future `init.sh` or `upgrade.sh` run would overwrite the hardened installed copy with a stale, unguarded version — silently reintroducing the ISS-009 vulnerability.

Verify whether `resolve-feature.js` is supposed to live under `hooks/` (like `checkpoint.js`) and ensure the source and installed locations are consistent. The test at line 291-303 checks sync only for `checkpoint.js`; there is no equivalent test locking `hooks/resolve-feature.js` to `.claude/helpers/resolve-feature.js`.

**Recommendation:** Either add `hooks/resolve-feature.js` as the canonical source and assert byte-level sync in the test suite, or document explicitly (in a comment in the file and in `docs/CLAUDE.md`) that `resolve-feature.js` is installed-only and is exempt from the `hooks/` pattern.

---

### issue (MEDIUM): `--args` value that starts with `--` is silently swallowed as an empty string

**File:** `.claude/helpers/resolve-feature.js:37-38`

```js
if (next === undefined || next.startsWith('--')) {
  parsed[flag] = '';
  continue;
}
```

When `$ARGUMENTS` expands to a value beginning with `--` (e.g., a user who typed `/implement --my-feature` literally), the parser treats it as a flag boundary and records `args = ''`. The slug is then classified as `empty` and the system falls back to `handoff.json` without warning. This is the softer variant of the original ISS-009 failure mode: corrupted input silently becomes a handoff fallback.

Verified manually:
```
parseCliArgs(['--command', 'implement', '--phase', '5', '--args', '--feature-slug'])
// throws: Unknown flag(s): --feature-slug
```
The throw path actually catches this case for `--feature-slug` specifically because after consuming `--args` with an empty value, the parser sees `--feature-slug` as an unknown flag. But this is accidental: the parse loop moves on without consuming the next token, so the next iteration treats `--feature-slug` as a flag — and correctly rejects it. The behaviour is correct by coincidence for the `--` prefix case, not by design. The intent of the guard (`next.startsWith('--')`) was to handle flag-adjacent flags, but it creates a latent footgun for future flag additions where the "unknown flag" path might not be present.

**Recommendation:** Add a comment explaining the `next.startsWith('--')` guard is intentional (not a typo), and add a test case that confirms `--args --something` fails cleanly rather than silently falling back.

---

### issue (MEDIUM): `checkpoint.js` source/installed copies have functional divergences not introduced by this branch — but the sync test only checks the `require.main` guard

**File:** `tests/node/resolve-feature.test.js:291-303`

`diff hooks/checkpoint.js .claude/helpers/checkpoint.js` reveals three divergences:
1. A comment ("must stay in sync with…") removed from the installed copy
2. `console.error` → `console.log` for a token-tracking log line
3. `console.error` → `console.log` for the handoff-valid confirmation line

The new test at line 291-303 only asserts that *both copies have the `require.main` guard*. It does not assert byte-level identity and would pass even if one copy had a different logging level or missing synchronisation comment. This branch introduced no new divergence, but the test's narrow scope leaves the pre-existing drift invisible to CI.

This was flagged in the Codex review as a residual risk. The test should either be extended to assert full byte-level sync (per the `docs/CLAUDE.md` convention: "Source and installed copies must be kept in sync") or the known divergences should be explained and intentionally allowed with a comment.

**Recommendation:** Either widen the test to `assert.equal(source, installed)` for `checkpoint.js`, or document that the two copies are intentionally allowed to differ (with a rationale comment in both files and in the test).

---

### question: `--phase` validation exits with code `2` while all other errors use code `1` — is the distinction intentional?

**File:** `.claude/helpers/resolve-feature.js:161-163`

```js
if (!Number.isInteger(targetPhase)) {
  console.error('[resolve-feature] Missing or invalid --phase value');
  process.exit(2);
}
```

All other error paths in `main()` call `process.exit(1)`. The `exit(2)` here distinguishes a bad invocation of the script from a bad pipeline state, which is a valid distinction (analogous to shell conventions where exit 1 = logical failure, exit 2 = misuse). But there is no documentation for this contract, and command consumers (the `.md` files) only check "non-zero" without distinguishing codes. If downstream tooling ever needs to act on this distinction, the undocumented contract would be a trap.

**Recommendation:** Add a brief comment alongside `process.exit(2)` explaining the exit-code convention, or flatten to `exit(1)` if no caller distinguishes them.

---

### praise: decision matrix for `resolveFeatureTarget` is clean and complete

The `resolveFeatureTarget` function covers all six cases (invalid args, slug+match, slug+mismatch, slug+invalid handoff, slug+wrong phase, empty+fallback) with clear return codes and recovery messages. The `_handoffOverride` injection point makes all paths directly unit-testable without filesystem mocking — a good pattern that keeps the tests fast and deterministic.

---

## Verdict

REQUEST CHANGES

Two MEDIUM findings should be resolved before merge:
- The `hooks/resolve-feature.js` source question is a maintenance-safety issue that could silently undo this fix on next upgrade.
- The `checkpoint.js` sync test is weaker than the project's stated convention and leaves known drift undetected.

The HIGH finding on `hooks/` absence is the most urgent because it directly threatens the durability of the ISS-009 fix.

---

## Verification Notes

- Read `git diff main...HEAD` in full (16 changed files)
- Read ISS-009 ticket at `docs/issues/tickets/ISS-009.md` for acceptance criteria
- Read Codex review at `docs/features/ISS-009-resolve-feature-coverage/review-codex-code-ISS-009-resolve-feature-coverage.md`
- Ran `node --test tests/node/*.test.js` — 68 pass, 0 fail
- Opened `.claude/helpers/resolve-feature.js` to verify parser logic
- Opened `tests/node/resolve-feature.test.js` lines 232-326 to verify command-wiring tests read source files, not installed copies (they read `commands/*.md`)
- Ran `diff hooks/checkpoint.js .claude/helpers/checkpoint.js` to verify sync state
- Confirmed `implement.md` and `document.md` were already wired on `main` (not in this branch's diff)
- Exercised `parseCliArgs` edge cases directly in node for `--args --feature-slug` and `--args ''`
- Checked exit-code consistency: `process.exit(2)` on bad phase, `process.exit(1)` everywhere else
