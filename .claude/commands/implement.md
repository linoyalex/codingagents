---
description: TDD implementation of a feature (Phase 5)
user-invocable: true
---
Use the developer subagent.

First, load your skills:
- Read .claude/skills/tdd/SKILL.md for the TDD cycle, test structure, property-based testing, and commit protocol
- Read .claude/skills/structured-logging/SKILL.md for structured log format, log levels, and PII rules
- Read .claude/skills/verification-gate/SKILL.md for Phase 5 verification

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-sonnet-4-6.

First, read .claude/handoff.json. If it references a different feature or
unexpected phase, warn the user before proceeding.

Your task: implement feature $ARGUMENTS using strict TDD.

Rules:
- Read ONLY: docs/features/$ARGUMENTS/architecture.md + test files in tests/contracts/ and tests/e2e/
- Do NOT read the whole codebase — read only files you need to implement a specific failing test
- Follow the RED → GREEN → REFACTOR cycle from the tdd skill with a commit at each step:

  Step 1 RED:
    Run tests (confirm all new tests fail)
    Commit: "test: $ARGUMENTS RED — all tests failing"

  Step 2 GREEN:
    Write the minimum code to make tests pass (no over-engineering)
    Run tests → must pass
    Run lint + typecheck → fix ALL errors before proceeding:
      npm run lint -- --fix    # auto-fix what's safe
      npx tsc --noEmit         # type errors require manual fix
      If lint errors remain after --fix, fix them manually now — do not defer to REFACTOR
    Commit: "feat: $ARGUMENTS GREEN — all tests passing, lint clean"

  Step 3 REFACTOR:
    Clean up without changing behaviour
    Run tests + lint + typecheck (confirm all still passing and clean)
    Commit: "refactor: $ARGUMENTS cleanup"

Context discipline:
- If context reaches 60%: run /compact immediately
- If you need to read more than 10 files: split the task

After all three commits, run Phase 5 verification from verification-gate skill.

Then write .claude/handoff.json with:
  feature: $ARGUMENTS, phase: 5, goal: "Diff-based code review in fresh context",
  scope: "Phase 6 review only", relevant_files: ["docs/features/$ARGUMENTS/architecture.md", "docs/features/$ARGUMENTS/prd.md"],
  acceptance_criteria: [from the PRD], verification_commands: ["git diff main...HEAD", "ls docs/features/$ARGUMENTS/review.md"],
  produced_by: "developer", timestamp: current ISO 8601

Then print:
"Phase 5 complete. Next: /review $ARGUMENTS (in a NEW session)"
