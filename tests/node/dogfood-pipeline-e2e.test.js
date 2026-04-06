'use strict';

/**
 * E2E-style tests for the dogfood-pipeline feature.
 * These tests simulate real pipeline execution on temp directories,
 * verifying that the framework machinery works end-to-end.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const INIT_SCRIPT = path.join(ROOT_DIR, 'init.sh');
const RESTORE_SCRIPT = path.join(ROOT_DIR, 'hooks', 'restore-context.js');
const CHECKPOINT_SCRIPT = path.join(ROOT_DIR, 'hooks', 'checkpoint.js');

function makeTempDir(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function writeHandoff(projectDir, phase, feature = 'dogfood-pipeline') {
  const claudeDir = path.join(projectDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  const handoff = {
    feature,
    phase,
    goal: `Phase ${phase} complete, proceed to next.`,
    scope: 'Full pipeline dogfood run.',
    relevant_files: [`docs/features/${feature}/prd.md`],
    acceptance_criteria: ['AC1', 'AC2'],
    verification_commands: ['node --test tests/node/'],
    produced_by: `phase-${phase}-agent`,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(claudeDir, 'handoff.json'), JSON.stringify(handoff, null, 2));
  return handoff;
}

// E2E-1: init.sh on a clean temp directory produces the complete .claude/ structure
test('init.sh installs complete .claude/ structure into a target directory', (t) => {
  // Arrange
  const targetDir = makeTempDir(t, 'codingagents-e2e-init-');
  assert.ok(fs.existsSync(INIT_SCRIPT), 'init.sh must exist');

  // Act
  const result = spawnSync('bash', [INIT_SCRIPT], {
    cwd: targetDir,
    encoding: 'utf8',
    env: { ...process.env, HOME: targetDir },
  });

  // Assert: script must succeed
  assert.equal(
    result.status,
    0,
    `init.sh must exit 0; stderr: ${result.stderr}`
  );

  // Assert: all required .claude/ subdirectories and files are present
  const required = [
    '.claude/agents',
    '.claude/commands',
    '.claude/skills',
    '.claude/helpers',
    '.claude/schemas',
    '.claude/settings.json',
  ];
  for (const rel of required) {
    assert.ok(
      fs.existsSync(path.join(targetDir, rel)),
      `init.sh must create ${rel} in the target directory`
    );
  }
});

// E2E-2: simulated 7-phase handoff chain — restore-context produces output for each phase
test('restore-context outputs handoff context for each phase in a 7-phase chain', (t) => {
  // Arrange + Act + Assert across all 7 phases
  for (let phase = 1; phase <= 7; phase++) {
    const projectDir = makeTempDir(t, `codingagents-e2e-phase${phase}-`);
    writeHandoff(projectDir, phase);

    const result = spawnSync(process.execPath, [RESTORE_SCRIPT], {
      cwd: projectDir,
      encoding: 'utf8',
    });

    // restore-context must exit 0 (it is a SessionStart hook — must not block)
    assert.equal(
      result.status,
      0,
      `restore-context must exit 0 for phase ${phase} handoff; stderr: ${result.stderr}`
    );

    // Must emit handoff context to stdout
    assert.ok(
      result.stdout.length > 0,
      `restore-context must write handoff context to stdout for phase ${phase}`
    );
    assert.match(
      result.stdout,
      /dogfood-pipeline/,
      `restore-context output must include feature name for phase ${phase}`
    );
  }
});

// E2E-3: checkpoint.js writes pipeline-checkpoint.json summarising state
test('checkpoint.js writes pipeline-checkpoint.json when handoff is present', (t) => {
  // Arrange
  const projectDir = makeTempDir(t, 'codingagents-e2e-checkpoint-');
  writeHandoff(projectDir, 3);

  // Act
  spawnSync(process.execPath, [CHECKPOINT_SCRIPT], {
    cwd: projectDir,
    encoding: 'utf8',
  });

  // Assert: pipeline-checkpoint.json must be written regardless of exit code
  const checkpointPath = path.join(projectDir, '.claude', 'pipeline-checkpoint.json');
  assert.ok(
    fs.existsSync(checkpointPath),
    'checkpoint.js must write .claude/pipeline-checkpoint.json'
  );

  const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
  assert.ok(
    Object.prototype.hasOwnProperty.call(checkpoint, 'handoffValid'),
    'pipeline-checkpoint.json must contain a handoffValid field'
  );
});

// E2E-4: error recovery — corrupted handoff between phases must not crash restore-context
// EXPECTED TO FAIL on the stderr assertion — fix not yet implemented (AC4)
test('restore-context recovers gracefully from corrupted handoff and logs error to stderr', (t) => {
  // Arrange
  const projectDir = makeTempDir(t, 'codingagents-e2e-corrupt-');
  const claudeDir = path.join(projectDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  // Write a truncated / corrupted JSON file simulating mid-write corruption
  fs.writeFileSync(path.join(claudeDir, 'handoff.json'), '{"feature":"dogfood-pipeline","phase":4,"goal":');

  // Act
  const result = spawnSync(process.execPath, [RESTORE_SCRIPT], {
    cwd: projectDir,
    encoding: 'utf8',
  });

  // Assert: must not crash (exit 0 — it is a non-blocking SessionStart hook)
  assert.equal(
    result.status,
    0,
    `restore-context must exit 0 even with corrupted handoff; stderr: ${result.stderr}`
  );

  // Assert: must log a diagnostic to stderr (FAILS until AC4 fix lands)
  assert.match(
    result.stderr,
    /error|malformed|invalid|parse|corrupt/i,
    'restore-context must log a diagnostic to stderr when handoff.json is corrupted'
  );
});

// E2E-5: checkpoint hard-blocks when handoff is absent after implementation artifacts exist
test('checkpoint hard-fails pipeline when handoff is missing after test artifacts are present', (t) => {
  // Arrange: simulate a state where Phase 3 produced test files but no handoff was written
  const projectDir = makeTempDir(t, 'codingagents-e2e-missing-handoff-');
  const featureDir = path.join(projectDir, 'docs', 'features', 'dogfood-pipeline');
  fs.mkdirSync(featureDir, { recursive: true });
  fs.writeFileSync(path.join(featureDir, 'prd.md'), '# prd\n');
  fs.writeFileSync(path.join(featureDir, 'architecture.md'), '# architecture\n');
  const contractsDir = path.join(projectDir, 'tests', 'contracts');
  fs.mkdirSync(contractsDir, { recursive: true });
  fs.writeFileSync(path.join(contractsDir, 'dogfood-pipeline.test.ts'), '// failing shell\n');

  // Act
  const result = spawnSync(process.execPath, [CHECKPOINT_SCRIPT], {
    cwd: projectDir,
    encoding: 'utf8',
  });

  // Assert: must exit non-zero (blocking)
  assert.notEqual(
    result.status,
    0,
    'checkpoint must block (non-zero exit) when handoff.json is absent'
  );
  assert.match(result.stderr, /BLOCKING/i, 'checkpoint must emit BLOCKING signal to stderr');
});
