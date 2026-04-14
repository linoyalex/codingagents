/**
 * E2E tests for claude-md-sync feature (RED state)
 *
 * Derived from: docs/features/claude-md-sync/prd.md + architecture.md
 * Ticket: ISS-008
 *
 * These tests execute init.sh and upgrade.sh in real temp project directories
 * and verify end-to-end behavior: file output, CLI output, backup, status lines.
 *
 * Wiring proof:
 *   If all E2E tests pass, the full chain works: script parses flag → sources
 *   lib → reads docs/CLAUDE.md → writes markers → prints status.
 *
 * Cases covered:
 *   Happy:   init with sync, upgrade with sync, no-op sync
 *   Edge:    non-interactive fallback, legacy migration, malformed markers
 *   Misuse:  missing source file, backup failure
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const os = require('node:os');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `claude-md-sync-e2e-${prefix}-`));
}

function cleanupDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function runScript(scriptPath, args, opts = {}) {
  const cmd = `bash ${path.join(ROOT_DIR, scriptPath)} ${args}`;
  try {
    const stdout = execSync(cmd, {
      cwd: opts.cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
      env: { ...process.env, ...opts.env },
      input: opts.input || undefined,
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.status };
  }
}

// ---------------------------------------------------------------------------
// E2E: init.sh --sync-claude-md creates CLAUDE.md with managed markers
// ---------------------------------------------------------------------------

test('E2E: init --sync-claude-md produces CLAUDE.md with markers and status line', () => {
  const tmpDir = makeTempDir('init-sync');
  try {
    const { stdout, exitCode } = runScript('init.sh', '--sync-claude-md', { cwd: tmpDir });

    assert.equal(exitCode, 0, 'init.sh --sync-claude-md should exit 0');

    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    assert.match(claudeMd, /<!-- managed:start:/, 'CLAUDE.md must have managed:start markers');
    assert.match(claudeMd, /<!-- managed:end:/, 'CLAUDE.md must have managed:end markers');

    // Per-section action labels in output
    assert.match(stdout, /\[added\]/, 'output must show [added] for init');

    // End-of-script status line
    assert.match(stdout, /CLAUDE\.md:/, 'output must include CLAUDE.md status line');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: init.sh without flag, no existing CLAUDE.md — copies template
// ---------------------------------------------------------------------------

test('E2E: init without flag and no existing CLAUDE.md copies template', () => {
  const tmpDir = makeTempDir('init-no-flag');
  try {
    const { stdout, exitCode } = runScript('init.sh', '', { cwd: tmpDir });

    assert.equal(exitCode, 0);

    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    // Template should NOT have managed markers
    assert.ok(!claudeMd.includes('managed:start:'), 'template copy must not have markers');

    // Status line
    assert.match(stdout, /CLAUDE\.md:.*copied template|CLAUDE\.md:.*template/i, 'status must say copied template');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: init.sh without flag, existing CLAUDE.md, non-interactive — keeps existing
// ---------------------------------------------------------------------------

test('E2E: init without flag, existing CLAUDE.md, non-interactive keeps existing', () => {
  const tmpDir = makeTempDir('init-noninteractive');
  const originalContent = '# My existing project CLAUDE.md\n## Custom Section\n- My stuff\n';
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), originalContent);

  try {
    // Pipe empty stdin to simulate non-interactive
    const { stdout, exitCode } = runScript('init.sh', '', {
      cwd: tmpDir,
      input: '',
    });

    // Should keep existing file
    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    assert.ok(
      claudeMd.includes('My existing project CLAUDE.md') || claudeMd.includes('My stuff'),
      'existing CLAUDE.md content must be preserved in non-interactive mode'
    );

    // Status should mention sync-claude-md option
    assert.match(stdout, /sync-claude-md/i, 'output must mention --sync-claude-md option');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: init.sh interactive prompt — overwrite choice
// ---------------------------------------------------------------------------

test('E2E: init interactive prompt with "o" overwrites CLAUDE.md', () => {
  const tmpDir = makeTempDir('init-interactive-overwrite');
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Old project content\n');

  try {
    // Send "o" as stdin to choose overwrite
    const { stdout, exitCode } = runScript('init.sh', '', {
      cwd: tmpDir,
      input: 'o\n',
    });

    assert.equal(exitCode, 0);
    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    // Should be the template, not the old content
    assert.ok(
      !claudeMd.includes('Old project content'),
      'old content must be replaced after overwrite choice'
    );
    assert.match(stdout, /overwrite|CLAUDE\.md:/i, 'output must confirm overwrite');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: init.sh interactive prompt — exit choice
// ---------------------------------------------------------------------------

test('E2E: init interactive prompt with "e" exits with sync instructions', () => {
  const tmpDir = makeTempDir('init-interactive-exit');
  const originalContent = '# My project CLAUDE.md\n';
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), originalContent);

  try {
    const { stdout, exitCode } = runScript('init.sh', '', {
      cwd: tmpDir,
      input: 'e\n',
    });

    // Should exit cleanly
    assert.equal(exitCode, 0, 'exit choice should exit 0');
    // Original file unchanged
    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    assert.equal(claudeMd, originalContent, 'CLAUDE.md must be unchanged after exit choice');
    // Output mentions --sync-claude-md
    assert.match(stdout, /sync-claude-md/, 'output must mention --sync-claude-md on exit');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: init.sh interactive prompt — invalid input defaults to exit
// ---------------------------------------------------------------------------

test('E2E: init interactive prompt with invalid input defaults to exit', () => {
  const tmpDir = makeTempDir('init-interactive-invalid');
  const originalContent = '# My project CLAUDE.md\n';
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), originalContent);

  try {
    const { stdout, exitCode } = runScript('init.sh', '', {
      cwd: tmpDir,
      input: 'x\n',
    });

    // Should default to exit (the safer option)
    assert.equal(exitCode, 0, 'invalid input should default to exit (safe)');
    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    assert.equal(claudeMd, originalContent, 'CLAUDE.md must be unchanged for invalid input');
    assert.match(stdout, /sync-claude-md/, 'output must mention --sync-claude-md');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: init.sh interactive prompt — EOF defaults to exit
// ---------------------------------------------------------------------------

test('E2E: init interactive prompt with EOF defaults to exit', () => {
  const tmpDir = makeTempDir('init-interactive-eof');
  const originalContent = '# My project CLAUDE.md\n';
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), originalContent);

  try {
    // Empty string = EOF on stdin
    const { stdout, exitCode } = runScript('init.sh', '', {
      cwd: tmpDir,
      input: '',
    });

    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    // Should default to keeping existing (safe option) — same as non-interactive
    assert.ok(
      claudeMd.includes('My project CLAUDE.md'),
      'CLAUDE.md must be unchanged on EOF'
    );
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: malformed markers — exact [skipped] output and status with skipped count
// ---------------------------------------------------------------------------

test('E2E: malformed markers show [skipped] in output and skipped count in status', () => {
  const tmpDir = makeTempDir('malformed-exact');
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.claude', '.codingagents-version'), 'core=v5\n');
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Content without closing marker',
  ].join('\n'));

  try {
    const { stdout, exitCode } = runScript('upgrade.sh', '--sync-claude-md', { cwd: tmpDir });

    assert.equal(exitCode, 0, 'malformed markers must not cause exit 1');
    assert.match(stdout, /\[skipped/i, 'per-section output must show [skipped: ...]');
    assert.match(stdout, /CLAUDE\.md:.*skipped/i, 'final status must include skipped count');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: backup failure — aborts before modification
// ---------------------------------------------------------------------------

test('E2E: backup creation failure aborts sync, original file unchanged', () => {
  const tmpDir = makeTempDir('backup-fail');
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.claude', '.codingagents-version'), 'core=v5\n');

  const originalContent = [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Old content',
    '<!-- managed:end:known-gotchas -->',
  ].join('\n');
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), originalContent);

  // Make backup path unwritable by creating it as a directory
  fs.mkdirSync(path.join(tmpDir, 'CLAUDE.md.pre-sync'));

  const { exitCode } = runScript('upgrade.sh', '--sync-claude-md', { cwd: tmpDir });

  assert.notEqual(exitCode, 0, 'must exit non-zero on backup failure');

  // Original must be unchanged
  const afterContent = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
  assert.equal(afterContent, originalContent, 'original must be unchanged after backup failure');

  cleanupDir(tmpDir);
});

// ---------------------------------------------------------------------------
// E2E: upgrade.sh --sync-claude-md replaces managed content
// ---------------------------------------------------------------------------

test('E2E: upgrade --sync-claude-md replaces managed content and preserves user content', () => {
  const tmpDir = makeTempDir('upgrade-sync');

  // Setup existing project with markers
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.claude', '.codingagents-version'), 'core=v5\n');
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), [
    '# Project',
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Old framework content from v1',
    '<!-- managed:end:known-gotchas -->',
    '- My project-specific gotcha that must survive',
  ].join('\n'));

  try {
    const { stdout, exitCode } = runScript('upgrade.sh', '--sync-claude-md', { cwd: tmpDir });

    assert.equal(exitCode, 0);

    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    assert.ok(
      claudeMd.includes('My project-specific gotcha that must survive'),
      'user content outside markers must be preserved'
    );
    assert.ok(
      !claudeMd.includes('Old framework content from v1'),
      'old managed content must be replaced'
    );

    assert.match(stdout, /CLAUDE\.md:/, 'output must include status line');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: upgrade.sh without flag — prints reminder
// ---------------------------------------------------------------------------

test('E2E: upgrade without flag prints sync-claude-md reminder', () => {
  const tmpDir = makeTempDir('upgrade-no-flag');
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.claude', '.codingagents-version'), 'core=v5\n');
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Project\n');

  try {
    const { stdout, exitCode } = runScript('upgrade.sh', '', { cwd: tmpDir });

    assert.equal(exitCode, 0);
    assert.match(stdout, /sync-claude-md/, 'must print --sync-claude-md reminder');
    assert.match(stdout, /CLAUDE\.md:.*not modified/i, 'status must say not modified');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: upgrade.sh --sync-claude-md on legacy file (no markers) — migration
// ---------------------------------------------------------------------------

test('E2E: upgrade --sync-claude-md on legacy CLAUDE.md performs migration', () => {
  const tmpDir = makeTempDir('upgrade-legacy');
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.claude', '.codingagents-version'), 'core=v5\n');
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), [
    '# Project',
    '## Known Gotchas',
    '- My custom gotcha from before sync existed',
  ].join('\n'));

  try {
    const { stdout, exitCode } = runScript('upgrade.sh', '--sync-claude-md', { cwd: tmpDir });

    assert.equal(exitCode, 0);

    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    assert.match(claudeMd, /<!-- managed:start:known-gotchas -->/, 'must insert markers');
    assert.ok(
      claudeMd.includes('My custom gotcha from before sync existed'),
      'user content must be preserved after migration'
    );

    assert.match(stdout, /migrated/i, 'output must report migration');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: no-op sync — no changes, no backup
// ---------------------------------------------------------------------------

test('E2E: no-op sync reports unchanged and skips backup', () => {
  const tmpDir = makeTempDir('noop');
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.claude', '.codingagents-version'), 'core=v5\n');

  // First run to establish markers
  const { exitCode: firstExit } = runScript('init.sh', '--sync-claude-md', { cwd: tmpDir });
  assert.equal(firstExit, 0, 'first init should succeed');

  // Second run should be no-op
  const { stdout, exitCode } = runScript('upgrade.sh', '--sync-claude-md', { cwd: tmpDir });
  assert.equal(exitCode, 0);
  assert.match(stdout, /unchanged|no changes|already in sync/i, 'must report no-op');
  assert.ok(
    !fs.existsSync(path.join(tmpDir, 'CLAUDE.md.pre-sync')),
    'no backup for no-op sync'
  );
});

// ---------------------------------------------------------------------------
// E2E: backup created when changes pending, includes restore instructions
// ---------------------------------------------------------------------------

test('E2E: backup created with restore instructions when changes pending', () => {
  const tmpDir = makeTempDir('backup');
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.claude', '.codingagents-version'), 'core=v5\n');
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Content that will change',
    '<!-- managed:end:known-gotchas -->',
  ].join('\n'));

  try {
    const { stdout, exitCode } = runScript('upgrade.sh', '--sync-claude-md', { cwd: tmpDir });

    assert.equal(exitCode, 0);
    assert.ok(
      fs.existsSync(path.join(tmpDir, 'CLAUDE.md.pre-sync')),
      'backup must be created'
    );
    assert.match(stdout, /pre-sync|backup/i, 'output must mention backup');
    assert.match(stdout, /restore|mv/i, 'output must include restore instructions');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: malformed markers — skip with warning, continue
// ---------------------------------------------------------------------------

test('E2E: malformed markers skip section with warning, exit 0', () => {
  const tmpDir = makeTempDir('malformed');
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.claude', '.codingagents-version'), 'core=v5\n');
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Content without closing marker',
  ].join('\n'));

  try {
    const { stdout, exitCode } = runScript('upgrade.sh', '--sync-claude-md', { cwd: tmpDir });

    assert.equal(exitCode, 0, 'malformed markers must not cause exit 1');
    assert.match(stdout, /skip|warning|malformed/i, 'must warn about malformed markers');
  } finally {
    cleanupDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// E2E: missing docs/CLAUDE.md — error exit
// ---------------------------------------------------------------------------

test('E2E: sync aborts when docs/CLAUDE.md is missing from source', () => {
  const tmpDir = makeTempDir('missing-source');
  // Don't copy any source docs
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Project\n');

  const { exitCode } = runScript('init.sh', '--sync-claude-md', { cwd: tmpDir });
  assert.notEqual(exitCode, 0, 'must exit non-zero when docs/CLAUDE.md is missing');

  cleanupDir(tmpDir);
});
