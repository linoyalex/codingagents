# Test Design Review: implement-known-risks
**Generated:** 2026-04-14T03:29:31Z

## Findings
- None. I did not find a verified test-design gap in the current contract and E2E artifacts.

## Coverage Map Notes
- Well covered: AC1 and AC3 are directly protected by structural checks against the `Step 2 GREEN` section in `commands/implement.md` and the `known_risks` checklist seam in `skills/tdd/SKILL.md`.
- Well covered: AC2 is now much tighter because the tests require one GREEN-scoped slice to carry `known_risks`, `address|defer`, and `rationale` together, which closes the earlier disconnected-text false-positive path.
- Well covered: AC4 has both conditional empty-state wording checks and a behavioral missing-handoff-file branch with explicit args.
- Well covered: AC5 uses behavioral malformed-handoff execution against `resolve-feature.js`, so the guard is tested through visible failure rather than source-text proxies.

## Recommendations
- Keep the current structure. The present red test state is useful: it shows the suites fail loudly until the required `known_risks` guidance is actually added to the implementation files.
