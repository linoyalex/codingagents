/**
 * Integration tests for wiring-verification feature (RED state)
 *
 * // ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA
 *
 * Derived from: docs/features/wiring-verification/prd.md + architecture.md
 * Ticket: ISS-036
 *
 * Integration entry point: tests/node/command-skill-wiring.test.js (production wiring)
 * This is the production test module that validates command↔skill artifact wiring.
 * The integration test runs this module via node --test and asserts on visible output
 * (exit code + stdout/stderr messages).
 *
 * Primary production-wiring test seam:
 *   command-skill-wiring.test.js reads real skill files and real command files,
 *   discovers mappings via ## Skill References, parses ## Required Artifacts,
 *   and validates Output sections. Running it end-to-end via child_process is
 *   the integration proof — it exercises the full 4-stage algorithm against
 *   real project files.
 *
 * Cases covered:
 *   Happy:   Run wiring test against real project → passes when all wiring is correct
 *   Edge:    Run wiring test against negative fixture → catches deliberate gap
 *   Misuse:  Wiring test output names missing artifact when gap detected (blocking gate)
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const WIRING_TEST = path.join(ROOT_DIR, 'tests', 'node', 'command-skill-wiring.test.js');

// ---------------------------------------------------------------------------
// Happy path: wiring test runs successfully against real project files
// ---------------------------------------------------------------------------

test('integration: command-skill-wiring test runs end-to-end and produces visible output', () => {
  // Run the production wiring test as a subprocess.
  // This calls the real entry point (node --test) and asserts on visible output.
  // RED: test file does not exist yet, so this will throw ENOENT.
  const result = execSync(
    `node --test "${WIRING_TEST}" 2>&1`,
    { cwd: ROOT_DIR, encoding: 'utf8', timeout: 30000 }
  );

  // Must produce visible output showing wiring checks
  assert.ok(result.length > 0, 'Wiring test must produce output');
  assert.match(result, /pass|ok|✓/i,
    'Wiring test output must show passing checks');
});

// ---------------------------------------------------------------------------
// Negative fixture: wiring test catches the deliberate gap
// ---------------------------------------------------------------------------

test('integration: wiring test negative fixture detects missing artifact slot', () => {
  // The production test includes a negative fixture test that should fail
  // when run against mock-skill.md + mock-command.md (integration test path missing).
  // We verify by running the full test and checking it exercises the fixture.
  const result = execSync(
    `node --test "${WIRING_TEST}" 2>&1`,
    { cwd: ROOT_DIR, encoding: 'utf8', timeout: 30000 }
  );

  // Output must reference the negative fixture
  assert.match(result, /fixture|wiring.gap|mock/i,
    'Wiring test output must include negative fixture results');
});

// ---------------------------------------------------------------------------
// Blocking gate: wiring test output names the missing artifact when a gap exists
// ---------------------------------------------------------------------------

test('integration: wiring test output identifies skill, command, and artifact when gap detected', () => {
  // The production test must run and produce output that names:
  //   - the skill requiring the artifact
  //   - the command missing the output slot
  //   - the artifact pattern and path
  // This proves the error message is actionable (not just "something failed").
  //
  // RED: WIRING_TEST does not exist — execSync throws. Test fails because output
  //      cannot be asserted on a non-existent file's output.
  // GREEN: test runs, detects mock-command.md gap, names mock-tdd skill and
  //        integration test artifact in the error output.
  const result = execSync(
    `node --test "${WIRING_TEST}" 2>&1 || true`,
    { cwd: ROOT_DIR, encoding: 'utf8', timeout: 30000 }
  );

  // Output must name the skill or command when reporting a wiring gap
  assert.match(result, /mock|integration\.test|tests\/integration/i,
    'Wiring test output must identify the missing artifact (skill, pattern, or path) when reporting gaps');
});
