---
description: TDD implementation of a feature (Phase 5)
user-invocable: true
---
Use the developer subagent.

First, load your skills:
- Read .claude/skills/tdd/SKILL.md for the TDD cycle, test structure, property-based testing, and commit protocol
- Read .claude/skills/structured-logging/SKILL.md for structured log format, log levels, and PII rules
- Read .claude/skills/verification-gate/SKILL.md for Phase 5 verification

Your task: implement feature $ARGUMENTS using strict TDD.

Rules:
- Read ONLY: docs/architecture/ARCH-$ARGUMENTS.md + test files in tests/contracts/ and tests/e2e/
- Do NOT read the whole codebase — read only files you need to implement a specific failing test
- Follow the RED → GREEN → REFACTOR cycle from the tdd skill with a commit at each step:

  Step 1 RED:
    Run tests (confirm all new tests fail)
    Commit: "test: $ARGUMENTS RED — all tests failing"

  Step 2 GREEN:
    Write the minimum code to make tests pass (no over-engineering)
    Run tests + lint + typecheck (must be clean)
    Commit: "feat: $ARGUMENTS GREEN — all tests passing"

  Step 3 REFACTOR:
    Clean up without changing behaviour
    Run tests (confirm still passing)
    Commit: "refactor: $ARGUMENTS cleanup"

Context discipline:
- If context reaches 60%: run /compact immediately
- If you need to read more than 10 files: split the task

After all three commits, run Phase 5 verification from verification-gate skill, then print:
"Phase 5 complete. Next: /review (in a NEW session)"
