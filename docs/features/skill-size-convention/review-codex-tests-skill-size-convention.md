# Test Design Review: skill-size-convention
**Generated:** 2026-04-13T03:42:07Z

## Findings
- [MEDIUM] [AC7 / tests/e2e/skill-size-convention.spec.js] The suite now has a stronger runtime proxy, but AC7 still is not exercised at the exact level the PRD calls for. The new tests simulate command-to-skill loading, verify installed-path reachability, and syntax-check embedded shell blocks, yet they still do not run an actual phase command end to end with the converted `verification-gate` skill. A failure mode that only appears during real command execution could still escape these artifacts.

## Coverage Map Notes
- AC1 appears reasonably covered through direct checks against `docs/CLAUDE.md` for the new prose budget, exclusions, and split threshold.
- AC2 appears reasonably covered for single-location ownership, the link format, and the worked-example/reference-file pattern.
- AC3 appears reasonably covered through both convention checks and footer assertions on the named pipeline-gating skills.
- AC5 is reasonably covered for dynamic skill discovery and audit-report presence across the current skill set.
- AC6 is reasonably covered for both inline and progressive-disclosure structural patterns.
- AC4d is better covered than before through focused proxy checks plus a documented manual-review rubric; it is not fully automatable, but the test design now has a clearer review seam.
- AC7 is materially better covered than before through installed-path, reference-resolution, and shell-syntax smoke checks, but it is still weaker than a true command-execution test.
- AC8 now appears reasonably covered, including negative fixtures that verify the violation path and message shape.
- AC9 now appears reasonably covered through normalized rule extraction and equality checks instead of only checking for shared `~150` references.

## Recommendations
- Add one executable integration/smoke test that runs a real phase command consuming `verification-gate` after the split, even if it uses a minimal fixture project.
