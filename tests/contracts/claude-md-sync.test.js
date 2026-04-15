/**
 * Contract tests for claude-md-sync feature (RED state)
 *
 * Derived from: docs/features/claude-md-sync/prd.md + architecture.md
 * Ticket: ISS-008
 *
 * Primary production-wiring test seam:
 *   lib/sync-claude-md.sh is the sync library. init.sh and upgrade.sh
 *   must source it and call the sync function when --sync-claude-md is passed.
 *   The feature is "wired" when all three files exist and init.sh/upgrade.sh
 *   reference the sync library.
 *
 * Test strategy:
 *   Layer 1 (wiring): static checks that files exist and reference each other
 *   Layer 2 (fixture): invoke sync function on sample CLAUDE.md files and assert
 *     exact output files + terminal lines
 *
 * Cases covered:
 *   Happy:   sync library exists with marker functions; init/upgrade reference it
 *   Edge:    allowlist anchors match current docs/CLAUDE.md content (drift detection)
 *   Misuse:  framework-internal bullets must NOT appear in allowlist
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const os = require('node:os');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Helper: source the sync library and invoke sync_claude_md in a temp directory.
 * Returns { stdout, stderr, exitCode, targetContent }.
 */
function runSyncFunction(sourceClaudeMd, targetClaudeMd, mode, opts = {}) {
  const tmpDir = makeTempDir('sync-contract-');
  const sourcePath = path.join(tmpDir, 'docs', 'CLAUDE.md');
  const targetPath = path.join(tmpDir, 'CLAUDE.md');
  const templatePath = opts.templatePath || path.join(tmpDir, 'template-CLAUDE.md');

  fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
  fs.writeFileSync(sourcePath, sourceClaudeMd);
  if (targetClaudeMd !== null) {
    fs.writeFileSync(targetPath, targetClaudeMd);
  }
  if (opts.templateContent) {
    fs.writeFileSync(templatePath, opts.templateContent);
  }

  const libPath = path.join(ROOT_DIR, 'lib', 'sync-claude-md.sh');
  const tplArg = opts.templateContent ? ` "${templatePath}"` : '';
  const script = `
    source "${libPath}"
    sync_claude_md "${sourcePath}" "${targetPath}" "${mode}"${tplArg}
  `;

  try {
    const stdout = execSync(`bash -c '${script}'`, {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    });
    const targetContent = fs.existsSync(targetPath)
      ? fs.readFileSync(targetPath, 'utf8')
      : null;
    return { stdout, stderr: '', exitCode: 0, targetContent, tmpDir };
  } catch (err) {
    const targetContent = fs.existsSync(targetPath)
      ? fs.readFileSync(targetPath, 'utf8')
      : null;
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.status,
      targetContent,
      tmpDir,
    };
  }
}

// ===========================================================================
// LAYER 1: Static wiring checks
// ===========================================================================

test('Wiring: lib/sync-claude-md.sh exists', () => {
  assert.ok(
    fileExists('lib/sync-claude-md.sh'),
    'lib/sync-claude-md.sh must exist as the sync library'
  );
});

test('Wiring: lib/sync-claude-md.sh defines sync_claude_md function', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(lib, /sync_claude_md/, 'must define sync_claude_md function');
});

test('Wiring: init.sh accepts --sync-claude-md and sources sync library', () => {
  const initSh = read('init.sh');
  assert.match(initSh, /--sync-claude-md/, 'init.sh must accept --sync-claude-md flag');
  assert.match(initSh, /sync-claude-md\.sh/, 'init.sh must source the sync library');
});

test('Wiring: upgrade.sh accepts --sync-claude-md and sources sync library', () => {
  const upgradeSh = read('upgrade.sh');
  assert.match(upgradeSh, /--sync-claude-md/, 'upgrade.sh must accept --sync-claude-md flag');
  assert.match(upgradeSh, /sync-claude-md\.sh/, 'upgrade.sh must source the sync library');
});

test('Wiring: exactly 3 eligible section IDs defined', () => {
  const lib = read('lib/sync-claude-md.sh');
  for (const id of ['code-conventions-must-follow', 'architecture-notes', 'known-gotchas']) {
    assert.match(lib, new RegExp(id), `must reference section ID: ${id}`);
  }
});

test('Wiring: folder-structure and naming are NOT eligible sections', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.ok(
    !/eligible.*folder-structure|folder-structure.*eligible/i.test(lib),
    'must NOT list folder-structure as eligible'
  );
  assert.ok(
    !/eligible.*naming|naming.*eligible/i.test(lib),
    'must NOT list naming as eligible'
  );
});

test('Wiring: allowlist drift — docs/CLAUDE.md contains eligible headings', () => {
  const docsClaude = read('docs/CLAUDE.md');
  assert.match(docsClaude, /^### Must Follow$/m, 'docs/CLAUDE.md needs "### Must Follow"');
  assert.match(docsClaude, /^## Architecture Notes$/m, 'docs/CLAUDE.md needs "## Architecture Notes"');
  assert.match(docsClaude, /^## Known Gotchas$/m, 'docs/CLAUDE.md needs "## Known Gotchas"');
});

test('Wiring: sync library uses fail-closed allowlist', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(lib, /allow/i, 'must use an allowlist (fail-closed) approach');
});

// ===========================================================================
// LAYER 2: Fixture-driven behavioral tests
// ===========================================================================

// --- AC1: marker insertion on init ---

test('AC1: sync inserts managed markers into target CLAUDE.md', () => {
  const source = [
    '## Known Gotchas',
    '- Auth callback URL must be updated when changing domains',
    '- Framework-internal: checkpoint.js detection',
  ].join('\n');

  const target = [
    '# Project',
    '## Known Gotchas',
    '- <!-- e.g. Add your gotchas here -->',
  ].join('\n');

  const { targetContent, exitCode, tmpDir } = runSyncFunction(source, target, 'init');
  try {
    assert.equal(exitCode, 0, 'sync should succeed');
    assert.match(targetContent, /<!-- managed:start:known-gotchas -->/, 'must insert start marker');
    assert.match(targetContent, /<!-- managed:end:known-gotchas -->/, 'must insert end marker');
  } finally {
    cleanupDir(tmpDir);
  }
});

// --- AC3: upgrade replaces managed content, preserves outside ---

test('AC3: upgrade replaces managed content and preserves user content outside markers', () => {
  const source = [
    '## Known Gotchas',
    '- Updated gotcha from framework v2',
  ].join('\n');

  const target = [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Old gotcha from framework v1',
    '<!-- managed:end:known-gotchas -->',
    '- My project-specific gotcha',
  ].join('\n');

  const { targetContent, exitCode, tmpDir } = runSyncFunction(source, target, 'upgrade');
  try {
    assert.equal(exitCode, 0, 'sync should succeed');
    assert.ok(
      targetContent.includes('My project-specific gotcha'),
      'user content outside markers must be preserved'
    );
    assert.ok(
      !targetContent.includes('Old gotcha from framework v1'),
      'old managed content must be replaced'
    );
  } finally {
    cleanupDir(tmpDir);
  }
});

// --- AC4: user content preservation ---

test('AC4: content outside markers is byte-identical after sync', () => {
  const userContent = '- My custom convention that must survive sync\n- Another user note\n';
  const source = '## Known Gotchas\n- Framework gotcha\n';
  const target = [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Old framework gotcha',
    '<!-- managed:end:known-gotchas -->',
    userContent,
  ].join('\n');

  const { targetContent, exitCode, tmpDir } = runSyncFunction(source, target, 'upgrade');
  try {
    assert.equal(exitCode, 0);
    assert.ok(
      targetContent.includes(userContent.trim()),
      'user content must be byte-identical after sync'
    );
  } finally {
    cleanupDir(tmpDir);
  }
});

// --- AC5: output reports per-section actions ---

test('AC5: sync output lists per-section actions with labels', () => {
  const source = '## Known Gotchas\n- Updated content\n';
  const target = [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Old content',
    '<!-- managed:end:known-gotchas -->',
  ].join('\n');

  const { stdout, exitCode, tmpDir } = runSyncFunction(source, target, 'upgrade');
  try {
    assert.equal(exitCode, 0);
    assert.match(
      stdout,
      /\[updated\]|\[unchanged\]|\[added\]|\[migrated\]|\[skipped/,
      'output must contain action labels'
    );
  } finally {
    cleanupDir(tmpDir);
  }
});

// --- AC6: no-op detection ---

test('AC6: byte-identical content reported as [unchanged]', () => {
  const content = '- Same gotcha content\n';
  const source = `## Known Gotchas\n${content}`;
  const target = [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    content.trim(),
    '<!-- managed:end:known-gotchas -->',
  ].join('\n');

  const { stdout, exitCode, tmpDir } = runSyncFunction(source, target, 'upgrade');
  try {
    assert.equal(exitCode, 0);
    assert.match(stdout, /unchanged/i, 'byte-identical section must report as unchanged');
  } finally {
    cleanupDir(tmpDir);
  }
});

// --- AC7b: backup creation ---

test('AC7b: pre-sync backup created when changes are pending', () => {
  const source = '## Known Gotchas\n- New content\n';
  const target = [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Old content',
    '<!-- managed:end:known-gotchas -->',
  ].join('\n');

  const { stdout, exitCode, tmpDir } = runSyncFunction(source, target, 'upgrade');
  try {
    assert.equal(exitCode, 0);
    assert.ok(
      fs.existsSync(path.join(tmpDir, 'CLAUDE.md.pre-sync')),
      'CLAUDE.md.pre-sync must be created when changes are pending'
    );
    assert.match(stdout, /pre-sync|backup/i, 'output must mention backup');
  } finally {
    cleanupDir(tmpDir);
  }
});

test('AC7b: no backup created for no-op sync', () => {
  const content = '- Same content\n';
  const source = `## Known Gotchas\n${content}`;
  const target = [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    content.trim(),
    '<!-- managed:end:known-gotchas -->',
  ].join('\n');

  const { exitCode, tmpDir } = runSyncFunction(source, target, 'upgrade');
  try {
    assert.equal(exitCode, 0);
    assert.ok(
      !fs.existsSync(path.join(tmpDir, 'CLAUDE.md.pre-sync')),
      'CLAUDE.md.pre-sync must NOT be created for no-op sync'
    );
  } finally {
    cleanupDir(tmpDir);
  }
});

// --- AC7b: backup failure aborts before modification ---

test('AC7b: backup creation failure aborts sync, original unchanged', () => {
  const tmpDir = makeTempDir('sync-contract-backup-fail-');
  const sourcePath = path.join(tmpDir, 'docs', 'CLAUDE.md');
  const targetPath = path.join(tmpDir, 'CLAUDE.md');
  const backupPath = path.join(tmpDir, 'CLAUDE.md.pre-sync');

  fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
  fs.writeFileSync(sourcePath, '## Known Gotchas\n- New content\n');

  const originalContent = [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Old content that should survive',
    '<!-- managed:end:known-gotchas -->',
  ].join('\n');
  fs.writeFileSync(targetPath, originalContent);

  // Make backup path unwritable by creating it as a directory
  fs.mkdirSync(backupPath);

  const libPath = path.join(ROOT_DIR, 'lib', 'sync-claude-md.sh');
  const script = `source "${libPath}"; sync_claude_md "${sourcePath}" "${targetPath}" "upgrade"`;

  try {
    execSync(`bash -c '${script}'`, {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    assert.fail('should have exited non-zero when backup cannot be created');
  } catch (err) {
    assert.notEqual(err.status, 0, 'must exit non-zero on backup failure');
    // Must emit a user-visible error message about the backup failure
    const output = (err.stdout || '') + (err.stderr || '');
    assert.match(
      output,
      /backup|pre-sync/i,
      'must emit user-visible error message about backup failure'
    );
  }

  // Original file must be byte-identical — not modified
  const afterContent = fs.readFileSync(targetPath, 'utf8');
  assert.equal(
    afterContent,
    originalContent,
    'original CLAUDE.md must be unchanged after backup failure abort'
  );

  cleanupDir(tmpDir);
});

// --- AC3c: legacy migration ---

test('AC3c: legacy migration inserts markers and preserves user content', () => {
  const source = '## Known Gotchas\n- Framework gotcha from docs\n';
  const target = [
    '## Known Gotchas',
    '- My custom project gotcha',
  ].join('\n');

  const { targetContent, stdout, exitCode, tmpDir } = runSyncFunction(source, target, 'upgrade');
  try {
    assert.equal(exitCode, 0);
    assert.match(targetContent, /<!-- managed:start:known-gotchas -->/, 'must insert markers');
    assert.ok(
      targetContent.includes('My custom project gotcha'),
      'user content must be preserved below markers'
    );
    assert.match(stdout, /migrated/i, 'output must report [migrated]');
  } finally {
    cleanupDir(tmpDir);
  }
});

test('AC3c: legacy migration with preserved lines shows inline advisory with count', () => {
  const source = '## Known Gotchas\n- Framework gotcha\n';
  const target = [
    '## Known Gotchas',
    '- User custom gotcha that should survive',
  ].join('\n');

  const { stdout, exitCode, tmpDir } = runSyncFunction(source, target, 'upgrade');
  try {
    assert.equal(exitCode, 0);
    // Must show inline advisory with preserved-line count per AC5
    assert.match(
      stdout,
      /\[migrated.*\d+\s*(line|lines)\s*preserved/i,
      'output must show [migrated, N lines preserved — review for stale text] inline format'
    );
  } finally {
    cleanupDir(tmpDir);
  }
});

// --- Malformed markers ---

test('Malformed markers: unpaired marker is skipped with warning', () => {
  const source = '## Known Gotchas\n- Content\n';
  const target = [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Content without closing marker',
  ].join('\n');

  const { stdout, exitCode, tmpDir } = runSyncFunction(source, target, 'upgrade');
  try {
    assert.equal(exitCode, 0, 'malformed markers should not cause exit 1');
    assert.match(stdout, /skip|malformed|warning/i, 'must warn about malformed markers');
    // Must show [skipped: <reason>] in per-section output
    assert.match(
      stdout,
      /\[skipped/i,
      'output must show [skipped: ...] for malformed-marker section'
    );
  } finally {
    cleanupDir(tmpDir);
  }
});

test('Malformed markers: final status includes skipped count', () => {
  const source = '## Known Gotchas\n- Content\n';
  const target = [
    '## Known Gotchas',
    '<!-- managed:start:known-gotchas -->',
    '- Content without closing marker',
  ].join('\n');

  const { stdout, exitCode, tmpDir } = runSyncFunction(source, target, 'upgrade');
  try {
    assert.equal(exitCode, 0);
    // Final status must include skipped count
    assert.match(
      stdout,
      /skipped/i,
      'final status must include skipped count for partial success'
    );
  } finally {
    cleanupDir(tmpDir);
  }
});

// --- Error: missing source ---

test('Error: sync aborts when source docs/CLAUDE.md is missing', () => {
  const tmpDir = makeTempDir('sync-contract-missing-');
  const targetPath = path.join(tmpDir, 'CLAUDE.md');
  fs.writeFileSync(targetPath, '# Project\n');

  const libPath = path.join(ROOT_DIR, 'lib', 'sync-claude-md.sh');
  const missingSource = path.join(tmpDir, 'nonexistent', 'CLAUDE.md');
  const script = `source "${libPath}"; sync_claude_md "${missingSource}" "${targetPath}" "upgrade"`;

  try {
    execSync(`bash -c '${script}'`, { cwd: tmpDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    assert.fail('should have exited non-zero');
  } catch (err) {
    assert.notEqual(err.status, 0, 'must exit non-zero when source is missing');
  } finally {
    cleanupDir(tmpDir);
  }
});

// --- AC3c: legacy migration strips template content ---

test('AC3c: legacy migration strips lines byte-identical to root template', () => {
  const source = '## Known Gotchas\n- Framework gotcha from docs\n';

  // Template has both placeholder scaffolding AND actual content lines
  const templateContent = [
    '## Known Gotchas',
    '- Template gotcha that should be stripped',
    '- <!-- e.g. Example placeholder -->',
  ].join('\n');

  // Target has template lines + genuine user content
  const target = [
    '## Known Gotchas',
    '- Template gotcha that should be stripped',
    '- My genuine user gotcha',
  ].join('\n');

  const { targetContent, stdout, exitCode, tmpDir } = runSyncFunction(
    source, target, 'upgrade', { templateContent }
  );
  try {
    assert.equal(exitCode, 0);
    assert.ok(
      targetContent.includes('My genuine user gotcha'),
      'genuine user content must survive migration'
    );
    assert.ok(
      !targetContent.includes('Template gotcha that should be stripped'),
      'template-identical lines must be stripped during migration'
    );
    // Only user content preserved — no stale template text as "preserved lines"
    assert.match(stdout, /migrated/i, 'must report migrated');
  } finally {
    cleanupDir(tmpDir);
  }
});

test('AC3c: legacy migration with only template content shows 0 preserved lines', () => {
  const source = '## Known Gotchas\n- Framework gotcha from docs\n';

  const templateContent = [
    '## Known Gotchas',
    '- Template line one',
    '- Template line two',
  ].join('\n');

  // Target contains ONLY template content (no user additions)
  const target = [
    '## Known Gotchas',
    '- Template line one',
    '- Template line two',
  ].join('\n');

  const { stdout, exitCode, tmpDir } = runSyncFunction(
    source, target, 'upgrade', { templateContent }
  );
  try {
    assert.equal(exitCode, 0);
    // Should report [migrated] without preserved-line count (all stripped)
    assert.match(stdout, /\[migrated\]/, 'must report [migrated] without preserved count');
    assert.ok(
      !/preserved/i.test(stdout),
      'must NOT mention preserved lines when all content was template'
    );
  } finally {
    cleanupDir(tmpDir);
  }
});

// --- Atomic write ---

test('Write safety: sync uses temp file for atomic write', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(lib, /\.tmp/, 'must use .tmp temp file for atomic writes');
});
