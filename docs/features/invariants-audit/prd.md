## Feature: Invariants-Audit Skill for Cross-Layer Semantic Review
**Generated:** 2026-04-16T20:30:00Z
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
  Then a new skill file exists at `skills/invariants-audit/SKILL.md` following the skill size budget (SKILL.md <=120 prose lines, sibling reference files as needed, stop conditions footer required),
  and if the skill is split into sibling reference files, SKILL.md links each sibling using the `[See reference: .claude/skills/invariants-audit/<reference>.md]` convention.

- [ ] **AC1a (Installer/sync coverage):**
  Given the source skill exists at `skills/invariants-audit/SKILL.md`,
  When `init.sh` or `upgrade.sh` runs on a target project,
  Then the skill is installed to `.claude/skills/invariants-audit/SKILL.md` (and any sibling reference files),
  and a byte-identity sync test verifies source and installed copies remain identical,
  and reviewer commands that load the skill from `.claude/skills/` can resolve the installed path at runtime.

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
  Then each listed Codex reviewer prompt contains a dedicated `## Invariant Checks` section with an `**Apply when:**` trigger condition and a checklist derived from the skill's review categories (AC2):
    - `codex/reviewers/review-code.md`
    - `codex/reviewers/review-prd.md`
    - `codex/reviewers/review-architecture.md`
    - `codex/reviewers/review-test-design.md`

- [ ] **AC6 (Regression test):**
  Given the skill is installed,
  When the test suite runs,
  Then the wiring contract test suite (`tests/node/command-skill-wiring.test.js`) verifies:
    - **Claude commands (AC4):** each command's `## Skill References` table contains a row with `invariants-audit` and the correct source path `skills/invariants-audit/SKILL.md`
    - **Codex reviewers (AC5):** each reviewer file contains a `## Invariant Checks` section with an `**Apply when:**` trigger line and at least one checklist item derived from the review categories (AC2)
    - **Structural anchors:** the skill file contains required section headings (`## Review Categories`, `## Invariant Review Method`, `## When to Use`) without asserting exact prose wording

- [ ] **AC7 (Usage guidance):**
  Given a reviewer needs to decide which review method to use,
  When they consult the skill,
  Then it documents when to use invariants-audit versus normal code review, architecture review, or QA review — with clear trigger conditions (workflow logic, state transitions, safety checks, test architecture changes).

### Screen States

| Screen | Empty | Loading | Populated | Error | Success |
|--------|-------|---------|-----------|-------|---------|
| Skill loading (CLI) | Skill file not found — command reports missing skill path | N/A (file read) | Skill loaded, reviewer applies method | Skill file malformed or missing required sections | Review produces findings using invariant method |
| Review output | No invariant findings — reviewer confirms clean | N/A | Reviewer applies the 5-step method (AC3) and produces findings | Skill method not loaded or required sections missing | Review complete, findings follow the invariant method |
| Permission denied | N/A | N/A | Skill file located but not readable — command reports permission error with path | Command cannot proceed; reports permission error | N/A |
| Partial integration | N/A | N/A | Some consumers load the skill, others do not reference it | Wiring contract test fails, naming the non-compliant consumer(s) | All declared consumers pass wiring check |
| Broken sibling ref | N/A | N/A | SKILL.md exists but a `[See reference: ...]` link points to a missing sibling file | Command reports broken reference with expected path | All sibling references resolve to existing files |
| Installed-but-stale | N/A | N/A | Source skill updated but `.claude/skills/invariants-audit/` copy is outdated or missing | Sync test fails, reporting byte-identity mismatch between source and installed paths | Sync test passes; source and installed copies are identical |
| Upgrade path failure | N/A | N/A | Fresh `init.sh` installs skill correctly | `upgrade.sh` misses new skill files — installed copy absent or incomplete; sync test fails | Both `init.sh` and `upgrade.sh` produce identical installed copies |

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
- **Installer coverage (AC1a):** `init.sh` and `upgrade.sh` must copy `skills/invariants-audit/` to `.claude/skills/invariants-audit/` including all sibling reference files. Byte-identity sync tests (established by ISS-009) must cover the new skill.
- **AC5 reviewer list (diverges from ticket):** The original ticket referenced `codex/reviewers/review-security.md`, which does not exist. This PRD substitutes `codex/reviewers/review-prd.md`. If a dedicated security reviewer prompt is needed, create it as a separate ticket.

### RICE Score
Reach: High (all reviewers) | Impact: High (catches defect class that survives tests) | Confidence: High (5+ real incidents documented) | Effort: Medium (new skill + integration into 8 consumer files) | **Score: 12**

### Definition of Done
- All ACs pass in staging
- QA signed off
- No P1/P2 bugs open
- Wiring contract tests pass for all consuming commands
- Source/installed sync tests pass for the new skill (byte-identity between `skills/` and `.claude/skills/`)
- `init.sh` and `upgrade.sh` both install the skill and its sibling reference files
