## Feature: Invariants-Audit Skill for Cross-Layer Semantic Review
**Generated:** 2026-04-16T12:00:00Z
**Phase:** Specify | Date: 2026-04-16
**Source ticket:** ISS-001

### User Story
As a pipeline reviewer (code-reviewer, architect, security-reviewer, or QA agent),
I want a reusable invariants-audit skill that teaches me to detect cross-layer semantic mismatches,
so that I catch contradictions between spec, implementation, hooks, and tests that survive passing test suites and normal code review.

### Acceptance Criteria

- [ ] **AC1 (Skill file):**
  Given the codingagents framework skills directory exists,
  When the invariants-audit skill is created,
  Then a new skill file exists at `skills/invariants-audit/SKILL.md` following the skill size budget (SKILL.md <=120 prose lines, sibling reference files as needed, stop conditions footer required).

- [ ] **AC2 (Review categories):**
  Given the invariants-audit skill is loaded by a reviewer,
  When the reviewer applies the skill,
  Then it teaches them to look for:
    - state-machine and next-step transition bugs
    - blocked / rejected / retry / stale-state paths
    - spec vs implementation vs tests vs hooks contradictions
    - fixture-template-validator mismatches
    - tests that prove syntax or structure but not behavior

- [ ] **AC3 (Invariant review method):**
  Given the skill is being applied to a review,
  When the reviewer follows the skill's method,
  Then it guides a 5-step invariant analysis:
    1. Identify the invariant
    2. Identify where it is encoded
    3. Identify where it is enforced
    4. Identify where it is tested
    5. Identify what happens on failure paths

- [ ] **AC4 (Claude role/command integration):**
  Given the skill file exists,
  When Phase 6 (code review), Phase 2 (architecture), or Phase 4 (security gate) runs,
  Then the most relevant Claude commands reference or load the invariants-audit skill:
    - `code-reviewer` / `commands/review.md`
    - `architect` / `commands/architect.md`
    - `security-reviewer` / `commands/security-gate.md`
    - `qa` / `commands/test-design.md` (included — see Dependencies)

- [ ] **AC5 (Codex reviewer integration):**
  Given the skill file exists,
  When Codex reviewers run their review prompts,
  Then the invariants-audit behavior is incorporated into:
    - `codex/reviewers/review-code.md`
    - `codex/reviewers/review-security.md`
    - `codex/reviewers/review-architecture.md`
    - `codex/reviewers/review-test-design.md`

- [ ] **AC6 (Regression test):**
  Given the skill is installed,
  When the test suite runs,
  Then at least one deterministic test verifies the skill's structural integrity and integration points (e.g., wiring contract test confirming consuming commands reference the skill, structural anchor tests for required sections).

- [ ] **AC7 (Usage guidance):**
  Given a reviewer needs to decide which review method to use,
  When they consult the skill,
  Then it documents when to use invariants-audit versus normal code review, architecture review, or QA review — with clear trigger conditions (workflow logic, state transitions, safety checks, test architecture changes).

### Screen States

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| Skill loading (CLI) | Skill file not found — command reports missing skill path | N/A (file read) | Skill loaded, reviewer applies method | Skill file malformed or missing required sections | Review produces findings using invariant method |
| Review output | No invariant findings — reviewer confirms clean | N/A | Findings listed with invariant, encoding, enforcement, test, and failure-path columns | Skill method not followed — findings lack cross-layer tracing | All findings include root cause and regression test recommendation |

### Out of Scope

- New mandatory pipeline phase (this is a loadable skill, not a new phase)
- Dedicated `system-auditor` role (may be considered later if usage proves the need)
- Automated invariant detection tooling (this is a reviewer methodology, not a static analysis tool)
- Changes to the pipeline sequence or handoff schema

### Dependencies

- **ISS-024 + ISS-014 (closed):** Review layer hardened — separate context, adversarial reviewers. Prerequisite met.
- **ISS-036 (closed):** Command-skill wiring contract tests exist. New skill must pass wiring tests.
- **Assumption (qa inclusion):** Ticket says "optionally qa" for AC4. This PRD includes qa (`commands/test-design.md`) because QA agents benefit from invariant thinking when designing tests for workflow logic. If this is unwanted, remove the qa line from AC4.
- **Skill size budget:** If the review categories (AC2) and method (AC3) plus usage guidance (AC7) exceed 120 prose lines, content must be split into sibling reference files per the convention in `docs/CLAUDE.md`.
- **Wiring contract:** Consuming commands must have a `## Skill References` table entry. The skill must have a `## Required Artifacts` table if it produces named artifacts.

### RICE Score
Reach: High (all reviewers) | Impact: High (catches defect class that survives tests) | Confidence: High (5+ real incidents documented) | Effort: Medium (new skill + integration into 8 consumer files) | **Score: 12**

### Definition of Done
- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
- Wiring contract tests pass for all consuming commands
- Source/installed sync tests pass for the new skill
