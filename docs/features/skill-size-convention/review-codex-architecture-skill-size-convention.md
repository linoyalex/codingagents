# Architecture Review: skill-size-convention
**Generated:** 2026-04-13T03:13:59Z

## Findings
- [HIGH] [Pilot: verification-gate Conversion (AC4)] The architecture still softens the ticket’s proof-of-concept. `ISS-013` asks for per-phase verification detail to move into `skills/verification-gate/phase-<N>.md` reference files, but this design groups multiple phases into `phase-1-2.md`, `phase-3-5.md`, and `phase-6-7.md` instead of actually proving the phase-by-phase split. That still reduces `SKILL.md`, but it leaves room for one large appendix pattern rather than demonstrating the finer-grained progressive-disclosure structure the ticket set out to validate.
- [MEDIUM] [Rollback / Fallback] The rollback plan is not operationally safe as written. It says to revert the CLAUDE budget lines and delete the reference files, but once `verification-gate` has been converted, those files hold required behavior and guidance. Deleting them without restoring that content into `SKILL.md` would not roll back cleanly; it would leave the converted skill incomplete.

## Open Questions
- If grouped files like `phase-3-5.md` are considered acceptable for AC4, what concrete rule distinguishes that from a single bulk appendix that just happens to be named with phase ranges?

## Recommendation
- Proceed with changes
