---
description: Produce an architecture decision record (Phase 2)
user-invocable: true
---

## Skill References

| Skill | Source path |
|-------|-------------|
| architecture-decision | skills/architecture-decision/SKILL.md |
| verification-gate | skills/verification-gate/SKILL.md |

Use the architect subagent.

First, load your skills:
- Read .claude/skills/architecture-decision/SKILL.md for ADR and ARCH templates
- Read .claude/skills/verification-gate/SKILL.md for Phase 2 verification

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-opus-4-6.

Before reading any implementation files, run:
`node .claude/helpers/resolve-feature.js --command architect --phase 2 --args "$ARGUMENTS"`

- If that command exits non-zero, stop and relay the error.
- If it succeeds, treat the returned `feature` as the only valid target for this phase.
- For the rest of this command, use that resolved feature slug in place of `$ARGUMENTS`.

If .claude/handoff.json has `checkpoint_pending: "architecture-review"`, resume the review
checkpoint from the previous session rather than restarting the phase.

Your task: produce docs/features/$ARGUMENTS/architecture.md

Rules:
- Read ONLY: docs/features/$ARGUMENTS/prd.md + the Architecture Notes section of CLAUDE.md
  (If the repo has a docs/CLAUDE.md, read that file for project-specific architecture context instead of the root template)
- If you need to understand an existing pattern, read ONE representative file — not a whole module
- Never Glob src/
- Include a `**Generated:** <current ISO 8601 timestamp>` line immediately after the document's top-level heading. On regeneration, always replace the prior timestamp with the current time — do not preserve stale values.
- Follow the architecture.md Template from the architecture-decision skill
- Include the architecture skill's reliability fields: decision confidence, revisit trigger, rollback/fallback, and trust boundaries when relevant
- If a key architectural assumption is still ambiguous, record it explicitly instead of smoothing it over
- Output must be under 200 lines

## Review Checkpoint

After drafting the architecture document, present a summary of the proposed architecture
to the user and request user review before finalizing. Wait for user feedback and approval.
Do not advance without user response.

Before stopping, write .claude/handoff.json with all required fields so the checkpoint
survives session interruption:
  feature: $ARGUMENTS, phase: 2, goal: "Review architecture proposal with user",
  scope: "Phase 2 architecture review", relevant_files: ["docs/features/$ARGUMENTS/prd.md", "docs/features/$ARGUMENTS/architecture.md"],
  acceptance_criteria: ["pending-architecture-review"], verification_commands: ["cat .claude/handoff.json"],
  source_spec: "docs/features/$ARGUMENTS/prd.md",
  checkpoint_pending: "architecture-review", produced_by: "architect", timestamp: current ISO 8601
Signal that the phase is awaiting review — this is not yet complete. The phase is still in
review until the user approves.

Wait for user feedback. Do not finalize or commit until the user responds.

If the user requests changes: incorporate the feedback, revise the architecture, and re-present
the summary. Multiple revision cycles are allowed. Continue until the user approves.

If the user approves: clear `checkpoint_pending`, then proceed to finalize.

Do not finalize the architecture without explicit user approval. The phase must not advance
without the user confirming the architecture is acceptable.

After approval, run Phase 2 verification from verification-gate skill, then:
- Commit when done with message: "arch: $ARGUMENTS architecture decision record"

After committing, write .claude/handoff.json with:
  feature: $ARGUMENTS, phase: 2, goal: "Write failing test shells from specs",
  scope: "Phase 3 test design only", relevant_files: ["docs/features/$ARGUMENTS/prd.md", "docs/features/$ARGUMENTS/architecture.md"],
  acceptance_criteria: [from the PRD], verification_commands: ["ls tests/contracts/$ARGUMENTS.test.ts"],
  source_spec: "docs/features/$ARGUMENTS/prd.md",
  produced_by: "architect", timestamp: current ISO 8601

Then print:
"Phase 2 complete. Next: /test-design $ARGUMENTS"
