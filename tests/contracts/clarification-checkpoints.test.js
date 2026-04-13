/**
 * Contract tests for clarification-checkpoints feature (RED state)
 *
 * Derived from: docs/features/clarification-checkpoints/prd.md + architecture.md
 * Ticket: ISS-029
 *
 * Primary production-wiring test seam:
 *   commands/specify.md (ticket fidelity + clarification gate) and
 *   commands/architect.md (review checkpoint). The feature is "wired" when both
 *   command files contain the checkpoint flow instructions and the prd-writing
 *   skill contains the Ticket Fidelity Procedure section.
 *
 * Cases covered:
 *   Happy:   command files contain checkpoint instructions; skill has fidelity procedure
 *   Edge:    checkpoint instructions appear BEFORE commit/handoff (ordering constraint)
 *   Misuse:  command auto-advances without checkpoint (AC6 — structural ordering check)
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
// AC0: Ticket Fidelity — prd-writing skill contains the procedure
// ---------------------------------------------------------------------------

test('AC0: skills/prd-writing/SKILL.md has a Ticket Fidelity Procedure section', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  assert.match(
    skill,
    /^## Ticket Fidelity Procedure$/m,
    'skills/prd-writing/SKILL.md must contain a "## Ticket Fidelity Procedure" heading'
  );
});

test('AC0: Ticket Fidelity Procedure instructs transcribing ticket ACs, not paraphrasing', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  const section = skill.match(/## Ticket Fidelity Procedure[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(section, 'Ticket Fidelity Procedure section must exist');
  assert.match(
    section[0],
    /transcribe|faithfully/i,
    'Ticket Fidelity Procedure must instruct transcribing (not paraphrasing) ticket ACs'
  );
});

test('AC0: Ticket Fidelity Procedure instructs flagging divergences as assumptions', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  const section = skill.match(/## Ticket Fidelity Procedure[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(section, 'Ticket Fidelity Procedure section must exist');
  assert.match(
    section[0],
    /diverge|assumption/i,
    'Ticket Fidelity Procedure must instruct flagging divergences as assumptions'
  );
});

// ---------------------------------------------------------------------------
// AC0a: Convention citation verification
// ---------------------------------------------------------------------------

test('AC0a: Ticket Fidelity Procedure requires verifying convention values against docs/CLAUDE.md', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  const section = skill.match(/## Ticket Fidelity Procedure[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(section, 'Ticket Fidelity Procedure section must exist');
  assert.match(
    section[0],
    /CLAUDE\.md/,
    'Ticket Fidelity Procedure must reference verifying against CLAUDE.md'
  );
});

// ---------------------------------------------------------------------------
// AC0b: Internal contradiction check
// ---------------------------------------------------------------------------

test('AC0b: Ticket Fidelity Procedure requires checking for internal contradictions', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  const section = skill.match(/## Ticket Fidelity Procedure[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(section, 'Ticket Fidelity Procedure section must exist');
  assert.match(
    section[0],
    /contradict/i,
    'Ticket Fidelity Procedure must instruct checking for internal contradictions'
  );
});

// ---------------------------------------------------------------------------
// AC0c: Open-ended scope handling
// ---------------------------------------------------------------------------

test('AC0c: Ticket Fidelity Procedure requires enumerating or asking about open-ended scope', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  const section = skill.match(/## Ticket Fidelity Procedure[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(section, 'Ticket Fidelity Procedure section must exist');
  assert.match(
    section[0],
    /enumerate|open.ended/i,
    'Ticket Fidelity Procedure must instruct handling open-ended scope clauses'
  );
});

// ---------------------------------------------------------------------------
// AC1: Clarification gate exists in /specify
// ---------------------------------------------------------------------------

test('AC1: commands/specify.md contains a clarification gate section', () => {
  const cmd = read('commands/specify.md');
  assert.match(
    cmd,
    /clarification/i,
    'commands/specify.md must contain clarification gate instructions'
  );
});

test('AC1: commands/specify.md documents clarification triggers', () => {
  const cmd = read('commands/specify.md');
  assert.match(
    cmd,
    /trigger/i,
    'commands/specify.md must document clarification triggers'
  );
});

// ---------------------------------------------------------------------------
// AC2: Question discipline
// ---------------------------------------------------------------------------

test('AC2: commands/specify.md instructs asking only material questions', () => {
  const cmd = read('commands/specify.md');
  assert.match(
    cmd,
    /material/i,
    'commands/specify.md must instruct asking only questions that materially affect the PRD'
  );
});

// ---------------------------------------------------------------------------
// AC3: Clarification outcome handling — partial/refused answers
// ---------------------------------------------------------------------------

test('AC3: commands/specify.md handles partial or refused answers as assumptions', () => {
  const cmd = read('commands/specify.md');
  assert.match(
    cmd,
    /partial|refused|declines/i,
    'commands/specify.md must instruct handling partial/refused answers'
  );
});

test('AC3: commands/specify.md records unanswered clarification questions as assumptions', () => {
  const cmd = read('commands/specify.md');
  // Must match "unanswered" questions being recorded as assumptions, not generic assumption guidance
  assert.match(
    cmd,
    /unanswered.*assumption|assumption.*unanswered|record.*question.*assumption/i,
    'commands/specify.md must instruct recording unanswered clarification questions as assumptions'
  );
});

// ---------------------------------------------------------------------------
// AC4: Architect review checkpoint
// ---------------------------------------------------------------------------

test('AC4: commands/architect.md contains a review checkpoint section', () => {
  const cmd = read('commands/architect.md');
  assert.match(
    cmd,
    /review.*checkpoint|checkpoint.*review|present.*review|review.*feedback/i,
    'commands/architect.md must contain review checkpoint instructions'
  );
});

// ---------------------------------------------------------------------------
// AC5: Feedback incorporation — multiple revision cycles
// ---------------------------------------------------------------------------

test('AC5: commands/architect.md allows multiple revision cycles based on user feedback', () => {
  const cmd = read('commands/architect.md');
  assert.match(
    cmd,
    /user.*feedback|feedback.*incorporat|revision.*cycle|revise.*architecture|multiple.*revision/i,
    'commands/architect.md must instruct allowing revision cycles based on user feedback'
  );
});

// ---------------------------------------------------------------------------
// AC6: No hidden auto-advance — checkpoint ordering (structural)
// ---------------------------------------------------------------------------

test('AC6: commands/specify.md places checkpoint instructions BEFORE commit/handoff', () => {
  const cmd = read('commands/specify.md');
  const clarificationIdx = cmd.search(/clarification.*gate|clarification.*question|ask.*clarif/i);
  const commitIdx = cmd.search(/commit.*when done|commit.*prd|commit.*message/i);
  assert.ok(clarificationIdx >= 0, 'commands/specify.md must contain clarification gate instructions');
  assert.ok(commitIdx >= 0, 'commands/specify.md must contain commit instructions');
  assert.ok(
    clarificationIdx < commitIdx,
    `Clarification gate (pos ${clarificationIdx}) must appear before commit instructions (pos ${commitIdx})`
  );
});

test('AC6: commands/architect.md places review checkpoint BEFORE commit/handoff', () => {
  const cmd = read('commands/architect.md');
  const checkpointIdx = cmd.search(/review.*checkpoint|present.*review|wait.*feedback/i);
  const commitIdx = cmd.search(/commit.*when done|commit.*message/i);
  assert.ok(checkpointIdx >= 0, 'commands/architect.md must contain review checkpoint instructions');
  assert.ok(commitIdx >= 0, 'commands/architect.md must contain commit instructions');
  assert.ok(
    checkpointIdx < commitIdx,
    `Review checkpoint (pos ${checkpointIdx}) must appear before commit instructions (pos ${commitIdx})`
  );
});

// ---------------------------------------------------------------------------
// AC7: Workflow compatibility — clear signaling
// ---------------------------------------------------------------------------

test('AC7: commands/specify.md signals when waiting for user input', () => {
  const cmd = read('commands/specify.md');
  assert.match(
    cmd,
    /wait|stop|pause|before finaliz/i,
    'commands/specify.md must signal when it is waiting for user clarification'
  );
});

test('AC7: commands/architect.md signals when waiting for user feedback', () => {
  const cmd = read('commands/architect.md');
  assert.match(
    cmd,
    /wait.*feedback|waiting.*review|before finaliz.*review|request.*user.*review/i,
    'commands/architect.md must signal when it is waiting for user feedback'
  );
});

// ---------------------------------------------------------------------------
// AC8: Verification — three structural checks (a, b, c)
// ---------------------------------------------------------------------------

test('AC8a: checkpoint instruction language exists in both command files', () => {
  const specify = read('commands/specify.md');
  const architect = read('commands/architect.md');
  assert.match(
    specify,
    /clarification/i,
    'AC8a: commands/specify.md must contain clarification checkpoint language'
  );
  assert.match(
    architect,
    /review.*checkpoint|checkpoint.*review|review.*feedback/i,
    'AC8a: commands/architect.md must contain review checkpoint language'
  );
});

test('AC8b: commands/specify.md has no unconditional commit after checkpoint section', () => {
  const cmd = read('commands/specify.md');
  // The checkpoint section must exist and commit must come after it
  const clarificationIdx = cmd.search(/clarification.*gate|clarification.*question/i);
  const handoffIdx = cmd.search(/write.*handoff\.json|handoff\.json.*with/i);
  assert.ok(clarificationIdx >= 0, 'Clarification gate must exist');
  assert.ok(handoffIdx >= 0, 'Handoff write must exist');
  assert.ok(
    clarificationIdx < handoffIdx,
    'Handoff write must appear after clarification gate'
  );
});

test('AC8b: commands/architect.md has no unconditional commit after checkpoint section', () => {
  const cmd = read('commands/architect.md');
  const checkpointIdx = cmd.search(/review.*checkpoint|present.*review|wait.*feedback/i);
  const handoffIdx = cmd.search(/write.*handoff\.json|handoff\.json.*with/i);
  assert.ok(checkpointIdx >= 0, 'Review checkpoint must exist');
  assert.ok(handoffIdx >= 0, 'Handoff write must exist');
  assert.ok(
    checkpointIdx < handoffIdx,
    'Handoff write must appear after review checkpoint'
  );
});

test('AC8c: handoff.json write instruction appears after checkpoint instruction in specify', () => {
  const cmd = read('commands/specify.md');
  const clarificationIdx = cmd.search(/clarification.*gate|clarification.*question|ask.*clarif/i);
  const handoffIdx = cmd.search(/write.*handoff\.json|handoff\.json.*with/i);
  assert.ok(clarificationIdx >= 0, 'Clarification gate instruction must exist');
  assert.ok(handoffIdx >= 0, 'Handoff.json write instruction must exist');
  assert.ok(
    clarificationIdx < handoffIdx,
    'Handoff.json write must come after clarification gate'
  );
});

// ---------------------------------------------------------------------------
// Checkpoint durability: handoff schema accepts checkpoint_pending field
// ---------------------------------------------------------------------------

test('Checkpoint durability: handoff.schema.json accepts optional checkpoint_pending field', () => {
  const rawSchema = read('schemas/handoff.schema.json');
  const schema = JSON.parse(rawSchema);
  assert.ok(
    schema.properties && schema.properties.checkpoint_pending,
    'handoff.schema.json must define a checkpoint_pending property'
  );
});

// ---------------------------------------------------------------------------
// Ticket-not-found: specify must not silently skip fidelity
// ---------------------------------------------------------------------------

test('Ticket-not-found: commands/specify.md instructs blocking or asking user on missing ticket', () => {
  const cmd = read('commands/specify.md');
  assert.match(
    cmd,
    /degrade|ask.*user.*proceed|not.*silently.*skip|stop.*ticket.*not.*found|ticket.*not.*found.*ask/i,
    'commands/specify.md must not silently skip fidelity when ticket is not found — must ask user or block'
  );
});

test('Ticket-not-found: prd-writing skill documents degraded-mode warning for missing ticket', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  const section = skill.match(/## Ticket Fidelity Procedure[\s\S]*?(?=\n## [^#]|$)/);
  assert.ok(section, 'Ticket Fidelity Procedure section must exist');
  assert.match(
    section[0],
    /degrade|warning|ask.*user|block|not.*silently/i,
    'Ticket Fidelity Procedure must document non-silent handling of missing tickets'
  );
});

// ---------------------------------------------------------------------------
// Checkpoint asymmetry: specify proceeds with assumptions, architect blocks
// ---------------------------------------------------------------------------

test('Checkpoint asymmetry: commands/specify.md proceeds with assumptions on user abandonment', () => {
  const cmd = read('commands/specify.md');
  assert.match(
    cmd,
    /proceed|continue|assumption.*unanswered|unanswered.*assumption/i,
    'commands/specify.md must instruct proceeding with assumptions if user abandons clarification'
  );
});

test('Checkpoint asymmetry: commands/architect.md blocks until user responds', () => {
  const cmd = read('commands/architect.md');
  assert.match(
    cmd,
    /do not finalize|must not.*commit|block|wait.*approv|not.*advance.*without/i,
    'commands/architect.md must instruct blocking until user provides feedback'
  );
});

// ---------------------------------------------------------------------------
// Skill size budget fitness function
// ---------------------------------------------------------------------------

test('Fitness: skills/prd-writing/SKILL.md stays under 250 total lines', () => {
  const skill = read('skills/prd-writing/SKILL.md');
  const lineCount = skill.split('\n').length;
  assert.ok(
    lineCount <= 250,
    `skills/prd-writing/SKILL.md is ${lineCount} lines — must stay under 250`
  );
});

// ---------------------------------------------------------------------------
// Source/installed copy sync (project convention)
// ---------------------------------------------------------------------------

test('Sync: commands/specify.md matches .claude/commands/specify.md', () => {
  const source = read('commands/specify.md');
  const installed = read('.claude/commands/specify.md');
  assert.equal(source, installed, 'Source and installed copies of commands/specify.md must be byte-identical');
});

test('Sync: commands/architect.md matches .claude/commands/architect.md', () => {
  const source = read('commands/architect.md');
  const installed = read('.claude/commands/architect.md');
  assert.equal(source, installed, 'Source and installed copies of commands/architect.md must be byte-identical');
});

test('Sync: skills/prd-writing/SKILL.md matches .claude/skills/prd-writing/SKILL.md', () => {
  const source = read('skills/prd-writing/SKILL.md');
  const installed = read('.claude/skills/prd-writing/SKILL.md');
  assert.equal(source, installed, 'Source and installed copies of prd-writing/SKILL.md must be byte-identical');
});
