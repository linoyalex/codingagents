---
description: Produce an architecture decision record for a feature
user-invocable: true
---

Use the architect subagent.

Your task: produce docs/architecture/ARCH-$ARGUMENTS.md

Rules:
- Read ONLY: docs/prd.md + the Architecture Notes section of CLAUDE.md
- If you need to understand an existing pattern, read ONE representative file — not a whole module
- Never Glob src/
- Output must be under 100 lines and follow the ARCH template in your role definition
- Commit when done with message: "arch: ARCH-$ARGUMENTS decision record"

After committing, print:
"Phase 2 complete. Next: /test-design $ARGUMENTS"