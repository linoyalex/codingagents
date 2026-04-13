# Feature: Implement Known-Risks Verification
**Generated:** 2026-04-13T17:30:00Z
**Phase:** Specify | Date: 2026-04-13

### User Story
As a developer executing the `/implement` phase, I want to receive clear instruction to read and verify handoff `known_risks` before committing GREEN, so that security findings and other critical constraints flagged by prior phases are not accidentally missed.

### Problem
During Phase 5 (Implement), developers follow the `/implement` command which instructs them to read only `architecture.md` and failing test files. The incoming handoff carries `known_risks` (including security findings), but no phase explicitly instructs the developer to act on them. This creates a gap: high-risk findings reach the developer only as prose in a JSON field they are not told to read, resulting in unaddressed security issues being caught only in Phase 6 review.

### Scope Boundary
This feature adds **prose guidance only** — two instruction additions and one contract test. It does not introduce automated enforcement, commit-blocking behavior, or a traceability convention. The developer reads the risks; the instruction tells them to address or defer each one. No tooling changes.

### Acceptance Criteria

- [ ] **AC1 (Happy Path):** Given a developer executing `/implement` on a feature with `known_risks` in `.claude/handoff.json`, When the developer reads `commands/implement.md`, Then the GREEN phase section includes an explicit instruction to read `known_risks` from `.claude/handoff.json` and for each risk verify the implementation addresses it or document why it is deferred.

- [ ] **AC2 (Skill Checklist):** Given a developer completing the GREEN phase commit, When the developer checks the TDD skill checklist (GREEN phase subsection), Then the checklist includes an item to verify handoff `known_risks` are addressed or deferred with rationale.

- [ ] **AC3 (Contract Test):** Given the prose updates in AC1 and AC2 have been written, When a contract test runs against `commands/implement.md` and `skills/tdd/SKILL.md`, Then the test passes by locating both the `known_risks` instruction and the checklist item using structural anchors (heading name + substring match, not phrase-binding).

- [ ] **AC4 (Empty State):** Given a handoff with an empty `known_risks` array, no `known_risks` field, or a missing `.claude/handoff.json` file, When the developer follows the `/implement` instructions, Then the developer proceeds normally — the instruction is present but no action is required.

- [ ] **AC5 (Error State):** Given a handoff with malformed JSON in `.claude/handoff.json`, When the developer attempts to start `/implement`, Then the existing `resolve-feature.js` error handling halts with a parse error before the developer reaches GREEN. (This AC verifies the pre-existing guard continues to protect the new instruction path — no new error handling is added by this feature.)

### Screen States

| Workflow Checkpoint | Empty | Populated | Error |
|-----|-------|-----------|-------|
| **Handoff `known_risks` read (Phase 5 start)** | `known_risks` missing, empty array, or handoff file absent — developer proceeds normally, no action needed | `known_risks` array present with 1+ items — developer reads each risk before GREEN phase | Malformed JSON — `resolve-feature.js` halts with parse error before developer proceeds |
| **Risk verification during GREEN phase** | No risks to verify — developer skips risk checklist item | Developer verifies each risk is addressed in code or documents deferral rationale | N/A — error states are caught at handoff load, not during GREEN phase |

### Out of Scope
- Changing the handoff schema or adding new fields to `handoff.schema.json`
- Automated enforcement or commit-blocking if risks are unaddressed
- Retroactive audits of past handoffs
- Changes to Phase 4 (security audit) or Phase 6 (code review) instructions
- New error handling for malformed handoffs (pre-existing guard suffices)
- Traceability conventions for risk documentation in commit messages

### Dependencies
- `.claude/handoff.json` `known_risks` field is already in the schema and in active use
- `commands/implement.md` and `skills/tdd/SKILL.md` must exist (confirmed)
- `resolve-feature.js` already validates and parses `.claude/handoff.json` (confirmed)
- Contract test infrastructure supports structural anchor validation (same pattern as existing tests)

### Assumptions
- The `known_risks` field, when present, is always an array. Non-array shapes are not expected because the handoff schema enforces the type. If schema validation is bypassed, the prose instruction degrades gracefully (developer sees unexpected content but is not blocked).

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
