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
 *   Edge:    Source and installed skill copies in sync (no drift in Required Artifacts),
 *            conditional artifacts get the same full pattern+path check (AC8)
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

test('E2E: 4-stage algorithm exercises all stages behaviorally against real files', () => {
  // Instead of grepping the test source for keywords (phrase-binding),
  // exercise the 4-stage algorithm directly and verify each stage produces output.
  const {
    parseSkillReferences: psr,
    parseRequiredArtifacts: pra,
    checkArtifactWiring: caw,
    checkCommandSkillWiring: ccsw,
  } = require('../../lib/wiring-check');

  // Stage 1: Discovery — parse skill references from a real command
  const testDesignText = read('commands/test-design.md');
  const refs = psr(testDesignText, 'test-design.md');
  assert.ok(refs.length >= 1, 'Stage 1: must discover at least one skill reference');

  // Stage 2: Registry parse — parse artifacts from discovered skill
  const tddRef = refs.find(r => r.skill === 'tdd' || r.sourcePath.includes('tdd'));
  assert.ok(tddRef, 'Stage 1: must discover tdd skill reference');
  const tddText = read(tddRef.sourcePath);
  const artifacts = pra(tddText, 'tdd');
  assert.ok(artifacts !== null && artifacts.length >= 1,
    'Stage 2: tdd skill must have parseable Required Artifacts');

  // Stage 3: Wiring check — verify command output wires all artifacts
  assert.doesNotThrow(
    () => caw(testDesignText, 'test-design.md', 'tdd', artifacts[0]),
    'Stage 3: wiring check must pass for test-design + tdd');

  // Stage 4: Negative fixture — deliberate gap must be detected
  assert.throws(
    () => ccsw('tests/fixtures/wiring-gap/mock-command.md',
      { skill: 'mock-tdd', sourcePath: 'tests/fixtures/wiring-gap/mock-skill.md' }),
    /pattern|path|integration/i,
    'Stage 4: negative fixture must detect deliberate wiring gap');
});

// ---------------------------------------------------------------------------
// E2E: AC8 — conditional artifacts get the same full pattern+path check
// ---------------------------------------------------------------------------

test('E2E (AC8): conditional artifact fixture is exercised end-to-end with no relaxation', () => {
  // Verifies the end-to-end chain for AC8:
  //   conditional fixture (Phase 5 only condition) → wiring-check library → no relaxation
  const {
    parseRequiredArtifacts: parse,
    checkArtifactWiring: check,
  } = require('../../lib/wiring-check');

  assert.ok(exists('tests/fixtures/wiring-gap/mock-skill-conditional.md'),
    'Conditional artifact fixture must exist for AC8 E2E coverage');

  const conditionalSkill = read('tests/fixtures/wiring-gap/mock-skill-conditional.md');
  assert.match(conditionalSkill, /Phase \d+ only|phase.*only/i,
    'Conditional fixture must have a non-empty Condition value');

  // Parse the conditional artifact and verify enforcement is identical to unconditional
  const artifacts = parse(conditionalSkill, 'mock-tdd-conditional');
  assert.ok(artifacts !== null && artifacts.length >= 1);
  assert.ok(artifacts[0].condition.length > 0,
    'Artifact must have a non-empty Condition column');

  // Conditional artifact with missing pattern must fail (no relaxation)
  const badCommand = [
    '## Output', '',
    '- Write test files to: tests/integration/',
  ].join('\n');
  assert.throws(
    () => check(badCommand, 'e2e-cmd.md', 'mock-tdd-conditional', artifacts[0]),
    /pattern/i,
    'Conditional artifact must fail when pattern is missing (AC8: no relaxation)');
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
// E2E: Source/installed command sync (Skill References must not drift)
// ---------------------------------------------------------------------------

test('E2E: source and installed command copies are byte-identical for wiring-checked commands', () => {
  // ISS-009 pattern extended to commands: source commands/ and installed .claude/commands/
  // must stay in sync so agents load the same Skill References and Output sections.
  const wiringCommands = ['implement.md', 'test-design.md'];

  for (const cmd of wiringCommands) {
    const sourcePath = `commands/${cmd}`;
    const installedPath = `.claude/commands/${cmd}`;

    if (!exists(installedPath)) {
      assert.fail(`Installed command copy not found: ${installedPath}`);
    }

    const source = read(sourcePath);
    const installed = read(installedPath);
    assert.equal(source, installed,
      `Source and installed ${cmd} must be byte-identical`);
  }
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

  // Verify the gap is actually detected by running the wiring checker behaviorally
  const { checkCommandSkillWiring: ccsw } = require('../../lib/wiring-check');
  assert.throws(
    () => ccsw('tests/fixtures/wiring-gap/mock-command.md',
      { skill: 'mock-tdd', sourcePath: 'tests/fixtures/wiring-gap/mock-skill.md' }),
    /pattern|path|integration/i,
    'Wiring checker must detect gap between mock-skill artifact and mock-command output');
});
