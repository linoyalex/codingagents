const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CHECKPOINT_SCRIPT = path.join(ROOT_DIR, 'hooks', 'checkpoint.cjs');
const VALID_HANDOFF = path.join(ROOT_DIR, 'tests', 'fixtures', 'handoff', 'valid.json');
const UNEXPECTED_HANDOFF = path.join(ROOT_DIR, 'tests', 'fixtures', 'handoff', 'unexpected-property.json');
const CHECKPOINT_PENDING_HANDOFF = path.join(ROOT_DIR, 'tests', 'fixtures', 'handoff', 'checkpoint-pending.json');
const CHECKPOINT_NO_TICKET_HANDOFF = path.join(ROOT_DIR, 'tests', 'fixtures', 'handoff', 'checkpoint-no-ticket.json');

function makeTempProject(t) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codingagents-checkpoint-'));
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  return tempDir;
}

function withProjectCwd(projectDir, fn) {
  const previous = process.cwd();
  process.chdir(projectDir);
  try {
    delete require.cache[require.resolve(CHECKPOINT_SCRIPT)];
    const checkpoint = require(CHECKPOINT_SCRIPT);
    return fn(checkpoint);
  } finally {
    process.chdir(previous);
  }
}

function writeJson(targetPath, sourcePath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

test('validateHandoff accepts a valid fixture handoff', (t) => {
  const projectDir = makeTempProject(t);
  writeJson(path.join(projectDir, '.claude', 'handoff.json'), VALID_HANDOFF);
  // Create the source_spec target so file-existence check passes
  const prdDir = path.join(projectDir, 'docs', 'features', 'user-auth');
  fs.mkdirSync(prdDir, { recursive: true });
  fs.writeFileSync(path.join(prdDir, 'prd.md'), '# PRD: user-auth\n');

  withProjectCwd(projectDir, (checkpoint) => {
    const result = checkpoint.validateHandoff();
    assert.equal(result.valid, true);
    assert.equal(result.handoff.feature, 'user-auth');
    assert.equal(result.handoff.phase, 2);
  });
});

test('validateHandoff rejects unexpected properties', (t) => {
  const projectDir = makeTempProject(t);
  writeJson(path.join(projectDir, '.claude', 'handoff.json'), UNEXPECTED_HANDOFF);

  withProjectCwd(projectDir, (checkpoint) => {
    const result = checkpoint.validateHandoff();
    assert.equal(result.valid, false);
    assert.match(result.reason, /unexpected properties/);
  });
});

test('artifact-based detection beats stale handoff phase when newer artifacts exist', (t) => {
  const projectDir = makeTempProject(t);
  writeJson(path.join(projectDir, '.claude', 'handoff.json'), VALID_HANDOFF);

  const featureDir = path.join(projectDir, 'docs', 'features', 'user-auth');
  fs.mkdirSync(featureDir, { recursive: true });
  fs.writeFileSync(path.join(featureDir, 'prd.md'), '# prd\n');
  fs.writeFileSync(path.join(featureDir, 'architecture.md'), '# architecture\n');
  fs.writeFileSync(path.join(featureDir, 'security-audit.md'), '# security\n');
  fs.mkdirSync(path.join(projectDir, 'tests', 'contracts'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'tests', 'contracts', 'user-auth.test.ts'), 'test\n');

  withProjectCwd(projectDir, (checkpoint) => {
    const phase = checkpoint.detectPhase();
    assert.equal(phase.phase, 5);
    assert.equal(phase.phaseName, 'implement');
    assert.match(phase.name, /IMPLEMENT in progress/);
  });
});

test('detectPhase recognizes .js test files as Phase 3 completion (ISS-040)', (t) => {
  const projectDir = makeTempProject(t);
  writeJson(path.join(projectDir, '.claude', 'handoff.json'), VALID_HANDOFF);

  const featureDir = path.join(projectDir, 'docs', 'features', 'user-auth');
  fs.mkdirSync(featureDir, { recursive: true });
  fs.writeFileSync(path.join(featureDir, 'prd.md'), '# prd\n');
  fs.writeFileSync(path.join(featureDir, 'architecture.md'), '# architecture\n');
  // Use .js extension instead of .ts — must still be detected as Phase 3
  fs.mkdirSync(path.join(projectDir, 'tests', 'contracts'), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'tests', 'contracts', 'user-auth.test.js'), 'test\n');

  withProjectCwd(projectDir, (checkpoint) => {
    const phase = checkpoint.detectPhase();
    // Phase 3 (test design complete) should be detected, not Phase 2 (architect)
    assert.ok(
      phase.phase >= 3,
      `Expected phase >= 3 (test design complete) but got phase ${phase.phase} (${phase.phaseName}). .js test files must be recognized.`
    );
  });
});

// ---------------------------------------------------------------------------
// checkpoint_pending field acceptance (BLOCKING fix from Codex code review)
// ---------------------------------------------------------------------------

test('validateHandoff accepts checkpoint_pending as a valid optional field', (t) => {
  const projectDir = makeTempProject(t);
  writeJson(path.join(projectDir, '.claude', 'handoff.json'), CHECKPOINT_PENDING_HANDOFF);
  // Create the source_spec target so file-existence check passes
  const ticketDir = path.join(projectDir, 'docs', 'issues', 'tickets');
  fs.mkdirSync(ticketDir, { recursive: true });
  fs.writeFileSync(path.join(ticketDir, 'ISS-099.md'), '# ISS-099\n');

  withProjectCwd(projectDir, (checkpoint) => {
    const result = checkpoint.validateHandoff();
    assert.equal(result.valid, true, `Expected valid but got: ${result.reason || 'no reason'}`);
    assert.equal(result.handoff.checkpoint_pending, 'clarification');
  });
});

test('validateHandoff relaxes source_spec file-existence check when checkpoint_pending is set', (t) => {
  const projectDir = makeTempProject(t);
  writeJson(path.join(projectDir, '.claude', 'handoff.json'), CHECKPOINT_NO_TICKET_HANDOFF);
  // Deliberately do NOT create docs/features/new-feature/prd.md — it shouldn't exist yet
  // at checkpoint time (PRD is written in Step 3, checkpoint fires in Step 2)

  withProjectCwd(projectDir, (checkpoint) => {
    const result = checkpoint.validateHandoff();
    assert.equal(result.valid, true,
      `Checkpoint handoff with non-existent source_spec should be valid when checkpoint_pending is set, but got: ${result.reason || 'no reason'}`);
    assert.equal(result.handoff.checkpoint_pending, 'clarification');
  });
});

test('validateHandoff still rejects non-existent source_spec when checkpoint_pending is NOT set', (t) => {
  const projectDir = makeTempProject(t);
  // Use valid handoff but with non-existent source_spec and no checkpoint_pending
  const handoff = {
    feature: 'test-feature',
    phase: 1,
    goal: 'Test goal',
    scope: 'Test scope',
    relevant_files: [],
    acceptance_criteria: ['AC-1'],
    verification_commands: ['echo ok'],
    source_spec: 'docs/features/nonexistent/prd.md'
  };
  const handoffPath = path.join(projectDir, '.claude', 'handoff.json');
  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.writeFileSync(handoffPath, JSON.stringify(handoff));

  withProjectCwd(projectDir, (checkpoint) => {
    const result = checkpoint.validateHandoff();
    assert.equal(result.valid, false);
    assert.match(result.reason, /source_spec file not found/);
  });
});

test('validateHandoff rejects non-existent source_spec for architecture-review checkpoint', (t) => {
  const projectDir = makeTempProject(t);
  const handoff = {
    feature: 'demo-feature',
    phase: 2,
    goal: 'Review architecture proposal with user',
    scope: 'Phase 2 architecture review',
    relevant_files: ['docs/features/demo-feature/prd.md'],
    acceptance_criteria: ['pending-architecture-review'],
    verification_commands: ['cat .claude/handoff.json'],
    source_spec: 'docs/features/demo-feature/prd.md',
    checkpoint_pending: 'architecture-review',
    produced_by: 'architect',
    timestamp: '2026-04-13T22:00:00Z'
  };
  const handoffPath = path.join(projectDir, '.claude', 'handoff.json');
  fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
  fs.writeFileSync(handoffPath, JSON.stringify(handoff));
  // Deliberately do NOT create docs/features/demo-feature/prd.md
  // Architecture-review checkpoints should still require source_spec to exist
  // because the PRD was written in Phase 1

  withProjectCwd(projectDir, (checkpoint) => {
    const result = checkpoint.validateHandoff();
    assert.equal(result.valid, false,
      'architecture-review checkpoint with non-existent source_spec should be rejected');
    assert.match(result.reason, /source_spec file not found/);
  });
});

// ---------------------------------------------------------------------------
// Source/installed sync for checkpoint.cjs
// ---------------------------------------------------------------------------

test('Sync: hooks/checkpoint.cjs matches .claude/helpers/checkpoint.cjs', () => {
  const source = fs.readFileSync(path.join(ROOT_DIR, 'hooks', 'checkpoint.cjs'), 'utf8');
  const installed = fs.readFileSync(path.join(ROOT_DIR, '.claude', 'helpers', 'checkpoint.cjs'), 'utf8');
  assert.equal(source, installed, 'Source and installed copies of checkpoint.cjs must be byte-identical');
});

// ---------------------------------------------------------------------------

test('checkpoint main hard-fails and writes diagnostics when handoff is missing', (t) => {
  const projectDir = makeTempProject(t);
  const featureDir = path.join(projectDir, 'docs', 'features', 'user-auth');
  fs.mkdirSync(featureDir, { recursive: true });
  fs.writeFileSync(path.join(featureDir, 'prd.md'), '# prd\n');

  const result = spawnSync(process.execPath, [CHECKPOINT_SCRIPT], {
    cwd: projectDir,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /BLOCKING/);

  const checkpointPath = path.join(projectDir, '.claude', 'pipeline-checkpoint.json');
  assert.equal(fs.existsSync(checkpointPath), true);

  const checkpointJson = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));
  assert.equal(checkpointJson.handoffValid, false);
  assert.match(checkpointJson.nextAction, /write \.claude\/handoff\.json/i);
});
