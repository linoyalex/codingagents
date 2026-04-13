# Review: integration-test-coverage
**Generated:** 2026-04-13T11:38:35Z

## Findings
- [BLOCKING] [commands/test-design.md:28] The Phase 3 command still only tells the QA agent where to write contract tests (`tests/contracts/$ARGUMENTS.test.ts`) and E2E tests (`tests/e2e/$ARGUMENTS.spec.ts`), even though the updated TDD skill now requires a third, separately named integration artifact: `[feature].integration.test.*` ([skills/tdd/SKILL.md:46]( /Users/linoy/projects/codingagents/skills/tdd/SKILL.md:46 )). As written, an agent can follow the command exactly and still have no canonical place to create the required integration test shell, which means the main user-facing behavior of this feature is not operationalized.
- [MAJOR] [tests/contracts/integration-test-coverage.test.js:159] The new contract suite never checks that Phase 3 instructions actually tell the agent to create an integration test file or otherwise provide a concrete output location for it. The tests only regex-match prose about imports/assertions, so this branch can pass all feature tests while the command still omits the integration-test artifact wiring.

## Open Questions
- None.

## Merge Recommendation
- REQUEST CHANGES

## Verification Notes
- Reviewed `git diff main...HEAD`.
- Ran `node --test tests/contracts/integration-test-coverage.test.js`.
- Ran `node --test tests/contracts/skill-size-convention.test.js`.
- Ran `node --test tests/node/core-skill-contracts.test.js tests/node/checkpoint.test.js tests/node/pipeline-handoff-guards.test.js tests/node/resolve-feature.test.js`.
