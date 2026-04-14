/**
 * E2E tests for implement-known-risks feature (RED state)
 *
 * Derived from: docs/features/implement-known-risks/prd.md + architecture.md
 *
 * These tests verify the complete known_risks instruction chain end-to-end:
 *   handoff.json (known_risks field) → commands/implement.md (GREEN instruction)
 *   → skills/tdd/SKILL.md (checklist item) → byte-identical installed copies
 *
 * Wiring proof:
 *   If all E2E tests pass, the developer is told to read known_risks during GREEN,
 *   the TDD skill reinforces the check, the instruction gracefully handles empty/missing
 *   risks, and source/installed copies are in sync. The pre-existing malformed-JSON
 *   guard (resolve-feature.js) prevents the developer from reaching GREEN with a
 *   broken handoff.
 *
 * Cases covered:
 *   Happy:   Full chain from handoff.known_risks → implement command → TDD skill works
 *   Edge:    Empty known_risks requires no action; files stay within size budget
 *   Misuse:  Malformed handoff halts before GREEN (pre-existing guard)
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

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

// ---------------------------------------------------------------------------
// E2E Chain 1: implement command GREEN section → known_risks instruction complete
// ---------------------------------------------------------------------------

test('E2E chain: commands/implement.md GREEN section has complete known_risks instruction', () => {
  const implement = read('commands/implement.md');

  // Section exists
  const greenSection = implement.match(/Step 2 GREEN[\s\S]*?(?=Step 3 REFACTOR|$)/);
  assert.ok(greenSection, 'commands/implement.md must have a "Step 2 GREEN" section');

  // known_risks instruction present
  assert.match(greenSection[0], /known_risks/, 'GREEN section must reference known_risks');

  // References handoff.json as source
  assert.match(greenSection[0], /handoff\.json/, 'Instruction must reference handoff.json');

  // Address-or-defer guidance
  assert.match(greenSection[0], /address|defer/i, 'Instruction must include address/defer guidance');

  // Handles empty/missing gracefully
  assert.match(
    greenSection[0],
    /if present|if.*known_risks|when present|empty|no action|skip/i,
    'Instruction must handle empty/missing known_risks gracefully'
  );
});

// ---------------------------------------------------------------------------
// E2E Chain 2: TDD skill → known_risks checklist item in GREEN context
// ---------------------------------------------------------------------------

test('E2E chain: skills/tdd/SKILL.md has known_risks in GREEN-scoped context with address/defer/rationale and stays within budget', () => {
  const tdd = read('skills/tdd/SKILL.md');

  // known_risks present
  assert.match(tdd, /known_risks/, 'TDD skill must reference known_risks');

  // GREEN-scoped: must appear between GREEN and REFACTOR in TDD Cycle,
  // or in Top Rules explicitly tied to GREEN
  const tddCycleSection = tdd.match(/## TDD Cycle[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(tddCycleSection, 'TDD Cycle section must exist');
  const greenToRefactor = tddCycleSection[0].match(/GREEN[\s\S]*?(?=REFACTOR|$)/);
  const greenScopeHasRisk = greenToRefactor && /known_risks/.test(greenToRefactor[0]);
  const topRulesSection = tdd.match(/## Top Rules[\s\S]*?(?=\n## [^#]|$)/);
  const topRuleGreenScoped = topRulesSection
    && /known_risks/.test(topRulesSection[0])
    && /GREEN/i.test(topRulesSection[0]);
  assert.ok(
    greenScopeHasRisk || topRuleGreenScoped,
    'known_risks must be in GREEN-scoped context (not just anywhere in TDD Cycle or Top Rules)'
  );

  // Address/defer + rationale semantics
  const knownRisksLines = tdd.split('\n').filter(l => /known_risks/.test(l)).join(' ');
  assert.match(knownRisksLines, /address|defer/i, 'Must include address-or-defer language');
  assert.match(
    knownRisksLines,
    /rationale|reason|why|justif/i,
    'Must require rationale for deferral (not just "address or defer")'
  );

  // Budget maintained
  const lineCount = tdd.trimEnd().split('\n').length;
  assert.ok(lineCount <= 120, `TDD skill has ${lineCount} lines — must stay ≤120`);
});

// ---------------------------------------------------------------------------
// E2E Chain 3: Source/installed sync — no drift after edits
// ---------------------------------------------------------------------------

test('E2E sync: commands/implement.md source and installed are byte-identical', () => {
  const sourcePath = 'commands/implement.md';
  const installedPath = '.claude/commands/implement.md';

  if (!exists(installedPath)) {
    assert.fail(`.claude/commands/implement.md does not exist — run init.sh to install commands`);
  }

  assert.equal(
    read(sourcePath),
    read(installedPath),
    'commands/implement.md source and installed copy must be byte-identical'
  );
});

test('E2E sync: skills/tdd/SKILL.md source and installed are byte-identical', () => {
  const sourcePath = 'skills/tdd/SKILL.md';
  const installedPath = '.claude/skills/tdd/SKILL.md';

  if (!exists(installedPath)) {
    assert.fail(`.claude/skills/tdd/SKILL.md does not exist — run init.sh to install skills`);
  }

  assert.equal(
    read(sourcePath),
    read(installedPath),
    'skills/tdd/SKILL.md source and installed copy must be byte-identical'
  );
});

// ---------------------------------------------------------------------------
// E2E Chain 4: Pre-existing guard chain (AC5 end-to-end)
// ---------------------------------------------------------------------------

test('E2E guard chain: resolve-feature.js halts on malformed handoff before developer reaches GREEN', () => {
  // Behavioral test: exercise the actual entry point with malformed JSON
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ikr-e2e-'));
  const claudeDir = path.join(tmpDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, 'handoff.json'), '{ NOT VALID JSON');

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

  // Guard must halt (non-zero exit) with visible error
  assert.notEqual(result.exitCode, 0, 'resolve-feature.js must exit non-zero on malformed handoff');
  assert.match(
    result.stderr + result.stdout,
    /error|invalid|malformed|parse|handoff/i,
    'resolve-feature.js must produce visible error on malformed handoff'
  );

  // commands/implement.md must invoke resolve-feature.js before GREEN
  const implement = read('commands/implement.md');
  assert.match(implement, /resolve-feature/, 'commands/implement.md must invoke resolve-feature.js');
  const resolveIdx = implement.indexOf('resolve-feature');
  const greenIdx = implement.indexOf('Step 2 GREEN');
  assert.ok(resolveIdx < greenIdx, 'resolve-feature.js must be invoked before the GREEN section');
});

// ---------------------------------------------------------------------------
// E2E Empty state: no known_risks in handoff → developer proceeds normally
// ---------------------------------------------------------------------------

test('E2E empty state: implement command known_risks instruction does not block when risks are absent', () => {
  const implement = read('commands/implement.md');
  const greenSection = implement.match(/Step 2 GREEN[\s\S]*?(?=Step 3 REFACTOR|$)/);
  assert.ok(greenSection, 'GREEN section must exist');

  // Must NOT have unconditional mandatory language without a conditional qualifier
  // The instruction should be conditional (if present, when available, etc.)
  assert.match(
    greenSection[0],
    /if present|if.*known_risks|when present|when available/i,
    'known_risks instruction must be conditional to avoid blocking when risks are absent'
  );
});

// ---------------------------------------------------------------------------
// E2E Regression: no skipped tests in implement-known-risks test suite
// ---------------------------------------------------------------------------

test('E2E regression: no skipped tests in implement-known-risks test suite', () => {
  const contractTest = read('tests/contracts/implement-known-risks.test.js');
  const integrationTest = read('tests/integration/implement-known-risks.integration.test.js');
  const e2eTest = read('tests/e2e/implement-known-risks.spec.js');

  const combined = contractTest + integrationTest + e2eTest;
  // Build pattern dynamically so this source file does not self-match
  const SKIP_PATTERN = new RegExp(['\\.s' + 'kip\\s*\\(', '\\bxte' + 'st\\s*\\(', '\\bxi' + 't\\s*\\('].join('|'));
  assert.equal(
    SKIP_PATTERN.test(combined),
    false,
    'implement-known-risks test suite must have no skipped tests'
  );
});

// ---------------------------------------------------------------------------
// E2E Regression: all required files exist
// ---------------------------------------------------------------------------

test('E2E regression: all required files for implement-known-risks feature exist', () => {
  const requiredFiles = [
    'commands/implement.md',
    '.claude/commands/implement.md',
    'skills/tdd/SKILL.md',
    '.claude/skills/tdd/SKILL.md',
    'hooks/resolve-feature.js',
    'docs/features/implement-known-risks/prd.md',
    'docs/features/implement-known-risks/architecture.md',
  ];

  const missing = requiredFiles.filter(f => !exists(f));
  assert.equal(
    missing.length,
    0,
    `Required files are missing: ${missing.join(', ')}`
  );
});
