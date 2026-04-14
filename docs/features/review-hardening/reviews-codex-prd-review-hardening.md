# PRD Review: review-hardening
**Generated:** 2026-04-13T20:29:02Z

## Findings
- [HIGH] [AC7] The phase-classification requirement is internally contradictory. AC7 says phases 1-5 are marked `authoring`, while phases 4 and 6 are marked `gate/review`. Phase 4 cannot be both, and Phase 7 is left unclassified entirely. Because ISS-014 depends on a clear authoring-vs-gate split, this wording is not reliably testable.
- [HIGH] [AC12 / AC13 / AC18] The PRD narrows ISS-033 too far by making source-spec verification a `commands/review.md` / Phase 6 requirement instead of a review-layer requirement. ISS-033 explicitly requires Codex reviewer prompts to verify against the source spec for at least code review and PRD review. As written, this PRD can pass while leaving `codex/reviewers/review-prd.md` and other non-Phase-6 review prompts out of scope.
- [MEDIUM] [AC5] Role coverage is still undefined at the PRD stage. "ROLE_SECURITY.md, ROLE_CODE_REVIEWER.md, and any other relevant gate-review roles - enumerate at architecture time" defers a core scope decision to a later phase, which makes it impossible to tell from the PRD alone which roles must adopt the adversarial stance for the feature to be complete.
- [MEDIUM] [AC12 / AC13 vs AC15] The source-spec flow is inconsistent for no-PRD bugfixes. AC12 says the reviewer reads the "PRD from handoff.source_spec," and AC13 hard-codes the prompt text to "verify diff matches PRD," but AC15 allows `source_spec` to be a ticket path or issue URL. That leaves the expected review prompt and success behavior ambiguous for the explicit bugfix path this PRD claims to support.
- [MEDIUM] [AC14 / AC16] "source_spec ... must always be present and resolve to an existing artifact" is too vague to test consistently once GitHub issue URLs are allowed. The PRD does not say whether URL resolution means syntactic validity, live fetchability, or human-verifiable existence, so different implementations could all claim compliance while handling remote sources differently.

## Missing States
- No UI-specific accessibility states are needed for this feature, but the non-UI workflow states below still need clearer coverage.
- `source_spec` points to a remote GitHub issue URL that is valid in format but unavailable in the current environment: the PRD should say whether review halts, warns, or requires operator intervention.
- A resolvable `source_spec` conflicts with the downstream PRD or implementation: the Screen States table says the reviewer should stop, but no acceptance criterion defines the required halt/output behavior.
- A gate review role beyond code review and security review exists in the repo: the PRD should state whether it inherits the same adversarial and separate-context rules automatically or needs explicit inclusion.
- Phase 7 documentation runs after a gate phase: the PRD should classify whether it is intentionally outside the authoring-vs-gate tagging rule or simply omitted from AC7.

## Recommendation
- Needs clarification first
