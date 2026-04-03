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

function findFeatureDirs() {
  const featuresDir = path.join(process.cwd(), 'docs', 'features');
  if (!fs.existsSync(featuresDir)) return [];
  return fs.readdirSync(featuresDir).filter(f =>
    fs.statSync(path.join(featuresDir, f)).isDirectory()
  );
}

function detectPhase() {
  const features = findFeatureDirs();
  if (features.length === 0) {
    return { phase: 0, name: 'Pipeline not started', next: 'Run product-owner + ux-designer subagents to create docs/features/<feature>/prd.md' };
  }

  // Check the most recently modified feature directory
  const featuresDir = path.join(process.cwd(), 'docs', 'features');
  const latest = features
    .map(f => ({ name: f, mtime: fs.statSync(path.join(featuresDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].name;

  const featurePath = path.join(featuresDir, latest);
  const checks = [
    { file: 'review.md', phase: 6, name: `REVIEW complete (${latest})`, next: 'Run documentation-specialist subagent to update CHANGELOG.md' },
    { file: 'security-audit.md', phase: 4, name: `SECURITY GATE complete (${latest})`, next: 'Run developer subagent — TDD implement' },
    { file: 'architecture.md', phase: 2, name: `ARCHITECT complete (${latest})`, next: 'Run qa subagent to write failing tests' },
    { file: 'prd.md', phase: 1, name: `SPECIFY complete (${latest})`, next: `Run architect subagent on docs/features/${latest}/prd.md` },
  ];

  for (const check of checks) {
    if (fs.existsSync(path.join(featurePath, check.file))) {
      return { ...check, feature: latest };
    }
  }

  return { phase: 0, name: 'Pipeline not started', next: 'Run product-owner + ux-designer subagents to create docs/features/<feature>/prd.md' };
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