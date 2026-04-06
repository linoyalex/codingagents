const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function readFile(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function extractBranch(commandSource, startMarker, endMarker) {
  const start = commandSource.indexOf(startMarker);
  assert.notEqual(start, -1, `Expected to find branch marker: ${startMarker}`);

  const branchStart = start + startMarker.length;
  const end = endMarker ? commandSource.indexOf(endMarker, branchStart) : -1;
  const branch = end === -1
    ? commandSource.slice(branchStart)
    : commandSource.slice(branchStart, end);

  assert.ok(branch.trim().length > 0, `Expected non-empty branch for marker: ${startMarker}`);
  return branch;
}

test('Phase 4 successful security gate writes a forward handoff', () => {
  const command = readFile('commands/security-gate.md');
  const branch = extractBranch(
    command,
    'If there are NO BLOCKING findings,',
    'If there ARE BLOCKING findings,'
  );

  assert.match(
    branch,
    /write \.claude\/handoff\.json/i,
    'Expected the success branch to prepare the next phase handoff'
  );
});

test('Phase 4 blocked security gate does not write a handoff', () => {
  const command = readFile('commands/security-gate.md');
  const branch = extractBranch(command, 'If there ARE BLOCKING findings,');

  assert.doesNotMatch(
    branch,
    /write \.claude\/handoff\.json/i,
    'Blocked Phase 4 should stop the pipeline instead of writing a new handoff'
  );
});

test('Phase 6 approved review writes a forward handoff', () => {
  const command = readFile('commands/review.md');
  const branch = extractBranch(
    command,
    'If the verdict is APPROVE,',
    'If the verdict is REQUEST CHANGES,'
  );

  assert.match(
    branch,
    /write \.claude\/handoff\.json/i,
    'Expected the approval branch to prepare the documentation handoff'
  );
});

test('Phase 6 request-changes branch does not write a handoff', () => {
  const command = readFile('commands/review.md');
  const branch = extractBranch(command, 'If the verdict is REQUEST CHANGES,');

  assert.doesNotMatch(
    branch,
    /write \.claude\/handoff\.json/i,
    'Rejected Phase 6 should stop advancement instead of writing a new handoff'
  );
});
