---
description: Produce an architecture decision record (Phase 2)
user-invocable: true
---
Use the architect subagent.

First, load your skills:
- Read .claude/skills/architecture-decision/SKILL.md for ADR and ARCH templates
- Read .claude/skills/verification-gate/SKILL.md for Phase 2 verification

Your task: produce docs/architecture/ARCH-$ARGUMENTS.md

Rules:
- Read ONLY: docs/prd.md + the Architecture Notes section of CLAUDE.md
- If you need to understand an existing pattern, read ONE representative file — not a whole module
- Never Glob src/
- Follow the ARCH-[feature].md Template from the architecture-decision skill
- Output must be under 100 lines
- Run Phase 2 verification from verification-gate skill
- Commit when done with message: "arch: ARCH-$ARGUMENTS decision record"

After committing, print:
"Phase 2 complete. Next: /test-design $ARGUMENTS"
