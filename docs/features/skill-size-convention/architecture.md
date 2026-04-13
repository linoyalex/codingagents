## Architecture: Skill Size Convention & Progressive Disclosure
**Generated:** 2026-04-12T22:30:00Z
**ADR:** ADR-002 | Date: 2026-04-12

### Decision

Replace the ~100-line skill budget with a two-tier convention: (1) inline skills ≤150 lines
instructional prose (templates/tables/examples excluded); split required when total exceeds 250.
(2) Progressive-disclosure skills: SKILL.md ≤120 prose + sibling reference files. High-stakes
skills repeat stop conditions in a footer. Root and docs/CLAUDE.md must state identical rules,
enforced by a drift-detection check. Enforcement via `node --test` contract tests.

### Decision Confidence
High — 5 of 9 skills already exceed 120 lines; the new budget codifies what works in practice.

### Revisit When
- More than 3 skills need progressive disclosure (budget may still be too tight)
- Claude Code gains native skill-include or partial-load semantics

### Rollback / Fallback
Revert CLAUDE.md budget lines (both root and docs/) and delete reference files; skills remain
functional as single files. Contract tests are the only code — deleting them fully reverts.

### File Layout

```
skills/<name>/
  SKILL.md              # Core job-to-be-done (≤120 prose when split)
  <reference>.md        # Sibling files for per-phase detail, tables, examples
```

Link format in SKILL.md: `[See reference: skills/<name>/<reference>.md]` per AC2.
Progressive disclosure documented in exactly one location: `docs/CLAUDE.md` (preferred;
falls back to `skills/SKILL_AUTHORING.md` only if docs/CLAUDE.md would exceed ~250 lines).

### Pilot: verification-gate Conversion (AC4)

| File | Content | Prose lines |
|------|---------|-------------|
| `SKILL.md` | Top rules, standard verification, handoff validation, no-go, stop conditions footer | ~80 |
| `phase-checks.md` | Per-phase verification commands (phases 1-7) | ~50 |

AC4 requires signal-positive content — low-signal boilerplate may be trimmed, not just reorganized.

### Stop Conditions Footer (AC3)

High-stakes skills (verification-gate, security-audit) must end with:
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
4. **Stop conditions footer** — high-stakes skills have `**STOP CONDITIONS (end of file):**` in last 20 lines
5. **CLAUDE.md drift check (AC9)** — extract skill-size convention from root and docs/CLAUDE.md; assert identical
6. **Source/installed sync** — byte-identity extended to cover sibling reference files

Tests discover skills dynamically via glob (no hardcoded count per AC5).
Use structural anchors, not phrase-binding, per project convention.

### Migration Audit (AC5)

Audit script globs `skills/*/SKILL.md`, counts lines, and classifies:
- **Compliant:** ≤250 total — no action
- **Needs Trimming:** 251-300 — trim or split
- **Needs Splitting:** >300 — must split

Output: `docs/memory/skill-migration-audit.md` with per-skill line counts; includes AC9 drift check.

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
1. **Single higher cap (200 lines)** — delays the split decision; skills grow until they hit the wall again
2. **Automatic splitting at build time** — tooling complexity; manual split is a one-time authoring cost
3. **Separate examples/ outside skills/** — breaks co-location and skill portability
