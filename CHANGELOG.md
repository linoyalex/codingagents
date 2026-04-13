# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] — 2026-04-13

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

## [0.6.0] — 2026-04-11

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

## [0.5.0] — 2026-04-10

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

## [0.4.0] — Earlier

Refer to prior commits and feature PRDs for earlier release history.
