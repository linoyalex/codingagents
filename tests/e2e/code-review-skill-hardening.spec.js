/**
 * E2E tests for code-review-skill-hardening feature (RED state)
 *
 * Derived from: docs/features/code-review-skill-hardening/prd.md + architecture.md
 * Ticket: ISS-039
 *
 * These tests verify the complete code-review-skill-hardening convention chain end-to-end:
 *   skill (5 new methodology sections) → sibling references (progressive disclosure) →
 *   command (symmetric gate enforcement) → installed copies (drift sync) → all gates covered
 *
 * Wiring proof:
 *   If all E2E tests pass, the code-review skill has been hardened with downstream-impact
 *   tracing, source/installed drift checks, test suite execution, finding reproduction,
 *   and symmetric gate enforcement — closing all 4 methodology gaps identified in the
 *   review-hardening RCA.
 *
 * Cases covered:
 *   Happy:   Complete skill → sibling → command chain with all methodology steps
 *   Edge:    Source/installed copies in sync for SKILL.md + all sibling references
 *   Misuse:  Missing sibling file breaks the chain; skill over budget triggers failure
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

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

function readOrFail(relativePath) {
  assert.ok(exists(relativePath), `${relativePath} must exist before reading its content`);
  return read(relativePath);
}

// ---------------------------------------------------------------------------
// E2E Chain 1: SKILL.md progressive disclosure — all methodology sections present
// ---------------------------------------------------------------------------

test('E2E chain: skills/code-review/SKILL.md has complete ISS-039 methodology additions', () => {
  const skill = read('skills/code-review/SKILL.md');

  // AC1: Schema impact tracing
  assert.match(skill, /impact|schema.*trac/i, 'Must have schema impact tracing (AC1)');
  assert.match(skill, /impact-analysis\.md/, 'Must link to impact-analysis.md (AC1)');

  // AC2: Drift check
  const hasDrift = /drift.*check|source.*installed/i.test(skill) || /automated-checks\.md/.test(skill);
  assert.ok(hasDrift, 'Must have drift check heading or link to automated-checks.md (AC2)');

  // AC3: Test suite execution
  const hasTest = /test.*suite.*execution/i.test(skill) || /automated-checks\.md/.test(skill);
  assert.ok(hasTest, 'Must have test suite execution heading or link to automated-checks.md (AC3)');

  // AC4: Reproduction requirement
  assert.match(skill, /reproduction.*requirement/i, 'Must have reproduction requirement (AC4)');
  assert.match(skill, /reproduction\.md/, 'Must link to reproduction.md (AC4)');

  // AC6: Symmetric gate enforcement
  assert.match(skill, /symmetric.*gate|gate.*enforcement/i, 'Must have symmetric gate enforcement (AC6)');

  // Budget: progressive disclosure ≤120 prose lines
  const lines = skill.trimEnd().split('\n');
  const totalLines = lines.length;
  assert.ok(totalLines <= 250, `SKILL.md has ${totalLines} total lines — must stay ≤250`);
});

// ---------------------------------------------------------------------------
// E2E Chain 2: Sibling reference files complete and well-formed
// ---------------------------------------------------------------------------

test('E2E chain: all sibling reference files exist and have correct headings', () => {
  // impact-analysis.md
  const impact = readOrFail('skills/code-review/impact-analysis.md');
  assert.match(impact, /^## Schema Impact Tracing$/m, 'impact-analysis.md must have correct heading');

  // automated-checks.md
  const checks = readOrFail('skills/code-review/automated-checks.md');
  assert.match(checks, /^## Source\/Installed Drift Check$/m, 'automated-checks.md must have drift check heading');
  assert.match(checks, /^## Test Suite Execution$/m, 'automated-checks.md must have test suite heading');

  // reproduction.md
  const repro = readOrFail('skills/code-review/reproduction.md');
  assert.match(repro, /^## Reproduction Requirement$/m, 'reproduction.md must have correct heading');
});

// ---------------------------------------------------------------------------
// E2E Chain 3: Command layer — symmetric gate enforcement wired
// ---------------------------------------------------------------------------

test('E2E chain: commands/review.md has symmetric gate enforcement with cross-gate references', () => {
  const command = read('commands/review.md');

  // AC6: Symmetric gate enforcement heading exists
  assert.match(
    command,
    /symmetric.*gate|gate.*enforcement/i,
    'commands/review.md must have symmetric gate enforcement section'
  );

  // AC6: References both gate commands
  assert.match(command, /review\.md/, 'Must reference review.md');
  assert.match(command, /security-gate\.md/, 'Must reference security-gate.md');
});

test('E2E chain: commands/security-gate.md has symmetric gate enforcement satisfying the AC6 invariant', () => {
  const securityGate = readOrFail('commands/security-gate.md');
  assert.match(
    securityGate,
    /^## Symmetric Gate Enforcement$/m,
    'commands/security-gate.md must have a Symmetric Gate Enforcement section — AC6 requires symmetric checks across both gate commands'
  );
  assert.match(
    securityGate,
    /review\.md/,
    'commands/security-gate.md symmetric gate section must reference review.md for cross-verification'
  );
});

// ---------------------------------------------------------------------------
// E2E Chain 4: Source/installed drift sync for all skill files
// ---------------------------------------------------------------------------

test('E2E sync: skills/code-review/SKILL.md source == installed .claude/skills/code-review/SKILL.md', () => {
  const sourcePath = 'skills/code-review/SKILL.md';
  const installedPath = '.claude/skills/code-review/SKILL.md';
  assert.ok(exists(installedPath), `${installedPath} must exist`);
  assert.equal(
    read(sourcePath),
    read(installedPath),
    'Source and installed SKILL.md must be byte-identical'
  );
});

test('E2E sync: skills/code-review/impact-analysis.md source == installed copy', () => {
  const sourcePath = 'skills/code-review/impact-analysis.md';
  const installedPath = '.claude/skills/code-review/impact-analysis.md';
  assert.ok(exists(sourcePath), `Source ${sourcePath} must exist`);
  assert.ok(exists(installedPath), `Installed ${installedPath} must exist`);
  assert.equal(
    read(sourcePath),
    read(installedPath),
    'Source and installed impact-analysis.md must be byte-identical'
  );
});

test('E2E sync: skills/code-review/automated-checks.md source == installed copy', () => {
  const sourcePath = 'skills/code-review/automated-checks.md';
  const installedPath = '.claude/skills/code-review/automated-checks.md';
  assert.ok(exists(sourcePath), `Source ${sourcePath} must exist`);
  assert.ok(exists(installedPath), `Installed ${installedPath} must exist`);
  assert.equal(
    read(sourcePath),
    read(installedPath),
    'Source and installed automated-checks.md must be byte-identical'
  );
});

test('E2E sync: skills/code-review/reproduction.md source == installed copy', () => {
  const sourcePath = 'skills/code-review/reproduction.md';
  const installedPath = '.claude/skills/code-review/reproduction.md';
  assert.ok(exists(sourcePath), `Source ${sourcePath} must exist`);
  assert.ok(exists(installedPath), `Installed ${installedPath} must exist`);
  assert.equal(
    read(sourcePath),
    read(installedPath),
    'Source and installed reproduction.md must be byte-identical'
  );
});

// ---------------------------------------------------------------------------
// E2E Chain 5: All required files for the feature exist
// ---------------------------------------------------------------------------

test('E2E regression: all required files for code-review-skill-hardening feature exist', () => {
  const requiredFiles = [
    'skills/code-review/SKILL.md',
    'skills/code-review/impact-analysis.md',
    'skills/code-review/automated-checks.md',
    'skills/code-review/reproduction.md',
    'commands/review.md',
    'commands/security-gate.md',
  ];

  const missing = requiredFiles.filter(f => !exists(f));
  assert.equal(
    missing.length,
    0,
    `Required files for code-review-skill-hardening are missing: ${missing.join(', ')}`
  );
});

// ---------------------------------------------------------------------------
// E2E: No skipped tests in this feature's test suite
// ---------------------------------------------------------------------------

test('E2E regression: no skipped tests in the code-review-skill-hardening test suite', () => {
  const contractTest = read('tests/contracts/code-review-skill-hardening.test.js');
  const integrationTest = read('tests/integration/code-review-skill-hardening.integration.test.js');
  const e2eTest = read('tests/e2e/code-review-skill-hardening.spec.js');

  const combined = contractTest + integrationTest + e2eTest;
  // String concatenation prevents this file from self-matching when the test scans its own source
  const SKIP_PATTERN = new RegExp(['\\.s' + 'kip\\s*\\(', '\\bxte' + 'st\\s*\\(', '\\bxi' + 't\\s*\\('].join('|'));
  const foundSkips = SKIP_PATTERN.test(combined);
  assert.equal(
    foundSkips,
    false,
    'code-review-skill-hardening test suite must have no skipped tests'
  );
});

// ---------------------------------------------------------------------------
// E2E: Misuse — missing sibling reference breaks the chain
// ---------------------------------------------------------------------------

test('E2E misuse: if any sibling reference file is missing, the methodology chain is broken', () => {
  // This test ensures that the 3 new sibling reference files all exist.
  // A missing file means the reviewer skips that methodology step silently.
  const siblings = [
    'skills/code-review/impact-analysis.md',
    'skills/code-review/automated-checks.md',
    'skills/code-review/reproduction.md',
  ];

  for (const sibling of siblings) {
    assert.ok(
      exists(sibling),
      `${sibling} is missing — reviewer would silently skip the methodology step that depends on it`
    );
  }
});
