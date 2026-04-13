/**
 * E2E tests for wiring-verification feature (RED state)
 *
 * Derived from: docs/features/wiring-verification/prd.md + architecture.md
 * Ticket: ISS-036
 *
 * These tests verify the complete wiring-verification convention chain end-to-end:
 *   skill (## Required Artifacts registry) → command (## Skill References + Output section)
 *   → contract test (4-stage algorithm) → checklist enforcement (implement + test-design)
 *
 * Wiring proof:
 *   If all E2E tests pass, the command↔skill wiring protection is complete:
 *   skills declare artifacts, commands declare skill mappings and output slots,
 *   the contract test validates the wiring, and phase checklists instruct humans
 *   to verify new artifacts are wired.
 *
 * Cases covered:
 *   Happy:   Full chain from skill registry → command output → test validation
 *   Edge:    Source and installed skill copies in sync (no drift in Required Artifacts)
 *   Misuse:  Deliberate wiring gap caught by negative fixture
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
// E2E: Full convention chain — skill → command → test → checklist
// ---------------------------------------------------------------------------

test('E2E: tdd skill Required Artifacts are wired through test-design command Output section', () => {
  // End-to-end: skill declares artifact → command has matching output instruction
  const tddSkill = read('skills/tdd/SKILL.md');
  const testDesignCmd = read('commands/test-design.md');

  // Skill must have the registry
  assert.match(tddSkill, /^## Required Artifacts$/m,
    'TDD skill must have Required Artifacts section');

  // Command must have Skill References pointing to tdd
  assert.match(testDesignCmd, /^## Skill References$/m,
    'test-design command must have Skill References section');
  assert.match(testDesignCmd, /tdd/i,
    'test-design command Skill References must include tdd');

  // Command must have Output section with integration test wiring
  assert.match(testDesignCmd, /^##\s*(Output|Deliverables)/m,
    'test-design command must have Output/Deliverables section');
  assert.match(testDesignCmd, /integration/i,
    'test-design command Output must mention integration tests');
  assert.match(testDesignCmd, /tests\/integration/,
    'test-design command Output must include tests/integration/ path');
});

test('E2E: implement command has wiring verification step and Skill References table', () => {
  const implementCmd = read('commands/implement.md');

  // Must have structural sections
  assert.match(implementCmd, /^## Skill References$/m,
    'implement command must have Skill References section');
  assert.match(implementCmd, /^##\s*(Output|Deliverables)/m,
    'implement command must have Output/Deliverables section');

  // Must have wiring verification step (AC4)
  assert.match(implementCmd, /artifact/i,
    'implement command must mention artifact verification');
});

test('E2E: contract test module validates the complete 4-stage algorithm', () => {
  // The production test must exist and cover all four stages
  assert.ok(exists('tests/node/command-skill-wiring.test.js'),
    'Production wiring test must exist');

  const wiringTest = read('tests/node/command-skill-wiring.test.js');

  // Stage 1: Discovery via Skill References
  assert.match(wiringTest, /Skill References/,
    'Wiring test must implement Stage 1 (Skill References discovery)');

  // Stage 2: Registry parse
  assert.match(wiringTest, /Required Artifacts/,
    'Wiring test must implement Stage 2 (Required Artifacts parsing)');

  // Stage 3: Output section validation
  assert.match(wiringTest, /Output|Deliverables/,
    'Wiring test must implement Stage 3 (Output section validation)');

  // Stage 4: Negative fixture
  assert.match(wiringTest, /fixture|wiring.gap/i,
    'Wiring test must implement Stage 4 (negative fixture)');
});

// ---------------------------------------------------------------------------
// E2E: Source/installed skill sync (Required Artifacts must not drift)
// ---------------------------------------------------------------------------

test('E2E: source and installed tdd skill copies are byte-identical (Required Artifacts in sync)', () => {
  // ISS-009 pattern: source and installed must stay in sync
  const sourcePath = 'skills/tdd/SKILL.md';
  const installedPath = '.claude/skills/tdd/SKILL.md';

  if (!exists(installedPath)) {
    // Installed copy may not exist yet — this is acceptable in RED state
    assert.fail(`Installed skill copy not found: ${installedPath}`);
  }

  const source = read(sourcePath);
  const installed = read(installedPath);
  assert.equal(source, installed,
    'Source and installed tdd/SKILL.md must be byte-identical');
});

// ---------------------------------------------------------------------------
// E2E: Negative fixture proves gap detection works
// ---------------------------------------------------------------------------

test('E2E: negative fixture mock-skill requires artifact that mock-command omits', () => {
  const mockSkill = read('tests/fixtures/wiring-gap/mock-skill.md');
  const mockCommand = read('tests/fixtures/wiring-gap/mock-command.md');

  // Mock skill requires integration test
  assert.match(mockSkill, /integration/i,
    'Mock skill must require integration test artifact');

  // Mock command deliberately omits it from Output
  const outputSection = mockCommand.split(/^## Output$/m)[1] || '';
  assert.doesNotMatch(outputSection, /tests\/integration/,
    'Mock command Output must NOT include integration path (deliberate gap)');

  // The wiring test must detect this gap — verified by the test's assert.throws
  const wiringTest = read('tests/node/command-skill-wiring.test.js');
  assert.match(wiringTest, /assert\.throws|assert\.rejects/,
    'Wiring test must assert that negative fixture throws on the gap');
});
