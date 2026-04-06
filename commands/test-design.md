---
description: Write failing test shells from specs (Phase 3)
user-invocable: true
---
Use the qa subagent.

First, load your skills:
- Read .claude/skills/tdd/SKILL.md for test structure, naming, and coverage rules
- Read .claude/skills/verification-gate/SKILL.md for Phase 3 verification

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-sonnet-4-6.

First, read .claude/handoff.json. If it references a different feature or
unexpected phase, warn the user before proceeding.

Your task: write failing test shells for feature: $ARGUMENTS

Rules:
- Read ONLY: docs/features/$ARGUMENTS/prd.md + docs/features/$ARGUMENTS/architecture.md
- Do NOT read src/ — tests must be derived from the spec, not the implementation
- Write contract tests to: tests/contracts/$ARGUMENTS.test.ts
- Write E2E tests to: tests/e2e/$ARGUMENTS.spec.ts
- Tests must FAIL when run right now (RED state — no implementation exists yet)
- Cover: one test per AC, one error/empty state per screen, one permission boundary check
- Follow test naming conventions from the tdd skill
- Run linter on test files before committing: `npm run lint -- tests/`
  Fix any lint errors — test files must be lint-clean even in RED state
- Run Phase 3 verification from verification-gate skill
- Run the tests to confirm they fail, then commit with message: "test: $ARGUMENTS failing shells (RED)"

After committing, write .claude/handoff.json with:
  feature: $ARGUMENTS, phase: 3, goal: "Design-time security audit",
  scope: "Phase 4 security gate only", relevant_files: ["docs/features/$ARGUMENTS/prd.md", "docs/features/$ARGUMENTS/architecture.md"],
  acceptance_criteria: [from the PRD], verification_commands: ["ls docs/features/$ARGUMENTS/security-audit.md"],
  produced_by: "qa", timestamp: current ISO 8601

Then print:
"Phase 3 complete. Next: /security-gate $ARGUMENTS"
