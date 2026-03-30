---
description: Review the current branch against main (run in a fresh session)
user-invocable: true
---

Use the code-reviewer subagent.

⚠️  This command must be run in a FRESH session — not the session that wrote the code.

Your task: review the current branch against main.

Rules:
- Run: git diff main...HEAD (read the diff, not individual files)
- If a finding requires context, open that ONE file — not its whole module
- Write findings to: docs/review-$ARGUMENTS.md using the structured format:
    ## Review: [branch]
    **Verdict:** Approve / Request Changes / Needs Discussion
    **BLOCKING issues:** (file:line, description)
    **Suggestions:** (file:line, non-blocking)
    **Tests:** Adequate / Inadequate
    **Secrets scan:** Clean / Issues found
- Also run these checks and include output:
    grep -rn "console\.log" $(git diff main...HEAD --name-only | grep -v test)
    grep -rn "\.skip\|xtest" $(git diff main...HEAD --name-only | grep "test\|spec")

Commit docs/review-$ARGUMENTS.md with message: "review: $ARGUMENTS findings"

After committing, print one of:
- "Phase 6 complete — APPROVED. Next: /document $ARGUMENTS (after merge)"
- "Phase 6 — REQUEST CHANGES. Developer must address BLOCKING items, then re-run /review"