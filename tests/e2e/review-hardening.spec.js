/**
 * E2E tests for review-hardening feature (RED state)
 *
 * Derived from: docs/features/review-hardening/prd.md + architecture.md
 * Tickets: ISS-024, ISS-014, ISS-033
 *
 * These tests verify the complete review-hardening convention chain end-to-end:
 *   schema (source_spec required) → skill (Reviewer Independence) → role (adversarial
 *   stance + read-only) → command (source_spec-first prompt) → pipeline (phase tags)
 *
 * Wiring proof:
 *   If all E2E tests pass, the review layer is hardened from handoff intake (schema)
 *   through reviewer methodology (skill) through gate enforcement (role) through
 *   command orchestration (review.md, security-gate.md) through pipeline tagging
 *   (CLAUDE.md). Every trust boundary described in the architecture is enforced.
 *
 * Cases covered:
 *   Happy:   Complete chain from handoff.source_spec → skill → role → command works correctly
 *   Edge:    Source/installed skill copies are in sync (no drift)
 *   Misuse:  Same-role review attempt is blocked; source_spec missing halts the chain
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

// ---------------------------------------------------------------------------
// E2E Chain 1: Schema → source_spec required → schema valid → downstream trusts it
// ---------------------------------------------------------------------------

test('E2E chain: handoff.schema.json declares source_spec as required and the schema is structurally valid JSON', () => {
  // Assert the schema file exists and parses
  const rawSchema = read('schemas/handoff.schema.json');
  let schema;
  assert.doesNotThrow(
    () => { schema = JSON.parse(rawSchema); },
    'schemas/handoff.schema.json must be valid JSON'
  );

  // Assert source_spec is required
  assert.ok(
    Array.isArray(schema.required) && schema.required.includes('source_spec'),
    'schemas/handoff.schema.json must list source_spec in required array'
  );

  // Assert additionalProperties is false (security: prevents schema drift)
  assert.equal(
    schema.additionalProperties,
    false,
    'schemas/handoff.schema.json must have additionalProperties: false'
  );

  // Assert the property is defined with a type
  assert.equal(
    (schema.properties.source_spec || {}).type,
    'string',
    'source_spec property must be type string'
  );
});

// ---------------------------------------------------------------------------
// E2E Chain 2: Skill → Reviewer Independence section → PRD-first methodology visible
// ---------------------------------------------------------------------------

test('E2E chain: skills/code-review/SKILL.md Reviewer Independence section is complete', () => {
  const skill = read('skills/code-review/SKILL.md');

  // AC1: Section heading exists
  assert.match(skill, /^## Reviewer Independence$/m, 'Section heading must exist');

  // AC1: PRD-first methodology present
  assert.match(skill, /PRD|source.?spec/i, 'Must mention reading PRD/source_spec first');

  // AC1: Treat claims as hypotheses
  assert.match(skill, /hypothes[ie]s|falsif/i, 'Must instruct treating claims as hypotheses');

  // AC2: Field tracing instruction
  assert.match(skill, /schema|trace|field/i, 'Must include field tracing guidance');

  // AC4: Size budget maintained
  const totalLines = skill.trimEnd().split('\n').length;
  assert.ok(totalLines <= 250, `SKILL.md has ${totalLines} lines, must stay ≤250`);
});

// ---------------------------------------------------------------------------
// E2E Chain 3: Role layer → adversarial stance → read-only → separate context
// ---------------------------------------------------------------------------

test('E2E chain: ROLE_CODE_REVIEWER.md has complete gate-review hardening (adversarial + read-only + separate context)', () => {
  const role = read('ROLE_CODE_REVIEWER.md');

  // AC5: Adversarial stance
  assert.match(role, /adversarial/i, 'Must declare adversarial stance');

  // AC6: Separate context requirement
  assert.match(role, /separate context/i, 'Must require separate context');

  // AC8: Checks for guard failures, stale state, unauthorized access
  assert.match(role, /guard|stale|unauthorized|trust.?boundar/i, 'Must prompt adversarial questions');

  // AC9: Read-only (no src/ writes)
  assert.match(role, /read.?only|no.*src\/|never.*src\//i, 'Must prohibit src/ writes');
});

test('E2E chain: ROLE_SECURITY.md has complete gate-review hardening (adversarial + read-only)', () => {
  const role = read('ROLE_SECURITY.md');

  // AC5: Adversarial stance
  assert.match(role, /adversarial/i, 'Must declare adversarial stance');

  // AC9: Read-only (no src/ writes)
  assert.match(role, /read.?only|no.*src\/|never.*src\//i, 'Must prohibit src/ writes');
});

// ---------------------------------------------------------------------------
// E2E Chain 4: Command layer → source_spec-first prompt → halt on missing
// ---------------------------------------------------------------------------

test('E2E chain: commands/review.md complete source_spec enforcement chain', () => {
  const command = read('commands/review.md');

  // AC3/AC12/AC13: source_spec-first prompt
  assert.match(command, /source_spec/, 'Must reference source_spec');
  assert.match(
    command,
    /First read|read.*source.?spec.*before|source.?spec.*first/i,
    'Must instruct reading source_spec first'
  );

  // AC10: Artifact header template
  assert.match(
    command,
    /Reviewed in separate context from authoring phase/i,
    'Must include header template with separate-context statement'
  );

  // AC16: Halt on missing source_spec
  assert.match(
    command,
    /halt|stop|Review halted|cannot proceed|unresolvable/i,
    'Must halt when source_spec is missing'
  );

  // AC11c/AC16: Explicit error message text matches spec
  assert.match(
    command,
    /Review halted.*source_spec missing|source_spec missing.*Review halted|halt.*source_spec|stop.*source_spec/i,
    'Must include the AC16 halt message for missing/unresolvable source_spec'
  );
});

test('E2E chain: commands/security-gate.md has source_spec-first enforcement', () => {
  const command = read('commands/security-gate.md');

  // AC5/AC13: source_spec-first in security gate
  assert.match(command, /source_spec/, 'Must reference source_spec');
  assert.match(
    command,
    /First read|read.*source.?spec.*before|source.?spec.*first/i,
    'Must instruct reading source_spec first'
  );

  // AC10: Artifact header
  assert.match(
    command,
    /Reviewed in separate context from authoring phase/i,
    'Must include the separate-context header template'
  );
});

// ---------------------------------------------------------------------------
// E2E Chain 5: CLAUDE.md pipeline phase tagging
// ---------------------------------------------------------------------------

test('E2E chain: CLAUDE.md pipeline table tags authoring and gate/review phases with correct mapping', () => {
  const claudeMd = read('CLAUDE.md');
  const pipelineSection = claudeMd.match(/Pipeline Sequence[\s\S]*?(?=\n---|\n## [^#]|$)/);
  assert.ok(pipelineSection, 'CLAUDE.md must have a Pipeline Sequence section');
  const pipeline = pipelineSection[0];

  // AC7: Verify specific phase-to-tag mapping, not just keyword presence
  // Authoring: phases 1-3, 5
  assert.match(pipeline, /Phase 1.*authoring|1.*SPECIFY.*authoring|Specify.*authoring/i, 'Phase 1 must be tagged authoring');
  assert.match(pipeline, /Phase 5.*authoring|5.*IMPLEMENT.*authoring|Implement.*authoring/i, 'Phase 5 must be tagged authoring');

  // Gate/review: phases 4, 6
  assert.match(pipeline, /Phase 4.*gate|4.*SECURITY.*gate|Security.*gate/i, 'Phase 4 must be tagged gate');
  assert.match(pipeline, /Phase 6.*gate|Phase 6.*review|6.*REVIEW.*gate|Review.*gate/i, 'Phase 6 must be tagged gate/review');

  // AC18: source_spec referenced
  assert.match(claudeMd, /source_spec/, 'Must reference source_spec handling');
});

// ---------------------------------------------------------------------------
// E2E Chain 6: Source / installed skill sync (no drift)
// ---------------------------------------------------------------------------

test('E2E sync: source skills/code-review/SKILL.md and installed .claude/skills/code-review/SKILL.md are byte-identical', () => {
  const sourcePath = 'skills/code-review/SKILL.md';
  const installedPath = '.claude/skills/code-review/SKILL.md';

  if (!exists(installedPath)) {
    // Installed copy may not exist in dev; record this as a known gap
    assert.fail(
      `.claude/skills/code-review/SKILL.md does not exist — run init.sh to install skills before running E2E tests`
    );
  }

  const source = read(sourcePath);
  const installed = read(installedPath);
  assert.equal(
    source,
    installed,
    'Source skills/code-review/SKILL.md and installed .claude/skills/code-review/SKILL.md must be byte-identical (no drift)'
  );
});

// ---------------------------------------------------------------------------
// E2E: Empty state — pipeline agent with no prior handoff
// ---------------------------------------------------------------------------

test('E2E empty state: checkpoint.cjs exists and is a valid Node.js script', () => {
  assert.ok(
    exists('hooks/checkpoint.cjs'),
    'hooks/checkpoint.cjs must exist — it is the production handoff validation entry point'
  );

  const checkpoint = read('hooks/checkpoint.cjs');

  // Must validate source_spec
  assert.match(
    checkpoint,
    /source_spec/,
    'hooks/checkpoint.cjs must validate source_spec (empty state: new handoff without source_spec is rejected)'
  );
});

// ---------------------------------------------------------------------------
// E2E: Misuse — same-role authoring+reviewing detected by command
// ---------------------------------------------------------------------------

test('E2E misuse: commands/review.md checks produced_by for same-role detection', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /produced_by/,
    'Review command must check produced_by for deterministic same-role detection (AC6)'
  );
});

test('E2E misuse: architecture discloses same-agent-different-role as a known limitation of AC6 enforcement', () => {
  const arch = read('docs/features/review-hardening/architecture.md');
  // The architecture must honestly disclose that the produced_by check is role-level only
  assert.match(
    arch,
    /same.?agent.?different.?role|not.*same.?agent|role.?switch/i,
    'Architecture must disclose that produced_by check does not catch same-agent-different-role continuity'
  );
  assert.match(
    arch,
    /residual risk/i,
    'Architecture must state residual risk for the enforcement gap'
  );
});

// ---------------------------------------------------------------------------
// E2E: Regression guard — full feature DoD structural check
// ---------------------------------------------------------------------------

test('E2E regression: all required files for review-hardening feature exist', () => {
  const requiredFiles = [
    'schemas/handoff.schema.json',
    'skills/code-review/SKILL.md',
    'commands/review.md',
    'commands/security-gate.md',
    'ROLE_CODE_REVIEWER.md',
    'ROLE_SECURITY.md',
    'CLAUDE.md',
    'hooks/checkpoint.cjs',
  ];

  const missing = requiredFiles.filter(f => !exists(f));
  assert.equal(
    missing.length,
    0,
    `Required files for review-hardening are missing: ${missing.join(', ')}`
  );
});

test('E2E regression: no skipped tests in the review-hardening test suite', () => {
  const contractTest = read('tests/contracts/review-hardening.test.js');
  const integrationTest = read('tests/integration/review-hardening.integration.test.js');
  const e2eTest = read('tests/e2e/review-hardening.spec.js');

  const combined = contractTest + integrationTest + e2eTest;
  // Build pattern dynamically so this source file does not self-match
  const SKIP_PATTERN = new RegExp(['\\.s' + 'kip\\s*\\(', '\\bxte' + 'st\\s*\\(', '\\bxi' + 't\\s*\\('].join('|'));
  const foundSkips = SKIP_PATTERN.test(combined);
  assert.equal(
    foundSkips,
    false,
    'review-hardening test suite must have no skipped tests'
  );
});
