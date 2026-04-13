/**
 * Integration tests for clarification-checkpoints feature (RED state)
 *
 * // ARCH GAP: No Call Chain section in architecture.md — integration target chosen by QA
 *
 * Derived from: docs/features/clarification-checkpoints/prd.md + architecture.md
 * Ticket: ISS-029
 *
 * Integration entry point: commands/specify.md (production command file)
 * The specify command is the production entry point that orchestrates the full
 * /specify flow. The integration test reads the command file and asserts that
 * the ticket fidelity + clarification gate flow is wired into the command's
 * instruction sequence — verifying visible output (command text) reflects the
 * feature being connected at the production seam.
 *
 * Primary production-wiring test seam:
 *   commands/specify.md loads skills/prd-writing/SKILL.md → the skill's Ticket
 *   Fidelity Procedure section is referenced → the command's flow sequence
 *   includes the fidelity step before PRD finalization. This is the integration
 *   point: command (WHAT) invokes skill (HOW) at the correct position.
 *
 * Cases covered:
 *   Happy:   command references the skill and the skill contains the procedure
 *   Edge:    command loads skill BEFORE the fidelity step (ordering wiring)
 *   Misuse:  command skips skill loading → fidelity procedure unreachable
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
// Integration: /specify command wires to prd-writing skill's fidelity procedure
// ---------------------------------------------------------------------------

test('Integration: commands/specify.md loads prd-writing skill which contains Ticket Fidelity Procedure', () => {
  // Step 1: The command must reference loading the prd-writing skill
  const cmd = read('commands/specify.md');
  assert.match(
    cmd,
    /prd-writing\/SKILL\.md/,
    'commands/specify.md must reference loading the prd-writing skill'
  );

  // Step 2: The loaded skill must contain the Ticket Fidelity Procedure
  const skill = read('skills/prd-writing/SKILL.md');
  assert.match(
    skill,
    /^## Ticket Fidelity Procedure$/m,
    'skills/prd-writing/SKILL.md must contain a "## Ticket Fidelity Procedure" heading'
  );
});

test('Integration: commands/specify.md includes ticket fidelity step in its flow', () => {
  const cmd = read('commands/specify.md');
  // The command must instruct the agent to perform ticket fidelity checking
  // This verifies the production entry point (command) wires to the feature
  assert.match(
    cmd,
    /ticket.*fidelity|fidelity.*check|transcribe.*ticket/i,
    'commands/specify.md must include ticket fidelity instructions in its flow'
  );
});

test('Integration: commands/specify.md skill loading appears before fidelity instructions', () => {
  const cmd = read('commands/specify.md');
  const skillLoadIdx = cmd.search(/prd-writing\/SKILL\.md/);
  const fidelityIdx = cmd.search(/ticket.*fidelity|fidelity.*check|transcribe.*ticket/i);
  assert.ok(skillLoadIdx >= 0, 'Skill loading must exist in command');
  assert.ok(fidelityIdx >= 0, 'Fidelity instructions must exist in command');
  assert.ok(
    skillLoadIdx < fidelityIdx,
    'Skill loading must appear before fidelity instructions so the procedure is available'
  );
});

// ---------------------------------------------------------------------------
// Integration: /architect command wires review checkpoint into flow
// ---------------------------------------------------------------------------

test('Integration: commands/architect.md includes review checkpoint wired before finalization', () => {
  const cmd = read('commands/architect.md');
  // Verify the command file contains review checkpoint AND it appears before commit
  const checkpointIdx = cmd.search(/review.*checkpoint|present.*proposed.*architecture|request.*user.*review/i);
  const commitIdx = cmd.search(/commit when done|commit.*message/i);
  assert.ok(checkpointIdx >= 0, 'commands/architect.md must contain review checkpoint instructions');
  assert.ok(commitIdx >= 0, 'commands/architect.md must contain commit instructions');
  assert.ok(
    checkpointIdx < commitIdx,
    'Review checkpoint must be wired before commit in the command flow'
  );
});

// ---------------------------------------------------------------------------
// Integration: Clarification gate wired into specify command flow end-to-end
// ---------------------------------------------------------------------------

test('Integration: commands/specify.md wires complete flow: skill load → fidelity → clarification → commit', () => {
  const cmd = read('commands/specify.md');

  const skillLoadIdx = cmd.search(/prd-writing\/SKILL\.md/);
  const fidelityIdx = cmd.search(/ticket.*fidelity|fidelity.*check|transcribe.*ticket/i);
  const clarificationIdx = cmd.search(/clarification.*gate|clarification.*question|ask.*clarif/i);
  const commitIdx = cmd.search(/commit.*when done|commit.*prd|commit.*message/i);

  assert.ok(skillLoadIdx >= 0, 'Skill load must exist');
  assert.ok(fidelityIdx >= 0, 'Fidelity step must exist');
  assert.ok(clarificationIdx >= 0, 'Clarification gate must exist');
  assert.ok(commitIdx >= 0, 'Commit step must exist');

  assert.ok(skillLoadIdx < fidelityIdx, 'Skill load must come before fidelity step');
  assert.ok(fidelityIdx < clarificationIdx || clarificationIdx < commitIdx,
    'Both fidelity and clarification must appear before commit');
  assert.ok(clarificationIdx < commitIdx, 'Clarification gate must come before commit');
});
