# PRD Review: review-hardening
**Generated:** 2026-04-13T13:15:58Z

## Findings
- [HIGH] [AC6] The PRD weakens ISS-014's core requirement from "separate context" to merely "fresh session (clean context, no carryover)." Those are not equivalent. A fresh session in the same reviewer context can still preserve anchoring via copied handoff framing or same-agent continuity, while ISS-014 explicitly wants gate review commands to require separate context from the authoring phase, not just a generic reset.
- [HIGH] [AC14 / AC15] The `source_spec` contract is internally inconsistent and weaker than ISS-033. AC14 says `handoff.json` must include a `source_spec` field, but AC15 then allows review to proceed when `handoff.source_spec` is missing by falling back to commit messages, issue links, or Slack threads. ISS-033's point is to carry an explicit source pointer in the handoff so later phases do not have to guess. Allowing a missing field reintroduces that ambiguity.
- [MEDIUM] [AC4] The no-regression budget is stale and likely incorrect. It says the code-review skill must stay under the ISS-013 budget of "`~300 lines code-review`", but ISS-013 changed the convention to the newer prose/total-budget rules rather than a single 300-line target. That makes the acceptance criterion hard to verify and risks baking an obsolete limit into this PRD.
- [MEDIUM] [AC5] The reviewer-role scope is narrower than ISS-014. The ticket requires `ROLE_SECURITY.md`, `ROLE_CODE_REVIEWER.md`, and any other relevant gate-review roles to adopt the adversarial stance. The PRD names only two roles, which leaves "other relevant gate-review roles" ambiguous and could allow partial implementation while still appearing complete.
- [MEDIUM] [AC11] The regression-test acceptance criterion is too narrow for the behaviors this feature claims to add. It only mentions adversarial role text, `source_spec` in handoff, and command rejection on missing `source_spec`, but it does not explicitly protect separate-context enforcement, read-only reviewer behavior, or the authoring-vs-gate distinction from ISS-014.

## Missing States
- Handoff includes `source_spec`, but the referenced file/path exists and conflicts with the current PRD or ticket: the PRD should say whether review halts or records a mismatch.
- Gate review is launched from a fresh session but still by the same authoring agent/context lineage: the PRD should define whether that counts as independent review or not.
- No-PRD bugfix has multiple plausible source artifacts available (ticket, commit message, chat link): the PRD should specify precedence instead of allowing an implicit choice.
- A relevant gate-review role beyond code-review/security exists: the PRD should say whether it inherits the same adversarial and separate-context rules automatically or needs explicit inclusion.

## Recommendation
- Needs clarification first
