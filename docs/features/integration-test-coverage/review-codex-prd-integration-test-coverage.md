# PRD Review: integration-test-coverage
**Generated:** 2026-04-13T10:54:47Z

## Findings
- [HIGH] [AC7 / Out of Scope] The PRD drops the ticket's required behavior for the soft architecture dependency. [ISS-022](/Users/linoy/projects/codingagents/docs/issues/tickets/ISS-022.md) says that if the architecture doc lacks a `Call Chain` or `Integration Points` section, the QA agent should flag that as a gap. The PRD only says the skill should document the dependency, while the out-of-scope note says integration tests do not require wiring diagrams "to launch." That leaves the expected Phase 3 outcome unclear when the architecture is missing the needed call-chain context, and it makes the requirement hard to verify consistently.
- [MEDIUM] [AC5 / Screen States] The PRD's success condition is too weak for the failure mode this ticket is trying to prevent. AC2 correctly defines an integration test as one that calls the production entry point and proves the effect is visible in output, but AC5 and the Phase 3 success row only require that "at least one test imports from a production entry point module." A trivial shell that imports the entry point but never asserts the visible effect could still satisfy the written PRD.
- [MEDIUM] [Screen States / Fixture Validation] The PRD adds a hidden evidence requirement that is not in the ticket or acceptance criteria: "Schema read recorded in PR." ISS-022 only requires the agent to read the production schema/type/enum before writing fixtures and confirm the fixture values match exactly. Requiring PR-level proof introduces an extra artifact/traceability obligation that downstream phases are not otherwise told to produce.
- [MINOR] [Dependencies] `Blocks: ISS-023 (soft)` is misleading relative to the source ticket, which describes ISS-023 as a soft dependency rather than something this feature blocks. That wording can confuse sequencing and should be made explicit.

## Missing States
- Architecture doc exists but does not contain `Call Chain` or `Integration Points`: the PRD should say whether Phase 3 must fail, warn, or continue with a documented gap.
- Feature has no obvious single production entry point: the PRD should say how the QA agent chooses the integration target.
- Production schema/type/enum cannot be located from the codebase: the PRD should state the expected fallback or failure behavior instead of assuming the reference is always present.
- Validation was widened, but the newly admitted degenerate set is open-ended: the PRD should clarify the minimum required boundary set when "etc." applies.

## Recommendation
- Needs clarification first
