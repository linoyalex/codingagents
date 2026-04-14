// Production wiring test seam: init.sh and upgrade.sh
// This contract test verifies every source file (skills/*/SKILL.md, commands/*.md, hooks/*.js)
// is operationalized by the installer and upgrade scripts.
// Mechanism-agnostic: isCoveredByScript() accepts literal paths, source paths, directory
// copies, loops, manifests, or any mechanism that references the file or a covering ancestor
// directory. Comment-only references do not count (filtered by activeLines).
// Derived from PRD (ISS-027) AC7 and architecture decision record.
// Codex review feedback (2026-04-13): tightened to filter commented lines, cap exclusions,
// and require upgrade.sh exclusions to carry explicit documentation.
// Codex review feedback (2026-04-14): made mechanism-agnostic via isCoveredByScript() to
// avoid overfitting to literal cp lines — directory copies and loops now satisfy the contract.

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

/**
 * Returns true if a line is an inert statement (echo, printf, log, comment-like)
 * that mentions a path without actually operating on it.
 * Used to exclude false positives from installer coverage checks.
 * Inverted from a cp/rsync whitelist to a blacklist so that manifests, helper
 * functions, and other valid installer mechanisms are not rejected.
 * (Codex review feedback, 2026-04-14: whitelisting cp/rsync broke mechanism-agnosticism.)
 */
function isInertLine(line) {
  const trimmed = line.trimStart();
  return /^\s*(echo|printf|log|print)\b/.test(trimmed);
}

/**
 * Mechanism-agnostic coverage check (AC7).
 * Returns true if the script covers the installed path via ANY mechanism:
 * - Literal path reference (explicit cp, rsync, install_file, etc.)
 * - Source path reference (loop over source files)
 * - Parent/ancestor directory reference (recursive cp, wildcard, manifest)
 * - Helper function or manifest entry referencing the path
 *
 * Inert lines (echo, printf, log) are excluded to prevent false positives.
 */
function isCoveredByScript(activeContent, sourceRelPath, installedPath) {
  // Per-line checks exclude inert statements (echo/printf/log) to prevent
  // false positives, while accepting any valid installer mechanism.
  // (Codex review feedback, 2026-04-14: cp/rsync whitelist broke mechanism-agnosticism.)
  const lines = activeContent.split('\n');

  // 1. Literal installed path in a non-inert line (e.g., cp, manifest, helper function)
  for (const line of lines) {
    if (isInertLine(line)) continue;
    if (line.includes(installedPath)) return true;
  }

  // 2. Source path reference in a non-inert line (e.g., cp, loop, manifest)
  for (const line of lines) {
    if (isInertLine(line)) continue;
    if (line.includes(sourceRelPath)) return true;
  }

  // 3. Ancestor directory coverage — check if any parent directory of the
  //    installed path appears in a non-inert line (covers recursive cp, wildcards, manifests)
  //    e.g., cp -r ... .claude/skills/ covers .claude/skills/tdd/SKILL.md
  const parts = installedPath.split('/');
  for (let i = parts.length - 1; i >= 2; i--) {
    const ancestor = parts.slice(0, i).join('/');
    for (const line of lines) {
      if (isInertLine(line)) continue;
      if (line.includes(ancestor + '/') || line.includes(ancestor + '"')
          || line.includes(ancestor + ' ')) {
        return true;
      }
    }
  }

  // 4. Source ancestor coverage (e.g., skills/* or skills/ in a copy loop)
  const srcParts = sourceRelPath.split('/');
  for (let i = srcParts.length - 1; i >= 1; i--) {
    const ancestor = srcParts.slice(0, i).join('/');
    for (const line of lines) {
      if (isInertLine(line)) continue;
      if (line.includes(ancestor + '/') || line.includes(ancestor + '"')
          || line.includes(ancestor + '/*') || line.includes(ancestor + "'")
          || line.includes(ancestor + ' ')) {
        return true;
      }
    }
  }

  return false;
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
    if (!isCoveredByScript(initActive, source, installedPath)) {
      failures.push(`${source} → no coverage for "${installedPath}" in init.sh (checked literal path, source path, and ancestor directories)`);
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
    if (!isCoveredByScript(initActive, source, installedPath)) {
      failures.push(`${source} → no coverage for "${installedPath}" in init.sh (checked literal path, source path, and ancestor directories)`);
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
    if (!isCoveredByScript(initActive, source, installedPath)) {
      failures.push(`${source} → no coverage for "${installedPath}" in init.sh (checked literal path, source path, and ancestor directories)`);
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
    if (!isCoveredByScript(upgradeActive, source, installedPath)) {
      failures.push(`${source} → no coverage for "${installedPath}" in upgrade.sh (checked literal path, source path, and ancestor directories)`);
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
    if (!isCoveredByScript(upgradeActive, source, installedPath)) {
      failures.push(`${source} → no coverage for "${installedPath}" in upgrade.sh (checked literal path, source path, and ancestor directories)`);
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
    if (!isCoveredByScript(upgradeActive, source, installedPath)) {
      failures.push(`${source} → no coverage for "${installedPath}" in upgrade.sh (checked literal path, source path, and ancestor directories)`);
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

// --- Mechanism-agnostic coverage tests (AC7 contract) ---

test('isCoveredByScript: literal installed path satisfies contract', () => {
  const script = 'cp "$SCRIPT_DIR/skills/tdd/SKILL.md" "$TARGET/.claude/skills/tdd/SKILL.md"';
  assert.ok(
    isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'),
    'Literal installed path must satisfy contract'
  );
});

test('isCoveredByScript: directory copy satisfies contract', () => {
  // A recursive cp -r to .claude/skills/ covers all skills
  const script = 'cp -r "$SCRIPT_DIR"/skills/* "$TARGET/.claude/skills/" 2>/dev/null || true';
  assert.ok(
    isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'),
    'Directory copy to .claude/skills/ must cover .claude/skills/tdd/SKILL.md'
  );
});

test('isCoveredByScript: loop over source files satisfies contract', () => {
  // A for-loop referencing the source path covers the file
  const script = 'for f in skills/*/SKILL.md; do cp "$f" ".claude/$f"; done';
  assert.ok(
    isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'),
    'Loop referencing skills/ ancestor must cover individual skill files'
  );
});

test('isCoveredByScript: manifest entry satisfies contract', () => {
  // A manifest array referencing the installed path covers the file
  const script = 'MANIFEST=(".claude/skills/tdd/SKILL.md" ".claude/commands/review.md")';
  assert.ok(
    isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'),
    'Manifest entry referencing installed path must satisfy contract'
  );
});

test('isCoveredByScript: helper function call satisfies contract', () => {
  // A helper function that installs the file covers it
  const script = 'install_file skills/tdd/SKILL.md .claude/skills/tdd/SKILL.md';
  assert.ok(
    isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'),
    'Helper function referencing source path must satisfy contract'
  );
});

test('isCoveredByScript: space-terminated ancestor directory copy satisfies contract', () => {
  // Regression: Claude review (2026-04-13) noted ancestor matching didn't cover
  // space-terminated paths like `cp -r skills .claude` (no trailing /).
  const script = 'cp -r skills .claude';
  assert.ok(
    isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'),
    'Space-terminated ancestor directory in a cp command must satisfy contract'
  );
});

test('isCoveredByScript: no reference means no coverage', () => {
  const script = 'echo "nothing related here"';
  assert.ok(
    !isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'),
    'Script with no relevant references must not pass coverage check'
  );
});

test('isCoveredByScript: echo/log mentioning source path does NOT satisfy contract', () => {
  // Regression: Codex review (2026-04-14) reproduced this with:
  //   echo "checking skills/tdd/SKILL.md exists" → returned true
  // Steps 1-2 now require copy-command context, same as steps 3-4.
  const script = 'echo "checking skills/tdd/SKILL.md exists"';
  assert.ok(
    !isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'),
    'echo/log lines mentioning source paths must not satisfy coverage — only copy commands count'
  );
});

test('isCoveredByScript: echo/log mentioning installed path does NOT satisfy contract', () => {
  const script = 'echo "verifying .claude/skills/tdd/SKILL.md"';
  assert.ok(
    !isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'),
    'echo/log lines mentioning installed paths must not satisfy coverage — only copy commands count'
  );
});

test('isCoveredByScript: echo/log mentioning ancestor directory does NOT satisfy contract', () => {
  // Regression: ancestor directory in an echo line must not be accepted as coverage
  const script = 'echo "Installing to .claude/skills/ directory"';
  assert.ok(
    !isCoveredByScript(script, 'skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'),
    'echo/log lines mentioning ancestor directories must not satisfy coverage — only copy commands count'
  );
});
