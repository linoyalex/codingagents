#!/usr/bin/env node
/**
 * restore-context.cjs
 * Runs via SessionStart hook. Loads handoff.json as primary context if available,
 * falls back to archived turns. Records session start time for token tracking.
 *
 * Install: place at .claude/helpers/restore-context.cjs
 */

const fs = require('fs');
const path = require('path');

const HANDOFF_FILE = path.join(process.cwd(), '.claude', 'handoff.json');
const ARCHIVE_FILE = path.join(process.cwd(), '.claude', 'context-archive', 'turns.json');
const SESSION_STATE_FILE = path.join(process.cwd(), '.claude', '.session-state.json');
const RESTORE_TOP_N = 5;
const MAX_CHARS = 2000;

// Map from the producing phase to the agent that runs next
const PHASE_TO_NEXT_AGENT = {
  1: { agent: 'architect', model: 'claude-opus-4-6' },           // after specify → architect runs next
  2: { agent: 'qa', model: 'claude-sonnet-4-6' },                // after architect → qa runs next
  3: { agent: 'security-reviewer', model: 'claude-opus-4-6' },   // after test-design → security runs next
  4: { agent: 'developer', model: 'claude-sonnet-4-6' },         // after security → developer runs next
  5: { agent: 'code-reviewer', model: 'claude-sonnet-4-6' },     // after implement → reviewer runs next
  6: { agent: 'documentation-specialist', model: 'claude-haiku-4-5' }, // after review → doc runs next
  7: { agent: 'unknown', model: 'unknown' },                     // after document → pipeline complete
};

// Map from phase to the agent/model that owns that phase (for checkpoint resumption)
const PHASE_TO_CURRENT_AGENT = {
  1: { agent: 'product-owner', model: 'claude-haiku-4-5' },
  2: { agent: 'architect', model: 'claude-opus-4-6' },
  3: { agent: 'qa', model: 'claude-sonnet-4-6' },
  4: { agent: 'security-reviewer', model: 'claude-opus-4-6' },
  5: { agent: 'developer', model: 'claude-sonnet-4-6' },
  6: { agent: 'code-reviewer', model: 'claude-sonnet-4-6' },
  7: { agent: 'documentation-specialist', model: 'claude-haiku-4-5' },
};

function recordSessionStart(feature, handoffPhase, checkpointPending) {
  // When checkpoint_pending is set, the session is resuming the SAME phase —
  // use the current phase's agent/model, not the next phase's.
  let role;
  if (checkpointPending && handoffPhase && PHASE_TO_CURRENT_AGENT[handoffPhase]) {
    role = PHASE_TO_CURRENT_AGENT[handoffPhase];
  } else {
    role = (handoffPhase && PHASE_TO_NEXT_AGENT[handoffPhase]) || { agent: 'unknown', model: 'unknown' };
  }

  const state = {
    startTime: Date.now(),
    feature: feature || 'unknown',
    agent: role.agent,
    model: role.model,
  };

  try {
    const dir = path.dirname(SESSION_STATE_FILE);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SESSION_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error(`[session-state] Failed to write (non-blocking): ${err.message}`);
  }
}

function restoreFromHandoff() {
  if (!fs.existsSync(HANDOFF_FILE)) return null;

  try {
    const raw = fs.readFileSync(HANDOFF_FILE, 'utf8');
    let handoff;
    try {
      handoff = JSON.parse(raw);
    } catch (parseErr) {
      console.error(`[restore-context] error: malformed handoff.json — ${parseErr.message}`);
      return null;
    }

    // Validate minimum required fields
    if (!handoff.goal || !handoff.relevant_files) {
      console.error('[restore-context] error: invalid handoff.json — missing required fields (goal, relevant_files)');
      return null;
    }

    let output = '## Handoff from previous phase\n\n';
    output += `**Feature:** ${handoff.feature || 'unknown'}\n`;
    output += `**Goal:** ${handoff.goal}\n`;
    output += `**Scope:** ${handoff.scope || 'not specified'}\n\n`;

    if (handoff.constraints && handoff.constraints.length) {
      output += '**Constraints:**\n';
      handoff.constraints.forEach(c => { output += `- ${c}\n`; });
      output += '\n';
    }

    if (handoff.relevant_files && handoff.relevant_files.length) {
      output += '**Read these files first:**\n';
      handoff.relevant_files.forEach(f => { output += `- ${f}\n`; });
      output += '\n';
    }

    if (handoff.acceptance_criteria && handoff.acceptance_criteria.length) {
      output += '**Acceptance criteria:**\n';
      handoff.acceptance_criteria.forEach(ac => { output += `- ${ac}\n`; });
      output += '\n';
    }

    if (handoff.verification_commands && handoff.verification_commands.length) {
      output += '**Verify with:**\n';
      handoff.verification_commands.forEach(cmd => { output += `- \`${cmd}\`\n`; });
      output += '\n';
    }

    if (handoff.known_risks && handoff.known_risks.length) {
      output += '**Known risks:**\n';
      handoff.known_risks.forEach(r => { output += `- ${r}\n`; });
      output += '\n';
    }

    if (handoff.checkpoint_pending) {
      output += `**⚠ Checkpoint pending: \`${handoff.checkpoint_pending}\`** — resume this checkpoint rather than restarting the phase.\n\n`;
    }

    output += '---\n';
    return { output, feature: handoff.feature, phase: handoff.phase, checkpointPending: handoff.checkpoint_pending || null };
  } catch (err) {
    console.error(`[restore-context] error: failed to read handoff.json — ${err.message}`);
    return null;
  }
}

function restoreFromArchive() {
  if (!fs.existsSync(ARCHIVE_FILE)) return null;

  let archive = [];
  try {
    archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
  } catch {
    return null;
  }

  if (!archive.length) return null;

  const top = archive
    .sort((a, b) => b.score - a.score)
    .slice(0, RESTORE_TOP_N);

  let restored = '## Restored context from previous sessions\n\n';
  let charCount = restored.length;

  for (const turn of top) {
    const entry = `- [score:${turn.score}] ${turn.content}\n`;
    if (charCount + entry.length > MAX_CHARS) break;
    restored += entry;
    charCount += entry.length;
  }

  restored += '\n---\n';
  return { output: restored, feature: null };
}

function main() {
  // Try handoff first, fall back to archived turns
  const handoffResult = restoreFromHandoff();
  const archiveResult = restoreFromArchive();

  let feature = null;
  let handoffPhase = null;
  let checkpointPending = null;

  if (handoffResult) {
    process.stdout.write(handoffResult.output);
    feature = handoffResult.feature;
    handoffPhase = handoffResult.phase;
    checkpointPending = handoffResult.checkpointPending;
  } else if (archiveResult) {
    process.stdout.write(archiveResult.output);
    feature = archiveResult.feature;
  }

  // Record session start for token tracking (infers agent/model from handoff phase)
  recordSessionStart(feature, handoffPhase, checkpointPending);
}

main();
