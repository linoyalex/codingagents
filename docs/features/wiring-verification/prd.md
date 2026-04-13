## Feature: Wiring Verification (ISS-036)
**Generated:** 2026-04-13T20:30:00Z
**Phase:** Specify | Date: 2026-04-13
**Source:** docs/issues/tickets/ISS-036.md

### User Story

As a **framework developer maintaining the Phase pipeline**, I want the test suite to verify that every artifact type required by a skill (via its `## Required Artifacts` section) has a corresponding output instruction in the command that invokes it, so that command↔skill wiring gaps are caught at test time—preventing silent shipping of broken artifacts.

### Acceptance Criteria

- [ ] **AC1 (Artifact registry contract — happy path):**
  Given a skill with a `## Required Artifacts` section listing artifact types with naming pattern, target path, and optional condition (e.g., `| [feature].integration.test.* | tests/integration/ | Phase 5 only |`),
  When the wiring contract test runs,
  Then it verifies that the command invoking that skill includes output instructions referencing both the naming pattern AND the target path for each artifact.

- [ ] **AC2 (Catches known gap — integration test missing):**
  Given the pre-fix state where `skills/tdd/SKILL.md` requires artifact `[feature].integration.test.*` (path: `tests/integration/`) but `commands/test-design.md` only provides output slots for `tests/contracts/` and `tests/e2e/`,
  When the wiring contract test runs against this state,
  Then it fails with a message identifying the missing artifact slot by skill, artifact name, and target command.

- [ ] **AC3 (Registry parse error — malformed artifact section):**
  Given a skill with a `## Required Artifacts` section that is malformed (missing required columns, invalid table format, etc.),
  When the wiring contract test parses that skill,
  Then it fails with a parse error identifying the skill name and the malformation.

- [ ] **AC4 (Phase 5 verification step — canonical location):**
  Given a developer implementing skill changes,
  When they follow the Phase 5 verification checklist in `commands/implement.md` (canonical single location—not delegated to TDD skill),
  Then they find an instruction: "For every new artifact type introduced in a skill's `## Required Artifacts` section, verify the corresponding command includes output instructions (naming pattern + target path) for that artifact."

- [ ] **AC5 (Phase 3 verification step — test-design command):**
  Given a QA agent designing tests,
  When they follow the Phase 3 verification steps in `commands/test-design.md`,
  Then they find an instruction to confirm that every artifact type listed in any skill's `## Required Artifacts` section has a corresponding output slot in `commands/test-design.md`.

- [ ] **AC6 (Skill artifact registry format — universal standard):**
  Given any skill that requires agents to produce named, timestamped artifacts,
  When a developer reads that skill,
  Then they find a `## Required Artifacts` section with a Markdown table: `| Artifact | Pattern | Path | Condition |`, where Artifact is a human-readable name, Pattern is the naming convention (e.g., `[feature].unit.test.*`), Path is the output directory (e.g., `tests/unit/`), and Condition is empty or a phase/runtime qualifier (e.g., "Phase 5 only").

- [ ] **AC7 (Empty state — no artifacts declared):**
  Given a skill with no `## Required Artifacts` section,
  When the wiring contract test evaluates that skill,
  Then it passes without error and logs "Skill has no required artifacts—no wiring to verify."

- [ ] **AC8 (Conditional artifacts — mention check):**
  Given a skill with a conditional artifact (Condition column non-empty, e.g., "Phase 5 only"),
  When the wiring contract test evaluates that artifact,
  Then it verifies that the command mentions that artifact by name or pattern (condition evaluation is runtime, not test-time; test only confirms the artifact is acknowledged in the command).

- [ ] **AC9 (Multiple valid output paths — at least one matches):**
  Given a command that lists multiple acceptable output paths for the same artifact type (e.g., "output may go to `tests/unit/` or `tests/components/unit/`"),
  When the wiring contract test evaluates that artifact,
  Then it passes if at least one path in the command's output instructions matches the artifact's target path.

- [ ] **AC10 (No regression — existing tests pass):**
  Given all existing tests in the suite,
  When the new wiring contract test is added,
  Then all existing tests continue to pass, and the new test is added as a separate, non-blocking fixture (passes against all current codebase state before the feature ships).

- [ ] **AC11 (Regression proof — negative test fixture):**
  Given a dedicated negative test fixture (a mock skill with a required artifact + a mock command without that artifact's output slot),
  When the wiring contract test evaluates this fixture,
  Then it fails with a clear, actionable error message, proving the gap detection works.

### Screen States

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| **Contract Test Output** | Skill has no `## Required Artifacts` — logs "no wiring to verify", passes | Scanning skill registries and cross-referencing command output slots | Pass/fail per skill↔command pair (e.g., "✓ tdd → test-design: integration.test.* → tests/integration/") | Mismatch: artifact required but command lacks pattern or path; test fails naming skill, command, artifact, and what's missing | All wiring checks pass, exit 0 |
| **Registry Parse Error** | No `## Required Artifacts` section — skipped | Parsing artifact table columns | _(n/a — skipped)_ | Malformed table (missing columns, invalid format); fails naming skill file and parse error | Registry parses; wiring checks proceed |
| **Phase 5 Checklist** | No new artifact types in skill changes — step skipped | Developer auditing skill diffs for new artifact entries | Checklist item: "Verify command includes output slot (pattern + path) for each new artifact" | New artifact found without command wiring — must fix before commit | All new artifacts have command wiring confirmed |
| **Phase 3 Checklist** | No test-level gaps — step passes | QA cross-referencing TDD skill levels against command output slots | Verification: "Confirm output paths for unit, integration, E2E" | Gap: skill requires integration tests but command omits that slot | All test levels have output slots in command |

### Out of Scope

- Modifying skill content itself (ISS-022: integration-test-coverage)
- Changing artifact-timestamp fitness functions or Codex reviewer prompts (ISS-001: invariants-audit)
- Fixing `init.sh` helper wiring (ISS-009: resolve-feature-coverage)
- General Phase 5/Phase 3 checklist content beyond the wiring verification step
- Runtime enforcement—this is test-time detection only
- Phase 2/4/6/7 command modifications—v1 targets test-design and implement only
- Handling skills with no named artifacts (e.g., pure guidance skills)—pass without error

### Dependencies

- **Prerequisite:** Test infrastructure (Node.js test runner) already in place
- **Assumption:** Skills can adopt a `## Required Artifacts` section as a new convention (no blocker; this ticket defines the convention)
- **Benefits from:** ISS-013 (skill size convention)—progressive disclosure makes artifact requirements easier to enumerate
- **Complements:** ISS-025 (adversarial self-review)—provides a concrete checklist item for self-review

### RICE Score

Reach: 1 (framework developers) | Impact: 4 (prevents silent-fail defects) | Confidence: 5 (known gap, clear fix) | Effort: 2 | **Score: 10**

### Definition of Done

- [ ] Wiring contract test exists, validates artifact registry format and command output instructions
- [ ] Test fails against pre-fix state (catches integration-test-coverage gap)
- [ ] Test includes negative fixture (dedicated mock skill+command pair with known gap)
- [ ] Test passes for empty-state (skill with no artifacts)
- [ ] `commands/test-design.md` includes Phase 3 verification step
- [ ] `commands/implement.md` includes Phase 5 verification step (canonical location)
- [ ] Contract test passes for all three registry states: missing section, malformed section, well-formed section
- [ ] All existing tests pass
- [ ] QA signed off
- [ ] No P1/P2 bugs open
