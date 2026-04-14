/**
 * Integration tests for code-review-skill-hardening feature (RED state)
 *
 * // ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA
 *
 * Derived from: docs/features/code-review-skill-hardening/prd.md + architecture.md
 * Ticket: ISS-039
 *
 * Integration entry point: commands/review.md (production command file)
 * This is the command that orchestrates the review phase. It loads the code-review skill,
 * references sibling files, and contains the symmetric gate enforcement section.
 * The integration chain: commands/review.md → skills/code-review/SKILL.md → sibling
 * reference files (impact-analysis.md, automated-checks.md, reproduction.md).
 *
 * Primary production-wiring test seam:
 *   commands/review.md is the production entry point that a reviewer agent reads.
 *   It must load the code-review skill (via Skill References table), and the skill must
 *   chain to sibling reference files. The integration test reads the production entry
 *   point and verifies the complete methodology chain is wired: command → skill → siblings.
 *
 * Cases covered:
 *   Happy:   Review command loads skill, skill chains to all sibling references
 *   Edge:    Progressive disclosure links are resolvable (files exist at linked paths)
 *   Misuse:  Broken chain — command references skill but skill missing methodology section
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

function readOrFail(relativePath) {
  assert.ok(exists(relativePath), `${relativePath} must exist before reading its content`);
  return read(relativePath);
}

// ---------------------------------------------------------------------------
// Happy path: Complete wiring chain from command → skill → sibling references
// ---------------------------------------------------------------------------

test('INTEGRATION happy path: commands/review.md references code-review skill AND skill contains all ISS-039 methodology sections', () => {
  // Step 1: Read the production entry point (commands/review.md)
  const reviewCommand = read('commands/review.md');

  // Assert visible output: command references the code-review skill
  assert.match(
    reviewCommand,
    /code-review/,
    'commands/review.md (production entry point) must reference the code-review skill'
  );

  // Step 2: Follow the chain — read the skill file
  const skill = read('skills/code-review/SKILL.md');

  // Assert visible output: skill contains all 5 new methodology anchors from ISS-039
  assert.match(skill, /impact|schema.*trac/i, 'Skill must have schema impact tracing (AC1)');
  assert.match(
    skill,
    /drift.*check|source.*installed|automated-checks\.md/i,
    'Skill must have drift check or link to automated-checks.md (AC2)'
  );
  assert.match(
    skill,
    /test.*suite.*execution|automated-checks\.md/i,
    'Skill must have test suite execution or link to automated-checks.md (AC3)'
  );
  assert.match(skill, /reproduction.*requirement/i, 'Skill must have reproduction requirement (AC4)');
  assert.match(skill, /symmetric.*gate|gate.*enforcement/i, 'Skill must have symmetric gate enforcement (AC6)');
});

test('INTEGRATION happy path: commands/review.md has symmetric gate enforcement section with cross-gate verification', () => {
  // Read the production entry point
  const reviewCommand = read('commands/review.md');

  // Assert visible output: symmetric gate enforcement heading exists
  assert.match(
    reviewCommand,
    /symmetric.*gate|gate.*enforcement/i,
    'commands/review.md must have a symmetric gate enforcement section (AC6)'
  );

  // Assert visible output: section references security-gate.md for cross-verification
  assert.match(
    reviewCommand,
    /security-gate\.md/,
    'commands/review.md symmetric gate section must reference security-gate.md'
  );
});

// ---------------------------------------------------------------------------
// Edge: Progressive disclosure links resolve to existing files
// ---------------------------------------------------------------------------

test('INTEGRATION edge: all sibling reference files linked from SKILL.md exist on disk', () => {
  const skill = read('skills/code-review/SKILL.md');

  // Extract all .md file references from the skill that look like sibling references
  const siblingRefs = [
    'skills/code-review/impact-analysis.md',
    'skills/code-review/automated-checks.md',
    'skills/code-review/reproduction.md',
  ];

  const missing = siblingRefs.filter(ref => !exists(ref));
  assert.equal(
    missing.length,
    0,
    `Sibling reference files missing from disk: ${missing.join(', ')}. Progressive disclosure chain is broken.`
  );
});

test('INTEGRATION edge: skill links use the correct .claude/skills/ path prefix for installed references', () => {
  const skill = read('skills/code-review/SKILL.md');

  // Progressive disclosure links should use .claude/skills/ prefix per convention
  assert.match(
    skill,
    /\.claude\/skills\/code-review\//,
    'SKILL.md must use .claude/skills/code-review/ prefix in progressive disclosure links (installed path convention)'
  );
});

// ---------------------------------------------------------------------------
// Misuse: Broken methodology chain detection
// ---------------------------------------------------------------------------

test('INTEGRATION misuse: if SKILL.md references a sibling file, that file must contain the expected heading', () => {
  // Verify that linked sibling files actually contain the methodology headings
  // This catches the case where SKILL.md links to a file but the file is empty or wrong

  // impact-analysis.md must exist and have Schema Impact Tracing heading
  const impact = readOrFail('skills/code-review/impact-analysis.md');
  assert.match(
    impact,
    /^## Schema Impact Tracing$/m,
    'impact-analysis.md exists but is missing the "## Schema Impact Tracing" heading — chain is broken'
  );

  // automated-checks.md must exist and have both headings
  const checks = readOrFail('skills/code-review/automated-checks.md');
  assert.match(
    checks,
    /^## Source\/Installed Drift Check$/m,
    'automated-checks.md exists but is missing the "## Source/Installed Drift Check" heading'
  );
  assert.match(
    checks,
    /^## Test Suite Execution$/m,
    'automated-checks.md exists but is missing the "## Test Suite Execution" heading'
  );

  // reproduction.md must exist and have Reproduction Requirement heading
  const repro = readOrFail('skills/code-review/reproduction.md');
  assert.match(
    repro,
    /^## Reproduction Requirement$/m,
    'reproduction.md exists but is missing the "## Reproduction Requirement" heading — chain is broken'
  );
});

// ---------------------------------------------------------------------------
// Production wiring proof: command → skill → sibling forms a complete chain
// ---------------------------------------------------------------------------

test('INTEGRATION wiring: the full chain command → skill → sibling files covers all 5 ISS-039 methodology steps', () => {
  // This test reads the production entry point (commands/review.md) and traces
  // the complete chain to verify all 5 new methodology steps are wired.

  const command = read('commands/review.md');
  const skill = read('skills/code-review/SKILL.md');

  // Count methodology steps found across the chain
  const steps = {
    schemaImpact: /impact|schema.*trac/i.test(skill),
    driftCheck: /drift.*check|source.*installed/i.test(skill) || /automated-checks\.md/.test(skill),
    testSuite: /test.*suite.*execution/i.test(skill) || /automated-checks\.md/.test(skill),
    reproduction: /reproduction.*requirement/i.test(skill),
    symmetricGate: /symmetric.*gate|gate.*enforcement/i.test(command),
  };

  const missing = Object.entries(steps)
    .filter(([, found]) => !found)
    .map(([name]) => name);

  assert.equal(
    missing.length,
    0,
    `ISS-039 methodology steps missing from the command→skill chain: ${missing.join(', ')}`
  );
});
