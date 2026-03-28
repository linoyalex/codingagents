#!/usr/bin/env node
/**
 * checkpoint.js
 * Runs via Stop hook. Detects pipeline phase from file existence,
 * writes a checkpoint JSON, and prints the next action.
 *
 * Install: place at .claude/helpers/checkpoint.js
 */

const fs = require('fs');
const path = require('path');

const CHECKPOINT_FILE = path.join(process.cwd(), '.claude', 'pipeline-checkpoint.json');

function detectPhase() {
  const checks = [
    { file: 'docs/prd.md', phase: 1, name: 'SPECIFY complete', next: 'Run architect subagent on docs/prd.md' },
    { file: 'docs/architecture', phase: 2, name: 'ARCHITECT complete', next: 'Run qa subagent to write failing tests' },
    { file: 'docs/security-audit', phase: 4, name: 'SECURITY GATE complete', next: 'Run developer subagent — TDD implement' },
    { file: 'docs/review', phase: 6, name: 'REVIEW complete', next: 'Run documentation-specialist subagent to update CHANGELOG.md' },
  ];

  for (const check of [...checks].reverse()) {
    if (fs.existsSync(path.join(process.cwd(), check.file))) {
      return check;
    }
  }

  return { phase: 0, name: 'Pipeline not started', next: 'Run product-owner + ux-designer subagents to create docs/prd.md' };
}

function main() {
  const phase = detectPhase();
  const checkpoint = {
    timestamp: new Date().toISOString(),
    detectedPhase: phase.phase,
    phaseName: phase.name,
    nextAction: phase.next,
    note: 'Read this at the start of the next session to resume the pipeline.',
  };

  const dir = path.dirname(CHECKPOINT_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  console.log(`\n[checkpoint] ${phase.name}\n→ Next: ${phase.next}`);
}

main();