Use the developer subagent.

Your task: implement feature $ARGUMENTS using strict TDD.

Rules:
- Read ONLY: docs/architecture/ARCH-$ARGUMENTS.md + test files in tests/contracts/ and tests/e2e/
- Do NOT read the whole codebase — read only files you need to implement a specific failing test
- Follow the RED → GREEN → REFACTOR cycle with a commit at each step:

  Step 1 RED:
    Run: pnpm test (confirm all new tests fail)
    Commit: "test: $ARGUMENTS RED — all tests failing"

  Step 2 GREEN:
    Write the minimum code to make tests pass (no over-engineering)
    Run: pnpm test (confirm all pass)
    Run: pnpm lint && pnpm typecheck (must be clean)
    Commit: "feat: $ARGUMENTS GREEN — all tests passing"

  Step 3 REFACTOR:
    Clean up without changing behaviour — better names, extract duplication, remove dead code
    Run: pnpm test (confirm still passing)
    Commit: "refactor: $ARGUMENTS cleanup"

Context discipline:
- If context reaches 60%: run /compact immediately
- If you need to read more than 10 files: you are implementing too much at once — split the task

After all three commits, print:
"Phase 5 complete. Next: /review (in a NEW session)"