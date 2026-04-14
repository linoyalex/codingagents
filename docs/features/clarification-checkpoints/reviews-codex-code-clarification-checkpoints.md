# Review: clarification-checkpoints
**Generated:** 2026-04-14T02:35:24Z

## Findings
- [BLOCKING] [hooks/restore-context.js:69] The new checkpoint flow is still not resumable in a fresh session because `restore-context.js` never surfaces `checkpoint_pending`. The restored context prints feature/goal/scope/ACs/verification commands, but omits the one field that tells the next agent it should resume a clarification or architecture review checkpoint instead of continuing the normal phase flow. I reproduced this with a handoff containing `"checkpoint_pending": "clarification"`: the hook exited 0 and emitted no checkpoint state at all. That directly contradicts the architecture’s durability mechanism and means a resumed agent has no machine-restored signal that the phase is paused for user input.
- [MAJOR] [hooks/checkpoint.js:172] The `source_spec` existence guard is now disabled for every checkpoint handoff, not just the no-ticket `/specify` case that needs it. A checkpoint with `"checkpoint_pending": "architecture-review"` and `source_spec: "docs/features/demo/DOES-NOT-EXIST.md"` currently validates successfully, even though `/architect` checkpoint resumes are supposed to anchor on an existing PRD. This weakens the `source_spec` contract from “resolvable pointer” to “best effort string” for all checkpoint states, so typos or stale paths can now slip past the Stop hook undetected. The added tests lock in that broad relaxation for the clarification case, but there is no coverage asserting that ticket-backed or architecture-review checkpoints still require a real source file ([tests/node/checkpoint.test.js](/Users/linoy/projects/codingagents-029/tests/node/checkpoint.test.js:106), [tests/e2e/clarification-checkpoints.spec.js](/Users/linoy/projects/codingagents-029/tests/e2e/clarification-checkpoints.spec.js:174)).

## Open Questions
- None.

## Merge Recommendation
- REQUEST CHANGES

## Verification Notes
- Reviewed `git diff main...HEAD`, `.claude/handoff.json`, and `docs/issues/tickets/ISS-029.md`.
- Ran `node --test tests/node/checkpoint.test.js`.
- Ran `node --test tests/contracts/clarification-checkpoints.test.js tests/e2e/clarification-checkpoints.spec.js tests/integration/clarification-checkpoints.integration.test.js`.
- Reproduced `restore-context.js` omitting `checkpoint_pending` from restored output and `checkpoint.validateHandoff()` accepting an `architecture-review` handoff whose `source_spec` file does not exist.
