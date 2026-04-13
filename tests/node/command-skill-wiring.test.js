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

const ROOT_DIR = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

/**
 * Extract the body of a markdown section (lines after the heading until the next heading).
 * Returns null if the section heading is not found.
 * Uses line-by-line parsing to avoid the \z anchor limitation in JavaScript regex.
 *
 * @param {string} text - full file text
 * @param {RegExp} headingRe - regex to match the heading line (anchored to line start)
 * @returns {string|null}
 */
function extractSection(text, headingRe) {
  const lines = text.split('\n');
  let inSection = false;
  const sectionLines = [];
  for (const line of lines) {
    if (headingRe.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,6} /.test(line)) {
      break;
    }
    if (inSection) {
      sectionLines.push(line);
    }
  }
  return inSection ? sectionLines.join('\n') : null;
}

/**
 * Stage 1: Parse ## Skill References table from a command file.
 * Returns an array of { skill, sourcePath } objects.
 *
 * Fail-closed rule: if the command text contains `skills/` or `.claude/skills/`
 * prose but has no ## Skill References section, throws a descriptive error.
 *
 * @param {string} commandText - full text of the command file
 * @param {string} commandName - file name for error messages
 * @returns {{ skill: string, sourcePath: string }[]}
 */
function parseSkillReferences(commandText, commandName) {
  const hasSkillRefSection = /^## Skill References$/m.test(commandText);

  // Fail-closed: scan for skill-loading prose
  const hasSkillProse = /skills\/|\.claude\/skills\//m.test(commandText);

  if (!hasSkillRefSection && hasSkillProse) {
    throw new Error(
      `Command '${commandName}' appears to load skills but has no ## Skill References table`
    );
  }

  if (!hasSkillRefSection) {
    // No skills referenced -- genuinely no skills to check, skip silently
    return [];
  }

  // Extract the section text between ## Skill References and the next ## heading
  const sectionText = extractSection(commandText, /^## Skill References$/);
  if (sectionText === null) {
    return [];
  }

  const rows = [];

  // Parse markdown table rows (skip header and separator rows)
  for (const line of sectionText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) {
      continue;
    }
    // Skip separator rows like |---|---|
    if (/^\|[-| ]+\|$/.test(trimmed)) {
      continue;
    }
    // Skip header row (contains column names Skill | Source path)
    if (/\|\s*Skill\s*\|/i.test(trimmed)) {
      continue;
    }

    const cols = trimmed.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      rows.push({ skill: cols[0], sourcePath: cols[1] });
    }
  }

  return rows;
}

/**
 * Stage 2: Parse ## Required Artifacts table from a skill file.
 * Returns null if no section present (AC7: skip gracefully).
 * Throws descriptive parse error if section is present but malformed (AC3).
 *
 * @param {string} skillText - full text of the skill file
 * @param {string} skillName - skill name for error messages
 * @returns {null | { artifact: string, pattern: string, paths: string[], condition: string }[]}
 */
function parseRequiredArtifacts(skillText, skillName) {
  const hasSection = /^## Required Artifacts$/m.test(skillText);

  if (!hasSection) {
    // AC7: no section -- skip, no wiring to verify
    return null;
  }

  // Extract section text (line-by-line to avoid \z anchor issue)
  const sectionText = extractSection(skillText, /^## Required Artifacts$/);
  if (sectionText === null) {
    throw new Error(
      `Skill '${skillName}': ## Required Artifacts section found but could not be extracted`
    );
  }

  const lines = sectionText.split('\n');

  // Validate header row: must contain Artifact | Pattern | Path | Condition
  const headerLine = lines.find(l => /\|\s*Artifact\s*\|/i.test(l));
  if (!headerLine) {
    throw new Error(
      `Skill '${skillName}': malformed Required Artifacts table -- missing header row with Artifact | Pattern | Path | Condition columns`
    );
  }

  const headerCols = headerLine.split('|').map(c => c.trim()).filter(Boolean);
  const requiredCols = ['Artifact', 'Pattern', 'Path', 'Condition'];
  for (const col of requiredCols) {
    if (!headerCols.some(h => h.toLowerCase() === col.toLowerCase())) {
      throw new Error(
        `Skill '${skillName}': malformed Required Artifacts table -- missing required column '${col}'`
      );
    }
  }

  // Validate separator row exists after header
  const headerIdx = lines.findIndex(l => /\|\s*Artifact\s*\|/i.test(l));
  const separatorLine = lines[headerIdx + 1] || '';
  if (!/^\|[-| ]+\|$/.test(separatorLine.trim())) {
    throw new Error(
      `Skill '${skillName}': malformed Required Artifacts table -- separator row missing after header`
    );
  }

  // Parse data rows
  const artifacts = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) {
      continue;
    }
    if (/^\|[-| ]+\|$/.test(line)) {
      continue;
    }

    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 3) {
      throw new Error(
        `Skill '${skillName}': malformed Required Artifacts table -- data row has fewer than 3 columns: '${line}'`
      );
    }

    artifacts.push({
      artifact: cols[0],
      pattern: cols[1],
      // AC9: path may be a comma-separated list of valid paths -- split them
      paths: cols[2].split(',').map(p => p.trim()).filter(Boolean),
      // AC8: Condition column is informational only -- parse but do not relax validation
      condition: cols[3] || '',
    });
  }

  if (artifacts.length === 0) {
    throw new Error(
      `Skill '${skillName}': ## Required Artifacts section is present but has no data rows`
    );
  }

  return artifacts;
}

/**
 * Stage 3: Verify that a command's Output/Deliverables section references
 * both the artifact's Pattern AND at least one of its Paths (AC9).
 * AC8: Condition column is ignored -- all artifacts receive the same check.
 *
 * @param {string} commandText - full text of the command file
 * @param {string} commandName - file name for error messages
 * @param {string} skillName - skill name for error messages
 * @param {{ artifact: string, pattern: string, paths: string[], condition: string }} artifactEntry
 */
function checkArtifactWiring(commandText, commandName, skillName, artifactEntry) {
  // Locate Output or Deliverables section (any heading level, line-by-line extraction)
  const outputSection = extractSection(commandText, /^#{1,3} (?:Output|Deliverables)$/);

  if (outputSection === null) {
    throw new Error(
      `Command '${commandName}' has no Output/Deliverables section`
    );
  }

  const { artifact, pattern, paths } = artifactEntry;

  // Check pattern (substring match within output section)
  if (!outputSection.includes(pattern)) {
    throw new Error(
      `Skill '${skillName}' requires artifact '${artifact}' (pattern: ${pattern}, path: ${paths.join(' or ')}) ` +
      `but command '${commandName}' output section does not reference the pattern`
    );
  }

  // AC9: at least one path must match (substring match within output section)
  const anyPathMatches = paths.some(p => outputSection.includes(p));
  if (!anyPathMatches) {
    throw new Error(
      `Skill '${skillName}' requires artifact '${artifact}' (pattern: ${pattern}, path: ${paths.join(' or ')}) ` +
      `but command '${commandName}' output section does not reference any of the required paths`
    );
  }
}

/**
 * Run the full 4-stage wiring check for a single (commandPath, skillRef) pair.
 * Used both by live-discovery tests and the negative fixture test.
 *
 * @param {string} commandRelPath - relative path to command file from ROOT_DIR
 * @param {{ skill: string, sourcePath: string }} skillRef - parsed skill reference
 * @returns {{ skipped: boolean, reason?: string }} - result of wiring check
 */
function checkCommandSkillWiring(commandRelPath, skillRef) {
  const commandText = read(commandRelPath);
  const commandName = path.basename(commandRelPath);
  const skillName = skillRef.skill;

  const skillText = read(skillRef.sourcePath);

  const artifacts = parseRequiredArtifacts(skillText, skillName);

  if (artifacts === null) {
    // AC7: skill has no Required Artifacts -- no wiring to verify
    return { skipped: true, reason: `Skill '${skillName}' has no required artifacts -- no wiring to verify` };
  }

  // Stage 3: check each artifact
  for (const artifactEntry of artifacts) {
    // AC8: same check for conditional and unconditional artifacts
    // The condition field is informational only -- we do NOT skip or relax based on it
    checkArtifactWiring(commandText, commandName, skillName, artifactEntry);
  }

  return { skipped: false };
}

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
