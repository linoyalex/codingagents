const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CHECKPOINT_SCRIPT = path.join(ROOT_DIR, 'hooks', 'checkpoint.js');
const VALID_HANDOFF = path.join(ROOT_DIR, 'tests', 'fixtures', 'handoff', 'valid.json');
const UNEXPECTED_HANDOFF = path.join(ROOT_DIR, 'tests', 'fixtures', 'handoff', 'unexpected-property.json');

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
