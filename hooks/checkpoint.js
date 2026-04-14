#!/usr/bin/env node
/**
 * checkpoint.js
 * Runs via Stop hook. Detects pipeline phase from file existence,
 * validates handoff.json (blocking gate), logs token usage, writes
 * a checkpoint JSON, and prints the next action.
 *
 * Install: place at .claude/helpers/checkpoint.js
 */

const fs = require('fs');
const path = require('path');

const CHECKPOINT_FILE = path.join(process.cwd(), '.claude', 'pipeline-checkpoint.json');
const HANDOFF_FILE = path.join(process.cwd(), '.claude', 'handoff.json');
const TOKEN_LOG = path.join(process.cwd(), '.claude', 'token-usage.jsonl');
const SESSION_STATE_FILE = path.join(process.cwd(), '.claude', '.session-state.json');

// --- Phase detection ---

function getActiveFeature() {
  // Primary: read feature name from handoff.json (written by each pipeline phase)
  if (fs.existsSync(HANDOFF_FILE)) {
    try {
      const handoff = JSON.parse(fs.readFileSync(HANDOFF_FILE, 'utf8'));
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
    return { phase: 0, name: 'Pipeline not started', next: 'Run /specify to create docs/features/<feature>/prd.md', phaseName: 'none' };
  }

  const featurePath = path.join(process.cwd(), 'docs', 'features', feature);
  const has = (file) => fs.existsSync(path.join(featurePath, file));

  // Check highest phase first, descending
  const checks = [
    {
      test: () => has('review.md') && fs.existsSync(path.join(process.cwd(), 'CHANGELOG.md')),
      phase: 7, name: `DOCUMENT complete (${feature})`, next: 'Pipeline complete. Merge to main after final checks.',
      phaseName: 'document',
    },
    { test: () => has('review.md'), phase: 6, name: `REVIEW complete (${feature})`, next: `Run /document ${feature} to update CHANGELOG.md`, phaseName: 'review' },
    { test: () => has('security-audit.md') && hasFeatureTests(feature), phase: 5, name: `IMPLEMENT in progress (${feature})`, next: `Run /implement ${feature} — TDD red/green/refactor`, phaseName: 'implement' },
    { test: () => has('security-audit.md'), phase: 4, name: `SECURITY GATE complete (${feature})`, next: `Run /implement ${feature} — TDD red/green/refactor`, phaseName: 'security-gate' },
    { test: () => hasFeatureTests(feature), phase: 3, name: `TEST DESIGN complete (${feature})`, next: `Run /security-gate ${feature}`, phaseName: 'test-design' },
    { test: () => has('architecture.md'), phase: 2, name: `ARCHITECT complete (${feature})`, next: `Run /test-design ${feature}`, phaseName: 'architect' },
    { test: () => has('prd.md'), phase: 1, name: `SPECIFY complete (${feature})`, next: `Run /architect ${feature}`, phaseName: 'specify' },
  ];

  for (const check of checks) {
    if (check.test()) {
      return { ...check, feature };
    }
  }

  return { phase: 0, feature, name: `Feature directory exists but no artifacts (${feature})`, next: `Run /specify to create docs/features/${feature}/prd.md`, phaseName: 'none' };
}

// Map handoff phase number to deterministic phase info (no heuristics needed)
// Feature name is injected at runtime from handoff.json
function buildPhaseMap(feature) {
  const f = feature || '<feature>';
  return {
    1: { phase: 1, name: `SPECIFY complete (${f})`, next: `Run /architect ${f}`, phaseName: 'specify' },
    2: { phase: 2, name: `ARCHITECT complete (${f})`, next: `Run /test-design ${f}`, phaseName: 'architect' },
    3: { phase: 3, name: `TEST DESIGN complete (${f})`, next: `Run /security-gate ${f}`, phaseName: 'test-design' },
    4: { phase: 4, name: `SECURITY GATE complete (${f})`, next: `Run /implement ${f} — TDD red/green/refactor`, phaseName: 'security-gate' },
    5: { phase: 5, name: `IMPLEMENT complete (${f})`, next: 'Run code-reviewer subagent on git diff (fresh context)', phaseName: 'implement' },
    6: { phase: 6, name: `REVIEW complete (${f})`, next: `Run /document ${f} to update CHANGELOG.md`, phaseName: 'review' },
    7: { phase: 7, name: `DOCUMENT complete (${f})`, next: 'Pipeline complete. Merge to main after final checks.', phaseName: 'document' },
  };
}

function phaseFromHandoff(handoff) {
  if (handoff && typeof handoff.phase === 'number') {
    const map = buildPhaseMap(handoff.feature);
    if (map[handoff.phase]) {
      return { ...map[handoff.phase], feature: handoff.feature };
    }
  }
  return null;
}

// --- Handoff validation ---

// NOTE: This validation logic must stay in sync with schemas/handoff.schema.json
// and skills/verification-gate/SKILL.md (Handoff Validation section).
function validateHandoff() {
  if (!fs.existsSync(HANDOFF_FILE)) {
    return { valid: false, reason: 'handoff.json not found at .claude/handoff.json' };
  }

  let handoff;
  try {
    handoff = JSON.parse(fs.readFileSync(HANDOFF_FILE, 'utf8'));
  } catch (err) {
    return { valid: false, reason: `handoff.json parse error: ${err.message}` };
  }

  // Check required fields
  const required = ['feature', 'phase', 'goal', 'scope', 'relevant_files', 'acceptance_criteria', 'verification_commands', 'source_spec'];
  const missing = required.filter(f => !(f in handoff));
  if (missing.length > 0) {
    return { valid: false, reason: `handoff.json missing required fields: ${missing.join(', ')}` };
  }

  // Type validation against schema constraints
  const errors = [];

  if (typeof handoff.feature !== 'string' || handoff.feature.length === 0) {
    errors.push('feature must be a non-empty string');
  }
  if (typeof handoff.phase !== 'number' || !Number.isInteger(handoff.phase) || handoff.phase < 1 || handoff.phase > 7) {
    errors.push('phase must be an integer between 1 and 7');
  }
  if (typeof handoff.goal !== 'string' || handoff.goal.length === 0) {
    errors.push('goal must be a non-empty string');
  }
  if (typeof handoff.scope !== 'string' || handoff.scope.length === 0) {
    errors.push('scope must be a non-empty string');
  }
  if (!Array.isArray(handoff.relevant_files)) {
    errors.push('relevant_files must be an array');
  }
  if (!Array.isArray(handoff.acceptance_criteria)) {
    errors.push('acceptance_criteria must be an array');
  }
  if (!Array.isArray(handoff.verification_commands)) {
    errors.push('verification_commands must be an array');
  }
  if (handoff.constraints !== undefined && !Array.isArray(handoff.constraints)) {
    errors.push('constraints must be an array if present');
  }
  if (handoff.known_risks !== undefined && !Array.isArray(handoff.known_risks)) {
    errors.push('known_risks must be an array if present');
  }
  if (typeof handoff.source_spec !== 'string' || handoff.source_spec.length === 0) {
    errors.push('source_spec must be a non-empty string');
  } else {
    // Path traversal guard: reject '..' segments, absolute paths, and non-github URLs
    const spec = handoff.source_spec;
    if (spec.includes('..')) {
      errors.push('source_spec must not contain ".." path segments (path traversal)');
    } else if (spec.startsWith('/')) {
      errors.push('source_spec must be relative to project root (no absolute paths)');
    } else if (!spec.startsWith('docs/') && !spec.startsWith('https://github.com/')) {
      errors.push('source_spec must start with "docs/" (local file) or "https://github.com/" (URL)');
    }
    // File-existence check for local paths (AC16)
    // Skip when checkpoint_pending is set — the handoff is mid-phase and the
    // target file (e.g. PRD) may not exist yet at checkpoint time.
    if (!handoff.checkpoint_pending && !spec.startsWith('https://') && spec.startsWith('docs/')) {
      const resolved = path.resolve(process.cwd(), spec);
      if (!fs.existsSync(resolved)) {
        errors.push(`source_spec file not found: ${spec}`);
      }
    }
  }
  if (handoff.produced_by !== undefined && typeof handoff.produced_by !== 'string') {
    errors.push('produced_by must be a string if present');
  }

  // Check for unexpected properties (additionalProperties: false in schema)
  const allowed = ['feature', 'phase', 'goal', 'scope', 'constraints', 'relevant_files',
                   'acceptance_criteria', 'verification_commands', 'known_risks', 'produced_by', 'timestamp', 'source_spec',
                   'checkpoint_pending'];
  const unexpected = Object.keys(handoff).filter(k => !allowed.includes(k));
  if (unexpected.length > 0) {
    errors.push(`unexpected properties: ${unexpected.join(', ')}`);
  }

  if (errors.length > 0) {
    return { valid: false, reason: `handoff.json schema validation failed: ${errors.join('; ')}` };
  }

  return { valid: true, handoff };
}

// --- Token tracking ---

function countIteration(feature, phase) {
  if (!fs.existsSync(TOKEN_LOG)) return 1;

  try {
    const lines = fs.readFileSync(TOKEN_LOG, 'utf8').trim().split('\n').filter(Boolean);
    let count = 0;
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.feature === feature && entry.phase === phase && entry.entry_type === 'final') {
          count++;
        }
      } catch { /* skip malformed lines */ }
    }
    return count + 1;
  } catch {
    return 1;
  }
}

function inferCycle(feature, phase, iteration) {
  if (iteration === 1) return 'full';
  if (['implement', 'review', 'test-design'].includes(phase)) {
    return 'implement-review';
  }
  return 'full';
}

function resolveAgentAndModel(sessionState, handoff) {
  // Priority: handoff.produced_by > session state > fallback from phase detection
  let agent = sessionState.agent || 'unknown';
  let model = sessionState.model || 'unknown';

  if (handoff) {
    if (handoff.produced_by) {
      agent = handoff.produced_by;
    }

    // Infer model from agent role based on pipeline model routing
    if (model === 'unknown' && agent !== 'unknown') {
      const modelMap = {
        'product-owner': 'claude-haiku-4-5',
        'ux-designer': 'claude-haiku-4-5',
        'architect': 'claude-opus-4-6',
        'qa': 'claude-sonnet-4-6',
        'security-reviewer': 'claude-opus-4-6',
        'developer': 'claude-sonnet-4-6',
        'code-reviewer': 'claude-sonnet-4-6',
        'documentation-specialist': 'claude-haiku-4-5',
      };
      model = modelMap[agent] || 'unknown';
    }
  }

  return { agent, model };
}

function logTokenUsage(phase, feature, handoff) {
  // Read session state written by SessionStart hook
  let sessionState = {};
  if (fs.existsSync(SESSION_STATE_FILE)) {
    try {
      sessionState = JSON.parse(fs.readFileSync(SESSION_STATE_FILE, 'utf8'));
    } catch { /* use defaults */ }
  }

  const startTime = sessionState.startTime || Date.now();
  const durationSeconds = Math.round((Date.now() - startTime) / 1000);
  const featureName = feature || sessionState.feature || 'unknown';
  const phaseName = phase.phaseName || 'unknown';
  const iteration = countIteration(featureName, phaseName);
  const { agent, model } = resolveAgentAndModel(sessionState, handoff);

  const entry = {
    timestamp: new Date().toISOString(),
    feature: featureName,
    phase: phaseName,
    agent,
    model,
    iteration,
    cycle: inferCycle(featureName, phaseName, iteration),
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cache_read_tokens: 0,
    duration_seconds: durationSeconds,
    verification_passed: null,
    token_source: 'estimated',
    entry_type: 'final',
  };

  // Try to read token stats from environment if available
  if (process.env.CLAUDE_CODE_INPUT_TOKENS) {
    entry.input_tokens = parseInt(process.env.CLAUDE_CODE_INPUT_TOKENS, 10) || 0;
    entry.output_tokens = parseInt(process.env.CLAUDE_CODE_OUTPUT_TOKENS, 10) || 0;
    entry.total_tokens = entry.input_tokens + entry.output_tokens;
    entry.cache_read_tokens = parseInt(process.env.CLAUDE_CODE_CACHE_READ_TOKENS, 10) || 0;
    entry.token_source = 'api';
  }

  try {
    const dir = path.dirname(TOKEN_LOG);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(TOKEN_LOG, JSON.stringify(entry) + '\n');
    console.error(`[token-tracking] Logged ${entry.total_tokens || '(estimated)'} tokens for ${phaseName} (${agent}/${model}) iter ${iteration}`);
  } catch (err) {
    console.error(`[token-tracking] Failed to log (non-blocking): ${err.message}`);
  }

  // Clean up session state
  try {
    if (fs.existsSync(SESSION_STATE_FILE)) {
      fs.unlinkSync(SESSION_STATE_FILE);
    }
  } catch { /* non-blocking */ }
}

// --- Main ---

function main() {
  // Validate handoff — this is a BLOCKING gate
  const handoffResult = validateHandoff();

  if (!handoffResult.valid) {
    // Handoff missing or invalid — fall back to heuristic phase detection for diagnostics only
    const phase = detectPhase();

    console.error(`[handoff] ✗ BLOCKING: ${handoffResult.reason}`);
    console.error(`[handoff] The pipeline cannot proceed to the next phase without a valid .claude/handoff.json.`);
    console.error(`[handoff] Write handoff.json with required fields: feature, phase, goal, scope, relevant_files, acceptance_criteria, verification_commands`);

    // Still log token usage and write checkpoint for diagnostics, but exit with error
    logTokenUsage(phase, null, null);

    const checkpoint = {
      timestamp: new Date().toISOString(),
      feature: phase.feature || null,
      detectedPhase: phase.phase,
      phaseName: phase.name,
      nextAction: 'BLOCKED — write .claude/handoff.json before proceeding',
      handoffValid: false,
      handoffError: handoffResult.reason,
      note: 'Handoff validation failed. Fix handoff.json and re-run the phase.',
    };
    const dir = path.dirname(CHECKPOINT_FILE);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));

    process.exit(1);
  }

  // Artifact-based detection is primary; handoff provides attribution (feature, produced_by)
  // Only fall back to handoff phase if no artifacts are found (phase 0)
  const artifactPhase = detectPhase();
  const feature = handoffResult.handoff.feature;
  const phase = (artifactPhase.phase > 0)
    ? { ...artifactPhase, feature }
    : (phaseFromHandoff(handoffResult.handoff) || artifactPhase);

  console.error(`[handoff] ✓ handoff.json valid for feature: ${feature} (phase ${handoffResult.handoff.phase})`);

  // Log token usage with handoff metadata
  logTokenUsage(phase, feature, handoffResult.handoff);

  // Write checkpoint
  const checkpoint = {
    timestamp: new Date().toISOString(),
    feature,
    detectedPhase: phase.phase,
    phaseName: phase.name,
    nextAction: phase.next,
    handoffValid: true,
    note: 'Read this at the start of the next session to resume the pipeline.',
  };

  const dir = path.dirname(CHECKPOINT_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  console.log(`\n[checkpoint] ${phase.name}\n→ Next: ${phase.next}`);
}

// Export for testing; run main() only when executed directly
if (require.main === module) {
  main();
}

module.exports = { validateHandoff, detectPhase, phaseFromHandoff };
