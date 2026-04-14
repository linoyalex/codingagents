# Review: clarification-checkpoints
**Generated:** 2026-04-14T03:10:52Z

## Findings
- [BLOCKING] [commands/specify.md:47] The no-ticket `/specify` checkpoint is still not durably resumable. The new handoff contract explicitly allows `relevant_files: []` and a non-existent `source_spec` for clarification checkpoints, and the validator/tests now accept that shape ([commands/specify.md](/Users/linoy/projects/codingagents-029/commands/specify.md:49), [tests/node/checkpoint.test.js](/Users/linoy/projects/codingagents-029/tests/node/checkpoint.test.js:106)). But on a fresh session `restore-context.js` restores only feature/goal/scope/ACs/verification commands plus the checkpoint flag ([hooks/restore-context.js](/Users/linoy/projects/codingagents-029/hooks/restore-context.js:69)). Reproducing with the new `checkpoint-no-ticket.json` fixture yields no original request text, no pending clarification questions, and no resolvable source file — just “Feature: new-feature” and “Checkpoint pending: clarification”. That means the documented “resume the clarification gate from the previous session” path still cannot actually continue for no-ticket requests.
- [MAJOR] [hooks/restore-context.js:30] Resumed checkpoint sessions are logged against the wrong model. `recordSessionStart()` always writes the *next-phase* agent/model from `PHASE_TO_NEXT_AGENT`, even when `checkpoint_pending` means the current session is resuming the same phase. Later, `checkpoint.js` lets `handoff.produced_by` override the agent but keeps the stale session-state model unless it is `unknown` ([hooks/checkpoint.js](/Users/linoy/projects/codingagents-029/hooks/checkpoint.js:234)). I reproduced this end-to-end: a resumed clarification checkpoint logged `specify (product-owner/claude-opus-4-6)`, and a resumed architecture-review checkpoint logged `architect (architect/claude-sonnet-4-6)`. Both should use the phase’s actual model, not the next phase’s model. Because `.session-state.json` is the bridge for token accounting, this systematically corrupts per-model usage metrics for resumed checkpoints.

## Open Questions
- None.

## Merge Recommendation
- REQUEST CHANGES

## Verification Notes
- Reviewed `git diff main...HEAD`, `.claude/handoff.json`, and `docs/issues/tickets/ISS-029.md`.
- Ran `node --test tests/node/checkpoint.test.js tests/node/dogfood-pipeline.test.js`.
- Reproduced `restore-context.js` output for the `checkpoint-no-ticket.json` fixture and confirmed it restores no source material beyond the feature slug and checkpoint flag.
- Reproduced end-to-end token logging for resumed `clarification` and `architecture-review` checkpoints and confirmed the logged `model` comes from the next phase, not the resumed phase.
