/**
 * E2E tests for qa-test-quality feature (RED state)
 *
 * Derived from: docs/features/qa-test-quality/prd.md + architecture.md
 * Tickets: ISS-043, ISS-045, ISS-049
 *
 * These tests verify the complete qa-test-quality convention chain end-to-end:
 *   command (5 new subsections under Test Quality Rules) ->
 *   skill (2 new What to Test First entries + [See reference:] link) ->
 *   sibling (4 methodology headings + artifact-type table) ->
 *   installed copies (drift sync)
 *
 * Wiring proof:
 *   If all E2E tests pass, the QA test quality guidance is wired end-to-end:
 *   commands/test-design.md instructs the QA agent with symmetric testing,
 *   behavioral binding, negative-pattern testing, adversarial contracts, and
 *   artifact-type routing; skills/tdd/SKILL.md adds What to Test First entries
 *   and links to test-quality-rules.md; the sibling file provides expanded
 *   guidance with the artifact-type table.
 *
 * Cases covered:
 *   Happy:   Complete command -> skill -> sibling chain with all content
 *   Edge:    Source/installed copies in sync; skill within budget
 *   Misuse:  Missing section or broken link breaks the chain
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
// E2E Chain 1: commands/test-design.md — all 5 new subsections under Test Quality Rules
// ---------------------------------------------------------------------------

test('E2E chain: commands/test-design.md has complete test quality rules additions', () => {
  const command = read('commands/test-design.md');

  // Parent section
  assert.match(command, /^## Test Quality Rules$/m, 'Must have "## Test Quality Rules" parent section');

  // All 5 subsections
  assert.match(command, /^### Symmetric Testing$/m, 'Must have Symmetric Testing (AC1)');
  assert.match(command, /^### Behavioral Binding$/m, 'Must have Behavioral Binding (AC4)');
  assert.match(command, /^### Negative-Pattern Testing$/m, 'Must have Negative-Pattern Testing (AC5)');
  assert.match(command, /^### Adversarial Contract Testing$/m, 'Must have Adversarial Contract Testing (AC6)');
  assert.match(command, /^### Artifact-Type Test Strategy$/m, 'Must have Artifact-Type Test Strategy (AC10)');

  // Verify subsection ordering matches architecture.md § Content Placement Rules,
  // which lists them as: AC1 Symmetric, AC4 Behavioral, AC5 Negative, AC6 Adversarial, AC10 Artifact-Type.
  // Source: docs/features/qa-test-quality/architecture.md "In commands/test-design.md" section.
  const symmetricIdx = command.indexOf('### Symmetric Testing');
  const behavioralIdx = command.indexOf('### Behavioral Binding');
  const negativeIdx = command.indexOf('### Negative-Pattern Testing');
  const adversarialIdx = command.indexOf('### Adversarial Contract Testing');
  const artifactIdx = command.indexOf('### Artifact-Type Test Strategy');

  assert.ok(symmetricIdx < behavioralIdx, 'Symmetric Testing must come before Behavioral Binding');
  assert.ok(behavioralIdx < negativeIdx, 'Behavioral Binding must come before Negative-Pattern Testing');
  assert.ok(negativeIdx < adversarialIdx, 'Negative-Pattern Testing must come before Adversarial Contract Testing');
  assert.ok(adversarialIdx < artifactIdx, 'Adversarial Contract Testing must come before Artifact-Type Test Strategy');
});

// ---------------------------------------------------------------------------
// E2E Chain 2: skills/tdd/SKILL.md — new entries + sibling link
// ---------------------------------------------------------------------------

test('E2E chain: skills/tdd/SKILL.md has complete ISS-043/045/049 additions', () => {
  const skill = read('skills/tdd/SKILL.md');

  // AC2: [symmetric-coverage] in What to Test First
  assert.match(skill, /\[symmetric-coverage\]/, 'Must have [symmetric-coverage] entry (AC2)');

  // AC7: [contract-robustness] in What to Test First
  assert.match(skill, /\[contract-robustness\]/, 'Must have [contract-robustness] entry (AC7)');

  // AC14: [See reference:] link to sibling
  assert.match(
    skill,
    /\[See reference:.*test-quality-rules\.md\]/,
    'Must have [See reference:] link to test-quality-rules.md (AC14)'
  );

  // Budget: progressive disclosure ≤250 total lines
  const totalLines = skill.trimEnd().split('\n').length;
  assert.ok(totalLines <= 250, `SKILL.md has ${totalLines} total lines — must stay ≤250`);
});

// ---------------------------------------------------------------------------
// E2E Chain 3: skills/tdd/test-quality-rules.md — all 4 methodology headings + table
// ---------------------------------------------------------------------------

test('E2E chain: skills/tdd/test-quality-rules.md has all methodology headings and table', () => {
  const sibling = readOrFail('skills/tdd/test-quality-rules.md');

  // 4 methodology headings
  assert.match(sibling, /^## Symmetric Coverage$/m, 'Must have "## Symmetric Coverage" (AC3a)');
  assert.match(sibling, /^## Contract Robustness$/m, 'Must have "## Contract Robustness" (AC8a)');
  assert.match(sibling, /^## Structural vs Fixture-Driven Testing$/m, 'Must have "## Structural vs Fixture-Driven Testing" (AC9)');
  assert.match(sibling, /^## Artifact-Type Test Strategy$/m, 'Must have "## Artifact-Type Test Strategy" (AC11)');

  // AC11: Table with 3+ data rows
  const section = sibling.match(/## Artifact-Type Test Strategy[\s\S]*?(?=\n## |$)/);
  assert.ok(section, 'Artifact-Type Test Strategy section must exist');
  const tableRows = section[0].match(/^\|(?![-\s|]+$).+\|$/gm);
  assert.ok(tableRows, 'Section must contain a markdown table');
  const dataRows = tableRows.filter(row => !/^\|\s*Artifact/i.test(row));
  assert.ok(dataRows.length >= 3, `Table must have >=3 data rows, found ${dataRows.length}`);
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

  // AC13: Stack-agnostic — at least 2 toolchains
  const toolchains = [];
  if (/node.*--test|npm\s+test/i.test(section[0])) toolchains.push('node');
  if (/pytest|python/i.test(section[0])) toolchains.push('python');
  if (/go\s+test/i.test(section[0])) toolchains.push('go');
  assert.ok(toolchains.length >= 2, `Must have >=2 toolchain examples, found: ${toolchains.join(', ')}`);
});

// ---------------------------------------------------------------------------
// E2E Chain 4: Drift sync — all 3 source/installed pairs
// ---------------------------------------------------------------------------

test('E2E sync: all source and installed copies are byte-identical', () => {
  const pairs = [
    ['skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'],
    ['skills/tdd/test-quality-rules.md', '.claude/skills/tdd/test-quality-rules.md'],
    ['commands/test-design.md', '.claude/commands/test-design.md'],
  ];

  for (const [source, installed] of pairs) {
    assert.ok(exists(source), `Source ${source} must exist`);
    assert.ok(exists(installed), `Installed ${installed} must exist`);
    const sourceContent = read(source);
    const installedContent = read(installed);
    assert.equal(
      sourceContent,
      installedContent,
      `${source} and ${installed} must be byte-identical`
    );
  }
});

// ---------------------------------------------------------------------------
// E2E Chain 5: Full convention chain — command -> skill -> sibling -> all ACs addressed
// ---------------------------------------------------------------------------

test('E2E full chain: all 3 quality gaps are addressed across command+skill+sibling', () => {
  const command = read('commands/test-design.md');
  const skill = read('skills/tdd/SKILL.md');
  const siblingExists = exists('skills/tdd/test-quality-rules.md');
  let sibling = '';
  if (siblingExists) sibling = read('skills/tdd/test-quality-rules.md');

  // ISS-043: Symmetric coverage (command + skill + sibling)
  const symmetric = {
    command: /### Symmetric Testing/m.test(command),
    skill: /\[symmetric-coverage\]/.test(skill),
    sibling: /## Symmetric Coverage/m.test(sibling),
  };

  // ISS-045: Adversarial robustness (command + skill + sibling)
  const adversarial = {
    command: /### Adversarial Contract Testing/m.test(command),
    skill: /\[contract-robustness\]/.test(skill),
    sibling: /## Contract Robustness/m.test(sibling),
  };

  // ISS-049: Artifact-type routing (command + sibling)
  const routing = {
    command: /### Artifact-Type Test Strategy/m.test(command),
    sibling: /## Artifact-Type Test Strategy/m.test(sibling),
  };

  const failures = [];
  for (const [loc, found] of Object.entries(symmetric)) {
    if (!found) failures.push(`ISS-043 symmetric missing in ${loc}`);
  }
  for (const [loc, found] of Object.entries(adversarial)) {
    if (!found) failures.push(`ISS-045 adversarial missing in ${loc}`);
  }
  for (const [loc, found] of Object.entries(routing)) {
    if (!found) failures.push(`ISS-049 routing missing in ${loc}`);
  }

  assert.equal(
    failures.length,
    0,
    `Full convention chain has gaps: ${failures.join('; ')}`
  );
});
