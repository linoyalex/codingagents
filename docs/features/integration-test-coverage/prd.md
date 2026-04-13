## Feature: Integration Test Coverage for Phase 3
**Generated:** 2026-04-13T12:00:00Z
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
  - Then the TDD skill requires: "List degenerate values now admitted and add a test for each. Minimum required set: empty string, whitespace-only, and max-length boundary. Additional values depend on the type being widened."

- [ ] **AC5: Phase 3 verification command updated**
  - Given Phase 3 completes
  - When verification step in commands/test-design.md runs
  - Then it checks: "at least one test imports the production entry point AND asserts a visible effect in the output" — import-only shells or utility imports do not satisfy this check; verification is blocking, not advisory

- [ ] **AC6: Pipeline guide includes integration test requirement**
  - Given a developer reads PIPELINE_GUIDE.md Phase 3 section
  - When they look for integration test guidance
  - Then the guide explicitly names integration tests as a Phase 3 deliverable alongside unit and E2E

- [ ] **AC7: Architecture dependency documented with gap-handling**
  - Given an integration test requires understanding call chains
  - When a QA agent reads the skill
  - Then it documents: "Integration tests require arch doc to include 'Call Chain' or 'Integration Points' section. If missing, QA agent must add a warning comment at the top of the test file noting the gap and flag it in the handoff. Phase 3 may proceed but the gap must be explicitly recorded."

- [ ] **AC8: No regression — existing tests and skill size remain intact**
  - Given all existing tests in the suite
  - When the updated TDD skill is applied
  - Then existing tests pass and skill remains within ISS-013 size budget

### Screen States
This is a framework skill/command change, not a UI feature.

| Workflow | Empty / N/A | Normal | Error | Success |
|----------|-------------|--------|-------|---------|
| **Test Design (Phase 3)** | N/A | QA agent produces unit + integration + E2E shells | Agent produces only unit tests, skips integration | All three levels present; integration test imports entry point AND asserts visible effect |
| **Fixture Validation** | N/A | Fixture values validated against production schema before writing | Fixture uses stand-in type not in schema; or schema cannot be located (QA flags gap) | Fixture values match production schema exactly |
| **Degenerate Input Check** | N/A | Constraint widening triggers test cases for minimum boundary set: empty, whitespace, max-length | Constraint widened without degenerate coverage | Each degenerate value from the minimum set has a test case |
| **Missing Arch Call Chain** | N/A | Arch doc includes Call Chain / Integration Points | Arch doc lacks call chain section | QA records gap in test file header and handoff; Phase 3 proceeds |
| **No Obvious Entry Point** | N/A | Feature has a clear production entry point | Multiple or no obvious entry points | QA documents chosen entry point and rationale in test file header |

### Out of Scope
- Rewriting existing tests to add integration level (only new features from this point forward)
- Changes to skills/code-review/ (tracked separately in ISS-024)
- Architecture wiring diagrams (ISS-023 is soft dependency; integration tests don't require them to launch)

### Dependencies
- **Blocked by:** ISS-013 (skill size budget must be finalized first)
- **Soft dependency on:** ISS-023 (arch doc call chains make integration tests more effective, but this feature does not block ISS-023)

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
