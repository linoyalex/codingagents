# Issue Backlog

> Open tickets sorted by execution order. Full details in `tickets/ISS-NNN.md`.
> See `skills/backlog-management/SKILL.md` for conventions.

## Legend

- **Order** — Execution sequence. Lower numbers should be addressed first. Order reflects dependencies between tickets, not just priority — an earlier-ordered ticket may be P2 while a later one is P1 because of sequencing. Waves group tickets that share a theme and can be worked in parallel internally.
- **ID** — Ticket identifier (`ISS-NNN`). Click to open the full ticket file.
- **Priority** — P1 (current sprint), P2 (next sprint), P3 (within 90 days). Priority is the intrinsic urgency; Order overrides when dependencies force a different sequence.
- **Type** — `Bug` (broken behavior), `Feature` (new capability), `Architecture` (structural or convention change), `Infrastructure` (tooling/CI).
- **Depends on** — Hard blockers only: tickets that must be merged before this one can *start*. Empty cell = no blockers, free to work on now. Soft dependencies ("would benefit from") are documented in Sequencing Notes below, not in this column. Ticket IDs only; if a dependency needs prose to explain, it belongs in Sequencing Notes.
- **Title** — Short descriptive title. See the ticket file for full acceptance criteria.

## Open Tickets

| Order | ID | Priority | Type | Depends on | Title |
|-------|----|----------|------|------------|-------|
| 1 | [ISS-009](tickets/ISS-009.md) | P1 — High | Bug | — | `/implement` can proceed after mangled command arguments by silently falling back to handoff feature |
| 2 | [ISS-013](tickets/ISS-013.md) | P2 — Medium | Architecture | — | Revise skill size convention and adopt progressive disclosure |
| 3 | [ISS-010](tickets/ISS-010.md) | P2 — Medium | Feature | — | Refresh all skills with current best practices and stronger robustness guards *(rework — in progress)* |
| 4 | [ISS-014](tickets/ISS-014.md) | P2 — Medium | Feature | — | Make gate reviewers adversarial and require separate context for review phases |
| 5 | [ISS-001](tickets/ISS-001.md) | P1 — High | Feature | — | Add invariants-audit skill for cross-layer semantic review |
| 6 | [ISS-006](tickets/ISS-006.md) | P2 — Medium | Feature | — | Add `review-history.md` to capture cross-review rework in feature artifacts |
| 7 | [ISS-015](tickets/ISS-015.md) | P2 — Medium | Feature | — | Add first-class post-implementation QA verification stage |
| 8 | [ISS-012](tickets/ISS-012.md) | P2 — Medium | Feature | — | Add stage-matched Codex reviews and iterative feedback resolution through the pipeline |
| 9 | [ISS-019](tickets/ISS-019.md) | P2 — Medium | Architecture | — | Add `allowed-tools` frontmatter to read-only skills |
| 10 | [ISS-017](tickets/ISS-017.md) | P2 — Medium | Feature | — | Add stop-conditions footer to high-stakes skills |
| 11 | [ISS-007](tickets/ISS-007.md) | P2 — Medium | Feature | — | Force upgrade and clean reinstall with backup support |
| 12 | [ISS-008](tickets/ISS-008.md) | P2 — Medium | Feature | — | Sync project CLAUDE.md with reference docs/CLAUDE.md on init/upgrade |
| 13 | [ISS-011](tickets/ISS-011.md) | P3 — Low | Feature | — | Add shell script wrappers for Codex reviewer workflows |
| 14 | [ISS-016](tickets/ISS-016.md) | P3 — Low | Architecture | — | Document intentional divergence from Anthropic slash command guidance |
| 15 | [ISS-018](tickets/ISS-018.md) | P3 — Low | Architecture | — | Standardize skill naming on gerund form |
| 16 | [ISS-020](tickets/ISS-020.md) | P3 — Low | Architecture | — | Prefix generated PRD filenames with the feature slug |
| 17 | [ISS-021](tickets/ISS-021.md) | P3 — Low | Feature | — | Add first-class command entry points for Codex reviewer prompts |

## Execution Waves

Tickets grouped by theme. Within a wave, tickets are ordered by dependency but can often be worked in parallel if resources allow.

- **Wave 1 — Stop the bleeding (1–3):** Safety bug fix, then skill convention revision, then ISS-010 rework. This is recommended sequencing, not a chain of hard blockers.
- **Wave 2 — Review layer hardening (4–6):** Adversarial reviewers → invariants-audit skill → review-history artifact. This cluster addresses the rubber-stamp failure pattern observed on ISS-010.
- **Wave 3 — Review loop closure (7–8):** Post-implementation QA stage and stage-matched Codex reviews. These benefit from Wave 2 foundations, but are not hard-blocked by them.
- **Wave 4 — Skill polish (9–10):** `allowed-tools` frontmatter and stop-conditions footers. Small, scoped skill improvements.
- **Wave 5 — Install ergonomics (11–12):** Force upgrade + clean reinstall, then project CLAUDE.md sync. Independent of pipeline-correctness work above.
- **Wave 6 — Documentation polish (13–17):** Low-priority DX and documentation items. Defer until a real pain point forces them.

## Sequencing Notes

- **ISS-001 is P1 but sequenced at Order 5**, not 2. Adding an invariants-audit skill before reviewers are adversarial (ISS-014) is less effective, but it is not hard-blocked. The ordering here is strategic, not mechanical.
- **ISS-013 is sequenced before the ISS-010 rework** so the rework happens against the revised budget unit (prose lines, not total lines). This is a recommended order, not a hard dependency.
- **ISS-006 has no hard dependency but is sequenced inside Wave 2** because ISS-012 (stage-matched Codex reviews, Order 8) benefits substantially from having review-history already in place. ISS-006 could technically start earlier, but landing it in Wave 2 keeps the review-loop cluster together.
- **ISS-012 benefits from ISS-006 and ISS-014** because review-history and stronger reviewer independence make the Codex review loop much more credible, but neither is a true hard blocker.
- **ISS-019 has no hard dependency but is sequenced near ISS-017** because both touch the same skill files (`verification-gate`, `tdd`, `security-audit`). Doing them in adjacent sessions amortizes the cost of reading those files.
- **ISS-007 before ISS-008 is a risk-reducing preference**, not a hard blocker. Backups make CLAUDE.md sync safer, but the sync feature can be implemented independently.
