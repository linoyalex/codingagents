---
description: Diff-based code review in fresh context (Phase 6)
user-invocable: true
---
Use the code-reviewer subagent.

⚠️  This command must be run in a FRESH session — not the session that wrote the code.

First, load your skills:
- Read .claude/skills/code-review/SKILL.md for review methodology and finding classification
- Read .claude/skills/verification-gate/SKILL.md for Phase 6 verification

Your task: review the current branch against main.

Rules:
- Follow the Review Methodology from the code-review skill (understand intent → big picture → tests → impl → integration)
- Run: git diff main...HEAD (read the diff, not individual files)
- If a finding requires context, open that ONE file — not its whole module
- Run the Quick Automated Checks from the code-review skill
- Write findings to docs/reviews/review-$ARGUMENTS.md using the Review Document Template from the skill
- Run Phase 6 verification from verification-gate skill

Commit docs/reviews/review-$ARGUMENTS.md with message: "review: $ARGUMENTS findings"

After committing, print one of:
- "Phase 6 complete — APPROVED. Next: /document $ARGUMENTS (after merge)"
- "Phase 6 — REQUEST CHANGES. Developer must address BLOCKING items, then re-run /review"
