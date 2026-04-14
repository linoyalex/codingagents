/**
 * Contract tests for implement-known-risks feature (RED state)
 *
 * Derived from: docs/features/implement-known-risks/prd.md + architecture.md
 *
 * Primary production-wiring test seam:
 *   The combination of AC1 (known_risks instruction in commands/implement.md GREEN
 *   section) + AC2 (known_risks checklist item in skills/tdd/SKILL.md) proves the
 *   developer is explicitly told to read and act on known_risks during Phase 5.
 *   Contract test (AC3) verifies both using structural anchors.
 *
 * Cases covered:
 *   Happy:   known_risks instruction present in GREEN section; checklist item in TDD skill
 *   Edge:    empty known_risks or missing handoff requires no developer action (AC4)
 *   Misuse:  malformed handoff.json halts before developer reaches GREEN (AC5)
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

// ---------------------------------------------------------------------------
// AC1: commands/implement.md GREEN section includes known_risks instruction
// ---------------------------------------------------------------------------

test('AC1: commands/implement.md GREEN section contains a known_risks read instruction', () => {
  const implement = read('commands/implement.md');
  // Structural anchor: find the GREEN step section, then check for known_risks
  const greenSection = implement.match(/Step 2 GREEN[\s\S]*?(?=Step 3 REFACTOR|$)/);
  assert.ok(greenSection, 'commands/implement.md must have a "Step 2 GREEN" section');
  assert.match(
    greenSection[0],
    /known_risks/,
    'The GREEN section of commands/implement.md must contain a known_risks instruction'
  );
});

test('AC1: known_risks instruction tells developer to read from handoff.json', () => {
  const implement = read('commands/implement.md');
  const greenSection = implement.match(/Step 2 GREEN[\s\S]*?(?=Step 3 REFACTOR|$)/);
  assert.ok(greenSection, 'commands/implement.md must have a "Step 2 GREEN" section');
  assert.match(
    greenSection[0],
    /handoff\.json/,
    'The known_risks instruction must reference handoff.json as the source'
  );
});

test('AC1: known_risks instruction includes address-or-defer guidance', () => {
  const implement = read('commands/implement.md');
  const greenSection = implement.match(/Step 2 GREEN[\s\S]*?(?=Step 3 REFACTOR|$)/);
  assert.ok(greenSection, 'commands/implement.md must have a "Step 2 GREEN" section');
  assert.match(
    greenSection[0],
    /address|defer/i,
    'The known_risks instruction must tell the developer to address or defer each risk'
  );
});

// ---------------------------------------------------------------------------
// AC2: skills/tdd/SKILL.md GREEN phase includes known_risks checklist item
// ---------------------------------------------------------------------------

test('AC2: one GREEN-scoped checklist item in TDD skill carries known_risks + address/defer + rationale', () => {
  const tdd = read('skills/tdd/SKILL.md');

  // Strategy: extract a single GREEN-scoped slice that must contain ALL three
  // semantics (known_risks, address/defer, rationale). This prevents false
  // positives from disconnected fragments satisfying different assertions.

  // Path A: TDD Cycle section, GREEN-to-REFACTOR block
  const tddCycleSection = tdd.match(/## TDD Cycle[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(tddCycleSection, 'skills/tdd/SKILL.md must have a "## TDD Cycle" section');
  const greenToRefactor = tddCycleSection[0].match(/GREEN[\s\S]*?(?=REFACTOR|$)/);

  // Path B: Top Rules bullet that contains both GREEN and known_risks on the
  // same bullet (contiguous lines starting from a "- " marker)
  const topRulesSection = tdd.match(/## Top Rules[\s\S]*?(?=\n## [^#]|$)/);
  let topRuleBullet = '';
  if (topRulesSection) {
    // Split into bullets (lines starting with "- "), keep continuation lines
    const bullets = topRulesSection[0].split(/\n(?=- )/).filter(b => b.startsWith('- '));
    topRuleBullet = bullets.find(b => /known_risks/.test(b) && /GREEN/i.test(b)) || '';
  }

  // Pick the slice that contains known_risks — exactly one path should match
  let slice = '';
  if (greenToRefactor && /known_risks/.test(greenToRefactor[0])) {
    slice = greenToRefactor[0];
  } else if (topRuleBullet) {
    slice = topRuleBullet;
  }

  // All three semantics must be present in the SAME slice
  assert.ok(slice.length > 0, 'known_risks must appear in a GREEN-scoped slice (GREEN→REFACTOR block or a Top Rules bullet tied to GREEN)');
  assert.match(slice, /known_risks/, 'The GREEN-scoped slice must contain known_risks');
  assert.match(slice, /address|defer/i, 'The same slice must include address-or-defer language');
  assert.match(slice, /rationale|reason|why|justif/i, 'The same slice must require rationale for deferral');
});

// ---------------------------------------------------------------------------
// AC3: Contract test verifies both anchors using structural matching
// (This test IS the AC3 — it proves the structural anchor pattern works)
// ---------------------------------------------------------------------------

test('AC3: both known_risks anchors are present — implement command AND tdd skill', () => {
  const implement = read('commands/implement.md');
  const tdd = read('skills/tdd/SKILL.md');

  // Structural anchor 1: commands/implement.md GREEN section + known_risks
  const greenSection = implement.match(/Step 2 GREEN[\s\S]*?(?=Step 3 REFACTOR|$)/);
  assert.ok(greenSection, 'commands/implement.md must have a GREEN section');
  assert.match(greenSection[0], /known_risks/, 'GREEN section must reference known_risks');

  // Structural anchor 2: skills/tdd/SKILL.md + known_risks
  assert.match(tdd, /known_risks/, 'TDD skill must reference known_risks');
});

// ---------------------------------------------------------------------------
// AC4: Empty known_risks or missing handoff requires no developer action
// ---------------------------------------------------------------------------

test('AC4: commands/implement.md known_risks instruction handles empty/missing known_risks gracefully', () => {
  const implement = read('commands/implement.md');
  // The instruction must not require action when known_risks is empty or absent
  // Structural anchor: look for conditional language (if present, when present, etc.)
  const greenSection = implement.match(/Step 2 GREEN[\s\S]*?(?=Step 3 REFACTOR|$)/);
  assert.ok(greenSection, 'commands/implement.md must have a GREEN section');
  assert.match(
    greenSection[0],
    /if present|if.*known_risks|when present|empty|no action|skip/i,
    'The known_risks instruction must indicate no action is needed when risks are empty or absent'
  );
});

test('AC4: resolve-feature.js succeeds when handoff.json is missing and explicit args are provided (missing-file branch)', () => {
  // Explicitly cover the "missing .claude/handoff.json file" branch from the PRD.
  // The developer must be able to proceed normally when the handoff file does not exist,
  // as long as explicit args are given. This is not just about wording — it exercises
  // the actual entry point with no handoff file present.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ikr-ac4-'));
  // Deliberately do NOT create .claude/handoff.json

  let result;
  try {
    result = {
      exitCode: 0,
      stdout: execSync(
        `node "${path.join(ROOT_DIR, 'hooks', 'resolve-feature.js')}" --command implement --phase 5 --args implement-known-risks`,
        { cwd: tmpDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ),
      stderr: '',
    };
  } catch (err) {
    result = { exitCode: err.status || 1, stdout: err.stdout || '', stderr: err.stderr || '' };
  }

  assert.equal(
    result.exitCode,
    0,
    `resolve-feature.js must succeed with explicit args when handoff.json is missing. stderr: ${result.stderr}`
  );
});

// ---------------------------------------------------------------------------
// AC5: Malformed handoff.json halts via existing resolve-feature.js error handling
// ---------------------------------------------------------------------------

test('AC5: resolve-feature.js halts with visible error on malformed handoff.json (behavioral)', () => {
  // Exercise the actual production entry point with a malformed fixture,
  // rather than checking source-code strings. This ensures the guard produces
  // visible halt behavior, not just that the code _contains_ the right tokens.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ikr-ac5-'));
  const claudeDir = path.join(tmpDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, 'handoff.json'), '{ INVALID JSON !!!');

  let result;
  try {
    result = {
      exitCode: 0,
      stdout: execSync(
        `node "${path.join(ROOT_DIR, 'hooks', 'resolve-feature.js')}" --command implement --phase 5 --args ""`,
        { cwd: tmpDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ),
      stderr: '',
    };
  } catch (err) {
    result = { exitCode: err.status || 1, stdout: err.stdout || '', stderr: err.stderr || '' };
  }

  assert.notEqual(result.exitCode, 0, 'resolve-feature.js must exit non-zero on malformed handoff.json');
  const output = result.stderr + result.stdout;
  assert.match(
    output,
    /error|invalid|malformed|parse|handoff/i,
    'resolve-feature.js must produce a visible error message when handoff.json is malformed'
  );
});

// ---------------------------------------------------------------------------
// Line budget: TDD skill must stay under 120 lines after the addition
// ---------------------------------------------------------------------------

test('BUDGET: skills/tdd/SKILL.md stays under 120 lines after known_risks addition', () => {
  const tdd = read('skills/tdd/SKILL.md');
  const lineCount = tdd.trimEnd().split('\n').length;
  assert.ok(
    lineCount <= 120,
    `skills/tdd/SKILL.md has ${lineCount} lines — must stay under 120-line budget`
  );
});

// ---------------------------------------------------------------------------
// Byte-identity: source and installed copies must match
// ---------------------------------------------------------------------------

test('SYNC: commands/implement.md source and installed copy are byte-identical', () => {
  const source = read('commands/implement.md');
  const installed = read('.claude/commands/implement.md');
  assert.equal(
    source,
    installed,
    'commands/implement.md and .claude/commands/implement.md must be byte-identical'
  );
});

test('SYNC: skills/tdd/SKILL.md source and installed copy are byte-identical', () => {
  const source = read('skills/tdd/SKILL.md');
  const installed = read('.claude/skills/tdd/SKILL.md');
  assert.equal(
    source,
    installed,
    'skills/tdd/SKILL.md and .claude/skills/tdd/SKILL.md must be byte-identical'
  );
});

// ---------------------------------------------------------------------------
// Permission boundary: known_risks is prose for human reading only
// ---------------------------------------------------------------------------

test('TRUST BOUNDARY: architecture documents known_risks as prose for human reading, not executable', () => {
  const arch = read('docs/features/implement-known-risks/architecture.md');
  assert.match(
    arch,
    /prose.*human|human.*reading|must not.*interpolat|must not.*shell/i,
    'Architecture must document that known_risks is prose for human reading, not for execution'
  );
});
