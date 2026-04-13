## Feature: Clarification Checkpoints & Ticket Fidelity
**Generated:** 2026-04-13T00:00:00Z
**Phase:** Specify | Date: 2026-04-13
**Source ticket:** [ISS-029](../../issues/tickets/ISS-029.md)

### User Story
As a pipeline operator,
I want `/specify` to verify PRD fidelity against the source ticket and ask clarification questions before finalizing, and `/architect` to present its proposal for review before committing,
So that ambiguity is caught early and PRDs faithfully represent ticket intent instead of silently drifting.

### Acceptance Criteria

- [ ] **AC0 (Ticket fidelity check):**
  Given `/specify` receives a ticket reference (e.g., ISS-NNN),
  When the product-owner agent writes acceptance criteria,
  Then it must transcribe the ticket's ACs into Given/When/Then format — not paraphrase, broaden, or weaken them. If the PRD AC diverges from the ticket AC in scope, severity, or specificity, the agent must flag the divergence explicitly as an assumption rather than silently drifting.

- [ ] **AC0a (Convention citation verification):**
  Given a PRD cites a project convention (e.g., line budgets, naming rules),
  When the agent writes the cited value,
  Then it must verify the value against the current CLAUDE.md — not rely on remembered or stale values.

- [ ] **AC0b (Internal contradiction check):**
  Given the agent has written all ACs for a PRD,
  When the PRD is finalized,
  Then no two ACs make mutually exclusive claims about the same field or behavior. The agent must check for and flag internal contradictions before committing.

- [ ] **AC0c (Open-ended scope enumeration):**
  Given a ticket uses open-ended scope language ("and any other relevant X"),
  When the agent processes that clause,
  Then it must either enumerate the candidates explicitly or ask the user which ones apply — not silently drop the open-ended clause.

- [ ] **AC1 (Clarification gate):**
  Given a feature request is ambiguous or underspecified,
  When `/specify` processes the request,
  Then the command explicitly asks the user the minimum necessary clarification questions before finalizing `prd.md`.

- [ ] **AC2 (Question discipline):**
  Given `/specify` enters the clarification step,
  When it formulates questions,
  Then it asks only questions that materially affect the PRD or downstream implementation — not generic brainstorming prompts.

- [ ] **AC3 (Clarification outcome handling):**
  Given the user answers clarification questions,
  When `/specify` incorporates the answers,
  Then it proceeds normally with the feature slug, PRD generation, and handoff flow.

- [ ] **AC4 (Architect review checkpoint):**
  Given `/architect` has produced a proposed architecture,
  When it is ready to finalize,
  Then it presents or summarizes the proposed architecture and requests user review/feedback before committing `architecture.md` and writing the next-phase handoff.

- [ ] **AC5 (Feedback incorporation):**
  Given the user provides feedback on the proposed architecture,
  When `/architect` processes the feedback,
  Then it revises the architecture accordingly before writing the final artifact.

- [ ] **AC6 (No hidden auto-advance):**
  Given a command has reached a required human checkpoint,
  When the user has not yet reviewed or responded,
  Then the command does not silently finalize the artifact or advance the pipeline.

- [ ] **AC7 (Workflow compatibility):**
  Given the updated commands include human checkpoints,
  When the user interacts with `/specify` or `/architect`,
  Then the command behavior clearly signals when it is waiting for clarification/review versus when the phase is complete.

- [ ] **AC8 (Verification):**
  Given the new checkpoint behavior is implemented,
  When contract tests or structural checks run,
  Then they verify the clarification/review checkpoint language exists in the command files and supporting workflow instructions.

### Screen States

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| `/specify` clarification prompt | No ambiguity detected — skip to PRD generation | Agent analyzing ticket for ambiguity | Questions displayed; awaiting user input | Ticket reference not found or unreadable | Answers incorporated; PRD generation proceeds |
| `/architect` review checkpoint | N/A (always presents proposal) | Agent drafting architecture proposal | Proposed architecture summary displayed; awaiting feedback | Architecture generation failed | Feedback incorporated; final artifact committed |

### Out of Scope
- Changes to phases 3–7 commands
- Automated ambiguity detection heuristics (the agent uses its judgment, not a rules engine)
- Changes to the handoff.json schema
- Modifying the `/implement`, `/review`, or `/document` commands

### Dependencies
- **Assumption:** The clarification gate in `/specify` relies on the agent's judgment to detect ambiguity. No deterministic ambiguity classifier is required.
- **Assumption:** AC0 ticket fidelity applies only when `/specify` receives an explicit ticket reference. Ad-hoc feature requests without a ticket reference skip the fidelity check.
- **Prerequisite:** `commands/specify.md` and `commands/architect.md` must exist and be editable.

### RICE Score
Reach: High (every feature cycle) | Impact: High (prevents #2 recurring defect class) | Confidence: High | Effort: Medium | **Score: 9**

### Definition of Done
- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
