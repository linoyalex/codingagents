# PRD Review: clarification-checkpoints
**Generated:** 2026-04-13T20:27:53Z

## Findings
- [HIGH] [AC1 / Dependencies] "Ambiguous or underspecified" is the core trigger for the clarification gate, but the PRD leaves that threshold entirely to agent judgment without any observable examples or decision rule. Because automated ambiguity heuristics are explicitly out of scope, downstream tests have no concrete contract for when `/specify` must stop and ask versus continue, which makes the feature hard to verify consistently.
- [HIGH] [AC3 / AC6 / Screen States] The PRD defines the happy path after the user answers clarification questions, but it does not define unresolved checkpoint states such as partial answers, refusal to answer, or abandonment after questions are shown. Without an explicit requirement for how `/specify` records and surfaces "waiting on user" versus "incomplete/cancelled," the command can dead-end or silently restart while still appearing to satisfy AC6 and AC7.
- [MEDIUM] [AC0a] "Verify the value against the current CLAUDE.md" is ambiguous in this repository because both `CLAUDE.md` and `docs/CLAUDE.md` exist. The PRD should name the canonical source, or at least a precedence order, so different implementations do not validate against different convention documents and still claim compliance.
- [MEDIUM] [AC8 / ISS-029 AC8] The PRD weakens the source ticket's verification bar by reducing it to checks that checkpoint language "exists" in command files and workflow instructions. Text presence alone will not catch regressions where `/specify` or `/architect` still auto-advance, fail to pause for feedback, or lose the pending-review state across turns.
- [MEDIUM] [Screen States / AC4-AC7] The `/architect` checkpoint flow is under-specified for the actual review loop this feature introduces. The current state table covers draft, populated, error, and success, but it does not define the observable state after a proposal has already been shown and the phase is still waiting on feedback or revisions, which makes AC7 difficult to test consistently.

## Missing States
- Partial clarification response: the PRD should say whether `/specify` re-asks, proceeds with explicit assumptions, or stops.
- User declines or abandons a required checkpoint: the PRD does not define whether the phase remains pending, is cancelled, or writes a partial artifact.
- Resumed checkpoint in a later turn: there is no explicit state for showing already-asked questions or an already-presented architecture proposal without regenerating the artifact.
- Convention source cannot be resolved cleanly: the PRD does not say what happens if the relevant convention is missing, duplicated, or inconsistent across documentation files.
- Architecture feedback requests another revision cycle: the PRD does not define whether repeated review/revise loops are allowed and how the command should signal that it is still not complete.

## Recommendation
- Needs clarification first
