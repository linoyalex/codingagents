/**
 * E2E tests for claude-md-sync feature (RED state)
 *
 * Derived from: docs/features/claude-md-sync/prd.md + architecture.md
 * Ticket: ISS-008
 *
 * These tests verify the complete claude-md-sync convention chain end-to-end:
 *   lib/sync-claude-md.sh (library) → init.sh (wiring) → upgrade.sh (wiring)
 *   → docs/CLAUDE.md (source) → root CLAUDE.md template (target)
 *
 * Wiring proof:
 *   If all E2E tests pass, the sync library exists with proper structure,
 *   both scripts wire to it, the allowlist is consistent with docs/CLAUDE.md,
 *   and the marker format is correct across all components.
 *
 * Cases covered:
 *   Happy:   Full chain from library → scripts → source/target works
 *   Edge:    Allowlist anchors verified against live docs/CLAUDE.md (drift detection)
 *   Misuse:  Framework-internal sections are excluded from sync
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

// ---------------------------------------------------------------------------
// E2E: Full wiring chain — lib exists, both scripts source it
// ---------------------------------------------------------------------------

test('E2E: sync library and both scripts form a complete wiring chain', () => {
  // Step 1: Library exists
  assert.ok(
    fileExists('lib/sync-claude-md.sh'),
    'lib/sync-claude-md.sh must exist'
  );

  const lib = read('lib/sync-claude-md.sh');
  const initSh = read('init.sh');
  const upgradeSh = read('upgrade.sh');

  // Step 2: Both scripts reference the library
  assert.match(
    initSh,
    /sync-claude-md\.sh/,
    'init.sh must reference sync-claude-md.sh'
  );
  assert.match(
    upgradeSh,
    /sync-claude-md\.sh/,
    'upgrade.sh must reference sync-claude-md.sh'
  );

  // Step 3: Library defines the core function
  assert.match(
    lib,
    /sync_claude_md/,
    'lib/sync-claude-md.sh must define sync_claude_md'
  );

  // Step 4: Both scripts accept the --sync-claude-md flag
  assert.match(initSh, /--sync-claude-md/, 'init.sh must accept --sync-claude-md');
  assert.match(upgradeSh, /--sync-claude-md/, 'upgrade.sh must accept --sync-claude-md');
});

// ---------------------------------------------------------------------------
// E2E: Marker format consistency across library and docs
// ---------------------------------------------------------------------------

test('E2E: marker format is consistent between library and eligible section IDs', () => {
  const lib = read('lib/sync-claude-md.sh');

  const sectionIds = ['code-conventions-must-follow', 'architecture-notes', 'known-gotchas'];
  for (const id of sectionIds) {
    // Library must reference each section ID in marker format
    assert.match(
      lib,
      new RegExp(`managed:start:${id}|managed:end:${id}|${id}`),
      `lib/sync-claude-md.sh must reference section ID: ${id}`
    );
  }
});

// ---------------------------------------------------------------------------
// E2E: Allowlist drift detection — anchors match docs/CLAUDE.md
// ---------------------------------------------------------------------------

test('E2E: allowlist section headings exist in docs/CLAUDE.md', () => {
  const docsClaude = read('docs/CLAUDE.md');

  // All eligible section headings must exist in source
  assert.match(
    docsClaude,
    /^### Must Follow$/m,
    'docs/CLAUDE.md must contain "### Must Follow" heading for code-conventions-must-follow'
  );
  assert.match(
    docsClaude,
    /^## Architecture Notes$/m,
    'docs/CLAUDE.md must contain "## Architecture Notes" heading'
  );
  assert.match(
    docsClaude,
    /^## Known Gotchas$/m,
    'docs/CLAUDE.md must contain "## Known Gotchas" heading'
  );
});

// ---------------------------------------------------------------------------
// E2E: Root CLAUDE.md template has target section headings
// ---------------------------------------------------------------------------

test('E2E: root CLAUDE.md template contains target section headings', () => {
  const rootClaude = read('CLAUDE.md');

  assert.match(
    rootClaude,
    /^### Must Follow$/m,
    'Root CLAUDE.md must contain "### Must Follow" heading'
  );
  assert.match(
    rootClaude,
    /^## Architecture Notes$/m,
    'Root CLAUDE.md must contain "## Architecture Notes" heading'
  );
  assert.match(
    rootClaude,
    /^## Known Gotchas$/m,
    'Root CLAUDE.md must contain "## Known Gotchas" heading'
  );
});

// ---------------------------------------------------------------------------
// E2E: Framework-internal sections excluded from sync
// ---------------------------------------------------------------------------

test('E2E: framework-internal sections are not in the sync eligible set', () => {
  const lib = read('lib/sync-claude-md.sh');

  // These framework-only sections must NOT be eligible
  const excludedSections = [
    'what-this-repo-is',
    'file-ownership-boundaries',
    'cross-agent-session-context',
    'working-model',
  ];

  for (const section of excludedSections) {
    const hasEligible = new RegExp(`eligible.*${section}|${section}.*eligible`, 'i').test(lib);
    assert.ok(
      !hasEligible,
      `lib/sync-claude-md.sh must NOT list ${section} as eligible`
    );
  }
});

// ---------------------------------------------------------------------------
// E2E: init.sh non-interactive fallback uses terminal detection
// ---------------------------------------------------------------------------

test('E2E: init.sh implements terminal detection for non-interactive fallback', () => {
  const initSh = read('init.sh');
  assert.match(
    initSh,
    /-t\s*0/,
    'init.sh must check [ -t 0 ] for terminal detection'
  );
});

// ---------------------------------------------------------------------------
// E2E: upgrade.sh prints --sync-claude-md reminder when flag not used
// ---------------------------------------------------------------------------

test('E2E: upgrade.sh mentions sync-claude-md in output when flag not used', () => {
  const upgradeSh = read('upgrade.sh');
  assert.match(
    upgradeSh,
    /sync-claude-md/,
    'upgrade.sh must reference --sync-claude-md for reminder output'
  );
});

// ---------------------------------------------------------------------------
// E2E: Write safety — library uses temp file and backup
// ---------------------------------------------------------------------------

test('E2E: library implements write safety with temp file and backup', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /\.tmp/,
    'lib/sync-claude-md.sh must use .tmp temp file for atomic writes'
  );
  assert.match(
    lib,
    /pre-sync/,
    'lib/sync-claude-md.sh must reference .pre-sync backup'
  );
});

// ---------------------------------------------------------------------------
// E2E: Source/installed sync — lib/sync-claude-md.sh is the single source
// ---------------------------------------------------------------------------

test('E2E: lib/sync-claude-md.sh is the canonical sync implementation', () => {
  // init.sh and upgrade.sh must NOT contain inline sync logic
  const initSh = read('init.sh');
  const upgradeSh = read('upgrade.sh');

  // Neither script should define sync_claude_md inline
  const initDefinesSync = /^sync_claude_md\s*\(\)/m.test(initSh);
  const upgradeDefinesSync = /^sync_claude_md\s*\(\)/m.test(upgradeSh);

  assert.ok(
    !initDefinesSync,
    'init.sh must NOT define sync_claude_md inline — it must source the library'
  );
  assert.ok(
    !upgradeDefinesSync,
    'upgrade.sh must NOT define sync_claude_md inline — it must source the library'
  );
});
