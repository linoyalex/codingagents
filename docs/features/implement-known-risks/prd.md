## Feature: Implement Known-Risks Verification
**Generated:** 2026-04-13T16:45:00Z
**Phase:** Specify | Date: 2026-04-13

### User Story
As a developer executing the `/implement` phase, I want to receive clear instruction to read and verify handoff `known_risks` before committing GREEN, so that security findings and other critical constraints flagged by prior phases are not accidentally missed.

### Problem
During Phase 5 (Implement), developers follow the `/implement` command which instructs them to read only `architecture.md` and failing test files. The incoming handoff carries `known_risks` (including security findings), but no phase explicitly instructs the developer to act on them. This creates a gap: high-risk findings reach the developer only as prose in a JSON field they are not told to read, resulting in unaddressed security issues being caught only in Phase 6 review.

### Acceptance Criteria

- [ ] **AC1 (Happy Path):** Given a developer executing `/implement` on a feature with `known_risks` in `.claude/handoff.json`, When the developer reads `commands/implement.md`, Then the GREEN phase section includes an explicit instruction: "Read `known_risks` from `.claude/handoff.json`. For each risk, verify your implementation addresses it or document why it is deferred."

- [ ] **AC2 (Skill Checklist):** Given a developer completing the GREEN phase commit, When the developer checks the TDD skill checklist (GREEN phase subsection), Then the checklist includes the item: "Verify handoff `known_risks` are addressed (or deferred with rationale)."

- [ ] **AC3 (Contract Test):** Given the prose updates in AC1 and AC2 have been written, When a contract test runs against `commands/implement.md` and `skills/tdd/SKILL.md`, Then the test passes by locating both the `known_risks` instruction and the checklist item using structural anchors (heading name + substring match, not phrase-binding).

- [ ] **AC4 (Empty State):** Given a handoff with an empty `known_risks` array or no `known_risks` field, When the developer follows the `/implement` instructions, Then the developer proceeds normally — the instruction is present but no action is required.

- [ ] **AC5 (Error State):** Given a handoff with malformed JSON in `.claude/handoff.json`, When the developer attempts to read `known_risks`, Then existing error handling (resolve-feature.js) halts with a parse error before the developer reaches GREEN.

### Screen States

| Workflow Checkpoint | Empty | Loading | Populated | Error | Success |
|-----|-------|---------|-----------|-------|---------|
| **Handoff `known_risks` read (Phase 5 start)** | `known_risks` missing or empty array — developer proceeds without risk awareness (no action needed) | Developer loading `.claude/handoff.json` into context | `known_risks` array present with 1+ items — developer reads security/architectural findings | Malformed JSON in `.claude/handoff.json` — resolve-feature.js halts with parse error | `known_risks` read and logged; developer continues to GREEN phase with risk checklist |
| **Risk verification during GREEN phase** | All risks deferred or explicitly N/A — developer documents rationale in commit message | Developer working through implementation checklist; risks pending verification | Each risk addressed in code or deferred with documented reason in commit message | Risk found unaddressed and not deferred — developer must halt GREEN, fix implementation, re-test | All `known_risks` verified addressed or deferred with clear rationale — GREEN commit includes risk traceability |

### Out of Scope
- Changing the handoff schema or adding new fields to `handoff.schema.json`
- Automated enforcement (blocking commit if risks unaddressed)
- Retroactive audits of past handoffs
- Changes to Phase 4 (security audit) or Phase 6 (code review) instructions

### Dependencies
- `.claude/handoff.json` `known_risks` field is already in the schema and in active use
- `commands/implement.md` and `skills/tdd/SKILL.md` must exist (confirmed)
- Contract test infrastructure supports structural anchor validation (same pattern as existing tests)

### RICE Score
| Metric | Value |
|--------|-------|
| **Reach** | All Phase 5 developer sessions |
| **Impact** | High — prevents security findings from being dropped at developer handoff |
| **Confidence** | Very High — root cause identified, fix is deterministic prose |
| **Effort** | Very Low — prose + 1 contract test |
| **Score** | 32 |

### Definition of Done
- All ACs pass in staging
- QA signed off on contract test coverage
- No P1/P2 bugs open
