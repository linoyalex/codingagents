/**
 * E2E tests for wiring-verification feature
 *
 * Derived from: docs/features/wiring-verification/prd.md + architecture.md
 * Ticket: ISS-036
 *
 * These tests verify the complete wiring-verification convention chain end-to-end:
 *   skill (## Required Artifacts registry) -> command (## Skill References + Output section)
 *   -> wiring-check library (4-stage algorithm) -> checklist enforcement (implement + test-design)
 *
 * Wiring proof:
 *   If all E2E tests pass, the command<->skill wiring protection is complete:
 *   skills declare artifacts, commands declare skill mappings and output slots,
 *   the wiring-check library validates the wiring, and phase checklists instruct
 *   humans to verify new artifacts are wired.
 *
 * Cases covered:
 *   Happy:   Full chain from skill registry -> command output -> wiring check pass
 *   Edge:    Source and installed copies in sync (skills + commands),
 *            conditional artifacts get the same full pattern+path check (AC8)
 *   Misuse:  Deliberate wiring gap caught by negative fixture
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseSkillReferences,
  parseRequiredArtifacts,
  checkArtifactWiring,
  checkCommandSkillWiring,
  extractSection,
  read,
  exists,
  ROOT_DIR,
} = require('../../lib/wiring-check');

// ---------------------------------------------------------------------------
// E2E: Full convention chain -- skill -> command -> wiring check -> checklist
// ---------------------------------------------------------------------------

test('E2E: tdd skill Required Artifacts are wired through test-design command Output section', () => {
  // End-to-end behavioral check: skill declares artifact, command has matching output,
  // wiring checker confirms both pattern and path are present.
  const testDesignText = read('commands/test-design.md');
  const refs = parseSkillReferences(testDesignText, 'test-design.md');

  const tddRef = refs.find(r => r.skill === 'tdd' || r.sourcePath.includes('tdd'));
  assert.ok(tddRef, 'test-design.md Skill References must include tdd');

  // Full wiring check must pass (exercises Stages 1-3)
  const result = checkCommandSkillWiring('commands/test-design.md', tddRef);
  assert.equal(result.skipped, false,
    'tdd skill has Required Artifacts -- wiring check must not skip');
});

test('E2E: implement command passes full wiring check and has verification step (AC4)', () => {
  const implementText = read('commands/implement.md');

  // Must have the Artifact Wiring Verification structural section (AC4)
  assert.match(implementText, /^##\s*Artifact Wiring Verification$/m,
    'implement command must have ## Artifact Wiring Verification section');

  // Full wiring check must pass for all declared skills
  const refs = parseSkillReferences(implementText, 'implement.md');
  assert.ok(refs.length >= 1, 'implement.md must declare skill references');

  for (const ref of refs) {
    checkCommandSkillWiring('commands/implement.md', ref);
  }
});

test('E2E: test-design command passes full wiring check and has verification step (AC5)', () => {
  const testDesignText = read('commands/test-design.md');

  // Must have the Artifact Wiring Verification structural section (AC5)
  assert.match(testDesignText, /^##\s*Artifact Wiring Verification$/m,
    'test-design command must have ## Artifact Wiring Verification section');

  // Full wiring check must pass for all declared skills
  const refs = parseSkillReferences(testDesignText, 'test-design.md');
  assert.ok(refs.length >= 1, 'test-design.md must declare skill references');

  for (const ref of refs) {
    checkCommandSkillWiring('commands/test-design.md', ref);
  }
});

// ---------------------------------------------------------------------------
// E2E: 4-stage algorithm exercised behaviorally
// ---------------------------------------------------------------------------

test('E2E: 4-stage algorithm exercises all stages against real files', () => {
  // Stage 1: Discovery
  const testDesignText = read('commands/test-design.md');
  const refs = parseSkillReferences(testDesignText, 'test-design.md');
  assert.ok(refs.length >= 1, 'Stage 1: must discover at least one skill reference');

  // Stage 2: Registry parse
  const tddRef = refs.find(r => r.skill === 'tdd' || r.sourcePath.includes('tdd'));
  assert.ok(tddRef, 'Stage 1: must discover tdd skill reference');
  const tddText = read(tddRef.sourcePath);
  const artifacts = parseRequiredArtifacts(tddText, 'tdd');
  assert.ok(artifacts !== null && artifacts.length >= 1,
    'Stage 2: tdd skill must have parseable Required Artifacts');

  // Stage 3: Wiring check
  assert.doesNotThrow(
    () => checkArtifactWiring(testDesignText, 'test-design.md', 'tdd', artifacts[0]),
    'Stage 3: wiring check must pass for test-design + tdd');

  // Stage 4: Negative fixture
  assert.throws(
    () => checkCommandSkillWiring('tests/fixtures/wiring-gap/mock-command.md',
      { skill: 'mock-tdd', sourcePath: 'tests/fixtures/wiring-gap/mock-skill.md' }),
    /pattern|path|integration/i,
    'Stage 4: negative fixture must detect deliberate wiring gap');
});

// ---------------------------------------------------------------------------
// E2E: AC8 -- conditional artifacts get full pattern+path check
// ---------------------------------------------------------------------------

test('E2E (AC8): conditional artifact gets same full check as unconditional', () => {
  const conditionalSkill = read('tests/fixtures/wiring-gap/mock-skill-conditional.md');
  const artifacts = parseRequiredArtifacts(conditionalSkill, 'mock-tdd-conditional');
  assert.ok(artifacts !== null && artifacts.length >= 1);
  assert.ok(artifacts[0].condition.length > 0,
    'Fixture artifact must have a non-empty Condition field');

  // Conditional artifact with missing pattern must fail (no relaxation)
  const badCommand = [
    '## Output', '',
    '- Write test files to: tests/integration/',
  ].join('\n');
  assert.throws(
    () => checkArtifactWiring(badCommand, 'e2e-cmd.md', 'mock-tdd-conditional', artifacts[0]),
    /pattern/i,
    'Conditional artifact must fail when pattern is missing (AC8: no relaxation)');
});

// ---------------------------------------------------------------------------
// E2E: Source/installed sync -- skills and commands must not drift
// ---------------------------------------------------------------------------

test('E2E: source and installed tdd skill copies are byte-identical', () => {
  const sourcePath = 'skills/tdd/SKILL.md';
  const installedPath = '.claude/skills/tdd/SKILL.md';

  if (!exists(installedPath)) {
    assert.fail(`Installed skill copy not found: ${installedPath}`);
  }

  assert.equal(read(sourcePath), read(installedPath),
    'Source and installed tdd/SKILL.md must be byte-identical');
});

test('E2E: source and installed command copies are byte-identical for wiring-checked commands', () => {
  const wiringCommands = ['implement.md', 'test-design.md'];

  for (const cmd of wiringCommands) {
    const sourcePath = `commands/${cmd}`;
    const installedPath = `.claude/commands/${cmd}`;

    if (!exists(installedPath)) {
      assert.fail(`Installed command copy not found: ${installedPath}`);
    }

    assert.equal(read(sourcePath), read(installedPath),
      `Source and installed ${cmd} must be byte-identical`);
  }
});

// ---------------------------------------------------------------------------
// E2E: Negative fixture proves gap detection works
// ---------------------------------------------------------------------------

test('E2E: negative fixture gap is detected with actionable error', () => {
  assert.throws(
    () => checkCommandSkillWiring('tests/fixtures/wiring-gap/mock-command.md',
      { skill: 'mock-tdd', sourcePath: 'tests/fixtures/wiring-gap/mock-skill.md' }),
    (err) => {
      assert.ok(
        err.message.includes('integration') || err.message.includes('path') || err.message.includes('pattern'),
        `Error must identify the gap, got: ${err.message}`);
      return true;
    },
    'Negative fixture must throw with actionable error identifying the gap');
});
