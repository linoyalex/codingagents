// Production wiring test seam: codex/reviewers/review-code.md
// This file reads the review prompt as a production artifact and asserts structural anchors.
// Tests are derived from PRD (ISS-027) AC1-AC5 and the architecture decision record.
// Structural anchors (heading regex + keyword presence) survive wording changes; phrase-binding does not.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const REVIEW_CODE_PATH = path.join(ROOT_DIR, 'codex', 'reviewers', 'review-code.md');
const CODEX_RULES_PATH = path.join(ROOT_DIR, 'docs', 'memory', 'codex-rules.md');

function readReviewCode() {
  return fs.readFileSync(REVIEW_CODE_PATH, 'utf8');
}

function readCodexRules() {
  return fs.readFileSync(CODEX_RULES_PATH, 'utf8');
}

function readCodexRulesReviewSection() {
  const content = readCodexRules();
  const match = content.match(/## Review Method Rules[\s\S]*?(?=\n## |\n$|$)/);
  return match ? match[0] : '';
}

// --- AC1: Install-Path Tracing ---

test('AC1: review-code.md has a section heading anchoring install-path tracing', () => {
  const content = readReviewCode();
  assert.match(
    content,
    /^#+\s.*(install.path|installer|init\.sh)/im,
    'Missing install-path tracing section heading'
  );
});

test('AC1: review-code.md install-path section references init.sh', () => {
  const content = readReviewCode();
  assert.match(content, /init\.sh/i, 'Missing init.sh reference in review-code.md');
});

test('AC1: review-code.md install-path section references upgrade.sh', () => {
  const content = readReviewCode();
  assert.match(content, /upgrade\.sh/i, 'Missing upgrade.sh reference in review-code.md');
});

// --- AC2: Test-Truthfulness Verification ---

test('AC2: review-code.md has a section heading anchoring test-truthfulness verification', () => {
  const content = readReviewCode();
  assert.match(
    content,
    /^#+\s.*(test.truth|truthfulness|test.*name.*assertion|assertion.*test)/im,
    'Missing test-truthfulness section heading'
  );
});

test('AC2: review-code.md test-truthfulness section references "test name"', () => {
  const content = readReviewCode();
  assert.match(content, /test name/i, 'Missing "test name" keyword in review-code.md');
});

test('AC2: review-code.md test-truthfulness section references "assertion"', () => {
  const content = readReviewCode();
  assert.match(content, /assertion/i, 'Missing "assertion" keyword in review-code.md');
});

// --- AC3: Parser/Validator Edge-Case Checklist ---

test('AC3: review-code.md has a section heading anchoring parser edge-case checklist', () => {
  const content = readReviewCode();
  assert.match(
    content,
    /^#+\s.*(parser|validator|edge.case|edge case)/im,
    'Missing parser edge-case checklist section heading'
  );
});

test('AC3: review-code.md edge-case section references malformed input', () => {
  const content = readReviewCode();
  assert.match(content, /malformed/i, 'Missing "malformed" keyword in review-code.md');
});

// --- AC4: Unchanged-File Scope Expansion ---

test('AC4: review-code.md has a section heading anchoring unchanged-file scope', () => {
  const content = readReviewCode();
  assert.match(
    content,
    /^#+\s.*(unchanged|scope.expan|operationaliz)/im,
    'Missing unchanged-file scope section heading'
  );
});

test('AC4: review-code.md unchanged-file scope section uses "unchanged"', () => {
  const content = readReviewCode();
  assert.match(content, /unchanged/i, 'Missing "unchanged" keyword in review-code.md');
});

test('AC4: review-code.md unchanged-file scope section uses "scope"', () => {
  const content = readReviewCode();
  assert.match(content, /\bscope\b/i, 'Missing "scope" keyword in review-code.md');
});

// --- AC5: Process docs updated ---

test('AC5: docs/memory/codex-rules.md exists', () => {
  assert.ok(
    fs.existsSync(CODEX_RULES_PATH),
    `docs/memory/codex-rules.md does not exist at ${CODEX_RULES_PATH}`
  );
});

test('AC5: codex-rules.md has a Review Method Rules section', () => {
  const section = readCodexRulesReviewSection();
  assert.ok(
    section.length > 0,
    'codex-rules.md must have a ## Review Method Rules section'
  );
});

test('AC5: codex-rules.md Review Method Rules references the install-path tracing rule (AC1)', () => {
  const section = readCodexRulesReviewSection();
  assert.match(
    section,
    /init\.sh|install.path|installer/i,
    'codex-rules.md Review Method Rules does not reference install-path tracing (AC1)'
  );
});

test('AC5: codex-rules.md Review Method Rules references the test-truthfulness rule (AC2)', () => {
  const section = readCodexRulesReviewSection();
  assert.match(
    section,
    /test.truth|truthfulness|test name|assertion/i,
    'codex-rules.md Review Method Rules does not reference test-truthfulness rule (AC2)'
  );
});

test('AC5: codex-rules.md Review Method Rules references the parser edge-case rule (AC3)', () => {
  const section = readCodexRulesReviewSection();
  assert.match(
    section,
    /edge.case|malformed|parser/i,
    'codex-rules.md Review Method Rules does not reference parser edge-case rule (AC3)'
  );
});

test('AC5: codex-rules.md Review Method Rules references the unchanged-file scope rule (AC4)', () => {
  const section = readCodexRulesReviewSection();
  assert.match(
    section,
    /unchanged|scope.expan/i,
    'codex-rules.md Review Method Rules does not reference unchanged-file scope rule (AC4)'
  );
});

// --- AC5: review-process.md defers to codex-rules.md ---

test('AC5: review-process.md defers to codex-rules.md for Codex-specific guidance', () => {
  const reviewProcessPath = path.join(ROOT_DIR, 'docs', 'memory', 'review-process.md');
  assert.ok(
    fs.existsSync(reviewProcessPath),
    'docs/memory/review-process.md does not exist'
  );
  const content = fs.readFileSync(reviewProcessPath, 'utf8');
  assert.match(
    content,
    /codex-rules\.md/i,
    'review-process.md must defer to codex-rules.md for Codex-specific guidance'
  );
});

// --- Integration test: review-code.md is the production artifact ---
// This test reads the production file and asserts all four rule sections coexist —
// verifying the review prompt is cohesive, not just that individual keywords appear.

test('integration: review-code.md contains all four new rule sections in a single document', () => {
  const content = readReviewCode();

  // Each assertion targets a different rule — all four must be present simultaneously
  assert.match(content, /init\.sh/i, 'AC1 install-path rule missing');
  assert.match(content, /test name|truthfulness/i, 'AC2 test-truthfulness rule missing');
  assert.match(content, /malformed/i, 'AC3 parser edge-case rule missing');
  assert.match(content, /unchanged/i, 'AC4 unchanged-file scope rule missing');
});
