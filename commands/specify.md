---
description: Write a PRD from a feature request (Phase 1)
user-invocable: true
---

## Skill References

| Skill | Source path |
|-------|-------------|
| prd-writing | skills/prd-writing/SKILL.md |
| verification-gate | skills/verification-gate/SKILL.md |

Use the product-owner subagent and the ux-designer subagent.

First, load your skills:
- Read .claude/skills/prd-writing/SKILL.md for story template, AC format, and Ticket Fidelity Procedure
- Read .claude/skills/verification-gate/SKILL.md for Phase 1 verification

Your combined task: produce a PRD for the following feature request:

$ARGUMENTS

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-haiku-4-5.

If .claude/handoff.json has `checkpoint_pending: "clarification"`, resume the clarification
gate from the previous session rather than restarting the phase.

## Step 1 — Ticket Fidelity Check

If the request includes a ticket reference (e.g. ISS-NNN), perform the Ticket Fidelity
Procedure from the prd-writing/SKILL.md before writing any ACs. Transcribe ticket ACs
faithfully — do not paraphrase. If the ticket file is not found, do not silently skip
fidelity — ask the user whether to proceed in degraded mode or stop. If no ticket reference
is provided, skip fidelity check and proceed directly to Step 2.

## Step 2 — Clarification Gate

Before finalizing the PRD, check for ambiguity. Ask clarification questions only if
one or more of these triggers are present (material questions only — do not ask
questions whose answers would not change the PRD):

**Clarification triggers:**
- An undefined term that changes the scope of an AC
- ACs conflict with each other or contradict an existing convention
- Scope is open-ended without enumeration (e.g., "and other relevant cases")
- A constraint contradicts a convention in CLAUDE.md
- Required PRD fields cannot be inferred from the request

If any trigger fires: ask the minimum necessary clarification questions, then STOP and
wait for the user to respond before finalizing the PRD. Before stopping, write
.claude/handoff.json with all required fields so the checkpoint survives session interruption:
  feature: <feature-slug>, phase: 1,
  goal: "Resolve clarification for: <brief summary of the original feature request from $ARGUMENTS>",
  scope: "Phase 1 clarification gate — pending questions: <list the clarification questions asked>",
  relevant_files: ["docs/issues/tickets/ISS-NNN.md"] (if ticket exists, otherwise []),
  acceptance_criteria: ["pending-clarification"], verification_commands: ["cat .claude/handoff.json"],
  source_spec: "docs/issues/tickets/ISS-NNN.md" (if ticket exists, otherwise "docs/features/<feature-slug>/prd.md"),
  checkpoint_pending: "clarification", produced_by: "product-owner", timestamp: current ISO 8601
Note: include the original request summary in goal and the pending questions in scope so that
restore-context.js can surface them on session resumption. The source_spec file may not exist
yet for no-ticket requests — the validator relaxes the file-existence check for clarification checkpoints.

If the user provides partial answers or declines to answer: record each unanswered question as an explicit assumption in the Dependencies section, then proceed.
Do not block indefinitely on optional clarification.

If no triggers fire: proceed directly to Step 3.

## Review Feedback Loop

If you are revising an existing PRD after review, reuse the existing feature slug/folder
instead of inventing a new one.

Before rewriting the PRD, read any phase-relevant PRD review artifacts already present
in `docs/features/<feature-slug>/`, especially:
- `review-prd-<feature-slug>.md`
- `review-codex-prd-<feature-slug>.md`

Treat those findings as the review scope unless the user explicitly broadens scope.

When you address a finding, append or refresh a `## Resolution Notes` section in each
review artifact you used. For every finding you touched, add one bullet in this shape:
- [ADDRESSED | DEFERRED | DISPUTED] <finding label or short quote> — <what changed and where, or why it remains open>

Do not delete the original findings. Later reviewers will verify these notes against
the revised PRD.

## Step 3 — Write PRD

After clarification is resolved (or if no clarification was needed), incorporate user
answers into the PRD, then:

- First, derive a short feature slug from the request using lowercase kebab-case
  (e.g. "Add user auth flow" → "user-auth", "Search filters for dashboard" → "search-filters")
- Create docs/features/<feature-slug>/ if it doesn't exist
- Write the PRD to docs/features/<feature-slug>/prd.md
- Read only the feature request, the ticket (if referenced in Step 1), docs/CLAUDE.md (for convention verification), and any existing PRD review artifacts in `docs/features/<feature-slug>/` — no src/, no unrelated files
- product-owner writes: User Story, Acceptance Criteria (Given/When/Then), Out of Scope
- ux-designer adds: Screen States table (Empty / Loading / Populated / Error / Success per screen)
- Include a `**Generated:** <current ISO 8601 timestamp>` line immediately after the document's top-level heading. On regeneration, always replace the prior timestamp with the current time — do not preserve stale values.
- Follow the PRD Document Template from the prd-writing skill
- Front-load the clearest success signal and observable outcomes; do not hide critical behavior in vague prose
- If the request is ambiguous, capture assumptions or dependencies explicitly instead of inventing hidden policy
- Keep the output under 150 lines
- Run Phase 1 verification from verification-gate skill
- Commit docs/features/<feature-slug>/prd.md when done with message: "spec: [feature name] PRD"

After committing, write .claude/handoff.json with:
  feature: <feature-slug>, phase: 1, goal: "Produce architecture decision record",
  scope: "Phase 2 architecture only", relevant_files: ["docs/features/<feature-slug>/prd.md"],
  acceptance_criteria: [from the PRD], verification_commands: ["ls docs/features/<feature-slug>/architecture.md"],
  source_spec: "docs/features/<feature-slug>/prd.md",
  produced_by: "product-owner", timestamp: current ISO 8601

Then print:
"Phase 1 complete. Next: /architect [feature-name]"
