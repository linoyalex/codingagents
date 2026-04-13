## Feature: Integration Test Coverage for Phase 3
**Generated:** 2026-04-13T10:00:00Z
**Phase:** Specify | **Date:** 2026-04-13
**Ticket:** ISS-022

### User Story
As a QA agent, I want Phase 3 test design to require integration tests that call production entry points, so that escaped defects like the 275-passing-units-zero-wiring incident never repeat.

### Acceptance Criteria

- [ ] **AC1: Three-level coverage requirement**
  - Given the TDD skill is updated with coverage guidance
  - When a QA agent reads the skill
  - Then it explicitly names and defines three test levels: unit/contract tests, integration tests (calling production entry point), and E2E shells

- [ ] **AC2: Integration test definition clarity**
  - Given a QA agent is designing tests
  - When they decide whether a test is unit or integration
  - Then the skill clearly states: "An integration test calls the production entry point and asserts the feature's effect is visible in the output. Calling the module directly is a unit test." with naming convention `[feature].integration.test.*`

- [ ] **AC3: Fixture validation against production schema**
  - Given a test fixture is created for a real-world data type
  - When the AC references a production type/enum/schema
  - Then the TDD skill requires: "Read the production schema/type/enum before writing fixtures. Confirm fixture values match exactly."

- [ ] **AC4: Degenerate input coverage rule**
  - Given a validation constraint is widened (e.g., email field now accepts empty or whitespace)
  - When test design is updated
  - Then the TDD skill requires: "List degenerate values now admitted and add a test for each" (empty, whitespace, max-length, etc.)

- [ ] **AC5: Phase 3 verification command updated**
  - Given Phase 3 completes
  - When verification step in commands/test-design.md runs
  - Then it checks: "at least one test imports from a production entry point module"

- [ ] **AC6: Pipeline guide includes integration test requirement**
  - Given a developer reads PIPELINE_GUIDE.md Phase 3 section
  - When they look for integration test guidance
  - Then the guide explicitly names integration tests as a Phase 3 deliverable alongside unit and E2E

- [ ] **AC7: Architecture dependency documented**
  - Given an integration test requires understanding call chains
  - When a QA agent reads the skill
  - Then it documents: "Integration tests require arch doc to include 'Call Chain' or 'Integration Points' section"

- [ ] **AC8: No regression — existing tests and skill size remain intact**
  - Given all existing tests in the suite
  - When the updated TDD skill is applied
  - Then existing tests pass and skill remains within ISS-013 size budget

### Screen States
This is a framework skill/command change, not a UI feature.

| Workflow | Empty / N/A | Normal | Error | Success |
|----------|-------------|--------|-------|---------|
| **Test Design (Phase 3)** | N/A | QA agent produces unit + integration + E2E shells | Agent produces only unit tests, skips integration | All three levels present; integration test imports production entry point |
| **Fixture Validation** | N/A | Fixture values validated against production schema before test commit | Fixture uses stand-in type not in production schema | Schema read recorded in PR; fixture values match exactly |
| **Degenerate Input Check** | N/A | Constraint widening triggers test cases for each degenerate value | Constraint widened without degenerate coverage | Test cases exist for empty, whitespace, boundary conditions |

### Out of Scope
- Rewriting existing tests to add integration level (only new features from this point forward)
- Changes to skills/code-review/ (tracked separately in ISS-024)
- Architecture wiring diagrams (ISS-023 is soft dependency; integration tests don't require them to launch)

### Dependencies
- **Blocks:** ISS-023 (soft)
- **Blocked by:** ISS-013 (skill size budget must be finalized first)

### RICE Score
- **Reach:** 10 (affects all future Phase 3 outputs; prevents tier-1 defects)
- **Impact:** 4 (hardens test quality; unblocks integration test framework)
- **Confidence:** 9 (root cause clearly identified; solution proven by ISS-013)
- **Effort:** 3 (skill update + 2 command updates; no code rewrites)
- **Score:** (10 × 4 × 9) / 3 = **120**

### Definition of Done
- [ ] All 8 ACs pass in staging
- [ ] QA agent has signed off independently
- [ ] No P1/P2 bugs open against this feature
- [ ] Documentation examples match Phase 3 test design workflow
- [ ] Skill size remains within ISS-013 budget
