const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

test('authoring commands include review feedback loop and resolution-note instructions', () => {
  const cases = [
    {
      path: 'commands/specify.md',
      patterns: [
        /^## Review Feedback Loop$/m,
        /review-codex-prd-<feature-slug>\.md/,
        /## Resolution Notes/,
        /ADDRESSED \| DEFERRED \| DISPUTED/,
      ],
    },
    {
      path: 'commands/architect.md',
      patterns: [
        /^## Review Feedback Loop$/m,
        /review-codex-architecture-\$ARGUMENTS\.md/,
        /## Resolution Notes/,
        /ADDRESSED \| DEFERRED \| DISPUTED/,
      ],
    },
    {
      path: 'commands/test-design.md',
      patterns: [
        /^## Review Feedback Loop$/m,
        /review-codex-tests-\$ARGUMENTS\.md/,
        /## Resolution Notes/,
        /ADDRESSED \| DEFERRED \| DISPUTED/,
      ],
    },
    {
      path: 'commands/implement.md',
      patterns: [
        /^## Review Feedback Loop$/m,
        /security-audit\.md/,
        /review-codex-code-<feature>\.md/,
        /## Resolution Notes/,
        /ADDRESSED \| DEFERRED \| DISPUTED/,
      ],
    },
  ];

  for (const { path: relativePath, patterns } of cases) {
    const content = read(relativePath);
    for (const pattern of patterns) {
      assert.match(
        content,
        pattern,
        `${relativePath} must include ${pattern} to preserve the review feedback loop`
      );
    }
  }
});

test('review commands inspect existing review context and inline response notes', () => {
  const reviewCommand = read('commands/review.md');
  const securityGate = read('commands/security-gate.md');

  assert.match(reviewCommand, /^## Existing Review Context$/m);
  assert.match(reviewCommand, /review-codex-code-\$ARGUMENTS\.md/);
  assert.match(reviewCommand, /## Resolution Notes|## Resolutions/);

  assert.match(securityGate, /^## Existing Review Context$/m);
  assert.match(securityGate, /security-audit\.md/);
  assert.match(securityGate, /## Resolution Notes|## Resolutions/);
});

test('codex reviewer docs require reading prior responses before re-review', () => {
  const readme = read('codex/reviewers/README.md');
  assert.match(readme, /phase-relevant review artifact/);
  assert.match(readme, /## Resolution Notes|## Resolutions/);

  const cases = [
    ['codex/reviewers/review-prd.md', /review-codex-prd-<feature>\.md/],
    ['codex/reviewers/review-architecture.md', /review-codex-architecture-<feature>\.md/],
    ['codex/reviewers/review-test-design.md', /review-codex-tests-<feature>\.md/],
    ['codex/reviewers/review-code.md', /review-codex-code-<feature>\.md/],
  ];

  for (const [relativePath, artifactPattern] of cases) {
    const content = read(relativePath);
    assert.match(content, /^## Existing Review Context$/m);
    assert.match(content, /## Resolution Notes|## Resolutions/);
    assert.match(content, artifactPattern);
  }
});
