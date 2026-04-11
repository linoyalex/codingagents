#!/usr/bin/env node
/**
 * resolve-feature.js
 * Resolves the target feature for a pipeline command. Fails closed when
 * command arguments are malformed, ambiguous, or conflict with a valid handoff.
 *
 * Install: place at .claude/helpers/resolve-feature.js
 */

const { validateHandoff } = require('./checkpoint.js');

const FEATURE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const KNOWN_FLAGS = new Set(['command', 'phase', 'args']);

function parseCliArgs(argv) {
  const parsed = {};
  const positional = [];
  const unknown = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }

    const flag = token.slice(2);

    if (!KNOWN_FLAGS.has(flag)) {
      unknown.push(token);
      continue;
    }

    // If the next token looks like a flag (starts with '--'), treat the current
    // flag as having no value. This means `--args --something` records args=''
    // and then '--something' is processed as an unknown flag (rejected below).
    // The behaviour is safe: the unknown-flag guard catches the orphaned token.
    if (next === undefined || next.startsWith('--')) {
      parsed[flag] = '';
      continue;
    }

    parsed[flag] = next;
    index += 1;
  }

  if (unknown.length > 0) {
    throw new Error(`Unknown flag(s): ${unknown.join(', ')}. Accepted flags: ${[...KNOWN_FLAGS].map(f => '--' + f).join(', ')}.`);
  }

  if (positional.length > 0) {
    throw new Error(`Unexpected positional arguments: ${positional.join(' ')}. All arguments must be passed as --flag value pairs.`);
  }

  return parsed;
}

function classifyFeatureArgs(rawArgs) {
  const value = typeof rawArgs === 'string' ? rawArgs.trim() : '';

  if (value.length === 0) {
    return { kind: 'empty', value };
  }

  if (!FEATURE_SLUG_RE.test(value)) {
    return { kind: 'invalid', value };
  }

  return { kind: 'slug', value };
}

function readValidatedHandoff() {
  const result = validateHandoff();
  if (!result.valid) {
    return { valid: false, reason: result.reason };
  }

  return { valid: true, handoff: result.handoff };
}

function formatRecovery(commandName, feature) {
  if (feature) {
    return `Re-run /${commandName} ${feature} or repair .claude/handoff.json before proceeding.`;
  }

  return `Re-run /${commandName} <feature-slug> after fixing .claude/handoff.json or the command arguments.`;
}

function resolveFeatureTarget({ rawArgs, commandName, targetPhase, _handoffOverride }) {
  const argResult = classifyFeatureArgs(rawArgs);
  const handoffResult = _handoffOverride !== undefined ? _handoffOverride : readValidatedHandoff();
  const requiredHandoffPhase = Number.isInteger(targetPhase) ? targetPhase - 1 : null;

  if (argResult.kind === 'invalid') {
    return {
      ok: false,
      code: 'INVALID_ARGS',
      message: `/${commandName} arguments are malformed or ambiguous: "${argResult.value}". Do not rely on handoff fallback for corrupted input. ${formatRecovery(commandName)}`,
    };
  }

  if (argResult.kind === 'slug') {
    if (handoffResult.valid && handoffResult.handoff.feature !== argResult.value) {
      return {
        ok: false,
        code: 'FEATURE_MISMATCH',
        message: `/${commandName} target mismatch: command requested "${argResult.value}" but .claude/handoff.json targets "${handoffResult.handoff.feature}". ${formatRecovery(commandName, handoffResult.handoff.feature)}`,
      };
    }

    const warnings = [];

    if (!handoffResult.valid) {
      warnings.push(`ignoring invalid handoff because explicit feature was supplied: ${handoffResult.reason}`);
    } else if (requiredHandoffPhase !== null && handoffResult.handoff.phase !== requiredHandoffPhase) {
      warnings.push(`handoff phase is ${handoffResult.handoff.phase}, expected ${requiredHandoffPhase} before Phase ${targetPhase}; continuing because explicit feature was supplied`);
    }

    return {
      ok: true,
      feature: argResult.value,
      source: 'args',
      warnings,
    };
  }

  if (!handoffResult.valid) {
    return {
      ok: false,
      code: 'NO_FALLBACK',
      message: `/${commandName} needs a feature slug or a valid .claude/handoff.json. Current handoff error: ${handoffResult.reason}. ${formatRecovery(commandName)}`,
    };
  }

  if (requiredHandoffPhase !== null && handoffResult.handoff.phase !== requiredHandoffPhase) {
    return {
      ok: false,
      code: 'STALE_HANDOFF',
      message: `Empty /${commandName} arguments can only fall back to a Phase ${requiredHandoffPhase} handoff. Current handoff is phase ${handoffResult.handoff.phase} for feature "${handoffResult.handoff.feature}". ${formatRecovery(commandName, handoffResult.handoff.feature)}`,
    };
  }

  return {
    ok: true,
    feature: handoffResult.handoff.feature,
    source: 'handoff',
    warnings: [],
  };
}

function main() {
  let options;
  try {
    options = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`[resolve-feature] ${err.message}`);
    process.exit(1);
  }
  const commandName = options.command || 'implement';
  const targetPhase = Number.parseInt(options.phase || '', 10);

  if (!Number.isInteger(targetPhase)) {
    console.error('[resolve-feature] Missing or invalid --phase value');
    // Exit 2 = bad invocation (missing/invalid flags), analogous to shell convention.
    // Exit 1 = pipeline logic failure (feature mismatch, stale handoff, etc.).
    // Callers currently check non-zero only; this distinction is reserved for
    // future tooling that may need to differentiate misuse from logic errors.
    process.exit(2);
  }

  const result = resolveFeatureTarget({
    rawArgs: options.args || '',
    commandName,
    targetPhase,
  });

  if (!result.ok) {
    console.error(`[resolve-feature] ${result.message}`);
    process.exit(1);
  }

  for (const warning of result.warnings) {
    console.error(`[resolve-feature] warning: ${warning}`);
  }

  process.stdout.write(JSON.stringify({
    feature: result.feature,
    source: result.source,
  }) + '\n');
}

if (require.main === module) {
  main();
}

module.exports = {
  classifyFeatureArgs,
  parseCliArgs,
  resolveFeatureTarget,
};
