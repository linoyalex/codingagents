# PRD Review: skill-size-convention
**Generated:** 2026-04-13T02:49:35Z

## Findings
- [HIGH] [AC4] The PRD weakens the original ticket intent by requiring the `verification-gate` pilot to preserve "all original content" and only reorganize it. `ISS-013` explicitly says this ticket must not give ISS-010 a free pass and that the result still needs to show the added content is signal-positive. Locking the pilot to zero content reduction would force known low-signal boilerplate to remain, even if the better outcome is to trim it.
- [HIGH] [AC5] The migration audit scope is factually wrong and brittle. The PRD hard-codes "all 12 existing skills" and repeats that count in Screen States and Out of Scope, but the repo currently has 9 skills under `skills/`. The ticket asks for an audit of each existing skill, not a stale fixed count, so this PRD could fail or pass incorrectly as the skill inventory changes.
- [MEDIUM] [AC2] The documentation target is too ambiguous. The ticket allows a specific choice between `docs/CLAUDE.md` and `skills/SKILL_AUTHORING.md` if `docs/CLAUDE.md` would grow too long, but the PRD broadens that into "CLAUDE.md or reference docs." That makes it unclear whether the root project template, the framework doc, or a separate authoring doc is the source of truth for the progressive-disclosure rule.

## Missing States
- No UI screen states are needed for this feature.
- Relevant non-UI states still need clearer coverage: audit runs after the number of skills changes, a pilot conversion that trims low-signal content instead of preserving it verbatim, and the case where root `CLAUDE.md` and `docs/CLAUDE.md` disagree about which file owns the new guidance.

## Recommendation
- Needs clarification first
