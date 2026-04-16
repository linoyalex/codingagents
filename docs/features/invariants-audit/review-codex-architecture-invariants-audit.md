# Architecture Review: invariants-audit
**Generated:** 2026-04-16T19:57:25Z

## Findings
- [MEDIUM] [Test ownership / structural checks] [docs/features/invariants-audit/architecture.md:65](</Users/linoy/projects/codingagents/docs/features/invariants-audit/architecture.md:65>) [docs/features/invariants-audit/architecture.md:66](</Users/linoy/projects/codingagents/docs/features/invariants-audit/architecture.md:66>) [docs/features/invariants-audit/architecture.md:90](</Users/linoy/projects/codingagents/docs/features/invariants-audit/architecture.md:90>) [docs/features/invariants-audit/architecture.md:91](</Users/linoy/projects/codingagents/docs/features/invariants-audit/architecture.md:91>) [docs/features/invariants-audit/architecture.md:141](</Users/linoy/projects/codingagents/docs/features/invariants-audit/architecture.md:141>) [docs/features/invariants-audit/architecture.md:155](</Users/linoy/projects/codingagents/docs/features/invariants-audit/architecture.md:155>) The revised draft fixes the earlier test-file naming issue, but it still assigns non-wiring structural checks inconsistently. Module Boundaries puts sibling reference resolution in `tests/node/core-skill-contracts.test.js` and structural anchors in `tests/node/command-skill-wiring.test.js`, the File Manifest says `core-skill-contracts.test.js` also extends `anchors`, and Test Strategy moves sibling reference resolution back into the wiring suite. That leaves implementers without a single canonical home for these assertions and risks duplicate coverage or gaps during future test updates.

## Open Questions
- Which suite is the canonical owner for sibling reference resolution and skill-file structural anchors: `tests/node/command-skill-wiring.test.js`, `tests/node/core-skill-contracts.test.js`, or a clean split with one responsibility assigned to each?

## Recommendation
- Proceed with changes
