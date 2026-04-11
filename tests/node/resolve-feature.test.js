const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

// --- Unit tests for classifyFeatureArgs and resolveFeatureTarget ---

const { classifyFeatureArgs, parseCliArgs, resolveFeatureTarget } = require(
  path.join(ROOT_DIR, '.claude', 'helpers', 'resolve-feature.js')
);

// classifyFeatureArgs

test('classifyFeatureArgs: empty string returns kind=empty', () => {
  assert.deepStrictEqual(classifyFeatureArgs(''), { kind: 'empty', value: '' });
});

test('classifyFeatureArgs: whitespace-only returns kind=empty', () => {
  assert.deepStrictEqual(classifyFeatureArgs('   '), { kind: 'empty', value: '' });
});

test('classifyFeatureArgs: undefined returns kind=empty', () => {
  assert.deepStrictEqual(classifyFeatureArgs(undefined), { kind: 'empty', value: '' });
});

test('classifyFeatureArgs: valid slug returns kind=slug', () => {
  const result = classifyFeatureArgs('my-feature');
  assert.equal(result.kind, 'slug');
  assert.equal(result.value, 'my-feature');
});

test('classifyFeatureArgs: slug with numbers is valid', () => {
  const result = classifyFeatureArgs('feature-v2');
  assert.equal(result.kind, 'slug');
});

test('classifyFeatureArgs: uppercase rejected as invalid', () => {
  const result = classifyFeatureArgs('MyFeature');
  assert.equal(result.kind, 'invalid');
});

test('classifyFeatureArgs: spaces rejected as invalid', () => {
  const result = classifyFeatureArgs('my feature');
  assert.equal(result.kind, 'invalid');
});

test('classifyFeatureArgs: special chars rejected as invalid', () => {
  const result = classifyFeatureArgs('my_feature!');
  assert.equal(result.kind, 'invalid');
});

test('classifyFeatureArgs: path-like string rejected as invalid', () => {
  const result = classifyFeatureArgs('docs/features/my-feature');
  assert.equal(result.kind, 'invalid');
});

// --- parseCliArgs tests ---

test('parseCliArgs: standard flags are parsed correctly', () => {
  const result = parseCliArgs(['--command', 'implement', '--phase', '5', '--args', 'user-auth']);
  assert.equal(result.command, 'implement');
  assert.equal(result.phase, '5');
  assert.equal(result.args, 'user-auth');
});

test('parseCliArgs: trailing positional tokens after --args are rejected', () => {
  // This is the Codex-found BLOCKING edge case: unquoted multi-word args like
  // --args user-auth garbage should not silently discard "garbage"
  assert.throws(
    () => parseCliArgs(['--command', 'implement', '--phase', '5', '--args', 'user-auth', 'garbage']),
    /unexpected positional/i,
    'stray positional tokens after flag values must cause an error'
  );
});

test('parseCliArgs: multiple trailing positional tokens are rejected', () => {
  assert.throws(
    () => parseCliArgs(['--command', 'implement', '--phase', '5', '--args', 'user-auth', 'extra', 'tokens']),
    /unexpected positional/i
  );
});

test('parseCliArgs: flag without value at end gets empty string', () => {
  const result = parseCliArgs(['--command', 'implement', '--phase', '5', '--args', '']);
  assert.equal(result.command, 'implement');
  assert.equal(result.args, '');
});

test('parseCliArgs: unknown flags are rejected', () => {
  assert.throws(
    () => parseCliArgs(['--command', 'implement', '--phase', '5', '--args', 'user-auth', '--bogus', 'garbage']),
    /unknown flag/i,
    'unrecognized --flags must cause an error'
  );
});

test('parseCliArgs: unknown flag without value is rejected', () => {
  assert.throws(
    () => parseCliArgs(['--command', 'implement', '--phase', '5', '--args', 'user-auth', '--bogus']),
    /unknown flag/i
  );
});

// --- resolveFeatureTarget decision matrix tests ---
// These test the core safety logic that ISS-009 exists to protect.
// We use _handoffOverride to inject handoff state without touching the filesystem.

function validHandoff(overrides = {}) {
  return {
    valid: true,
    handoff: {
      feature: 'user-auth',
      phase: 4,
      ...overrides,
    },
  };
}

const INVALID_HANDOFF = { valid: false, reason: 'handoff.json not found' };

test('resolveFeatureTarget: malformed args hard-fail with INVALID_ARGS', () => {
  const result = resolveFeatureTarget({
    rawArgs: 'My Feature!',
    commandName: 'implement',
    targetPhase: 5,
    _handoffOverride: validHandoff(),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'INVALID_ARGS');
  assert.match(result.message, /malformed or ambiguous/);
});

test('resolveFeatureTarget: malformed args do NOT fall back to handoff', () => {
  const result = resolveFeatureTarget({
    rawArgs: 'bad feature',
    commandName: 'implement',
    targetPhase: 5,
    _handoffOverride: validHandoff(),
  });
  assert.equal(result.ok, false, 'must not silently proceed on mangled args');
  assert.equal(result.code, 'INVALID_ARGS');
});

test('resolveFeatureTarget: valid slug with matching handoff succeeds', () => {
  const result = resolveFeatureTarget({
    rawArgs: 'user-auth',
    commandName: 'implement',
    targetPhase: 5,
    _handoffOverride: validHandoff({ phase: 4 }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.feature, 'user-auth');
  assert.equal(result.source, 'args');
});

test('resolveFeatureTarget: slug mismatch with handoff hard-fails with FEATURE_MISMATCH', () => {
  const result = resolveFeatureTarget({
    rawArgs: 'user-auth',
    commandName: 'implement',
    targetPhase: 5,
    _handoffOverride: validHandoff({ feature: 'other-feature', phase: 4 }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'FEATURE_MISMATCH');
  assert.match(result.message, /user-auth/);
  assert.match(result.message, /other-feature/);
});

test('resolveFeatureTarget: empty args with valid handoff at correct phase falls back to handoff', () => {
  const result = resolveFeatureTarget({
    rawArgs: '',
    commandName: 'implement',
    targetPhase: 5,
    _handoffOverride: validHandoff({ phase: 4 }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.feature, 'user-auth');
  assert.equal(result.source, 'handoff');
});

test('resolveFeatureTarget: empty args with stale handoff phase hard-fails with STALE_HANDOFF', () => {
  const result = resolveFeatureTarget({
    rawArgs: '',
    commandName: 'implement',
    targetPhase: 5,
    _handoffOverride: validHandoff({ phase: 2 }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'STALE_HANDOFF');
  assert.match(result.message, /Phase 4/);
});

test('resolveFeatureTarget: empty args with no handoff hard-fails with NO_FALLBACK', () => {
  const result = resolveFeatureTarget({
    rawArgs: '',
    commandName: 'implement',
    targetPhase: 5,
    _handoffOverride: INVALID_HANDOFF,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'NO_FALLBACK');
});

test('resolveFeatureTarget: valid slug with invalid handoff succeeds with warning', () => {
  const result = resolveFeatureTarget({
    rawArgs: 'user-auth',
    commandName: 'implement',
    targetPhase: 5,
    _handoffOverride: INVALID_HANDOFF,
  });
  assert.equal(result.ok, true);
  assert.equal(result.feature, 'user-auth');
  assert.equal(result.source, 'args');
  assert.ok(result.warnings.length > 0, 'should warn about invalid handoff');
});

test('resolveFeatureTarget: valid slug with wrong handoff phase succeeds with warning', () => {
  const result = resolveFeatureTarget({
    rawArgs: 'user-auth',
    commandName: 'implement',
    targetPhase: 5,
    _handoffOverride: validHandoff({ phase: 2 }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.feature, 'user-auth');
  assert.equal(result.source, 'args');
  assert.ok(result.warnings.some(w => /phase/.test(w)), 'should warn about phase mismatch');
});

// --- Command wiring tests: all pipeline commands must use resolve-feature.js ---

function readCommand(name) {
  return fs.readFileSync(path.join(ROOT_DIR, 'commands', `${name}.md`), 'utf8');
}

const PIPELINE_COMMANDS = [
  { name: 'architect', phase: 2 },
  { name: 'test-design', phase: 3 },
  { name: 'security-gate', phase: 4 },
  { name: 'implement', phase: 5 },
  { name: 'review', phase: 6 },
  { name: 'document', phase: 7 },
];

for (const { name, phase } of PIPELINE_COMMANDS) {
  test(`/${name} command wires through resolve-feature.js with phase ${phase}`, () => {
    const source = readCommand(name);

    assert.match(
      source,
      /resolve-feature\.js/,
      `/${name} must invoke resolve-feature.js for safe feature resolution`
    );

    const phasePattern = new RegExp(`--phase\\s+${phase}`);
    assert.match(
      source,
      phasePattern,
      `/${name} must pass --phase ${phase} to resolve-feature.js`
    );

    assert.match(
      source,
      /--args\s+"\$ARGUMENTS"/,
      `/${name} must forward $ARGUMENTS to resolve-feature.js`
    );

    assert.match(
      source,
      /exits?\s+non-zero.*stop|If that command exits non-zero/i,
      `/${name} must stop on non-zero exit from resolve-feature.js`
    );
  });
}

// specify (Phase 1) is an exception — no prior handoff to validate
test('/specify does not require resolve-feature.js (Phase 1 has no prior handoff)', () => {
  const source = readCommand('specify');
  // Phase 1 takes raw args — no handoff fallback risk
  assert.doesNotMatch(
    source,
    /resolve-feature\.js/,
    '/specify is Phase 1 and should not need resolve-feature.js'
  );
});

// --- Installed copy sync test ---

test('checkpoint.js installed and source copies are in sync on require.main guard', () => {
  const sourcePath = path.join(ROOT_DIR, 'hooks', 'checkpoint.js');
  const installedPath = path.join(ROOT_DIR, '.claude', 'helpers', 'checkpoint.js');

  const source = fs.readFileSync(sourcePath, 'utf8');
  const installed = fs.readFileSync(installedPath, 'utf8');

  const sourceHasGuard = /if\s*\(require\.main\s*===\s*module\)/.test(source);
  const installedHasGuard = /if\s*\(require\.main\s*===\s*module\)/.test(installed);

  assert.ok(sourceHasGuard, 'source checkpoint.js must guard main() with require.main');
  assert.ok(installedHasGuard, 'installed checkpoint.js must guard main() with require.main');
});

// --- Installed command copies must also wire through resolve-feature.js ---

test('installed commands (.claude/commands/) match source commands for resolve-feature wiring', () => {
  for (const { name } of PIPELINE_COMMANDS) {
    const sourcePath = path.join(ROOT_DIR, 'commands', `${name}.md`);
    const installedPath = path.join(ROOT_DIR, '.claude', 'commands', `${name}.md`);

    if (!fs.existsSync(installedPath)) continue;

    const source = fs.readFileSync(sourcePath, 'utf8');
    const installed = fs.readFileSync(installedPath, 'utf8');

    const sourceHasResolve = /resolve-feature\.js/.test(source);
    const installedHasResolve = /resolve-feature\.js/.test(installed);

    assert.equal(
      sourceHasResolve,
      installedHasResolve,
      `${name}: source and installed must agree on resolve-feature.js wiring`
    );
  }
});
