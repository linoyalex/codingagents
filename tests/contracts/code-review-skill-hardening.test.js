/**
 * Contract tests for code-review-skill-hardening feature (RED state)
 *
 * Derived from: docs/features/code-review-skill-hardening/prd.md + architecture.md
 * Ticket: ISS-039
 *
 * Primary production-wiring test seam:
 *   The combination of AC5 (structural anchors in tests) + AC1-AC4 (methodology sections
 *   in skill + sibling references) + AC6 (symmetric gate enforcement in command) proves
 *   the review skill hardening is wired end-to-end: SKILL.md → sibling references →
 *   commands/review.md → commands/security-gate.md.
 *   Wiring proof: SKILL.md references sibling files for detailed procedures; commands/review.md
 *   has symmetric gate enforcement section; contract tests verify structural anchors survive
 *   rewording.
 *
 * Cases covered:
 *   Happy:   All methodology sections present with correct anchors and links
 *   Edge:    Skill stays within progressive disclosure budget (≤120 prose lines)
 *   Misuse:  Sibling reference files missing → tests catch drift; phrase-binding avoided
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

/**
 * Read a file, asserting it exists first so RED fails with an assertion error
 * (not ENOENT) when the implementation hasn't been created yet.
 */
function readOrFail(relativePath) {
  assert.ok(
    exists(relativePath),
    `${relativePath} must exist before reading its content`
  );
  return read(relativePath);
}

// ---------------------------------------------------------------------------
// AC1: Schema Impact Check — SKILL.md has heading/label + link to impact-analysis.md
// ---------------------------------------------------------------------------

test('AC1: skills/code-review/SKILL.md contains a schema impact tracing heading or label', () => {
  const skill = read('skills/code-review/SKILL.md');
  assert.match(
    skill,
    /impact|schema.*trac/i,
    'skills/code-review/SKILL.md must contain a heading or label for schema impact tracing (AC1)'
  );
});

test('AC1: skills/code-review/SKILL.md links to impact-analysis.md sibling reference', () => {
  const skill = read('skills/code-review/SKILL.md');
  assert.match(
    skill,
    /impact-analysis\.md/,
    'skills/code-review/SKILL.md must link to impact-analysis.md for schema impact tracing details'
  );
});

test('AC1: skills/code-review/impact-analysis.md sibling reference file exists', () => {
  assert.ok(
    exists('skills/code-review/impact-analysis.md'),
    'skills/code-review/impact-analysis.md must exist as a sibling reference for AC1'
  );
});

test('AC1: impact-analysis.md has Schema Impact Tracing heading', () => {
  const content = readOrFail('skills/code-review/impact-analysis.md');
  assert.match(
    content,
    /^## Schema Impact Tracing$/m,
    'impact-analysis.md must have a "## Schema Impact Tracing" heading'
  );
});

test('AC1: impact-analysis.md instructs grepping for producers and consumers of changed schema', () => {
  const content = readOrFail('skills/code-review/impact-analysis.md');
  assert.match(
    content,
    /producer|consumer|grep/i,
    'impact-analysis.md must instruct verifying all producers and consumers handle the schema change'
  );
});

// ---------------------------------------------------------------------------
// AC2: Source/Installed Drift Check — heading in SKILL.md or linked file
// ---------------------------------------------------------------------------

test('AC2: skills/code-review/SKILL.md or linked file contains a drift check heading', () => {
  const skill = read('skills/code-review/SKILL.md');
  // Check SKILL.md itself or look for the link to automated-checks.md
  const hasDriftHeading = /drift.*check|source.*installed/i.test(skill);
  const linksToAutomatedChecks = /automated-checks\.md/.test(skill);
  assert.ok(
    hasDriftHeading || linksToAutomatedChecks,
    'skills/code-review/SKILL.md must have a drift check heading or link to automated-checks.md (AC2)'
  );
});

test('AC2: skills/code-review/automated-checks.md sibling reference file exists', () => {
  assert.ok(
    exists('skills/code-review/automated-checks.md'),
    'skills/code-review/automated-checks.md must exist as a sibling reference for AC2/AC3'
  );
});

test('AC2: automated-checks.md has Source/Installed Drift Check heading', () => {
  const content = readOrFail('skills/code-review/automated-checks.md');
  assert.match(
    content,
    /^## Source\/Installed Drift Check$/m,
    'automated-checks.md must have a "## Source/Installed Drift Check" heading'
  );
});

test('AC2: automated-checks.md drift check maps commands/, skills/, hooks/ to installed paths', () => {
  const content = readOrFail('skills/code-review/automated-checks.md');
  assert.match(
    content,
    /commands\/|skills\/|hooks\//i,
    'automated-checks.md drift check must reference commands/, skills/, or hooks/ path mapping'
  );
  assert.match(
    content,
    /\.claude\//i,
    'automated-checks.md drift check must reference the installed .claude/ path'
  );
});

test('AC2: automated-checks.md drift check includes empty state (no installable paths)', () => {
  const content = readOrFail('skills/code-review/automated-checks.md');
  assert.match(
    content,
    /skip|no.*touch|empty/i,
    'automated-checks.md must document empty state: skip when no touched files map to installable paths'
  );
});

// ---------------------------------------------------------------------------
// AC3: Run Existing Tests — heading in SKILL.md or linked file
// ---------------------------------------------------------------------------

test('AC3: skills/code-review/SKILL.md or linked file contains a test suite execution heading', () => {
  const skill = read('skills/code-review/SKILL.md');
  const hasTestHeading = /test.*suite.*execution/i.test(skill);
  const linksToAutomatedChecks = /automated-checks\.md/.test(skill);
  assert.ok(
    hasTestHeading || linksToAutomatedChecks,
    'skills/code-review/SKILL.md must have a test suite execution heading or link to automated-checks.md (AC3)'
  );
});

test('AC3: automated-checks.md has Test Suite Execution heading', () => {
  const content = readOrFail('skills/code-review/automated-checks.md');
  assert.match(
    content,
    /^## Test Suite Execution$/m,
    'automated-checks.md must have a "## Test Suite Execution" heading'
  );
});

test('AC3: automated-checks.md test suite step determines test command from project config', () => {
  const content = readOrFail('skills/code-review/automated-checks.md');
  assert.match(
    content,
    /CLAUDE\.md|package\.json|equivalent/i,
    'automated-checks.md must instruct determining test command from CLAUDE.md, package.json, or equivalent'
  );
});

test('AC3: automated-checks.md test suite step handles empty state (no test command found)', () => {
  const content = readOrFail('skills/code-review/automated-checks.md');
  assert.match(
    content,
    /finding|note.*gap|not.*silent/i,
    'automated-checks.md must note missing test command as a finding, not a silent skip'
  );
});

test('AC3: automated-checks.md test suite step handles nondeterministic failures', () => {
  const content = readOrFail('skills/code-review/automated-checks.md');
  assert.match(
    content,
    /flaky|nondeterministic|re.?run/i,
    'automated-checks.md must handle flaky/nondeterministic test failures'
  );
});

// ---------------------------------------------------------------------------
// AC4: Reproduction Requirement — heading in SKILL.md + sibling reference
// ---------------------------------------------------------------------------

test('AC4: skills/code-review/SKILL.md contains a reproduction requirement heading or label', () => {
  const skill = read('skills/code-review/SKILL.md');
  assert.match(
    skill,
    /reproduction.*requirement/i,
    'skills/code-review/SKILL.md must contain a heading or label for reproduction requirement (AC4)'
  );
});

test('AC4: skills/code-review/SKILL.md links to reproduction.md sibling reference', () => {
  const skill = read('skills/code-review/SKILL.md');
  assert.match(
    skill,
    /reproduction\.md/,
    'skills/code-review/SKILL.md must link to reproduction.md for detailed reproduction rules'
  );
});

test('AC4: skills/code-review/reproduction.md sibling reference file exists', () => {
  assert.ok(
    exists('skills/code-review/reproduction.md'),
    'skills/code-review/reproduction.md must exist as a sibling reference for AC4'
  );
});

test('AC4: reproduction.md has Reproduction Requirement heading', () => {
  const content = readOrFail('skills/code-review/reproduction.md');
  assert.match(
    content,
    /^## Reproduction Requirement$/m,
    'reproduction.md must have a "## Reproduction Requirement" heading'
  );
});

test('AC4: reproduction.md requires reproducing BLOCKING/HIGH findings with actual commands', () => {
  const content = readOrFail('skills/code-review/reproduction.md');
  assert.match(
    content,
    /BLOCKING|HIGH/i,
    'reproduction.md must reference BLOCKING or HIGH severity findings'
  );
  assert.match(
    content,
    /actual commands|reproduce/i,
    'reproduction.md must require reproduction with actual commands'
  );
});

test('AC4: reproduction.md marks unverified findings when reproduction not possible', () => {
  const content = readOrFail('skills/code-review/reproduction.md');
  assert.match(
    content,
    /unverified/i,
    'reproduction.md must define "unverified" marking for findings that cannot be reproduced'
  );
});

test('AC4: reproduction.md prohibits BLOCKING severity for unverified findings without escalation', () => {
  const content = readOrFail('skills/code-review/reproduction.md');
  assert.match(
    content,
    /escalat/i,
    'reproduction.md must require escalation before assigning BLOCKING to unverified findings'
  );
});

test('AC4: reproduction.md handles nondeterministic reproduction', () => {
  const content = readOrFail('skills/code-review/reproduction.md');
  assert.match(
    content,
    /nondeterministic/i,
    'reproduction.md must handle nondeterministic reproduction (downgrade from BLOCKING)'
  );
});

// ---------------------------------------------------------------------------
// AC5: Regression Test (Meta) — all structural anchors present
// ---------------------------------------------------------------------------

test('AC5: all structural anchors for AC1-AC4 and AC6 are present in SKILL.md (meta regression)', () => {
  const skill = read('skills/code-review/SKILL.md');

  // AC1: schema impact tracing
  assert.match(skill, /impact|schema.*trac/i, 'AC1 anchor missing: schema impact tracing');

  // AC2: drift check (in SKILL.md or via link)
  const hasDrift = /drift.*check|source.*installed/i.test(skill) || /automated-checks\.md/.test(skill);
  assert.ok(hasDrift, 'AC2 anchor missing: drift check heading or link to automated-checks.md');

  // AC3: test suite execution (in SKILL.md or via link)
  const hasTest = /test.*suite.*execution/i.test(skill) || /automated-checks\.md/.test(skill);
  assert.ok(hasTest, 'AC3 anchor missing: test suite execution heading or link to automated-checks.md');

  // AC4: reproduction requirement
  assert.match(skill, /reproduction.*requirement/i, 'AC4 anchor missing: reproduction requirement');

  // AC6: symmetric gate enforcement
  assert.match(skill, /symmetric.*gate|gate.*enforcement/i, 'AC6 anchor missing: symmetric gate enforcement');
});

// ---------------------------------------------------------------------------
// AC6: Symmetric Gate Enforcement — SKILL.md + commands/review.md
// ---------------------------------------------------------------------------

test('AC6: skills/code-review/SKILL.md contains a symmetric gate enforcement heading or label', () => {
  const skill = read('skills/code-review/SKILL.md');
  assert.match(
    skill,
    /symmetric.*gate|gate.*enforcement/i,
    'skills/code-review/SKILL.md must contain a heading or label for symmetric gate enforcement (AC6)'
  );
});

test('AC6: symmetric gate instruction references both review.md and security-gate.md', () => {
  const skill = read('skills/code-review/SKILL.md');
  assert.match(
    skill,
    /review\.md/,
    'SKILL.md symmetric gate section must reference commands/review.md'
  );
  assert.match(
    skill,
    /security-gate\.md/,
    'SKILL.md symmetric gate section must reference commands/security-gate.md'
  );
});

test('AC6: commands/review.md contains a symmetric gate enforcement heading', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /symmetric.*gate|gate.*enforcement/i,
    'commands/review.md must contain a heading matching symmetric gate or gate enforcement (AC6)'
  );
});

test('AC6: commands/review.md symmetric gate section instructs checking both gate commands', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /security-gate\.md/,
    'commands/review.md symmetric gate section must reference commands/security-gate.md for cross-verification'
  );
});

// ---------------------------------------------------------------------------
// Drift Sync: Source files byte-equal installed copies
// ---------------------------------------------------------------------------

test('DRIFT SYNC: skills/code-review/SKILL.md source == installed .claude/skills/code-review/SKILL.md', () => {
  const sourcePath = 'skills/code-review/SKILL.md';
  const installedPath = '.claude/skills/code-review/SKILL.md';
  assert.ok(exists(installedPath), `${installedPath} must exist (run init.sh to install)`);
  const source = read(sourcePath);
  const installed = read(installedPath);
  assert.equal(source, installed, 'Source and installed SKILL.md must be byte-identical');
});

test('DRIFT SYNC: skills/code-review/impact-analysis.md source == installed copy', () => {
  const sourcePath = 'skills/code-review/impact-analysis.md';
  const installedPath = '.claude/skills/code-review/impact-analysis.md';
  assert.ok(exists(sourcePath), `${sourcePath} must exist`);
  assert.ok(exists(installedPath), `${installedPath} must exist (run init.sh to install)`);
  const source = read(sourcePath);
  const installed = read(installedPath);
  assert.equal(source, installed, 'Source and installed impact-analysis.md must be byte-identical');
});

test('DRIFT SYNC: skills/code-review/automated-checks.md source == installed copy', () => {
  const sourcePath = 'skills/code-review/automated-checks.md';
  const installedPath = '.claude/skills/code-review/automated-checks.md';
  assert.ok(exists(sourcePath), `${sourcePath} must exist`);
  assert.ok(exists(installedPath), `${installedPath} must exist (run init.sh to install)`);
  const source = read(sourcePath);
  const installed = read(installedPath);
  assert.equal(source, installed, 'Source and installed automated-checks.md must be byte-identical');
});

test('DRIFT SYNC: skills/code-review/reproduction.md source == installed copy', () => {
  const sourcePath = 'skills/code-review/reproduction.md';
  const installedPath = '.claude/skills/code-review/reproduction.md';
  assert.ok(exists(sourcePath), `${sourcePath} must exist`);
  assert.ok(exists(installedPath), `${installedPath} must exist (run init.sh to install)`);
  const source = read(sourcePath);
  const installed = read(installedPath);
  assert.equal(source, installed, 'Source and installed reproduction.md must be byte-identical');
});

// ---------------------------------------------------------------------------
// Wiring: commands/review.md Skill References table includes code-review
// ---------------------------------------------------------------------------

test('WIRING: commands/review.md Skill References table includes code-review skill path', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /code-review/,
    'commands/review.md must reference the code-review skill in its Skill References table'
  );
});

// ---------------------------------------------------------------------------
// Skill Size Budget: ≤120 prose lines for progressive disclosure
// ---------------------------------------------------------------------------

test('BUDGET: skills/code-review/SKILL.md stays within progressive disclosure budget (≤120 prose lines)', () => {
  const content = read('skills/code-review/SKILL.md');
  const lines = content.trimEnd().split('\n');
  // Count prose lines: exclude blank lines, frontmatter delimiters, headings, code fences, table rows, list markers that are templates
  let proseLines = 0;
  let inFrontmatter = false;
  let inCodeBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '---') {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (trimmed === '') continue;
    if (/^#+\s/.test(trimmed)) continue;
    if (/^\|/.test(trimmed)) continue;
    proseLines++;
  }
  assert.ok(
    proseLines <= 120,
    `skills/code-review/SKILL.md has ${proseLines} prose lines — exceeds 120-line progressive disclosure budget`
  );
});

// ---------------------------------------------------------------------------
// Error / Empty States (from PRD Reviewer Workflow States table)
// ---------------------------------------------------------------------------

test('ERROR STATE AC2: drift check handles unresolvable file mapping without blocking', () => {
  const content = readOrFail('skills/code-review/automated-checks.md');
  assert.match(
    content,
    /unresolvable|do not block|cannot map/i,
    'automated-checks.md must handle ambiguous drift-check mapping as unresolvable without blocking'
  );
});

test('ERROR STATE AC3: test suite handles command failure without blocking review', () => {
  const content = readOrFail('skills/code-review/automated-checks.md');
  assert.match(
    content,
    /fail.*start|missing dep|do not block/i,
    'automated-checks.md must handle test command startup failure without blocking review'
  );
});

test('ERROR STATE AC4: reproduction handles permission denied with escalation', () => {
  const content = readOrFail('skills/code-review/reproduction.md');
  assert.match(
    content,
    /permission|credential|environment constraint/i,
    'reproduction.md must handle permission denied / environment constraint scenarios'
  );
});

// ---------------------------------------------------------------------------
// Permission Boundary
// ---------------------------------------------------------------------------

test('PERMISSION BOUNDARY: reproduction commands are reviewer-authored, not from diff', () => {
  const content = readOrFail('skills/code-review/reproduction.md');
  // Trust boundary from architecture: reproduction commands must be reviewer-authored
  assert.match(
    content,
    /reviewer|inspect|not.*diff|actual command/i,
    'reproduction.md must indicate reproduction commands are reviewer-authored, not sourced from the diff'
  );
});
