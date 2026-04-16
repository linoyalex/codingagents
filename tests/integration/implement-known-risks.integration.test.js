/**
 * Integration tests for implement-known-risks feature (RED state)
 *
 * // ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA
 *
 * Derived from: docs/features/implement-known-risks/prd.md + architecture.md
 *
 * Integration entry point: hooks/resolve-feature.js (production wiring)
 * This is the runtime entry point that the /implement command invokes before the
 * developer begins work. It validates handoff.json (including malformed JSON — AC5)
 * and loads the feature context. The known_risks instruction is downstream of this
 * entry point: resolve-feature.js must succeed before the developer reaches GREEN.
 *
 * Primary production-wiring test seam:
 *   resolve-feature.js calls validateHandoff() from checkpoint.js, which reads and
 *   parses .claude/handoff.json. If the JSON is malformed, the developer never
 *   reaches the GREEN phase where known_risks instructions apply. This integration
 *   test calls the production entry point (resolve-feature.js) with fixture data
 *   and asserts visible output (exit code + stderr) proves the guard is active.
 *
 * Cases covered:
 *   Happy:   valid handoff with known_risks → resolve-feature succeeds, developer proceeds
 *   Edge:    valid handoff with empty known_risks array → resolve-feature succeeds
 *   Misuse:  malformed handoff.json → resolve-feature exits non-zero with visible error (AC5)
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const os = require('node:os');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const RESOLVE_FEATURE = path.join(ROOT_DIR, 'hooks', 'resolve-feature.cjs');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function setupFixtureDir(handoffContent) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ikr-int-'));
  const claudeDir = path.join(tmpDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });

  // Create minimal PRD so source_spec resolves
  const prdDir = path.join(tmpDir, 'docs', 'features', 'implement-known-risks');
  fs.mkdirSync(prdDir, { recursive: true });
  fs.writeFileSync(path.join(prdDir, 'prd.md'), '# PRD: implement-known-risks\n');

  // Copy checkpoint.js so require('./checkpoint.js') works from the fixture
  // We symlink the hooks directory to make resolve-feature.js's require work
  const hooksDir = path.join(ROOT_DIR, 'hooks');
  const schemasDir = path.join(ROOT_DIR, 'schemas');

  if (typeof handoffContent === 'string') {
    // Write raw string (for malformed JSON test)
    fs.writeFileSync(path.join(claudeDir, 'handoff.json'), handoffContent);
  } else if (handoffContent !== null) {
    fs.writeFileSync(path.join(claudeDir, 'handoff.json'), JSON.stringify(handoffContent, null, 2));
  }

  return tmpDir;
}

function runResolveFeature(workingDir, args) {
  try {
    const result = execSync(`node "${RESOLVE_FEATURE}" ${args}`, {
      cwd: workingDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, stdout: result, stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status || 1,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
    };
  }
}

// ---------------------------------------------------------------------------
// AC5 Happy: valid handoff with known_risks → resolve-feature succeeds
// ---------------------------------------------------------------------------

test('INTEGRATION happy: resolve-feature.js succeeds with valid handoff containing known_risks', () => {
  const tmpDir = setupFixtureDir({
    feature: 'implement-known-risks',
    phase: 4,
    goal: 'Implement the feature',
    scope: 'Phase 5 implementation',
    relevant_files: ['docs/features/implement-known-risks/prd.md'],
    acceptance_criteria: ['AC1', 'AC2', 'AC3', 'AC4', 'AC5'],
    verification_commands: ['node --test tests/contracts/implement-known-risks.test.js'],
    source_spec: 'docs/features/implement-known-risks/prd.md',
    known_risks: ['Security audit flagged potential XSS in user-generated content'],
    produced_by: 'security-reviewer',
    timestamp: new Date().toISOString(),
  });

  const result = runResolveFeature(tmpDir, '--command implement --phase 5 --args implement-known-risks');

  // Assert: resolve-feature exits 0 and outputs the resolved feature
  assert.equal(result.exitCode, 0, `resolve-feature.js must succeed. stderr: ${result.stderr}`);
  assert.match(
    result.stdout,
    /implement-known-risks/,
    'resolve-feature.js must output the resolved feature name'
  );
});

// ---------------------------------------------------------------------------
// AC4 Edge: valid handoff with empty known_risks → resolve-feature succeeds
// ---------------------------------------------------------------------------

test('INTEGRATION edge: resolve-feature.js succeeds with valid handoff containing empty known_risks', () => {
  const tmpDir = setupFixtureDir({
    feature: 'implement-known-risks',
    phase: 4,
    goal: 'Implement the feature',
    scope: 'Phase 5 implementation',
    relevant_files: ['docs/features/implement-known-risks/prd.md'],
    acceptance_criteria: ['AC1'],
    verification_commands: ['echo ok'],
    source_spec: 'docs/features/implement-known-risks/prd.md',
    known_risks: [],
    produced_by: 'security-reviewer',
    timestamp: new Date().toISOString(),
  });

  const result = runResolveFeature(tmpDir, '--command implement --phase 5 --args implement-known-risks');

  assert.equal(result.exitCode, 0, `resolve-feature.js must succeed with empty known_risks. stderr: ${result.stderr}`);
});

// ---------------------------------------------------------------------------
// AC5 Misuse: malformed handoff.json → resolve-feature exits non-zero
// ---------------------------------------------------------------------------

test('INTEGRATION misuse AC5: resolve-feature.js exits non-zero with malformed handoff.json and produces visible error', () => {
  // Write invalid JSON to handoff.json
  const tmpDir = setupFixtureDir('{ this is not valid json !!!');

  // No explicit --args, so resolve-feature must fall back to handoff → parse error
  const result = runResolveFeature(tmpDir, '--command implement --phase 5 --args ""');

  // Assert: exits non-zero AND produces visible error output
  assert.notEqual(
    result.exitCode,
    0,
    'resolve-feature.js must exit non-zero when handoff.json is malformed'
  );
  const output = result.stderr + result.stdout;
  assert.match(
    output,
    /error|invalid|malformed|parse|handoff/i,
    'resolve-feature.js must produce a visible error message for malformed handoff.json'
  );
});

// ---------------------------------------------------------------------------
// Production wiring: resolve-feature.js references validateHandoff
// ---------------------------------------------------------------------------

test('INTEGRATION wiring: resolve-feature.js imports and calls validateHandoff from checkpoint.js', () => {
  const source = read('hooks/resolve-feature.cjs');

  // Assert: the production file imports validateHandoff
  assert.match(
    source,
    /require.*checkpoint/,
    'resolve-feature.cjs must require checkpoint.cjs'
  );
  assert.match(
    source,
    /validateHandoff/,
    'resolve-feature.js must reference validateHandoff'
  );
});

// ---------------------------------------------------------------------------
// AC4 Edge: missing handoff file entirely + explicit args → succeeds
// ---------------------------------------------------------------------------

test('INTEGRATION edge AC4: resolve-feature.js succeeds with explicit args even when handoff.json is missing', () => {
  const tmpDir = setupFixtureDir(null); // no handoff file written

  const result = runResolveFeature(tmpDir, '--command implement --phase 5 --args implement-known-risks');

  // With explicit args and no handoff, resolve-feature should succeed (with a warning)
  assert.equal(
    result.exitCode,
    0,
    `resolve-feature.js must succeed with explicit args even without handoff.json. stderr: ${result.stderr}`
  );
});

// ---------------------------------------------------------------------------
// Production wiring chain: resolve-feature.js succeeds → command file has known_risks
// This test calls the production entry point AND asserts the feature's effect
// is visible in the downstream command output (the file the developer reads).
// ---------------------------------------------------------------------------

test('INTEGRATION wiring chain: resolve-feature.js succeeds for Phase 5 AND commands/implement.md GREEN section contains known_risks instruction', () => {
  // Step 1: Call the production entry point with a valid handoff containing known_risks
  const tmpDir = setupFixtureDir({
    feature: 'implement-known-risks',
    phase: 4,
    goal: 'Implement the feature',
    scope: 'Phase 5 implementation',
    relevant_files: ['docs/features/implement-known-risks/prd.md'],
    acceptance_criteria: ['AC1', 'AC2', 'AC3'],
    verification_commands: ['echo ok'],
    source_spec: 'docs/features/implement-known-risks/prd.md',
    known_risks: ['XSS risk in user-generated content'],
    produced_by: 'security-reviewer',
    timestamp: new Date().toISOString(),
  });

  const result = runResolveFeature(tmpDir, '--command implement --phase 5 --args implement-known-risks');
  assert.equal(result.exitCode, 0, `Production entry point must succeed. stderr: ${result.stderr}`);

  // Step 2: Assert the feature's visible effect — the command file the developer
  // reads after resolve-feature succeeds must contain the known_risks instruction
  const implement = read('commands/implement.md');
  const greenSection = implement.match(/Step 2 GREEN[\s\S]*?(?=Step 3 REFACTOR|$)/);
  assert.ok(greenSection, 'commands/implement.md must have a GREEN section');
  assert.match(
    greenSection[0],
    /known_risks/,
    'After resolve-feature.js succeeds, the GREEN section must instruct reading known_risks — this is the feature wiring proof'
  );
});
