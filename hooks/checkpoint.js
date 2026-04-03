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

function getActiveFeature() {
  // Primary: read feature name from handoff.json (written by each pipeline phase)
  const handoffPath = path.join(process.cwd(), '.claude', 'handoff.json');
  if (fs.existsSync(handoffPath)) {
    try {
      const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
      if (handoff.feature) return handoff.feature;
    } catch (_) { /* fall through */ }
  }

  // Fallback: most recently modified feature directory
  const featuresDir = path.join(process.cwd(), 'docs', 'features');
  if (!fs.existsSync(featuresDir)) return null;
  const dirs = fs.readdirSync(featuresDir).filter(f =>
    fs.statSync(path.join(featuresDir, f)).isDirectory()
  );
  if (dirs.length === 0) return null;
  return dirs
    .map(f => ({ name: f, mtime: fs.statSync(path.join(featuresDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].name;
}

function hasFeatureTests(feature) {
  const contractTest = path.join(process.cwd(), 'tests', 'contracts', `${feature}.test.ts`);
  const e2eTest = path.join(process.cwd(), 'tests', 'e2e', `${feature}.spec.ts`);
  return fs.existsSync(contractTest) || fs.existsSync(e2eTest);
}

function detectPhase() {
  const feature = getActiveFeature();
  if (!feature) {
    return { phase: 0, name: 'Pipeline not started', next: 'Run /specify to create docs/features/<feature>/prd.md' };
  }

  const featurePath = path.join(process.cwd(), 'docs', 'features', feature);
  const has = (file) => fs.existsSync(path.join(featurePath, file));

  // Check highest phase first, descending
  const checks = [
    { test: () => has('review.md'), phase: 6, name: `REVIEW complete (${feature})`, next: `Run /document ${feature} to update CHANGELOG.md` },
    { test: () => has('security-audit.md') && hasFeatureTests(feature), phase: 5, name: `IMPLEMENT in progress (${feature})`, next: `Run /implement ${feature} — TDD red/green/refactor` },
    { test: () => has('security-audit.md'), phase: 4, name: `SECURITY GATE complete (${feature})`, next: `Run /implement ${feature} — TDD red/green/refactor` },
    { test: () => hasFeatureTests(feature), phase: 3, name: `TEST DESIGN complete (${feature})`, next: `Run /security-gate ${feature}` },
    { test: () => has('architecture.md'), phase: 2, name: `ARCHITECT complete (${feature})`, next: `Run /test-design ${feature}` },
    { test: () => has('prd.md'), phase: 1, name: `SPECIFY complete (${feature})`, next: `Run /architect ${feature}` },
  ];

  for (const check of checks) {
    if (check.test()) {
      return { ...check, feature };
    }
  }

  return { phase: 0, feature, name: `Feature directory exists but no artifacts (${feature})`, next: `Run /specify to create docs/features/${feature}/prd.md` };
}

function main() {
  const phase = detectPhase();
  const checkpoint = {
    timestamp: new Date().toISOString(),
    feature: phase.feature || null,
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