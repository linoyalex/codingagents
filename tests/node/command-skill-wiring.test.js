/**
 * Wiring Verification: Command <-> Skill Artifact Contract Tests
 *
 * ARCH GAP: No Call Chain section in architecture.md -- integration target chosen by QA
 *
 * Implements the 4-stage algorithm from docs/features/wiring-verification/architecture.md:
 *   Stage 1 -- Discovery:      Parse ## Skill References tables from command files.
 *                              Fail-closed: commands with skills/ prose but no table -> FAIL.
 *   Stage 2 -- Registry parse: Parse ## Required Artifacts tables from skill files.
 *                              Missing section -> skip (AC7). Malformed -> error (AC3).
 *   Stage 3 -- Wiring check:   Verify Output/Deliverables section of command references
 *                              both Pattern AND at least one Path for each artifact (AC9).
 *                              Condition column is informational only -- no relaxation (AC8).
 *   Stage 4 -- Negative fixture: Dedicated fixture at tests/fixtures/wiring-gap/ asserts
 *                              that a deliberate gap is detected (AC11).
 *
 * SECURITY NOTE (MEDIUM finding from security-audit.md):
 *   The fail-closed heuristic (scanning for `skills/` prose) has residual bypass risk.
 *   Assumption: current commands all use `skills/` or `.claude/skills/` paths explicitly.
 *   If future commands use indirect skill loading, tighten to a registry of known-skill-
 *   loading commands. Tracked under ISS-025 AC7.
 *
 * Ticket: ISS-036
 * Source: docs/features/wiring-verification/prd.md + architecture.md
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  extractSection,
  parseSkillReferences,
  parseRequiredArtifacts,
  checkArtifactWiring,
  checkCommandSkillWiring,
  read,
  exists,
  ROOT_DIR,
} = require('../../lib/wiring-check');

// ---------------------------------------------------------------------------
// Discovery: list command files to check
// ---------------------------------------------------------------------------

const COMMANDS_DIR = path.join(ROOT_DIR, 'commands');

function getCommandFiles() {
  return fs.readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => `commands/${f}`);
}

// ---------------------------------------------------------------------------
// Stage 1 + 2 + 3: Live discovery tests against real commands/skills
// ---------------------------------------------------------------------------

test('Stage 1: commands with Skill References tables are parseable (discovery)', () => {
  const commandFiles = getCommandFiles();
  let commandsWithSkills = 0;

  for (const commandRelPath of commandFiles) {
    const commandText = read(commandRelPath);
    const commandName = path.basename(commandRelPath);

    // Stage 1: parse skill references -- throws on fail-closed violation
    const skillRefs = parseSkillReferences(commandText, commandName);

    if (skillRefs.length > 0) {
      commandsWithSkills++;

      // Each skill reference must point to an existing file
      for (const ref of skillRefs) {
        assert.ok(
          exists(ref.sourcePath),
          `Command '${commandName}' references skill at '${ref.sourcePath}' but file does not exist`
        );
      }
    }
  }

  // At least one command must declare skill references after the feature ships
  assert.ok(
    commandsWithSkills >= 1,
    `Expected at least one command to have a ## Skill References table, found ${commandsWithSkills}. ` +
    `Commands test-design.md and implement.md must declare their skill dependencies.`
  );
});

test('Stage 1 (fail-closed): commands with skill-loading prose but no Skill References table fail', () => {
  const commandFiles = getCommandFiles();
  const violations = [];

  for (const commandRelPath of commandFiles) {
    const commandText = read(commandRelPath);
    const commandName = path.basename(commandRelPath);

    try {
      parseSkillReferences(commandText, commandName);
    } catch (err) {
      violations.push({ commandName, message: err.message });
    }
  }

  // In RED state: commands with skills/ prose but no ## Skill References table exist.
  // This test fails because it finds such violations -- exactly the fail-closed check.
  assert.equal(
    violations.length, 0,
    `Found ${violations.length} command(s) with skill-loading prose but no ## Skill References table:\n` +
    violations.map(v => `  ${v.commandName}: ${v.message}`).join('\n')
  );
});

test('Stage 2: Required Artifacts tables in skills parse correctly (AC6 format)', () => {
  // Verify that any skill that HAS a ## Required Artifacts section is well-formed.
  const skillFiles = [];

  function collectSkills(dir) {
    if (!fs.existsSync(dir)) {
      return;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        collectSkills(path.join(dir, entry.name));
      } else if (entry.name === 'SKILL.md') {
        skillFiles.push(path.relative(ROOT_DIR, path.join(dir, entry.name)));
      }
    }
  }

  collectSkills(path.join(ROOT_DIR, 'skills'));

  // For each skill, parsing should not throw (well-formed or absent)
  for (const skillRelPath of skillFiles) {
    const skillText = read(skillRelPath);
    const skillName = path.basename(path.dirname(skillRelPath));

    // parseRequiredArtifacts should not throw for well-formed or absent sections
    assert.doesNotThrow(
      () => parseRequiredArtifacts(skillText, skillName),
      `Skill '${skillName}' at ${skillRelPath} has a malformed Required Artifacts table`
    );
  }
});

test('Stage 2 (AC6): tdd skill has Required Artifacts section with standard 4-column format', () => {
  // The TDD skill is the motivating case for this feature (ISS-036/AC2)
  const tddSkill = read('skills/tdd/SKILL.md');

  assert.match(
    tddSkill,
    /^## Required Artifacts$/m,
    'skills/tdd/SKILL.md must have a ## Required Artifacts section (AC6)'
  );

  const headerRe = /\|\s*Artifact\s*\|\s*Pattern\s*\|\s*Path\s*\|\s*Condition\s*\|/i;
  assert.match(
    tddSkill,
    headerRe,
    'skills/tdd/SKILL.md Required Artifacts table must have Artifact | Pattern | Path | Condition columns'
  );

  // Must parse without errors
  const artifacts = parseRequiredArtifacts(tddSkill, 'tdd');
  assert.ok(artifacts !== null, 'TDD skill should return artifacts, not null');
  assert.ok(artifacts.length >= 1, 'TDD skill should have at least one artifact entry');
});

test('Stage 3 (AC1 + AC2): test-design command output section references all tdd skill artifacts', () => {
  // AC1: verifies the happy-path wiring contract
  // AC2: catches the known gap -- tdd requires integration tests; test-design must have the path
  const testDesignText = read('commands/test-design.md');
  const testDesignRefs = parseSkillReferences(testDesignText, 'test-design.md');

  // test-design.md must reference tdd skill
  const tddRef = testDesignRefs.find(r => r.skill === 'tdd' || r.sourcePath.includes('tdd'));
  assert.ok(
    tddRef,
    'commands/test-design.md Skill References must include the tdd skill (AC2: to catch integration test gap)'
  );

  // Check wiring for the tdd skill reference
  const result = checkCommandSkillWiring('commands/test-design.md', tddRef);
  assert.equal(
    result.skipped, false,
    'tdd skill has Required Artifacts so wiring check should not be skipped'
  );
});

test('Stage 3 (AC4): implement command output section references all skill artifacts it declares', () => {
  // AC4: commands/implement.md must wire all declared skill artifacts
  const implementText = read('commands/implement.md');
  const implementRefs = parseSkillReferences(implementText, 'implement.md');

  // implement.md must have at least one skill reference
  assert.ok(
    implementRefs.length >= 1,
    'commands/implement.md must have at least one skill in ## Skill References (AC4)'
  );

  // Check wiring for each declared skill
  for (const skillRef of implementRefs) {
    checkCommandSkillWiring('commands/implement.md', skillRef);
    // If not skipped, checkCommandSkillWiring throws on failure
  }
});

// ---------------------------------------------------------------------------
// AC7: Skills without Required Artifacts section pass gracefully
// ---------------------------------------------------------------------------

test('AC7: skills without Required Artifacts section are skipped without error', () => {
  // Find a skill that does NOT have ## Required Artifacts (most skills won't)
  const skillsDir = path.join(ROOT_DIR, 'skills');
  let foundSkipCase = false;

  if (fs.existsSync(skillsDir)) {
    for (const skillDir of fs.readdirSync(skillsDir)) {
      const skillPath = `skills/${skillDir}/SKILL.md`;
      if (!exists(skillPath)) {
        continue;
      }

      const skillText = read(skillPath);
      if (!/^## Required Artifacts$/m.test(skillText)) {
        // This skill has no Required Artifacts -- parseRequiredArtifacts must return null
        const result = parseRequiredArtifacts(skillText, skillDir);
        assert.equal(
          result, null,
          `Skill '${skillDir}' has no Required Artifacts section -- must return null, not throw`
        );
        foundSkipCase = true;
        break; // One case is sufficient
      }
    }
  }

  assert.ok(
    foundSkipCase,
    'At least one skill without Required Artifacts must exist to test AC7 (empty state)'
  );
});

// ---------------------------------------------------------------------------
// AC8: Conditional artifacts receive the same full pattern+path check
// ---------------------------------------------------------------------------

test('AC8: conditional artifacts are parsed with condition field preserved (informational only)', () => {
  // Parse the conditional fixture -- Condition column must be parsed, not used to relax validation
  const conditionalSkillText = read('tests/fixtures/wiring-gap/mock-skill-conditional.md');
  const artifacts = parseRequiredArtifacts(conditionalSkillText, 'mock-tdd-conditional');

  assert.ok(artifacts !== null, 'Conditional fixture must have artifacts');
  assert.ok(artifacts.length >= 1, 'Conditional fixture must have at least one artifact');

  const artifact = artifacts[0];
  assert.ok(artifact.condition.length > 0, 'Conditional artifact must have a non-empty condition field');

  // The condition field must NOT affect the required pattern or paths fields
  assert.ok(artifact.pattern.length > 0, 'Pattern must still be set for conditional artifact');
  assert.ok(artifact.paths.length > 0, 'Path must still be set for conditional artifact');
});

test('AC8 (full check): conditional artifact requires same pattern+path as unconditional', () => {
  // Create a mock command with Output section that contains both pattern and path
  const commandWithBothText = [
    '## Skill References',
    '',
    '| Skill | Source path |',
    '|-------|------------|',
    '| mock-tdd-conditional | tests/fixtures/wiring-gap/mock-skill-conditional.md |',
    '',
    '## Output',
    '',
    '- Write integration tests to: tests/integration/ following [feature].integration.test.* pattern',
  ].join('\n');

  const commandMissingPatternText = [
    '## Skill References',
    '',
    '| Skill | Source path |',
    '|-------|------------|',
    '| mock-tdd-conditional | tests/fixtures/wiring-gap/mock-skill-conditional.md |',
    '',
    '## Output',
    '',
    '- Write test files to: tests/integration/ (no pattern mentioned)',
  ].join('\n');

  const conditionalSkillText = read('tests/fixtures/wiring-gap/mock-skill-conditional.md');
  const artifacts = parseRequiredArtifacts(conditionalSkillText, 'mock-tdd-conditional');

  assert.ok(artifacts !== null && artifacts.length >= 1,
    'Conditional fixture must parse successfully');

  // A command with both pattern and path should pass (even for conditional artifact)
  assert.doesNotThrow(
    () => checkArtifactWiring(commandWithBothText, 'mock-conditional-command.md', 'mock-tdd-conditional', artifacts[0]),
    'Command with pattern AND path must pass wiring check for conditional artifact (AC8)'
  );

  // A command with path but missing pattern must fail (same as unconditional -- no relaxation)
  assert.throws(
    () => checkArtifactWiring(commandMissingPatternText, 'mock-conditional-command.md', 'mock-tdd-conditional', artifacts[0]),
    /pattern/i,
    'Conditional artifact must fail if pattern is missing from output section (AC8: no relaxation)'
  );
});

// ---------------------------------------------------------------------------
// AC9: Multiple valid output paths -- at least one match passes
// ---------------------------------------------------------------------------

test('AC9: wiring check passes when at least one of multiple output paths matches', () => {
  // Artifact has paths: ['tests/unit/', 'tests/components/unit/']
  const multiPathArtifact = {
    artifact: 'Unit test',
    pattern: '[feature].unit.test.*',
    paths: ['tests/unit/', 'tests/components/unit/'],
    condition: '',
  };

  // Command output mentions only the second path -- should pass (any match)
  const commandTextSecondPath = [
    '## Output',
    '',
    '- Write unit tests to: tests/components/unit/ following [feature].unit.test.* pattern',
  ].join('\n');

  assert.doesNotThrow(
    () => checkArtifactWiring(commandTextSecondPath, 'multi-path-command.md', 'mock-skill', multiPathArtifact),
    'At least one path match should be sufficient (AC9)'
  );

  // Command output mentions only the first path -- should also pass
  const commandTextFirstPath = [
    '## Output',
    '',
    '- Write unit tests to: tests/unit/ following [feature].unit.test.* pattern',
  ].join('\n');

  assert.doesNotThrow(
    () => checkArtifactWiring(commandTextFirstPath, 'multi-path-command.md', 'mock-skill', multiPathArtifact),
    'First path match should also pass (AC9)'
  );

  // Command output mentions neither path -- must fail
  assert.throws(
    () => checkArtifactWiring(
      ['## Output', '', '- Write tests to: tests/other/'].join('\n'),
      'multi-path-command.md',
      'mock-skill',
      multiPathArtifact
    ),
    /path/i,
    'No matching path must fail (AC9: at least one must match)'
  );
});

// ---------------------------------------------------------------------------
// AC11 + Stage 4: Negative fixture -- deliberate wiring gap is detected
// ---------------------------------------------------------------------------

test('AC11 (Stage 4): negative fixture detects deliberate wiring gap and throws', () => {
  // The mock-skill requires tests/integration/ but mock-command.md omits it from Output
  assert.ok(
    exists('tests/fixtures/wiring-gap/mock-skill.md'),
    'Negative fixture mock-skill.md must exist'
  );
  assert.ok(
    exists('tests/fixtures/wiring-gap/mock-command.md'),
    'Negative fixture mock-command.md must exist'
  );

  const mockCommandText = read('tests/fixtures/wiring-gap/mock-command.md');
  const mockCommandRefs = parseSkillReferences(mockCommandText, 'mock-command.md');

  assert.ok(
    mockCommandRefs.length >= 1,
    'Mock command must declare at least one skill reference'
  );

  // The wiring check must throw on this fixture (deliberate gap)
  assert.throws(
    () => {
      for (const skillRef of mockCommandRefs) {
        checkCommandSkillWiring('tests/fixtures/wiring-gap/mock-command.md', skillRef);
      }
    },
    (err) => {
      // Error must name the skill, artifact, and missing element
      assert.ok(
        err.message.includes('integration') || err.message.includes('path') || err.message.includes('pattern'),
        `Error message must identify the gap, got: ${err.message}`
      );
      return true;
    },
    'Negative fixture must cause wiring check to throw with a descriptive error (AC11)'
  );
});

test('AC11 (fixture content): mock-skill requires artifact that mock-command omits', () => {
  const mockSkill = read('tests/fixtures/wiring-gap/mock-skill.md');
  const mockCommand = read('tests/fixtures/wiring-gap/mock-command.md');

  // Mock skill must declare integration test artifact
  assert.match(mockSkill, /^## Required Artifacts$/m);
  assert.match(mockSkill, /integration/i, 'Mock skill must require integration test artifact');

  // Mock command must NOT have integration path in Output (deliberate gap)
  const outputSection = extractSection(mockCommand, /^## Output$/);
  assert.ok(outputSection !== null, 'Mock command must have Output section');
  assert.doesNotMatch(
    outputSection,
    /tests\/integration/,
    'Mock command Output must not contain tests/integration/ (deliberate gap for AC11)'
  );
});

// ---------------------------------------------------------------------------
// F4: extractSection must not truncate on sub-headings deeper than target
// ---------------------------------------------------------------------------

test('F4: extractSection includes sub-headings deeper than the target heading', () => {
  // A ## Required Artifacts section may contain ### Notes sub-headings.
  // extractSection must only break on headings of same or shallower depth,
  // not on deeper sub-headings inside the section.
  const markdown = [
    '# Skill: Example',
    '',
    '## Required Artifacts',
    '',
    '| Artifact | Pattern | Path | Condition |',
    '|----------|---------|------|-----------|',
    '| Unit test | [feature].unit.test.* | tests/unit/ | |',
    '',
    '### Notes',
    '',
    '| Artifact | Pattern | Path | Condition |',
    '|----------|---------|------|-----------|',
    '| Integration test | [feature].integration.test.* | tests/integration/ | Phase 5 only |',
    '',
    '## Anti-Patterns',
    '',
    'Do not do this.',
  ].join('\n');

  const section = extractSection(markdown, /^## Required Artifacts$/);
  assert.ok(section !== null, 'Section must be found');

  // The section must include content after the ### Notes sub-heading
  assert.ok(
    section.includes('Integration test'),
    `Section must include content after ### sub-heading, got:\n${section}`
  );

  // The section must NOT include content from the next ## heading
  assert.ok(
    !section.includes('Do not do this'),
    'Section must stop before the next same-level ## heading'
  );
});

// ---------------------------------------------------------------------------
// F1: Missing skill file throws named error, not raw ENOENT
// ---------------------------------------------------------------------------

test('F1: checkCommandSkillWiring throws named error when skill file does not exist', () => {
  // The exists() helper is available but was not used before read() in
  // checkCommandSkillWiring. A missing skill file must produce a descriptive
  // error naming the command and skill, not a raw ENOENT from fs.readFileSync.
  const missingSkillRef = {
    skill: 'nonexistent-skill',
    sourcePath: 'skills/nonexistent-skill/SKILL.md',
  };

  assert.throws(
    () => checkCommandSkillWiring('commands/implement.md', missingSkillRef),
    (err) => {
      // Must NOT be a raw ENOENT
      assert.notEqual(err.code, 'ENOENT',
        'Error must not be a raw ENOENT from fs.readFileSync');
      // Must name the command
      assert.ok(err.message.includes('implement.md'),
        `Error must name the command, got: ${err.message}`);
      // Must name the skill
      assert.ok(err.message.includes('nonexistent-skill'),
        `Error must name the skill, got: ${err.message}`);
      // Must mention the missing file path
      assert.ok(err.message.includes('skills/nonexistent-skill/SKILL.md'),
        `Error must mention the missing file path, got: ${err.message}`);
      return true;
    },
    'Missing skill file must throw a named error, not raw ENOENT (F1)'
  );
});

// ---------------------------------------------------------------------------
// Codex Finding 1: blank Pattern cell must not bypass wiring check
// ---------------------------------------------------------------------------

test('AC3: parseRequiredArtifacts rejects data row with blank Pattern cell (fail-open bypass)', () => {
  // A blank Pattern cell parses as "" and outputSection.includes('') is always true,
  // silently passing the wiring check for any command text. This is a fail-open path
  // that violates AC3 (malformed tables must throw).
  const blankPatternSkill = [
    '# Skill: Blank Pattern',
    '',
    '## Required Artifacts',
    '',
    '| Artifact | Pattern | Path | Condition |',
    '|----------|---------|------|-----------|',
    '| Integration test |  | tests/integration/ | |',
  ].join('\n');

  assert.throws(
    () => parseRequiredArtifacts(blankPatternSkill, 'blank-pattern-skill'),
    (err) => {
      assert.ok(err.message.includes('blank-pattern-skill'),
        `Error must name the skill, got: ${err.message}`);
      assert.ok(
        err.message.toLowerCase().includes('pattern') ||
        err.message.toLowerCase().includes('blank') ||
        err.message.toLowerCase().includes('empty'),
        `Error must describe the blank cell, got: ${err.message}`
      );
      return true;
    },
    'Blank Pattern cell must throw a parse error, not silently pass (Codex finding 1)'
  );
});

test('AC3: parseRequiredArtifacts rejects data row with blank Path cell', () => {
  const blankPathSkill = [
    '# Skill: Blank Path',
    '',
    '## Required Artifacts',
    '',
    '| Artifact | Pattern | Path | Condition |',
    '|----------|---------|------|-----------|',
    '| Integration test | [feature].integration.test.* |  | |',
  ].join('\n');

  assert.throws(
    () => parseRequiredArtifacts(blankPathSkill, 'blank-path-skill'),
    (err) => {
      assert.ok(err.message.includes('blank-path-skill'),
        `Error must name the skill, got: ${err.message}`);
      return true;
    },
    'Blank Path cell must throw a parse error (Codex finding 1 — related)'
  );
});

// ---------------------------------------------------------------------------
// Codex Finding 2: blank Source path must not cause raw EISDIR
// ---------------------------------------------------------------------------

test('parseSkillReferences rejects row with blank Source path (EISDIR bypass)', () => {
  // A blank sourcePath parses as "", exists('') resolves to repo root (true),
  // and read('') throws raw EISDIR. Must throw a descriptive error instead.
  const blankSourcePathCommand = [
    '# Command: Bad Refs',
    '',
    '## Skill References',
    '',
    '| Skill | Source path |',
    '|-------|-------------|',
    '| tdd | |',
  ].join('\n');

  assert.throws(
    () => parseSkillReferences(blankSourcePathCommand, 'bad-refs.md'),
    (err) => {
      assert.ok(err.message.includes('bad-refs.md'),
        `Error must name the command, got: ${err.message}`);
      assert.ok(err.message.includes('tdd'),
        `Error must name the skill, got: ${err.message}`);
      assert.notEqual(err.code, 'EISDIR',
        'Error must not be a raw EISDIR from fs operations');
      return true;
    },
    'Blank Source path must throw a descriptive error, not raw EISDIR (Codex finding 2)'
  );
});

// ---------------------------------------------------------------------------
// AC3: Malformed artifact registry produces parse error naming the skill
// ---------------------------------------------------------------------------

test('AC3: malformed Required Artifacts table produces descriptive parse error', () => {
  // Skill with Required Artifacts section but missing required columns
  const malformedSkillText = [
    '# Skill: Malformed',
    '',
    '## Required Artifacts',
    '',
    '| Artifact | Pattern |',
    '|----------|---------|',
    '| Test file | [feature].test.* |',
  ].join('\n');

  assert.throws(
    () => parseRequiredArtifacts(malformedSkillText, 'malformed-skill'),
    (err) => {
      assert.ok(
        err.message.includes('malformed-skill'),
        `Error must name the skill, got: ${err.message}`
      );
      assert.ok(
        err.message.toLowerCase().includes('malform') ||
        err.message.toLowerCase().includes('missing') ||
        err.message.toLowerCase().includes('column'),
        `Error must describe the malformation, got: ${err.message}`
      );
      return true;
    },
    'Malformed Required Artifacts table must throw a parse error naming the skill (AC3)'
  );
});

test('AC3: skill with Required Artifacts section but no data rows throws parse error', () => {
  const noDataRowsSkill = [
    '# Skill: No Data',
    '',
    '## Required Artifacts',
    '',
    '| Artifact | Pattern | Path | Condition |',
    '|----------|---------|------|-----------|',
  ].join('\n');

  assert.throws(
    () => parseRequiredArtifacts(noDataRowsSkill, 'no-data-skill'),
    /no-data-skill/,
    'Skill with no data rows must throw a parse error naming the skill (AC3)'
  );
});

// ---------------------------------------------------------------------------
// AC10: No regression -- existing tests pass
// ---------------------------------------------------------------------------

test('AC10: existing test infrastructure files are not disturbed', () => {
  const existingTests = [
    'tests/node/core-skill-contracts.test.js',
    'tests/node/pipeline-handoff-guards.test.js',
    'tests/node/checkpoint.test.js',
    'tests/node/resolve-feature.test.js',
  ];

  for (const testFile of existingTests) {
    assert.ok(exists(testFile), `Existing test file must still exist: ${testFile}`);
  }
});

// ---------------------------------------------------------------------------
// Structural: ## Skill References table in commands that load skills
// ---------------------------------------------------------------------------

test('Structural: commands/test-design.md has Skill References table with tdd skill', () => {
  const testDesign = read('commands/test-design.md');

  assert.match(
    testDesign,
    /^## Skill References$/m,
    'commands/test-design.md must have a ## Skill References section'
  );

  assert.match(
    testDesign,
    /tdd/i,
    'commands/test-design.md Skill References must include tdd'
  );
});

test('Structural: commands/implement.md has Skill References table with tdd skill', () => {
  const implement = read('commands/implement.md');

  assert.match(
    implement,
    /^## Skill References$/m,
    'commands/implement.md must have a ## Skill References section'
  );

  assert.match(
    implement,
    /tdd/i,
    'commands/implement.md Skill References must include tdd'
  );
});

test('Structural: fail-closed bypass edge case -- key commands have explicit Skill References tables', () => {
  // SECURITY NOTE: The MEDIUM finding from the security audit notes that indirect skill
  // loading (e.g., via a helper script) would bypass the fail-closed heuristic.
  // This test documents the assumption: all commands that load skills must use
  // `skills/` or `.claude/skills/` paths directly in their prose.
  //
  // Verify that the two primary skill-loading commands (test-design, implement)
  // both have explicit ## Skill References tables -- no reliance on prose-scanning heuristic.
  const testDesign = read('commands/test-design.md');
  const implement = read('commands/implement.md');

  assert.match(testDesign, /^## Skill References$/m,
    'test-design.md must have explicit ## Skill References table (not rely on prose heuristic)');
  assert.match(implement, /^## Skill References$/m,
    'implement.md must have explicit ## Skill References table (not rely on prose heuristic)');
});

// ---------------------------------------------------------------------------
// invariants-audit: AC4 — Claude commands Skill References table wiring
// Feature: invariants-audit
// Production-wiring seam: commands/* -> skills/invariants-audit/SKILL.md
// RED state: skills/invariants-audit/SKILL.md does not exist yet; commands
//            do not yet have a Skill References row for invariants-audit.
// ---------------------------------------------------------------------------

test('AC4 (invariants-audit): commands/review.md has Skill References row for invariants-audit', () => {
  const content = read('commands/review.md');
  assert.match(
    content,
    /^## Skill References$/m,
    'commands/review.md must have a ## Skill References section'
  );
  assert.match(
    content,
    /invariants-audit/,
    'commands/review.md Skill References table must include a row for invariants-audit (AC4)'
  );
  assert.match(
    content,
    /skills\/invariants-audit\/SKILL\.md/,
    'commands/review.md Skill References row must reference skills/invariants-audit/SKILL.md (AC4)'
  );
});

test('AC4 (invariants-audit): commands/architect.md has Skill References row for invariants-audit', () => {
  const content = read('commands/architect.md');
  assert.match(
    content,
    /^## Skill References$/m,
    'commands/architect.md must have a ## Skill References section'
  );
  assert.match(
    content,
    /invariants-audit/,
    'commands/architect.md Skill References table must include a row for invariants-audit (AC4)'
  );
  assert.match(
    content,
    /skills\/invariants-audit\/SKILL\.md/,
    'commands/architect.md Skill References row must reference skills/invariants-audit/SKILL.md (AC4)'
  );
});

test('AC4 (invariants-audit): commands/security-gate.md has Skill References row for invariants-audit', () => {
  const content = read('commands/security-gate.md');
  assert.match(
    content,
    /^## Skill References$/m,
    'commands/security-gate.md must have a ## Skill References section'
  );
  assert.match(
    content,
    /invariants-audit/,
    'commands/security-gate.md Skill References table must include a row for invariants-audit (AC4)'
  );
  assert.match(
    content,
    /skills\/invariants-audit\/SKILL\.md/,
    'commands/security-gate.md Skill References row must reference skills/invariants-audit/SKILL.md (AC4)'
  );
});

test('AC4 (invariants-audit): commands/test-design.md has Skill References row for invariants-audit', () => {
  const content = read('commands/test-design.md');
  assert.match(
    content,
    /^## Skill References$/m,
    'commands/test-design.md must have a ## Skill References section'
  );
  assert.match(
    content,
    /invariants-audit/,
    'commands/test-design.md Skill References table must include a row for invariants-audit (AC4)'
  );
  assert.match(
    content,
    /skills\/invariants-audit\/SKILL\.md/,
    'commands/test-design.md Skill References row must reference skills/invariants-audit/SKILL.md (AC4)'
  );
});

// ---------------------------------------------------------------------------
// invariants-audit: AC5 — Codex reviewer ## Invariant Checks section present
// ---------------------------------------------------------------------------

test('AC5 (invariants-audit): codex/reviewers/review-code.md has ## Invariant Checks section', () => {
  const content = read('codex/reviewers/review-code.md');
  assert.match(
    content,
    /^## Invariant Checks$/m,
    'codex/reviewers/review-code.md must have a ## Invariant Checks section (AC5)'
  );
});

test('AC5 (invariants-audit): codex/reviewers/review-prd.md has ## Invariant Checks section', () => {
  const content = read('codex/reviewers/review-prd.md');
  assert.match(
    content,
    /^## Invariant Checks$/m,
    'codex/reviewers/review-prd.md must have a ## Invariant Checks section (AC5)'
  );
});

test('AC5 (invariants-audit): codex/reviewers/review-architecture.md has ## Invariant Checks section', () => {
  const content = read('codex/reviewers/review-architecture.md');
  assert.match(
    content,
    /^## Invariant Checks$/m,
    'codex/reviewers/review-architecture.md must have a ## Invariant Checks section (AC5)'
  );
});

test('AC5 (invariants-audit): codex/reviewers/review-test-design.md has ## Invariant Checks section', () => {
  const content = read('codex/reviewers/review-test-design.md');
  assert.match(
    content,
    /^## Invariant Checks$/m,
    'codex/reviewers/review-test-design.md must have a ## Invariant Checks section (AC5)'
  );
});

// ---------------------------------------------------------------------------
// invariants-audit: AC5 — Apply when: trigger present in each reviewer
// ---------------------------------------------------------------------------

test('AC5 (invariants-audit): codex/reviewers/review-code.md Invariant Checks has Apply when: trigger', () => {
  const content = read('codex/reviewers/review-code.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-code.md must have ## Invariant Checks section to check trigger'
  );
  assert.match(
    section,
    /\*\*Apply when:\*\*/,
    'codex/reviewers/review-code.md ## Invariant Checks must contain an **Apply when:** trigger (AC5)'
  );
});

test('AC5 (invariants-audit): codex/reviewers/review-prd.md Invariant Checks has Apply when: trigger', () => {
  const content = read('codex/reviewers/review-prd.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-prd.md must have ## Invariant Checks section to check trigger'
  );
  assert.match(
    section,
    /\*\*Apply when:\*\*/,
    'codex/reviewers/review-prd.md ## Invariant Checks must contain an **Apply when:** trigger (AC5)'
  );
});

test('AC5 (invariants-audit): codex/reviewers/review-architecture.md Invariant Checks has Apply when: trigger', () => {
  const content = read('codex/reviewers/review-architecture.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-architecture.md must have ## Invariant Checks section to check trigger'
  );
  assert.match(
    section,
    /\*\*Apply when:\*\*/,
    'codex/reviewers/review-architecture.md ## Invariant Checks must contain an **Apply when:** trigger (AC5)'
  );
});

test('AC5 (invariants-audit): codex/reviewers/review-test-design.md Invariant Checks has Apply when: trigger', () => {
  const content = read('codex/reviewers/review-test-design.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-test-design.md must have ## Invariant Checks section to check trigger'
  );
  assert.match(
    section,
    /\*\*Apply when:\*\*/,
    'codex/reviewers/review-test-design.md ## Invariant Checks must contain an **Apply when:** trigger (AC5)'
  );
});

// ---------------------------------------------------------------------------
// invariants-audit: AC5 / AC6 — ### Invariant Analysis output instruction inside Invariant Checks
// Each reviewer's ## Invariant Checks section must instruct the reviewer to emit
// `### Invariant Analysis` in the review output when triggers match.
// Regex /emit.*###.*Invariant Analysis/i confirms the prose instruction is present,
// not just the backtick-quoted marker text.
// ---------------------------------------------------------------------------

test('AC6 (invariants-audit): codex/reviewers/review-code.md Invariant Checks references ### Invariant Analysis marker', () => {
  const content = read('codex/reviewers/review-code.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-code.md must have ## Invariant Checks section'
  );
  assert.match(
    section,
    /emit.*###.*Invariant Analysis/i,
    'reviewer is instructed to emit `### Invariant Analysis` marker in output (AC6 output-instruction check, review-code.md)'
  );
});

test('AC6 (invariants-audit): codex/reviewers/review-prd.md Invariant Checks references ### Invariant Analysis marker', () => {
  const content = read('codex/reviewers/review-prd.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-prd.md must have ## Invariant Checks section'
  );
  assert.match(
    section,
    /emit.*###.*Invariant Analysis/i,
    'reviewer is instructed to emit `### Invariant Analysis` marker in output (AC6 output-instruction check, review-prd.md)'
  );
});

test('AC6 (invariants-audit): codex/reviewers/review-architecture.md Invariant Checks references ### Invariant Analysis marker', () => {
  const content = read('codex/reviewers/review-architecture.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-architecture.md must have ## Invariant Checks section'
  );
  assert.match(
    section,
    /emit.*###.*Invariant Analysis/i,
    'reviewer is instructed to emit `### Invariant Analysis` marker in output (AC6 output-instruction check, review-architecture.md)'
  );
});

test('AC6 (invariants-audit): codex/reviewers/review-test-design.md Invariant Checks references ### Invariant Analysis marker', () => {
  const content = read('codex/reviewers/review-test-design.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-test-design.md must have ## Invariant Checks section'
  );
  assert.match(
    section,
    /emit.*###.*Invariant Analysis/i,
    'reviewer is instructed to emit `### Invariant Analysis` marker in output (AC6 output-instruction check, review-test-design.md)'
  );
});

// ---------------------------------------------------------------------------
// invariants-audit: AC6 — Structural anchors in SKILL.md
// ---------------------------------------------------------------------------

test('AC6 (invariants-audit): SKILL.md has required ## Review Categories structural anchor', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  assert.match(
    content,
    /^## Review Categories$/m,
    'skills/invariants-audit/SKILL.md must have a ## Review Categories heading (AC6 structural anchor)'
  );
});

test('AC6 (invariants-audit): SKILL.md has required ## Invariant Review Method structural anchor', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  assert.match(
    content,
    /^## Invariant Review Method$/m,
    'skills/invariants-audit/SKILL.md must have a ## Invariant Review Method heading (AC6 structural anchor)'
  );
});

test('AC6 (invariants-audit): SKILL.md has required ## When to Use structural anchor', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  assert.match(
    content,
    /^## When to Use$/m,
    'skills/invariants-audit/SKILL.md must have a ## When to Use heading (AC6 structural anchor)'
  );
});

// ---------------------------------------------------------------------------
// invariants-audit: AC6 — Stop conditions footer present in SKILL.md
// ---------------------------------------------------------------------------

test('AC6 (invariants-audit): SKILL.md has stop conditions footer (pipeline-gating requirement)', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  assert.match(
    content,
    /\*\*STOP CONDITIONS/,
    'skills/invariants-audit/SKILL.md must end with **STOP CONDITIONS footer (AC6)'
  );
});

// ---------------------------------------------------------------------------
// invariants-audit: AC6 — Sibling reference resolution
// All [See reference: ...] links in SKILL.md must resolve to existing files
// ---------------------------------------------------------------------------

test('AC6 (invariants-audit): all [See reference: ...] links in SKILL.md resolve to existing files', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  const refPattern = /\[See reference:\s*([^\]]+)\]/g;
  let match;
  const missingRefs = [];

  while ((match = refPattern.exec(content)) !== null) {
    const refPath = match[1].trim();
    if (!exists(refPath)) {
      missingRefs.push(refPath);
    }
  }

  assert.deepEqual(
    missingRefs,
    [],
    `skills/invariants-audit/SKILL.md has broken [See reference:] links: ${missingRefs.join(', ')} (AC6)`
  );
});

// ---------------------------------------------------------------------------
// invariants-audit: AC5 — Checklist item in ## Invariant Checks section
// L2 FIX: PRD AC6 requires "at least one checklist item derived from the review
// categories (AC2)". The section heading and Apply when: trigger are tested above.
// This block adds the missing structural check for at least one markdown list item
// (line starting with "- ") within the ## Invariant Checks section of each reviewer.
// ---------------------------------------------------------------------------

test('AC5 (invariants-audit): codex/reviewers/review-code.md Invariant Checks has at least one checklist item', () => {
  const content = read('codex/reviewers/review-code.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-code.md must have ## Invariant Checks section to check for checklist items'
  );
  assert.match(
    section,
    /^- /m,
    'codex/reviewers/review-code.md ## Invariant Checks must contain at least one checklist item (line starting with "- ") derived from AC2 categories (AC5/L2)'
  );
});

test('AC5 (invariants-audit): codex/reviewers/review-prd.md Invariant Checks has at least one checklist item', () => {
  const content = read('codex/reviewers/review-prd.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-prd.md must have ## Invariant Checks section to check for checklist items'
  );
  assert.match(
    section,
    /^- /m,
    'codex/reviewers/review-prd.md ## Invariant Checks must contain at least one checklist item (line starting with "- ") derived from AC2 categories (AC5/L2)'
  );
});

test('AC5 (invariants-audit): codex/reviewers/review-architecture.md Invariant Checks has at least one checklist item', () => {
  const content = read('codex/reviewers/review-architecture.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-architecture.md must have ## Invariant Checks section to check for checklist items'
  );
  assert.match(
    section,
    /^- /m,
    'codex/reviewers/review-architecture.md ## Invariant Checks must contain at least one checklist item (line starting with "- ") derived from AC2 categories (AC5/L2)'
  );
});

test('AC5 (invariants-audit): codex/reviewers/review-test-design.md Invariant Checks has at least one checklist item', () => {
  const content = read('codex/reviewers/review-test-design.md');
  const section = extractSection(content, /^## Invariant Checks$/);
  assert.ok(
    section !== null,
    'codex/reviewers/review-test-design.md must have ## Invariant Checks section to check for checklist items'
  );
  assert.match(
    section,
    /^- /m,
    'codex/reviewers/review-test-design.md ## Invariant Checks must contain at least one checklist item (line starting with "- ") derived from AC2 categories (AC5/L2)'
  );
});
