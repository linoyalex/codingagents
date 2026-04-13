---
description: Write a PRD from a feature request (Phase 1)
user-invocable: true
---
Use the product-owner subagent and the ux-designer subagent.

First, load your skills:
- Read .claude/skills/prd-writing/SKILL.md for story template and AC format
- Read .claude/skills/verification-gate/SKILL.md for Phase 1 verification

Your combined task: produce a PRD for the following feature request:

$ARGUMENTS

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-haiku-4-5.

Rules:
- First, derive a short feature slug from the request using lowercase kebab-case
  (e.g. "Add user auth flow" → "user-auth", "Search filters for dashboard" → "search-filters")
- Create docs/features/<feature-slug>/ if it doesn't exist
- Write the PRD to docs/features/<feature-slug>/prd.md
- Read nothing except this feature request — no src/, no existing files
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
  produced_by: "product-owner", timestamp: current ISO 8601

Then print:
"Phase 1 complete. Next: /architect [feature-name]"
