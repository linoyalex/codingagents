/**
 * Contract tests for skill-size-convention feature (RED state)
 *
 * Derived from: docs/features/skill-size-convention/prd.md + architecture.md
 * These tests verify the structural conventions for skill size budgets,
 * progressive disclosure, stop conditions footers, and CLAUDE.md sync.
 *
 * Primary production-wiring test seam:
 *   "docs/CLAUDE.md defines the new budget" + "contract tests enforce it dynamically"
 *   + "root and docs CLAUDE.md agree" = the convention is wired end-to-end.
 *   The wiring proof is the combination of AC1+AC8+AC9.
 *
 * Skills are discovered dynamically via glob — no hardcoded count (per AC5).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { globSync } = require('node:fs');

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

/**
 * Count instructional prose lines, excluding:
 * - YAML frontmatter (between --- delimiters)
 * - Fenced code blocks (``` ... ```)
 * - Table rows (lines starting with |)
 * - Empty lines
 */
function countProseLines(content) {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let frontmatterSeen = false;
  let inCodeBlock = false;
  let proseCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track YAML frontmatter
    if (trimmed === '---') {
      if (!frontmatterSeen) {
        inFrontmatter = true;
        frontmatterSeen = true;
        continue;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        continue;
      }
    }
    if (inFrontmatter) continue;

    // Track fenced code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Skip table rows
    if (trimmed.startsWith('|')) continue;

    // Skip empty lines
    if (trimmed === '') continue;

    proseCount++;
  }

  return proseCount;
}

function isProgressiveDisclosure(skillName) {
  const skillDir = path.join(ROOT_DIR, 'skills', skillName);
  const entries = fs.readdirSync(skillDir);
  const referenceFiles = entries.filter(e => e.endsWith('.md') && e !== 'SKILL.md');
  return referenceFiles.length > 0;
}

function totalLines(relativePath) {
  return read(relativePath).trimEnd().split('\n').length;
}

// Pipeline-gating skills that must have stop conditions footer
const PIPELINE_GATING_SKILLS = ['verification-gate', 'security-audit', 'tdd', 'code-review'];

// --- AC1: Size budget defined in docs/CLAUDE.md ---

test('AC1: docs/CLAUDE.md defines the new skill size budget with prose/total distinction', () => {
  const doc = read('docs/CLAUDE.md');
  const conventions = doc.match(/## Code Conventions[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(conventions, 'docs/CLAUDE.md should have a Code Conventions section');

  // Must mention the prose budget (~150 lines)
  assert.match(conventions[0], /~?150.*lines.*prose|prose.*~?150.*lines/i,
    'Convention should specify ~150 lines instructional prose budget');

  // Must mention templates/examples excluded
  assert.match(conventions[0], /template|table|example/i,
    'Convention should mention that templates/tables/examples are excluded');

  // Must mention the 250 total split threshold
  assert.match(conventions[0], /250.*total|total.*250/i,
    'Convention should specify 250 total lines as the split threshold');

  // Must mention progressive disclosure
  assert.match(conventions[0], /progressive.disclosure/i,
    'Convention should reference progressive disclosure pattern');
});

// --- AC2: Progressive disclosure pattern documented ---

test('AC2: progressive disclosure pattern is documented in exactly one location', () => {
  const doc = read('docs/CLAUDE.md');

  // Check docs/CLAUDE.md for progressive disclosure documentation
  const hasPatternInDoc = /progressive.disclosure/i.test(doc);

  // Check if SKILL_AUTHORING.md exists as alternative
  const authoringPath = path.join(ROOT_DIR, 'skills', 'SKILL_AUTHORING.md');
  const authoringExists = fs.existsSync(authoringPath);
  const hasPatternInAuthoring = authoringExists &&
    /progressive.disclosure/i.test(read('skills/SKILL_AUTHORING.md'));

  // Must be in exactly one location
  assert.ok(hasPatternInDoc || hasPatternInAuthoring,
    'Progressive disclosure must be documented in docs/CLAUDE.md or skills/SKILL_AUTHORING.md');
  assert.ok(!(hasPatternInDoc && hasPatternInAuthoring),
    'Progressive disclosure must be in exactly one location, not both');
});

test('AC2: progressive disclosure documentation includes required elements', () => {
  const doc = read('docs/CLAUDE.md');

  // SKILL.md ≤120 lines
  assert.match(doc, /SKILL\.md.*≤?\s*120|120.*SKILL\.md/i,
    'Should specify SKILL.md ≤120 lines for split skills');

  // Reference file pattern
  assert.match(doc, /skills\/<name>\/|skills\/.*\/.*reference|sibling.*files|reference.*files/i,
    'Should describe the reference file pattern');

  // Link format
  assert.match(doc, /\[See reference:/i,
    'Should specify the link format [See reference: ...]');

  // Worked example mentioning verification-gate
  assert.match(doc, /verification-gate/i,
    'Should include verification-gate as the worked example');
});

// --- AC3: Stop conditions footer rule ---

test('AC3: docs/CLAUDE.md documents the stop conditions footer rule', () => {
  const doc = read('docs/CLAUDE.md');
  assert.match(doc, /STOP CONDITIONS.*end of file|stop conditions.*footer/i,
    'Should document the stop conditions footer pattern');
  assert.match(doc, /skim|attention/i,
    'Should explain the rationale (reviewer may skim / attention pattern)');
});

test('AC3: pipeline-gating skills have stop conditions footer in last 20 lines', () => {
  for (const skillName of PIPELINE_GATING_SKILLS) {
    const skillPath = `skills/${skillName}/SKILL.md`;
    const content = read(skillPath);
    const lines = content.trimEnd().split('\n');
    const last20 = lines.slice(-20).join('\n');

    assert.match(last20, /\*\*STOP CONDITIONS \(end of file\):\*\*/,
      `${skillPath} should have **STOP CONDITIONS (end of file):** in last 20 lines`);
  }
});

// --- AC4: Pilot conversion of verification-gate ---

test('AC4: verification-gate uses progressive disclosure pattern', () => {
  assert.ok(isProgressiveDisclosure('verification-gate'),
    'verification-gate should have reference files alongside SKILL.md');
});

test('AC4: verification-gate SKILL.md is ≤120 lines of prose', () => {
  const proseLines = countProseLines(read('skills/verification-gate/SKILL.md'));
  assert.ok(proseLines <= 120,
    `verification-gate SKILL.md should have ≤120 prose lines, got ${proseLines}`);
});

test('AC4: verification-gate has per-phase reference files', () => {
  const phases = [
    'phase-1-specify', 'phase-2-architect', 'phase-3-test-design',
    'phase-4-security-gate', 'phase-5-implement', 'phase-6-review',
    'phase-7-document'
  ];
  for (const phase of phases) {
    const refPath = path.join(ROOT_DIR, 'skills', 'verification-gate', `${phase}.md`);
    assert.ok(fs.existsSync(refPath),
      `verification-gate should have reference file: ${phase}.md`);
  }
});

test('AC4: verification-gate SKILL.md links resolve to existing reference files', () => {
  const content = read('skills/verification-gate/SKILL.md');
  const linkPattern = /\[See reference:\s*([^\]]+)\]/g;
  let match;
  const links = [];
  while ((match = linkPattern.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  assert.ok(links.length > 0,
    'verification-gate SKILL.md should contain [See reference: ...] links');

  for (const link of links) {
    const absPath = path.join(ROOT_DIR, link);
    assert.ok(fs.existsSync(absPath),
      `Reference link should resolve: ${link}`);
  }
});

// --- AC5: Migration audit ---

test('AC5: migration audit report exists with per-skill line counts', () => {
  const auditPath = path.join(ROOT_DIR, 'docs', 'memory', 'skill-migration-audit.md');
  assert.ok(fs.existsSync(auditPath),
    'docs/memory/skill-migration-audit.md should exist');

  const content = read('docs/memory/skill-migration-audit.md');

  // Should categorize skills
  assert.match(content, /compliant/i,
    'Audit should have a Compliant category');
  assert.match(content, /trimming|splitting/i,
    'Audit should categorize skills needing trimming or splitting');

  // Should include all discovered skills
  const skills = discoverSkills();
  for (const skill of skills) {
    assert.match(content, new RegExp(skill, 'i'),
      `Audit should include skill: ${skill}`);
  }
});

// --- AC6: Contract tests pass for both inline and progressive-disclosure ---

test('AC6: all inline skills have ≤250 total lines', () => {
  const skills = discoverSkills();
  for (const skillName of skills) {
    if (isProgressiveDisclosure(skillName)) continue; // skip split skills

    const total = totalLines(`skills/${skillName}/SKILL.md`);
    assert.ok(total <= 250,
      `Inline skill ${skillName}/SKILL.md should be ≤250 total lines, got ${total}`);
  }
});

test('AC6: all progressive-disclosure skills have SKILL.md ≤120 prose lines', () => {
  const skills = discoverSkills();
  for (const skillName of skills) {
    if (!isProgressiveDisclosure(skillName)) continue;

    const proseLines = countProseLines(read(`skills/${skillName}/SKILL.md`));
    assert.ok(proseLines <= 120,
      `Split skill ${skillName}/SKILL.md should have ≤120 prose lines, got ${proseLines}`);
  }
});

test('AC6: all [See reference: ...] links across all skills resolve', () => {
  const skills = discoverSkills();
  const broken = [];

  for (const skillName of skills) {
    const content = read(`skills/${skillName}/SKILL.md`);
    const linkPattern = /\[See reference:\s*([^\]]+)\]/g;
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      const refPath = path.join(ROOT_DIR, match[1].trim());
      if (!fs.existsSync(refPath)) {
        broken.push(`${skillName}: ${match[1].trim()}`);
      }
    }
  }

  assert.equal(broken.length, 0,
    `Broken reference links: ${broken.join(', ')}`);
});

// --- AC8: Size budget enforcement ---

test('AC8: no skill exceeds 150 prose lines (inline) or 120 prose lines (split)', () => {
  const skills = discoverSkills();
  const violations = [];

  for (const skillName of skills) {
    const content = read(`skills/${skillName}/SKILL.md`);
    const proseLines = countProseLines(content);
    const isSplit = isProgressiveDisclosure(skillName);
    const limit = isSplit ? 120 : 150;

    if (proseLines > limit) {
      violations.push(`${skillName}: ${proseLines} prose lines (limit: ${limit})`);
    }
  }

  assert.equal(violations.length, 0,
    `Skills exceeding prose budget: ${violations.join('; ')}`);
});

// --- AC9: Root and docs/CLAUDE.md sync ---

test('AC9: root CLAUDE.md and docs/CLAUDE.md agree on skill size convention', () => {
  const rootDoc = read('CLAUDE.md');
  const docsDoc = read('docs/CLAUDE.md');

  // Both should reference the same prose budget
  const rootHas150 = /~?150.*lines|lines.*~?150/i.test(rootDoc);
  const docsHas150 = /~?150.*lines|lines.*~?150/i.test(docsDoc);
  assert.ok(rootHas150,
    'Root CLAUDE.md should reference ~150 lines budget');
  assert.ok(docsHas150,
    'docs/CLAUDE.md should reference ~150 lines budget');
});

test('AC9: root CLAUDE.md Memory table no longer says ~100 lines for skills', () => {
  const rootDoc = read('CLAUDE.md');
  const memorySection = rootDoc.match(/## Memory.*Governance[\s\S]*?(?=\n## [^#]|$)/i);
  assert.ok(memorySection, 'Root CLAUDE.md should have a Memory & Instruction Governance section');

  // Should NOT say ~100 lines each
  assert.doesNotMatch(memorySection[0], /~100 lines each/,
    'Memory table should not still say "~100 lines each" — should be updated to ~150');
});

// --- Error state: skill over budget (screen state coverage) ---

test('error state: prose counter correctly excludes fenced blocks and tables', () => {
  // A skill-shaped string with mixed content
  const testContent = [
    '---',
    'name: test-skill',
    'description: test',
    '---',
    '',
    '# Test Skill',
    '',
    'This is prose line 1.',
    'This is prose line 2.',
    '',
    '```bash',
    'echo "this is a code block line"',
    'echo "this too"',
    '```',
    '',
    '| Col1 | Col2 |',
    '|------|------|',
    '| a    | b    |',
    '',
    'This is prose line 3.',
  ].join('\n');

  const count = countProseLines(testContent);
  // Should count: heading + 3 prose lines = 4
  assert.equal(count, 4,
    `Prose counter should exclude frontmatter, code blocks, tables, empties. Got ${count}`);
});
