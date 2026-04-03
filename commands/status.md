---
description: Check pipeline status and recommend next step
user-invocable: true
---
Check the current state of the development pipeline and tell me exactly where to resume.

Note: pipeline state comes from checkpoint.json and handoff.json (machine contracts).
The optional .claude/session-note.md is a human-readable session summary — read it for
context if it exists, but do not use it as a source of pipeline phase truth.

Steps:
1. Read .claude/pipeline-checkpoint.json if it exists — it contains the active feature name
2. If no checkpoint, read .claude/handoff.json for the feature name
3. If neither exists, list docs/features/ and use the most recent directory
4. For the identified feature, check which phase artifacts exist:
   - docs/features/<feature>/prd.md → Phase 1 complete
   - docs/features/<feature>/architecture.md → Phase 2 complete
   - tests/contracts/<feature>.test.ts or tests/e2e/<feature>.spec.ts → Phase 3 complete
   - docs/features/<feature>/security-audit.md → Phase 4 complete
   - Run: git log --oneline -5 to see recent commits
   - docs/features/<feature>/review.md → Phase 6 complete
5. Run: pnpm test 2>&1 | tail -5 (quick test status)
6. Report:
   - Active feature name
   - Last completed phase
   - Next recommended action with exact command to run
   - Any BLOCKING issues found in docs/features/<feature>/security-audit.md or docs/features/<feature>/review.md

Keep this response under 20 lines.
