## Code Review: fix/ISS-009-resolve-feature-coverage (Round 2)
**Date:** 2026-04-11 | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD` (6 commits, 18 changed files)
**Prior verdict:** REQUEST_CHANGES (2 MEDIUM + 1 HIGH)

---

### Summary

The branch adds correct parser hardening to `resolve-feature.js` (unknown-flag rejection, positional-token rejection) and wires all six pipeline commands through it. The prior review issued REQUEST_CHANGES on three findings. This round reviews the **committed state** of the branch. Two of the three prior findings remain unresolved in the committed tree; the developer has working-tree fixes for both but has not committed them. The branch is not ready to merge in its current committed state.

---

### Verdict: REQUEST_CHANGES

---

### Findings

#### [HIGH]: `hooks/resolve-feature.js` not committed — prior HIGH finding unresolved

**File:** `hooks/` directory (absent from `git diff main...HEAD`)

The prior review flagged the absence of `hooks/resolve-feature.js` as HIGH severity. The developer created the file locally (`hooks/resolve-feature.js` appears as untracked in `git status`) but did not commit it. The committed branch HEAD still has no `hooks/resolve-feature.js`. When tested against the committed state (`git stash` + `node --test`) the test suite runs 68 tests — neither the byte-identical sync test for `resolve-feature.js` (line 314-324 of the working-tree test file) nor `hooks/resolve-feature.js` itself are committed.

If this branch were merged as-is, `init.sh` / `upgrade.sh` would continue to install a stale `resolve-feature.js` from an absent `hooks/` source, and CI would not catch drift because the sync test does not exist in the committed tree.

**Suggestion:** Stage and commit `hooks/resolve-feature.js` together with the updated `tests/node/resolve-feature.test.js` (the byte-identical sync test is already written in the working tree — it just needs to be committed). A single `git add hooks/resolve-feature.js tests/node/resolve-feature.test.js && git commit` would close this finding.

---

#### [MEDIUM]: `checkpoint.js` sync test still checks only `require.main` guard, not byte identity

**File:** `tests/node/resolve-feature.test.js` (committed), lines 943-954 of the committed diff

The prior review asked for the sync test to assert byte-level identity or document the known divergences with rationale. The committed test (title: "checkpoint.js installed and source copies are in sync on require.main guard") still uses two `assert.ok(regex.test(...))` checks — it would pass even if the two copies had different logging levels, different comments, or missing lines. The working-tree version upgrades this to `assert.equal(source, installed)`, but that version is not committed.

**Suggestion:** Commit the working-tree version of the test (which is already written). If byte-identity cannot be achieved because of known intentional divergences, document those divergences explicitly in a comment in both the test and the files themselves.

---

#### [MEDIUM]: `--args` value starting with `--` is silently accepted as empty (prior MEDIUM, not yet addressed)

**File:** `.claude/helpers/resolve-feature.js` (committed), line 37 in the diff hunk

The prior review identified that `--args --something` silently produces `args = ''` because the parser treats any value beginning with `--` as a flag boundary. The behaviour is "correct by coincidence" for the specific `--` prefix case because the unknown-flag check catches the orphaned `--something` token in the next loop iteration — but this is not by design and is not tested. No test or comment addresses this edge case in the committed code.

**Suggestion:** Add a comment on the `next.startsWith('--')` guard explaining that the unknown-flag check below provides a safety net for this case, and add a test asserting `parseCliArgs(['--command', 'implement', '--phase', '5', '--args', '--my-feature'])` throws rather than silently returns `args = ''`.

---

#### [MEDIUM]: Prior review.md committed to branch by the reviewer — process concern

**File:** `docs/features/ISS-009-resolve-feature-coverage/review.md` (added in commit 77ae0a3)

The prior review document was committed to the feature branch by the reviewing agent as commit 77ae0a3 ("review: ISS-009-resolve-feature-coverage findings"). Review artifacts should be committed by the reviewer only after the developer acknowledges the findings, or they should be written to a separate review branch. In this case the review.md is part of the `git diff main...HEAD` being reviewed in this session — the reviewer is reading their own prior output as part of the implementation diff. This creates a mild self-anchoring risk.

**Suggestion:** The process should be: reviewer writes to the branch and pushes, developer addresses findings and adds new commits. This branch does follow that flow, but the review artifact being in the same diff as the implementation changes could confuse future readers of the commit history. Consider squashing or re-ordering the review commit to clearly separate reviewer output from developer fixes.

---

#### [NIT]: Slug regex too strict for the project's own naming convention

**File:** `.claude/helpers/resolve-feature.js` line 13 (unchanged from prior state)

```js
const FEATURE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
```

The project's own feature slugs use uppercase prefixes (e.g., `ISS-009-resolve-feature-coverage`). This regex rejects all such slugs, forcing the CLI to fall back to `handoff.json` for every pipeline invocation on real feature names. This was flagged in the task context as an observation to note. The regex should either be relaxed to allow uppercase (`/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/`) or the naming convention should change to all-lowercase.

---

#### [PRAISE]: `_handoffOverride` injection pattern and decision matrix tests

The `_handoffOverride` parameter added to `resolveFeatureTarget` is an elegant testability pattern: all six decision-matrix paths are now directly unit-testable without touching the filesystem. The nine new tests (added in commit 8b94d5d) cover the exact cases ISS-009 was opened to protect against. This is the right architecture for testing a function with external state dependencies.

---

### Test Assessment

- [x] New code has corresponding tests (for committed logic)
- [x] Edge cases covered for `parseCliArgs` (unknown flags, positional tokens)
- [ ] Sync test for `resolve-feature.js` not committed — byte-identical assertion exists only in working tree
- [ ] `--args --something` silent-empty edge case not tested in committed tree
- [x] No skipped tests introduced
- [x] Tests assert behaviour, not implementation

### Convention Compliance

- [x] Follows project folder structure (`hooks/` as canonical source, `.claude/helpers/` as installed)
- [ ] `hooks/resolve-feature.js` absent from committed tree — source/installed pattern incomplete
- [x] No `any` types (JavaScript, not TypeScript)
- [x] No hardcoded secrets
- [x] Commit messages follow format and explain why

---

### Verification Notes

- Read `git diff main...HEAD` via saved output (18 changed files, 979 lines of diff)
- Ran `node --test tests/node/*.test.js` against working tree: 70 pass
- Ran `node --test tests/node/*.test.js` against committed state (git stash): 68 pass
- Ran `diff hooks/checkpoint.js .claude/helpers/checkpoint.js`: no output (byte-identical in working tree)
- Ran `diff hooks/resolve-feature.js .claude/helpers/resolve-feature.js`: no output (byte-identical in working tree)
- Confirmed `hooks/resolve-feature.js` is untracked (not committed): `git show HEAD:hooks/resolve-feature.js` returns fatal error
- Confirmed committed test still uses narrow `require.main` guard check, not `assert.equal(source, installed)`
- Checked committed `resolve-feature.js` for exit-code documentation: `process.exit(2)` has no comment
- Observed: slug regex rejects project's own `ISS-NNN-` naming convention
