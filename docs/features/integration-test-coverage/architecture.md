## Architecture: Integration Test Coverage for Phase 3
**Generated:** 2026-04-13T12:00:00Z
**ADR:** ADR-003 | Date: 2026-04-13

### Decision

Add a "Three-Level Test Coverage" section to `skills/tdd/SKILL.md` requiring unit, integration,
and E2E tests. Integration tests call the production entry point and assert the feature's effect
in output — not the module directly. Add fixture validation and degenerate-input rules. Update
`commands/test-design.md` with a verification step and `PIPELINE_GUIDE.md` Phase 3 description.

### Decision Confidence
High — the escaped-defect pattern (275 unit tests, zero wiring) is well-documented and the fix
is additive guidance, not structural change.

### Revisit When
- The project adopts a test framework that auto-generates integration tests from entry points
- More than 3 features fail Phase 3 verification due to false positives on the entry-point check

### Rollback / Fallback
Remove the "Three-Level Test Coverage" section from TDD skill, revert commands/test-design.md
verification step, and revert PIPELINE_GUIDE.md. No schema or runtime changes to roll back.

### File Changes

| File | Change | Budget impact |
|------|--------|---------------|
| `skills/tdd/SKILL.md` | Add "Three-Level Test Coverage" section (~20 lines), fixture validation rule (~3 lines), degenerate-input rule (~3 lines) | Current: 86 lines → ~112 lines (within 150 prose cap) |
| `commands/test-design.md` | Add verification: "at least one test imports production entry point" | ~2 lines |
| `PIPELINE_GUIDE.md` | Add integration tests to Phase 3 deliverables list | ~1 line |

### Three-Level Test Coverage (AC1, AC2)

```
Unit/Contract:  Tests modules in isolation. Existing practice.
Integration:    Calls production entry point, asserts feature effect in output.
                Naming: [feature].integration.test.{js,ts,py}
E2E:            Full system shells. Existing practice.
```

Definition (AC2): "An integration test calls the production entry point (not the module
directly) and asserts the feature's effect is visible in the output. A test that calls the
module directly is a unit test, regardless of how many modules it touches."

### Fixture Validation Rule (AC3)

Add to TDD skill: "For any AC referencing a real-world data type, read the production
schema/type/enum definition before writing fixtures. Confirm fixture values match exactly.
Do not invent stand-in shapes." Placement: inside the Coverage Rules section.

### Degenerate Input Rule (AC4)

Add to TDD skill: "When widening a validation constraint (e.g., enum → string), list degenerate
values now admitted (empty string, whitespace, max-length boundary) and add a test for each."
Placement: inside the Coverage Rules section after fixture validation.

### Phase 3 Command Verification (AC5)

Add to `commands/test-design.md` blocking verification: "At least one test must import the
production entry point AND contain an assertion on visible output. Import-only shells, utility
imports, or tests that call modules directly do not satisfy this check." This is a blocking
gate — Phase 3 cannot complete without it.

### Architecture Dependency (AC7)

Add note to TDD skill: "Integration tests require the architecture doc to include a Call Chain
or Integration Points section. If missing, QA agent must add a warning comment at the top of the
test file noting the gap and flag it in the handoff. Phase 3 may proceed but the gap must be
explicitly recorded."

### Module Boundaries

| Owner | Writes | Must not touch |
|-------|--------|----------------|
| This feature | `skills/tdd/SKILL.md`, `commands/test-design.md`, `PIPELINE_GUIDE.md` | `skills/code-review/`, `commands/review.md`, `src/` |

### Failure Modes

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Skill exceeds size budget | Blocked by ISS-013 contract test | Budget check runs in CI |
| False positive on entry-point check | Phase 3 verification blocks for valid tests | QA agent reviews manually; check requires import + assertion, reducing false positives |
| Arch doc missing Call Chain section | Integration tests designed without wiring context | AC7 requires flagging the gap, not blocking |

### Fitness Functions
1. `skills/tdd/SKILL.md` prose lines ≤ 150 (ISS-013 budget)
2. TDD skill contains structural anchors: `## Three-Level Test Coverage`, fixture validation rule, degenerate-input rule
3. `commands/test-design.md` contains entry-point verification step

### Rejected Alternatives
1. **Separate integration-test skill** — rejected because the guidance is 3 rules (~26 lines), not a standalone procedure; splitting would fragment the TDD workflow
2. **Automated entry-point detection via AST** — rejected because tooling complexity outweighs benefit; a grep + human judgment is sufficient for this project scale
