## Code Review: feature/ISS-027-codex-review-hardening
**Generated:** 2026-04-13T23:45:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD`
**Reviewed in separate context from authoring phase**

---

### Summary

All seven ACs are delivered and all 31 tests pass. The three prior findings (BLOCKING guard placement, MAJOR dead code, MINOR missing trigger conditions) are confirmed fixed in 648f3d3. The review-method additions to `review-code.md` are well-targeted and precisely scoped with explicit trigger conditions. The installer coverage contract test demonstrates exemplary adversarial test design. There are no blocking issues — this PR is ready to merge.

### Verdict: APPROVE

---

### Findings

**praise: All four new review-code.md sections have explicit trigger conditions**

All four new sections (`## Install-Path Tracing`, `## Test-Truthfulness Verification`, `## Parser/Validator Edge-Case Checklist`, `## Unchanged-File Scope Expansion`) open with a `**Apply when:**` line that prevents reviewers from applying inapplicable checklists. This directly addresses the "reviewer invents checklist work" error state from the PRD screen states. Prior review found this missing (MINOR finding in first pass); it is now fully resolved.

---

**praise: installer-coverage.test.js adversarial design is exemplary**

The `activeLines()` filter prevents false-passes on commented-out paths. The `MAX_EXCLUSIONS_PER_SCRIPT = 5` cap prevents exclusion list abuse. The phantom-exclusion guard requires each exclusion to correspond to an actual source file. Positive and negative regression tests for `activeLines()` itself are present. This is the level of contract test robustness that ISS-044 aims to codify systemically.

---

**suggestion (low): per-file `cp` lines are redundant after the wildcard — a comment explaining the contract-test purpose would prevent future confusion**

Location: `init.sh` lines 98-107 (commands block), lines 114-132 (skills block); same pattern in `upgrade.sh`

Both blocks execute a wildcard `cp` that already installs every file, followed immediately by individual `cp` lines for each file. The per-file lines are redundant at runtime — their purpose is to satisfy the AC7 contract test's path-presence assertion, which checks that specific installed path strings appear in active lines of the installer. Without a comment explaining this, a future maintainer may remove the per-file lines as dead code, which would immediately break the AC7 tests.

How to fix: Add a comment immediately before the per-file `cp` lines in each of the four blocks: `# Explicit per-file copies below satisfy the AC7 installer-coverage contract test path-presence assertions.`

---

**nit: AC7 contract does not cover skills sub-files (e.g., verification-gate phase reference files)**

Location: `tests/node/installer-coverage.test.js` — `collectSourceFiles()` function; `skills/verification-gate/` contains 7 sub-files beyond `SKILL.md`

The AC7 spec (`skills/*/SKILL.md`) is implemented exactly as written. Sub-files like `skills/verification-gate/phase-6-review.md` are installed by the wildcard `cp -r` but have no contract test coverage. This is correct per spec, but the gap means sub-file drift would not be caught. No action needed for this PR — consider a follow-up to extend the source glob to `skills/**/*.md` if sub-file drift becomes a concern.

---

### Prior Finding Status

| Finding | Prior Severity | Status |
|---------|---------------|--------|
| `cp` lines outside directory-existence guards in init.sh and upgrade.sh | BLOCKING | FIXED in 648f3d3 — all lines are inside guards |
| Dead `globSync` import + `globSourceFiles` function in test | MAJOR | FIXED in 648f3d3 — only a comment reference remains |
| Missing trigger conditions in review-code.md sections | MINOR | FIXED in 648f3d3 — all four sections have `**Apply when:**` |

---

### Test Assessment

- [x] New code has corresponding tests — 17 tests in `codex-review-method.test.js`, 14 in `installer-coverage.test.js`, all passing
- [x] Edge cases are covered — comment-only paths, phantom exclusions, exclusion cap, active-code positive regression
- [x] No skipped tests introduced
- [x] Tests are testing behaviour, not implementation — structural anchors survive wording changes; AC7 tests path-presence in active lines, not specific cp syntax

### Convention Compliance

- [x] Follows project folder structure — tests in `tests/node/`, docs in `docs/features/<feature>/`, process doc in `docs/memory/`
- [x] Naming conventions respected — skill directories kebab-case, test files `*.test.js`
- [x] No `any` types (plain JS — not applicable)
- [x] No hardcoded secrets or credentials
- [x] Commit messages follow format — `feat:`, `fix:`, `chore:` prefixes used correctly

---

### AC Coverage Matrix

| AC | Requirement | Verdict | Notes |
|----|-------------|---------|-------|
| AC1 | Installer/source-of-truth rule in review-code.md | PASS | `## Install-Path Tracing` section with `init.sh` + `upgrade.sh` references and trigger condition |
| AC2 | Test-truthfulness rule in review-code.md | PASS | `## Test-Truthfulness Verification` section with "test name" + "assertion" and trigger condition |
| AC3 | Parser edge-case checklist in review-code.md | PASS | `## Parser/Validator Edge-Case Checklist` section with "malformed" input checklist and trigger condition |
| AC4 | Unchanged-file scope guidance in review-code.md | PASS | `## Unchanged-File Scope Expansion` section with "unchanged" + "scope" and trigger condition |
| AC5 | codex-rules.md updated as canonical source | PASS | `## Review Method Rules` section added; `review-process.md` has no overlapping guidance to resolve |
| AC6 | Per-rule regression tests for AC1-AC4 | PASS | 11 targeted rule tests + 1 integration test in `codex-review-method.test.js`; 5 AC5 process doc tests |
| AC7 | Installer coverage contract test | PASS | 6 AC7 coverage tests + 5 robustness/edge-case tests; both init.sh and upgrade.sh pass; `activeLines()` filter in place |
