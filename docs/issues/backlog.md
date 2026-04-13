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
| 1 | [ISS-027](tickets/ISS-027.md) | P2 — Medium | Feature | — | Harden Codex code review method for install-path, sync-drift, and test-truthfulness checks |
| 2 | [ISS-013](tickets/ISS-013.md) | P2 — Medium | Architecture | — | Revise skill size convention and adopt progressive disclosure |
| 3 | [ISS-022](tickets/ISS-022.md) | P1 — High | Feature | ISS-013 | Harden Phase 3 test design with integration-level coverage requirements |
| 4 | [ISS-024](tickets/ISS-024.md) | P1 — High | Feature | ISS-013 | Add reviewer independence and boundary-tracing rules to code-review skill |
| 5 | [ISS-033](tickets/ISS-033.md) | P2 — Medium | Feature | ISS-013 | Require reviewers to verify against the source specification or ticket |
| 6 | [ISS-035](tickets/ISS-035.md) | P2 — Medium | Feature | — | Capture the backlog ticket ID in generated PRDs |
| 7 | [ISS-014](tickets/ISS-014.md) | P2 — Medium | Feature | ISS-013 | Make gate reviewers adversarial and require separate context for review phases |
| 8 | [ISS-001](tickets/ISS-001.md) | P1 — High | Feature | ISS-024, ISS-014 | Add invariants-audit skill for cross-layer semantic review |
| 9 | [ISS-028](tickets/ISS-028.md) | P2 — Medium | Feature | — | Add ticket-aware feature selection and backlog state commands |
| 10 | [ISS-029](tickets/ISS-029.md) | P2 — Medium | Feature | — | Add clarification checkpoints to `/specify` and review checkpoints to `/architect` |
| 11 | [ISS-032](tickets/ISS-032.md) | P2 — Medium | Feature | — | Automatically run /status on fresh context to orient the agent |
| 12 | [ISS-030](tickets/ISS-030.md) | P2 — Medium | Architecture | — | Introduce semantic versioning and tie backlog planning to major/minor/patch releases |
| 13 | [ISS-023](tickets/ISS-023.md) | P2 — Medium | Feature | — | Strengthen architecture decision skill with wiring diagrams, evidence rules, and observability naming |
| 14 | [ISS-006](tickets/ISS-006.md) | P2 — Medium | Feature | — | Add `review-history.md` to capture cross-review rework in feature artifacts |
| 15 | [ISS-025](tickets/ISS-025.md) | P2 — Medium | Feature | ISS-013 | Add adversarial self-review checkpoint to Phase 5 verification |
| 16 | [ISS-015](tickets/ISS-015.md) | P2 — Medium | Feature | — | Add first-class post-implementation QA verification stage |
| 17 | [ISS-012](tickets/ISS-012.md) | P2 — Medium | Feature | — | Add stage-matched Codex reviews and iterative feedback resolution through the pipeline |
| 18 | [ISS-019](tickets/ISS-019.md) | P2 — Medium | Architecture | — | Add `allowed-tools` frontmatter to read-only skills |
| 19 | [ISS-017](tickets/ISS-017.md) | P2 — Medium | Feature | — | Add stop-conditions footer to high-stakes skills |
| 20 | [ISS-007](tickets/ISS-007.md) | P2 — Medium | Feature | — | Force upgrade and clean reinstall with backup support |
| 21 | [ISS-008](tickets/ISS-008.md) | P2 — Medium | Feature | — | Sync project CLAUDE.md with reference docs/CLAUDE.md on init/upgrade |
| 22 | [ISS-011](tickets/ISS-011.md) | P3 — Low | Feature | — | Add shell script wrappers for Codex reviewer workflows |
| 23 | [ISS-016](tickets/ISS-016.md) | P3 — Low | Architecture | — | Document intentional divergence from Anthropic slash command guidance |
| 24 | [ISS-018](tickets/ISS-018.md) | P3 — Low | Architecture | — | Standardize skill naming on gerund form |
| 25 | [ISS-020](tickets/ISS-020.md) | P3 — Low | Architecture | — | Prefix generated PRD filenames with the feature slug |
| 26 | [ISS-021](tickets/ISS-021.md) | P3 — Low | Feature | — | Add first-class command entry points for Codex reviewer prompts |
| 27 | [ISS-031](tickets/ISS-031.md) | P2 — Medium | Feature | — | Extend `/document` to update README and other project documentation artifacts |
| 28 | [ISS-034](tickets/ISS-034.md) | P2 — Medium | Feature | — | Make backlog management skill configurable for different backlog systems |

---

## Reliability Milestone

> **Goal:** Reach a state where agents can be trusted to produce correct output —
> tests catch real defects, reviewers catch what tests miss, and cross-layer
> contradictions don’t escape the pipeline.
>
> **Completion criteria:** All tickets below are merged to main and validated
> by at least one real feature cycle using the improved pipeline.

### Batch execution plan

Work these in order. Each batch is a branch (or set of parallel branches).
A batch must be merged to main before the next batch starts.

```
Batch 1: ISS-013 (solo)                          branch: feature/ISS-013-skill-size-convention
   Unblocks all skill content changes. Must land first.

Batch 2: ISS-022 + ISS-024 + ISS-014 + ISS-033  (parallel branches, no file overlap between groups)
   ├─ Branch A: feature/ISS-022-integration-tests
   │    ISS-022 — integration test coverage in Phase 3
   │    Touches: skills/tdd/SKILL.md, commands/test-design.md, PIPELINE_GUIDE.md
   │
   └─ Branch B: feature/ISS-024-014-033-review-hardening
        ISS-024 — reviewer independence + boundary tracing
        ISS-014 — adversarial reviewers + separate context
        ISS-033 — verify against source spec/ticket
        Touches: skills/code-review/SKILL.md, commands/review.md, reviewer roles
        (Grouped: all three modify the same skill and command)

Batch 3: ISS-001 (solo)                          branch: feature/ISS-001-invariants-audit
   Depends on: ISS-024 + ISS-014 (review layer must be hardened first)
   Creates: new skills/invariants-audit/SKILL.md
   Updates: reviewer roles/commands as consumers
```

### File overlap matrix (why these groupings)

| Ticket | `skills/tdd/` | `skills/code-review/` | `commands/review.md` | `commands/test-design.md` | New skill |
|--------|:---:|:---:|:---:|:---:|:---:|
| ISS-022 | ✓ | | | ✓ | |
| ISS-024 | | ✓ | ✓ | | |
| ISS-014 | | ✓ | ✓ | | |
| ISS-033 | | ✓ | ✓ | | |
| ISS-001 | | | | | ✓ |

No overlap between Branch A and Branch B → safe to work in parallel.
ISS-001 consumes the review skill that Branch B modifies → must wait.

---

## Execution Waves

Tickets grouped by theme. Within a wave, tickets are ordered by dependency but can often be worked in parallel if resources allow.

- **Wave 1 — Codex review method hardening (1):** Strengthen Codex’s code review prompt/process so installer paths, sync drift, and misleading tests are caught earlier and more consistently.
- **Wave 2 — Skill convention (2):** Revise skill size convention before adding content to skills. Unblocks all skill content changes in Waves 3–5. **Reliability milestone prerequisite.**
- **Wave 3 — Test & review layer hardening (3–8):** Closes the biggest failure patterns in test design and review quality, then hardens reviewer methodology, source-intent checking, PRD/ticket traceability, adversarial review, and invariants. **Core of the reliability milestone.**
- **Wave 4 — Workflow ergonomics (9–11):** Improve operator ergonomics with ticket-aware feature selection, explicit clarification/review checkpoints in the early phases, and automatic status on fresh context.
- **Wave 5 — Release and planning structure (12):** Introduce semver and connect backlog planning to major/minor/patch release intent.
- **Wave 6 — Architecture, history, and QA loop (13–17):** Strengthen architecture docs, review history, self-review, post-implementation QA, and stage-matched Codex reviews.
- **Wave 7 — Skill polish (18–19):** `allowed-tools` frontmatter and stop-conditions footers. Small, scoped skill improvements.
- **Wave 8 — Install ergonomics (20–21):** Force upgrade + clean reinstall, then project CLAUDE.md sync. Independent of pipeline-correctness work above.
- **Wave 9 — Documentation polish (22–28):** Low-priority DX and documentation items. Defer until a real pain point forces them. ISS-031 extends `/document` to keep README and other user-facing docs current automatically. ISS-034 makes the backlog skill configurable for GitHub Issues, Linear, or custom backlog systems.

## Sequencing Notes

- **ISS-027 is at Order 1** because improving Codex’s review mechanics pays off immediately across future feature reviews, especially for install-path checks, sync drift, and misleading test coverage.
- **ISS-013 at Order 2 is the reliability milestone prerequisite.** The skill size convention must be revised before ISS-022, ISS-024, ISS-025, and ISS-033 add content to skills. Hard blocker for Batch 2.
- **ISS-022 (P1) at Order 3** is the highest-value reliability fix. The integration test gap is the #1 escaped defect pattern. Depends on ISS-013. Runs in parallel with Branch B (ISS-024+014+033) — no file overlap.
- **ISS-024 (P1) at Order 4** is the second-highest value. Reviewer rubber-stamping is the #1 gate failure pattern. Grouped with ISS-014 and ISS-033 because all three modify `skills/code-review/SKILL.md` and `commands/review.md`.
- **ISS-033 at Order 5** is grouped with ISS-024 and ISS-014 (same skill, same command). Reviewer correctness depends on checking against the original spec, not just the latest artifact.
- **ISS-014 at Order 7** is grouped with ISS-024 and ISS-033. Adversarial reviewers + separate context completes the review layer hardening.
- **ISS-001 at Order 8 has hard dependencies on ISS-024 + ISS-014.** The invariants-audit skill builds on the hardened review layer. Must wait for Branch B to merge.
- **ISS-028 at Order 9** improves operator ergonomics after the reliability milestone clears.
- **ISS-029 at Order 10** strengthens the human feedback loop in early phases.
- **ISS-030 at Order 12** introduces semver and release planning — less urgent than reliability and workflow fixes.
- **ISS-023 at Order 13** adds architecture rigor. Valuable but currently caught by Codex review.
- **ISS-025 at Order 15** is the developer-side counterpart to ISS-024. Defense-in-depth after the reviewer is hardened. Depends on ISS-013.
- **ISS-006 is inside Wave 6** because ISS-012 (Order 17) benefits from having review-history in place.
- **ISS-012 benefits from ISS-006 and ISS-014** — review-history and reviewer independence make the Codex loop more credible.
- **ISS-019 is sequenced near ISS-017** — both touch the same skill files. Adjacent sessions amortize read cost.
- **ISS-007 before ISS-008** is a risk-reducing preference. Backups make CLAUDE.md sync safer.
