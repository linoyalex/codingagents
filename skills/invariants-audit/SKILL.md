---
name: invariants-audit
description: Cross-layer semantic review — detect invariant mismatches between spec, implementation, tests, and hooks
version: "1.0.0"
---

# Skill: Invariants Audit

## Top Rules

- Apply only when trigger conditions match (see ## When to Use). Applying to every review wastes tokens.
- Always trace the invariant across all four layers: spec → implementation → tests → hooks.
- Do not rely on test presence alone — a passing test can prove syntax without proving behavior.
- Every finding must cite evidence: file path, line reference, and the cross-layer contradiction.

## Invariant Review Method

Apply this 5-step method for each invariant identified:

1. **Identify the invariant** — name the constraint or rule that must always hold (e.g., "a rejected handoff must never advance the pipeline").
2. **Where it is encoded** — locate where the invariant is defined: spec (PRD, AC), architecture, or schema.
3. **Where it is enforced** — locate the runtime enforcement point: hook, validator, guard clause, or middleware.
4. **Where it is tested** — locate the test that verifies the invariant holds, including failure paths, not just the happy path.
5. **What happens on failure paths** — trace what the system does when the invariant is violated: does it fail closed, silently pass, or produce misleading output?

For each step, note the exact file and section. If any step has no answer, that is a gap.

## Review Categories

Five categories of cross-layer semantic mismatches (see sibling file for full patterns):

[See reference: .claude/skills/invariants-audit/review-categories.md]

1. State-machine and transition bugs
2. Blocked / rejected / retry / stale-state paths
3. Spec vs implementation vs tests vs hooks contradictions
4. Fixture-template-validator mismatches
5. Tests that prove syntax or structure but not behavior

## When to Use

Use invariants-audit alongside normal review when any trigger below matches.
Use normal review only when none match.

| Trigger | Examples |
|---------|---------|
| Workflow logic or state transitions | Pipeline phase gates, retry logic, state machine transitions |
| Safety checks or fail-closed behavior | Hook exit codes, blocking gates, invariant guards |
| Test architecture changes | New test categories, structural test rewrites, fixture overhauls |
| Spec-to-implementation completeness doubts | ACs that gate on multi-layer behavior; hooks that must match schemas |

**Do not apply** to: pure refactoring with no behavioral change, documentation-only changes,
dependency bumps with no API changes, or UI styling changes.

When in doubt, apply the 5-step method to one invariant as a quick triage. If it yields a
finding, apply to all. If it yields nothing, document "No invariant mismatches identified"
and move on.

---
**STOP CONDITIONS (end of file):**
- Do not apply invariants-audit to changes that match no trigger condition — skip and document why.
- Never accept test presence as proof of invariant enforcement; verify the assertion proves behavior.
- A finding without a cited file path and cross-layer contradiction is not a finding — it is a guess.
- If the 5-step method cannot be applied (missing spec, missing tests), record the gap and escalate.
