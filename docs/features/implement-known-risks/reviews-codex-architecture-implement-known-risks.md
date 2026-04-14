# Architecture Review: implement-known-risks
**Generated:** 2026-04-14T00:12:12Z

## Findings
- [MEDIUM] [Files Changed / Source-installed sync] The architecture assumes the existing byte-identity test already protects `commands/implement.md` and `skills/tdd/SKILL.md`, but it does not explicitly name the installer/update path as part of the change surface. For a feature that depends on both source and installed copies being updated together, omitting `init.sh` / `upgrade.sh` or the committed `.claude` copy workflow from the design leaves the operational sync story under-specified and easier to miss during implementation.
- [MEDIUM] [Failure Modes / AC4] The architecture treats “handoff file absent” as a harmless no-op state, but that is only safe if Phase 5 can actually start without a handoff in the intended workflow. Since this feature’s new instruction depends on reading `.claude/handoff.json`, the design should be clearer about whether missing handoff is a supported runtime path or merely a tolerance case for documentation wording. Right now the architecture blurs those two cases.
- [LOW] [Module Boundaries / Test seam] The test seam is intentionally structural-only, which fits the PRD, but the architecture does not explain why that is sufficient to protect the real risk being addressed. Without that rationale, the design still looks vulnerable to “instruction exists but is too easy to skim past” concerns, and reviewers are left to infer why a stronger behavioral seam is out of scope.

## Open Questions
- Should the architecture explicitly treat committed `.claude` copies as part of the implementation surface, or is the project relying on an already-documented global sync convention outside this feature?
- Is “missing `.claude/handoff.json`” truly a supported Phase 5 operating state, or should AC4 be interpreted only as “instruction wording is harmless if the field is absent in a handoff the developer can read”?
- Should the architecture add one sentence explaining why structural-anchor tests are the intended protection here instead of a stronger runtime/behavioral check?

## Recommendation
- Proceed with changes
