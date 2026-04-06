# Issue Backlog

> Lightweight issue tracker for work not yet in a feature branch.
> Add new issues at the bottom. Move to "Closed" section when resolved.

---

## Open

### ISS-001: Add invariants-audit skill for cross-layer semantic review
- **Type:** Feature
- **Priority:** P1 — High
- **Label:** `framework`, `review-quality`, `testing`, `workflow`
- **Status:** Open
- **Created:** 2026-04-06
- **Reporter:** Codex
- **Feature area:** Review system, framework skills, pipeline governance

**Description:**
The framework currently has strong role separation and phase guidance, but it is still easier to catch structural drift than semantic drift. Recent review work showed a recurring class of issues that can survive passing tests and a seemingly complete implementation:

- spec says one thing but commands or hooks transition differently
- blocked or rejected states still write forward-moving handoffs
- verification snippets match fixtures but not canonical templates
- tests validate presence of instructions rather than behavioral invariants
- roles, commands, hooks, skills, and runtime state disagree on the same workflow rule

This class of review is broader than normal code review or architecture review. It is a systems-audit / invariants review whose job is to compare intended behavior, encoded behavior, enforced behavior, and tested behavior across layers.

The recommended implementation is a new reusable skill, not a new mandatory pipeline phase. The skill should be loadable by high-leverage reviewer roles and Codex review prompts when the work touches workflow logic, state transitions, safety checks, or test architecture.

**Acceptance criteria:**
- Add a new skill, tentatively `skills/invariants-audit/SKILL.md` or `skills/systems-audit/SKILL.md`
- The skill teaches reviewers to look for:
  - state-machine and next-step transition bugs
  - blocked / rejected / retry / stale-state paths
  - spec vs implementation vs tests vs hooks contradictions
  - fixture-template-validator mismatches
  - tests that prove syntax or structure but not behavior
- The skill defines a review method based on invariants:
  - identify the invariant
  - identify where it is encoded
  - identify where it is enforced
  - identify where it is tested
  - identify what happens on failure paths
- Update the most relevant Claude roles/commands to load or reference the skill when appropriate:
  - `code-reviewer`
  - `architect`
  - `security-reviewer`
  - optionally `qa`
- Update the Codex review layer to incorporate the same behavior in the most relevant prompts:
  - code review
  - security review
  - architecture review
  - test-design review
- Add at least one deterministic regression test that protects the skill’s intended usage pattern or integration points
- Document when to use this skill versus normal code review, architecture review, or QA review

**Notes:**
This should remain a cross-cutting skill unless repeated use proves it needs to become a dedicated optional role such as `system-auditor`.

Suggested framing for the skill:
- “Review this as a systems auditor, not a style reviewer”
- “Assume the happy path is already covered”
- “Focus on failure paths, blocked states, semantic mismatches, and cross-layer contradictions”
- “For every finding, explain why the existing tests did not catch it and what regression test would”

The value of this skill is general, not project-specific. It should improve review quality for any software system with:
- state transitions
- workflow gates
- background jobs or hooks
- schema / template / fixture contracts
- multi-layer behavior split across docs, code, runtime config, and tests

### ~~ISS-002~~ — Closed, see below
### ~~ISS-003~~ — Closed, see below
### ~~ISS-004~~ — Closed, see below

---

## Closed

### ISS-002: Phase 6 writes a forward handoff even when review requests changes
- **Resolved:** 2026-04-06
- **Resolution:** `commands/review.md` REQUEST_CHANGES branch no longer writes a
  handoff. The existing Phase 5 handoff remains in place. Regression test in
  `tests/node/pipeline-handoff-guards.test.js` covers both branches.

### ISS-003: Phase 4 writes an implementation handoff even when security findings are BLOCKING
- **Resolved:** 2026-04-06
- **Resolution:** `commands/security-gate.md` BLOCKING branch no longer writes a
  handoff. The existing Phase 3 handoff remains in place. Regression test in
  `tests/node/pipeline-handoff-guards.test.js` covers both branches.

### ISS-004: Phase 4 verification logic does not match the canonical security-audit template
- **Resolved:** 2026-04-06
- **Resolution:** `skills/verification-gate/SKILL.md` Phase 4 regex updated to
  match both heading format (`#### BLOCKING:`) and list format (`- BLOCKING:`).
  Test fixture updated to canonical heading format. Regression tests in
  `tests/node/verification-gate.test.js` cover both pass and fail cases.
