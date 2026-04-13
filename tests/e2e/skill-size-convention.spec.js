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
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

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

// --- AC7: Spot-check phase command with converted skill ---

/**
 * Simulate what a phase command does at runtime: parse the command markdown,
 * extract all skill paths it instructs the agent to read, read each skill,
 * follow [See reference: ...] links, and verify the full read chain succeeds.
 * This catches wiring errors that file-existence checks alone would miss.
 */
test('AC7: simulated command execution — full skill-loading chain works', () => {
  // 1. Find all commands that reference verification-gate
  const commandsDir = path.join(ROOT_DIR, 'commands');
  const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'));
  const referencingCommands = [];

  for (const cmdFile of commandFiles) {
    const content = fs.readFileSync(path.join(commandsDir, cmdFile), 'utf8');
    if (/verification-gate/i.test(content)) {
      referencingCommands.push(cmdFile);
    }
  }

  assert.ok(referencingCommands.length > 0,
    'At least one phase command should reference verification-gate skill');

  // 2. For each command, simulate the full read chain it would trigger
  for (const cmdFile of referencingCommands) {
    const cmdContent = fs.readFileSync(path.join(commandsDir, cmdFile), 'utf8');

    // Extract all skill paths the command tells the agent to read
    const skillReadPattern = /Read\s+([^\s]+SKILL\.md)|read\s+([^\s]+SKILL\.md)/gi;
    const skillPaths = [];
    let m;
    while ((m = skillReadPattern.exec(cmdContent)) !== null) {
      skillPaths.push((m[1] || m[2]).trim());
    }

    // Also catch the `.claude/skills/verification-gate/SKILL.md` pattern
    if (/\.claude\/skills\/verification-gate\/SKILL\.md/.test(cmdContent)) {
      const p = '.claude/skills/verification-gate/SKILL.md';
      if (!skillPaths.includes(p)) skillPaths.push(p);
    }

    // 3. Read each skill and follow its reference links (simulates runtime)
    for (const sp of skillPaths) {
      if (!/verification-gate/.test(sp)) continue;

      const absSkillPath = path.join(ROOT_DIR, sp);
      assert.ok(fs.existsSync(absSkillPath),
        `Command ${cmdFile} references ${sp} — file must exist`);

      const skillContent = fs.readFileSync(absSkillPath, 'utf8');

      // Verify parseable structure
      assert.match(skillContent, /^---\n/,
        `${sp} must start with YAML frontmatter`);
      assert.match(skillContent, /^#{1,3}\s+\S/m,
        `${sp} must have at least one markdown heading`);

      // 4. Follow every [See reference: ...] link and read the target
      const linkPattern = /\[See reference:\s*([^\]]+)\]/g;
      let linkMatch;
      while ((linkMatch = linkPattern.exec(skillContent)) !== null) {
        const refRelPath = linkMatch[1].trim();
        const refAbsPath = path.join(ROOT_DIR, refRelPath);
        assert.ok(fs.existsSync(refAbsPath),
          `Reference link in ${sp} must resolve: ${refRelPath}`);

        // Actually read the reference file — a zero-byte or unparseable file is a wiring bug
        const refContent = fs.readFileSync(refAbsPath, 'utf8');
        assert.ok(refContent.trim().length > 0,
          `Reference file ${refRelPath} must have non-empty content`);
      }
    }
  }
});

test('AC7: verification-gate phase verification commands are syntactically valid shell', () => {
  // Extract all fenced bash blocks from SKILL.md and reference files
  const skillDir = path.join(ROOT_DIR, 'skills', 'verification-gate');
  const allFiles = fs.readdirSync(skillDir).filter(f => f.endsWith('.md'));
  const bashBlocks = [];

  for (const file of allFiles) {
    const content = fs.readFileSync(path.join(skillDir, file), 'utf8');
    const blockPattern = /```bash\n([\s\S]*?)```/g;
    let blockMatch;
    while ((blockMatch = blockPattern.exec(content)) !== null) {
      bashBlocks.push({ file, code: blockMatch[1] });
    }
  }

  assert.ok(bashBlocks.length > 0,
    'verification-gate should contain at least one bash code block');

  // Syntax-check each block with bash -n (parse only, no execution)
  for (const block of bashBlocks) {
    try {
      execSync(`bash -n <<'SKILL_SYNTAX_CHECK'\n${block.code}\nSKILL_SYNTAX_CHECK`, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        timeout: 5000,
      });
    } catch (err) {
      assert.fail(
        `Bash syntax error in ${block.file}:\n${err.stderr?.toString() || err.message}`
      );
    }
  }
});

test('AC7: verification-gate skill content is reachable from installed path through refs', () => {
  // The runtime path is: command → installed SKILL.md → [See reference: ...] → ref files
  // This test walks the full chain from the installed copy, not just source.
  const installedSkill = path.join(ROOT_DIR, '.claude', 'skills', 'verification-gate', 'SKILL.md');
  assert.ok(fs.existsSync(installedSkill), 'Installed SKILL.md must exist');

  const content = fs.readFileSync(installedSkill, 'utf8');
  const linkPattern = /\[See reference:\s*([^\]]+)\]/g;
  let match;
  const refsLoaded = [];

  while ((match = linkPattern.exec(content)) !== null) {
    const refPath = match[1].trim();
    const absRef = path.join(ROOT_DIR, refPath);
    assert.ok(fs.existsSync(absRef),
      `Installed skill references ${refPath} — must exist at runtime`);

    const refContent = fs.readFileSync(absRef, 'utf8');
    assert.ok(refContent.trim().length > 0,
      `Referenced file ${refPath} must be non-empty`);
    refsLoaded.push(refPath);
  }

  // At least one ref must be loaded for a progressive-disclosure skill
  assert.ok(refsLoaded.length > 0,
    'Installed verification-gate must have at least one loadable reference link');
});

test('AC7: manual smoke-test script exists for real CLI execution', () => {
  // AC7 requires a spot-check run of an actual phase command using the converted
  // verification-gate skill. This cannot be automated without making real API calls
  // (claude -p has no dry-run mode), so we verify that a manual smoke-test script
  // exists with the correct invocation for a human or CI job with API access to run.
  const scriptPath = path.join(ROOT_DIR, 'tests', 'manual', 'ac7-smoke-test.sh');
  assert.ok(fs.existsSync(scriptPath),
    'tests/manual/ac7-smoke-test.sh must exist for manual AC7 verification');

  const script = fs.readFileSync(scriptPath, 'utf8');

  // Script must invoke a phase command that loads verification-gate
  assert.match(script, /claude.*-p|claude.*--print/,
    'Smoke test must invoke claude CLI in print mode');
  assert.match(script, /verification-gate|security-gate|implement/,
    'Smoke test must target a command that loads verification-gate skill');

  // Script must check for errors
  assert.match(script, /exit|set -e|\$\?/,
    'Smoke test must check exit status');
});
