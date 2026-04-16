/**
 * Contract tests for qa-test-quality feature (RED state)
 *
 * Derived from: docs/features/qa-test-quality/prd.md + architecture.md
 * Tickets: ISS-043, ISS-045, ISS-049
 *
 * Primary production-wiring test seam:
 *   commands/test-design.md (command) -> skills/tdd/SKILL.md (skill) ->
 *   skills/tdd/test-quality-rules.md (sibling reference).
 *   AC1+AC3 (symmetric testing in command) + AC2+AC3a (symmetric coverage in skill/sibling) +
 *   AC6+AC8 (adversarial contract in command) + AC7+AC8a (contract robustness in skill/sibling) +
 *   AC10+AC11+AC11a (artifact-type routing) + AC14/AC14a (sibling discoverability + size compliance)
 *   prove the test quality hardening is wired end-to-end.
 *
 * Cases covered:
 *   Happy:   All instruction sections present with correct structural anchors
 *   Edge:    Skill stays within progressive disclosure budget; sibling file discoverable
 *   Misuse:  Missing sibling file or broken reference link caught by AC14/AC14a
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
// AC1: Symmetric Testing instruction in commands/test-design.md
// Anchor: ### Symmetric Testing under ## Test Quality Rules
// ---------------------------------------------------------------------------

test('AC1: commands/test-design.md has a "## Test Quality Rules" section', () => {
  const content = read('commands/test-design.md');
  assert.match(
    content,
    /^## Test Quality Rules$/m,
    'commands/test-design.md must have a "## Test Quality Rules" heading'
  );
});

test('AC1: commands/test-design.md has a "### Symmetric Testing" subsection', () => {
  const content = read('commands/test-design.md');
  assert.match(
    content,
    /^### Symmetric Testing$/m,
    'commands/test-design.md must have a "### Symmetric Testing" heading under Test Quality Rules'
  );
});

test('AC1: symmetric testing instruction references enumerated components', () => {
  const content = read('commands/test-design.md');
  // Extract the Symmetric Testing section
  const section = content.match(/### Symmetric Testing[\s\S]*?(?=\n### |\n## |$)/);
  assert.ok(section, 'Symmetric Testing section must exist');
  // Semantic spot-check: heading anchor proves the section exists; this content
  // assertion verifies the section actually instructs testing ALL enumerated
  // components, not just that the heading is present.
  assert.match(
    section[0],
    /all.*enumerat|enumerat.*all/i,
    'Symmetric Testing section must instruct testing ALL enumerated components'
  );
});

// ---------------------------------------------------------------------------
// AC2: Symmetric requirements at position 8 in TDD skill "What to Test First"
// Anchor: [symmetric-coverage] label in SKILL.md
// ---------------------------------------------------------------------------

test('AC2: skills/tdd/SKILL.md contains [symmetric-coverage] label in What to Test First', () => {
  const content = read('skills/tdd/SKILL.md');
  assert.match(
    content,
    /\[symmetric-coverage\]/,
    'skills/tdd/SKILL.md must have a [symmetric-coverage] labeled entry in What to Test First'
  );
});

test('AC2: [symmetric-coverage] entry is at position 8 in the What to Test First list', () => {
  const content = read('skills/tdd/SKILL.md');
  // Extract lines in the What to Test First section that look like numbered list items
  const section = content.match(/## What to Test First[\s\S]*?(?=\n## |$)/);
  assert.ok(section, 'What to Test First section must exist in SKILL.md');
  const listItems = section[0].match(/^\d+\.\s+.+$/gm);
  assert.ok(listItems && listItems.length >= 8, 'What to Test First must have at least 8 entries');
  assert.match(
    listItems[7],
    /\[symmetric-coverage\]/,
    'Entry at position 8 must contain the [symmetric-coverage] label'
  );
});

// ---------------------------------------------------------------------------
// AC3: Contract test for command-side symmetric-testing (structural anchor)
// ---------------------------------------------------------------------------

test('AC3: commands/test-design.md symmetric testing section is under Test Quality Rules', () => {
  const content = read('commands/test-design.md');
  // Verify the structural hierarchy: ## Test Quality Rules must appear before ### Symmetric Testing
  const rulesIdx = content.indexOf('## Test Quality Rules');
  const symmetricIdx = content.indexOf('### Symmetric Testing');
  assert.ok(rulesIdx >= 0, '"## Test Quality Rules" must exist');
  assert.ok(symmetricIdx >= 0, '"### Symmetric Testing" must exist');
  assert.ok(
    symmetricIdx > rulesIdx,
    '"### Symmetric Testing" must be nested under "## Test Quality Rules"'
  );
});

// ---------------------------------------------------------------------------
// AC3a: Contract test for skill-side symmetric-testing (structural anchor)
// Anchor: ## Symmetric Coverage heading in test-quality-rules.md
// ---------------------------------------------------------------------------

test('AC3a: skills/tdd/test-quality-rules.md exists', () => {
  assert.ok(
    exists('skills/tdd/test-quality-rules.md'),
    'skills/tdd/test-quality-rules.md must exist as a sibling reference file'
  );
});

test('AC3a: skills/tdd/test-quality-rules.md has "## Symmetric Coverage" heading', () => {
  const content = readOrFail('skills/tdd/test-quality-rules.md');
  assert.match(
    content,
    /^## Symmetric Coverage$/m,
    'test-quality-rules.md must have a "## Symmetric Coverage" heading'
  );
});

// ---------------------------------------------------------------------------
// AC4: Behavioral Binding instruction in commands/test-design.md
// Anchor: ### Behavioral Binding under ## Test Quality Rules
// ---------------------------------------------------------------------------

test('AC4: commands/test-design.md has a "### Behavioral Binding" subsection', () => {
  const content = read('commands/test-design.md');
  assert.match(
    content,
    /^### Behavioral Binding$/m,
    'commands/test-design.md must have a "### Behavioral Binding" heading'
  );
});

test('AC4: behavioral binding section instructs binding to specific behavior', () => {
  const content = read('commands/test-design.md');
  const section = content.match(/### Behavioral Binding[\s\S]*?(?=\n### |\n## |$)/);
  assert.ok(section, 'Behavioral Binding section must exist');
  // Semantic spot-check: verifies the section discusses binding to behavior,
  // not just that the heading exists. Supplements the structural heading anchor.
  assert.match(
    section[0],
    /behavio(u?r|ral).*bind|bind.*behavio(u?r|ral)/i,
    'Behavioral Binding section must instruct tests to bind to specific behavior'
  );
});

// ---------------------------------------------------------------------------
// AC5: Negative-Pattern Testing instruction in commands/test-design.md
// Anchor: ### Negative-Pattern Testing under ## Test Quality Rules
// ---------------------------------------------------------------------------

test('AC5: commands/test-design.md has a "### Negative-Pattern Testing" subsection', () => {
  const content = read('commands/test-design.md');
  assert.match(
    content,
    /^### Negative-Pattern Testing$/m,
    'commands/test-design.md must have a "### Negative-Pattern Testing" heading'
  );
});

test('AC5: negative-pattern section instructs writing negative assertions for must-not properties', () => {
  const content = read('commands/test-design.md');
  const section = content.match(/### Negative-Pattern Testing[\s\S]*?(?=\n### |\n## |$)/);
  assert.ok(section, 'Negative-Pattern Testing section must exist');
  // Semantic spot-check: verifies the section discusses negative assertions or
  // forbidden patterns, not just that the heading exists.
  assert.match(
    section[0],
    /negative.*assert|must.*not|forbidden.*pattern/i,
    'Negative-Pattern Testing section must instruct writing negative assertions for forbidden patterns'
  );
});

// ---------------------------------------------------------------------------
// AC6: Adversarial Contract Testing instruction in commands/test-design.md
// Anchor: ### Adversarial Contract Testing under ## Test Quality Rules
// ---------------------------------------------------------------------------

test('AC6: commands/test-design.md has a "### Adversarial Contract Testing" subsection', () => {
  const content = read('commands/test-design.md');
  assert.match(
    content,
    /^### Adversarial Contract Testing$/m,
    'commands/test-design.md must have a "### Adversarial Contract Testing" heading'
  );
});

test('AC6: adversarial contract section instructs testing for trivial evasion', () => {
  const content = read('commands/test-design.md');
  const section = content.match(/### Adversarial Contract Testing[\s\S]*?(?=\n### |\n## |$)/);
  assert.ok(section, 'Adversarial Contract Testing section must exist');
  // Semantic spot-check: verifies the section discusses trivial evasion scenarios,
  // not just that the heading exists.
  assert.match(
    section[0],
    /trivial|evad|evasion|commented.out|escape.*hatch/i,
    'Adversarial Contract Testing section must instruct testing for trivial evasion (commented-out code, escape hatches)'
  );
});

// ---------------------------------------------------------------------------
// AC7: Contract robustness at position 9 in TDD skill "What to Test First"
// Anchor: [contract-robustness] label in SKILL.md
// ---------------------------------------------------------------------------

test('AC7: skills/tdd/SKILL.md contains [contract-robustness] label in What to Test First', () => {
  const content = read('skills/tdd/SKILL.md');
  assert.match(
    content,
    /\[contract-robustness\]/,
    'skills/tdd/SKILL.md must have a [contract-robustness] labeled entry in What to Test First'
  );
});

test('AC7: [contract-robustness] entry is at position 9 in the What to Test First list', () => {
  const content = read('skills/tdd/SKILL.md');
  const section = content.match(/## What to Test First[\s\S]*?(?=\n## |$)/);
  assert.ok(section, 'What to Test First section must exist in SKILL.md');
  const listItems = section[0].match(/^\d+\.\s+.+$/gm);
  assert.ok(listItems && listItems.length >= 9, 'What to Test First must have at least 9 entries');
  assert.match(
    listItems[8],
    /\[contract-robustness\]/,
    'Entry at position 9 must contain the [contract-robustness] label'
  );
});

// ---------------------------------------------------------------------------
// AC8: Contract test for command-side adversarial-contract (structural anchor)
// ---------------------------------------------------------------------------

test('AC8: commands/test-design.md adversarial contract section is under Test Quality Rules', () => {
  const content = read('commands/test-design.md');
  const rulesIdx = content.indexOf('## Test Quality Rules');
  const adversarialIdx = content.indexOf('### Adversarial Contract Testing');
  assert.ok(rulesIdx >= 0, '"## Test Quality Rules" must exist');
  assert.ok(adversarialIdx >= 0, '"### Adversarial Contract Testing" must exist');
  assert.ok(
    adversarialIdx > rulesIdx,
    '"### Adversarial Contract Testing" must be nested under "## Test Quality Rules"'
  );
});

// ---------------------------------------------------------------------------
// AC8a: Contract test for skill-side contract-robustness (structural anchor)
// Anchor: ## Contract Robustness heading in test-quality-rules.md
// ---------------------------------------------------------------------------

test('AC8a: skills/tdd/test-quality-rules.md has "## Contract Robustness" heading', () => {
  const content = readOrFail('skills/tdd/test-quality-rules.md');
  assert.match(
    content,
    /^## Contract Robustness$/m,
    'test-quality-rules.md must have a "## Contract Robustness" heading'
  );
});

// ---------------------------------------------------------------------------
// AC9: Structural vs fixture-driven guidance in test-quality-rules.md
// Anchor: ## Structural vs Fixture-Driven Testing heading
// ---------------------------------------------------------------------------

test('AC9: skills/tdd/test-quality-rules.md has "## Structural vs Fixture-Driven Testing" heading', () => {
  const content = readOrFail('skills/tdd/test-quality-rules.md');
  assert.match(
    content,
    /^## Structural vs Fixture-Driven Testing$/m,
    'test-quality-rules.md must have a "## Structural vs Fixture-Driven Testing" heading'
  );
});

test('AC9: structural vs fixture-driven section distinguishes declarative and executable artifacts', () => {
  const content = readOrFail('skills/tdd/test-quality-rules.md');
  const section = content.match(/## Structural vs Fixture-Driven Testing[\s\S]*?(?=\n## |$)/);
  assert.ok(section, 'Structural vs Fixture-Driven Testing section must exist');
  assert.match(
    section[0],
    /structural|declarative/i,
    'Section must reference structural/declarative checks'
  );
  assert.match(
    section[0],
    /fixture|behavioral|executable/i,
    'Section must reference fixture-driven/behavioral tests for executable artifacts'
  );
});

// ---------------------------------------------------------------------------
// AC10: 3-way artifact-type routing in commands/test-design.md
// Anchor: ### Artifact-Type Test Strategy under ## Test Quality Rules
// ---------------------------------------------------------------------------

test('AC10: commands/test-design.md has a "### Artifact-Type Test Strategy" subsection', () => {
  const content = read('commands/test-design.md');
  assert.match(
    content,
    /^### Artifact-Type Test Strategy$/m,
    'commands/test-design.md must have a "### Artifact-Type Test Strategy" heading'
  );
});

test('AC10: artifact-type strategy section includes 3-way routing (declarative, executable, config)', () => {
  const content = read('commands/test-design.md');
  const section = content.match(/### Artifact-Type Test Strategy[\s\S]*?(?=\n### |\n## |$)/);
  assert.ok(section, 'Artifact-Type Test Strategy section must exist');
  // Must reference all three categories
  assert.match(section[0], /declarative|markdown/i, 'Section must reference declarative/markdown artifacts');
  assert.match(section[0], /executable|shell.*script|JS.*module/i, 'Section must reference executable artifacts');
  assert.match(section[0], /config|schema|settings/i, 'Section must reference config artifacts');
});

test('AC10: artifact-type strategy section documents hybrid precedence rule', () => {
  const content = read('commands/test-design.md');
  const section = content.match(/### Artifact-Type Test Strategy[\s\S]*?(?=\n### |\n## |$)/);
  assert.ok(section, 'Artifact-Type Test Strategy section must exist');
  // Semantic spot-check: verifies the section discusses hybrid/precedence rules,
  // not just that the heading exists.
  assert.match(
    section[0],
    /hybrid|precedence/i,
    'Section must document hybrid artifact precedence rule'
  );
});

// ---------------------------------------------------------------------------
// AC11: Artifact-type-to-test-strategy table with 3+ categories
// Anchor: ## Artifact-Type Test Strategy heading + table in test-quality-rules.md
// ---------------------------------------------------------------------------

test('AC11: skills/tdd/test-quality-rules.md has "## Artifact-Type Test Strategy" heading', () => {
  const content = readOrFail('skills/tdd/test-quality-rules.md');
  assert.match(
    content,
    /^## Artifact-Type Test Strategy$/m,
    'test-quality-rules.md must have a "## Artifact-Type Test Strategy" heading'
  );
});

test('AC11: artifact-type section contains a table with at least 3 data rows', () => {
  const content = readOrFail('skills/tdd/test-quality-rules.md');
  const section = content.match(/## Artifact-Type Test Strategy[\s\S]*?(?=\n## |$)/);
  assert.ok(section, 'Artifact-Type Test Strategy section must exist');
  // Count table rows (lines starting with |, excluding header separator rows with ---)
  const tableRows = section[0].match(/^\|(?![-\s|]+$).+\|$/gm);
  assert.ok(tableRows, 'Section must contain a markdown table');
  // Subtract header row
  const dataRows = tableRows.filter(row => !/^\|\s*Artifact/i.test(row));
  assert.ok(
    dataRows.length >= 3,
    `Table must have at least 3 data rows (categories), found ${dataRows.length}`
  );
  // Each data row must have non-empty "Test approach" content (second column).
  // Use slice(1,-1) not filter(Boolean) — filter collapses empty cells,
  // making cells[1] point to the wrong column when a cell is blank.
  for (const row of dataRows) {
    const cells = row.split('|').slice(1, -1).map(c => c.trim());
    assert.ok(
      cells.length >= 2 && cells[1].length > 0,
      `Table data row must have non-empty Test approach column: ${row}`
    );
  }
});

// ---------------------------------------------------------------------------
// AC11a: Contract test for skill-side artifact-type routing (structural anchor)
// ---------------------------------------------------------------------------

test('AC11a: test-quality-rules.md artifact-type table references declarative, executable, and config categories', () => {
  const content = readOrFail('skills/tdd/test-quality-rules.md');
  const section = content.match(/## Artifact-Type Test Strategy[\s\S]*?(?=\n## |$)/);
  assert.ok(section, 'Artifact-Type Test Strategy section must exist');
  assert.match(section[0], /declarative|markdown/i, 'Table must include declarative/markdown category');
  assert.match(section[0], /executable|shell|script|module/i, 'Table must include executable category');
  assert.match(section[0], /config|schema|settings/i, 'Table must include config category');
});

// ---------------------------------------------------------------------------
// AC12: No regression in existing tests
// Two-tier check: (1) structural — no skip markers in feature tests,
// (2) runtime — pre-existing test suites still pass when executed.
// ---------------------------------------------------------------------------

test('AC12 (structural): no skipped tests in the qa-test-quality test files', () => {
  const testFiles = [
    'tests/contracts/qa-test-quality.test.js',
    'tests/integration/qa-test-quality.integration.test.js',
    'tests/e2e/qa-test-quality.spec.js',
  ];
  for (const filePath of testFiles) {
    if (exists(filePath)) {
      const lines = read(filePath).split('\n');
      let inAC12Block = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip the AC12 test block itself to avoid self-matching
        if (/AC12/.test(line) && /test\(/.test(line)) { inAC12Block = true; continue; }
        if (inAC12Block && /^\}\);/.test(line.trim())) { inAC12Block = false; continue; }
        if (inAC12Block) continue;
        assert.ok(
          !/\.(skip)\s*\(/.test(line) && !/\bxit\s*\(/.test(line) && !/\bxtest\s*\(/.test(line),
          `${filePath}:${i + 1} contains a skipped test`
        );
      }
    }
  }
});

test('AC12 (runtime): pre-existing test suites still pass', () => {
  const { execFileSync } = require('node:child_process');

  // Dynamically discover all JS test files across the test directories.
  // This avoids hardcoding a subset — new test files are automatically covered.
  const testDirs = ['tests/node', 'tests/contracts', 'tests/integration', 'tests/e2e'];
  const allTestFiles = [];
  for (const dir of testDirs) {
    const absDir = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const file of fs.readdirSync(absDir)) {
      if (file.endsWith('.test.js') || file.endsWith('.spec.js')) {
        allTestFiles.push(path.join(dir, file));
      }
    }
  }

  // Exclude this feature's own test files (they're tested separately)
  // and known pre-existing failures unrelated to this feature.
  const excluded = new Set([
    'tests/contracts/qa-test-quality.test.js',
    'tests/integration/qa-test-quality.integration.test.js',
    'tests/e2e/qa-test-quality.spec.js',
    // Pre-existing failures (documented in Phase 6 review.md regression table):
    'tests/node/core-skill-contracts.test.js',       // prd-writing SKILL.md budget
    'tests/contracts/skill-size-convention.test.js',  // root/docs CLAUDE.md rule divergence
  ]);
  const preExisting = allTestFiles.filter(f => !excluded.has(f));

  assert.ok(
    preExisting.length > 0,
    'Must find at least one pre-existing test file to verify regression'
  );

  for (const testFile of preExisting) {
    const absPath = path.join(ROOT_DIR, testFile);
    try {
      // execFileSync avoids shell interpretation — safe with paths containing spaces.
      execFileSync('node', ['--test', absPath], {
        cwd: ROOT_DIR,
        timeout: 30000,
        stdio: 'pipe',
      });
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString().slice(0, 500) : err.message;
      assert.fail(`Pre-existing test regressed: ${testFile}\n${stderr}`);
    }
  }
});

// ---------------------------------------------------------------------------
// AC13: Stack-agnostic — at least 2 toolchain examples
// ---------------------------------------------------------------------------

test('AC13: test-quality-rules.md artifact-type section includes at least 2 distinct toolchain examples', () => {
  const content = readOrFail('skills/tdd/test-quality-rules.md');
  const section = content.match(/## Artifact-Type Test Strategy[\s\S]*?(?=\n## |$)/);
  assert.ok(section, 'Artifact-Type Test Strategy section must exist');
  // Check for at least 2 different toolchain mentions
  const toolchains = [];
  if (/node.*--test|npm\s+test/i.test(section[0])) toolchains.push('node');
  if (/pytest|python/i.test(section[0])) toolchains.push('python');
  if (/go\s+test/i.test(section[0])) toolchains.push('go');
  if (/jest/i.test(section[0])) toolchains.push('jest');
  if (/vitest/i.test(section[0])) toolchains.push('vitest');
  assert.ok(
    toolchains.length >= 2,
    `Section must include at least 2 distinct toolchain examples, found: ${toolchains.join(', ') || 'none'}`
  );
});

test('AC13: test-quality-rules.md includes "adapt to your stack" language', () => {
  const content = readOrFail('skills/tdd/test-quality-rules.md');
  assert.match(
    content,
    /adapt.*stack|your.*stack|stack.agnostic/i,
    'test-quality-rules.md must include "adapt to your stack" language for stack-agnosticism'
  );
});

// ---------------------------------------------------------------------------
// AC14: Sibling discoverability — [See reference:] link in SKILL.md
// ---------------------------------------------------------------------------

test('AC14: skills/tdd/SKILL.md contains a [See reference:] link to test-quality-rules.md', () => {
  const content = read('skills/tdd/SKILL.md');
  assert.match(
    content,
    /\[See reference:.*test-quality-rules\.md\]/,
    'SKILL.md must contain a [See reference: ...test-quality-rules.md] link'
  );
});

// ---------------------------------------------------------------------------
// AC14a: Skill size compliance (3-way composite)
// ---------------------------------------------------------------------------

test('AC14a: skill size compliance — sibling exists OR under budget OR exception documented', () => {
  const siblingExists = exists('skills/tdd/test-quality-rules.md');

  // Count prose lines in SKILL.md
  const skillContent = read('skills/tdd/SKILL.md');
  const lines = skillContent.trimEnd().split('\n');
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
  const underBudget = proseLines <= 120;

  // Check for exception in architecture doc
  const archExists = exists('docs/features/qa-test-quality/architecture.md');
  let hasException = false;
  if (archExists) {
    const arch = read('docs/features/qa-test-quality/architecture.md');
    hasException = /skill size exception/i.test(arch);
  }

  assert.ok(
    siblingExists || underBudget || hasException,
    `Skill size compliance failed: sibling exists=${siblingExists}, prose lines=${proseLines} (budget=120), exception=${hasException}. At least one must be true.`
  );
});

// ---------------------------------------------------------------------------
// Drift Sync: Source files byte-equal installed copies
// ---------------------------------------------------------------------------

test('DRIFT SYNC: skills/tdd/SKILL.md source == installed .claude/skills/tdd/SKILL.md', () => {
  assert.ok(exists('.claude/skills/tdd/SKILL.md'), '.claude/skills/tdd/SKILL.md must exist');
  const source = read('skills/tdd/SKILL.md');
  const installed = read('.claude/skills/tdd/SKILL.md');
  assert.equal(source, installed, 'Source and installed SKILL.md must be byte-identical');
});

test('DRIFT SYNC: skills/tdd/test-quality-rules.md source == installed copy', () => {
  const sourcePath = 'skills/tdd/test-quality-rules.md';
  const installedPath = '.claude/skills/tdd/test-quality-rules.md';
  assert.ok(exists(sourcePath), `${sourcePath} must exist`);
  assert.ok(exists(installedPath), `${installedPath} must exist (run init.sh to install)`);
  const source = read(sourcePath);
  const installed = read(installedPath);
  assert.equal(source, installed, 'Source and installed test-quality-rules.md must be byte-identical');
});

test('DRIFT SYNC: commands/test-design.md source == installed .claude/commands/test-design.md', () => {
  assert.ok(exists('.claude/commands/test-design.md'), '.claude/commands/test-design.md must exist');
  const source = read('commands/test-design.md');
  const installed = read('.claude/commands/test-design.md');
  assert.equal(source, installed, 'Source and installed test-design.md must be byte-identical');
});

// ---------------------------------------------------------------------------
// Error / Empty States
// ---------------------------------------------------------------------------

test('ERROR STATE: architecture enumerates zero components — symmetric testing should not apply', () => {
  const content = read('commands/test-design.md');
  const section = content.match(/### Symmetric Testing[\s\S]*?(?=\n### |\n## |$)/);
  assert.ok(section, 'Symmetric Testing section must exist');
  // The section must scope the rule to explicit enumeration in the architecture
  assert.match(
    section[0],
    /explicit|architecture.*enumerat/i,
    'Symmetric Testing must scope to explicitly enumerated components in architecture'
  );
});

// ---------------------------------------------------------------------------
// Permission Boundary
// ---------------------------------------------------------------------------

test('PERMISSION BOUNDARY: test-quality-rules.md does not instruct reading src/', () => {
  const content = readOrFail('skills/tdd/test-quality-rules.md');
  // The sibling reference must stay within methodology — not instruct reading implementation
  assert.doesNotMatch(
    content,
    /read.*src\/|import.*from.*src\//i,
    'test-quality-rules.md must not instruct agents to read src/ — it is methodology guidance only'
  );
});
