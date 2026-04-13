## Architecture: Skill Size Convention & Progressive Disclosure
**Generated:** 2026-04-12T18:45:00Z
**ADR:** ADR-002 | Date: 2026-04-12

### Decision

Replace the current ~100-line skill budget (hard cap 120) with a two-tier convention:
(1) inline skills stay under ~150 lines of instructional prose (templates/tables excluded from count);
(2) when total lines exceed 250, the skill must split into a slim SKILL.md (≤120 prose) plus
reference files in the same `skills/<name>/` directory. High-stakes skills repeat stop conditions
in a footer section. Enforcement via contract tests run by `node --test`.

### Decision Confidence
High — the current cap is already violated by 5 of 9 skills; the new budget codifies what works.

### Revisit When
- More than 3 skills need progressive disclosure (indicates budget may still be too tight)
- Claude Code gains native skill-include or partial-load semantics (rendering the split unnecessary)

### Rollback / Fallback
Revert docs/CLAUDE.md budget line and delete reference files; skills remain functional as
single files. Contract tests are the only code change — deleting them fully reverts enforcement.

### File Layout

```
skills/<name>/
  SKILL.md              # Core rules, top rules, templates (≤120 prose lines when split)
  references/           # Only created when total > 250 lines
    <topic>.md          # Moved tables, per-phase detail, extended examples
```

SKILL.md links to references via relative paths: `See [Phase Checks](references/phase-checks.md)`.

### Progressive Disclosure Example (verification-gate pilot)

| File | Content | Prose lines |
|------|---------|-------------|
| `SKILL.md` | Top rules, standard verification, handoff validation, no-go criteria | ~80 |
| `references/phase-checks.md` | Per-phase verification commands (phases 1-7) | ~60 |

Total content preserved; nothing removed, only reorganized per AC4.

### Stop Conditions Footer Rule

Skills tagged as high-stakes (verification-gate, security-audit) must include a `## Stop Conditions`
footer repeating the non-negotiable constraints from the top of the file. Rationale: reviewers
may skim to the end; the footer prevents missing hard constraints during compaction or partial reads.

### Contract Test Strategy

Tests live in `tests/node/skill-size-convention.test.js` and validate:

1. **Prose line count** — parse each SKILL.md, exclude fenced code blocks, table rows, and
   frontmatter; assert ≤150 (inline) or ≤120 (progressive-disclosure).
2. **Total line count** — assert SKILL.md ≤250 total lines for inline skills.
3. **Reference link integrity** — for progressive-disclosure skills, assert every relative link
   in SKILL.md resolves to an existing file.
4. **Stop conditions footer** — for skills listed as high-stakes, assert `## Stop Conditions`
   heading exists in the last 20 lines.
5. **Source/installed sync** — existing byte-identity test extended to cover new reference files.

Tests use structural anchors (heading names, line counts), not phrase-binding, per project convention.

### Enforcement Gate

Contract tests run in the existing `node --test tests/node/` suite. No new pre-commit hook needed —
CI already runs `pnpm test` which includes node tests. A failing size check blocks merge.

### Module Boundaries

| Owner | Writes | Must not touch |
|-------|--------|----------------|
| This feature | `docs/CLAUDE.md` (budget line), `skills/verification-gate/`, `tests/node/`, `docs/memory/skill-migration-audit.md` | `src/`, other skills (audit-only) |

### Trust Boundaries
No user or AI input crosses a trust boundary — this is a convention + static analysis change only.

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Prose counter miscounts template lines | False positives block merges | Fenced-block and table-row exclusion logic; fixture-based test for the counter itself |
| Reference file not copied by init.sh | Installed skill missing detail | Add `references/` glob to init.sh copy step; sync test catches drift |

### Fitness Functions
1. `prose_lines(SKILL.md) ≤ 150` for inline; `≤ 120` for progressive-disclosure skills
2. All relative links in split skills resolve to existing files
3. Source/installed byte-identity holds for reference directories

### Rejected Alternatives
1. **Single higher cap (200 lines)** — rejected because it delays the split decision; skills grow until they hit the wall again.
2. **Automatic skill splitting at build time** — rejected because it adds tooling complexity with no clear gain; manual split is a one-time authoring cost.
3. **Separate `examples/` directory outside skills/** — rejected because it breaks co-location and makes skill portability harder.
