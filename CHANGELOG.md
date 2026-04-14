# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Canonical version note: major version `5` begins with the `version5-codex+token-governance` line. Earlier release artifacts were temporarily labeled `0.x`; this changelog reflects the canonical `5.x` mapping. Some `5.1.x` entries preserve their original v5 branch-authored dates, so the dates do not align perfectly with the later normalized `5.0.0` baseline. See [RELEASE.md](RELEASE.md) for the transition table.

## [Unreleased]

No unreleased changes documented yet.

---

## [5.5.0] — 2026-04-14

### Added
- **Command↔skill wiring verification library** — new `lib/wiring-check.js` implements a 4-stage algorithm (discovery, registry parse, wiring check, negative fixture) that verifies every artifact type declared in a skill's `## Required Artifacts` table has a corresponding output instruction in the invoking command's Output section
- **`## Skill References` table convention for commands** — commands that load skills must declare them in a structural `| Skill | Source path |` table; fail-closed heuristic catches commands with skill-loading prose but no table
- **`## Required Artifacts` table convention for skills** — skills that require agents to produce named artifacts declare them in a 4-column table (`Artifact | Pattern | Path | Condition`); the wiring checker validates this format and rejects malformed tables with descriptive errors
- **Artifact Wiring Verification step in Phase 5 and Phase 3** — `commands/implement.md` and `commands/test-design.md` now include a verification step requiring developers and QA agents to confirm all skill artifacts have output slots before committing
- **Negative test fixture for wiring gaps** — `tests/fixtures/wiring-gap/` contains mock skill and command files with a deliberate artifact gap, proving gap detection works
- **Conditional artifact enforcement** — artifacts with a non-empty Condition column (e.g., "Phase 5 only") receive the same full pattern+path wiring check as unconditional artifacts; the Condition is informational only
- **Multi-path wiring support** — wiring check passes when at least one of multiple declared output paths matches the command's Output section
- **Blank-cell parser validation** — blank Pattern or Path cells in Required Artifacts tables and blank Source path cells in Skill References tables now throw descriptive errors instead of silently bypassing the wiring check
- **Source/installed sync tests for commands** — byte-identity sync tests now cover `commands/implement.md` and `commands/test-design.md` in addition to skills and hooks

### Changed
- **All pipeline commands now have `## Skill References` tables** — architect, document, implement, review, security-gate, specify, and test-design commands now explicitly declare their skill dependencies in a structural table
- **`commands/test-design.md` Output section expanded** — now includes `tests/integration/` path with `[feature].integration.test.*` pattern, closing the gap identified in ISS-022

### Fixed
- **Blank Pattern cell fail-open bypass** — a blank Pattern cell previously parsed as empty string, causing `String.includes('')` to return true for any command text, silently passing the wiring check; now rejected as malformed
- **Blank Source path EISDIR error** — a blank Source path in Skill References previously resolved to the repo root directory, throwing a raw EISDIR error; now caught with a descriptive error message

### Security
- No security changes in this release

### Deprecated
- N/A

### Removed
- N/A

---

## [5.4.0] — 2026-04-13

> Upgrade warning: `5.4.0` introduces a new Phase 3 gating factor. Upgrading agents mid-feature-cycle is strongly discouraged because existing test-design outputs may not satisfy the new integration-test artifact and verification requirements.

### Added
- **Three-level test coverage guidance (unit, integration, E2E)** — TDD skill now explicitly defines three test levels and naming conventions; integration tests call the production entry point and assert visible effects in output; Phase 3 test design requires all three levels
- **Integration test output slot wired in test-design command** — test-design command now includes `tests/integration/$ARGUMENTS.integration.test.ts` as a required output artifact alongside unit and E2E shells; blocking verification gate confirms at least one test imports the production entry point
- **Fixture validation requirement** — TDD skill now requires QA agents to read production schemas/types/enums before writing fixtures; fixture values must match production schema exactly
- **Degenerate input coverage rule** — TDD skill requires testing of degenerate values when validation constraints are widened; minimum required set: empty string, whitespace-only, and max-length boundary
- **Architecture dependency for integration tests documented** — TDD skill requires architecture doc to include "Call Chain" or "Integration Points" section; if missing, QA agent adds ARCH GAP comment to test file and flags gap in handoff
- **PIPELINE_GUIDE.md Phase 3 deliverables updated** — integration tests now explicitly listed alongside unit and E2E tests as Phase 3 output
- **Integration test verification is blocking, not advisory** — Phase 3 verification fails if no test imports production entry point with visible effect assertion (import-only shells do not satisfy this requirement)

### Changed
- **TDD skill expanded** — added Coverage Rules, Fixture Validation, Degenerate Input Boundaries, and Architecture Dependency sections; skill remains within size budget

### Fixed
- **command/test-design.md integration output path** — previously had no explicit output slot for integration test files; now includes tests/integration/ directory with blocking verification

### Security
- No security changes in this release

### Deprecated
- N/A

### Removed
- N/A

---

## [5.3.0] — 2026-04-13

### Added
- **Skill size convention revised** — inline skills now allow ~150 lines instructional prose (templates/tables/examples excluded) with a 250-line total threshold, replacing the previous ~100-line constraint that conflated different content types and discouraged necessary detail
- **Progressive disclosure pattern for skills** — skills exceeding the 250-line inline threshold can now split into a compact SKILL.md (≤120 prose lines covering the core job-to-be-done) plus sibling reference files at `skills/<name>/<reference>.md` for per-phase or context-specific detail, enabling maintainability without sacrificing depth
- **Stop conditions footer rule** — pipeline-gating skills (verification-gate, security-audit, tdd, code-review) must now end with a `**STOP CONDITIONS (end of file):**` marker to ensure reviewers don't miss hard constraints when skimming
- **verification-gate skill pilot conversion** — verification-gate converted to progressive-disclosure pattern with per-phase reference files, demonstrating signal-positive trimming (not just reorganization) and validating the new structure works end-to-end
- **Skill migration audit report** — dynamic audit of all existing skills in `docs/memory/skill-migration-audit.md` identifies compliance tiers (Compliant ≤250 lines, Needs Trimming 251–300 lines, Needs Splitting >300 lines) with line counts and total inventory
- **Enforcement tests for skill size budget** — pre-merge validation ensures inline skills ≤250 lines and progressive-disclosure skills follow SKILL.md ≤120 + reference file pattern, with clear error messages blocking violations
- **Drift detection for root/docs conventions** — synchronization check verifies that root CLAUDE.md and docs/CLAUDE.md state identical skill size rules, preventing divergence and ensuring single source of truth

### Changed
- **docs/CLAUDE.md Code Conventions** — updated skill size budget rule to reflect new ~150-line prose / ~250-line total inline threshold with progressive disclosure pattern; includes worked example of verification-gate split
- **docs/CLAUDE.md Memory table** — updated expected skill size from ~100 to ~150 lines to match new convention

### Fixed
- No bug fixes in this release

### Security
- No security changes in this release

### Deprecated
- N/A

### Removed
- N/A

---

## [5.2.0] — 2026-04-13

### Added
- **Artifact timestamp convention** — all pipeline-generated feature artifacts now include a `**Generated:** <ISO 8601>` metadata line immediately after the document's top-level heading, enabling pipeline operators to identify when artifacts were produced and trace multi-phase review cycles
- **Timestamp regeneration** — when an artifact is regenerated in a later phase or review cycle, the timestamp is automatically updated to the current time rather than preserved from the earlier run, ensuring timestamps always reflect the artifact's actual generation moment
- **Cross-agent timestamp guidance** — all pipeline command templates (specify, architect, test-design, security-gate, review) and Codex reviewer prompts now include consistent timestamp placement instructions; the convention is documented as a canonical requirement in `docs/CLAUDE.md`
- **Timestamp regression tests** — new test suite verifies that all artifact-producing commands and skill templates reference the timestamp convention, and validates the convention is documented in the Code Conventions section

### Changed
- **docs/CLAUDE.md Code Conventions** — added artifact timestamp requirement as a "Must Follow" convention with placement and regeneration rules

### Fixed
- No bug fixes in this release

### Security
- No security changes in this release

### Deprecated
- N/A

### Removed
- N/A

---

## [5.1.1] — 2026-04-11

### Added
- **Feature resolution safety across all pipeline commands** — phases 2-7 (architect, test-design, security-gate, review) now wire through `resolve-feature.js`, enforcing strict argument validation and failing hard on feature mismatches or stale handoffs instead of silently proceeding on malformed args
- **New resolve-feature.js helper** — canonical source in `hooks/` with safe CLI argument parsing, fallback to handoff.json when no explicit args provided, and regression tests covering all decision-matrix paths (invalid args, feature mismatch, slug parsing, handoff staleness)
- **Byte-identity sync guarantee for helpers** — tests now assert `assert.equal(source, installed)` for both `checkpoint.js` and `resolve-feature.js`, preventing drift between canonical hooks and installed copies
- **Regression test suite for resolve-feature** — 18 new tests covering unknown flag rejection, trailing positional token rejection, --args edge cases, feature mismatch detection, stale handoff detection, and all handoff decision paths

### Changed
- **All phase commands now wire through resolve-feature.js** — /architect, /test-design, /security-gate, and /review now call `resolve-feature.js` with fail-hard semantics instead of lenient "read handoff and warn" pattern
- **installer scripts updated** — both init.sh and upgrade.sh now copy resolve-feature.js into target projects at `.claude/helpers/resolve-feature.js`
- **checkpoint.js installed copy synced** — .claude/helpers/checkpoint.js now byte-identical to hooks/checkpoint.js source (require.main guard, export statement, console.log→console.error conversion)

### Fixed
- **checkpoint.js require.main guard missing in installed copy** — .claude/helpers/checkpoint.js lacked the guard that prevented side effects when imported for testing; now synced to source
- **Installer gap: resolve-feature.js not deployed to target projects** — new helper was wired into commands but not copied by init.sh or upgrade.sh, breaking phases 2-7 in fresh installs; both installers now include it

### Security
- No security changes in this release

### Deprecated
- N/A

### Removed
- N/A

---

## [5.1.0] — 2026-04-10

### Added
- **Reliability refresh for core skills** — prd-writing, architecture-decision, tdd, and verification-gate now include explicit stop conditions, success criteria, and structured guidance for handling ambiguous or stale inputs
- **Revisit/rollback discipline in architecture decisions** — architecture-decision skill now captures decision confidence, revisit triggers, rollback procedures, and trust-boundary considerations
- **RED-phase failure validation** — tdd skill now requires agents to state the intended RED failure reason in one sentence and identify happy/edge/misuse-abuse cases before writing GREEN code
- **Feature-scoped verification commands** — verification-gate skill now prioritizes deterministic, feature-specific checks over coarse project-wide commands where practical
- **Core skill contract tests** — new deterministic tests (core-skill-contracts.test.js) verify structural reliability anchors, line-count budgets, and command alignment without binding to specific wording
- **Command alignment audit** — paired commands (implement, document, etc.) now align with new skill expectations for inputs, outputs, and stop conditions

### Changed
- **Skills compacted for signal density** — core skills consolidated from 553 lines to 409 lines while adding clearer failure-handling guidance; supports AC8 (improved signal density without prompt sprawl)
- **Verification-gate now feature-scoped** — Phase 3/5/6 guidance includes both feature-specific examples (npm test, node --test) and stack-agnostic comments instead of assuming one toolchain
- **Architecture-decision structure simplified** — removed templated preamble, kept highest-leverage concepts (confidence, revisit, rollback) expressed per-decision
- **TDD improved with concrete example** — "happy, edge, misuse-abuse" cases now paired with worked example (password reset endpoint scenario)

### Fixed
- **Source/installed skill drift** — skills and commands in source (skills/, commands/) now byte-identical to installed copies (.claude/skills/, .claude/commands/); verified by deterministic tests

### Security
- No security changes in this release

### Deprecated
- N/A

### Removed
- N/A

---

## [5.0.0] — 2026-04-11

### Added
- **Structured handoffs** — `.claude/handoff.json` established as the machine-readable contract between pipeline phases, validated by the Stop hook before the next phase can proceed
- **Token usage tracking** — `.claude/token-usage.jsonl` introduced for per-phase, per-iteration, and per-agent token accounting
- **Memory governance** — clearer rules introduced for what belongs in `CLAUDE.md`, skills, and handoff packets to reduce context bloat
- **Deployment tooling baseline** — `init.sh` and `upgrade.sh` established as the primary install and upgrade path for the framework
- **Codex review integration baseline** — optional Codex review layer documented as part of the v5 framework line

### Changed
- **Framework generation reset** — the `version5-codex+token-governance` line became the canonical major-version baseline for subsequent `5.x` releases

### Fixed
- N/A

### Security
- No security changes in this release

### Deprecated
- N/A

### Removed
- N/A

---

## [4.x and earlier] — Earlier

Refer to prior commits and feature PRDs for earlier release history.
