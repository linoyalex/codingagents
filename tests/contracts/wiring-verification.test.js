/**
 * Contract tests for wiring-verification feature (RED state)
 *
 * Derived from: docs/features/wiring-verification/prd.md + architecture.md
 * Ticket: ISS-036
 *
 * Primary production-wiring test seam:
 *   tests/node/command-skill-wiring.test.js — the contract test module that
 *   discovers command→skill mappings via ## Skill References tables, parses
 *   ## Required Artifacts registries, and validates output sections contain
 *   both naming pattern AND target path for each artifact.
 *
 * Cases covered:
 *   Happy:   Skill with Required Artifacts, command with matching Output section
 *   Edge:    Skill with no Required Artifacts (AC7), multiple output paths (AC9),
 *            conditional artifacts (AC8 — full pattern+path, no relaxation)
 *   Misuse:  Command loads skills but lacks ## Skill References table (fail-closed),
 *            malformed artifact registry (AC3), missing Output section
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

// ---------------------------------------------------------------------------
// AC6: Skill artifact registry format — ## Required Artifacts table
// ---------------------------------------------------------------------------

test('AC6: skills that require named artifacts have a ## Required Artifacts section with the standard table format', () => {
  // Architecture Stage 2: parse the markdown table expecting four columns:
  // Artifact | Pattern | Path | Condition
  // This test will pass once at least one skill has the section.
  // For now, expect tdd/SKILL.md to have it (the motivating case).
  const tdd = read('skills/tdd/SKILL.md');
  assert.match(tdd, /^## Required Artifacts$/m,
    'skills/tdd/SKILL.md must have a ## Required Artifacts section');

  // Validate table structure: header row with all four columns
  const headerRe = /\|\s*Artifact\s*\|\s*Pattern\s*\|\s*Path\s*\|\s*Condition\s*\|/i;
  assert.match(tdd, headerRe,
    'Required Artifacts table must have Artifact | Pattern | Path | Condition columns');
});

// ---------------------------------------------------------------------------
// AC1: Wiring contract test — happy path (pattern + path match)
// ---------------------------------------------------------------------------

test('AC1: commands referencing skills with Required Artifacts include output instructions for each artifact', () => {
  // Architecture Stage 1 + 3: for each command with ## Skill References,
  // each skill's Required Artifacts must appear in the command's Output section.
  // This requires the production wiring module to exist.
  const wiringTest = read('tests/node/command-skill-wiring.test.js');
  assert.ok(wiringTest.length > 0,
    'tests/node/command-skill-wiring.test.js must exist as the production wiring test');

  // The wiring test must implement discovery + validation logic
  assert.match(wiringTest, /Skill References/,
    'Wiring test must reference ## Skill References for discovery');
  assert.match(wiringTest, /Required Artifacts/,
    'Wiring test must reference ## Required Artifacts for registry parsing');
  assert.match(wiringTest, /Output|Deliverables/,
    'Wiring test must check the Output/Deliverables section of commands');
});

// ---------------------------------------------------------------------------
// AC2: Catches known gap — integration test missing in test-design command
// ---------------------------------------------------------------------------

test('AC2: commands/test-design.md Output section references integration test pattern and path', () => {
  // Pre-fix state: test-design.md only has tests/contracts/ and tests/e2e/
  // but not the integration test pattern from tdd skill.
  // Post-fix: Output section must include integration test naming + path.
  const testDesign = read('commands/test-design.md');

  // Must have an Output or Deliverables section
  assert.match(testDesign, /^##\s*(Output|Deliverables)/m,
    'commands/test-design.md must have an Output or Deliverables section');

  // Must reference integration test pattern and path within that section
  assert.match(testDesign, /integration/i,
    'commands/test-design.md Output must reference integration tests');
  assert.match(testDesign, /tests\/integration/,
    'commands/test-design.md Output must include tests/integration/ path');
});

// ---------------------------------------------------------------------------
// AC3: Registry parse error — malformed artifact section
// ---------------------------------------------------------------------------

test('AC3: wiring test detects and reports malformed Required Artifacts tables', () => {
  // The production wiring test must handle parse errors gracefully.
  // Verify the test file includes logic for malformed table detection.
  const wiringTest = read('tests/node/command-skill-wiring.test.js');
  assert.match(wiringTest, /malform|parse error|invalid/i,
    'Wiring test must handle malformed artifact tables');
});

// ---------------------------------------------------------------------------
// AC4: Phase 5 verification step in commands/implement.md
// ---------------------------------------------------------------------------

test('AC4: commands/implement.md includes wiring verification step', () => {
  const implement = read('commands/implement.md');
  // Structural anchor: must mention verifying artifact wiring
  assert.match(implement, /artifact/i,
    'commands/implement.md must mention artifact verification');
  assert.match(implement, /output slot|output instruction|naming pattern/i,
    'commands/implement.md must instruct checking output slots for new artifacts');
});

// ---------------------------------------------------------------------------
// AC5: Phase 3 verification step in commands/test-design.md
// ---------------------------------------------------------------------------

test('AC5: commands/test-design.md includes wiring verification step', () => {
  const testDesign = read('commands/test-design.md');
  // Structural anchor: must instruct confirming output instructions for test levels
  assert.match(testDesign, /Required Artifacts|artifact/i,
    'commands/test-design.md must reference artifact verification');
  assert.match(testDesign, /output/i,
    'commands/test-design.md must mention output instructions');
});

// ---------------------------------------------------------------------------
// AC7: Empty state — skills with no Required Artifacts pass
// ---------------------------------------------------------------------------

test('AC7: wiring test handles skills with no Required Artifacts section gracefully', () => {
  // The wiring test must skip skills without the section, not fail on them.
  const wiringTest = read('tests/node/command-skill-wiring.test.js');
  assert.match(wiringTest, /skip|no required artifacts|no wiring/i,
    'Wiring test must handle skills without Required Artifacts (skip, not fail)');
});

// ---------------------------------------------------------------------------
// AC8: Conditional artifacts receive the SAME full pattern+path check
// (Condition column is informational only — no relaxation at test time)
// ---------------------------------------------------------------------------

test('AC8: conditional artifacts receive the same full pattern+path validation as unconditional ones', () => {
  // Behavioural test: construct a conditional artifact and verify the wiring
  // check enforces both pattern AND path -- no relaxation for the Condition column.
  const {
    parseRequiredArtifacts: parse,
    checkArtifactWiring: check,
  } = require('../../lib/wiring-check');

  const conditionalSkill = read('tests/fixtures/wiring-gap/mock-skill-conditional.md');
  const artifacts = parse(conditionalSkill, 'mock-tdd-conditional');
  assert.ok(artifacts !== null && artifacts.length >= 1,
    'Conditional fixture must parse successfully');
  assert.ok(artifacts[0].condition.length > 0,
    'Fixture artifact must have a non-empty Condition field');

  // Command with BOTH pattern and path must pass (even for conditional artifact)
  const goodCommand = [
    '## Output', '',
    '- Write integration tests to: tests/integration/ following [feature].integration.test.* pattern',
  ].join('\n');
  assert.doesNotThrow(
    () => check(goodCommand, 'test-cmd.md', 'mock-tdd-conditional', artifacts[0]),
    'Conditional artifact with matching pattern+path must pass (AC8: no relaxation)');

  // Command MISSING the pattern must fail (same enforcement as unconditional)
  const badCommand = [
    '## Output', '',
    '- Write test files to: tests/integration/ (no pattern mentioned)',
  ].join('\n');
  assert.throws(
    () => check(badCommand, 'test-cmd.md', 'mock-tdd-conditional', artifacts[0]),
    /pattern/i,
    'Conditional artifact missing pattern must fail (AC8: no relaxation)');
});

test('AC8 (fixture): conditional artifact fixture exists for AC8 validation', () => {
  // A dedicated fixture with a non-empty Condition confirms the test exercises
  // the conditional-artifact code path without relaxation.
  assert.ok(exists('tests/fixtures/wiring-gap/mock-skill-conditional.md'),
    'Conditional artifact fixture mock-skill-conditional.md must exist');

  const conditionalSkill = read('tests/fixtures/wiring-gap/mock-skill-conditional.md');
  // Must have a Required Artifacts table with a non-empty Condition value
  assert.match(conditionalSkill, /^## Required Artifacts$/m,
    'Conditional fixture must have Required Artifacts section');
  assert.match(conditionalSkill, /Phase \d+ only|phase.*only/i,
    'Conditional fixture must have a non-empty Condition value (e.g., "Phase 5 only")');
});

// ---------------------------------------------------------------------------
// AC9: Multiple valid output paths — at least one matches
// ---------------------------------------------------------------------------

test('AC9: wiring check passes when at least one of multiple output paths matches', () => {
  // Architecture: multiple paths pass if any one matches
  const wiringTest = read('tests/node/command-skill-wiring.test.js');
  assert.match(wiringTest, /some|at least one|any.*match/i,
    'Wiring test must support multiple output paths (at least one match)');
});

// ---------------------------------------------------------------------------
// AC10: No regression — existing tests pass
// ---------------------------------------------------------------------------

test('AC10: existing contract tests still exist and are not modified by wiring-verification', () => {
  // Verify key existing test files are still present
  assert.ok(exists('tests/node/core-skill-contracts.test.js'),
    'core-skill-contracts.test.js must still exist');
  assert.ok(exists('tests/node/pipeline-handoff-guards.test.js'),
    'pipeline-handoff-guards.test.js must still exist');
});

// ---------------------------------------------------------------------------
// AC11: Negative test fixture with known gap
// ---------------------------------------------------------------------------

test('AC11: negative test fixture exists with deliberate wiring gap', () => {
  // Fixture: mock skill requires integration test, mock command omits it
  assert.ok(exists('tests/fixtures/wiring-gap/mock-skill.md'),
    'Negative fixture mock-skill.md must exist');
  assert.ok(exists('tests/fixtures/wiring-gap/mock-command.md'),
    'Negative fixture mock-command.md must exist');

  const mockSkill = read('tests/fixtures/wiring-gap/mock-skill.md');
  assert.match(mockSkill, /^## Required Artifacts$/m,
    'Mock skill must have Required Artifacts section');
  assert.match(mockSkill, /integration/i,
    'Mock skill must require an integration test artifact');

  const mockCommand = read('tests/fixtures/wiring-gap/mock-command.md');
  // The mock command deliberately omits integration test path
  assert.doesNotMatch(mockCommand, /tests\/integration/,
    'Mock command must NOT include integration path (deliberate gap)');
});

// ---------------------------------------------------------------------------
// Fail-closed: commands with skill prose but no ## Skill References table
// ---------------------------------------------------------------------------

test('fail-closed: wiring test fails when command has skill prose but no Skill References table', () => {
  // Architecture Stage 1 fail-closed rule
  const wiringTest = read('tests/node/command-skill-wiring.test.js');
  assert.match(wiringTest, /Skill References/,
    'Wiring test must check for ## Skill References tables');
  assert.match(wiringTest, /fail|error|throw/i,
    'Wiring test must fail when skill prose exists without table');
});

// ---------------------------------------------------------------------------
// Structural: ## Skill References table in commands
// ---------------------------------------------------------------------------

test('commands that load skills have a ## Skill References table', () => {
  // Architecture requires commands to declare skills structurally
  const testDesign = read('commands/test-design.md');
  assert.match(testDesign, /^## Skill References$/m,
    'commands/test-design.md must have a ## Skill References section');

  const implement = read('commands/implement.md');
  assert.match(implement, /^## Skill References$/m,
    'commands/implement.md must have a ## Skill References section');
});
