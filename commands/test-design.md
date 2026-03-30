---
description: Test design and implementation based on product and architecture specs
user-invocable: true
---

Use the qa subagent.

Your task: write failing test shells for feature: $ARGUMENTS

Rules:
- Read ONLY: docs/prd.md + docs/architecture/ARCH-$ARGUMENTS.md
- Do NOT read src/ — tests must be derived from the spec, not the implementation
- Write contract tests to: tests/contracts/$ARGUMENTS.test.ts
- Write E2E tests to: tests/e2e/$ARGUMENTS.spec.ts
- Tests must FAIL when run right now (RED state — no implementation exists yet)
- Cover: one test per AC, one error/empty state per screen, one permission boundary check
- Run the tests to confirm they fail, then commit with message: "test: $ARGUMENTS failing shells (RED)"

After committing, print:
"Phase 3 complete. Next: /security-gate $ARGUMENTS"