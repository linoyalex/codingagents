## Feature: Wiring Verification (ISS-036)
**Generated:** 2026-04-13T00:00:00Z
**Phase:** Specify | Date: 2026-04-13
**Source:** docs/issues/tickets/ISS-036.md

### User Story

As a **framework developer modifying skills and commands**, I want the test suite to verify that every artifact type required by a skill has a corresponding output instruction in the command that invokes it, so that command↔skill wiring gaps are caught at test time — before they silently ship broken.

### Acceptance Criteria

- [ ] **AC1 (Wiring contract test — happy path):**
  Given a skill that declares a `## Required Artifacts` section listing artifact types (e.g., `[feature].integration.test.*`),
  When the wiring contract test runs,
  Then it verifies that the command loading that skill contains output instructions referencing each required artifact's naming convention or path.

- [ ] **AC2 (Catches known gap — error detection):**
  Given the pre-fix state where `skills/tdd/SKILL.md` requires `[feature].integration.test.*` but `commands/test-design.md` only provides output slots for `tests/contracts/` and `tests/e2e/`,
  When the wiring contract test runs against this state,
  Then it fails with a message identifying the missing artifact slot.

- [ ] **AC3 (Phase 5 verification step):**
  Given a developer implementing skill changes,
  When they follow the Phase 5 verification checklist in `commands/implement.md`,
  Then they find an instruction: "For every new artifact type introduced in a skill, verify the corresponding command includes an output slot (file path, naming convention) for that artifact."

- [ ] **AC4 (Phase 3 verification step):**
  Given a QA agent designing tests,
  When they follow `commands/test-design.md` verification steps,
  Then they find an instruction to confirm the command provides output instructions for every test level required by the TDD skill (unit, integration, E2E).

- [ ] **AC5 (Skill artifact registry):**
  Given any skill that requires agents to produce named artifacts,
  When a developer reads that skill,
  Then they find a `## Required Artifacts` section listing artifact types in a format the contract test can parse.

- [ ] **AC6 (No regression):**
  Given all existing tests in the suite,
  When the new wiring contract test is added,
  Then all existing tests continue to pass.

- [ ] **AC7 (Empty state — no artifacts declared):**
  Given a skill with no `## Required Artifacts` section,
  When the contract test evaluates that skill↔command pair,
  Then it passes without error (no artifacts to verify = no wiring to check).

### Screen States

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| **Contract Test Output** | No skills declare `## Required Artifacts` — test passes with "0 wiring checks" message | Test runner scanning skills and cross-referencing commands | Pass/fail per wiring check (e.g., "✓ tdd → test-design: integration.test.* has output slot") | Mismatch: skill requires artifact type but command has no corresponding output slot; test fails with specific skill, command, and artifact named | All wiring checks pass |
| **Phase 5 Checklist** | No new artifact types introduced — step is skipped | Developer auditing skill changes for new artifact types | Checklist item visible: "Verify command includes output slot for each new skill artifact" | Developer finds mismatch — must fix command before proceeding | All new artifacts have command wiring confirmed |
| **Phase 3 Checklist** | No test-level output gaps — step passes | QA agent checking command output slots against TDD skill test levels | Verification step visible: "Confirm output instructions for unit, integration, E2E" | Gap detected: TDD skill requires integration tests but command omits that path | All test levels have corresponding output slots |

### Out of Scope

- Modifying skill content itself (that's ISS-022: integration-test-coverage)
- Changing artifact-timestamp fitness functions or Codex reviewer prompts (ISS-001: invariants-audit)
- Fixing `init.sh` helper wiring (ISS-009: resolve-feature-coverage)
- General Phase 5/Phase 3 checklist content beyond the wiring verification steps
- Runtime enforcement — this is test-time detection only

### Dependencies

- **Assumption:** Skills can adopt a `## Required Artifacts` section as a new convention (no blocker; this ticket defines the convention)
- **Prerequisite:** Test infrastructure (Node.js test runner) already in place
- **Benefits from:** ISS-013 (skill size convention) — progressive disclosure makes artifact requirements easier to enumerate
- **Complements:** ISS-025 (adversarial self-review) — provides a concrete checklist item for the self-review

### RICE Score

Reach: 1 (framework developers) | Impact: 4 (prevents silent-fail defects) | Confidence: 5 (known gap, clear fix) | Effort: 2 | **Score: 10**

### Definition of Done

- [ ] Contract test exists and validates skill↔command artifact coverage
- [ ] Test fails against pre-fix state (catches integration-test-coverage gap)
- [ ] `commands/test-design.md` includes Phase 3 verification step
- [ ] `commands/implement.md` includes Phase 5 verification step
- [ ] Affected skills include `## Required Artifacts` section
- [ ] All existing tests pass
- [ ] QA signed off
- [ ] No P1/P2 bugs open
