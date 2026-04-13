/**
 * E2E tests for clarification-checkpoints feature (RED state)
 *
 * Derived from: docs/features/clarification-checkpoints/prd.md + architecture.md
 * Ticket: ISS-029
 *
 * These tests verify the complete clarification-checkpoints convention chain end-to-end:
 *   skill (Ticket Fidelity Procedure) → command/specify (fidelity + clarification gate)
 *   → command/architect (review checkpoint) → source/installed sync
 *
 * Wiring proof:
 *   If all E2E tests pass, the pipeline enforces ticket fidelity at authoring time,
 *   human clarification before PRD finalization, and human review before architecture
 *   finalization. Every file modified in the architecture doc is verified.
 *
 * Cases covered:
 *   Happy:   Complete chain from skill procedure → command flow → checkpoint ordering works
 *   Edge:    Source/installed copies stay in sync across all modified files
 *   Misuse:  Commands without checkpoint language would auto-advance (caught by ordering checks)
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

// ---------------------------------------------------------------------------
// E2E Chain 1: Skill → Command → Checkpoint Ordering (specify)
// ---------------------------------------------------------------------------

test('E2E chain: prd-writing skill defines Ticket Fidelity Procedure AND specify command references and uses it', () => {
  // Step 1: Skill defines the procedure
  const skill = read('skills/prd-writing/SKILL.md');
  const hasSection = /^## Ticket Fidelity Procedure$/m.test(skill);
  assert.ok(hasSection, 'prd-writing skill must define Ticket Fidelity Procedure section');

  // Step 2: Procedure covers all sub-ACs with specificity
  const section = skill.match(/## Ticket Fidelity Procedure[\s\S]*?(?=\n## [^#]|$)/)[0];
  assert.match(section, /transcribe|faithfully/i, 'Procedure must cover AC0 (transcription)');
  // AC0: must reference drift dimensions
  const driftDimensions = [/scope/i, /severity/i, /specificity/i];
  const driftMatches = driftDimensions.filter(p => p.test(section)).length;
  assert.ok(driftMatches >= 2, `Procedure must reference at least 2 of 3 drift dimensions (found ${driftMatches})`);
  // AC0a: must specify docs/CLAUDE.md as canonical with fallback
  assert.match(section, /docs\/CLAUDE\.md/, 'Procedure must specify docs/CLAUDE.md as canonical (AC0a)');
  assert.match(section, /fallback|root\s+CLAUDE\.md|template/i, 'Procedure must specify root CLAUDE.md fallback (AC0a)');
  assert.match(section, /contradict/i, 'Procedure must cover AC0b (contradiction check)');
  // AC0c: must include both enumerate AND ask user alternatives
  assert.match(section, /enumerate/i, 'Procedure must cover enumeration (AC0c)');
  assert.match(section, /ask.*(user|which|apply)|user.*which.*apply/i, 'Procedure must cover asking user as alternative (AC0c)');

  // Step 3: Command loads the skill
  const cmd = read('commands/specify.md');
  assert.match(cmd, /prd-writing\/SKILL\.md/, 'Command must load the skill');

  // Step 4: Command includes fidelity instructions
  assert.match(cmd, /ticket.*fidelity|fidelity.*check|transcribe.*ticket/i,
    'Command must include ticket fidelity instructions');
});

// ---------------------------------------------------------------------------
// E2E Chain 2: Clarification gate → outcome handling → commit ordering (specify)
// ---------------------------------------------------------------------------

test('E2E chain: specify command enforces full clarification flow before finalization', () => {
  const cmd = read('commands/specify.md');

  // Clarification gate exists
  assert.match(cmd, /clarification/i, 'Must have clarification gate');

  // Triggers are documented — must enumerate concrete classes, not just the word "trigger"
  assert.match(cmd, /trigger/i, 'Must document clarification triggers');
  const triggerPatterns = [
    /undefined\s+term/i,
    /ACs?\s+conflict|conflict.*ACs?|contradict/i,
    /open.ended/i,
  ];
  const triggerMatches = triggerPatterns.filter(p => p.test(cmd)).length;
  assert.ok(triggerMatches >= 2, `Must enumerate at least 2 concrete trigger classes (found ${triggerMatches})`);

  // Question discipline
  assert.match(cmd, /material/i, 'Must enforce question discipline');

  // Partial/refused handling — must bind the "record in Dependencies and proceed" behavior
  assert.match(cmd, /partial|refused|declines/i, 'Must handle partial/refused answers');
  assert.match(cmd, /dependencies/i, 'Must record unanswered in Dependencies section');
  assert.match(cmd, /proceed|continue|move\s+forward/i, 'Must proceed after recording assumptions');

  // Ordering: clarification before commit
  const clarificationIdx = cmd.search(/clarification.*gate|clarification.*question|ask.*clarif/i);
  const commitIdx = cmd.search(/commit.*when done|commit.*prd|commit.*message/i);
  assert.ok(clarificationIdx < commitIdx, 'Clarification must come before commit');

  // Negative check: no unconditional bypass after checkpoint
  const afterCheckpoint = cmd.slice(clarificationIdx);
  assert.doesNotMatch(
    afterCheckpoint,
    /skip\s+clarification\s+entirely|finalize\s+without\s+(waiting|clarification|user)|always\s+commit\s+regardless/i,
    'Must not contain an unconditional bypass of the clarification gate'
  );
});

// ---------------------------------------------------------------------------
// E2E Chain 3: Review checkpoint → feedback loop → commit ordering (architect)
// ---------------------------------------------------------------------------

test('E2E chain: architect command enforces review checkpoint with feedback loop before finalization', () => {
  const cmd = read('commands/architect.md');

  // Review checkpoint exists
  assert.match(cmd, /review.*checkpoint|present.*review|request.*user.*review/i,
    'Must have review checkpoint');

  // Feedback incorporation / revision cycles with explicit approval gate
  assert.match(cmd, /user.*feedback|feedback.*incorporat|revision.*cycle|revise.*architecture/i,
    'Must allow revision cycles');
  assert.match(cmd, /approv|user\s+(confirm|accept|sign.off)|until.*approv/i,
    'Must require explicit user approval before finalizing');

  // "Still in review" state signaling
  assert.match(cmd, /still\s+in\s+review|awaiting\s+(review|feedback|approval)|not\s+yet\s+(complete|finalized)|review\s+in\s+progress/i,
    'Must signal "still in review" state distinct from completion');

  // Ordering: checkpoint before commit
  const checkpointIdx = cmd.search(/review.*checkpoint|present.*review|wait.*feedback/i);
  const commitIdx = cmd.search(/commit.*when done|commit.*message/i);
  assert.ok(checkpointIdx >= 0, 'Review checkpoint must exist');
  assert.ok(commitIdx >= 0, 'Commit instruction must exist');
  assert.ok(checkpointIdx < commitIdx, 'Review checkpoint must come before commit');

  // Negative check: no unconditional bypass after checkpoint
  const afterCheckpoint = cmd.slice(checkpointIdx);
  assert.doesNotMatch(
    afterCheckpoint,
    /skip\s+review\s+entirely|finalize\s+without\s+(approval|review|user)|always\s+commit\s+regardless|proceed\s+without\s+user\s+response/i,
    'Must not contain an unconditional bypass of the review checkpoint'
  );
});

// ---------------------------------------------------------------------------
// E2E Chain 4: Source/installed sync for ALL modified files
// ---------------------------------------------------------------------------

test('E2E sync: all files in the architecture boundary table have matching installed copies', () => {
  // Architecture specifies these files are modified:
  const filePairs = [
    ['commands/specify.md', '.claude/commands/specify.md'],
    ['commands/architect.md', '.claude/commands/architect.md'],
    ['skills/prd-writing/SKILL.md', '.claude/skills/prd-writing/SKILL.md'],
  ];

  for (const [source, installed] of filePairs) {
    const sourceContent = read(source);
    const installedContent = read(installed);
    assert.equal(
      sourceContent,
      installedContent,
      `Source ${source} and installed ${installed} must be byte-identical`
    );
  }
});

// ---------------------------------------------------------------------------
// E2E Chain 5: Checkpoint durability — handoff schema + command instructions
// ---------------------------------------------------------------------------

test('E2E chain: checkpoint_pending field in schema and commands instruct writing it', () => {
  // Schema accepts the field
  const rawSchema = read('schemas/handoff.schema.json');
  const schema = JSON.parse(rawSchema);
  assert.ok(
    schema.properties && schema.properties.checkpoint_pending,
    'handoff.schema.json must define checkpoint_pending'
  );

  // At least one command references checkpoint_pending
  const specify = read('commands/specify.md');
  const architect = read('commands/architect.md');
  const combined = specify + architect;
  assert.match(
    combined,
    /checkpoint_pending/,
    'At least one command must reference checkpoint_pending for session durability'
  );
});

// ---------------------------------------------------------------------------
// Error state: ticket not found — must NOT silently skip fidelity
// ---------------------------------------------------------------------------

test('E2E error state: prd-writing skill Ticket Fidelity Procedure blocks or asks user on missing ticket', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  const section = skill.match(/## Ticket Fidelity Procedure[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(section, 'Ticket Fidelity Procedure section must exist');
  assert.match(
    section[0],
    /degrade|ask.*user|block|not.*silently|warning/i,
    'Procedure must not silently skip fidelity when ticket is not found — must block or ask user'
  );
});

// ---------------------------------------------------------------------------
// Empty state: no ticket reference — fidelity check should be skipped
// ---------------------------------------------------------------------------

test('E2E empty state: specify command or skill documents skipping fidelity when no ticket reference', () => {
  const cmd = read('commands/specify.md');
  const skill = read('skills/prd-writing/SKILL.md');
  const combined = cmd + skill;
  assert.match(
    combined,
    /no ticket|without.*ticket|skip.*fidelity|ticket.*reference/i,
    'Must document that fidelity check is skipped when no ticket reference is provided'
  );
});
