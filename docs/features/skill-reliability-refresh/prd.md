## Feature: Skill Reliability Refresh (ISS-010)
**Phase:** Specify | Date: 2026-04-07

### User Story

As a framework maintainer,
I want the core skills and companion commands to give clearer, more reliable guidance,
So that agents miss less context, handle ambiguity better, and make fewer avoidable mistakes without bloating prompts.

### Acceptance Criteria

- [ ] **AC1 (Core Scope):** Given the first implementation pass, When ISS-010 ships, Then `prd-writing`, `architecture-decision`, `tdd`, and `verification-gate` are updated before any non-core skill refresh is required.
- [ ] **AC2 (Reliability Structure):** Given each refreshed core skill, When an agent reads it, Then the skill front-loads the highest-leverage guidance through compact sections such as success criteria, deliverables, verification, or stop conditions instead of burying key rules in prose.
- [ ] **AC3 (Failure Handling):** Given ambiguous inputs, stale state, malformed artifacts, or conflicting signals, When a refreshed skill or paired command is used, Then it tells the agent how to stop, escalate, or recover instead of improvising silently.
- [ ] **AC4 (Architecture Robustness):** Given `architecture-decision` is used, When an architecture artifact is produced, Then it captures revisit/rollback discipline, confidence, and trust-boundary considerations without materially bloating the output.
- [ ] **AC5 (TDD Robustness):** Given `tdd` is used in test-design or implementation, When the agent runs RED and GREEN, Then it must validate the intended failure reason, identify concrete happy/edge/adversarial cases, and avoid optimizing only for the current tests.
- [ ] **AC6 (Verification Precision):** Given `verification-gate` is used, When an agent verifies a phase, Then the guidance prefers feature-scoped and deterministic checks over coarse project-wide commands wherever practical.
- [ ] **AC7 (Command Alignment):** Given a core skill changes its required behavior, When companion commands are updated, Then command instructions align with the new skill expectations for inputs, outputs, and stop conditions.
- [ ] **AC8 (Context Discipline):** Given the refreshed skills and commands, When compared to the prior versions, Then the new guidance improves signal density without meaningfully increasing prompt sprawl or overlapping rules.
- [ ] **AC9 (Regression Protection):** Given downstream tooling or tests depend on skill/command guidance, When ISS-010 lands, Then deterministic tests or contract checks are added or updated to protect the new behaviors.

### Screen States

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| **Skill Guidance** | Existing skill lacks strong reliability guidance | Maintainer reviewing skill for improvement opportunities | Skill has compact structure, explicit outputs, and stop conditions | Guidance is contradictory, bloated, or ambiguous | Skill is clearer, more deterministic, and easier to follow |
| **Command Execution** | Agent has not started a pipeline phase yet | Agent is reading skills and phase instructions | Command points to exact inputs, outputs, and verification for the feature | Command allows stale state, malformed inputs, or silent fallback | Command and skill stay aligned and reduce avoidable mistakes |
| **Verification** | No feature-specific verification chosen | Agent selecting checks for current phase | Checks target the active feature and expected artifact | Verification is too coarse, flaky, or non-deterministic | Verification gives a clear pass/fail signal for the current phase |

### Out of Scope

- Refreshing every non-core skill in the same first pass
- Replacing the role/command/skill separation with a new prompt architecture
- Adding large generic prompt sections that increase token load without improving outcomes
- Making Codex review a mandatory gate for this feature on its own

### Dependencies

- Existing command contracts and tests remain available as regression anchors
- Core skill changes may require matching command/test updates in the same branch
- Current prompt-engineering and ADR best practices should inform the refresh

### RICE Score

| Reach | Impact | Confidence | Effort | **Score** |
|-------|--------|------------|--------|-----------|
| 9 | 3 | 80% | 2 wks | **108** |

### Definition of Done

- All ACs pass in staging
- Core skills and paired commands are aligned
- Deterministic checks cover the new high-leverage behaviors
- Review artifacts summarize the major reliability improvements and any follow-ups
