# Review: clarification-checkpoints
**Generated:** 2026-04-14T01:46:23Z

## Findings
- [BLOCKING] [commands/specify.md:48] The new clarification checkpoint is not durably resumable for ambiguous requests that do not include a ticket reference. The checkpoint handoff always records `relevant_files: ["docs/issues/tickets/ISS-NNN.md"]`, and its no-ticket fallback for `source_spec` points at `docs/features/<feature-slug>/prd.md` before that PRD exists ([commands/specify.md:48](/Users/linoy/projects/codingagents-029/commands/specify.md:48), [commands/specify.md:50](/Users/linoy/projects/codingagents-029/commands/specify.md:50)). After an interruption, `.claude/handoff.json` contains neither the original request text nor any resolvable source artifact for the no-ticket path, so `/specify` cannot actually "resume the clarification gate from the previous session" as instructed ([commands/specify.md:20](/Users/linoy/projects/codingagents-029/commands/specify.md:20)). The current durability tests only assert that the checkpoint block mentions the required field names and that "no ticket" skips fidelity; they never verify a resumable handoff for the no-ticket clarification path ([tests/contracts/clarification-checkpoints.test.js:451](/Users/linoy/projects/codingagents-029/tests/contracts/clarification-checkpoints.test.js:451), [tests/e2e/clarification-checkpoints.spec.js:213](/Users/linoy/projects/codingagents-029/tests/e2e/clarification-checkpoints.spec.js:213)).

## Open Questions
- Should the no-ticket clarification checkpoint persist the raw user request in handoff metadata, or should it require deriving and writing a different resolvable source artifact before the phase can pause?

## Merge Recommendation
- REQUEST CHANGES

## Verification Notes
- Reviewed `git diff main...HEAD`.
- Verified changed command, skill, schema, and test files.
- Ran: `node --test tests/contracts/clarification-checkpoints.test.js tests/e2e/clarification-checkpoints.spec.js tests/integration/clarification-checkpoints.integration.test.js`
