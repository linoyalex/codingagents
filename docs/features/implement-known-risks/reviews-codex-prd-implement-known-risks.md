# PRD Review: implement-known-risks
**Generated:** 2026-04-13T23:53:42Z

## Findings
- [HIGH] [Screen States / Scope] The PRD quietly expands the feature beyond “add Phase 5 instruction + checklist item.” The screen states require that `known_risks` are “logged” and that deferred risks are documented in the commit message, but neither behavior appears in the acceptance criteria and the Out of Scope section explicitly excludes automated enforcement. That leaves downstream phases unclear on whether this feature is only prose guidance or whether it also introduces a traceability convention that must be implemented and tested.
- [MEDIUM] [AC5 / Dependencies] The malformed-handoff error case depends on existing `resolve-feature.js` behavior rather than on the actual feature seam being changed. That makes AC5 weakly attributable to this PRD: the feature itself is not adding new malformed-handoff handling, and the requirement is hard to verify as part of this work beyond re-asserting a pre-existing guard.
- [MEDIUM] [Missing state coverage] The PRD covers empty and malformed JSON states, but it misses the more likely operational failure where `.claude/handoff.json` is missing or unreadable. For a feature centered on reading `known_risks` from handoff, that absence path is more directly relevant than a malformed JSON branch alone.
- [LOW] [Document structure] The file starts with `## Feature:` instead of a top-level `#` heading, which is inconsistent with the project’s generated-artifact convention and makes the timestamp placement less canonical for later phases and reviews.

## Missing States
- Empty: covered for missing/empty `known_risks`
- Loading: covered as agent loading `.claude/handoff.json`
- Error: malformed JSON is covered, but missing/unreadable handoff file is not
- Permission denied: not covered for cases where the handoff file exists but cannot be read
- Other relevant edge states: `known_risks` present but non-array / unexpected shape is not called out, even though the feature depends on agents treating that field as actionable input

## Recommendation
- Needs clarification first
