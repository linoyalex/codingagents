/**
 * Integration tests for wiring-verification feature
 *
 * // ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA
 *
 * Derived from: docs/features/wiring-verification/prd.md + architecture.md
 * Ticket: ISS-036
 *
 * Integration approach: import the wiring-check library directly and run it
 * against real project files and fixtures. This exercises the full 4-stage
 * algorithm in-process rather than via subprocess (which triggers Node's
 * recursive test runner guard).
 *
 * Cases covered:
 *   Happy:   Run wiring check against real project files → passes when all wiring is correct
 *   Edge:    Run wiring check against negative fixture → catches deliberate gap
 *   Misuse:  Wiring check error names missing artifact when gap detected (blocking gate)
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
  read,
  exists,
  ROOT_DIR,
} = require('../../lib/wiring-check');

const COMMANDS_DIR = path.join(ROOT_DIR, 'commands');

// ---------------------------------------------------------------------------
// Happy path: wiring check runs successfully against real project files
// ---------------------------------------------------------------------------

test('integration: command-skill-wiring check runs end-to-end against real project files', () => {
  // Run the full 4-stage algorithm in-process against real commands and skills.
  const commandFiles = fs.readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => `commands/${f}`);

  let checksRun = 0;

  for (const commandRelPath of commandFiles) {
    const commandText = read(commandRelPath);
    const commandName = path.basename(commandRelPath);
    const skillRefs = parseSkillReferences(commandText, commandName);

    for (const skillRef of skillRefs) {
      const result = checkCommandSkillWiring(commandRelPath, skillRef);
      checksRun++;
    }
  }

  // At least one wiring check must have run (proves the algorithm exercised real files)
  assert.ok(checksRun >= 1,
    `Expected at least one wiring check to run, got ${checksRun}`);
});

// ---------------------------------------------------------------------------
// Negative fixture: wiring check catches the deliberate gap
// ---------------------------------------------------------------------------

test('integration: wiring check negative fixture detects missing artifact slot', () => {
  // The mock-command.md deliberately omits the integration test path from its
  // Output section, so the wiring check must throw.
  const mockCommandText = read('tests/fixtures/wiring-gap/mock-command.md');
  const mockCommandRefs = parseSkillReferences(mockCommandText, 'mock-command.md');

  assert.ok(mockCommandRefs.length >= 1,
    'Mock command must declare at least one skill reference');

  assert.throws(
    () => {
      for (const skillRef of mockCommandRefs) {
        checkCommandSkillWiring('tests/fixtures/wiring-gap/mock-command.md', skillRef);
      }
    },
    /pattern|path|integration/i,
    'Negative fixture must cause wiring check to throw (deliberate gap)'
  );
});

// ---------------------------------------------------------------------------
// Blocking gate: wiring check error names the missing artifact
// ---------------------------------------------------------------------------

test('integration: wiring check error identifies skill, command, and artifact when gap detected', () => {
  // The error message from the negative fixture must be actionable:
  // it must name the skill, the artifact, and what's missing (pattern or path).
  const mockCommandText = read('tests/fixtures/wiring-gap/mock-command.md');
  const mockCommandRefs = parseSkillReferences(mockCommandText, 'mock-command.md');

  let caughtError = null;
  try {
    for (const skillRef of mockCommandRefs) {
      checkCommandSkillWiring('tests/fixtures/wiring-gap/mock-command.md', skillRef);
    }
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError !== null,
    'Negative fixture must throw an error');
  assert.match(caughtError.message, /mock|integration\.test|tests\/integration/i,
    'Error message must identify the missing artifact (skill, pattern, or path)');
});
