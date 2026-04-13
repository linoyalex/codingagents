## Feature: Skill Size Convention & Progressive Disclosure

**Generated:** 2026-04-12T22:15:00Z

**Phase:** Specify | **Date:** 2026-04-12  
**Ticket:** ISS-013

---

## User Story

As a **skill author**, I want **a clear, enforced skill size budget with a progressive disclosure pattern**, so that **skills remain scannable and maintainable without sacrificing necessary detail**.

---

## Problem Statement

1. The current ~100 line skill budget is too strict and violated in practice because it conflates prose with templates/examples
2. No progressive disclosure pattern exists — everything lives inline in a single file
3. Stop conditions only appear at file top — models attend best to start AND end
4. Root `CLAUDE.md` and `docs/CLAUDE.md` have drifted on skill size convention (~100 vs ~120 lines) with no enforcement

---

## Acceptance Criteria

- [ ] **AC1 — Size budget revised:** Given the docs/CLAUDE.md code conventions section, When I read the new skill size constraint, Then it states exactly: "~150 lines instructional prose; templates/tables/examples excluded from line count; split at 250 total lines using progressive disclosure pattern"

- [ ] **AC2 — Progressive disclosure pattern documented:** Given a skill author, When they search for "progressive disclosure" in `docs/CLAUDE.md` (preferred) or `skills/SKILL_AUTHORING.md` (if docs/CLAUDE.md would exceed ~250 lines), Then they find: (a) SKILL.md stays ≤120 lines covering core job-to-be-done only, (b) `skills/<name>/<reference>.md` files hold per-phase or per-context detail with templates/examples, (c) links between files using format `[See reference: skills/<name>/<reference>.md]`, (d) worked example showing how verification-gate was split. The documentation must live in exactly one of those two locations, not both.

- [ ] **AC3 — Stop conditions footer rule documented:** Given high-stakes skill documentation (e.g., verification-gate, security-audit), When an author reviews the pattern guidance, Then the docs require: stop conditions at both file start AND end, with marker `---` and heading `**STOP CONDITIONS (end of file):**`, explaining "Reviewer may skim; footer prevents missing hard constraints"

- [ ] **AC4 — Pilot skill converted: verification-gate:** Given skills/verification-gate/ at current size, When conversion is complete, Then: (a) skills/verification-gate/SKILL.md is ≤120 lines of instructional prose, (b) per-phase detail moved to `skills/verification-gate/<reference>.md` files, (c) links from SKILL.md to reference files present and verified correct, (d) low-signal boilerplate may be trimmed — the pilot must demonstrate signal-positive content, not just reorganize verbatim (per ISS-013's "must not give ISS-010 a free pass" constraint), (e) contract tests pass for converted skill

- [ ] **AC5 — Audit completed:** Given all existing skills in `skills/` (discovered dynamically, not hardcoded), When audit script runs, Then audit report lists: (a) Compliant skills (≤250 total lines), (b) Needs Trimming (251–300 lines), (c) Needs Splitting (>300 lines), with line counts per skill and total count; report stored at docs/memory/skill-migration-audit.md

- [ ] **AC6 — Contract tests pass for both patterns:** Given test suite in tests/test-command-contracts.sh or tests/node/, When running all skill contract tests, Then: (a) tests pass for inline skills ≤250 lines without modification, (b) tests pass for progressive-disclosure skills (SKILL.md ≤120 + reference files) without modification, (c) no test failures across both patterns

- [ ] **AC7 — End-to-end phase command works:** Given converted verification-gate skill in progressive-disclosure format, When running full phase command in fresh session (e.g., `claude -p "..." --phase 3`), Then: (a) skill loads without parse errors, (b) command outputs expected results, (c) no errors in session logs

- [ ] **AC8 — Size budget enforced at pre-merge:** Given pre-merge hook or test suite, When running enforcement check on skill files, Then: (a) inline skills ≤250 lines pass silently, (b) progressive-disclosure skills (SKILL.md ≤120 + reference files) pass silently, (c) violations block commit with error message naming skill and line count, (d) new skills added without split mechanism fail with clear error

- [ ] **AC9 — Root and docs/CLAUDE.md conventions synced:** Given root CLAUDE.md and docs/CLAUDE.md, When searching for "skill" size convention, Then: (a) both files state identical rules (same line budgets, same pattern requirements), (b) pre-merge check compares shared conventions and fails if they differ, (c) audit report includes drift check result, (d) Memory table in root CLAUDE.md updated from ~100 to ~150 lines matching new convention

---

## Developer Experience: Screen States

This is a framework convention change, not a UI feature. The table below captures developer-experience states during skill authoring and validation workflows.

| Workflow | Empty / N/A | Normal | Error | Success |
|----------|-------------|--------|-------|---------|
| **Skill Authoring** | N/A — author always has file open | SKILL.md open; inline hint shows: "Budget: ≤150 lines prose; templates/examples excluded; split at 250 total" | Pre-merge hook fails: "Skill exceeds 250-line threshold. Consider split: SKILL.md (≤120) + skills/name/reference.md" | Author trims or splits; commit passes; hook exits cleanly |
| **Contract Test Run** | N/A | `pnpm test:contracts` passes for inline skills ≤250 and progressive-disclosure pattern | Test output: "verification-gate is 287 lines. Trim or split using AC2 pattern." | All skills pass; both patterns validated; AC6 ✓ |
| **Pre-Merge Enforcement** | N/A | Audit runs silently; all skills compliant | Hook blocks: "Skill violations: [list]. See docs/features/skill-size-convention/prd.md AC8." | All skills ≤250 (inline) or ≤120+ref (progressive); AC8 ✓ |
| **Sync Check (Root/Docs)** | N/A | Shared conventions match; diff empty | Check fails: "Mismatch: root CLAUDE.md says ~100, docs/CLAUDE.md says ~150. Update one or both." | Both files identical; AC9 ✓ |

---

## Out of Scope

- Mass conversion of all existing skills to progressive disclosure (only verification-gate piloted; others audited but not converted)
- Renaming any skill (addressed in ISS-018)
- Adding allowed-tools frontmatter to skills (addressed in ISS-019)
- Re-running ISS-010 implementation audit against new budget (ISS-010 is closed; new audit is part of AC5)

---

## Dependencies

- **No external blockers**
- **Unblocks:** ISS-022, ISS-024, ISS-025, ISS-033 (all add new content to skills and need updated budget)

---

## RICE Score

| Metric | Value |
|--------|-------|
| **Reach** | 100 — all skill authors and pipeline agents |
| **Impact** | 8 — clarifies maintainability ceiling; enables feature expansion without bloat |
| **Confidence** | 90% — audit deterministic; tests clear; enforcement testable |
| **Effort** | 3 weeks — ~4 days audit, ~3 days pilot conversion, ~3 days test/enforcement setup |
| **RICE Score** | (100 × 8 × 0.9) / 3 = **240** |

---

## Definition of Done

- [ ] All 9 ACs verified in staging (contract tests, audit, pilot skill, sync check)
- [ ] QA signed off independently on test coverage and enforcement
- [ ] No P1 or P2 bugs open against this feature
- [ ] Pre-merge check or test suite enforces new budget
- [ ] Root and docs/CLAUDE.md conventions verified identical
- [ ] Migration audit report committed to docs/memory/skill-migration-audit.md
- [ ] verification-gate pilot converted; tests pass
- [ ] Release notes capture: new budget, progressive disclosure pattern, pilot result
