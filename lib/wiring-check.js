/**
 * Wiring Verification: Command <-> Skill Artifact Contract Check
 *
 * Extracted from tests/node/command-skill-wiring.test.js for reuse by
 * integration tests and other consumers.
 *
 * 4-stage algorithm from docs/features/wiring-verification/architecture.md:
 *   Stage 1 -- Discovery:      parseSkillReferences
 *   Stage 2 -- Registry parse: parseRequiredArtifacts
 *   Stage 3 -- Wiring check:   checkArtifactWiring
 *   Full run:                  checkCommandSkillWiring
 *
 * Ticket: ISS-036
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

/**
 * Extract the body of a markdown section (lines after the heading until the next heading).
 * Returns null if the section heading is not found.
 *
 * @param {string} text - full file text
 * @param {RegExp} headingRe - regex to match the heading line (anchored to line start)
 * @returns {string|null}
 */
function extractSection(text, headingRe) {
  const lines = text.split('\n');
  let inSection = false;
  let sectionDepth = 0;
  const sectionLines = [];
  for (const line of lines) {
    if (headingRe.test(line)) {
      inSection = true;
      // Count the heading depth (number of leading #'s)
      const match = line.match(/^(#{1,6}) /);
      sectionDepth = match ? match[1].length : 0;
      continue;
    }
    if (inSection) {
      const headingMatch = line.match(/^(#{1,6}) /);
      if (headingMatch && headingMatch[1].length <= sectionDepth) {
        // Same depth or shallower — end of section
        break;
      }
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
  const hasSkillProse = /skills\/|\.claude\/skills\//m.test(commandText);

  if (!hasSkillRefSection && hasSkillProse) {
    throw new Error(
      `Command '${commandName}' appears to load skills but has no ## Skill References table`
    );
  }

  if (!hasSkillRefSection) {
    return [];
  }

  const sectionText = extractSection(commandText, /^## Skill References$/);
  if (sectionText === null) {
    return [];
  }

  const rows = [];

  for (const line of sectionText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    if (/^\|[-| ]+\|$/.test(trimmed)) continue;
    if (/\|\s*Skill\s*\|/i.test(trimmed)) continue;

    // Preserve blank interior cells — slice off leading/trailing pipe segments
    const cols = trimmed.split('|').map(c => c.trim()).slice(1, -1);
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
    return null;
  }

  const sectionText = extractSection(skillText, /^## Required Artifacts$/);
  if (sectionText === null) {
    throw new Error(
      `Skill '${skillName}': ## Required Artifacts section found but could not be extracted`
    );
  }

  const lines = sectionText.split('\n');

  const headerLine = lines.find(l => /\|\s*Artifact\s*\|/i.test(l));
  if (!headerLine) {
    throw new Error(
      `Skill '${skillName}': malformed Required Artifacts table -- missing header row with Artifact | Pattern | Path | Condition columns`
    );
  }

  // Split on '|' and drop leading/trailing empty segments from pipe delimiters,
  // but preserve interior blank cells (filter(Boolean) would collapse them).
  const headerCols = headerLine.split('|').map(c => c.trim()).slice(1, -1);
  const requiredCols = ['Artifact', 'Pattern', 'Path', 'Condition'];
  for (const col of requiredCols) {
    if (!headerCols.some(h => h.toLowerCase() === col.toLowerCase())) {
      throw new Error(
        `Skill '${skillName}': malformed Required Artifacts table -- missing required column '${col}'`
      );
    }
  }

  const headerIdx = lines.findIndex(l => /\|\s*Artifact\s*\|/i.test(l));
  const separatorLine = lines[headerIdx + 1] || '';
  if (!/^\|[-| ]+\|$/.test(separatorLine.trim())) {
    throw new Error(
      `Skill '${skillName}': malformed Required Artifacts table -- separator row missing after header`
    );
  }

  const artifacts = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) continue;
    if (/^\|[-| ]+\|$/.test(line)) continue;

    // Preserve blank interior cells — slice off leading/trailing pipe segments
    const cols = line.split('|').map(c => c.trim()).slice(1, -1);
    if (cols.length < 3) {
      throw new Error(
        `Skill '${skillName}': malformed Required Artifacts table -- data row has fewer than 3 columns: '${line}'`
      );
    }

    artifacts.push({
      artifact: cols[0],
      pattern: cols[1],
      paths: cols[2].split(',').map(p => p.trim()).filter(Boolean),
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
 * AC8: Condition column is informational only -- all artifacts receive the same check.
 *
 * @param {string} commandText - full text of the command file
 * @param {string} commandName - file name for error messages
 * @param {string} skillName - skill name for error messages
 * @param {{ artifact: string, pattern: string, paths: string[], condition: string }} artifactEntry
 */
function checkArtifactWiring(commandText, commandName, skillName, artifactEntry) {
  const outputSection = extractSection(commandText, /^#{1,3} (?:Output|Deliverables)$/);

  if (outputSection === null) {
    throw new Error(
      `Command '${commandName}' has no Output/Deliverables section`
    );
  }

  const { artifact, pattern, paths } = artifactEntry;

  if (!outputSection.includes(pattern)) {
    throw new Error(
      `Skill '${skillName}' requires artifact '${artifact}' (pattern: ${pattern}, path: ${paths.join(' or ')}) ` +
      `but command '${commandName}' output section does not reference the pattern`
    );
  }

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
 *
 * @param {string} commandRelPath - relative path to command file from ROOT_DIR
 * @param {{ skill: string, sourcePath: string }} skillRef - parsed skill reference
 * @returns {{ skipped: boolean, reason?: string }}
 */
function checkCommandSkillWiring(commandRelPath, skillRef) {
  const commandText = read(commandRelPath);
  const commandName = path.basename(commandRelPath);
  const skillName = skillRef.skill;

  if (!exists(skillRef.sourcePath)) {
    throw new Error(
      `Command '${commandName}' references skill '${skillName}' but file not found: ${skillRef.sourcePath}`
    );
  }

  const skillText = read(skillRef.sourcePath);

  const artifacts = parseRequiredArtifacts(skillText, skillName);

  if (artifacts === null) {
    return { skipped: true, reason: `Skill '${skillName}' has no required artifacts -- no wiring to verify` };
  }

  for (const artifactEntry of artifacts) {
    checkArtifactWiring(commandText, commandName, skillName, artifactEntry);
  }

  return { skipped: false };
}

module.exports = {
  extractSection,
  parseSkillReferences,
  parseRequiredArtifacts,
  checkArtifactWiring,
  checkCommandSkillWiring,
  read,
  exists,
  ROOT_DIR,
};
