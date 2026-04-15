## Feature: QA Test Quality Hardening
**Generated:** 2026-04-15T10:00:00Z
**Phase:** Specify | Date: 2026-04-15
**Tickets:** ISS-043, ISS-045, ISS-049

### User Story

As a pipeline operator,
I want the QA agent to produce tests that catch real defects on first pass,
so that Phase 3 test design does not require ~50% rework from Codex review feedback.

### Background

Three recurring Phase 3 quality gaps surfaced across ISS-008, ISS-027, ISS-029, and ISS-039:

1. **Symmetric coverage (ISS-043):** QA tests one representative of an enumerated set instead of all members. Developer implements to pass tests, propagating the asymmetry. Phase 6 catches it.
2. **Adversarial robustness (ISS-045):** QA tests whether a contract is satisfied but not whether it can be trivially evaded (comment-only matches, unbounded escape hatches). Codex catches it.
3. **Test strategy selection (ISS-049):** QA defaults to structural string-presence checks even for executable code, where string presence does not prove runtime behavior. Codex catches it.

All three are additive guidance changes to `commands/test-design.md` and `skills/tdd/SKILL.md`. No existing behavior changes.

**Structural constraint:** The TDD skill is at 112 lines — at the progressive disclosure threshold (120 prose). Adding three guidance sections inline would exceed the skill size budget. The code-review skill already solved this by splitting into `SKILL.md` + sibling reference files (ISS-039). The architect should evaluate whether the TDD skill should adopt the same pattern: a `skills/tdd/test-quality-rules.md` sibling reference file for expandable test quality rules, keeping `SKILL.md` focused on the core TDD cycle.

### Acceptance Criteria

Traceability: PRD AC1-5 = ISS-043 AC1-5, PRD AC6-8 = ISS-045 AC1-3, PRD AC9-13 = ISS-049 AC1-5.

#### ISS-043 — Symmetric testing

- [ ] **AC1:** Given `commands/test-design.md` is read by the QA agent, when the architecture enumerates multiple components receiving the same treatment, then the command instructs: "Write tests for ALL enumerated components, not just one representative."
- [ ] **AC2:** Given the TDD skill's "What to Test First" list (in SKILL.md or a sibling reference file loaded by it), when a QA agent consults it, then it includes: "Symmetric requirements across all enumerated components."
- [ ] **AC3:** Given the test suite runs, when contract tests execute, then a test verifies the symmetric-testing instruction exists in `commands/test-design.md` using structural anchors.
- [ ] **AC4 (Behavioral binding):** Given `commands/test-design.md` is read by the QA agent, when writing test assertions, then the command instructs: "Tests must bind to the specific behavior the PRD requires — not just assert that a keyword exists in the file."
- [ ] **AC5 (Negative-pattern testing):** Given `commands/test-design.md` is read by the QA agent, when an AC specifies a 'must not' property, then the command instructs: "Write a negative-pattern assertion that fails if the forbidden pattern is present — do not rely on ordering alone as a proxy for conditionality."

#### ISS-045 — Adversarial contract testing

- [ ] **AC6:** Given `commands/test-design.md` is read by the QA agent, when writing contract tests (tests that assert a safety invariant), then the command instructs: "Also test that the contract cannot be trivially satisfied — e.g., commented-out code, escape hatches that grow unbounded, string matches that hit dead code."
- [ ] **AC7:** Given the TDD skill's "What to Test First" list (in SKILL.md or a sibling reference file loaded by it), when a QA agent consults it, then it includes: "Contract robustness — can the safety invariant be trivially evaded?"
- [ ] **AC8:** Given the test suite runs, when contract tests execute, then a test verifies the adversarial-contract instruction exists in `commands/test-design.md` using structural anchors.

#### ISS-049 — Fixture-driven test strategy

- [ ] **AC9:** Given the TDD skill (SKILL.md or a sibling reference file loaded by it) is read by the QA agent, when the production artifact is executable code (shell script, JS module), then the skill includes guidance distinguishing structural checks (for declarative artifacts) from fixture-driven behavioral tests (for executable code).
- [ ] **AC10:** Given `commands/test-design.md` is read by the QA agent, when deciding test strategy, then the command includes a decision point: "Is the production artifact executable code or declarative text?" that routes QA to the appropriate test pattern.
- [ ] **AC11:** Given the guidance in AC9/AC10, when a QA agent reads it, then it includes an artifact-type-to-test-strategy table (or equivalent) so agents can pattern-match: markdown = structural, executable = fixture-driven, config = schema + fixture.
- [ ] **AC12 (No regression):** Given the existing test suite, when all tests run after implementation, then all previously passing tests continue to pass.
- [ ] **AC13 (Stack-agnostic):** Given the guidance in AC9/AC10/AC11, when read by any agent, then it is not specific to shell/Node/Python but includes "adapt to your stack" language with multiple toolchain examples.

### Screen States

Not applicable — this feature modifies framework methodology documents, not user-facing UI.

### Out of Scope

- Changing existing test patterns for declarative artifacts (structural checks on markdown remain correct)
- Invalidating existing passing tests
- Creating a new top-level skill (sibling reference files within `skills/tdd/` are in scope if the architect decides to split)
- Modifying any code in `src/`, `hooks/`, or `lib/`
- Codex review method changes (ISS-027 already addressed the Codex side)

### Dependencies

- ISS-036 (closed) — `commands/test-design.md` was last modified here; changes build on that baseline
- ISS-022 (closed) — `skills/tdd/SKILL.md` was last modified here; changes build on that baseline
- Tests must use structural anchors per `docs/CLAUDE.md` convention (heading names, template field labels), not phrase-binding
- Guidance must be stack-agnostic per `docs/CLAUDE.md` convention
- Skill size budget: TDD SKILL.md is at 112 lines; progressive disclosure threshold is 120 prose lines. Architect must decide whether to split into sibling reference files (precedent: code-review skill, ISS-039)
- **Assumption (diverges from ticket AC):** AC2 (ISS-043 AC2), AC7 (ISS-045 AC2), and AC9 (ISS-049 AC1) changed location from the ticket-specified `skills/tdd/SKILL.md` to "SKILL.md or a sibling reference file loaded by it." Reason: TDD skill is at the progressive disclosure threshold; the architect needs freedom to split content into a sibling file. The required *content* is unchanged — only the *location* is flexible.

### RICE Score

Reach: High (every Phase 3 session) | Impact: High (prevents ~50% rework) | Confidence: High (3 RCA-evidenced gaps) | Effort: Low (additive text changes) | **Score: 30**

### Definition of Done

- All ACs pass in test suite
- Contract tests use structural anchors, not phrase-binding
- `node --test tests/` passes with zero failures
- No existing test regressions
- Handoff written for Phase 2
