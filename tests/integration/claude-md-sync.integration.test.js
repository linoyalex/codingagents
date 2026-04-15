/**
 * Integration tests for claude-md-sync feature (RED state)
 *
 * // ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA
 *
 * Derived from: docs/features/claude-md-sync/prd.md + architecture.md
 * Ticket: ISS-008
 *
 * Integration entry point: init.sh (production script)
 * The init.sh script is the production entry point that consumers run.
 * The integration test executes init.sh with --sync-claude-md in a temp
 * directory and asserts the feature's effect is visible in both file output
 * (CLAUDE.md with markers) and CLI output (per-section action report).
 *
 * Primary production-wiring test seam:
 *   init.sh sources lib/sync-claude-md.sh → calls sync_claude_md() →
 *   reads docs/CLAUDE.md → writes managed markers into target CLAUDE.md.
 *   This is the integration point: script (init.sh) invokes library
 *   (lib/sync-claude-md.sh) to produce observable output.
 *
 * Cases covered:
 *   Happy:   init.sh --sync-claude-md produces CLAUDE.md with managed markers
 *   Edge:    upgrade.sh --sync-claude-md on file with markers preserves user content
 *   Misuse:  sync with missing docs/CLAUDE.md exits non-zero
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Helper: run a script in a temp directory and capture output
// ---------------------------------------------------------------------------

function runInTempDir(scriptArgs, opts = {}) {
  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'claude-md-sync-'));
  const env = { ...process.env, ...opts.env };

  try {
    const result = execSync(
      `bash ${path.join(ROOT_DIR, scriptArgs)}`,
      {
        cwd: tmpDir,
        env,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      }
    );
    return { stdout: result, tmpDir, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', tmpDir, exitCode: err.status };
  }
}

// ---------------------------------------------------------------------------
// Integration: init.sh --sync-claude-md produces CLAUDE.md with managed markers
// ---------------------------------------------------------------------------

test('Integration: init.sh --sync-claude-md creates CLAUDE.md with managed markers', () => {
  const { stdout, tmpDir, exitCode } = runInTempDir('init.sh --sync-claude-md');

  // Assert exit success
  assert.equal(exitCode, 0, `init.sh --sync-claude-md should exit 0, got ${exitCode}`);

  // Assert CLAUDE.md was created
  const claudeMdPath = path.join(tmpDir, 'CLAUDE.md');
  assert.ok(
    fs.existsSync(claudeMdPath),
    'init.sh --sync-claude-md must create CLAUDE.md'
  );

  // Assert managed markers are present
  const content = fs.readFileSync(claudeMdPath, 'utf8');
  assert.match(
    content,
    /<!-- managed:start:/,
    'CLAUDE.md must contain managed:start markers after sync'
  );
  assert.match(
    content,
    /<!-- managed:end:/,
    'CLAUDE.md must contain managed:end markers after sync'
  );

  // Assert CLI output contains per-section action report
  assert.match(
    stdout,
    /\[added\]|\[updated\]|\[unchanged\]/,
    'CLI output must contain per-section action labels'
  );

  // Assert CLAUDE.md status line in output
  assert.match(
    stdout,
    /CLAUDE\.md:/,
    'CLI output must contain CLAUDE.md status line'
  );

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Integration: upgrade.sh --sync-claude-md preserves user content outside markers
// ---------------------------------------------------------------------------

test('Integration: upgrade.sh --sync-claude-md preserves user content outside markers', () => {
  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'claude-md-sync-upgrade-'));

  // Setup: create a CLAUDE.md with managed markers and user content
  const claudeMdContent = [
    '# Project CLAUDE.md',
    '',
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Old framework content',
    '<!-- managed:end:known-gotchas -->',
    '- My custom project gotcha',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), claudeMdContent);

  // Also need .claude directory for upgrade to work
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.claude', '.codingagents-version'), 'core=v5\n');

  try {
    const result = execSync(
      `bash ${path.join(ROOT_DIR, 'upgrade.sh')} --sync-claude-md`,
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      }
    );

    // Assert user content is preserved
    const updated = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    assert.ok(
      updated.includes('My custom project gotcha'),
      'User content outside markers must be preserved after upgrade sync'
    );

    // Assert CLI output is visible
    assert.match(
      result,
      /CLAUDE\.md:/,
      'upgrade.sh output must contain CLAUDE.md status line'
    );
  } catch (err) {
    // Even if upgrade fails (feature not implemented), assert the right failure
    assert.fail(`upgrade.sh --sync-claude-md failed: ${err.stderr || err.message}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Integration: sync with missing docs/CLAUDE.md exits non-zero
//
// init.sh resolves source via SCRIPT_DIR (dirname of $0), so we must create
// an isolated source directory that has init.sh + dependencies but omits
// docs/CLAUDE.md. Running the real repo's init.sh would always find docs/CLAUDE.md.
// ---------------------------------------------------------------------------

test('Integration: sync aborts with error when docs/CLAUDE.md is missing', () => {
  // Build a source dir with init.sh and its dependencies, minus docs/CLAUDE.md
  const sourceDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'claude-md-sync-src-'));
  fs.copyFileSync(path.join(ROOT_DIR, 'init.sh'), path.join(sourceDir, 'init.sh'));
  fs.mkdirSync(path.join(sourceDir, 'lib'), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT_DIR, 'lib', 'sync-claude-md.sh'),
    path.join(sourceDir, 'lib', 'sync-claude-md.sh')
  );
  fs.copyFileSync(path.join(ROOT_DIR, 'CLAUDE.md'), path.join(sourceDir, 'CLAUDE.md'));
  for (const f of fs.readdirSync(ROOT_DIR).filter(n => n.startsWith('ROLE_') && n.endsWith('.md'))) {
    fs.copyFileSync(path.join(ROOT_DIR, f), path.join(sourceDir, f));
  }
  for (const dir of ['commands', 'skills', 'hooks', 'schemas']) {
    const src = path.join(ROOT_DIR, dir);
    if (fs.existsSync(src)) {
      fs.cpSync(src, path.join(sourceDir, dir), { recursive: true });
    }
  }
  // Intentionally do NOT create docs/CLAUDE.md in sourceDir

  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'claude-md-sync-missing-'));

  try {
    execSync(
      `bash ${path.join(sourceDir, 'init.sh')} --sync-claude-md`,
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      }
    );
    assert.fail('init.sh --sync-claude-md should fail when docs/CLAUDE.md is missing');
  } catch (err) {
    // err.status is the process exit code; assert.fail would set it to undefined
    assert.ok(
      typeof err.status === 'number' && err.status !== 0,
      `must exit non-zero when docs/CLAUDE.md is missing (got status: ${err.status})`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(sourceDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Integration: pre-sync backup is created when changes are pending
// ---------------------------------------------------------------------------

test('Integration: pre-sync backup created before modifying existing CLAUDE.md', () => {
  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'claude-md-sync-backup-'));

  // Setup: create an existing CLAUDE.md
  fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Existing project\n');
  fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });

  try {
    execSync(
      `bash ${path.join(ROOT_DIR, 'init.sh')} --sync-claude-md`,
      {
        cwd: tmpDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000,
      }
    );

    // Assert backup was created
    assert.ok(
      fs.existsSync(path.join(tmpDir, 'CLAUDE.md.pre-sync')),
      'CLAUDE.md.pre-sync must be created when changes are pending'
    );
  } catch (err) {
    assert.fail(`init.sh --sync-claude-md failed: ${err.stderr || err.message}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
