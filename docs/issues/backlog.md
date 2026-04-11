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
| 1 | [ISS-013](tickets/ISS-013.md) | P2 — Medium | Architecture | — | Revise skill size convention and adopt progressive disclosure |
| 2 | [ISS-022](tickets/ISS-022.md) | P1 — High | Feature | — | Harden Phase 3 test design with integration-level coverage requirements |
| 3 | [ISS-024](tickets/ISS-024.md) | P1 — High | Feature | — | Add reviewer independence and boundary-tracing rules to code-review skill |
| 4 | [ISS-014](tickets/ISS-014.md) | P2 — Medium | Feature | — | Make gate reviewers adversarial and require separate context for review phases |
| 5 | [ISS-001](tickets/ISS-001.md) | P1 — High | Feature | — | Add invariants-audit skill for cross-layer semantic review |
| 6 | [ISS-023](tickets/ISS-023.md) | P2 — Medium | Feature | — | Strengthen architecture decision skill with wiring diagrams, evidence rules, and observability naming |
| 7 | [ISS-006](tickets/ISS-006.md) | P2 — Medium | Feature | — | Add `review-history.md` to capture cross-review rework in feature artifacts |
| 8 | [ISS-025](tickets/ISS-025.md) | P2 — Medium | Feature | — | Add adversarial self-review checkpoint to Phase 5 verification |
| 9 | [ISS-015](tickets/ISS-015.md) | P2 — Medium | Feature | — | Add first-class post-implementation QA verification stage |
| 10 | [ISS-012](tickets/ISS-012.md) | P2 — Medium | Feature | — | Add stage-matched Codex reviews and iterative feedback resolution through the pipeline |
| 11 | [ISS-019](tickets/ISS-019.md) | P2 — Medium | Architecture | — | Add `allowed-tools` frontmatter to read-only skills |
| 12 | [ISS-017](tickets/ISS-017.md) | P2 — Medium | Feature | — | Add stop-conditions footer to high-stakes skills |
| 13 | [ISS-007](tickets/ISS-007.md) | P2 — Medium | Feature | — | Force upgrade and clean reinstall with backup support |
| 14 | [ISS-008](tickets/ISS-008.md) | P2 — Medium | Feature | — | Sync project CLAUDE.md with reference docs/CLAUDE.md on init/upgrade |
| 15 | [ISS-011](tickets/ISS-011.md) | P3 — Low | Feature | — | Add shell script wrappers for Codex reviewer workflows |
| 16 | [ISS-016](tickets/ISS-016.md) | P3 — Low | Architecture | — | Document intentional divergence from Anthropic slash command guidance |
| 17 | [ISS-018](tickets/ISS-018.md) | P3 — Low | Architecture | — | Standardize skill naming on gerund form |
| 18 | [ISS-020](tickets/ISS-020.md) | P3 — Low | Architecture | — | Prefix generated PRD filenames with the feature slug |
| 19 | [ISS-021](tickets/ISS-021.md) | P3 — Low | Feature | — | Add first-class command entry points for Codex reviewer prompts |

## Execution Waves

Tickets grouped by theme. Within a wave, tickets are ordered by dependency but can often be worked in parallel if resources allow.

- **Wave 1 — Skill convention (1):** Revise skill size convention before adding content to skills. Unblocks all skill content changes in Waves 2–4.
- **Wave 2 — Test & review layer hardening (2–7):** Closes the two biggest failure patterns (missing integration tests, reviewer rubber-stamping), then strengthens architecture and review artifacts. ISS-022 and ISS-024 are P1; the rest reinforce them.
- **Wave 3 — Verification & QA loop (8–10):** Developer adversarial self-review, post-implementation QA stage, and stage-matched Codex reviews. Defense-in-depth after Wave 2 hardens the primary gates.
- **Wave 4 — Skill polish (11–12):** `allowed-tools` frontmatter and stop-conditions footers. Small, scoped skill improvements.
- **Wave 5 — Install ergonomics (13–14):** Force upgrade + clean reinstall, then project CLAUDE.md sync. Independent of pipeline-correctness work above.
- **Wave 6 — Documentation polish (15–19):** Low-priority DX and documentation items. Defer until a real pain point forces them.

## Sequencing Notes

- **ISS-013 stays at Order 1** because the skill size convention must be revised before ISS-022, ISS-023, ISS-024, and ISS-025 add content to skills. Without this, new content would immediately violate the current ~100-line rule.
- **ISS-022 (P1) at Order 2** is the highest-value fix. The integration test gap is the #1 escaped defect pattern — 275 passing unit tests with zero production wiring.
- **ISS-024 (P1) at Order 3** is the second-highest value. Reviewer rubber-stamping is the #1 gate failure pattern — a reviewer APPROVED a branch that Codex immediately flagged with BLOCKING findings.
- **ISS-001 is P1 but sequenced at Order 5**, not 2. Adding an invariants-audit skill before reviewers are independent (ISS-024) and adversarial (ISS-014) is less effective, but it is not hard-blocked.
- **ISS-023 at Order 6** adds architecture rigor (wiring diagrams, evidence rules). Valuable but the gaps are currently caught by Codex review, so less urgent than the test/review fixes above.
- **ISS-025 at Order 8** is the developer-side counterpart to ISS-024. Less critical once ISS-024 hardens the reviewer, but provides defense-in-depth.
- **ISS-006 has no hard dependency but is sequenced inside Wave 2** because ISS-012 (stage-matched Codex reviews, Order 10) benefits substantially from having review-history already in place.
- **ISS-012 benefits from ISS-006 and ISS-014** because review-history and stronger reviewer independence make the Codex review loop much more credible, but neither is a true hard blocker.
- **ISS-019 has no hard dependency but is sequenced near ISS-017** because both touch the same skill files (`verification-gate`, `tdd`, `security-audit`). Doing them in adjacent sessions amortizes the cost of reading those files.
- **ISS-007 before ISS-008 is a risk-reducing preference**, not a hard blocker. Backups make CLAUDE.md sync safer, but the sync feature can be implemented independently.
