---
description: Check pipeline status and recommend next step
user-invocable: true
---
Check the current state of the development pipeline and tell me exactly where to resume.

Steps:
1. Read .claude/pipeline-checkpoint.json if it exists
2. Check which phase artifacts exist for the current feature:
   - docs/features/<feature>/prd.md → Phase 1 complete
   - docs/features/<feature>/architecture.md → Phase 2 complete
   - tests/contracts/ or tests/e2e/ → Phase 3 complete
   - docs/features/<feature>/security-audit.md → Phase 4 complete
   - Run: git log --oneline -5 to see recent commits
   - docs/features/<feature>/review.md → Phase 6 complete
3. Run: pnpm test 2>&1 | tail -5 (quick test status)
4. Report:
   - Last completed phase
   - Next recommended action with exact command to run
   - Any BLOCKING issues found in docs/features/*/security-audit.md or docs/features/*/review.md

Keep this response under 20 lines.
