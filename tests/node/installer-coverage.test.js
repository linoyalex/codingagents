// Production wiring test seam: init.sh and upgrade.sh
// This contract test verifies every source file (skills/*/SKILL.md, commands/*.md, hooks/*.js)
// is operationalized by the installer and upgrade scripts.
// The assertion is path-presence in active (non-comment) lines — literal cp, loops, manifests,
// and directory copies all satisfy the contract as long as the target path appears in an
// active script line. Comment-only references do not count.
// Derived from PRD (ISS-027) AC7 and architecture decision record.
// Codex review feedback (2026-04-13): tightened to filter commented lines, cap exclusions,
// and require upgrade.sh exclusions to carry explicit documentation.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');

// Files intentionally excluded from the installer contract.
// Each entry must have an explanatory comment.
// Hard cap: no more than 5 exclusions per script. If you need more, the installer
// likely needs structural fixes, not more exceptions. (Codex review feedback, 2026-04-13)
const MAX_EXCLUSIONS_PER_SCRIPT = 5;

const INIT_EXCLUSIONS = [
  // Add entries here when a source file is deliberately not installed.
  // Format: 'relative/path/from/root'
];

const UPGRADE_EXCLUSIONS = [
  // upgrade.sh may legitimately skip init-time-only files.
  // Each exclusion MUST have a corresponding comment explaining why upgrade.sh
  // does not need to cover this file. (Codex review feedback, 2026-04-13)
];

function readScript(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
}

/**
 * Returns active (non-comment) lines from a shell script.
 * A line is considered a comment if its first non-whitespace character is '#'.
 * This prevents false-passes where a path appears only in a comment or dead code.
 */
function activeLines(scriptContent) {
  return scriptContent
    .split('\n')
    .filter(line => !line.trimStart().startsWith('#'))
    .join('\n');
}

function collectSourceFiles() {
  // Collect via directory reads to avoid globSync compatibility issues
  const files = [];

  // skills/*/SKILL.md
  const skillsDir = path.join(ROOT_DIR, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          files.push({ source: `skills/${entry.name}/SKILL.md`, type: 'skill' });
        }
      }
    }
  }

  // commands/*.md
  const commandsDir = path.join(ROOT_DIR, 'commands');
  if (fs.existsSync(commandsDir)) {
    for (const entry of fs.readdirSync(commandsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() && entry.name.endsWith('.md')) {
        files.push({ source: `commands/${entry.name}`, type: 'command' });
      }
    }
  }

  // hooks/*.js
  const hooksDir = path.join(ROOT_DIR, 'hooks');
  if (fs.existsSync(hooksDir)) {
    for (const entry of fs.readdirSync(hooksDir, { withFileTypes: true })) {
      if (!entry.isDirectory() && entry.name.endsWith('.js')) {
        files.push({ source: `hooks/${entry.name}`, type: 'hook' });
      }
    }
  }

  return files;
}

function deriveInstalledPath(sourceRelPath) {
  // Skills: skills/foo/SKILL.md → .claude/skills/foo/SKILL.md
  if (sourceRelPath.startsWith('skills/')) {
    return sourceRelPath.replace('skills/', '.claude/skills/');
  }
  // Commands: commands/foo.md → .claude/commands/foo.md
  if (sourceRelPath.startsWith('commands/')) {
    return sourceRelPath.replace('commands/', '.claude/commands/');
  }
  // Hooks: hooks/foo.js → .claude/helpers/foo.js
  if (sourceRelPath.startsWith('hooks/')) {
    return sourceRelPath.replace('hooks/', '.claude/helpers/');
  }
  return null;
}

// --- Precondition tests ---

test('installer scripts exist', () => {
  assert.ok(
    fs.existsSync(path.join(ROOT_DIR, 'init.sh')),
    'init.sh does not exist'
  );
  assert.ok(
    fs.existsSync(path.join(ROOT_DIR, 'upgrade.sh')),
    'upgrade.sh does not exist'
  );
});

test('source directories exist', () => {
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'skills')), 'skills/ directory missing');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'commands')), 'commands/ directory missing');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'hooks')), 'hooks/ directory missing');
});

test('at least one source file of each type is found', () => {
  const files = collectSourceFiles();
  const skills = files.filter(f => f.type === 'skill');
  const commands = files.filter(f => f.type === 'command');
  const hooks = files.filter(f => f.type === 'hook');

  assert.ok(skills.length > 0, 'No skills/*/SKILL.md files found — check directory structure');
  assert.ok(commands.length > 0, 'No commands/*.md files found — check directory structure');
  assert.ok(hooks.length > 0, 'No hooks/*.js files found — check directory structure');
});

// --- AC7: init.sh coverage ---

test('AC7: init.sh operationalizes every skills/*/SKILL.md file', () => {
  const initActive = activeLines(readScript('init.sh'));
  const files = collectSourceFiles().filter(f => f.type === 'skill');
  const failures = [];

  for (const { source } of files) {
    if (INIT_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!initActive.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in active lines of init.sh`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `init.sh missing coverage for ${failures.length} skill(s):\n  ${failures.join('\n  ')}`
  );
});

test('AC7: init.sh operationalizes every commands/*.md file', () => {
  const initActive = activeLines(readScript('init.sh'));
  const files = collectSourceFiles().filter(f => f.type === 'command');
  const failures = [];

  for (const { source } of files) {
    if (INIT_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!initActive.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in active lines of init.sh`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `init.sh missing coverage for ${failures.length} command(s):\n  ${failures.join('\n  ')}`
  );
});

test('AC7: init.sh operationalizes every hooks/*.js file', () => {
  const initActive = activeLines(readScript('init.sh'));
  const files = collectSourceFiles().filter(f => f.type === 'hook');
  const failures = [];

  for (const { source } of files) {
    if (INIT_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!initActive.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in active lines of init.sh`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `init.sh missing coverage for ${failures.length} hook(s):\n  ${failures.join('\n  ')}`
  );
});

// --- AC7: upgrade.sh coverage ---

test('AC7: upgrade.sh operationalizes every skills/*/SKILL.md file', () => {
  const upgradeActive = activeLines(readScript('upgrade.sh'));
  const files = collectSourceFiles().filter(f => f.type === 'skill');
  const failures = [];

  for (const { source } of files) {
    if (UPGRADE_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!upgradeActive.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in active lines of upgrade.sh`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `upgrade.sh missing coverage for ${failures.length} skill(s):\n  ${failures.join('\n  ')}`
  );
});

test('AC7: upgrade.sh operationalizes every commands/*.md file', () => {
  const upgradeActive = activeLines(readScript('upgrade.sh'));
  const files = collectSourceFiles().filter(f => f.type === 'command');
  const failures = [];

  for (const { source } of files) {
    if (UPGRADE_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!upgradeActive.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in active lines of upgrade.sh`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `upgrade.sh missing coverage for ${failures.length} command(s):\n  ${failures.join('\n  ')}`
  );
});

test('AC7: upgrade.sh operationalizes every hooks/*.js file', () => {
  const upgradeActive = activeLines(readScript('upgrade.sh'));
  const files = collectSourceFiles().filter(f => f.type === 'hook');
  const failures = [];

  for (const { source } of files) {
    if (UPGRADE_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!upgradeActive.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in active lines of upgrade.sh`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `upgrade.sh missing coverage for ${failures.length} hook(s):\n  ${failures.join('\n  ')}`
  );
});

// --- Edge-case: no new source file silently escapes the contract ---

test('exclusion lists are arrays of strings (invariant guard)', () => {
  assert.ok(Array.isArray(INIT_EXCLUSIONS), 'INIT_EXCLUSIONS must be an array');
  assert.ok(Array.isArray(UPGRADE_EXCLUSIONS), 'UPGRADE_EXCLUSIONS must be an array');
  for (const entry of [...INIT_EXCLUSIONS, ...UPGRADE_EXCLUSIONS]) {
    assert.equal(typeof entry, 'string', `Exclusion entry must be a string, got: ${typeof entry}`);
  }
});

test('exclusion lists do not exceed the per-script cap', () => {
  assert.ok(
    INIT_EXCLUSIONS.length <= MAX_EXCLUSIONS_PER_SCRIPT,
    `INIT_EXCLUSIONS has ${INIT_EXCLUSIONS.length} entries, max is ${MAX_EXCLUSIONS_PER_SCRIPT} — fix the installer instead of adding more exceptions`
  );
  assert.ok(
    UPGRADE_EXCLUSIONS.length <= MAX_EXCLUSIONS_PER_SCRIPT,
    `UPGRADE_EXCLUSIONS has ${UPGRADE_EXCLUSIONS.length} entries, max is ${MAX_EXCLUSIONS_PER_SCRIPT} — fix the installer instead of adding more exceptions`
  );
});

test('exclusion list entries must correspond to actual source files (no phantom exclusions)', () => {
  const files = collectSourceFiles().map(f => f.source);
  for (const excluded of [...INIT_EXCLUSIONS, ...UPGRADE_EXCLUSIONS]) {
    assert.ok(
      files.includes(excluded),
      `Exclusion "${excluded}" does not match any known source file — remove stale entry`
    );
  }
});

test('comment-only path references in init.sh do not satisfy the contract', () => {
  // Regression test: a path appearing only in a shell comment must not pass
  const fakeScript = '#!/bin/bash\n# cp source .claude/skills/fake/SKILL.md\necho "real work"';
  const active = activeLines(fakeScript);
  assert.ok(
    !active.includes('.claude/skills/fake/SKILL.md'),
    'activeLines() must filter comment lines — comment-only path references are not real coverage'
  );
});

test('active code lines in init.sh do satisfy the contract', () => {
  // Positive regression: a path in active code must pass
  const fakeScript = '#!/bin/bash\ncp source .claude/skills/real/SKILL.md\n# comment';
  const active = activeLines(fakeScript);
  assert.ok(
    active.includes('.claude/skills/real/SKILL.md'),
    'activeLines() must retain non-comment lines'
  );
});
