/**
 * Contract tests for artifact-timestamps feature (RED state)
 *
 * Derived from: docs/features/artifact-timestamps/prd.md + architecture.md
 * These tests verify the structural presence of the **Generated:** timestamp
 * convention across commands, skill templates, Codex reviewers, and docs.
 *
 * Primary production-wiring test seam:
 *   "docs/CLAUDE.md defines the convention" + "every artifact-producing command
 *   includes the **Generated:** instruction" = the pipeline is wired to produce
 *   timestamped artifacts. The wiring proof is the combination of AC1+AC2+AC4.
 *
 * AC6 (no regression) verification path:
 *   Run `node --test tests/node/*.test.js` separately to confirm existing tests
 *   still pass. AC6 is validated by the full existing suite, not by this file.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

// --- AC1: Convention defined (format + placement) ---

test('AC1: docs/CLAUDE.md defines the **Generated:** timestamp convention with placement rule', () => {
  const doc = read('docs/CLAUDE.md');
  const conventions = doc.match(/## Code Conventions[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(conventions, 'docs/CLAUDE.md should have a Code Conventions section');
  assert.match(conventions[0], /\*\*Generated:\*\*/,
    'Code Conventions should reference the **Generated:** convention');
  assert.match(conventions[0], /ISO 8601/i,
    'Code Conventions should mention ISO 8601 format');
  assert.match(conventions[0], /immediately after.*top-level heading|after.*top-level heading/i,
    'Code Conventions should specify placement after the top-level heading');
});

// --- AC2: Command instructions updated ---

test('AC2: commands/specify.md includes timestamp instruction', () => {
  const content = read('commands/specify.md');
  assert.match(content, /\*\*Generated:\*\*/,
    'commands/specify.md should include the **Generated:** instruction');
});

test('AC2: commands/architect.md includes timestamp instruction', () => {
  const content = read('commands/architect.md');
  assert.match(content, /\*\*Generated:\*\*/,
    'commands/architect.md should include the **Generated:** instruction');
});

test('AC2: commands/security-gate.md includes timestamp instruction', () => {
  const content = read('commands/security-gate.md');
  assert.match(content, /\*\*Generated:\*\*/,
    'commands/security-gate.md should include the **Generated:** instruction');
});

test('AC2: commands/review.md includes timestamp instruction', () => {
  const content = read('commands/review.md');
  assert.match(content, /\*\*Generated:\*\*/,
    'commands/review.md should include the **Generated:** instruction');
});

test('AC2: commands/review.md covers review-claude-*.md artifacts with timestamp instruction', () => {
  // Per architecture.md: review-claude-*.md files are produced by commands/review.md.
  // The review command must instruct the agent to include the timestamp in all
  // review output artifacts, including named Claude review files.
  const content = read('commands/review.md');
  assert.match(content, /\*\*Generated:\*\*/,
    'commands/review.md should include **Generated:** for all review artifacts');
  assert.match(content, /review-claude|named.*review|all.*review.*artifact/i,
    'commands/review.md should explicitly reference review-claude or named review files');
});

test('AC2: codex/reviewers/review-code.md includes timestamp instruction', () => {
  const content = read('codex/reviewers/review-code.md');
  assert.match(content, /\*\*Generated:\*\*/,
    'codex/reviewers/review-code.md should include the **Generated:** instruction');
});

test('AC2: codex/reviewers/review-architecture.md includes timestamp instruction', () => {
  const content = read('codex/reviewers/review-architecture.md');
  assert.match(content, /\*\*Generated:\*\*/,
    'codex/reviewers/review-architecture.md should include the **Generated:** instruction');
});

test('AC2: codex/reviewers/review-test-design.md includes timestamp instruction', () => {
  const content = read('codex/reviewers/review-test-design.md');
  assert.match(content, /\*\*Generated:\*\*/,
    'codex/reviewers/review-test-design.md should include the **Generated:** instruction');
});

test('AC2: codex/reviewers/review-prd.md includes timestamp instruction', () => {
  const content = read('codex/reviewers/review-prd.md');
  assert.match(content, /\*\*Generated:\*\*/,
    'codex/reviewers/review-prd.md should include the **Generated:** instruction');
});

// --- AC3: Regeneration updates timestamp ---

test('AC3: artifact-producing commands require fresh timestamps on regeneration', () => {
  const commandPaths = [
    'commands/specify.md',
    'commands/architect.md',
    'commands/security-gate.md',
    'commands/review.md',
  ];
  for (const cmdPath of commandPaths) {
    const content = read(cmdPath);
    assert.match(content, /\*\*Generated:\*\*/,
      `${cmdPath} should include the **Generated:** marker`);
    // The command must explicitly instruct fresh/current timestamp generation,
    // not just mention "current" incidentally (e.g. in a handoff instruction).
    // Look for the **Generated:** marker and verify regeneration-freshness language nearby.
    const generatedIdx = content.indexOf('**Generated:**');
    const nearby = content.slice(
      Math.max(0, generatedIdx - 300),
      Math.min(content.length, generatedIdx + 300)
    );
    assert.match(nearby, /current.*time|current.*ISO|regenerat|update.*timestamp|fresh|do not preserve/i,
      `${cmdPath} should instruct the agent to use a fresh/current timestamp near the **Generated:** marker (not preserve stale values)`);
  }
});

// --- AC4: Convention documented in Code Conventions section ---

test('AC4: timestamp convention is in the Code Conventions section of docs/CLAUDE.md', () => {
  const doc = read('docs/CLAUDE.md');
  const conventionsMatch = doc.match(/## Code Conventions[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(conventionsMatch, 'docs/CLAUDE.md should have a Code Conventions section');
  assert.match(conventionsMatch[0], /\*\*Generated:\*\*/,
    'Timestamp convention should appear in the Code Conventions section');
});

// --- AC5: Skill templates contain **Generated:** anchor in template section ---
// Each skill has a named template section (e.g. "PRD Template", "ADR Template").
// The **Generated:** anchor must appear inside that template, not in an unrelated note.

test('AC5: prd-writing skill template section contains **Generated:** anchor line', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  const templateSection = skill.match(/## PRD Template[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(templateSection, 'skills/prd-writing/SKILL.md should have a PRD Template section');
  assert.match(templateSection[0], /\*\*Generated:\*\*/,
    '**Generated:** anchor must appear inside the PRD Template section');
});

test('AC5: architecture-decision skill template section contains **Generated:** anchor line', () => {
  const skill = read('skills/architecture-decision/SKILL.md');
  // architecture-decision has both "ADR Template" and "architecture.md Template"
  const templateSection = skill.match(/## (?:ADR|architecture\.md) Template[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(templateSection, 'skills/architecture-decision/SKILL.md should have a template section');
  assert.match(templateSection[0], /\*\*Generated:\*\*/,
    '**Generated:** anchor must appear inside the architecture template section');
});

test('AC5: code-review skill template section contains **Generated:** anchor line', () => {
  const skill = read('skills/code-review/SKILL.md');
  const templateSection = skill.match(/## Review Document Template[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(templateSection, 'skills/code-review/SKILL.md should have a Review Document Template section');
  assert.match(templateSection[0], /\*\*Generated:\*\*/,
    '**Generated:** anchor must appear inside the Review Document Template section');
});

test('AC5: security-audit skill template section contains **Generated:** anchor line', () => {
  const skill = read('skills/security-audit/SKILL.md');
  const templateSection = skill.match(/## Security Audit Document Template[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(templateSection, 'skills/security-audit/SKILL.md should have a Security Audit Document Template section');
  assert.match(templateSection[0], /\*\*Generated:\*\*/,
    '**Generated:** anchor must appear inside the Security Audit Document Template section');
});
