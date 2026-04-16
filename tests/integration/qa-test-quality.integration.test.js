/**
 * Integration tests for qa-test-quality feature (RED state)
 *
 * // ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA
 *
 * Derived from: docs/features/qa-test-quality/prd.md + architecture.md
 * Tickets: ISS-043, ISS-045, ISS-049
 *
 * Integration entry point: commands/test-design.md (production command file)
 * This is the command the QA agent reads at Phase 3 invocation. It must load the
 * TDD skill, which must chain to the sibling reference file test-quality-rules.md.
 * The integration chain: commands/test-design.md -> skills/tdd/SKILL.md ->
 * skills/tdd/test-quality-rules.md.
 *
 * Primary production-wiring test seam:
 *   commands/test-design.md is the production entry point the QA agent reads.
 *   It must reference the TDD skill (via Skill References table), and the skill must
 *   chain to the sibling reference file. The integration test reads the production entry
 *   point and verifies the complete test quality guidance chain is wired:
 *   command (5 subsections) -> skill (2 list entries + reference link) -> sibling (4 headings).
 *
 * Cases covered:
 *   Happy:   Command loads skill, skill chains to sibling, all methodology sections present
 *   Edge:    Progressive disclosure links are resolvable (files exist at linked paths)
 *   Misuse:  Broken chain — command references skill but skill missing sibling link
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

function readOrFail(relativePath) {
  assert.ok(exists(relativePath), `${relativePath} must exist before reading its content`);
  return read(relativePath);
}

// ---------------------------------------------------------------------------
// Happy path: Complete wiring chain from command -> skill -> sibling reference
// ---------------------------------------------------------------------------

test('INTEGRATION happy path: commands/test-design.md references tdd skill AND skill contains qa-test-quality additions', () => {
  // Step 1: Read the production entry point (commands/test-design.md)
  const command = read('commands/test-design.md');

  // Assert visible output: command references the tdd skill
  assert.match(
    command,
    /tdd/,
    'commands/test-design.md (production entry point) must reference the tdd skill'
  );

  // Assert visible output: command has all 5 new test quality subsections
  assert.match(command, /^### Symmetric Testing$/m, 'Command must have Symmetric Testing (AC1)');
  assert.match(command, /^### Behavioral Binding$/m, 'Command must have Behavioral Binding (AC4)');
  assert.match(command, /^### Negative-Pattern Testing$/m, 'Command must have Negative-Pattern Testing (AC5)');
  assert.match(command, /^### Adversarial Contract Testing$/m, 'Command must have Adversarial Contract Testing (AC6)');
  assert.match(command, /^### Artifact-Type Test Strategy$/m, 'Command must have Artifact-Type Test Strategy (AC10)');

  // Step 2: Follow the chain — read the skill file
  const skill = read('skills/tdd/SKILL.md');

  // Assert visible output: skill contains both new What to Test First entries
  assert.match(skill, /\[symmetric-coverage\]/, 'Skill must have [symmetric-coverage] entry (AC2)');
  assert.match(skill, /\[contract-robustness\]/, 'Skill must have [contract-robustness] entry (AC7)');

  // Assert visible output: skill links to sibling reference file
  assert.match(
    skill,
    /\[See reference:.*test-quality-rules\.md\]/,
    'Skill must link to test-quality-rules.md via [See reference:] (AC14)'
  );
});

test('INTEGRATION happy path: skill -> sibling chain contains all 4 methodology headings', () => {
  // Read sibling reference through the chain
  const sibling = readOrFail('skills/tdd/test-quality-rules.md');

  // Assert visible output: all 4 expected headings present
  assert.match(sibling, /^## Symmetric Coverage$/m, 'Sibling must have Symmetric Coverage (AC3a)');
  assert.match(sibling, /^## Contract Robustness$/m, 'Sibling must have Contract Robustness (AC8a)');
  assert.match(sibling, /^## Structural vs Fixture-Driven Testing$/m, 'Sibling must have Structural vs Fixture-Driven Testing (AC9)');
  assert.match(sibling, /^## Artifact-Type Test Strategy$/m, 'Sibling must have Artifact-Type Test Strategy (AC11)');
});

// ---------------------------------------------------------------------------
// Edge: Progressive disclosure links resolve to existing files
// ---------------------------------------------------------------------------

test('INTEGRATION edge: sibling reference file linked from SKILL.md exists on disk', () => {
  const skill = read('skills/tdd/SKILL.md');

  // Extract the [See reference:] link target path
  const match = skill.match(/\[See reference:\s*([^\]]+)\]/);
  assert.ok(match, 'SKILL.md must contain a [See reference:] link');

  // The link may use .claude/skills/ prefix — resolve the source path too
  const siblingPath = 'skills/tdd/test-quality-rules.md';
  assert.ok(
    exists(siblingPath),
    `Sibling reference file ${siblingPath} must exist on disk`
  );
});

test('INTEGRATION edge: installed copy of sibling reference exists at .claude/skills/ path', () => {
  const installedPath = '.claude/skills/tdd/test-quality-rules.md';
  assert.ok(
    exists(installedPath),
    `Installed copy ${installedPath} must exist for progressive disclosure to work at runtime`
  );
});

// ---------------------------------------------------------------------------
// Misuse: Broken chain detection
// ---------------------------------------------------------------------------

test('INTEGRATION misuse: if SKILL.md links to sibling, the sibling must have all expected headings', () => {
  // This catches the case where SKILL.md links to a file but the file is empty or wrong
  const sibling = readOrFail('skills/tdd/test-quality-rules.md');

  assert.match(
    sibling,
    /^## Symmetric Coverage$/m,
    'test-quality-rules.md exists but is missing "## Symmetric Coverage" — chain is broken'
  );
  assert.match(
    sibling,
    /^## Contract Robustness$/m,
    'test-quality-rules.md exists but is missing "## Contract Robustness" — chain is broken'
  );
  assert.match(
    sibling,
    /^## Structural vs Fixture-Driven Testing$/m,
    'test-quality-rules.md exists but is missing "## Structural vs Fixture-Driven Testing" — chain is broken'
  );
  assert.match(
    sibling,
    /^## Artifact-Type Test Strategy$/m,
    'test-quality-rules.md exists but is missing "## Artifact-Type Test Strategy" — chain is broken'
  );
});

// ---------------------------------------------------------------------------
// Production wiring proof: command -> skill -> sibling covers all ISS-043/045/049 guidance
// ---------------------------------------------------------------------------

test('INTEGRATION wiring: the full chain command -> skill -> sibling covers all 3 ISS test quality gaps', () => {
  // This test reads the production entry point (commands/test-design.md) and traces
  // the complete chain to verify all 3 quality gaps are addressed.

  const command = read('commands/test-design.md');
  const skill = read('skills/tdd/SKILL.md');
  const siblingExists = exists('skills/tdd/test-quality-rules.md');

  // Count quality gaps covered across the chain
  const gaps = {
    symmetricCoverage:
      /### Symmetric Testing/m.test(command) &&
      /\[symmetric-coverage\]/.test(skill),
    adversarialRobustness:
      /### Adversarial Contract Testing/m.test(command) &&
      /\[contract-robustness\]/.test(skill),
    artifactTypeRouting:
      /### Artifact-Type Test Strategy/m.test(command) &&
      siblingExists,
  };

  const missing = Object.entries(gaps)
    .filter(([, found]) => !found)
    .map(([name]) => name);

  assert.equal(
    missing.length,
    0,
    `Test quality gaps missing from the command->skill->sibling chain: ${missing.join(', ')}`
  );
});
