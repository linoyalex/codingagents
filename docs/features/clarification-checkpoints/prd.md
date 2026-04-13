## Feature: Clarification Checkpoints & Ticket Fidelity
**Generated:** 2026-04-13T22:30:00Z
**Phase:** Specify | Date: 2026-04-13
**Source ticket:** [ISS-029](../../issues/tickets/ISS-029.md)

### User Story
As a pipeline operator,
I want `/specify` to verify PRD fidelity against the source ticket and ask clarification questions before finalizing, and `/architect` to present proposed architecture for review before committing,
So that ambiguity is caught before it compounds downstream and PRDs faithfully represent ticket intent.

### Acceptance Criteria

- [ ] **AC0 (Ticket fidelity check):**
  Given `/specify` receives a ticket reference (e.g., ISS-NNN),
  When the product-owner agent writes acceptance criteria,
  Then it must transcribe the ticket's ACs into Given/When/Then format — not paraphrase, broaden, or weaken them. If the PRD AC diverges from the ticket AC in scope, severity, or specificity, the agent must flag the divergence explicitly as an assumption rather than silently drifting.

- [ ] **AC0a (Convention citation verification):**
  Given the agent cites a project convention (e.g., line budgets, naming rules),
  When writing or referencing the value,
  Then it must verify the cited value against the current `docs/CLAUDE.md` (canonical) with fallback to root `CLAUDE.md` — do not rely on remembered or stale values.

- [ ] **AC0b (Internal contradiction check):**
  Given the agent has written all ACs,
  When performing a self-check,
  Then no two ACs may make mutually exclusive claims about the same field or behavior.

- [ ] **AC0c (Open-ended scope handling):**
  Given a ticket uses open-ended scope ("and any other relevant X"),
  When the agent processes that clause,
  Then it must either enumerate the candidates or ask the user which ones apply — not silently drop the open-ended clause.

- [ ] **AC1 (Clarification gate):**
  Given a feature request is ambiguous or underspecified,
  When `/specify` processes the request,
  Then the command explicitly asks the user the minimum necessary clarification questions before finalizing `prd.md`.
  **Clarification triggers (non-exhaustive):** ticket references undefined terms; ACs conflict with each other; scope is open-ended without enumeration; a stated constraint contradicts an existing convention; required fields (persona, outcome, error states) cannot be inferred from the request.

- [ ] **AC2 (Question discipline):**
  Given `/specify` enters the clarification step,
  When it formulates questions,
  Then it asks only questions that materially affect the PRD or downstream implementation — not generic brainstorming prompts.

- [ ] **AC3 (Clarification outcome handling):**
  Given the user answers clarification questions,
  When `/specify` incorporates the answers,
  Then it proceeds normally with the feature slug, PRD generation, and handoff flow.
  **Partial/refused answers:** If the user declines to answer or answers partially, `/specify` must record unanswered questions as explicit assumptions in the Dependencies section and proceed — it must not block indefinitely or silently drop the questions.

- [ ] **AC4 (Architect review checkpoint):**
  Given `/architect` has produced a proposed architecture,
  When it is ready to finalize,
  Then it presents or summarizes the proposed architecture and requests user review/feedback before committing `architecture.md` and writing the next-phase handoff.

- [ ] **AC5 (Feedback incorporation):**
  Given the user provides feedback on the proposed architecture,
  When `/architect` processes the feedback,
  Then it revises the architecture accordingly before writing the final artifact. Multiple revision cycles are allowed — the command signals "still in review" until the user approves.

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
  Then they verify: (a) checkpoint instruction language exists in the command files, (b) the command does not contain unconditional commit/finalize steps after the checkpoint section, and (c) the handoff is not written before the checkpoint instruction.

### Screen States

| Screen | Empty | Loading | Populated | Error | Awaiting Input | Success |
|--------|-------|---------|-----------|-------|----------------|---------|
| `/specify` clarification | No ambiguity detected — skip to PRD | Analyzing ticket for gaps | Questions displayed | Ticket not found or unreadable | Waiting for user answers; unanswered Qs shown | Answers incorporated; PRD proceeds |
| `/specify` fidelity check | No ticket reference — skip check | Comparing ticket ACs to PRD ACs | Divergences flagged as assumptions | Ticket ACs cannot be parsed | N/A | All ACs transcribed faithfully |
| `/architect` review | N/A | Drafting architecture | Proposal summary displayed | Generation failed | Waiting for feedback; revision cycle in progress | Feedback incorporated; artifact committed |

### Out of Scope
- Changes to phases 3–7 commands
- Automated ambiguity detection heuristics (agent uses judgment with documented triggers)
- Pipeline tier routing / tier inference (not in ISS-029 scope)
- Changes to `/implement`, `/review`, or `/document` commands

### Dependencies
- **Assumption:** Clarification triggers are guidance, not an exhaustive ruleset — agent judgment applies.
- **Assumption:** AC0 ticket fidelity applies only when `/specify` receives an explicit ticket reference.
- **Assumption:** `docs/CLAUDE.md` is the canonical convention source; root `CLAUDE.md` is the template for target projects.
- **Prerequisite:** `commands/specify.md` and `commands/architect.md` must exist and be editable.

### Fidelity Note
This PRD transcribes ISS-029 ACs 0–8 faithfully. The previous revision (rev2) added AC9–AC14 covering "tier inference" and "tier routing" which are **not present in ISS-029**. Those ACs have been removed as scope creep. If tier routing is desired, it should be tracked as a separate ticket.

### Codex Review Findings Addressed
- [HIGH] AC1 ambiguity threshold → added non-exhaustive clarification triggers
- [HIGH] AC3/AC6 unresolved states → added partial/refused answer handling in AC3; "Awaiting Input" column in screen states
- [MEDIUM] AC0a CLAUDE.md precedence → specified `docs/CLAUDE.md` as canonical
- [MEDIUM] AC8 verification too weak → strengthened to 3 structural checks (a, b, c)
- [MEDIUM] /architect flow under-specified → added revision cycle language in AC5; "Awaiting Input" state in screen table

### RICE Score
Reach: High (every feature cycle) | Impact: High (prevents #2 defect class) | Confidence: High | Effort: Medium | **Score: 9**

### Definition of Done
- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
