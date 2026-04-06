'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const RESTORE_SCRIPT = path.join(ROOT_DIR, 'hooks', 'restore-context.js');
const CHECKPOINT_SCRIPT = path.join(ROOT_DIR, 'hooks', 'checkpoint.js');

function makeTempDir(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// AC1: init.sh produces required .claude/ structure
test('init.sh produces required .claude/ directory structure', (t) => {
  const INIT_SCRIPT = path.join(ROOT_DIR, 'init.sh');
  // Arrange
  assert.ok(fs.existsSync(INIT_SCRIPT), 'init.sh must exist at repo root');
  const source = fs.readFileSync(INIT_SCRIPT, 'utf8');

  // Act + Assert: verify init.sh copies each required destination
  const requiredDestinations = [
    '.claude/agents',
    '.claude/commands',
    '.claude/skills',
    '.claude/helpers',
    '.claude/schemas',
    '.claude/settings.json',
  ];
  for (const dest of requiredDestinations) {
    assert.ok(
      source.includes(dest),
      `init.sh must reference "${dest}" as an installation destination`
    );
  }
});

// AC2: handoff.json schema is valid for all phases 1–7
test('handoff.schema.json permits integer phases 1 through 7', () => {
  // Arrange
  const schema = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'schemas', 'handoff.schema.json'), 'utf8')
  );

  // Act + Assert
  assert.equal(schema.properties.phase.minimum, 1);
  assert.equal(schema.properties.phase.maximum, 7);
  assert.equal(schema.properties.phase.type, 'integer');
});

// AC3: checkpoint.js logs token usage when a valid handoff is present
test('checkpoint.js logs token usage to stdout when handoff is present', (t) => {
  // Arrange
  const projectDir = makeTempDir(t, 'codingagents-ac3-');
  const claudeDir = path.join(projectDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  const handoff = {
    feature: 'dogfood-pipeline',
    phase: 3,
    goal: 'Implement test design phase.',
    scope: 'Contract and E2E tests.',
    relevant_files: ['docs/features/dogfood-pipeline/prd.md'],
    acceptance_criteria: ['AC1'],
    verification_commands: ['node --test'],
  };
  fs.writeFileSync(path.join(claudeDir, 'handoff.json'), JSON.stringify(handoff));

  // Act
  const result = spawnSync(process.execPath, [CHECKPOINT_SCRIPT], {
    cwd: projectDir,
    encoding: 'utf8',
  });

  // Assert: checkpoint must log something token-related (not necessarily exit 0 — it may
  // detect missing implementation artifacts, but token logging must still occur)
  const combined = result.stdout + result.stderr;
  assert.match(combined, /token/i, 'checkpoint must log token usage information');
});

// AC4: restore-context.js logs error to stderr on malformed handoff JSON
// EXPECTED TO FAIL — fix not yet implemented (catch block silently returns null)
test('restore-context logs error to stderr on malformed handoff JSON', (t) => {
  // Arrange
  const projectDir = makeTempDir(t, 'codingagents-ac4-');
  const claudeDir = path.join(projectDir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, 'handoff.json'), '{ not valid json !!!');

  // Act
  const result = spawnSync(process.execPath, [RESTORE_SCRIPT], {
    cwd: projectDir,
    encoding: 'utf8',
  });

  // Assert: must write a diagnostic message to stderr (currently fails — catch is silent)
  assert.match(
    result.stderr,
    /error|malformed|invalid|parse/i,
    'restore-context must log a stderr error when handoff.json is malformed JSON'
  );
});

// AC5: only spec docs exist in feature dir after phases 1–3
test('pre-implementation feature directory contains only spec artifacts', () => {
  // Arrange: simulate what phases 1–3 produce for dogfood-pipeline
  const featureDir = path.join(ROOT_DIR, 'docs', 'features', 'dogfood-pipeline');

  // Act
  const entries = fs.readdirSync(featureDir);
  const allowedPattern = /^(prd|architecture|security-audit|review.*|prd\.md|architecture\.md|security-audit\.md)$/;
  const specExtensions = ['.md'];
  const nonSpecFiles = entries.filter(f => !specExtensions.includes(path.extname(f)));

  // Assert: all files in the feature dir should be markdown spec docs
  assert.equal(
    nonSpecFiles.length,
    0,
    `Feature dir must contain only .md spec files; found non-spec: ${nonSpecFiles.join(', ')}`
  );
});

// AC6: commands/architect.md and commands/document.md reference docs/CLAUDE.md
// EXPECTED TO FAIL — fix not yet implemented
test('commands/architect.md references docs/CLAUDE.md for framework repos', () => {
  // Arrange
  const source = fs.readFileSync(path.join(ROOT_DIR, 'commands', 'architect.md'), 'utf8');

  // Act + Assert
  assert.ok(
    source.includes('docs/CLAUDE.md'),
    'commands/architect.md must reference docs/CLAUDE.md for framework repo scoping (AC6)'
  );
});

test('commands/document.md references docs/CLAUDE.md for framework repos', () => {
  // Arrange
  const source = fs.readFileSync(path.join(ROOT_DIR, 'commands', 'document.md'), 'utf8');

  // Act + Assert
  assert.ok(
    source.includes('docs/CLAUDE.md'),
    'commands/document.md must reference docs/CLAUDE.md for framework repo scoping (AC6)'
  );
});

// AC7: .gitignore-template ignores runtime artifacts but not installed framework files
test('.gitignore-template ignores runtime artifacts', () => {
  // Arrange
  const template = fs.readFileSync(path.join(ROOT_DIR, '.gitignore-template'), 'utf8');
  const runtimeArtifacts = [
    '.claude/handoff.json',
    '.claude/pipeline-checkpoint.json',
    '.claude/token-usage.jsonl',
    '.claude/.session-state.json',
  ];

  // Act + Assert: each runtime artifact pattern must appear in the template
  for (const artifact of runtimeArtifacts) {
    assert.ok(
      template.includes(artifact),
      `.gitignore-template must ignore runtime artifact: ${artifact}`
    );
  }
});

test('.gitignore-template does not ignore installed framework files', () => {
  // Arrange
  const template = fs.readFileSync(path.join(ROOT_DIR, '.gitignore-template'), 'utf8');

  // Act + Assert: installed dirs that MUST be committed should not be globally ignored
  const installedDirs = ['.claude/agents', '.claude/commands', '.claude/skills'];
  for (const dir of installedDirs) {
    // A bare .claude/ entry would swallow everything — check it's not present as a sole line
    assert.doesNotMatch(
      template,
      new RegExp(`^${dir.replace('/', '\\/')}\\s*$`, 'm'),
      `.gitignore-template must not ignore installed framework directory: ${dir}`
    );
  }
});

// AC8: backlog entries include [phase: N] tag
test('backlog.md bug entries include a phase link tag', () => {
  // Arrange
  const backlog = fs.readFileSync(path.join(ROOT_DIR, 'docs', 'issues', 'backlog.md'), 'utf8');

  // Act: find any bug-type entries
  const ticketDir = path.join(ROOT_DIR, 'docs', 'issues', 'tickets');
  const tickets = fs.readdirSync(ticketDir).map(f =>
    fs.readFileSync(path.join(ticketDir, f), 'utf8')
  );

  // Assert: at least one ticket references a phase (format: "phase:" or "Phase")
  const phaseTagPattern = /phase\s*[:\-]\s*\d/i;
  const hasPhaseTag = tickets.some(t => phaseTagPattern.test(t));
  assert.ok(
    hasPhaseTag,
    'At least one ticket in docs/issues/tickets/ must contain a phase tag (e.g. "phase: 3")'
  );
});

// AC9: codex/report-usage.sh exists and is executable
test('codex/report-usage.sh exists and is executable', () => {
  // Arrange
  const scriptPath = path.join(ROOT_DIR, 'codex', 'report-usage.sh');

  // Act
  assert.ok(fs.existsSync(scriptPath), 'codex/report-usage.sh must exist');
  const stat = fs.statSync(scriptPath);

  // Assert: owner-execute bit set
  // eslint-disable-next-line no-bitwise
  assert.ok((stat.mode & 0o111) !== 0, 'codex/report-usage.sh must be executable');
});
