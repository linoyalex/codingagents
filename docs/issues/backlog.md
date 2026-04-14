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
| 6 | [ISS-035](tickets/ISS-035.md) | P2 — Medium | Feature | — | Capture the backlog ticket ID in generated PRDs |
| 8 | [ISS-036](tickets/ISS-036.md) | P1 — High | Feature | ISS-013 | Add command↔skill wiring verification to prevent artifact-slot drift |
| 8 | [ISS-039](tickets/ISS-039.md) | P1 — High | Feature | — | Add downstream-impact, drift-check, reproduction steps, and symmetric gate enforcement to code-review skill |
| 8 | [ISS-042](tickets/ISS-042.md) | P1 — High | Feature | — | /implement command must instruct developer to verify handoff known_risks |
| 8 | [ISS-043](tickets/ISS-043.md) | P2 — Medium | Feature | — | /test-design must instruct QA to test symmetric requirements across all enumerated components |
| 8 | [ISS-045](tickets/ISS-045.md) | P2 — Medium | Feature | — | /test-design must instruct QA to adversarially test contract robustness, not just satisfaction |
| 9 | ~~[ISS-029](tickets/ISS-029.md)~~ | P2 — Medium | Feature | — | ~~Add clarification checkpoints + ticket fidelity check to `/specify` and `/architect`~~ → closed |
| 10 | [ISS-044](tickets/ISS-044.md) | P2 — Medium | Feature | ISS-029 | Prevent scope expansion during post-review artifact rework |
| 10 | [ISS-001](tickets/ISS-001.md) | P1 — High | Feature | ISS-036 | Add invariants-audit skill for cross-layer semantic review |
| 11 | [ISS-028](tickets/ISS-028.md) | P2 — Medium | Feature | — | Add ticket-aware feature selection and backlog state commands |
| 12 | [ISS-032](tickets/ISS-032.md) | P2 — Medium | Feature | — | Automatically run /status on fresh context to orient the agent |
| 13 | [ISS-030](tickets/ISS-030.md) | P2 — Medium | Architecture | — | Introduce semantic versioning and tie backlog planning to major/minor/patch releases |
| 14 | [ISS-023](tickets/ISS-023.md) | P2 — Medium | Feature | — | Strengthen architecture decision skill with wiring diagrams, evidence rules, and observability naming |
| 15 | [ISS-006](tickets/ISS-006.md) | P2 — Medium | Feature | — | Add `review-history.md` to capture cross-review rework in feature artifacts |
| 16 | [ISS-037](tickets/ISS-037.md) | P2 — Medium | Feature | — | Make review artifacts additive and expose the latest review state clearly |
| 17 | [ISS-025](tickets/ISS-025.md) | P2 — Medium | Feature | ISS-013 | Add adversarial self-review checkpoint to Phase 5 verification |
| 18 | [ISS-015](tickets/ISS-015.md) | P2 — Medium | Feature | — | Add first-class post-implementation QA verification stage |
| 19 | [ISS-012](tickets/ISS-012.md) | P2 — Medium | Feature | — | Add stage-matched Codex reviews and iterative feedback resolution through the pipeline |
| 20 | [ISS-019](tickets/ISS-019.md) | P2 — Medium | Architecture | — | Add `allowed-tools` frontmatter to read-only skills |
| 21 | [ISS-017](tickets/ISS-017.md) | P2 — Medium | Feature | — | Add stop-conditions footer to high-stakes skills |
| 8 | [ISS-008](tickets/ISS-008.md) | P1 — High | Feature | — | Sync project CLAUDE.md with reference docs/CLAUDE.md on init/upgrade |
| 22 | [ISS-007](tickets/ISS-007.md) | P2 — Medium | Feature | — | Force upgrade and clean reinstall with backup support |
| 24 | [ISS-011](tickets/ISS-011.md) | P3 — Low | Feature | — | Add shell script wrappers for Codex reviewer workflows |
| 25 | [ISS-016](tickets/ISS-016.md) | P3 — Low | Architecture | — | Document intentional divergence from Anthropic slash command guidance |
| 26 | [ISS-018](tickets/ISS-018.md) | P3 — Low | Architecture | — | Standardize skill naming on gerund form |
| 27 | [ISS-020](tickets/ISS-020.md) | P3 — Low | Architecture | — | Prefix generated PRD filenames with the feature slug |
| 28 | [ISS-021](tickets/ISS-021.md) | P3 — Low | Feature | — | Add first-class command entry points for Codex reviewer prompts |
| 29 | [ISS-031](tickets/ISS-031.md) | P2 — Medium | Feature | — | Extend `/document` to update README and other project documentation artifacts |
| 30 | [ISS-034](tickets/ISS-034.md) | P2 — Medium | Feature | — | Make backlog management skill configurable for different backlog systems |
| 31 | [ISS-038](tickets/ISS-038.md) | P2 — Medium | Architecture | — | Support Codex, Gemini, and other LLMs as first-class coding agents |

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
Batch 1: ISS-013 (solo)                          ✅ MERGED
   Unblocks all skill content changes.

Batch 2: ISS-022 + ISS-024 + ISS-014 + ISS-033  (parallel branches, no file overlap)
   ├─ Branch A: feature/ISS-022-integration-tests   ← IN PROGRESS (Phase 6)
   │    ISS-022 — integration test coverage in Phase 3
   │    Touches: skills/tdd/SKILL.md, commands/test-design.md, PIPELINE_GUIDE.md
   │
   └─ Branch B: feature/ISS-024-014-033-review-hardening  ✅ MERGED
        ISS-024 — reviewer independence + boundary tracing
        ISS-014 — adversarial reviewers + separate context
        ISS-033 — verify against source spec/ticket
        ISS-041 — fix existing checkpoint fixtures (bug introduced by this branch)
        ISS-040 — detectPhase() .js/.mjs recognition (fixed here)
        Touches: skills/code-review/SKILL.md, commands/review.md, reviewer roles,
                 hooks/checkpoint.js, tests/fixtures/handoff/, tests/node/checkpoint.test.js

Batch 2.5: ISS-036 + ISS-029 + ISS-027 + ISS-039 + ISS-040  (parallel branches, no file overlap)
   ├─ Branch A: feature/ISS-036-wiring-verification
   │    ISS-036 — command↔skill wiring contract tests
   │    Touches: tests/node/, commands/implement.md, commands/test-design.md
   │    WHY HERE: Prevents the #1 BLOCKING defect class (skill adds artifact,
   │    command doesn't operationalize it). Must land before ISS-001 so the
   │    invariants-audit skill is itself wiring-tested.
   │
   ├─ Branch B: feature/ISS-029-specify-fidelity
   │    ISS-029 — clarification checkpoints + ticket fidelity check (new AC0)
   │    Touches: commands/specify.md, commands/architect.md
   │    WHY HERE: Prevents the #2 defect class (PRD drifts from ticket).
   │    Earlier = fewer rework cycles in all subsequent features.
   │
   ├─ Branch C: feature/ISS-027-codex-review-hardening
   │    ISS-027 — install-path checks + installer contract test (new AC7)
   │    Touches: codex/reviewers/review-code.md, tests/node/
   │    WHY HERE: Prevents the #3 BLOCKING defect class (init.sh misses files).
   │    No file overlap with A, B, D, or E.
   │
   ├─ Branch D: feature/ISS-039-code-review-skill-hardening
   │    ISS-039 — downstream-impact, drift-check, reproduction steps for Claude review
   │    Touches: skills/code-review/SKILL.md, commands/review.md, tests/node/
   │    Depends on: Batch 2 Branch B (same files). No overlap with A/B/C/E.
   │    WHY HERE: Claude-side counterpart to ISS-027 (Codex). RCA showed Claude's
   │    review skill missed 4 findings Codex caught — same defect classes.
   │
   ├─ Branch E: feature/ISS-040-checkpoint-js-detection
   │    ISS-040 — detectPhase() recognize .js/.mjs test files
   │    Touches: hooks/checkpoint.js, tests/node/, tests/fixtures/
   │    No overlap with A/B/C/D/F. WHY HERE: Bug exposed during review-hardening
   │    RCA. checkpoint.js misclassifies JS-based test suites.
   │
   └─ Branch F: feature/ISS-008-claude-md-sync
        ISS-008 — sync project CLAUDE.md with reference docs/CLAUDE.md on init/upgrade
        Touches: init.sh, upgrade.sh, CLAUDE.md, tests/test-install-scripts.sh
        No overlap with A/B/C/D/E. WHY HERE: Accelerated from Wave 8 (Order 23)
        to Batch 2.5 because the split-brain between root CLAUDE.md (template
        placeholders) and docs/CLAUDE.md (real conventions) is a recurring source
        of agent confusion — surfaced in review-hardening RCA, ISS-005 dogfood,
        and multiple review cycles. Root CLAUDE.md has empty Naming, Folder
        Structure, Known Gotchas, and Architecture Notes sections that agents
        read as authoritative. ISS-007 (backup support) was a nice-to-have
        precondition, not a hard blocker — section-level sync with markers is
        non-destructive. Must land after Batch 2 merges (Batch 2 Branch B
        modifies CLAUDE.md).

Batch 3: ISS-001 + ISS-044  (parallel branches, no file overlap)
   ├─ Branch A: feature/ISS-001-invariants-audit
   │    ISS-001 — invariants-audit skill for cross-layer semantic review
   │    Depends on: ISS-024 + ISS-014 + ISS-036 (review layer hardened + wiring tests)
   │    Creates: new skills/invariants-audit/SKILL.md
   │    Updates: reviewer roles/commands as consumers
   │
   └─ Branch B: feature/ISS-044-rework-scope-lock
        ISS-044 — prevent scope expansion during post-review rework
        Depends on: ISS-029 (same files: commands/specify.md, commands/architect.md)
        Touches: commands/specify.md, commands/architect.md, codex/reviewers/review-prd.md,
                 tests/node/
        WHY HERE: RCA from ISS-029 rev2 showed rework cycles are an unguarded
        scope-expansion vector. Complements ISS-029 (authoring-time fidelity)
        and ISS-033 (review-time fidelity) with rework-time fidelity.
        No file overlap with Branch A.
```

### File overlap matrix (why these groupings)

| Ticket | `skills/tdd/` | `skills/code-review/` | `commands/review.md` | `commands/test-design.md` | `commands/specify.md` | `commands/implement.md` | `codex/reviewers/` | `hooks/checkpoint.js` | `tests/node/` | `tests/fixtures/` | `init.sh`/`upgrade.sh` | `CLAUDE.md` | New skill |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| ISS-022 | ✓ | | | ✓ | | | | | | | | | |
| ISS-024 | | ✓ | ✓ | | | | | | | | | | |
| ISS-014 | | ✓ | ✓ | | | | | | | | | | |
| ISS-033 | | ✓ | ✓ | | | | | | | | | | |
| ISS-041 | | | | | | | | | ✓ | ✓ | | | |
| ISS-036 | | | | ✓ | | | | | ✓ | | | | |
| ISS-029 | | | | | ✓ | | | | | | | | |
| ISS-027 | | | | | | | ✓ | | ✓ | | | | |
| ISS-039 | | ✓ | ✓ | | | | | | ✓ | | | | |
| ISS-040 | | | | | | | | ✓ | ✓ | ✓ | | | |
| ISS-008 | | | | | | | | | | | ✓ | ✓ | |
| ISS-042 | ✓ | | | | | ✓ | | | ✓ | | | | |
| ISS-043 | | | | ✓ | | | | | ✓ | | | | |
| ISS-044 | | | | | ✓ | | ✓ | | ✓ | | | | |
| ISS-045 | ✓ | | | ✓ | | | | | ✓ | | | | |
| ISS-001 | | | | | | | | | | | | | ✓ |

Batch 2 Branch A and B → no overlap, safe in parallel.
  ISS-041 is a bug in Branch B; fix it there before merge.
Batch 2.5 A/B/C/D/E/F → no overlap between each other.
  ISS-039 (D) depends on Batch 2 Branch B (same `skills/code-review/`, `commands/review.md`).
  ISS-040 (E) has no dependency on Batch 2 but sequenced here for batch simplicity.
  ISS-008 (F) touches `CLAUDE.md` which Batch 2 Branch B also modifies — must wait
  for Batch 2 to merge. No overlap with A/B/C/D/E within Batch 2.5.
  ISS-036 touches `commands/test-design.md`
  which ISS-022 also touches, so ISS-036 must wait for Batch 2 Branch A to merge.
ISS-042 touches `commands/implement.md` and `skills/tdd/` — no overlap with Batch 2.5.
  Can run as Batch 2.5 Branch G or deferred to Batch 3 alongside ISS-001.
ISS-043 touches `commands/test-design.md` — overlaps with ISS-036 (Batch 2.5 A).
  Must run after ISS-036 merges, so deferred to Batch 3.
ISS-001 depends on ISS-024 + ISS-014 + ISS-036 → must wait for Batch 2 + 2.5.
ISS-044 depends on ISS-029 (same files: commands/specify.md, commands/architect.md).
  Also touches codex/reviewers/review-prd.md — no overlap with ISS-027 (review-code.md).
  No overlap with ISS-001. Both run in Batch 3 as parallel branches.

---

## Execution Waves

Tickets grouped by theme. Within a wave, tickets are ordered by dependency but can often be worked in parallel if resources allow.

- **Wave 1 — Codex review method hardening (1):** Strengthen Codex’s code review prompt/process so installer paths, sync drift, and misleading tests are caught earlier and more consistently.
- **Wave 2 — Skill convention (2):** Revise skill size convention before adding content to skills. Unblocks all skill content changes in Waves 3–5. **Reliability milestone prerequisite.**
- **Wave 3 — Test & review layer hardening (3–10):** Closes the biggest failure patterns in test design and review quality, then hardens reviewer methodology, source-intent checking, PRD/ticket traceability, adversarial review, command↔skill wiring, ticket fidelity, installer coverage, and invariants. **Core of the reliability milestone.** ISS-036, ISS-029, ISS-027 added to this wave after cross-review pattern analysis identified three recurring defect classes not previously covered. ISS-039 added after RCA showed Claude's code-review skill has the same gap classes as ISS-027 (Codex side). ISS-040 and ISS-041 are checkpoint.js bugs surfaced during the same RCA. ISS-044 added after RCA showed rework cycles are an unguarded scope-expansion vector (ISS-029 rev2 invented 6 ACs not in the ticket while addressing Codex findings).
- **Wave 4 — Workflow ergonomics (11–12):** Improve operator ergonomics with ticket-aware feature selection and automatic status on fresh context.
- **Wave 5 — Release and planning structure (12):** Introduce semver and connect backlog planning to major/minor/patch release intent.
- **Wave 6 — Architecture, history, and QA loop (13–19):** Strengthen architecture docs, review history, additive review artifacts, self-review, post-implementation QA, and stage-matched Codex reviews.
- **Wave 7 — Skill polish (20–21):** `allowed-tools` frontmatter and stop-conditions footers. Small, scoped skill improvements.
- **Wave 8 — Install ergonomics (22):** Force upgrade + clean reinstall with backup support. ISS-008 (CLAUDE.md sync) accelerated to Wave 3 / Batch 2.5 — the split-brain between root and docs CLAUDE.md is a recurring reliability issue, not just an ergonomic one.
- **Wave 9 — Documentation polish (24–31):** Low-priority DX and documentation items. Defer until a real pain point forces them. ISS-031 extends `/document` to keep README and other user-facing docs current automatically. ISS-034 makes the backlog skill configurable for GitHub Issues, Linear, or custom backlog systems. ISS-038 introduces the broader provider-neutral architecture needed to treat non-Claude agents as first-class pipeline participants.

## Sequencing Notes

- **ISS-027 is at Order 1** because improving Codex’s review mechanics pays off immediately across future feature reviews, especially for install-path checks, sync drift, and misleading test coverage.
- **ISS-013 at Order 2 is the reliability milestone prerequisite.** The skill size convention must be revised before ISS-022, ISS-024, ISS-025, and ISS-033 add content to skills. Hard blocker for Batch 2.
- **ISS-022 (P1) at Order 3** is the highest-value reliability fix. The integration test gap is the #1 escaped defect pattern. Depends on ISS-013. Runs in parallel with Branch B (ISS-024+014+033) — no file overlap.
- **ISS-024 (P1) at Order 4** is the second-highest value. Reviewer rubber-stamping is the #1 gate failure pattern. Grouped with ISS-014 and ISS-033 because all three modify `skills/code-review/SKILL.md` and `commands/review.md`.
- **ISS-033 at Order 5** is grouped with ISS-024 and ISS-014 (same skill, same command). Reviewer correctness depends on checking against the original spec, not just the latest artifact.
- **ISS-014 at Order 7** is grouped with ISS-024 and ISS-033. Adversarial reviewers + separate context completes the review layer hardening.
- **ISS-036 (P1) at Order 8** is the new highest-priority reliability fix after Batch 2. The command↔skill wiring gap is the #1 BLOCKING defect class — skill adds an artifact type, command never tells the agent to produce it. Three features hit this. Depends on ISS-013 (landed). Touches `commands/test-design.md` which ISS-022 also modifies, so must wait for Batch 2 Branch A.
- **ISS-029 at Order 9** now includes AC0 (ticket fidelity check) — prevents PRD drift from tickets at authoring time, complementing ISS-033 which catches it at review time. Elevated because PRD drift is the #2 recurring defect class (5 instances).
- **ISS-044 at Order 10** prevents scope expansion during post-review rework. RCA from ISS-029 rev2 showed rework cycles are an unguarded vector — the agent fixed 5 Codex findings but also invented 6 new ACs not in the ticket. Depends on ISS-029 (same command files). Also hardens `codex/reviewers/review-prd.md` with ticket-fidelity checking — complementing ISS-027 (review-code.md) and ISS-033 (Phase 6 review). No file overlap with ISS-001; both run in Batch 3 as parallel branches.
- **ISS-001 at Order 10 has hard dependencies on ISS-024 + ISS-014 + ISS-036.** The invariants-audit skill builds on the hardened review layer and wiring tests. Must wait for Batch 2 + 2.5.
- **ISS-028 at Order 11** improves operator ergonomics after the reliability milestone clears.
- **ISS-030 at Order 12** introduces semver and release planning — less urgent than reliability and workflow fixes.
- **ISS-023 at Order 13** adds architecture rigor. Valuable but currently caught by Codex review.
- **ISS-006 at Order 15** establishes review-response traceability, and **ISS-037 at Order 16** complements it by preserving additive review rounds in the review artifacts themselves while exposing the latest verdict at the top.
- **ISS-025 at Order 17** is the developer-side counterpart to ISS-024. Defense-in-depth after the reviewer is hardened. Depends on ISS-013.
- **ISS-012 benefits from ISS-006, ISS-014, and ISS-037** — review-history, reviewer independence, and a deterministic latest-review locator make the Codex loop more credible.
- **ISS-019 is sequenced near ISS-017** — both touch the same skill files. Adjacent sessions amortize read cost.
- **ISS-008 accelerated to Batch 2.5 (Order 8)** from Order 23 / Wave 8. The split-brain between root `CLAUDE.md` (template placeholders) and `docs/CLAUDE.md` (real conventions) surfaced repeatedly: in review-hardening RCA, ISS-005 dogfood, and multiple review cycles. Agents read empty Naming/Gotchas/Architecture sections from root CLAUDE.md and miss the real conventions in `docs/CLAUDE.md`. ISS-007 (backup support) was a nice-to-have precondition — section-level sync with `<!-- managed by codingagents -->` markers is non-destructive. Touches `init.sh`, `upgrade.sh`, `CLAUDE.md`, `tests/test-install-scripts.sh` — no overlap with any Batch 2.5 branch.
- **ISS-007** remains at Order 22 — still valuable for destructive upgrade scenarios but no longer gates ISS-008.
- **ISS-041 at Order 5** is a bug in the review-hardening branch (Batch 2 Branch B). The `source_spec` schema change broke existing checkpoint fixtures. Must be fixed as part of the REQUEST_CHANGES rework before that branch merges.
- **ISS-039 at Order 8** is the Claude-side counterpart to ISS-027 (Codex). RCA from the review-hardening Phase 6 showed Claude's code-review skill missed 4 findings Codex caught — all systemic methodology gaps (downstream impact, drift, test suite, reproduction). Depends on Batch 2 Branch B (same files: `skills/code-review/SKILL.md`, `commands/review.md`). No overlap with Batch 2.5 A/B/C/E.
- **ISS-040 at Order 8** is a pre-existing bug in `checkpoint.js` exposed during review-hardening RCA. `detectPhase()` hard-codes `.ts` test extensions, misclassifying `.js`-based test suites. No file overlap with anything in Batch 2.5, so it runs as a parallel branch.
- **ISS-042 at Order 8** is a process gap found during review-hardening RCA — the developer never reads `known_risks` from the incoming handoff. Touches `commands/implement.md` and `skills/tdd/SKILL.md` — no overlap with Batch 2.5 A-F. Can run as Batch 2.5 Branch G or deferred to Batch 3.
- **ISS-043 at Order 8** is a Phase 3 quality gap — QA tested one representative of each symmetric pair, not all members. Touches `commands/test-design.md` which overlaps with ISS-036 (Batch 2.5 A). Must wait for ISS-036 to merge; deferred to Batch 3.
- **ISS-045 at Order 8** is a complementary Phase 3 quality gap — QA accepted a contract specification literally without adversarially testing its edge cases (comment-only matches, unbounded escape hatches). Found by Codex review on ISS-027 architecture. Touches the same files as ISS-043 (`commands/test-design.md`, `skills/tdd/SKILL.md`). Can be combined with ISS-043 in a single branch. Originally ISS-044; renumbered to avoid conflict with ISS-044 (scope expansion prevention).
- **ISS-038 at Order 31** is intentionally separate from ISS-005. ISS-005 validates the current framework through dogfooding; ISS-038 is the broader architecture effort to make Codex, Gemini, and future LLMs first-class authoring agents rather than Claude-centric adapters.
