---
description: Write failing test shells from specs (Phase 3)
user-invocable: true
---

## Skill References

| Skill | Source path |
|-------|-------------|
| tdd | skills/tdd/SKILL.md |
| verification-gate | skills/verification-gate/SKILL.md |

Use the qa subagent.

First, load your skills:
- Read .claude/skills/tdd/SKILL.md for test structure, naming, and coverage rules
- Read .claude/skills/verification-gate/SKILL.md for Phase 3 verification

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-sonnet-4-6.

Before reading any implementation files, run:
`node .claude/helpers/resolve-feature.js --command test-design --phase 3 --args "$ARGUMENTS"`

- If that command exits non-zero, stop and relay the error.
- If it succeeds, treat the returned `feature` as the only valid target for this phase.
- For the rest of this command, use that resolved feature slug in place of `$ARGUMENTS`.

Your task: write failing test shells for feature: $ARGUMENTS

Rules:
- Read ONLY: docs/features/$ARGUMENTS/prd.md + docs/features/$ARGUMENTS/architecture.md
- Do NOT read src/ — tests must be derived from the spec, not the implementation
- Write contract tests to: tests/contracts/$ARGUMENTS.test.ts
- Write integration tests to: tests/integration/$ARGUMENTS.integration.test.ts
- Write E2E tests to: tests/e2e/$ARGUMENTS.spec.ts
- Tests must FAIL when run right now (RED state — no implementation exists yet)
- Use the TDD skill's reliability rules: identify happy, edge, and misuse/abuse cases when relevant, and make sure the first RED failure is for the intended reason
- Cover: one test per AC, one error/empty state per screen, one permission boundary check
- Name the primary production-wiring test seam in the test plan or top-of-file comments so implementation knows which test proves the feature is wired correctly
- Follow test naming conventions from the tdd skill
- Run linter on test files before committing: `npm run lint -- tests/`
  Fix any lint errors — test files must be lint-clean even in RED state
- Integration test verification (blocking): at least one test must import the production entry point
  AND contain an assertion on visible output. Import-only shells, utility imports, or tests that call
  modules directly do not satisfy this check. This is a blocking gate — Phase 3 cannot complete without it.
- Run Phase 3 verification from verification-gate skill
- Run the tests to confirm they fail, then commit with message: "test: $ARGUMENTS failing shells (RED)"

## Output

- Write contract tests to: tests/contracts/$ARGUMENTS.test.ts
- Write integration tests to: tests/integration/ following [feature].integration.test.* naming pattern
- Write E2E tests to: tests/e2e/$ARGUMENTS.spec.ts

After committing, write .claude/handoff.json with:
  feature: $ARGUMENTS, phase: 3, goal: "Design-time security audit",
  scope: "Phase 4 security gate only", relevant_files: ["docs/features/$ARGUMENTS/prd.md", "docs/features/$ARGUMENTS/architecture.md"],
  acceptance_criteria: [from the PRD], verification_commands: ["ls docs/features/$ARGUMENTS/security-audit.md"],
  produced_by: "qa", timestamp: current ISO 8601

Then print:
"Phase 3 complete. Next: /security-gate $ARGUMENTS"
