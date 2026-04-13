## Feature: Skill Size Convention & Progressive Disclosure
**Generated:** 2026-04-12T14:30:00Z  
**Phase:** Specify | Date: 2026-04-12  
**Ticket:** ISS-013

### User Story
As a framework maintainer, I want to replace the strict ~100-line skill budget with a progressive-disclosure pattern that separates instructional prose from templates and examples, so that skills can be comprehensive without forcing authors to sacrifice clarity or violate the convention in practice.

### Acceptance Criteria

- [ ] **AC1 — Size budget updated:** Given the docs/CLAUDE.md conventions section, When I read the skill size constraint, Then it states: ~150 lines instructional prose (templates/tables/examples excluded); progressive disclosure at 250 total lines; split into SKILL.md + reference files.

- [ ] **AC2 — Progressive disclosure pattern documented:** Given a skill author reading docs/CLAUDE.md or skills/SKILL_AUTHORING.md, When they search for "progressive disclosure," Then they find a clear example showing: (a) slim SKILL.md with core concepts only, (b) one or more reference files for expanded guidance/tables/examples, (c) links between them.

- [ ] **AC3 — Stop conditions footer rule documented:** Given the pattern documentation, When an author writes a high-stakes skill (e.g., verification-gate, security-audit), Then the documentation requires them to repeat stop conditions at the end of the file (not just the top), with a note explaining why (e.g., "Reviewer may skim; footer prevents missing hard constraints").

- [ ] **AC4 — Pilot skill converted:** Given skills/verification-gate.md, When the conversion is complete, Then: (a) SKILL.md ≤120 lines of instructional prose, (b) per-phase detail moved to docs/features/verification-gate-skill/ or similar reference directory, (c) links from SKILL.md to reference files are present and correct, (d) all content is preserved (nothing removed, only reorganized).

- [ ] **AC5 — Migration audit complete:** Given all existing skills, When the audit is complete, Then a report exists (docs/memory/skill-migration-audit.md or similar) listing: (a) skills already ≤120 lines prose (no action), (b) skills that need progressive disclosure (candidates for future conversion), (c) any skills violating the convention (and why).

- [ ] **AC6 — Contract tests pass:** Given contract tests for skills (e.g., tests validating SKILL.md frontmatter, line counts, stop-condition presence), When run against both inline and progressive-disclosure skills, Then all tests pass without modification to test code.

- [ ] **AC7 — No regression:** Given the pilot skill (verification-gate) in progressive-disclosure format, When a phase command runs a full end-to-end check (e.g., architect reads docs/features/<feature>/prd.md and calls the verification-gate skill), Then the output is correct and the skill is loaded/parsed without errors.

- [ ] **AC8 — Enforcement test added:** Given the new size budget, When a pre-merge check or contract test runs, Then it validates: (a) SKILL.md ≤120 lines of prose (templates/tables don't count), (b) no errors if progressive disclosure is used correctly, (c) test fails if new skills exceed budget without splitting.

### Screen States

This is a framework convention change, not a UI feature. The table below captures developer-experience states during skill authoring and validation workflows.

| Workflow | Empty / N/A | Normal | Error | Success |
|----------|-------------|--------|-------|---------|
| **Skill Authoring** | N/A — author always has a file open | SKILL.md open; author sees budget reminder (≤150 lines prose; split at 250 total) | Pre-merge check fails: "Skill exceeds 250-line threshold. Split per AC2 pattern." | Author trims or splits; commit proceeds |
| **Contract Test Run** | N/A | Tests pass for inline skills ≤250 lines and progressive-disclosure skills (SKILL.md ≤120 + reference files) | Test fails: "verification-gate is 287 lines, exceeds cap. Trim or split." | All skills comply; AC6 verified |
| **Pre-Merge Enforcement** | N/A | Size audit runs silently; all skills pass | Hook blocks commit with per-skill violation list | All skills meet budget; hook exits cleanly; AC8 verified |

### Out of Scope
- Mass conversion of all skills to progressive disclosure (only verification-gate is piloted)
- Renaming any skill (ISS-018)
- Adding allowed-tools frontmatter to skills (ISS-019)
- Re-running ISS-010 implementation against the new budget

### Dependencies
- No external blockers; assumes write access to docs/CLAUDE.md, skills/, and tests/
- Progressive disclosure pattern must be finalized before AC4 begins

### RICE Score
**Reach:** 8 (all skill authors, affects developer experience across all phases)  
**Impact:** 7 (removes friction, enables richer skill content, clarifies convention)  
**Confidence:** 9 (ticket is well-scoped, convention is testable)  
**Effort:** 5 (audit + pilot conversion + doc updates; no large refactor)  
**Score:** (8 × 7 × 9) ÷ 5 = **100.8**

### Definition of Done
- All 8 ACs pass in staging (contract tests, audit report, pilot skill validation)
- QA signed off on contract tests and spot-check validation (AC7)
- No P1 or P2 bugs open against this story
- Migration audit and new budget rules committed to main
- Release notes capture: new size budget, progressive disclosure pattern, verification-gate pilot result
