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
| 9 | [ISS-007](tickets/ISS-007.md) | P1 — High | Feature | — | Force upgrade and clean reinstall with backup support |
| 10 | [ISS-044](tickets/ISS-044.md) | P2 — Medium | Feature | ISS-029 (closed) | Prevent scope expansion during post-review artifact rework |
| 10 | [ISS-001](tickets/ISS-001.md) | P1 — High | Feature | ISS-036 (closed) | Add invariants-audit skill for cross-layer semantic review |
| 11 | [ISS-052](tickets/ISS-052.md) | P1 — High | Feature | — | Add branch management skill and release finalization command |
| 11 | [ISS-028](tickets/ISS-028.md) | P2 — Medium | Feature | — | Add ticket-aware feature selection and backlog state commands |
| 11 | [ISS-050](tickets/ISS-050.md) | P2 — Medium | Feature | — | Configure default effort level and plan mode per pipeline command |
| 12 | [ISS-032](tickets/ISS-032.md) | P2 — Medium | Feature | — | Automatically run /status on fresh context to orient the agent |
| 13 | [ISS-030](tickets/ISS-030.md) | P2 — Medium | Architecture | — | Introduce semantic versioning and tie backlog planning to major/minor/patch releases |
| 13 | [ISS-051](tickets/ISS-051.md) | P2 — Medium | Feature | — | Add release-manager skill and /release-plan command for ongoing release planning |
| 14 | [ISS-046](tickets/ISS-046.md) | P2 — Medium | Architecture | — | Introduce shared project configuration and pipeline profiles for portable multi-project use |
| 14 | [ISS-023](tickets/ISS-023.md) | P2 — Medium | Feature | — | Strengthen architecture decision skill with wiring diagrams, evidence rules, and observability naming |
| 14 | [ISS-054](tickets/ISS-054.md) | P2 — Medium | Architecture | — | Formalize ADR practice — architect must read, write, and promote architectural decisions |
| 15 | [ISS-047](tickets/ISS-047.md) | P2 — Medium | Feature | ISS-046 | Implement the first portability slice: configurable paths, outputs, diff/test commands, and work-type profiles |
| 15 | [ISS-006](tickets/ISS-006.md) | P2 — Medium | Feature | — | Add `review-history.md` to capture cross-review rework in feature artifacts |
| 16 | [ISS-037](tickets/ISS-037.md) | P2 — Medium | Feature | — | Make review artifacts additive and expose the latest review state clearly |
| 16 | [ISS-034](tickets/ISS-034.md) | P2 — Medium | Feature | ISS-046 | Make backlog management skill configurable for different backlog systems |
| 17 | [ISS-025](tickets/ISS-025.md) | P2 — Medium | Feature | ISS-013 | Add adversarial self-review checkpoint to Phase 5 verification |
| 17 | [ISS-038](tickets/ISS-038.md) | P2 — Medium | Architecture | ISS-046 | Support Codex, Gemini, and other LLMs as first-class coding agents |
| 18 | [ISS-015](tickets/ISS-015.md) | P2 — Medium | Feature | — | Add first-class post-implementation QA verification stage |
| 19 | [ISS-053](tickets/ISS-053.md) | P1 — High | Feature | — | Adversarial review council with iterative resolution for authoring phases (supersedes ISS-012) |
| 20 | [ISS-019](tickets/ISS-019.md) | P2 — Medium | Architecture | — | Add `allowed-tools` frontmatter to read-only skills |
| 21 | [ISS-017](tickets/ISS-017.md) | P2 — Medium | Feature | — | Add stop-conditions footer to high-stakes skills |
| 24 | [ISS-011](tickets/ISS-011.md) | P3 — Low | Feature | — | Add shell script wrappers for Codex reviewer workflows |
| 25 | [ISS-016](tickets/ISS-016.md) | P3 — Low | Architecture | — | Document intentional divergence from Anthropic slash command guidance |
| 26 | [ISS-018](tickets/ISS-018.md) | P3 — Low | Architecture | — | Standardize skill naming on gerund form |
| 27 | [ISS-020](tickets/ISS-020.md) | P3 — Low | Architecture | — | Prefix generated PRD filenames with the feature slug |
| 28 | [ISS-021](tickets/ISS-021.md) | P3 — Low | Feature | — | Add first-class command entry points for Codex reviewer prompts |
| 29 | [ISS-031](tickets/ISS-031.md) | P2 — Medium | Feature | — | Extend `/document` to update README and other project documentation artifacts |

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

Batch 2: ISS-022 + ISS-024 + ISS-014 + ISS-033  ✅ ALL MERGED
   ├─ Branch A: feature/ISS-022-integration-tests   ✅ MERGED
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

Batch 2.5: ISS-036 + ISS-029 + ISS-027 + ISS-039 + ISS-040 + ISS-042 + ISS-008
   ├─ Branch A: feature/ISS-036-wiring-verification  ✅ MERGED
   │    ISS-036 — command↔skill wiring contract tests
   │    Closed 2026-04-14
   │
   ├─ Branch B: feature/ISS-029-specify-fidelity   ✅ MERGED
   │    ISS-029 — clarification checkpoints + ticket fidelity check
   │    Closed 2026-04-13
   │
   ├─ Branch C: feature/ISS-027-codex-review-hardening  ✅ MERGED
   │    ISS-027 — install-path checks + installer contract test (new AC7)
   │    Closed 2026-04-13
   │
   ├─ Branch D: feature/ISS-039-code-review-skill-hardening  ✅ MERGED
   │    ISS-039 — downstream-impact, drift-check, reproduction steps for Claude review
   │    Closed 2026-04-15
   │    Touches: skills/code-review/SKILL.md, commands/review.md, tests/node/
   │    Depends on: Batch 2 Branch B (same files). No overlap with A/B/C/E.
   │    WHY HERE: Claude-side counterpart to ISS-027 (Codex). RCA showed Claude's
   │    review skill missed 4 findings Codex caught — same defect classes.
   │
   ├─ Branch E: feature/ISS-040-checkpoint-js-detection  ✅ MERGED (fixed in Batch 2 Branch B)
   │    ISS-040 — detectPhase() recognize .js/.mjs test files
   │    Closed 2026-04-13 — landed as part of review-hardening branch.
   │
   ├─ Branch F: feature/ISS-008-claude-md-sync  ✅ MERGED
   │    ISS-008 — sync project CLAUDE.md with reference docs/CLAUDE.md on init/upgrade
   │    Closed 2026-04-15
   │    Touches: init.sh, upgrade.sh, CLAUDE.md, tests/test-install-scripts.sh
   │    No overlap with A/B/C/D/E. WHY HERE: Accelerated from Wave 9 (Order 23)
   │    to Batch 2.5 because the split-brain between root CLAUDE.md (template
   │    placeholders) and docs/CLAUDE.md (real conventions) is a recurring source
   │    of agent confusion — surfaced in review-hardening RCA, ISS-005 dogfood,
   │    and multiple review cycles. Root CLAUDE.md has empty Naming, Folder
   │    Structure, Known Gotchas, and Architecture Notes sections that agents
   │    read as authoritative. ISS-007 (backup support) was a nice-to-have
   │    precondition, not a hard blocker — section-level sync with markers is
   │    non-destructive. Must land after Batch 2 merges (Batch 2 Branch B
   │    modifies CLAUDE.md).
   │
   └─ Branch G: feature/ISS-042-implement-known-risks  ✅ MERGED
        ISS-042 — /implement must instruct developer to verify handoff known_risks
        Closed 2026-04-13

Batch 2.75: ISS-043 + ISS-045 + ISS-049  (single branch — all touch same files)
   └─ Branch A: feature/ISS-043-045-049-qa-test-quality
        ISS-043 — symmetric testing across all enumerated components
        ISS-045 — adversarial contract robustness testing
        ISS-049 — fixture-driven behavioral tests for executable code
        Touches: commands/test-design.md, skills/tdd/SKILL.md, tests/node/
        Depends on: ISS-036 (closed). No overlap with Batch 3.
        WHY COMBINED: All three address Phase 3 test quality gaps from
        different angles, all touch the same two files. Single branch
        avoids 3 serial merge conflicts in commands/test-design.md.

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
| ISS-049 | ✓ | | | ✓ | | | | | ✓ | | | | |
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
  Ran as Batch 2.5 Branch G. ✅ MERGED 2026-04-13.
ISS-043 touches `commands/test-design.md` — overlaps with ISS-036 (Batch 2.5 A).
  Must run after ISS-036 merges. Combined with ISS-045 and ISS-049 in Batch 2.75.
ISS-001 depends on ISS-024 + ISS-014 + ISS-036 → must wait for Batch 2 + 2.5.
ISS-044 depends on ISS-029 (same files: commands/specify.md, commands/architect.md).
  Also touches codex/reviewers/review-prd.md — no overlap with ISS-027 (review-code.md).
  No overlap with ISS-001. Both run in Batch 3 as parallel branches.

---

## Execution Waves

Tickets grouped by theme. Within a wave, tickets are ordered by dependency but can often be worked in parallel if resources allow.

- **Wave 1 — Codex review method hardening (1):** ✅ **COMPLETE.** ISS-027 merged 2026-04-13. Codex review method hardened with install-path, sync-drift, test-truthfulness checks, and installer coverage contract tests.
- **Wave 2 — Skill convention (2):** ✅ **COMPLETE.** ISS-013 merged 2026-04-13. Unblocked all skill content changes in Waves 3–5.
- **Wave 3 — Test & review layer hardening (3–10):** Closes the biggest failure patterns in test design and review quality, then hardens reviewer methodology, source-intent checking, PRD/ticket traceability, adversarial review, command↔skill wiring, ticket fidelity, installer coverage, and invariants. **Core of the reliability milestone.** ISS-043/045/049 elevated to P1 after ISS-008 RCA showed QA test quality gaps cost ~50% rework in Phase 3. ISS-007 accelerated from Wave 9 (Order 22) to Wave 3 (Order 9) — upgrade.sh uses major-only version tracking (`v5`), silently skipping all minor releases for projects already at v5. `--force` unblocks until ISS-030 adds proper semver. **Done:** ISS-022, ISS-024, ISS-014, ISS-033, ISS-041, ISS-040, ISS-029, ISS-042, ISS-036, ISS-027, ISS-039, ISS-008. **Remaining:** ISS-007, ISS-043, ISS-045, ISS-049, ISS-044, ISS-001.
- **Wave 4 — Workflow ergonomics (11–12):** Improve operator ergonomics with branch management, ticket-aware feature selection, automatic status on fresh context, and per-command effort/plan-mode defaults. ISS-052 elevated to P1 after Batch 2.75 PRD was committed to main — no command creates or verifies feature branches. **Remaining:** ISS-052, ISS-028, ISS-032, ISS-050.
- **Wave 5 — Release and planning structure (12–13):** Introduce semver, connect backlog planning to release intent, and add operational tooling to keep the release roadmap current as priorities shift. **Remaining:** ISS-030, ISS-051.
- **Wave 6 — Project portability and configurability (14–17):** Keep the framework opinionated by default, but move project-specific paths, outputs, strictness, work-type profiles, backlog systems, and agent routing behind a shared configuration model instead of hardcoded codingagents conventions. **Remaining:** ISS-046, ISS-047, ISS-034, ISS-038.
- **Wave 7 — Architecture, history, and QA loop (13–19):** Strengthen architecture docs, ADR practice, review history, additive review artifacts, self-review, post-implementation QA, and adversarial review council. ISS-054 added alongside ISS-023 — both modify the architect skill and can share a branch. ISS-053 supersedes ISS-012 with multi-agent council, auto-trigger, and configurable blocking. **Remaining:** ISS-023, ISS-054, ISS-006, ISS-037, ISS-025, ISS-015, ISS-053.
- **Wave 8 — Skill polish (20–21):** `allowed-tools` frontmatter and stop-conditions footers. Small, scoped skill improvements. **Remaining:** ISS-019, ISS-017.
- **Wave 9 — Install ergonomics:** ISS-008 accelerated to Wave 3 / Batch 2.5. ISS-007 accelerated to Wave 3 (Order 9). **No remaining tickets — wave complete.**
- **Wave 10 — Documentation polish (24–31):** Low-priority DX and documentation items. Defer until a real pain point forces them. ISS-031 extends `/document` to keep README and other user-facing docs current automatically. ISS-034 and ISS-038 were promoted into Wave 6 because backlog-system flexibility and provider-neutral agent support are core multi-project framework concerns, not just documentation polish. **Remaining:** ISS-011, ISS-016, ISS-018, ISS-020, ISS-021, ISS-031.

## Sequencing Notes

- **ISS-027 is at Order 1** because improving Codex’s review mechanics pays off immediately across future feature reviews, especially for install-path checks, sync drift, and misleading test coverage.
- **ISS-013 at Order 2 is the reliability milestone prerequisite.** The skill size convention must be revised before ISS-022, ISS-024, ISS-025, and ISS-033 add content to skills. Hard blocker for Batch 2.
- **ISS-022 (P1) at Order 3** is the highest-value reliability fix. The integration test gap is the #1 escaped defect pattern. Depends on ISS-013. Runs in parallel with Branch B (ISS-024+014+033) — no file overlap.
- **ISS-024 (P1) at Order 4** is the second-highest value. Reviewer rubber-stamping is the #1 gate failure pattern. Grouped with ISS-014 and ISS-033 because all three modify `skills/code-review/SKILL.md` and `commands/review.md`.
- **ISS-033 at Order 5** is grouped with ISS-024 and ISS-014 (same skill, same command). Reviewer correctness depends on checking against the original spec, not just the latest artifact.
- **ISS-014 at Order 7** is grouped with ISS-024 and ISS-033. Adversarial reviewers + separate context completes the review layer hardening.
- **ISS-036 (P1) at Order 8** is the new highest-priority reliability fix after Batch 2. The command↔skill wiring gap is the #1 BLOCKING defect class — skill adds an artifact type, command never tells the agent to produce it. Three features hit this. Depends on ISS-013 (landed). Touches `commands/test-design.md` which ISS-022 also modifies, so must wait for Batch 2 Branch A.
- **ISS-029 at Order 9** now includes AC0 (ticket fidelity check) and AC4a (PRD↔architecture delta check) — prevents PRD drift from tickets at authoring time and catches architecture↔PRD divergence before implementation. Elevated because PRD drift is the #2 recurring defect class (5 instances). AC4a added after ISS-036 RCA: architecture silently tightened AC8 without updating the PRD.
- **ISS-044 at Order 10** prevents scope expansion during post-review rework. RCA from ISS-029 rev2 showed rework cycles are an unguarded vector — the agent fixed 5 Codex findings but also invented 6 new ACs not in the ticket. Depends on ISS-029 (same command files). Also hardens `codex/reviewers/review-prd.md` with ticket-fidelity checking — complementing ISS-027 (review-code.md) and ISS-033 (Phase 6 review). No file overlap with ISS-001; both run in Batch 3 as parallel branches.
- **ISS-001 at Order 10 has hard dependencies on ISS-024 + ISS-014 + ISS-036.** The invariants-audit skill builds on the hardened review layer and wiring tests. Must wait for Batch 2 + 2.5.
- **ISS-052 at Order 11** adds branch management (create, verify, merge) and release finalization (promote `[Unreleased]` to versioned entry). Elevated to P1 after Batch 2.75 PRD was committed to main — no pipeline command creates or verifies feature branches. Also moves Phase 7 to the feature branch so the branch is a complete unit of work. Complements ISS-051 (release planning) and ISS-030 (semver policy). No hard dependencies; should land before ISS-051 so the merge command is available when release planning is formalized.
- **ISS-028 at Order 11** improves operator ergonomics after the reliability milestone clears.
- **ISS-030 at Order 12** introduces semver and release planning — less urgent than reliability and workflow fixes.
- **ISS-023 at Order 13** adds architecture rigor. Valuable but currently caught by Codex review.
- **ISS-046 at Order 14** creates the shared project-configuration foundation needed to make `codingagents` portable without giving up its opinionated defaults. It should define where project-specific paths, output toggles, review strictness, work-type profiles, and ticket-system adapters live so later tickets do not each invent their own config format.
- **ISS-047 at Order 15** is the highest-value first implementation slice of ISS-046. It should land early because configurable paths, documentation outputs, diff/test commands, and work-type/review profiles remove the biggest blockers to using the framework outside this repo without waiting for every adapter to be solved.
- **ISS-006 at Order 15** establishes review-response traceability, and **ISS-037 at Order 16** complements it by preserving additive review rounds in the review artifacts themselves while exposing the latest verdict at the top.
- **ISS-025 at Order 17** is the developer-side counterpart to ISS-024. Defense-in-depth after the reviewer is hardened. Depends on ISS-013. Now also covers Phase 2 (architect) adversarial self-review — AC7 added after ISS-036 RCA showed the architect agent committed fail-open defaults without self-challenge.
- **ISS-053 at Order 19** supersedes ISS-012. Introduces multi-agent adversarial review council with iterative resolution for all authoring phases. Draws from the LLM Council pattern: multiple adversarial agents independently review the same artifact, findings are aggregated with consensus rules, and the author loops until clean or max iterations. Auto-trigger for API-accessible agents, structured manual fallback for CLI-only agents. Configurable blocking per command. Benefits from ISS-006 (review-history), ISS-038 (multi-agent provider abstraction), and ISS-046 (project config for council defaults).
- **ISS-019 is sequenced near ISS-017** — both touch the same skill files. Adjacent sessions amortize read cost.
- **ISS-008 accelerated to Batch 2.5 (Order 8)** from Order 23 / Wave 9. The split-brain between root `CLAUDE.md` (template placeholders) and `docs/CLAUDE.md` (real conventions) surfaced repeatedly: in review-hardening RCA, ISS-005 dogfood, and multiple review cycles. Agents read empty Naming/Gotchas/Architecture sections from root CLAUDE.md and miss the real conventions in `docs/CLAUDE.md`. ISS-007 (backup support) was a nice-to-have precondition — section-level sync with `<!-- managed by codingagents -->` markers is non-destructive. Touches `init.sh`, `upgrade.sh`, `CLAUDE.md`, `tests/test-install-scripts.sh` — no overlap with any Batch 2.5 branch.
- **ISS-007 accelerated to Order 9** from Order 22 / Wave 9. upgrade.sh uses `NEW_VERSION="v5"` with no minor/patch granularity — any project that upgraded once to v5.x silently skips all subsequent minor releases (v5.6–v5.9). Discovered when upgrading the Closet designer project from v5.5 to v5.9 to get the hardened review skill. `--force` flag is the tactical unblock until ISS-030 adds proper semver comparison. Touches `upgrade.sh`, `init.sh`, `tests/test-install-scripts.sh` — no overlap with Batch 2.75 (ISS-043/045/049) or Batch 3 (ISS-001/044). Can run as a solo batch between Batch 2.75 and Batch 3.
- **ISS-041 at Order 5** is a bug in the review-hardening branch (Batch 2 Branch B). The `source_spec` schema change broke existing checkpoint fixtures. Must be fixed as part of the REQUEST_CHANGES rework before that branch merges.
- **ISS-039 at Order 8** is the Claude-side counterpart to ISS-027 (Codex). RCA from the review-hardening Phase 6 showed Claude's code-review skill missed 4 findings Codex caught — all systemic methodology gaps (downstream impact, drift, test suite, reproduction). AC4a added after ISS-036 RCA: implementer declared review findings "resolved" 7 times without reproducing them — must require reproduction before resolution. Depends on Batch 2 Branch B (same files: `skills/code-review/SKILL.md`, `commands/review.md`). No overlap with Batch 2.5 A/B/C/E.
- **ISS-040 at Order 8** is a pre-existing bug in `checkpoint.js` exposed during review-hardening RCA. `detectPhase()` hard-codes `.ts` test extensions, misclassifying `.js`-based test suites. No file overlap with anything in Batch 2.5, so it runs as a parallel branch.
- **ISS-042 at Order 8** ✅ closed 2026-04-13. Ran as Batch 2.5 Branch G. known_risks read instruction added to implement.md and TDD skill.
- **ISS-043 at Order 8** is a Phase 3 quality gap — QA tested one representative of each symmetric pair, not all members. Touches `commands/test-design.md` which overlaps with ISS-036 (Batch 2.5 A). Must wait for ISS-036 to merge; deferred to Batch 3.
- **ISS-049 at Order 8** is a Phase 3 test strategy gap — QA defaulted to structural string-presence checks for executable code (`lib/sync-claude-md.sh`) instead of fixture-driven behavioral tests. RCA from ISS-008 Codex review: ~50% of Phase 3 rework was rewriting structural tests as fixture-driven ones. Touches the same files as ISS-043/045 (`commands/test-design.md`, `skills/tdd/SKILL.md`). Combined in Batch 2.75.
- **ISS-045 at Order 8** is a complementary Phase 3 quality gap — QA accepted a contract specification literally without adversarially testing its edge cases (comment-only matches, unbounded escape hatches). Found by Codex review on ISS-027 architecture. Touches the same files as ISS-043 (`commands/test-design.md`, `skills/tdd/SKILL.md`). Can be combined with ISS-043 in a single branch. Originally ISS-044; renumbered to avoid conflict with ISS-044 (scope expansion prevention).
- **ISS-034 at Order 16** is now sequenced behind ISS-046 so backlog-system flexibility can use the shared project configuration model instead of inventing a one-off config surface in the backlog skill alone.
- **ISS-038 at Order 17** remains intentionally separate from ISS-005. ISS-005 validates the current framework through dogfooding; ISS-038 is the broader architecture effort to make Codex, Gemini, and future LLMs first-class authoring agents rather than Claude-centric adapters. It now sits behind ISS-046 so agent routing builds on the same shared project configuration foundation as paths, profiles, and optional functions.
