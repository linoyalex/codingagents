/**
 * E2E tests for skill-size-convention feature (RED state)
 *
 * Derived from: docs/features/skill-size-convention/prd.md + architecture.md
 * These tests verify the complete convention chain end-to-end: docs/CLAUDE.md
 * defines the budget, all skills comply, enforcement catches violations,
 * and root/docs CLAUDE.md stay in sync.
 *
 * Wiring proof: if all E2E tests pass, the skill size convention is enforced
 * across the full pipeline — from documentation through to pre-merge checks.
 *
 * AC7 (end-to-end phase command) is verified manually via spot-check,
 * not in this automated suite, per the architecture doc.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function discoverSkills() {
  const skillsDir = path.join(ROOT_DIR, 'skills');
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')));
}

// --- Full-chain: convention → enforcement → compliance ---

test('full chain: docs/CLAUDE.md convention + all skills comply + root synced', () => {
  // 1. Convention exists in docs/CLAUDE.md
  const docsDoc = read('docs/CLAUDE.md');
  assert.match(docsDoc, /progressive.disclosure/i,
    'docs/CLAUDE.md must define progressive disclosure');
  assert.match(docsDoc, /~?150/,
    'docs/CLAUDE.md must specify ~150 prose budget');
  assert.match(docsDoc, /250/,
    'docs/CLAUDE.md must specify 250 total threshold');

  // 2. Root CLAUDE.md agrees
  const rootDoc = read('CLAUDE.md');
  assert.match(rootDoc, /~?150/,
    'Root CLAUDE.md must match the ~150 budget');

  // 3. All skills comply with budget
  const skills = discoverSkills();
  assert.ok(skills.length > 0, 'At least one skill must exist');

  for (const skillName of skills) {
    const content = read(`skills/${skillName}/SKILL.md`);
    const total = content.trimEnd().split('\n').length;
    assert.ok(total <= 250,
      `${skillName}/SKILL.md exceeds 250 total lines (${total})`);
  }
});

// --- Full-chain: progressive disclosure pilot is complete ---

test('full chain: verification-gate pilot conversion is complete and functional', () => {
  // SKILL.md exists and is under budget
  const skillContent = read('skills/verification-gate/SKILL.md');
  const totalLines = skillContent.trimEnd().split('\n').length;
  assert.ok(totalLines <= 120,
    `verification-gate SKILL.md should be ≤120 total lines, got ${totalLines}`);

  // Per-phase reference files exist
  for (let i = 1; i <= 7; i++) {
    const phaseNames = [
      'phase-1-specify', 'phase-2-architect', 'phase-3-test-design',
      'phase-4-security-gate', 'phase-5-implement', 'phase-6-review',
      'phase-7-document'
    ];
    const refPath = path.join(ROOT_DIR, 'skills', 'verification-gate', `${phaseNames[i-1]}.md`);
    assert.ok(fs.existsSync(refPath),
      `Reference file should exist: ${phaseNames[i-1]}.md`);
  }

  // Stop conditions footer present
  const lines = skillContent.trimEnd().split('\n');
  const last20 = lines.slice(-20).join('\n');
  assert.match(last20, /\*\*STOP CONDITIONS \(end of file\):\*\*/,
    'verification-gate SKILL.md must end with stop conditions footer');

  // Reference links resolve
  const linkPattern = /\[See reference:\s*([^\]]+)\]/g;
  let match;
  while ((match = linkPattern.exec(skillContent)) !== null) {
    const refPath = path.join(ROOT_DIR, match[1].trim());
    assert.ok(fs.existsSync(refPath),
      `Reference link must resolve: ${match[1].trim()}`);
  }
});

// --- Full-chain: stop conditions footer on all gating skills ---

test('full chain: all pipeline-gating skills have stop conditions footer', () => {
  const gatingSkills = ['verification-gate', 'security-audit', 'tdd', 'code-review'];
  const missing = [];

  for (const skillName of gatingSkills) {
    const content = read(`skills/${skillName}/SKILL.md`);
    const lines = content.trimEnd().split('\n');
    const last20 = lines.slice(-20).join('\n');
    if (!/\*\*STOP CONDITIONS \(end of file\):\*\*/.test(last20)) {
      missing.push(skillName);
    }
  }

  assert.equal(missing.length, 0,
    `Pipeline-gating skills missing stop conditions footer: ${missing.join(', ')}`);
});

// --- Full-chain: migration audit captures all skills ---

test('full chain: migration audit exists and covers all discovered skills', () => {
  const auditPath = path.join(ROOT_DIR, 'docs', 'memory', 'skill-migration-audit.md');
  assert.ok(fs.existsSync(auditPath),
    'Migration audit report must exist at docs/memory/skill-migration-audit.md');

  const audit = read('docs/memory/skill-migration-audit.md');
  const skills = discoverSkills();

  for (const skill of skills) {
    assert.match(audit, new RegExp(skill),
      `Audit must cover skill: ${skill}`);
  }
});

// --- Edge case: installed copies sync for progressive-disclosure skills ---

test('edge case: installed .claude/skills copies include reference files for split skills', () => {
  const skillName = 'verification-gate';
  const sourceDir = path.join(ROOT_DIR, 'skills', skillName);
  const installedDir = path.join(ROOT_DIR, '.claude', 'skills', skillName);

  // SKILL.md sync
  assert.equal(
    read(`skills/${skillName}/SKILL.md`),
    read(`.claude/skills/${skillName}/SKILL.md`),
    `Installed SKILL.md must be byte-identical to source`
  );

  // Reference files sync
  const sourceFiles = fs.readdirSync(sourceDir)
    .filter(f => f.endsWith('.md') && f !== 'SKILL.md');

  for (const refFile of sourceFiles) {
    const installedPath = path.join(installedDir, refFile);
    assert.ok(fs.existsSync(installedPath),
      `Installed copy should include reference file: ${refFile}`);
    assert.equal(
      read(`skills/${skillName}/${refFile}`),
      read(`.claude/skills/${skillName}/${refFile}`),
      `Installed ${refFile} must be byte-identical to source`
    );
  }
});
