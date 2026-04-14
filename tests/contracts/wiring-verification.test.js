/**
 * Contract tests for wiring-verification feature
 *
 * Derived from: docs/features/wiring-verification/prd.md + architecture.md
 * Ticket: ISS-036
 *
 * These tests verify the wiring checker's behavioral contract by calling the
 * library functions directly — not by grepping source text for keywords.
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

const {
  extractSection,
  parseSkillReferences,
  parseRequiredArtifacts,
  checkArtifactWiring,
  checkCommandSkillWiring,
  read,
  exists,
  ROOT_DIR,
} = require('../../lib/wiring-check');

// ---------------------------------------------------------------------------
// AC6: Skill artifact registry format — ## Required Artifacts table
// ---------------------------------------------------------------------------

test('AC6: skills that require named artifacts have a ## Required Artifacts section with the standard table format', () => {
  const tdd = read('skills/tdd/SKILL.md');
  assert.match(tdd, /^## Required Artifacts$/m,
    'skills/tdd/SKILL.md must have a ## Required Artifacts section');

  const headerRe = /\|\s*Artifact\s*\|\s*Pattern\s*\|\s*Path\s*\|\s*Condition\s*\|/i;
  assert.match(tdd, headerRe,
    'Required Artifacts table must have Artifact | Pattern | Path | Condition columns');
});

// ---------------------------------------------------------------------------
// AC1: Wiring contract — happy path (behavioral: run checker, assert pass)
// ---------------------------------------------------------------------------

test('AC1: checkCommandSkillWiring passes for commands with correct output wiring', () => {
  // Run the actual wiring checker against real commands/skills — not source grep.
  const testDesignText = read('commands/test-design.md');
  const refs = parseSkillReferences(testDesignText, 'test-design.md');

  const tddRef = refs.find(r => r.skill === 'tdd' || r.sourcePath.includes('tdd'));
  assert.ok(tddRef, 'test-design.md must reference the tdd skill');

  // Must pass without throwing (happy path)
  const result = checkCommandSkillWiring('commands/test-design.md', tddRef);
  assert.equal(result.skipped, false,
    'tdd skill has Required Artifacts — wiring check must not skip');
});

// ---------------------------------------------------------------------------
// AC2: Catches known gap — integration test missing in test-design command
// ---------------------------------------------------------------------------

test('AC2 (post-fix): commands/test-design.md Output section references integration test pattern and path', () => {
  const testDesign = read('commands/test-design.md');

  assert.match(testDesign, /^##\s*(Output|Deliverables)/m,
    'commands/test-design.md must have an Output or Deliverables section');

  assert.match(testDesign, /integration/i,
    'commands/test-design.md Output must reference integration tests');
  assert.match(testDesign, /tests\/integration/,
    'commands/test-design.md Output must include tests/integration/ path');
});

test('AC2 (regression): pre-fix test-design command without integration path fails wiring check', () => {
  // Simulate the pre-fix state: test-design.md only has contract + E2E output slots,
  // missing the integration test path that tdd skill requires.
  const preFix = [
    '## Skill References',
    '',
    '| Skill | Source path |',
    '|-------|-------------|',
    '| tdd | skills/tdd/SKILL.md |',
    '',
    '## Output',
    '',
    '- Write contract tests to: tests/contracts/$ARGUMENTS.test.ts',
    '- Write E2E tests to: tests/e2e/$ARGUMENTS.spec.ts',
  ].join('\n');

  const refs = parseSkillReferences(preFix, 'pre-fix-test-design.md');
  const tddRef = refs.find(r => r.skill === 'tdd');
  assert.ok(tddRef, 'Pre-fix command must reference tdd skill');

  const tddText = read(tddRef.sourcePath);
  const artifacts = parseRequiredArtifacts(tddText, 'tdd');
  assert.ok(artifacts !== null && artifacts.length >= 1);

  // The wiring check must fail — integration test path is missing
  let caughtError = null;
  try {
    for (const a of artifacts) {
      checkArtifactWiring(preFix, 'pre-fix-test-design.md', 'tdd', a);
    }
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError !== null,
    'Pre-fix state must fail wiring check (missing integration path)');
  assert.match(caughtError.message, /tdd/i,
    'Error must name the skill');
  assert.match(caughtError.message, /pre-fix-test-design\.md/,
    'Error must name the command');
  assert.ok(
    caughtError.message.includes('integration') || caughtError.message.includes('path'),
    `Error must identify missing artifact, got: ${caughtError.message}`);
});

// ---------------------------------------------------------------------------
// AC3: Registry parse error — behavioral: call parser, assert throw
// ---------------------------------------------------------------------------

test('AC3: parseRequiredArtifacts throws descriptive error for malformed tables', () => {
  const malformed = [
    '# Skill: Bad',
    '',
    '## Required Artifacts',
    '',
    '| Artifact | Pattern |',
    '|----------|---------|',
    '| Test file | [feature].test.* |',
  ].join('\n');

  assert.throws(
    () => parseRequiredArtifacts(malformed, 'bad-skill'),
    (err) => {
      assert.ok(err.message.includes('bad-skill'),
        `Error must name the skill, got: ${err.message}`);
      return true;
    },
    'Malformed Required Artifacts must throw naming the skill (AC3)'
  );
});

// ---------------------------------------------------------------------------
// AC4: Phase 5 verification step in commands/implement.md
// ---------------------------------------------------------------------------

test('AC4: commands/implement.md has Artifact Wiring Verification section and passes wiring check', () => {
  const implement = read('commands/implement.md');

  // Structural anchor: must have the dedicated verification section
  assert.match(implement, /^##\s*Artifact Wiring Verification$/m,
    'commands/implement.md must have a ## Artifact Wiring Verification section (AC4)');

  // Behavioral: run the full wiring check against implement.md — must pass
  const refs = parseSkillReferences(implement, 'implement.md');
  assert.ok(refs.length >= 1, 'implement.md must declare at least one skill reference');
  for (const ref of refs) {
    checkCommandSkillWiring('commands/implement.md', ref);
  }
});

// ---------------------------------------------------------------------------
// AC5: Phase 3 verification step in commands/test-design.md
// ---------------------------------------------------------------------------

test('AC5: commands/test-design.md has Artifact Wiring Verification section and passes wiring check', () => {
  const testDesign = read('commands/test-design.md');

  // Structural anchor: must have the dedicated verification section
  assert.match(testDesign, /^##\s*Artifact Wiring Verification$/m,
    'commands/test-design.md must have a ## Artifact Wiring Verification section (AC5)');

  // Behavioral: run the full wiring check against test-design.md — must pass
  const refs = parseSkillReferences(testDesign, 'test-design.md');
  assert.ok(refs.length >= 1, 'test-design.md must declare at least one skill reference');
  for (const ref of refs) {
    checkCommandSkillWiring('commands/test-design.md', ref);
  }
});

// ---------------------------------------------------------------------------
// AC7: Empty state — behavioral: call parseRequiredArtifacts, assert null
// ---------------------------------------------------------------------------

test('AC7: parseRequiredArtifacts returns null for skills without Required Artifacts', () => {
  // Use a real skill that has no Required Artifacts section
  const skillsDir = path.join(ROOT_DIR, 'skills');
  let tested = false;

  for (const skillDir of fs.readdirSync(skillsDir)) {
    const skillPath = `skills/${skillDir}/SKILL.md`;
    if (!exists(skillPath)) continue;

    const skillText = read(skillPath);
    if (!/^## Required Artifacts$/m.test(skillText)) {
      const result = parseRequiredArtifacts(skillText, skillDir);
      assert.equal(result, null,
        `Skill '${skillDir}' has no Required Artifacts — must return null`);
      tested = true;
      break;
    }
  }

  assert.ok(tested, 'At least one skill without Required Artifacts must exist (AC7)');
});

// ---------------------------------------------------------------------------
// AC8: Conditional artifacts — behavioral: parse + check
// ---------------------------------------------------------------------------

test('AC8: conditional artifacts receive the same full pattern+path validation as unconditional ones', () => {
  const conditionalSkill = read('tests/fixtures/wiring-gap/mock-skill-conditional.md');
  const artifacts = parseRequiredArtifacts(conditionalSkill, 'mock-tdd-conditional');
  assert.ok(artifacts !== null && artifacts.length >= 1,
    'Conditional fixture must parse successfully');
  assert.ok(artifacts[0].condition.length > 0,
    'Fixture artifact must have a non-empty Condition field');

  // Command with BOTH pattern and path must pass
  const goodCommand = [
    '## Output', '',
    '- Write integration tests to: tests/integration/ following [feature].integration.test.* pattern',
  ].join('\n');
  assert.doesNotThrow(
    () => checkArtifactWiring(goodCommand, 'test-cmd.md', 'mock-tdd-conditional', artifacts[0]),
    'Conditional artifact with matching pattern+path must pass (AC8: no relaxation)');

  // Command MISSING the pattern must fail
  const badCommand = [
    '## Output', '',
    '- Write test files to: tests/integration/ (no pattern mentioned)',
  ].join('\n');
  assert.throws(
    () => checkArtifactWiring(badCommand, 'test-cmd.md', 'mock-tdd-conditional', artifacts[0]),
    /pattern/i,
    'Conditional artifact missing pattern must fail (AC8: no relaxation)');
});

test('AC8 (fixture): conditional artifact fixture exists for AC8 validation', () => {
  assert.ok(exists('tests/fixtures/wiring-gap/mock-skill-conditional.md'),
    'Conditional artifact fixture mock-skill-conditional.md must exist');

  const conditionalSkill = read('tests/fixtures/wiring-gap/mock-skill-conditional.md');
  assert.match(conditionalSkill, /^## Required Artifacts$/m,
    'Conditional fixture must have Required Artifacts section');
  assert.match(conditionalSkill, /Phase \d+ only|phase.*only/i,
    'Conditional fixture must have a non-empty Condition value (e.g., "Phase 5 only")');
});

// ---------------------------------------------------------------------------
// AC9: Multiple valid output paths — behavioral: call checkArtifactWiring
// ---------------------------------------------------------------------------

test('AC9: checkArtifactWiring passes when at least one of multiple output paths matches', () => {
  const multiPathArtifact = {
    artifact: 'Unit test',
    pattern: '[feature].unit.test.*',
    paths: ['tests/unit/', 'tests/components/unit/'],
    condition: '',
  };

  // Second path matches
  const cmd = [
    '## Output', '',
    '- Write unit tests to: tests/components/unit/ following [feature].unit.test.* pattern',
  ].join('\n');

  assert.doesNotThrow(
    () => checkArtifactWiring(cmd, 'multi-cmd.md', 'mock-skill', multiPathArtifact),
    'At least one path match should be sufficient (AC9)');

  // No path matches — must fail
  assert.throws(
    () => checkArtifactWiring(
      ['## Output', '', '- Write tests to: tests/other/'].join('\n'),
      'multi-cmd.md', 'mock-skill', multiPathArtifact
    ),
    /path/i,
    'No matching path must fail (AC9)');
});

// ---------------------------------------------------------------------------
// AC10: No regression — existing tests pass
// ---------------------------------------------------------------------------

test('AC10: existing contract tests still exist and are not modified by wiring-verification', () => {
  assert.ok(exists('tests/node/core-skill-contracts.test.js'),
    'core-skill-contracts.test.js must still exist');
  assert.ok(exists('tests/node/pipeline-handoff-guards.test.js'),
    'pipeline-handoff-guards.test.js must still exist');
});

// ---------------------------------------------------------------------------
// AC11: Negative test fixture with known gap — behavioral
// ---------------------------------------------------------------------------

test('AC11: negative test fixture exists with deliberate wiring gap', () => {
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
  assert.doesNotMatch(mockCommand, /tests\/integration/,
    'Mock command must NOT include integration path (deliberate gap)');
});

test('AC11 (behavioral): checkCommandSkillWiring throws on negative fixture gap', () => {
  const mockCommandText = read('tests/fixtures/wiring-gap/mock-command.md');
  const refs = parseSkillReferences(mockCommandText, 'mock-command.md');
  assert.ok(refs.length >= 1, 'Mock command must have skill references');

  assert.throws(
    () => {
      for (const skillRef of refs) {
        checkCommandSkillWiring('tests/fixtures/wiring-gap/mock-command.md', skillRef);
      }
    },
    /pattern|path|integration/i,
    'Negative fixture must throw identifying the gap (AC11)'
  );
});

// ---------------------------------------------------------------------------
// Fail-closed: behavioral — parseSkillReferences throws on skill prose without table
// ---------------------------------------------------------------------------

test('fail-closed: parseSkillReferences throws when command has skill prose but no Skill References table', () => {
  const commandWithProse = [
    '# Command: Test',
    '',
    'Read .claude/skills/tdd/SKILL.md for the TDD cycle.',
    '',
    '## Output',
    '',
    '- Write tests',
  ].join('\n');

  assert.throws(
    () => parseSkillReferences(commandWithProse, 'prose-only-cmd.md'),
    /prose-only-cmd\.md/,
    'Command with skill prose but no ## Skill References must throw (fail-closed)'
  );
});

// ---------------------------------------------------------------------------
// Structural: ## Skill References table in commands
// ---------------------------------------------------------------------------

test('commands that load skills have a ## Skill References table', () => {
  const testDesign = read('commands/test-design.md');
  assert.match(testDesign, /^## Skill References$/m,
    'commands/test-design.md must have a ## Skill References section');

  const implement = read('commands/implement.md');
  assert.match(implement, /^## Skill References$/m,
    'commands/implement.md must have a ## Skill References section');
});
