## Code Review: feature/ISS-027-codex-review-hardening
**Generated:** 2026-04-13T14:30:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Reviewed in separate context from authoring phase**
**Diff:** `git diff main...HEAD`

---

### Summary

The four rule additions to `review-code.md` are well-formed, precisely scoped, and correctly
anchored. All seven ACs are delivered in committed code and the committed test suite passes (31
tests). However, the working tree contains substantial uncommitted changes to five committed
files that alter the contract semantics of the AC7 test and the AC5 doc, and these changes
are not part of the reviewable diff. A PR with uncommitted working-tree drift should not
merge until those changes are either committed or explicitly discarded.

### Verdict: REQUEST_CHANGES

---

### Findings

**[BLOCKING] Working tree contains uncommitted changes to 5 committed files that are not part
of the PR diff**

Location: `tests/node/installer-coverage.test.js` (+176 lines), `tests/node/codex-review-method.test.js`
(+22 lines), `docs/memory/review-process.md` (+5 lines), `init.sh` (-33 lines), `upgrade.sh`
(-18 lines), `.claude/handoff.json` (modified)

`git status --short` shows all five files as modified but uncommitted. Running tests against
the working tree passes 18/18 in both suites. Running tests against the committed HEAD passes
17/17 and 14/14 — different test counts, different logic. The prior review document (committed
at 98445d1) describes the working-tree behaviour (e.g., `isCoveredByScript()` mechanism-agnostic
matching, `review-process.md` deferral) as if it were committed, but none of that code is in
the branch.

Why this blocks merge: the diff under review and the code that will land on main are different.
The committed `init.sh`/`upgrade.sh` retain the redundant per-file `cp` lines; the working tree
removes them. The committed AC7 test uses strict `includes(installedPath)` matching; the working
tree uses ancestor-directory matching with false-positive risk (see finding below). The committed
AC5 test suite does not assert `review-process.md` deferral; the working tree adds that assertion.

How to fix: stage and commit the working-tree changes, or `git checkout HEAD -- <files>` to
restore committed state. The committed branch is internally consistent and passes its own
tests — but the working tree must be resolved before the diff is accurate.

---

**[HIGH] `isCoveredByScript()` ancestor-directory matching introduces false-positive coverage**

Location: working-tree `tests/node/installer-coverage.test.js` lines 118-147 (not yet committed)

The working-tree version of the AC7 contract test replaces strict `includes(installedPath)`
with `isCoveredByScript()`, which accepts as coverage any active line that mentions an
ancestor directory. A script containing `echo "Installing to .claude/skills/ directory"` passes
the coverage check for every skill file — verified with a local test:

```
const script = 'echo "Installing to .claude/skills/ directory"';
isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md') // → true
```

The committed version does not have this problem — it requires the exact installed path to
appear in an active line. If the working-tree version is committed, the safety invariant
weakens: non-copy echo/log statements would satisfy the contract.

How to fix: either (a) keep the committed strict matching plus the per-file `cp` lines, or
(b) tighten `isCoveredByScript()` to only match inside known copy-command contexts (lines
containing `cp`, `rsync`, `install`, or a manifest statement) before accepting ancestor
directory matches.

---

**[MEDIUM] AC5 is partially incomplete in committed state: `review-process.md` carries
overlapping Codex ownership content with no deferral**

Location: `docs/memory/review-process.md` — `## When splitting work` section (committed state)

The PRD AC5 says: "If `docs/memory/review-process.md` contains overlapping Codex-specific
guidance, it must either defer to `codex-rules.md` or be updated to stay consistent."
The committed `review-process.md` still contains Codex file ownership bullets that are now
also in `codex-rules.md` (two sources of truth for the same rule). The deferral line exists
only in the uncommitted working tree. The committed AC5 tests only check `codex-rules.md`
content — they do not assert `review-process.md` consistency — so this gap does not
currently fail CI.

How to fix: commit the working-tree `review-process.md` change (adds the `## Codex-specific
guidance` section with a deferral pointer). This is already done in the working tree; it just
needs to be staged and committed.

---

**[LOW] Redundant per-file `cp` lines in `init.sh` and `upgrade.sh` will be removed as dead
code by future maintainers, breaking AC7 tests**

Location: `init.sh` lines 687-695 (commands block), 703-720 (skills block); same blocks in
`upgrade.sh`

Each block runs a wildcard `cp` that already covers all files, then repeats individual `cp`
lines per file. At runtime the per-file lines do nothing. Their only purpose is to satisfy
the committed AC7 contract test's `includes(installedPath)` assertion. Without an explanatory
comment, a future contributor running a "dead code cleanup" will remove them, immediately
breaking the installer coverage tests — the exact regression AC7 was designed to prevent.

How to fix: add a single comment before the per-file `cp` lines in each block:
`# Per-file copies below satisfy the AC7 installer-coverage contract test (tests/node/installer-coverage.test.js).`
This documents intent and prevents the "dead code" misread.

---

**[PRAISE] All four new rule sections in `review-code.md` open with explicit trigger conditions**

Every section (`## Install-Path Tracing`, `## Test-Truthfulness Verification`,
`## Parser/Validator Edge-Case Checklist`, `## Unchanged-File Scope Expansion`) has a
`**Apply when:**` line that prevents a reviewer from applying inapplicable checklists.
The trigger conditions are specific, testable, and directly address the screen-state
"No-test / no-parser diff: reviewer correctly skips inapplicable checklists" from the PRD.

---

**[PRAISE] Committed `activeLines()` + exclusion cap design is correct and adversarially tested**

The committed `activeLines()` filter strips comment lines before the path-presence check,
with positive and negative regression tests. The `MAX_EXCLUSIONS_PER_SCRIPT = 5` cap
prevents silent exclusion-list bloat, and the phantom-exclusion guard ensures stale entries
are caught immediately. This is sound contract test design.

---

### Prior Finding Status

| Finding | Prior Severity | Status |
|---------|---------------|--------|
| `cp` lines outside directory-existence guards in `init.sh`/`upgrade.sh` | BLOCKING | FIXED — all lines are inside guards in committed branch |
| Dead `globSync` import + `globSourceFiles` function in test | MAJOR | FIXED — only a comment reference remains |
| Missing trigger conditions in `review-code.md` sections | MINOR | FIXED — all four sections have `**Apply when:**` |

---

### Test Assessment

- [x] New committed code has corresponding committed tests
- [x] `activeLines()` filter is tested both positively and negatively
- [x] No skipped tests introduced in committed or working-tree state
- [ ] Working-tree test count (18+18=36) diverges from committed count (17+14=31) — working tree must be committed or discarded before this assessment is accurate

### Convention Compliance

- [x] Follows project folder structure — tests in `tests/node/`, docs in `docs/features/<feature>/`, process docs in `docs/memory/`
- [x] Naming conventions respected — kebab-case skill directories, `*.test.js` test files
- [x] No `any` types (plain JS)
- [x] No hardcoded secrets or credentials
- [x] Commit messages follow format (`fix:`, `chore:`, `review:` prefixes used correctly)
- [ ] Working tree contains uncommitted changes — branch state is ambiguous

---

### AC Coverage Matrix (committed branch state)

| AC | Requirement | Verdict | Notes |
|----|-------------|---------|-------|
| AC1 | Installer/source-of-truth rule in `review-code.md` | PASS | `## Install-Path Tracing` with `init.sh` + `upgrade.sh` references and trigger condition |
| AC2 | Test-truthfulness rule in `review-code.md` | PASS | `## Test-Truthfulness Verification` with "test name" + "assertion" and trigger condition |
| AC3 | Parser edge-case checklist in `review-code.md` | PASS | `## Parser/Validator Edge-Case Checklist` with "malformed" keyword and trigger condition |
| AC4 | Unchanged-file scope guidance in `review-code.md` | PASS | `## Unchanged-File Scope Expansion` with "unchanged" + "scope" and trigger condition |
| AC5 | `codex-rules.md` updated as canonical source | PARTIAL | `codex-rules.md` updated; `review-process.md` deferral exists only in working tree, not committed |
| AC6 | Per-rule regression tests for AC1-AC4 | PASS | 17 tests in committed `codex-review-method.test.js`, all passing |
| AC7 | Installer coverage contract test | PASS | 14 tests in committed `installer-coverage.test.js`, all passing; both `init.sh` and `upgrade.sh` covered |
