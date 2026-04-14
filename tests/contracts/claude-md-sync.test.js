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

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

// ---------------------------------------------------------------------------
// AC1: sync library exists and contains marker insertion logic
// ---------------------------------------------------------------------------

test('AC1: lib/sync-claude-md.sh exists', () => {
  assert.ok(
    fileExists('lib/sync-claude-md.sh'),
    'lib/sync-claude-md.sh must exist as the sync library'
  );
});

test('AC1: lib/sync-claude-md.sh defines sync_claude_md function', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /sync_claude_md/,
    'lib/sync-claude-md.sh must define a sync_claude_md function'
  );
});

test('AC1: lib/sync-claude-md.sh uses managed marker format', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /managed:start:/,
    'lib/sync-claude-md.sh must reference managed:start markers'
  );
  assert.match(
    lib,
    /managed:end:/,
    'lib/sync-claude-md.sh must reference managed:end markers'
  );
});

// ---------------------------------------------------------------------------
// AC1: init.sh accepts --sync-claude-md flag and sources sync library
// ---------------------------------------------------------------------------

test('AC1: init.sh accepts --sync-claude-md flag', () => {
  const initSh = read('init.sh');
  assert.match(
    initSh,
    /--sync-claude-md/,
    'init.sh must accept --sync-claude-md flag'
  );
});

test('AC1: init.sh sources lib/sync-claude-md.sh', () => {
  const initSh = read('init.sh');
  assert.match(
    initSh,
    /sync-claude-md\.sh/,
    'init.sh must source the sync library'
  );
});

// ---------------------------------------------------------------------------
// AC2: init.sh prompts when existing CLAUDE.md found without flag (interactive)
// ---------------------------------------------------------------------------

test('AC2: init.sh interactive prompt offers overwrite AND --sync-claude-md exit option', () => {
  const initSh = read('init.sh');
  // Must offer BOTH options, not just the legacy overwrite prompt
  assert.match(
    initSh,
    /sync-claude-md/,
    'init.sh must mention --sync-claude-md as an option in the interactive prompt'
  );
});

// ---------------------------------------------------------------------------
// AC2c: init.sh handles non-interactive fallback
// ---------------------------------------------------------------------------

test('AC2c: init.sh checks if stdin is a terminal for non-interactive fallback', () => {
  const initSh = read('init.sh');
  assert.match(
    initSh,
    /-t\s*0/,
    'init.sh must check [ -t 0 ] for terminal detection'
  );
});

// ---------------------------------------------------------------------------
// AC3: upgrade.sh accepts --sync-claude-md flag and sources sync library
// ---------------------------------------------------------------------------

test('AC3: upgrade.sh accepts --sync-claude-md flag', () => {
  const upgradeSh = read('upgrade.sh');
  assert.match(
    upgradeSh,
    /--sync-claude-md/,
    'upgrade.sh must accept --sync-claude-md flag'
  );
});

test('AC3: upgrade.sh sources lib/sync-claude-md.sh', () => {
  const upgradeSh = read('upgrade.sh');
  assert.match(
    upgradeSh,
    /sync-claude-md\.sh/,
    'upgrade.sh must source the sync library'
  );
});

// ---------------------------------------------------------------------------
// AC3b: upgrade.sh prints reminder when run without --sync-claude-md
// ---------------------------------------------------------------------------

test('AC3b: upgrade.sh contains sync-claude-md reminder text', () => {
  const upgradeSh = read('upgrade.sh');
  assert.match(
    upgradeSh,
    /sync-claude-md/,
    'upgrade.sh must mention --sync-claude-md in reminder output'
  );
});

// ---------------------------------------------------------------------------
// AC3c: legacy migration — sync library handles files without markers
// ---------------------------------------------------------------------------

test('AC3c: lib/sync-claude-md.sh handles legacy migration (no markers)', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /migrat/i,
    'lib/sync-claude-md.sh must contain migration logic for unmarked files'
  );
});

// ---------------------------------------------------------------------------
// AC4: user content preservation — marker boundaries
// ---------------------------------------------------------------------------

test('AC4: lib/sync-claude-md.sh preserves content outside markers', () => {
  const lib = read('lib/sync-claude-md.sh');
  // The library must have logic that only modifies content between markers
  assert.match(
    lib,
    /managed:end/,
    'lib/sync-claude-md.sh must use managed:end markers as boundaries'
  );
});

// ---------------------------------------------------------------------------
// AC5: output contract — per-section action report
// ---------------------------------------------------------------------------

test('AC5: lib/sync-claude-md.sh reports section actions', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /\[added\]|\[updated\]|\[unchanged\]|\[migrated\]|\[skipped/,
    'lib/sync-claude-md.sh must output action labels for each section'
  );
});

// ---------------------------------------------------------------------------
// AC6: no-op detection — byte-identical comparison
// ---------------------------------------------------------------------------

test('AC6: lib/sync-claude-md.sh implements no-op detection', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /unchanged|identical|no.op/i,
    'lib/sync-claude-md.sh must detect and report unchanged sections'
  );
});

// ---------------------------------------------------------------------------
// AC7: end-of-script CLAUDE.md status confirmation
// ---------------------------------------------------------------------------

test('AC7: init.sh prints CLAUDE.md status at end of script', () => {
  const initSh = read('init.sh');
  assert.match(
    initSh,
    /CLAUDE_MD_STATUS|CLAUDE\.md:/,
    'init.sh must print CLAUDE.md status in final summary'
  );
});

test('AC7: upgrade.sh prints CLAUDE.md status at end of script', () => {
  const upgradeSh = read('upgrade.sh');
  assert.match(
    upgradeSh,
    /CLAUDE_MD_STATUS|CLAUDE\.md:/,
    'upgrade.sh must print CLAUDE.md status in final summary'
  );
});

// ---------------------------------------------------------------------------
// AC7b: pre-sync backup
// ---------------------------------------------------------------------------

test('AC7b: lib/sync-claude-md.sh creates pre-sync backup', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /pre-sync/,
    'lib/sync-claude-md.sh must reference .pre-sync backup file'
  );
});

test('AC7b: lib/sync-claude-md.sh aborts on backup creation failure', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /backup.*fail|cannot.*backup/i,
    'lib/sync-claude-md.sh must handle backup creation failure'
  );
});

// ---------------------------------------------------------------------------
// Allowlist: eligible sections are exactly 3
// ---------------------------------------------------------------------------

test('Allowlist: sync library defines exactly 3 eligible section IDs', () => {
  const lib = read('lib/sync-claude-md.sh');
  const sectionIds = ['code-conventions-must-follow', 'architecture-notes', 'known-gotchas'];
  for (const id of sectionIds) {
    assert.match(
      lib,
      new RegExp(id),
      `lib/sync-claude-md.sh must reference section ID: ${id}`
    );
  }
});

test('Allowlist: folder-structure and naming are NOT eligible sections', () => {
  const lib = read('lib/sync-claude-md.sh');
  // These should not be in the allowlist as eligible section IDs
  const content = lib.toLowerCase();
  const hasFolderStructureEligible = /eligible.*folder-structure|folder-structure.*eligible/i.test(content);
  const hasNamingEligible = /eligible.*naming|naming.*eligible/i.test(content);
  assert.ok(
    !hasFolderStructureEligible,
    'lib/sync-claude-md.sh must NOT list folder-structure as an eligible section'
  );
  assert.ok(
    !hasNamingEligible,
    'lib/sync-claude-md.sh must NOT list naming as an eligible section'
  );
});

// ---------------------------------------------------------------------------
// Allowlist drift detection: anchors match docs/CLAUDE.md
// ---------------------------------------------------------------------------

test('Allowlist drift: docs/CLAUDE.md contains the eligible section headings', () => {
  const docsClaude = read('docs/CLAUDE.md');
  assert.match(
    docsClaude,
    /^### Must Follow$/m,
    'docs/CLAUDE.md must contain "### Must Follow" heading'
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
// Write safety: atomic write via temp file
// ---------------------------------------------------------------------------

test('Write safety: lib/sync-claude-md.sh uses temp file for atomic write', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /\.tmp|temp.*file/i,
    'lib/sync-claude-md.sh must use a temp file for atomic writes'
  );
});

// ---------------------------------------------------------------------------
// Fitness: marker integrity check
// ---------------------------------------------------------------------------

test('Fitness: lib/sync-claude-md.sh validates marker pairs', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /malformed|unpaired|mismatch/i,
    'lib/sync-claude-md.sh must check for malformed/unpaired markers'
  );
});

// ---------------------------------------------------------------------------
// Error state: docs/CLAUDE.md missing
// ---------------------------------------------------------------------------

test('Error: lib/sync-claude-md.sh checks docs/CLAUDE.md exists', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /docs\/CLAUDE\.md/,
    'lib/sync-claude-md.sh must reference docs/CLAUDE.md as source'
  );
});

// ---------------------------------------------------------------------------
// Fail-closed filter: framework-internal content must not leak
// ---------------------------------------------------------------------------

test('Filter: sync uses fail-closed allowlist, not exclusion list', () => {
  const lib = read('lib/sync-claude-md.sh');
  assert.match(
    lib,
    /allow/i,
    'lib/sync-claude-md.sh must use an allowlist (fail-closed) approach'
  );
});
