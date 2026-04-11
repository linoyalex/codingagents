const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

// --- Unit tests for classifyFeatureArgs and resolveFeatureTarget ---

const { classifyFeatureArgs, resolveFeatureTarget } = require(
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

test('source and installed resolve-feature.js are byte-identical', () => {
  // The source hooks/ version may not exist (resolve-feature.js lives only in .claude/helpers/)
  // but if it does, they must match
  const installedPath = path.join(ROOT_DIR, '.claude', 'helpers', 'resolve-feature.js');
  const installed = fs.readFileSync(installedPath, 'utf8');
  assert.ok(installed.length > 0, 'installed resolve-feature.js must not be empty');
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
