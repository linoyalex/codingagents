---
description: Check pipeline status and show where to resume
user-invocable: true
---
Check the current state of the development pipeline and tell me exactly where to resume.

Steps:
1. Read .claude/pipeline-checkpoint.json if it exists
2. Check which phase artifacts exist:
   - docs/prd.md → Phase 1 complete
   - docs/architecture/ → Phase 2 complete
   - tests/contracts/ or tests/e2e/ → Phase 3 complete
   - docs/security-audit-* → Phase 4 complete
   - Run: git log --oneline -5 to see recent commits
   - docs/review-* → Phase 6 complete
3. Run: pnpm test 2>&1 | tail -5 (quick test status)
4. Report:
   - Last completed phase
   - Next recommended action with exact command to run
   - Any BLOCKING issues found in docs/security-audit-* or docs/review-*

Keep this response under 20 lines.