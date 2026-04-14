# Review: code-review-skill-hardening
**Generated:** 2026-04-14T17:23:44Z

## Findings
- No verified findings in the reviewed diff. Residual risk: the broader shared suite `tests/node/core-skill-contracts.test.js` is currently red in this repo, but the failure is a pre-existing `skills/prd-writing/SKILL.md` line-budget issue unrelated to this feature.

## Open Questions
- None.

## Merge Recommendation
- APPROVE

## Verification Notes
- Reviewed `git diff main...HEAD` for:
  - `skills/code-review/SKILL.md`
  - `skills/code-review/impact-analysis.md`
  - `skills/code-review/automated-checks.md`
  - `skills/code-review/reproduction.md`
  - `.claude/skills/code-review/*`
  - `commands/review.md`
  - `.claude/commands/review.md`
  - `tests/contracts/code-review-skill-hardening.test.js`
  - `tests/integration/code-review-skill-hardening.integration.test.js`
  - `tests/e2e/code-review-skill-hardening.spec.js`
- Verified the new review-time symmetric gate instruction is present in [commands/review.md](/Users/linoy/projects/codingagents/commands/review.md:45).
- Verified the new skill methodology and sidecar links are present in [skills/code-review/SKILL.md](/Users/linoy/projects/codingagents/skills/code-review/SKILL.md:15).
- Verified installer coverage in:
  - [init.sh](/Users/linoy/projects/codingagents/init.sh:105)
  - [upgrade.sh](/Users/linoy/projects/codingagents/upgrade.sh:196)
- Ran:
  - `node --test tests/contracts/code-review-skill-hardening.test.js`
  - `node --test tests/integration/code-review-skill-hardening.integration.test.js`
  - `node --test tests/e2e/code-review-skill-hardening.spec.js`
  - `node --test tests/node/core-skill-contracts.test.js`
