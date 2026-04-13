/**
 * E2E tests for artifact-timestamps feature (RED state)
 *
 * Derived from: docs/features/artifact-timestamps/prd.md + architecture.md
 * These tests verify the complete convention chain end-to-end: canonical source
 * (docs/CLAUDE.md) through all artifact-producing commands, Codex reviewers,
 * and skill templates.
 *
 * Wiring proof: if all three E2E tests pass, the pipeline is fully wired to
 * produce timestamped artifacts from every artifact-producing entry point.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

// --- Full-chain: all commands ---

test('every artifact-producing command references the timestamp convention', () => {
  const commandPaths = [
    'commands/specify.md',
    'commands/architect.md',
    'commands/security-gate.md',
    'commands/review.md',
  ];
  const missing = commandPaths.filter(p => !read(p).includes('**Generated:**'));
  assert.equal(missing.length, 0,
    `Commands missing **Generated:** reference: ${missing.join(', ')}`);
});

// --- Full-chain: all Codex reviewers ---

test('every Codex reviewer prompt references the timestamp convention', () => {
  const reviewerPaths = [
    'codex/reviewers/review-code.md',
    'codex/reviewers/review-architecture.md',
    'codex/reviewers/review-test-design.md',
    'codex/reviewers/review-prd.md',
  ];
  const missing = reviewerPaths.filter(p => !read(p).includes('**Generated:**'));
  assert.equal(missing.length, 0,
    `Codex reviewers missing **Generated:** reference: ${missing.join(', ')}`);
});

// --- Full-chain: all skill templates ---

test('every artifact-producing skill template contains the **Generated:** anchor', () => {
  const skillPaths = [
    'skills/prd-writing/SKILL.md',
    'skills/architecture-decision/SKILL.md',
    'skills/code-review/SKILL.md',
    'skills/security-audit/SKILL.md',
  ];
  const missing = skillPaths.filter(p => !read(p).includes('**Generated:**'));
  assert.equal(missing.length, 0,
    `Skills missing **Generated:** anchor: ${missing.join(', ')}`);
});

// --- Full-chain: canonical source ---

test('docs/CLAUDE.md Code Conventions is the canonical source for the timestamp convention', () => {
  const doc = read('docs/CLAUDE.md');
  const conventionsSection = doc.match(/## Code Conventions[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(conventionsSection, 'Code Conventions section must exist in docs/CLAUDE.md');
  assert.match(conventionsSection[0], /\*\*Generated:\*\*/,
    'Convention must appear in Code Conventions');
  assert.match(conventionsSection[0], /ISO 8601/i,
    'Convention must specify ISO 8601 format');
  assert.match(conventionsSection[0], /top-level heading/i,
    'Convention must specify placement after top-level heading');
});

// --- Edge case: convention completeness ---

test('timestamp convention specifies both format and placement', () => {
  const doc = read('docs/CLAUDE.md');
  assert.match(doc, /\*\*Generated:\*\*.*ISO.?8601|\bISO.?8601\b[\s\S]*?\*\*Generated:\*\*/i,
    'Convention must link the **Generated:** marker to ISO 8601 format');
  assert.match(doc, /immediately after.*top-level heading|after.*top-level heading/i,
    'Convention must specify placement after the top-level heading');
});
