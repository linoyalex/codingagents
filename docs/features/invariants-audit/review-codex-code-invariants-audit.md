# Review: invariants-audit
**Generated:** 2026-04-16T22:46:19Z

## Findings
- No verified findings in the reviewed diff. Residual risk: the feature mainly hardens prompts and structural tests, so long-term confidence still depends on occasional real-output spot checks, not just keyword/anchor coverage.

### Invariant Analysis
No invariant mismatches identified. The reviewed diff keeps the spec, skill content, reviewer wiring, installer path, and regression tests aligned for the new cross-layer review method.

## Open Questions
- None.

## Merge Recommendation
- APPROVE

## Verification Notes
- Reviewed `git diff main...HEAD` with focus on `skills/invariants-audit/`, command/reviewer wiring, installer changes, and the new contract/integration coverage.
- Ran `node --test tests/node/command-skill-wiring.test.js`
- Ran `node --test tests/node/core-skill-contracts.test.js`
- Ran `node --test tests/integration/invariants-audit.integration.test.js`
- Ran `node --test tests/node/resolve-feature.test.js`
- Ran `bash tests/test-install-scripts.sh`
- Opened unchanged `commands/security-gate.md` to verify symmetric gate enforcement; no issue found.
