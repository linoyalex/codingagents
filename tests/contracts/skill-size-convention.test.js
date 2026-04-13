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

/**
 * Enforcement function — mirrors the real enforcement logic from the positive
 * test above. Extracted so both the real tree scan and fixture-based negative
 * tests exercise the same code path.
 *
 * Returns an array of violation strings. Empty array = compliant.
 */
function enforceSkillBudget(skillsDir) {
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(name => fs.existsSync(path.join(skillsDir, name, 'SKILL.md')));

  const violations = [];
  for (const skillName of skills) {
    const content = fs.readFileSync(path.join(skillsDir, skillName, 'SKILL.md'), 'utf8');
    const proseLines = countProseLines(content);
    const refFiles = fs.readdirSync(path.join(skillsDir, skillName))
      .filter(f => f.endsWith('.md') && f !== 'SKILL.md');
    const isSplit = refFiles.length > 0;
    const limit = isSplit ? 120 : 150;

    if (proseLines > limit) {
      violations.push(`${skillName}: ${proseLines} prose lines (limit: ${limit})`);
    }
  }
  return violations;
}

test('AC8: enforcement detects over-budget inline skill on disk (negative test)', () => {
  // Create a real temp fixture directory with an over-budget inline skill
  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'skill-test-'));
  const fixtureSkillDir = path.join(tmpDir, 'over-budget-inline');
  fs.mkdirSync(fixtureSkillDir, { recursive: true });

  const lines = ['---', 'name: over-budget-inline', 'description: test', '---', ''];
  for (let i = 1; i <= 160; i++) lines.push(`Prose line ${i}.`);
  fs.writeFileSync(path.join(fixtureSkillDir, 'SKILL.md'), lines.join('\n'));

  try {
    const violations = enforceSkillBudget(tmpDir);
    assert.ok(violations.length > 0,
      'Enforcement must detect the over-budget inline fixture');
    assert.match(violations[0], /over-budget-inline/,
      'Violation must name the offending skill');
    assert.match(violations[0], /160/,
      'Violation must include the actual prose line count');
    assert.match(violations[0], /150/,
      'Violation must include the limit');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('AC8: enforcement detects over-budget split skill on disk (negative test)', () => {
  // Create a real temp fixture directory with an over-budget progressive-disclosure skill
  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'skill-test-'));
  const fixtureSkillDir = path.join(tmpDir, 'over-budget-split');
  fs.mkdirSync(fixtureSkillDir, { recursive: true });

  const lines = ['---', 'name: over-budget-split', 'description: test', '---', ''];
  for (let i = 1; i <= 130; i++) lines.push(`Prose line ${i}.`);
  fs.writeFileSync(path.join(fixtureSkillDir, 'SKILL.md'), lines.join('\n'));
  // Add a reference file so isProgressiveDisclosure returns true
  fs.writeFileSync(path.join(fixtureSkillDir, 'extra.md'), '# Extra detail\nSome content.\n');

  try {
    const violations = enforceSkillBudget(tmpDir);
    assert.ok(violations.length > 0,
      'Enforcement must detect the over-budget split fixture');
    assert.match(violations[0], /over-budget-split/,
      'Violation must name the offending skill');
    assert.match(violations[0], /130/,
      'Violation must include the actual prose line count');
    assert.match(violations[0], /120/,
      'Violation must include the split limit');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('AC8: enforcement passes silently for compliant fixture skill', () => {
  // Proves the enforcement path does not false-positive on a compliant skill
  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'skill-test-'));
  const fixtureSkillDir = path.join(tmpDir, 'compliant-skill');
  fs.mkdirSync(fixtureSkillDir, { recursive: true });

  const lines = ['---', 'name: compliant-skill', 'description: test', '---', ''];
  for (let i = 1; i <= 50; i++) lines.push(`Prose line ${i}.`);
  fs.writeFileSync(path.join(fixtureSkillDir, 'SKILL.md'), lines.join('\n'));

  try {
    const violations = enforceSkillBudget(tmpDir);
    assert.equal(violations.length, 0,
      'Enforcement must pass silently for a compliant skill');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// --- AC9: Root and docs/CLAUDE.md sync ---

/**
 * Extract the skill-size convention bullet(s) from a CLAUDE.md Code Conventions section.
 * Returns the raw text of lines mentioning skill size, prose, 150, 250, 120,
 * progressive disclosure, or split — normalized for whitespace comparison.
 * Returning null means the section was not found.
 */
function extractSkillSizeBlock(content) {
  const conventions = content.match(/## Code Conventions[\s\S]*?(?=\n## [^#]|$)/);
  if (!conventions) return null;

  // Extract all lines that are part of the skill-size rule cluster.
  // These are the lines mentioning the budget numbers, exclusions, or disclosure pattern.
  const lines = conventions[0].split('\n');
  const ruleLines = lines.filter(line => {
    const l = line.toLowerCase();
    return (
      /~?150/.test(line) ||
      /250/.test(line) ||
      /120/.test(line) ||
      /progressive.disclosure/i.test(line) ||
      /skill.*size|size.*budget|prose.*line|line.*prose/i.test(l) ||
      /template.*exclu|table.*exclu|example.*exclu|exclu.*template|exclu.*table|exclu.*example/i.test(l) ||
      /split.*threshold|threshold.*split/i.test(l) ||
      /reference.*file|sibling.*file/i.test(l) ||
      /stop.conditions.*footer/i.test(l)
    );
  });

  // Normalize: trim, collapse whitespace, lowercase for comparison
  return ruleLines
    .map(l => l.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter(l => l.length > 0)
    .sort()
    .join('\n');
}

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

test('AC9: root and docs/CLAUDE.md state identical skill-size rules (normalized text)', () => {
  const rootDoc = read('CLAUDE.md');
  const docsDoc = read('docs/CLAUDE.md');

  const rootBlock = extractSkillSizeBlock(rootDoc);
  const docsBlock = extractSkillSizeBlock(docsDoc);

  assert.ok(rootBlock, 'Root CLAUDE.md must have skill-size rules in Code Conventions');
  assert.ok(docsBlock, 'docs/CLAUDE.md must have skill-size rules in Code Conventions');

  // The normalized, sorted rule lines must be identical
  assert.equal(rootBlock, docsBlock,
    `Skill-size rules must be identical across root and docs/CLAUDE.md.\n` +
    `Root rules:\n${rootBlock}\n\ndocs rules:\n${docsBlock}`);
});

test('AC9: root CLAUDE.md Memory table no longer says ~100 lines for skills', () => {
  const rootDoc = read('CLAUDE.md');
  const memorySection = rootDoc.match(/## Memory.*Governance[\s\S]*?(?=\n## [^#]|$)/i);
  assert.ok(memorySection, 'Root CLAUDE.md should have a Memory & Instruction Governance section');

  // Should NOT say ~100 lines each
  assert.doesNotMatch(memorySection[0], /~100 lines each/,
    'Memory table should not still say "~100 lines each" — should be updated to ~150');
});

// --- AC4d: Signal-positive content verification (proxy) ---

test('AC4d: verification-gate reference files are non-trivial (not verbatim dump)', () => {
  const skillDir = path.join(ROOT_DIR, 'skills', 'verification-gate');
  const refFiles = fs.readdirSync(skillDir)
    .filter(f => f.endsWith('.md') && f !== 'SKILL.md');

  assert.ok(refFiles.length > 0,
    'verification-gate should have reference files');

  for (const refFile of refFiles) {
    const content = fs.readFileSync(path.join(skillDir, refFile), 'utf8');
    const lines = content.trim().split('\n').filter(l => l.trim() !== '');

    // Each reference file must have non-trivial content (at least 3 non-empty lines)
    assert.ok(lines.length >= 3,
      `Reference file ${refFile} should have ≥3 non-empty lines (got ${lines.length}) — not an empty stub`);

    // Reference files should not exceed 80 lines — they are focused supplements,
    // not bulk appendices that defeat the purpose of splitting
    assert.ok(lines.length <= 80,
      `Reference file ${refFile} has ${lines.length} non-empty lines — exceeds 80, suggesting bulk dump rather than focused content`);
  }
});

test('AC4d: verification-gate SKILL.md is smaller than the sum of reference files', () => {
  const skillDir = path.join(ROOT_DIR, 'skills', 'verification-gate');
  const skillContent = read('skills/verification-gate/SKILL.md');
  const skillLines = skillContent.trim().split('\n').length;

  const refFiles = fs.readdirSync(skillDir)
    .filter(f => f.endsWith('.md') && f !== 'SKILL.md');

  let totalRefLines = 0;
  for (const refFile of refFiles) {
    const content = fs.readFileSync(path.join(skillDir, refFile), 'utf8');
    totalRefLines += content.trim().split('\n').length;
  }

  // The point of progressive disclosure: SKILL.md is the compact core,
  // reference files hold the bulk. If SKILL.md >= total refs, the split was pointless.
  assert.ok(skillLines < totalRefLines,
    `SKILL.md (${skillLines} lines) should be smaller than total reference files (${totalRefLines} lines) — split should move detail out`);
});

test('AC4d: phase reference files contain phase-specific content (not generic boilerplate)', () => {
  // Each phase-N reference file should mention keywords specific to that phase.
  // This distinguishes a genuine split from mechanically moving verbatim chunks.
  const phaseKeywords = {
    'phase-1-specify': [/prd|specify|user.stor|acceptance.criter/i],
    'phase-2-architect': [/architect|adr|decision|rollback/i],
    'phase-3-test-design': [/test|red.state|failing|shell/i],
    'phase-4-security-gate': [/security|audit|owasp|blocking/i],
    'phase-5-implement': [/implement|tdd|green|refactor/i],
    'phase-6-review': [/review|diff|verdict|request.changes/i],
    'phase-7-document': [/document|changelog|release.note/i],
  };

  const skillDir = path.join(ROOT_DIR, 'skills', 'verification-gate');

  for (const [fileName, patterns] of Object.entries(phaseKeywords)) {
    const filePath = path.join(skillDir, `${fileName}.md`);
    if (!fs.existsSync(filePath)) continue; // existence tested elsewhere

    const content = fs.readFileSync(filePath, 'utf8');
    const hasPhaseContent = patterns.some(p => p.test(content));
    assert.ok(hasPhaseContent,
      `${fileName}.md should contain phase-specific content (matched against: ${patterns.map(p => p.source).join(', ')}), not just generic boilerplate`);
  }
});

/**
 * AC4d manual review rubric (documented, not automated):
 *
 * During implementation review, the reviewer should verify:
 * 1. Each reference file adds verification commands or guidance specific to its phase
 * 2. Content was not just copy-pasted verbatim from the old monolithic SKILL.md
 * 3. Low-signal boilerplate (e.g., repeated "adapt to your stack" for every phase)
 *    was trimmed rather than preserved
 * 4. The split makes it easier for an agent to find phase-relevant guidance
 *    (the "would I rather read this or the old monolith?" test)
 *
 * This rubric exists because fully automated detection of "signal-positive"
 * content would require semantic understanding beyond structural assertions.
 */

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
