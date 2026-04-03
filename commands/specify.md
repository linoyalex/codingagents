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

Rules:
- First, derive a short feature slug from the request using lowercase kebab-case
  (e.g. "Add user auth flow" → "user-auth", "Search filters for dashboard" → "search-filters")
- Create docs/features/<feature-slug>/ if it doesn't exist
- Write the PRD to docs/features/<feature-slug>/prd.md
- Read nothing except this feature request — no src/, no existing files
- product-owner writes: User Story, Acceptance Criteria (Given/When/Then), Out of Scope
- ux-designer adds: Screen States table (Empty / Loading / Populated / Error / Success per screen)
- Follow the PRD Document Template from the prd-writing skill
- Keep the output under 150 lines
- Run Phase 1 verification from verification-gate skill
- Commit docs/features/<feature>/prd.md when done with message: "spec: [feature name] PRD"

After committing, print:
"Phase 1 complete. Next: /architect [feature-name]"
