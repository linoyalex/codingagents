---
description: Produce a PRD for a feature request
user-invocable: true
---
Use the product-owner subagent and the ux-designer subagent.

Your combined task: produce docs/prd.md for the following feature request:

$ARGUMENTS

Rules:
- Read nothing except this feature request — no src/, no existing files
- product-owner writes: User Story, Acceptance Criteria (Given/When/Then), Out of Scope
- ux-designer adds: Screen States table (Empty / Loading / Populated / Error / Success per screen)
- Keep the output under 150 lines
- Commit docs/prd.md when done with message: "spec: [feature name] PRD"

After committing, print:
"Phase 1 complete. Next: /architect [feature-name]"