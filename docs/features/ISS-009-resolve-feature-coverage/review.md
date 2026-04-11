## Code Review: fix/ISS-009-resolve-feature-coverage (Round 2 — consolidated)
**Date:** 2026-04-11 | **Reviewers:** code-reviewer agent (Claude), Codex code-reviewer
**Diff:** `git diff main...HEAD` (6 commits, 18 changed files)
**Prior verdict:** REQUEST_CHANGES (2 MEDIUM + 1 HIGH)

---

### Summary

The branch adds correct parser hardening to `resolve-feature.js` (unknown-flag rejection, positional-token rejection) and wires all six pipeline commands through it. A prior review issued REQUEST_CHANGES on three findings. This round consolidates findings from both Claude and Codex reviewers.

Two of the three prior findings remain unresolved in the committed tree; the developer has working-tree fixes for both but has not committed them. Additionally, Codex identified that `init.sh` and `upgrade.sh` must be updated to install `resolve-feature.js` — those changes also exist in the working tree but are uncommitted.

---

### Verdict: REQUEST_CHANGES

---

### Findings

#### [BLOCKING]: `hooks/resolve-feature.js` not committed and installers don't deploy it (Claude HIGH + Codex BLOCKING)

**File:** `hooks/` directory (absent from `git diff main...HEAD`); `init.sh:114`; `upgrade.sh:186`

The prior review flagged the absence of `hooks/resolve-feature.js` as HIGH severity. The developer created the file locally (`hooks/resolve-feature.js` appears as untracked in `git status`) but did not commit it. The committed branch HEAD still has no `hooks/resolve-feature.js`.

**Codex addition:** Even once `hooks/resolve-feature.js` is committed, `init.sh` and `upgrade.sh` must be updated to copy it to `.claude/helpers/resolve-feature.js` in target projects. Currently only `checkpoint.js`, `archive-context.js`, and `restore-context.js` are installed. The developer has the installer changes in their working tree but they are uncommitted.

Without both fixes, a fresh install or upgrade would ship commands that reference a helper file the project does not have, breaking phases 2-7 outside this repo.

**Resolution:** Stage and commit `hooks/resolve-feature.js`, `init.sh`, and `upgrade.sh` together.

---

#### [MAJOR]: `checkpoint.js` sync test still checks only `require.main` guard, not byte identity (Claude MEDIUM + Codex MAJOR)

**File:** `tests/node/resolve-feature.test.js` (committed), lines 943-954 of the committed diff

The prior review asked for the sync test to assert byte-level identity or document known divergences. The committed test (title: "checkpoint.js installed and source copies are in sync on require.main guard") still uses two `assert.ok(regex.test(...))` checks — it would pass even if the two copies had different logging levels, different comments, or missing lines.

**Codex addition:** `hooks/checkpoint.js` and `.claude/helpers/checkpoint.js` actually differ in the committed tree (console.log vs console.error, missing sync comment, missing export comment). The narrow test gives a false sense of protection around copy drift.

The working-tree version upgrades the test to `assert.equal(source, installed)` and syncs the installed copy to match the source. Both changes need to be committed.

**Resolution:** Commit the updated `.claude/helpers/checkpoint.js` (synced to match `hooks/checkpoint.js`) and the upgraded test file.

---

#### [MEDIUM]: `--args` value starting with `--` is silently accepted as empty (Claude MEDIUM + Codex MINOR)

**File:** `.claude/helpers/resolve-feature.js` (committed), line 37 in the diff hunk

The prior review identified that `--args --something` silently produces `args = ''` because the parser treats any value beginning with `--` as a flag boundary. The behaviour is "correct by coincidence" for the `--` prefix case because the unknown-flag check catches the orphaned `--something` token in the next loop iteration — but this is not by design and is not tested.

The developer has added both an inline comment explaining the safety net and a regression test (`parseCliArgs: --args value starting with -- is rejected as unknown flag, not silently swallowed`) in the working tree but neither is committed.

**Resolution:** Commit the updated `.claude/helpers/resolve-feature.js` (inline comment) and test file.

---

#### [MEDIUM]: Prior review.md committed to branch by the reviewer — process concern

**File:** `docs/features/ISS-009-resolve-feature-coverage/review.md` (added in commit 77ae0a3)

The prior review document was committed to the feature branch by the reviewing agent. Review artifacts should be committed by the reviewer only after the developer acknowledges the findings, or they should be written to a separate review branch. This creates a mild self-anchoring risk when the same review.md appears in the diff being reviewed.

**Suggestion:** Consider squashing or re-ordering the review commit to clearly separate reviewer output from developer fixes.

---

#### [NIT]: Slug regex too strict for the project's own naming convention

**File:** `.claude/helpers/resolve-feature.js` line 13 (unchanged from prior state)

```js
const FEATURE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
```

The project's own feature slugs use uppercase prefixes (e.g., `ISS-009-resolve-feature-coverage`). This regex rejects all such slugs, forcing the CLI to fall back to `handoff.json` for every pipeline invocation on real feature names. This was flagged during this review when `resolve-feature.js` itself rejected the review command. Not addressed in this branch — tracked separately.

---

#### [PRAISE]: `_handoffOverride` injection pattern and decision matrix tests

The `_handoffOverride` parameter added to `resolveFeatureTarget` is an elegant testability pattern: all six decision-matrix paths are now directly unit-testable without touching the filesystem. The nine new tests cover the exact cases ISS-009 was opened to protect against.

---

### Test Assessment

- [x] New code has corresponding tests (for committed logic)
- [x] Edge cases covered for `parseCliArgs` (unknown flags, positional tokens)
- [ ] Sync test for `resolve-feature.js` not committed — byte-identical assertion exists only in working tree
- [ ] `--args --something` regression test exists only in working tree
- [x] No skipped tests introduced
- [x] Tests assert behaviour, not implementation

### Convention Compliance

- [x] Follows project folder structure (`hooks/` as canonical source, `.claude/helpers/` as installed)
- [ ] `hooks/resolve-feature.js` absent from committed tree — source/installed pattern incomplete
- [ ] `init.sh`/`upgrade.sh` not updated in committed tree — installer won't deploy resolve-feature.js
- [x] No `any` types (JavaScript, not TypeScript)
- [x] No hardcoded secrets
- [x] Commit messages follow format and explain why

---

### Verification Notes

- Read `git diff main...HEAD` via saved output (18 changed files, 979 lines of diff)
- Ran `node --test tests/node/*.test.js` against working tree: 70 pass
- Ran `node --test tests/node/*.test.js` against committed state (git stash): 68 pass
- Ran `diff hooks/checkpoint.js .claude/helpers/checkpoint.js`: byte-identical in working tree, divergent in committed tree
- Ran `diff hooks/resolve-feature.js .claude/helpers/resolve-feature.js`: byte-identical in working tree
- Confirmed `hooks/resolve-feature.js` is untracked (not committed): `git show HEAD:hooks/resolve-feature.js` returns fatal
- Confirmed `init.sh` and `upgrade.sh` installer updates exist only in working tree
- Confirmed committed test still uses narrow `require.main` guard check, not `assert.equal(source, installed)`
- Cross-referenced Claude review findings with Codex review at `docs/features/ISS-009-resolve-feature-coverage/review-codex-code-ISS-009-resolve-feature-coverage.md`
