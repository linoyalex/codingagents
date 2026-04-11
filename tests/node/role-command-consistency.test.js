const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function readFile(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function extractFrontmatter(relativePath) {
  const source = readFile(relativePath);
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, `Expected frontmatter in ${relativePath}`);
  return match[1];
}

function parseInlineArray(frontmatter, key) {
  const regex = new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]$`, 'm');
  const match = frontmatter.match(regex);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

test('roles do not list the same tool in both tools and disallowedTools', () => {
  const roleFiles = fs.readdirSync(ROOT_DIR).filter((file) => /^ROLE_.*\.md$/.test(file));

  for (const roleFile of roleFiles) {
    const frontmatter = extractFrontmatter(roleFile);
    const allowed = new Set(parseInlineArray(frontmatter, 'tools'));
    const disallowed = new Set(parseInlineArray(frontmatter, 'disallowedTools'));
    const overlap = [...allowed].filter((tool) => disallowed.has(tool));
    assert.deepEqual(overlap, [], `${roleFile} has tools listed in both allow and disallow lists`);
  }
});

test('security reviewer role can write the audit artifact required by its command', () => {
  const frontmatter = extractFrontmatter('ROLE_SECURITY.md');
  const disallowed = parseInlineArray(frontmatter, 'disallowedTools');
  const command = readFile('commands/security-gate.md');

  assert.match(command, /Write findings to:\s+docs\/features\/\$ARGUMENTS\/security-audit\.md/);
  assert.equal(
    disallowed.includes('Write'),
    false,
    'ROLE_SECURITY.md disallows Write even though commands/security-gate.md requires writing security-audit.md'
  );
});

test('code reviewer role can write the review artifact required by its command', () => {
  const frontmatter = extractFrontmatter('ROLE_CODE_REVIEWER.md');
  const disallowed = parseInlineArray(frontmatter, 'disallowedTools');
  const command = readFile('commands/review.md');

  assert.match(command, /Write findings to docs\/features\/\$ARGUMENTS\/review\.md/);
  assert.equal(
    disallowed.includes('Write'),
    false,
    'ROLE_CODE_REVIEWER.md disallows Write even though commands/review.md requires writing review.md'
  );
});
