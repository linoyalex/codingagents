const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
  ];

  for (const [sourcePath, installedPath] of mirroredPaths) {
    assert.equal(
      read(installedPath),
      read(sourcePath),
      `${installedPath} should stay in sync with ${sourcePath}`
    );
  }
});
