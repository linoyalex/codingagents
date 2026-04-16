const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// extractSection is imported from lib/wiring-check.js for section-scoped matching (M1, L1)
const { extractSection } = require('../../lib/wiring-check');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function lineCount(relativePath) {
  return read(relativePath).trimEnd().split('\n').length;
}

test('core skills stay within the compact line-budget target', () => {
  const budgets = {
    'skills/prd-writing/SKILL.md': 120,
    'skills/architecture-decision/SKILL.md': 120,
    'skills/tdd/SKILL.md': 120,
    'skills/verification-gate/SKILL.md': 120,
  };

  for (const [relativePath, maxLines] of Object.entries(budgets)) {
    assert.ok(
      lineCount(relativePath) <= maxLines,
      `${relativePath} should stay under ${maxLines} lines`
    );
  }
});

test('core skills preserve the structural reliability anchors added by ISS-010', () => {
  const prd = read('skills/prd-writing/SKILL.md');
  const architecture = read('skills/architecture-decision/SKILL.md');
  const tdd = read('skills/tdd/SKILL.md');
  const verification = read('skills/verification-gate/SKILL.md');

  assert.match(prd, /^## Top Rules$/m);
  assert.match(prd, /^## PRD Template$/m);
  assert.match(prd, /^### Dependencies$/m);

  assert.match(architecture, /^\*\*Decision confidence:\*\*/m);
  assert.match(architecture, /^\*\*Revisit when:\*\*/m);
  assert.match(architecture, /^\*\*Rollback \/ Fallback:\*\*/m);
  assert.match(architecture, /^### Trust Boundaries$/m);

  assert.match(tdd, /^## Top Rules$/m);
  assert.match(tdd, /^RED:.*intended reason/m);
  assert.match(tdd, /Primary production wiring/);
  assert.match(tdd, /Example case selection:/);

  assert.match(verification, /^## Top Rules$/m);
  assert.match(verification, /Adapt to your stack/);
  assert.match(verification, /^## Handoff Validation$/m);
  assert.match(verification, /^## No-Go Criteria$/m);
});

test('paired commands reference ISS-010 reliability concepts (structural, not phrase-bound)', () => {
  const specify = read('commands/specify.md');
  const architect = read('commands/architect.md');
  const testDesign = read('commands/test-design.md');
  const implement = read('commands/implement.md');

  // specify: ambiguity handling (assumptions or dependencies)
  assert.match(specify, /ambigu|assumption|dependenc/i);

  // architect: reliability fields (confidence + revisit + rollback + trust)
  assert.match(architect, /confidence/i);
  assert.match(architect, /revisit/i);
  assert.match(architect, /rollback|fallback/i);
  assert.match(architect, /trust boundar/i);

  // test-design: misuse/abuse testing + production wiring identification
  assert.match(testDesign, /misuse|abuse/i);
  assert.match(testDesign, /production.wiring|wiring.*test/i);

  // implement: RED failure validation + general solution guardrail
  assert.match(implement, /intended.*reason|failure reason/i);
  assert.match(implement, /general solution|not.*only.*current test/i);
});

test('committed .claude copies stay byte-identical to the source skills and commands', () => {
  const mirroredPaths = [
    ['skills/prd-writing/SKILL.md', '.claude/skills/prd-writing/SKILL.md'],
    ['skills/architecture-decision/SKILL.md', '.claude/skills/architecture-decision/SKILL.md'],
    ['skills/tdd/SKILL.md', '.claude/skills/tdd/SKILL.md'],
    ['skills/verification-gate/SKILL.md', '.claude/skills/verification-gate/SKILL.md'],
    ['commands/specify.md', '.claude/commands/specify.md'],
    ['commands/architect.md', '.claude/commands/architect.md'],
    ['commands/test-design.md', '.claude/commands/test-design.md'],
    ['commands/implement.md', '.claude/commands/implement.md'],
    ['commands/review.md', '.claude/commands/review.md'],
    ['commands/security-gate.md', '.claude/commands/security-gate.md'],
    ['commands/document.md', '.claude/commands/document.md'],
    ['skills/code-review/SKILL.md', '.claude/skills/code-review/SKILL.md'],
    ['skills/security-audit/SKILL.md', '.claude/skills/security-audit/SKILL.md'],
  ];

  for (const [sourcePath, installedPath] of mirroredPaths) {
    assert.equal(
      read(installedPath),
      read(sourcePath),
      `${installedPath} should stay in sync with ${sourcePath}`
    );
  }
});

// ---------------------------------------------------------------------------
// invariants-audit: AC1 / AC1a / AC2 / AC3 / AC6 — Skill file core contracts
// Feature: invariants-audit
// Production-wiring seam: skills/invariants-audit/SKILL.md (source) <->
//                         .claude/skills/invariants-audit/SKILL.md (installed)
// RED state: skills/invariants-audit/ does not exist yet.
// ---------------------------------------------------------------------------

// AC1: SKILL.md line budget (<= 120 prose lines)
test('AC1 (invariants-audit): skills/invariants-audit/SKILL.md stays within 120-line budget', () => {
  const lines = lineCount('skills/invariants-audit/SKILL.md');
  assert.ok(
    lines <= 120,
    `skills/invariants-audit/SKILL.md must be <= 120 lines, got ${lines} (AC1 skill size budget)`
  );
});

// AC1a: Source and installed SKILL.md are byte-identical
test('AC1a (invariants-audit): source and installed SKILL.md are byte-identical', () => {
  assert.equal(
    read('.claude/skills/invariants-audit/SKILL.md'),
    read('skills/invariants-audit/SKILL.md'),
    '.claude/skills/invariants-audit/SKILL.md must be byte-identical to skills/invariants-audit/SKILL.md (AC1a sync)'
  );
});

// AC1a: Source and installed review-categories.md are byte-identical
test('AC1a (invariants-audit): source and installed review-categories.md are byte-identical', () => {
  assert.equal(
    read('.claude/skills/invariants-audit/review-categories.md'),
    read('skills/invariants-audit/review-categories.md'),
    '.claude/skills/invariants-audit/review-categories.md must be byte-identical to skills/invariants-audit/review-categories.md (AC1a sync)'
  );
});

// AC2: 5 review categories present (by name) in review-categories.md
// Each category tested individually for symmetric coverage

test('AC2 (invariants-audit): review-categories.md documents state-machine and transition bugs category', () => {
  const content = read('skills/invariants-audit/review-categories.md');
  assert.match(
    content,
    /state.machine|transition bug/i,
    'skills/invariants-audit/review-categories.md must document the state-machine/transition bugs category (AC2 category 1)'
  );
});

// M2 FIX: Category 2 match is scoped to a heading-level subsection containing the
// category name (blocked/rejected/stale), not the whole document. This prevents
// incidental matches from prose in other categories satisfying the test.
test('AC2 (invariants-audit): review-categories.md documents blocked/rejected/retry/stale-state paths category', () => {
  const content = read('skills/invariants-audit/review-categories.md');
  // A heading naming the category must be present (structural anchor, not prose scan).
  // Category 2 heading must contain at least two of: blocked, rejected, retry, stale
  // to prevent a single incidental word from triggering a pass.
  assert.match(
    content,
    /^#{1,4}[^#\n]*(blocked[^#\n]*(rejected|retry|stale)|rejected[^#\n]*(blocked|retry|stale)|retry[^#\n]*(blocked|rejected|stale)|stale[^#\n]*(blocked|rejected|retry))/im,
    'skills/invariants-audit/review-categories.md must have a heading naming the blocked/rejected/retry/stale-state category (AC2 category 2 — heading-scoped)'
  );
});

test('AC2 (invariants-audit): review-categories.md documents spec vs implementation vs tests vs hooks contradictions category', () => {
  const content = read('skills/invariants-audit/review-categories.md');
  assert.match(
    content,
    /spec.*impl|impl.*spec|contradiction/i,
    'skills/invariants-audit/review-categories.md must document the spec-vs-impl contradictions category (AC2 category 3)'
  );
});

test('AC2 (invariants-audit): review-categories.md documents fixture-template-validator mismatches category', () => {
  const content = read('skills/invariants-audit/review-categories.md');
  assert.match(
    content,
    /fixture.*validator|validator.*fixture|fixture.*template|template.*validator|mismatch/i,
    'skills/invariants-audit/review-categories.md must document the fixture-template-validator mismatches category (AC2 category 4)'
  );
});

test('AC2 (invariants-audit): review-categories.md documents syntax-not-behavior tests category', () => {
  const content = read('skills/invariants-audit/review-categories.md');
  assert.match(
    content,
    /syntax.not.behavior|structure but not behavior|proves syntax/i,
    'skills/invariants-audit/review-categories.md must document the syntax-not-behavior category (AC2 category 5)'
  );
});

// AC3: 5-step invariant review method — each step tested individually
// Steps 2–4 are scoped to the ## Invariant Review Method section via extractSection
// to prevent incidental keyword matches in other parts of SKILL.md (M1 fix).
test('AC3 (invariants-audit): SKILL.md documents step 1 — identify the invariant', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  assert.match(
    content,
    /identify.*invariant|invariant.*identify/i,
    'skills/invariants-audit/SKILL.md must document step 1: identify the invariant (AC3)'
  );
});

test('AC3 (invariants-audit): SKILL.md documents step 2 — where invariant is encoded', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  // M1 FIX: scope match to ## Invariant Review Method section only
  const section = extractSection(content, /^## Invariant Review Method$/m);
  assert.ok(
    section !== null,
    'skills/invariants-audit/SKILL.md must have a ## Invariant Review Method section (AC3 step 2)'
  );
  assert.match(
    section,
    /encoded|where.*encoded|where it is encoded/i,
    'skills/invariants-audit/SKILL.md ## Invariant Review Method must document step 2: where invariant is encoded (AC3)'
  );
});

test('AC3 (invariants-audit): SKILL.md documents step 3 — where invariant is enforced', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  // M1 FIX: scope match to ## Invariant Review Method section only
  const section = extractSection(content, /^## Invariant Review Method$/m);
  assert.ok(
    section !== null,
    'skills/invariants-audit/SKILL.md must have a ## Invariant Review Method section (AC3 step 3)'
  );
  assert.match(
    section,
    /enforced|where.*enforced|where it is enforced/i,
    'skills/invariants-audit/SKILL.md ## Invariant Review Method must document step 3: where invariant is enforced (AC3)'
  );
});

test('AC3 (invariants-audit): SKILL.md documents step 4 — where invariant is tested', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  // M1 FIX: scope match to ## Invariant Review Method section only
  const section = extractSection(content, /^## Invariant Review Method$/m);
  assert.ok(
    section !== null,
    'skills/invariants-audit/SKILL.md must have a ## Invariant Review Method section (AC3 step 4)'
  );
  assert.match(
    section,
    /tested|where.*tested|where it is tested/i,
    'skills/invariants-audit/SKILL.md ## Invariant Review Method must document step 4: where invariant is tested (AC3)'
  );
});

test('AC3 (invariants-audit): SKILL.md documents step 5 — what happens on failure paths', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  assert.match(
    content,
    /failure path|what happens on failure|on failure/i,
    'skills/invariants-audit/SKILL.md must document step 5: failure paths (AC3)'
  );
});

// AC7: When to Use — trigger conditions vs normal review documented
// L1 FIX: keyword match is scoped to ## When to Use section via extractSection,
// not the full SKILL.md, to prevent matches from ## Invariant Review Method prose.
test('AC7 (invariants-audit): SKILL.md documents trigger conditions for when to use vs normal review', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  const section = extractSection(content, /^## When to Use$/m);
  assert.ok(
    section !== null,
    'skills/invariants-audit/SKILL.md must have a ## When to Use section (AC7)'
  );
  assert.match(
    section,
    /workflow logic|state transition|safety check|test architecture/i,
    'skills/invariants-audit/SKILL.md ## When to Use must name trigger conditions (AC7)'
  );
});
