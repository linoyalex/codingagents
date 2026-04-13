/**
 * Contract tests for integration-test-coverage feature (RED state)
 *
 * Derived from: docs/features/integration-test-coverage/prd.md + architecture.md
 * These tests verify that the TDD skill, test-design command, and PIPELINE_GUIDE
 * include three-level test coverage guidance with integration test requirements.
 *
 * Primary production-wiring test seam:
 *   The combination of AC1 (skill section) + AC5 (command verification) + AC6 (pipeline guide)
 *   proves the integration test requirement is wired end-to-end from guidance → enforcement → docs.
 *
 * Codex review feedback accounted for:
 *   - AC5 requires import + visible-effect assertion, not import-only (Codex PRD review MEDIUM)
 *   - AC7 requires explicit gap-handling: ARCH GAP comment + handoff known_risks (Codex PRD review HIGH)
 *   - AC4 minimum degenerate set explicitly named (Codex missing-state feedback)
 *   - No "schema read recorded in PR" requirement (Codex flagged as scope creep)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

/**
 * Count instructional prose lines, excluding:
 * - YAML frontmatter (between --- delimiters)
 * - Fenced code blocks (``` ... ```)
 * - Table rows (lines starting with |)
 * - Empty lines
 * Reuses the same logic as skill-size-convention tests.
 */
function countProseLines(content) {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let frontmatterSeen = false;
  let inCodeBlock = false;
  let proseCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

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

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    if (trimmed.startsWith('|')) continue;
    if (trimmed === '') continue;

    proseCount++;
  }

  return proseCount;
}

// --- AC1: Three-level test coverage section in TDD skill ---

test('AC1: TDD skill has a Three-Level Test Coverage section', () => {
  const skill = read('skills/tdd/SKILL.md');
  assert.match(skill, /^## Three-Level Test Coverage$/m,
    'TDD skill should have a "## Three-Level Test Coverage" heading');
});

test('AC1: Three-Level section names all three levels', () => {
  const skill = read('skills/tdd/SKILL.md');
  const section = skill.match(/## Three-Level Test Coverage[\s\S]*?(?=\n## [^#]|---\n\*\*STOP)/);
  assert.ok(section, 'Three-Level Test Coverage section must exist');

  assert.match(section[0], /unit|contract/i,
    'Section should mention unit/contract tests');
  assert.match(section[0], /integration/i,
    'Section should mention integration tests');
  assert.match(section[0], /e2e|end.to.end/i,
    'Section should mention E2E tests');
});

// --- AC2: Integration test definition ---

test('AC2: TDD skill defines integration test as calling production entry point', () => {
  const skill = read('skills/tdd/SKILL.md');
  assert.match(skill, /production entry point/i,
    'TDD skill should mention "production entry point"');
  assert.match(skill, /visible.*(?:effect|output)|effect.*visible/i,
    'TDD skill should require asserting visible effect in output');
});

test('AC2: TDD skill distinguishes integration from unit by entry point vs module', () => {
  const skill = read('skills/tdd/SKILL.md');
  assert.match(skill, /module directly.*unit test|unit test.*module directly/i,
    'TDD skill should clarify that calling module directly is a unit test');
});

test('AC2: TDD skill specifies integration test naming convention', () => {
  const skill = read('skills/tdd/SKILL.md');
  assert.match(skill, /\.integration\.test\./,
    'TDD skill should specify [feature].integration.test.{js,ts,py} naming');
});

// --- AC3: Fixture validation against production schema ---

test('AC3: TDD skill requires reading production schema before writing fixtures', () => {
  const skill = read('skills/tdd/SKILL.md');
  assert.match(skill, /production.*schema|schema.*production/i,
    'TDD skill should reference production schema for fixture validation');
  assert.match(skill, /fixture/i,
    'TDD skill should mention fixtures');
});

test('AC3: fixture validation rule is in Coverage Rules section', () => {
  const skill = read('skills/tdd/SKILL.md');
  const coverageSection = skill.match(/## Coverage Rules[\s\S]*?(?=\n## [^#]|---\n\*\*STOP)/);
  assert.ok(coverageSection, 'Coverage Rules section must exist');
  assert.match(coverageSection[0], /fixture.*schema|schema.*fixture/i,
    'Fixture validation should be inside Coverage Rules section');
});

// --- AC4: Degenerate input coverage rule ---

test('AC4: TDD skill requires degenerate input tests with minimum set', () => {
  const skill = read('skills/tdd/SKILL.md');
  assert.match(skill, /degenerate/i,
    'TDD skill should mention degenerate inputs');
  assert.match(skill, /empty.*string|empty/i,
    'Minimum set should include empty string');
  assert.match(skill, /whitespace/i,
    'Minimum set should include whitespace-only');
  assert.match(skill, /max.length|maximum.length/i,
    'Minimum set should include max-length boundary');
});

test('AC4: degenerate input rule is in Coverage Rules section', () => {
  const skill = read('skills/tdd/SKILL.md');
  const coverageSection = skill.match(/## Coverage Rules[\s\S]*?(?=\n## [^#]|---\n\*\*STOP)/);
  assert.ok(coverageSection, 'Coverage Rules section must exist');
  assert.match(coverageSection[0], /degenerate/i,
    'Degenerate input rule should be inside Coverage Rules section');
});

// --- AC5: Phase 3 blocking verification in test-design command ---

test('AC5: test-design command requires import of production entry point', () => {
  const cmd = read('commands/test-design.md');
  assert.match(cmd, /import.*production entry point|production entry point.*import/i,
    'Command should require importing the production entry point');
});

test('AC5: test-design command requires assertion on visible output (not import-only)', () => {
  const cmd = read('commands/test-design.md');
  assert.match(cmd, /assert.*visible|visible.*assert/i,
    'Command should require assertion on visible output, not just import');
});

test('AC5: test-design command makes verification blocking, not advisory', () => {
  const cmd = read('commands/test-design.md');
  assert.match(cmd, /blocking/i,
    'Verification must be described as blocking, not advisory');
});

test('AC5: test-design command rejects import-only shells', () => {
  const cmd = read('commands/test-design.md');
  // Text may span lines, so check both terms exist in the same verification block
  assert.match(cmd, /import.only/i,
    'Command should mention import-only shells');
  assert.match(cmd, /do not satisfy|not satisfy|cannot satisfy/i,
    'Command should state import-only shells do not satisfy the check');
});

// --- AC6: PIPELINE_GUIDE.md includes integration tests in Phase 3 ---

test('AC6: PIPELINE_GUIDE Phase 3 section mentions integration tests', () => {
  const guide = read('PIPELINE_GUIDE.md');
  // Find the Phase 3 section
  const phase3Section = guide.match(/## Phase 3[\s\S]*?(?=\n## Phase [^3]|$)/);
  assert.ok(phase3Section, 'PIPELINE_GUIDE should have a Phase 3 section');
  assert.match(phase3Section[0], /integration test/i,
    'Phase 3 section should mention integration tests');
});

// --- AC7: Architecture dependency with gap-handling ---

test('AC7: TDD skill documents ARCH GAP comment format', () => {
  const skill = read('skills/tdd/SKILL.md');
  assert.match(skill, /ARCH GAP/,
    'TDD skill should include the ARCH GAP comment format');
});

test('AC7: TDD skill documents handoff known_risks for missing call chain', () => {
  const skill = read('skills/tdd/SKILL.md');
  assert.match(skill, /known_risks/,
    'TDD skill should reference known_risks in handoff.json');
});

test('AC7: TDD skill allows Phase 3 to proceed despite missing call chain', () => {
  const skill = read('skills/tdd/SKILL.md');
  assert.match(skill, /Phase 3.*proceed|proceed.*Phase 3|may proceed/i,
    'TDD skill should state that Phase 3 may proceed with the gap recorded');
});

// --- AC8: No regression — skill within size budget ---

test('AC8: TDD skill remains within 150 prose line budget (inline skill)', () => {
  const skill = read('skills/tdd/SKILL.md');
  const proseLines = countProseLines(skill);
  assert.ok(proseLines <= 150,
    `TDD skill should have ≤150 prose lines, got ${proseLines}`);
});

test('AC8: TDD skill retains STOP CONDITIONS footer', () => {
  const skill = read('skills/tdd/SKILL.md');
  const lines = skill.trimEnd().split('\n');
  const last20 = lines.slice(-20).join('\n');
  assert.match(last20, /\*\*STOP CONDITIONS \(end of file\):\*\*/,
    'TDD skill must retain **STOP CONDITIONS (end of file):** in last 20 lines');
});

// --- Source/installed sync ---

test('source and installed TDD skill are byte-identical', () => {
  const source = read('skills/tdd/SKILL.md');
  const installed = read('.claude/skills/tdd/SKILL.md');
  assert.equal(source, installed,
    'skills/tdd/SKILL.md and .claude/skills/tdd/SKILL.md must be byte-identical');
});

// --- Source/installed sync for test-design command ---

test('source and installed test-design command are byte-identical', () => {
  const source = read('commands/test-design.md');
  const installed = read('.claude/commands/test-design.md');
  assert.equal(source, installed,
    'commands/test-design.md and .claude/commands/test-design.md must be byte-identical');
});
