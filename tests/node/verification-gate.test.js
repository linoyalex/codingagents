const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SKILL_PATH = path.join(ROOT_DIR, 'skills', 'verification-gate', 'SKILL.md');
const APPROVED_REVIEW = path.join(ROOT_DIR, 'tests', 'fixtures', 'review', 'approved.md');
const REQUEST_CHANGES_REVIEW = path.join(ROOT_DIR, 'tests', 'fixtures', 'review', 'request-changes.md');
const BLOCKING_AUDIT = path.join(ROOT_DIR, 'tests', 'fixtures', 'security-audit', 'with-blocking.md');
const NON_BLOCKING_AUDIT = path.join(ROOT_DIR, 'tests', 'fixtures', 'security-audit', 'no-blocking.md');

function makeTempProject(t) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codingagents-verification-'));
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  return tempDir;
}

function extractPhaseBlock(label) {
  const source = fs.readFileSync(SKILL_PATH, 'utf8');
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`### ${escaped}[\\s\\S]*?\\n\\\`\\\`\\\`bash\\n([\\s\\S]*?)\\n\\\`\\\`\\\``);
  const match = source.match(regex);
  assert.ok(match, `Expected to find bash block for "${label}"`);
  return match[1];
}

function writeExecutable(targetPath, content) {
  fs.writeFileSync(targetPath, content, { mode: 0o755 });
}

function runPhaseSnippet(t, label, prepareProject) {
  const projectDir = makeTempProject(t);
  const feature = 'user-auth';
  const snippet = extractPhaseBlock(label).replaceAll('<feature>', feature);
  const binDir = path.join(projectDir, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  writeExecutable(
    path.join(binDir, 'npm'),
    '#!/usr/bin/env bash\nexit 0\n'
  );

  prepareProject(projectDir, feature);

  return spawnSync('/bin/bash', ['-c', snippet], {
    cwd: projectDir,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
  });
}

test('Phase 4 verification should fail when BLOCKING findings are present', (t) => {
  const result = runPhaseSnippet(t, 'After Phase 4 (Security Gate)', (projectDir, feature) => {
    const target = path.join(projectDir, 'docs', 'features', feature, 'security-audit.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(BLOCKING_AUDIT, target);
  });

  assert.notEqual(
    result.status,
    0,
    'Expected Phase 4 verification to fail when BLOCKING findings are present'
  );
});

test('Phase 4 verification should pass when no BLOCKING findings are present', (t) => {
  const result = runPhaseSnippet(t, 'After Phase 4 (Security Gate)', (projectDir, feature) => {
    const target = path.join(projectDir, 'docs', 'features', feature, 'security-audit.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(NON_BLOCKING_AUDIT, target);
  });

  assert.equal(
    result.status,
    0,
    `Expected Phase 4 verification to pass without BLOCKING findings, got ${result.status}\n${result.stdout}\n${result.stderr}`
  );
});

test('Phase 6 verification should fail on REQUEST_CHANGES', (t) => {
  const result = runPhaseSnippet(t, 'After Phase 6 (Review)', (projectDir, feature) => {
    const target = path.join(projectDir, 'docs', 'features', feature, 'review.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(REQUEST_CHANGES_REVIEW, target);
  });

  assert.notEqual(
    result.status,
    0,
    'Expected Phase 6 verification to fail when review verdict is REQUEST_CHANGES'
  );
});

test('Phase 6 verification should pass on APPROVE', (t) => {
  const result = runPhaseSnippet(t, 'After Phase 6 (Review)', (projectDir, feature) => {
    const target = path.join(projectDir, 'docs', 'features', feature, 'review.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(APPROVED_REVIEW, target);
  });

  assert.equal(
    result.status,
    0,
    `Expected Phase 6 verification to pass on approval, got ${result.status}\n${result.stdout}\n${result.stderr}`
  );
});
