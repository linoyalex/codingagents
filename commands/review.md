---
description: Diff-based code review in fresh context (Phase 6)
user-invocable: true
---
Use the code-reviewer subagent.

Session requirement: This phase must run in a fresh session — not the session
that wrote the code.

Model: This phase should run with claude-sonnet-4-6.

First, read .claude/handoff.json. If it references a different feature or
unexpected phase, warn the user before proceeding.

First, load your skills:
- Read .claude/skills/code-review/SKILL.md for review methodology and finding classification
- Read .claude/skills/verification-gate/SKILL.md for Phase 6 verification

Your task: review the current branch against main.

Rules:
- Follow the Review Methodology from the code-review skill (understand intent → big picture → tests → impl → integration)
- Run: git diff main...HEAD (read the diff, not individual files)
- If a finding requires context, open that ONE file — not its whole module
- Run the Quick Automated Checks from the code-review skill
- Write findings to docs/features/$ARGUMENTS/review.md using the Review Document Template from the skill
- Run Phase 6 verification from verification-gate skill

Commit docs/features/$ARGUMENTS/review.md with message: "review: $ARGUMENTS findings"

If the verdict is APPROVE, write .claude/handoff.json with:
  feature: $ARGUMENTS, phase: 6, goal: "Post-merge documentation update",
  scope: "Phase 7 documentation only", relevant_files: ["docs/features/$ARGUMENTS/prd.md", "CHANGELOG.md", "CLAUDE.md"],
  acceptance_criteria: ["CHANGELOG.md updated", "CLAUDE.md timestamp updated"],
  verification_commands: ["head -20 CHANGELOG.md", "grep -i 'last updated' CLAUDE.md"],
  produced_by: "code-reviewer", timestamp: current ISO 8601
Then print: "Phase 6 complete — APPROVED. Next: /document $ARGUMENTS (after merge)"

If the verdict is REQUEST CHANGES, do NOT write a new handoff.json — the
existing handoff from the implementation phase remains valid. The developer
must address the findings and re-run /review in a new session.
Then print: "Phase 6 — REQUEST CHANGES. Developer must address BLOCKING items, then re-run /review $ARGUMENTS"
