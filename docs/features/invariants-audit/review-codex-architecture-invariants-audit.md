# Architecture Review: invariants-audit
**Generated:** 2026-04-16T16:39:40Z

## Findings
- [MEDIUM] [Workflow / Trust Boundaries / Failure Modes] [docs/features/invariants-audit/architecture.md:44](</Users/linoy/projects/codingagents/docs/features/invariants-audit/architecture.md:44>) [docs/features/invariants-audit/architecture.md:71](</Users/linoy/projects/codingagents/docs/features/invariants-audit/architecture.md:71>) [docs/features/invariants-audit/architecture.md:160](</Users/linoy/projects/codingagents/docs/features/invariants-audit/architecture.md:160>) The design relies on agents to self-evaluate the `When to Use` triggers and explicitly calls out only over-application as a risk. That leaves the primary correctness failure mode under-addressed: silent under-application on the exact workflow/state-transition reviews this skill is meant to harden. Because the wiring tests only prove the skill/checklist is present, not that it is invoked when triggers should match, the feature can degrade into advisory text that is easy for reviewers to skip without any recovery signal.

## Open Questions
- Should the architecture add a lightweight mitigation for false negatives, such as requiring invariant-analysis output markers when trigger classes are present, or is the intended model purely best-effort reviewer judgment?
- The current handoff still points Phase 3 verification at `tests/contracts/invariants-audit.test.js`, while the architecture now centralizes wiring checks in `tests/node/command-skill-wiring.test.js`. Should that handoff be refreshed before implementation continues?

## Resolutions

### MEDIUM — Silent under-application (resolved in rev 3)
- Added under-application as an explicit failure mode row in the Failure Modes table
- Added mitigation paragraph: when trigger conditions match, reviewers should include an
  `### Invariant Analysis` section in the review artifact (findings or "no mismatches").
  This creates an observable signal without runtime enforcement.
- Documented escalation path: if repeated under-application is observed, escalate to
  ISS-060/ISS-061 review gates or ISS-053 adversarial council for enforcement.
- **Design choice:** purely advisory, not a gate. Rationale: all methodology skills in
  the framework (code-review, security-audit) rely on reviewer judgment for invocation.
  Adding runtime enforcement here but not elsewhere would create an inconsistent contract.
  The under-application mitigation matches the framework's convention-over-enforcement model.

### Open Question 1 — Trigger enforcement model (answered)
Best-effort reviewer judgment with an observable marker convention. Not a hard gate.
See mitigation above.

### Open Question 2 — Stale handoff (fixed in rev 3)
Updated `verification_commands` in handoff.json from `tests/contracts/invariants-audit.test.js`
to grep checks against `tests/node/command-skill-wiring.test.js` and
`tests/node/core-skill-contracts.test.js`, matching the architecture's test location decision.

## Recommendation
- Proceed with changes
