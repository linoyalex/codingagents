## Code Review: feature/ISS-013-skill-size-convention
**Generated:** 2026-04-13T08:30:00Z
**Date:** 2026-04-13 | **Reviewer:** code-reviewer agent
**Diff:** `git diff main...HEAD`

---

### Summary

The implementation cleanly delivers all 9 ACs: CLAUDE.md conventions are synced across both files, the verification-gate pilot conversion is complete, stop-conditions footers are present on all four pipeline-gating skills, contract and E2E test suites pass (37/37), and enforcement is tested with both positive and negative fixtures. No secrets, no circular dependencies, no skipped tests.

### Verdict: APPROVE

---

### Findings

**issue (MEDIUM): `globSync` is imported but never used in the contract test**

File: `tests/contracts/skill-size-convention.test.js:19`

```js
const { globSync } = require('node:fs');
```

`globSync` was imported but the actual skill discovery uses `fs.readdirSync`. This is a dead import — a reader will wonder whether the intent was to use `globSync` instead of `readdirSync`, and whether the two would behave differently on a project with nested skill directories. Remove the import to eliminate ambiguity. If glob-based discovery is ever added, bring it back then.

---

**issue (MEDIUM): `countProseLines` counts horizontal rules (`---`) as prose**

File: `tests/contracts/skill-size-convention.test.js:113–152`

After the YAML frontmatter closes, any subsequent `---` separator line (e.g., the one separating the STOP CONDITIONS footer) falls through all filter conditions and is counted as a prose line. The current SKILL.md files all sit far enough under their limits that this does not cause a false violation today, but the counter is subtly wrong and could cause a future skill to appear over-budget when it isn't. The fix is to add `if (trimmed === '---') continue;` after the frontmatter-close guard.

---

**issue (LOW): Architecture doc and SKILL.md use inconsistent link-format prefixes**

File: `docs/features/skill-size-convention/architecture.md:430`

The architecture doc states: `Link format in SKILL.md: [See reference: skills/<name>/<reference>.md]`.
The actual SKILL.md files use: `[See reference: .claude/skills/<name>/<reference>.md]`.
The convention in CLAUDE.md also documents the `.claude/skills/` prefix, which is correct because agents load installed copies, not source copies.

The architecture doc is the stale artifact, and the implementation + convention are consistent with each other. This won't break anything, but a future skill author reading the architecture doc to understand the pattern will get the wrong prefix. Update the architecture doc to match the reality.

---

**issue (LOW): `handoff.json` in the diff (the Phase 5 handoff) was overwritten by the final commit, but the in-diff version shows `phase: 4` and `produced_by: "security-reviewer"`**

File: `.claude/handoff.json` (diff lines 9–10)

The diff adds a handoff.json stamped `phase: 4 / produced_by: security-reviewer`. The current on-disk file correctly reads `phase: 5 / produced_by: developer`. The diff is simply a snapshot of the file at different commit points, but it means git history contains a handoff artifact with a wrong phase number. This is a cosmetic record-keeping issue — the checkpoint hook validates the file at session start and the current state is correct — but reviewers reading git log may be confused. Future phases should make sure the final commit's handoff.json is Phase N (the phase that just completed), not a stale intermediate.

---

**issue (LOW): AC7 smoke test's error-detection is a warning, not a failure**

File: `tests/manual/ac7-smoke-test.sh:90–93`

```bash
if echo "$OUTPUT" | grep -qi "error\|fail\|not found\|cannot read"; then
  echo "WARNING: Output may contain error signals — review manually"
```

The script exits 0 even when the CLI output contains "error" or "fail". For a smoke test intended to gate the feature, a WARNING that doesn't propagate as a non-zero exit code gives a false pass in any CI pipeline that wraps it. This is a manual test, so the impact is low, but it would take one line (`exit 1`) inside the warning branch to make it reliably signal failure.

---

**suggestion (NIT): The test comment claims prose count = 4 but does not explain the heading**

File: `tests/contracts/skill-size-convention.test.js:1680–1683`

```js
// Should count: heading + 3 prose lines = 4
assert.equal(count, 4, ...);
```

The comment is correct but a reader unfamiliar with the counter needs to know headings (`# Test Skill`) count as prose. A brief inline note — `// Heading lines are prose (not excluded); only frontmatter, code blocks, tables, empties are excluded` — would remove the need to trace back through `countProseLines`. Low priority, but the next person to touch the counter will thank you.

---

**praise (NIT): Test suite design is exemplary**

Files: `tests/contracts/skill-size-convention.test.js`, `tests/e2e/skill-size-convention.spec.js`

The negative fixture tests for AC8 (over-budget inline and split skills created in tmpdir) correctly exercise the same `enforceSkillBudget` function that the positive tree scan uses, eliminating the risk of the enforcement logic being bypassed by the real-skill happy-path test. The signal-positive proxy tests for AC4d (phase-keyword assertions per reference file, SKILL.md smaller than sum of refs) are the right tool for "did the split add value?" — automated without requiring semantic understanding. This is the kind of test design that makes a reviewer confident the feature will hold its shape under future edits.

---

### Test Assessment

- [x] Contract tests present and passing (24/24)
- [x] E2E tests present and passing (9/9)
- [x] Existing verification-gate node tests still passing (4/4)
- [x] Negative fixture tests verify enforcement catches violations
- [x] No skipped tests (`.skip`, `xtest`, `xit`)
- [x] Tests use structural anchors, not phrase-binding

### Convention Compliance

- [x] Artifact timestamps present on all pipeline-generated docs (`architecture.md`, `security-audit.md`, `prd.md`)
- [x] `skills/verification-gate/SKILL.md` and `.claude/skills/verification-gate/SKILL.md` are byte-identical (verified by E2E edge-case test)
- [x] Stop-conditions footer present in all four pipeline-gating skills
- [x] No secrets or credentials in any file
- [x] No circular dependencies introduced
- [x] Root `CLAUDE.md` and `docs/CLAUDE.md` skill-size conventions are identical (verified by AC9 test)
- [x] Shell scripts use `set -euo pipefail` (`ac7-smoke-test.sh`)
- [ ] `countProseLines` silently miscounts `---` separators as prose (see MEDIUM finding above)
- [ ] Architecture doc specifies wrong link prefix `skills/<name>/` vs actual `.claude/skills/<name>/` (see LOW finding above)
