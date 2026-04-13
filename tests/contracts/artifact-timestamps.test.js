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
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

// --- AC1: Convention defined ---

test('AC1: docs/CLAUDE.md defines the **Generated:** timestamp convention', () => {
  const doc = read('docs/CLAUDE.md');
  assert.match(doc, /\*\*Generated:\*\*/,
    'docs/CLAUDE.md should reference the **Generated:** convention');
  assert.match(doc, /ISO 8601/i,
    'docs/CLAUDE.md should mention ISO 8601 format');
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

test('AC3: artifact-producing commands instruct agents to use the current timestamp with **Generated:**', () => {
  const commandPaths = [
    'commands/specify.md',
    'commands/architect.md',
    'commands/security-gate.md',
    'commands/review.md',
  ];
  for (const cmdPath of commandPaths) {
    const content = read(cmdPath);
    // Must contain **Generated:** AND mention "current" in the same context
    assert.match(content, /\*\*Generated:\*\*/,
      `${cmdPath} should include the **Generated:** marker`);
    // The instruction near **Generated:** must say "current" to prevent stale copies
    const generatedIdx = content.indexOf('**Generated:**');
    const nearby = content.slice(
      Math.max(0, generatedIdx - 200),
      Math.min(content.length, generatedIdx + 200)
    );
    assert.match(nearby, /current/i,
      `${cmdPath} should instruct the agent to use the current timestamp near the **Generated:** marker`);
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

// --- AC5: Skill templates contain **Generated:** anchor ---

test('AC5: prd-writing skill template contains **Generated:** anchor line', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  assert.match(skill, /\*\*Generated:\*\*/,
    'skills/prd-writing/SKILL.md should contain the **Generated:** anchor');
});

test('AC5: architecture-decision skill template contains **Generated:** anchor line', () => {
  const skill = read('skills/architecture-decision/SKILL.md');
  assert.match(skill, /\*\*Generated:\*\*/,
    'skills/architecture-decision/SKILL.md should contain the **Generated:** anchor');
});

test('AC5: code-review skill template contains **Generated:** anchor line', () => {
  const skill = read('skills/code-review/SKILL.md');
  assert.match(skill, /\*\*Generated:\*\*/,
    'skills/code-review/SKILL.md should contain the **Generated:** anchor');
});

test('AC5: security-audit skill template contains **Generated:** anchor line', () => {
  const skill = read('skills/security-audit/SKILL.md');
  assert.match(skill, /\*\*Generated:\*\*/,
    'skills/security-audit/SKILL.md should contain the **Generated:** anchor');
});
