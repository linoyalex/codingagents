// Production wiring test seam: init.sh and upgrade.sh
// This contract test verifies every source file (skills/*/SKILL.md, commands/*.md, hooks/*.js)
// is operationalized by the installer and upgrade scripts.
// The assertion is path-presence, not mechanism — literal cp, loops, manifests, and
// directory copies all satisfy the contract as long as the target path appears in the script.
// Derived from PRD (ISS-027) AC7 and architecture decision record.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { globSync } = require('node:fs');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

// Files intentionally excluded from the installer contract.
// Each entry must have an explanatory comment.
const INIT_EXCLUSIONS = [
  // Add entries here when a source file is deliberately not installed.
  // Format: 'relative/path/from/root'
];

const UPGRADE_EXCLUSIONS = [
  // upgrade.sh may legitimately skip init-time-only files.
  // Document each omission here with a reason.
];

function readScript(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
}

function globSourceFiles(pattern) {
  // node:fs globSync available in Node 22+
  // Falls back to manual walk if not available
  if (typeof globSync === 'function') {
    return globSync(pattern, { cwd: ROOT_DIR }).map(f => f.replace(/\\/g, '/'));
  }
  // Manual fallback for older Node
  const results = [];
  const [dir, ...rest] = pattern.split('/');
  const entries = fs.readdirSync(path.join(ROOT_DIR, dir), { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subPattern = rest.join('/').replace('*', entry.name);
      const subPath = path.join(ROOT_DIR, dir, entry.name, rest[rest.length - 1]);
      if (rest.length === 2 && fs.existsSync(subPath)) {
        results.push(`${dir}/${entry.name}/${rest[rest.length - 1]}`);
      }
    } else if (rest.length === 1 && entry.name.match(/\.md$|\.js$/)) {
      results.push(`${dir}/${entry.name}`);
    }
  }
  return results;
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
  const initSh = readScript('init.sh');
  const files = collectSourceFiles().filter(f => f.type === 'skill');
  const failures = [];

  for (const { source } of files) {
    if (INIT_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!initSh.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in init.sh`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `init.sh missing coverage for ${failures.length} skill(s):\n  ${failures.join('\n  ')}`
  );
});

test('AC7: init.sh operationalizes every commands/*.md file', () => {
  const initSh = readScript('init.sh');
  const files = collectSourceFiles().filter(f => f.type === 'command');
  const failures = [];

  for (const { source } of files) {
    if (INIT_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!initSh.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in init.sh`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `init.sh missing coverage for ${failures.length} command(s):\n  ${failures.join('\n  ')}`
  );
});

test('AC7: init.sh operationalizes every hooks/*.js file', () => {
  const initSh = readScript('init.sh');
  const files = collectSourceFiles().filter(f => f.type === 'hook');
  const failures = [];

  for (const { source } of files) {
    if (INIT_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!initSh.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in init.sh`);
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
  const upgradeSh = readScript('upgrade.sh');
  const files = collectSourceFiles().filter(f => f.type === 'skill');
  const failures = [];

  for (const { source } of files) {
    if (UPGRADE_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!upgradeSh.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in upgrade.sh`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `upgrade.sh missing coverage for ${failures.length} skill(s):\n  ${failures.join('\n  ')}`
  );
});

test('AC7: upgrade.sh operationalizes every commands/*.md file', () => {
  const upgradeSh = readScript('upgrade.sh');
  const files = collectSourceFiles().filter(f => f.type === 'command');
  const failures = [];

  for (const { source } of files) {
    if (UPGRADE_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!upgradeSh.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in upgrade.sh`);
    }
  }

  assert.equal(
    failures.length,
    0,
    `upgrade.sh missing coverage for ${failures.length} command(s):\n  ${failures.join('\n  ')}`
  );
});

test('AC7: upgrade.sh operationalizes every hooks/*.js file', () => {
  const upgradeSh = readScript('upgrade.sh');
  const files = collectSourceFiles().filter(f => f.type === 'hook');
  const failures = [];

  for (const { source } of files) {
    if (UPGRADE_EXCLUSIONS.includes(source)) continue;
    const installedPath = deriveInstalledPath(source);
    if (!upgradeSh.includes(installedPath)) {
      failures.push(`${source} → expected "${installedPath}" in upgrade.sh`);
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

test('exclusion list entries must correspond to actual source files (no phantom exclusions)', () => {
  const files = collectSourceFiles().map(f => f.source);
  for (const excluded of [...INIT_EXCLUSIONS, ...UPGRADE_EXCLUSIONS]) {
    assert.ok(
      files.includes(excluded),
      `Exclusion "${excluded}" does not match any known source file — remove stale entry`
    );
  }
});
