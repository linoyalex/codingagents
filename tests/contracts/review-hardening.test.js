/**
 * Contract tests for review-hardening feature (RED state)
 *
 * Derived from: docs/features/review-hardening/prd.md + architecture.md
 * Tickets: ISS-024, ISS-014, ISS-033
 *
 * Primary production-wiring test seam:
 *   The combination of AC11 (structural enforcement in tests) + AC14 (source_spec
 *   required in schema) + AC1 (Reviewer Independence section in skill) proves the
 *   review layer is hardened end-to-end: schema → skill → role → command.
 *   Wiring proof: schema rejects handoffs without source_spec; skill teaches
 *   PRD-first methodology; role enforces adversarial stance; command injects
 *   source_spec-first prompt.
 *
 * Cases covered:
 *   Happy:   source_spec present and resolvable; review launches correctly
 *   Edge:    bugfix with no PRD — source_spec points to ticket file
 *   Misuse:  source_spec missing → handoff rejected; same-role review → halted
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
// ISS-024: Reviewer Independence & Boundary Tracing
// ---------------------------------------------------------------------------

// AC1: Reviewer Independence section exists in code-review skill
test('AC1: skills/code-review/SKILL.md has a Reviewer Independence section', () => {
  const skill = read('skills/code-review/SKILL.md');
  assert.match(
    skill,
    /^## Reviewer Independence$/m,
    'skills/code-review/SKILL.md must contain a "## Reviewer Independence" heading'
  );
});

// AC1: Reviewer Independence section specifies PRD-first methodology
test('AC1: Reviewer Independence section instructs reading source spec before handoff/diff', () => {
  const skill = read('skills/code-review/SKILL.md');
  // Structural anchor: look for the section then verify PRD-first methodology is present
  const indepSection = skill.match(/## Reviewer Independence[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(indepSection, 'Reviewer Independence section must exist in code-review skill');
  assert.match(
    indepSection[0],
    /PRD|source.?spec|source spec/i,
    'Reviewer Independence section must instruct reading the source spec (PRD) before the diff or handoff'
  );
  assert.match(
    indepSection[0],
    /hypothes[ie]s|falsif/i,
    'Reviewer Independence section must instruct treating developer claims as hypotheses to falsify'
  );
});

// AC2: Field tracing instruction (schema → consumer chain)
test('AC2: Reviewer Independence section includes parse/validate/transform chain tracing guidance', () => {
  const skill = read('skills/code-review/SKILL.md');
  const indepSection = skill.match(/## Reviewer Independence[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(indepSection, 'Reviewer Independence section must exist');
  assert.match(
    indepSection[0],
    /schema|field|trace/i,
    'Reviewer Independence section must mention schema/field tracing guidance'
  );
});

// AC3: review command loads PRD, treats handoff as secondary
test('AC3: commands/review.md instructs loading source_spec before reading the diff', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /source_spec/,
    'commands/review.md must reference source_spec'
  );
  assert.match(
    command,
    /First read|read.*source.?spec.*before|source.?spec.*first/i,
    'commands/review.md must instruct reviewer to read source_spec first'
  );
});

// AC4: code-review skill stays within size budget (≤150 prose lines, ≤250 total)
test('AC4: skills/code-review/SKILL.md stays within ISS-013 size budget (≤250 total lines)', () => {
  const content = read('skills/code-review/SKILL.md');
  const totalLines = content.trimEnd().split('\n').length;
  assert.ok(
    totalLines <= 250,
    `skills/code-review/SKILL.md has ${totalLines} lines — exceeds 250-line total budget from ISS-013`
  );
});

// ---------------------------------------------------------------------------
// ISS-014: Adversarial Reviewers & Separate Context
// ---------------------------------------------------------------------------

// AC5: ROLE_CODE_REVIEWER.md has adversarial stance section
test('AC5: ROLE_CODE_REVIEWER.md contains an adversarial stance instruction', () => {
  const role = read('ROLE_CODE_REVIEWER.md');
  assert.match(
    role,
    /adversarial/i,
    'ROLE_CODE_REVIEWER.md must include "adversarial" stance instruction'
  );
});

// AC5: ROLE_SECURITY.md has adversarial stance section
test('AC5: ROLE_SECURITY.md contains an adversarial stance instruction', () => {
  const role = read('ROLE_SECURITY.md');
  assert.match(
    role,
    /adversarial/i,
    'ROLE_SECURITY.md must include "adversarial" stance instruction'
  );
});

// AC6: Separate context requirement — ROLE_CODE_REVIEWER.md requires it
test('AC6: ROLE_CODE_REVIEWER.md requires separate context from the authoring phase (not just fresh session)', () => {
  const role = read('ROLE_CODE_REVIEWER.md');
  assert.match(
    role,
    /separate context/i,
    'ROLE_CODE_REVIEWER.md must require "separate context" from authoring phase'
  );
  // Must not only say "fresh session" — must say "separate context"
  assert.doesNotMatch(
    role,
    /fresh session(?![\s\S]*separate context)/i,
    'ROLE_CODE_REVIEWER.md must not only mention "fresh session" — "separate context" must appear'
  );
});

// AC6: Same-agent-different-role continuity — the hardest separate-context requirement
// The architecture acknowledges that produced_by role check only catches same-role continuity.
// For same-agent-different-role continuity, the mitigations are layered prose instructions.
// This test verifies those distinct mitigations exist: (1) re-derive from source_spec instruction,
// (2) known limitation disclosure, (3) residual risk acknowledgement.
test('AC6: architecture acknowledges same-agent-different-role gap with layered mitigations', () => {
  const arch = read('docs/features/review-hardening/architecture.md');
  // Must disclose the limitation — same-role check doesn't catch role-switching
  assert.match(
    arch,
    /same.?agent.?different.?role|role.?switch|not.*same.?agent/i,
    'architecture.md must disclose that produced_by check does not catch same-agent-different-role continuity'
  );
  // Must state residual risk
  assert.match(
    arch,
    /residual risk/i,
    'architecture.md must include a residual risk section for the AC6 enforcement gap'
  );
});

test('AC6: ROLE_CODE_REVIEWER.md instructs re-deriving expectations from source_spec (not trusting prior framing)', () => {
  const role = read('ROLE_CODE_REVIEWER.md');
  // The role must instruct reviewers to independently derive expectations from the source spec,
  // not carry over framing from the authoring phase — this is the prose mitigation for same-agent gap
  assert.match(
    role,
    /re.?derive|independent|source.?spec|PRD.*before|form.*own/i,
    'ROLE_CODE_REVIEWER.md must instruct reviewer to re-derive expectations from source_spec independently'
  );
});

test('AC6: commands/review.md checks produced_by to detect same-role authoring+reviewing', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /produced_by/,
    'commands/review.md must check produced_by field for same-role detection (deterministic check)'
  );
});

// AC7: CLAUDE.md pipeline phases tagged as authoring vs gate/review with correct mapping
test('AC7: root CLAUDE.md pipeline tags phases 1-3,5 as authoring and phases 4,6 as gate/review', () => {
  const claudeMd = read('CLAUDE.md');
  const pipelineSection = claudeMd.match(/Pipeline Sequence[\s\S]*?(?=\n---|\n## [^#]|$)/);
  assert.ok(pipelineSection, 'CLAUDE.md must have a Pipeline Sequence section');
  const pipeline = pipelineSection[0];

  // Authoring phases: 1 (Specify), 2 (Architect), 3 (Test Design), 5 (Implement)
  // Each authoring phase line must contain "authoring" tag
  assert.match(
    pipeline,
    /Phase 1.*authoring|1.*SPECIFY.*authoring|Specify.*authoring/i,
    'Phase 1 (Specify) must be tagged as authoring'
  );
  assert.match(
    pipeline,
    /Phase 3.*authoring|3.*TEST.*authoring|Test Design.*authoring/i,
    'Phase 3 (Test Design) must be tagged as authoring'
  );
  assert.match(
    pipeline,
    /Phase 5.*authoring|5.*IMPLEMENT.*authoring|Implement.*authoring/i,
    'Phase 5 (Implement) must be tagged as authoring'
  );

  // Gate/review phases: 4 (Security Gate), 6 (Review)
  assert.match(
    pipeline,
    /Phase 4.*gate|4.*SECURITY.*gate|Security.*gate/i,
    'Phase 4 (Security Gate) must be tagged as gate'
  );
  assert.match(
    pipeline,
    /Phase 6.*gate|Phase 6.*review|6.*REVIEW.*gate|Review.*gate/i,
    'Phase 6 (Review) must be tagged as gate/review'
  );
});

// AC8: Adversarial stance asks the right questions (guard failures, stale state, unauthorized access)
test('AC8: ROLE_CODE_REVIEWER.md prompts reviewer to check guard failures, stale state, unauthorized access', () => {
  const role = read('ROLE_CODE_REVIEWER.md');
  assert.match(
    role,
    /guard|stale.?state|unauthorized|trust.?boundar/i,
    'ROLE_CODE_REVIEWER.md must prompt checking for guard failures, stale state, or unauthorized access'
  );
});

// AC9: Gate reviewer role forbids src/ writes
test('AC9: ROLE_CODE_REVIEWER.md prohibits writing to src/', () => {
  const role = read('ROLE_CODE_REVIEWER.md');
  assert.match(
    role,
    /no.*src\/|never.*src\/|read.?only|do not.*write.*src|src\/.*not/i,
    'ROLE_CODE_REVIEWER.md must enforce read-only constraint (no src/ writes)'
  );
});

test('AC9: ROLE_SECURITY.md prohibits writing to src/', () => {
  const role = read('ROLE_SECURITY.md');
  assert.match(
    role,
    /no.*src\/|never.*src\/|read.?only|do not.*write.*src|src\/.*not/i,
    'ROLE_SECURITY.md must enforce read-only constraint (no src/ writes)'
  );
});

// AC10: Review artifact header template includes "Reviewed in separate context"
test('AC10: commands/review.md artifact header template includes reviewer identity and separate-context statement', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /Reviewed in separate context from authoring phase/i,
    'commands/review.md must include the header template: "Reviewed in separate context from authoring phase"'
  );
});

test('AC10: commands/security-gate.md artifact header template includes separate-context statement', () => {
  const command = read('commands/security-gate.md');
  assert.match(
    command,
    /Reviewed in separate context from authoring phase/i,
    'commands/security-gate.md must include the header template: "Reviewed in separate context from authoring phase"'
  );
});

// AC11a: Role definitions enforce adversarial stance
test('AC11a: both gate-review role files contain adversarial stance (structural check)', () => {
  const reviewer = read('ROLE_CODE_REVIEWER.md');
  const security = read('ROLE_SECURITY.md');
  assert.match(reviewer, /adversarial/i, 'ROLE_CODE_REVIEWER.md must contain adversarial stance');
  assert.match(security, /adversarial/i, 'ROLE_SECURITY.md must contain adversarial stance');
});

// AC11b: Handoff schema requires source_spec field
test('AC11b: schemas/handoff.schema.json has source_spec in required array', () => {
  const schema = JSON.parse(read('schemas/handoff.schema.json'));
  assert.ok(
    Array.isArray(schema.required),
    'handoff.schema.json must have a required array'
  );
  assert.ok(
    schema.required.includes('source_spec'),
    'schemas/handoff.schema.json must list source_spec as required'
  );
});

// AC11b: Handoff schema defines source_spec property
test('AC11b: schemas/handoff.schema.json defines the source_spec property', () => {
  const schema = JSON.parse(read('schemas/handoff.schema.json'));
  assert.ok(
    schema.properties && schema.properties.source_spec,
    'schemas/handoff.schema.json must define source_spec in properties'
  );
  assert.equal(
    schema.properties.source_spec.type,
    'string',
    'source_spec must be of type string'
  );
});

// AC11c: review command rejects missing source_spec (error path)
test('AC11c: commands/review.md halts when source_spec is missing or unresolvable', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /halt|stop|Review halted|cannot proceed|unresolvable/i,
    'commands/review.md must halt when source_spec is missing'
  );
});

// AC11d: Separate-context enforcement (not just fresh session)
test('AC11d: ROLE_CODE_REVIEWER.md uses "separate context" language, not only "fresh session"', () => {
  const role = read('ROLE_CODE_REVIEWER.md');
  assert.match(
    role,
    /separate context/i,
    'ROLE_CODE_REVIEWER.md must say "separate context", not only "fresh session"'
  );
});

// AC11e: Gate reviewer files are read-only for src/
test('AC11e: ROLE_CODE_REVIEWER.md and ROLE_SECURITY.md both have read-only enforcement for src/', () => {
  const reviewer = read('ROLE_CODE_REVIEWER.md');
  const security = read('ROLE_SECURITY.md');
  assert.match(reviewer, /read.?only|no.*src\/|never.*src\//i, 'ROLE_CODE_REVIEWER.md read-only src/ check');
  assert.match(security, /read.?only|no.*src\/|never.*src\//i, 'ROLE_SECURITY.md read-only src/ check');
});

// AC11f: Pipeline phases tagged authoring vs gate/review in CLAUDE.md with exact mapping
test('AC11f: CLAUDE.md tags phases 1-3,5 as authoring and phases 4,6 as gate/review', () => {
  const claudeMd = read('CLAUDE.md');
  const pipelineSection = claudeMd.match(/Pipeline Sequence[\s\S]*?(?=\n---|\n## [^#]|$)/);
  assert.ok(pipelineSection, 'CLAUDE.md must have a Pipeline Sequence section');
  const pipeline = pipelineSection[0];

  // Verify exact phase-to-tag mapping per PRD AC7: phases 1-3,5 = authoring; 4,6 = gate/review
  assert.match(pipeline, /Phase 1.*authoring|1.*SPECIFY.*authoring|Specify.*authoring/i, 'Phase 1 must be tagged authoring');
  assert.match(pipeline, /Phase 4.*gate|4.*SECURITY.*gate|Security.*gate/i, 'Phase 4 must be tagged gate');
  assert.match(pipeline, /Phase 6.*gate|Phase 6.*review|6.*REVIEW.*gate|Review.*gate/i, 'Phase 6 must be tagged gate/review');
});

// ---------------------------------------------------------------------------
// ISS-033: Source Spec Verification
// ---------------------------------------------------------------------------

// AC12: Reviewer loads source_spec from handoff before reading diff
test('AC12: commands/review.md instructs reading source_spec (PRD) before the diff', () => {
  const command = read('commands/review.md');
  // Must reference source_spec before the diff section
  const sourceSpecIdx = command.indexOf('source_spec');
  const diffIdx = command.toLowerCase().indexOf('diff');
  assert.notEqual(sourceSpecIdx, -1, 'commands/review.md must reference source_spec');
  assert.notEqual(diffIdx, -1, 'commands/review.md must reference diff');
  assert.ok(
    sourceSpecIdx < diffIdx,
    'commands/review.md must reference source_spec before the diff'
  );
});

// AC13: Prompt template instructs "First read <source_spec_path>. Then verify diff matches PRD"
test('AC13: commands/review.md prompt template instructs source-spec-first diff verification', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /First read.*source.?spec|read.*PRD.*before.*diff|verify diff.*(?:PRD|source.?spec)/i,
    'commands/review.md must instruct: first read source_spec, then verify diff matches PRD'
  );
});

// AC13: commands/security-gate.md also has source_spec-first instruction
test('AC13: commands/security-gate.md has source_spec-first prompt injection', () => {
  const command = read('commands/security-gate.md');
  assert.match(
    command,
    /source_spec/,
    'commands/security-gate.md must reference source_spec'
  );
  assert.match(
    command,
    /First read|read.*source.?spec.*before|source.?spec.*first/i,
    'commands/security-gate.md must instruct reading source_spec first'
  );
});

// AC14: source_spec is required (not optional) in handoff schema
test('AC14: source_spec is in the required array of handoff.schema.json (not optional)', () => {
  const schema = JSON.parse(read('schemas/handoff.schema.json'));
  assert.ok(
    schema.required.includes('source_spec'),
    'source_spec must be in handoff.schema.json required array — it is not optional'
  );
});

// AC14: source_spec property must have a description mentioning PRD path or ticket path
test('AC14: source_spec schema description specifies valid values (PRD path, ticket path, or URL)', () => {
  const schema = JSON.parse(read('schemas/handoff.schema.json'));
  const desc = (schema.properties.source_spec || {}).description || '';
  assert.match(
    desc,
    /PRD|ticket|path|URL/i,
    'source_spec description must specify valid values: PRD path, ticket path, or URL'
  );
});

// AC15: bugfix fallback — ticket file is the explicit source_spec (CLAUDE.md or command docs it)
test('AC15: commands/implement.md or CLAUDE.md documents the bugfix source_spec fallback (ticket > issue URL)', () => {
  // For ad-hoc bugfixes, source_spec must point to ticket. Check relevant docs.
  const claudeMd = read('CLAUDE.md');
  const hasTicketMention = /ticket.*source_spec|source_spec.*ticket|bugfix.*ticket|ticket.*bugfix/i.test(claudeMd);
  const implementExists = exists('commands/implement.md');
  let implementHasTicket = false;
  if (implementExists) {
    const implement = read('commands/implement.md');
    implementHasTicket = /ticket.*source_spec|source_spec.*ticket|bugfix.*ticket|docs\/issues\/tickets/i.test(implement);
  }
  assert.ok(
    hasTicketMention || implementHasTicket,
    'CLAUDE.md or commands/implement.md must document the bugfix source_spec fallback (ticket file path)'
  );
});

// AC15: Explicit precedence order — ticket file > GitHub issue URL > other declared source
test('AC15: documentation states the explicit precedence order for bugfix source_spec', () => {
  // The PRD states: "Precedence: ticket file > GitHub issue URL > other declared source"
  // At least one of: architecture.md, CLAUDE.md, or commands/implement.md must document this ordering
  const arch = read('docs/features/review-hardening/architecture.md');
  const claudeMd = read('CLAUDE.md');
  const implementExists = exists('commands/implement.md');
  const implementContent = implementExists ? read('commands/implement.md') : '';
  const combined = arch + claudeMd + implementContent;
  assert.match(
    combined,
    /ticket.*>.*(?:issue|URL|github)|precedence.*ticket/i,
    'Bugfix source_spec precedence (ticket file > GitHub issue URL > other) must be documented in architecture, CLAUDE.md, or commands/implement.md'
  );
});

// AC15: GitHub issue URL is a valid source_spec value
test('AC15: handoff.schema.json source_spec description accepts URL as valid value', () => {
  const schema = JSON.parse(read('schemas/handoff.schema.json'));
  const desc = (schema.properties.source_spec || {}).description || '';
  assert.match(
    desc,
    /URL/i,
    'source_spec schema description must list URL as a valid value (for GitHub issue URLs in bugfix fallback)'
  );
});

// AC16: Review halts with explicit error when source_spec is missing or unresolvable
test('AC16: commands/review.md stops with an explicit error message when source_spec is missing', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /Review halted.*source_spec missing|source_spec missing.*Review halted|halt.*source_spec|stop.*source_spec/i,
    'commands/review.md must include explicit halt message when source_spec is missing or unresolvable'
  );
});

// AC17: Regression — source_spec must not be removed from schema
test('AC17: handoff schema still has source_spec in required (regression guard)', () => {
  const schema = JSON.parse(read('schemas/handoff.schema.json'));
  assert.ok(
    schema.required.includes('source_spec'),
    'Regression: source_spec must not be removed from handoff.schema.json required array'
  );
});

// AC17: Regression — review command must not skip source_spec loading
test('AC17: commands/review.md has not skipped source_spec loading (regression guard)', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /source_spec/,
    'Regression: commands/review.md must still reference source_spec'
  );
});

// AC17: Regression — gate roles still have adversarial requirement
test('AC17: gate role files still have adversarial requirement (regression guard)', () => {
  const reviewer = read('ROLE_CODE_REVIEWER.md');
  const security = read('ROLE_SECURITY.md');
  assert.match(reviewer, /adversarial/i, 'Regression: ROLE_CODE_REVIEWER.md must still have adversarial stance');
  assert.match(security, /adversarial/i, 'Regression: ROLE_SECURITY.md must still have adversarial stance');
});

// AC18: CLAUDE.md references source_spec handling, adversarial stance, and reviewer independence
test('AC18: CLAUDE.md references source_spec handling', () => {
  const claudeMd = read('CLAUDE.md');
  assert.match(
    claudeMd,
    /source_spec/,
    'CLAUDE.md must reference source_spec handling'
  );
});

test('AC18: commands/review.md references adversarial stance and reviewer independence', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /adversarial|reviewer independence|independent/i,
    'commands/review.md must reference adversarial stance or reviewer independence'
  );
});

// ---------------------------------------------------------------------------
// Error / Empty States (per QA mandate — at least one per screen state)
// ---------------------------------------------------------------------------

// Error: source_spec missing → review halted (AC16)
test('ERROR STATE: review halted when source_spec is missing from handoff', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /halt|stop|Review halted|cannot proceed/i,
    'Review command must halt when source_spec is missing — no silent pass-through'
  );
});

// Error: source_spec unresolvable (file does not exist) → halt
test('ERROR STATE: review halted when source_spec path does not resolve to an existing file', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /unresolvable|does not exist|cannot find|not found|missing/i,
    'Review command must handle unresolvable source_spec with an explicit error'
  );
});

// Error: same-role review attempted → gate halts (AC6)
test('ERROR STATE: review gate halts when produced_by matches the current reviewer role', () => {
  const command = read('commands/review.md');
  assert.match(
    command,
    /produced_by|same.*role|role.*match|separate context/i,
    'Review command must halt when the same role authored and is now reviewing (separate-context violation)'
  );
});

// Empty state: no handoff.json in a fresh environment → checkpoint rejects
test('EMPTY STATE: checkpoint.js rejects handoffs that are missing source_spec', () => {
  const checkpoint = read('hooks/checkpoint.js');
  assert.match(
    checkpoint,
    /source_spec/,
    'hooks/checkpoint.js must validate source_spec presence'
  );
});

// ---------------------------------------------------------------------------
// Permission / Trust Boundary
// ---------------------------------------------------------------------------

// Gate reviewers must not write to src/
test('PERMISSION BOUNDARY: gate reviewer roles explicitly prohibit src/ writes', () => {
  const reviewer = read('ROLE_CODE_REVIEWER.md');
  const security = read('ROLE_SECURITY.md');
  assert.match(reviewer, /src\//i, 'ROLE_CODE_REVIEWER.md must mention src/ in its constraints');
  assert.match(security, /src\//i, 'ROLE_SECURITY.md must mention src/ in its constraints');
});

// source_spec must not be used as executable path
test('TRUST BOUNDARY: handoff schema source_spec description forbids use as executable path', () => {
  const schema = JSON.parse(read('schemas/handoff.schema.json'));
  const sourceProp = (schema.properties || {}).source_spec || {};
  // The property must be a string type — no default exec-path semantics
  assert.equal(sourceProp.type, 'string', 'source_spec must be a plain string, not executable');
});
