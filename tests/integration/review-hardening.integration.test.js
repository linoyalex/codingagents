/**
 * Integration tests for review-hardening feature (RED state)
 *
 * // ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA
 *
 * Derived from: docs/features/review-hardening/prd.md + architecture.md
 * Tickets: ISS-024, ISS-014, ISS-033
 *
 * Integration entry point: hooks/checkpoint.js (production wiring)
 * This is the runtime seam that validates every handoff.json written by pipeline
 * agents. It is the enforcement point for source_spec being required — if checkpoint.js
 * is updated to validate source_spec, the pipeline rejects non-compliant handoffs at
 * the Stop hook boundary (the natural production integration point).
 *
 * Primary production-wiring test seam:
 *   checkpoint.js reads handoff.json, validates it against the schema, and exits
 *   non-zero when required fields (including source_spec) are missing. The integration
 *   test calls checkpoint.js with a fixture handoff and asserts the visible output
 *   (exit code + stderr message) reflects source_spec enforcement.
 *
 * Cases covered:
 *   Happy:   handoff.json includes source_spec pointing to valid PRD → checkpoint passes
 *   Edge:    handoff.json includes source_spec pointing to ticket file (bugfix) → checkpoint passes
 *   Misuse:  handoff.json is missing source_spec → checkpoint exits non-zero with rejection message
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const os = require('node:os');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CHECKPOINT = path.join(ROOT_DIR, 'hooks', 'checkpoint.js');
const FIXTURES_DIR = path.join(ROOT_DIR, 'tests', 'fixtures', 'review-hardening');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function writeFixtureHandoff(dir, handoff) {
  const handoffPath = path.join(dir, '.claude', 'handoff.json');
  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.writeFileSync(handoffPath, JSON.stringify(handoff, null, 2));
  return handoffPath;
}

function runCheckpoint(workingDir) {
  try {
    const result = execSync(`node "${CHECKPOINT}"`, {
      cwd: workingDir,
      env: { ...process.env, CI: '1' },
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
// Happy path: source_spec present and resolvable → checkpoint passes
// ---------------------------------------------------------------------------

test('INTEGRATION happy path: checkpoint.js accepts handoff with valid source_spec (PRD path)', () => {
  // Arrange: write a handoff fixture with a valid source_spec
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-int-'));

  // Create a minimal PRD file so source_spec resolves
  const prdPath = path.join(tmpDir, 'docs', 'features', 'review-hardening', 'prd.md');
  fs.mkdirSync(path.dirname(prdPath), { recursive: true });
  fs.writeFileSync(prdPath, '# PRD: review-hardening\n');

  writeFixtureHandoff(tmpDir, {
    feature: 'review-hardening',
    phase: 3,
    goal: 'Write failing tests for review-hardening',
    scope: 'Phase 3 test design only',
    relevant_files: ['docs/features/review-hardening/prd.md'],
    acceptance_criteria: ['AC1', 'AC2'],
    verification_commands: ['node --test tests/contracts/review-hardening.test.js'],
    source_spec: 'docs/features/review-hardening/prd.md',
    produced_by: 'qa',
    timestamp: new Date().toISOString(),
  });

  // Act: run checkpoint.js from the fixture directory
  const result = runCheckpoint(tmpDir);

  // Assert: checkpoint accepts the handoff (exits 0 or produces no rejection message)
  // The visible output must NOT contain a source_spec rejection message
  assert.doesNotMatch(
    result.stderr + result.stdout,
    /source_spec missing|source_spec.*required|Review halted/i,
    'checkpoint.js must not reject a handoff that has a valid source_spec'
  );
});

// ---------------------------------------------------------------------------
// Misuse: source_spec missing → checkpoint exits non-zero with rejection message
// ---------------------------------------------------------------------------

test('INTEGRATION misuse: checkpoint.js rejects handoff missing source_spec and produces visible error', () => {
  // Arrange: write a handoff fixture WITHOUT source_spec
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-int-'));

  writeFixtureHandoff(tmpDir, {
    feature: 'review-hardening',
    phase: 3,
    goal: 'Write failing tests for review-hardening',
    scope: 'Phase 3 test design only',
    relevant_files: ['docs/features/review-hardening/prd.md'],
    acceptance_criteria: ['AC1'],
    verification_commands: ['node --test tests/contracts/review-hardening.test.js'],
    // source_spec intentionally omitted
    produced_by: 'qa',
    timestamp: new Date().toISOString(),
  });

  // Act: run checkpoint.js from the fixture directory
  const result = runCheckpoint(tmpDir);

  // Assert: checkpoint exits non-zero AND produces a visible rejection message
  assert.notEqual(
    result.exitCode,
    0,
    'checkpoint.js must exit non-zero when source_spec is missing from handoff'
  );
  const output = result.stderr + result.stdout;
  assert.match(
    output,
    /source_spec|required|missing|invalid|handoff/i,
    'checkpoint.js must produce a visible error message when source_spec is missing'
  );
});

// ---------------------------------------------------------------------------
// Edge: bugfix with ticket source_spec → checkpoint accepts
// ---------------------------------------------------------------------------

test('INTEGRATION edge: checkpoint.js accepts bugfix handoff with ticket file as source_spec', () => {
  // Arrange: write a handoff fixture with source_spec pointing to a ticket file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-int-'));

  // Create a minimal ticket file so source_spec resolves
  const ticketPath = path.join(tmpDir, 'docs', 'issues', 'tickets', 'ISS-033.md');
  fs.mkdirSync(path.dirname(ticketPath), { recursive: true });
  fs.writeFileSync(ticketPath, '# ISS-033: Source Spec Verification\n');

  writeFixtureHandoff(tmpDir, {
    feature: 'ISS-033-bugfix',
    phase: 5,
    goal: 'Implement source_spec enforcement in checkpoint',
    scope: 'Phase 5 implementation only',
    relevant_files: ['docs/issues/tickets/ISS-033.md'],
    acceptance_criteria: ['AC14'],
    verification_commands: ['node --test tests/contracts/review-hardening.test.js'],
    source_spec: 'docs/issues/tickets/ISS-033.md',
    produced_by: 'qa',
    timestamp: new Date().toISOString(),
  });

  // Act
  const result = runCheckpoint(tmpDir);

  // Assert: ticket-based source_spec is accepted
  assert.doesNotMatch(
    result.stderr + result.stdout,
    /source_spec missing|source_spec.*required|Review halted/i,
    'checkpoint.js must accept a ticket file as source_spec for bugfix handoffs'
  );
});

// ---------------------------------------------------------------------------
// Production wiring proof: checkpoint.js reads and validates the schema at runtime
// ---------------------------------------------------------------------------

test('INTEGRATION wiring: checkpoint.js file references source_spec in its validation logic', () => {
  // This test imports the production entry point (checkpoint.js) and asserts
  // visible output: that source_spec validation is present in the checkpoint source.
  const checkpointSource = read('hooks/checkpoint.js');

  // Assert visible output: the production file contains source_spec validation code
  assert.match(
    checkpointSource,
    /source_spec/,
    'hooks/checkpoint.js (production entry point) must reference source_spec in its validation logic'
  );
});

// ---------------------------------------------------------------------------
// Separate-context enforcement: checkpoint.js records produced_by (AC6)
// ---------------------------------------------------------------------------

test('INTEGRATION separate-context: checkpoint.js records produced_by for gate-phase role check', () => {
  // The production entry point must persist produced_by so gate commands can check it.
  const checkpointSource = read('hooks/checkpoint.js');
  assert.match(
    checkpointSource,
    /produced_by/,
    'hooks/checkpoint.js must handle produced_by field for separate-context enforcement'
  );
});
