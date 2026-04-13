## Architecture: Skill Size Convention & Progressive Disclosure
**Generated:** 2026-04-13T04:30:00Z
**ADR:** ADR-002 | Date: 2026-04-12

### Decision

Replace the ~100-line skill budget with a two-tier convention: (1) inline skills ≤150 lines
instructional prose (templates/tables/examples excluded); split required when total exceeds 250.
(2) Progressive-disclosure skills: SKILL.md ≤120 prose + sibling reference files. High-stakes
skills repeat stop conditions in a footer. Root and docs/CLAUDE.md must state identical rules,
enforced by a drift-detection check. Enforcement via `node --test` contract tests.

### Decision Confidence
High — 5 of 9 skills already exceed 120 lines; the new budget codifies what works.

### Revisit When
- More than 3 skills need progressive disclosure, or Claude Code gains native skill-include

### Rollback / Fallback
Revert CLAUDE.md budget lines (both root and docs/). For converted skills, inline reference file
content back into SKILL.md before deleting the reference files. Delete contract tests to revert.

### File Layout

```
skills/<name>/
  SKILL.md              # Core job-to-be-done (≤120 prose when split)
  <reference>.md        # Sibling files for per-phase detail, tables, examples
```

Link format in SKILL.md: `[See reference: skills/<name>/<reference>.md]` per AC2.
Progressive disclosure documented in exactly one location: `docs/CLAUDE.md`. No fallback to
`skills/SKILL_AUTHORING.md` — eliminates a second source to drift-check and own.

### Pilot: verification-gate Conversion (AC4)

One reference file per pipeline phase — no grouping. This proves the pattern at full granularity.

| File | Content |
|------|---------|
| `SKILL.md` | Top rules, standard verification, handoff validation, no-go, stop conditions footer (~80 lines) |
| `phase-1-specify.md` through `phase-7-document.md` | One file per phase with that phase's verification commands |

Low-signal boilerplate may be trimmed — pilot must demonstrate signal-positive content (AC4d).

### Stop Conditions Footer (AC3)

Pipeline-gating skills (verification-gate, security-audit, tdd, code-review) must end with:
```
---
**STOP CONDITIONS (end of file):**
[repeated non-negotiable constraints]
```
Rationale: "Reviewer may skim; footer prevents missing hard constraints."
Contract test asserts this marker exists in the last 20 lines.

### Contract Tests (AC6, AC8)

Tests in `tests/node/skill-size-convention.test.js`:

1. **Prose counter** — exclude fenced blocks, table rows, frontmatter; assert ≤150 (inline) or ≤120 (split)
2. **Total line cap** — assert ≤250 for inline SKILL.md files
3. **Reference link integrity** — every `[See reference: ...]` link resolves to existing file
4. **Stop conditions footer** — pipeline-gating skills have `**STOP CONDITIONS (end of file):**` in last 20 lines
5. **CLAUDE.md drift check (AC9)** — extract skill-size convention from root and docs/CLAUDE.md; assert identical
6. **Source/installed sync** — byte-identity extended to cover sibling reference files

Tests discover skills dynamically via glob (no hardcoded count per AC5).
Use structural anchors, not phrase-binding, per project convention.

### Migration Audit (AC5)

Audit script globs `skills/*/SKILL.md`, counts lines, classifies as Compliant (≤250),
Needs Trimming (251-300), or Needs Splitting (>300). Output: `docs/memory/skill-migration-audit.md`
with per-skill line counts; includes AC9 drift check.

### Module Boundaries

| Owner | Writes | Must not touch |
|-------|--------|----------------|
| This feature | `docs/CLAUDE.md`, root `CLAUDE.md` (budget line + Memory table), `skills/verification-gate/`, `tests/node/`, `docs/memory/skill-migration-audit.md` | `src/`, other skills (audit-only) |

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Prose counter miscounts template lines | False positive merge blocks | Fenced-block/table exclusion; fixture-based test for the counter |
| Reference file not copied by init.sh | Installed skill missing detail | Add reference glob to init.sh; sync test catches drift |
| Root/docs CLAUDE.md drift undetected | Contradictory conventions | Drift check in contract tests (AC9) |

### Fitness Functions
1. `prose_lines(SKILL.md) ≤ 150` inline / `≤ 120` split; all reference links resolve
2. Root and docs/CLAUDE.md skill-size conventions are identical

### Rejected Alternatives
1. **Single higher cap (200 lines)** — delays the split; skills grow until they hit the wall again
2. **Build-time splitting** — tooling complexity; manual split is a one-time authoring cost
3. **Separate examples/ outside skills/** — breaks co-location and portability
