/**
 * Integration tests for invariants-audit feature
 *
 * Feature: invariants-audit
 * Production-wiring seam: init.sh / upgrade.sh installs skills/invariants-audit/
 *   to .claude/skills/invariants-audit/ with byte-identical content.
 *
 * RED state: skills/invariants-audit/ does not exist yet; init.sh has not been
 *   updated to install it (though cp -r covers new subdirs automatically).
 *   Tests fail because source files are missing.
 *
 * Cases covered:
 *   Happy:   Source skill files exist at expected paths with correct content
 *   Edge:    Installed copy must remain byte-identical to source (drift detection)
 *   Misuse:  Missing sibling reference file causes broken [See reference:] link
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

// ---------------------------------------------------------------------------
// AC1: Skill file exists at canonical source path
// This is the production entry point — reading from the filesystem mirrors
// what the installer and skill-loading commands do at runtime.
// ---------------------------------------------------------------------------

test('AC1 (invariants-audit, integration): skills/invariants-audit/SKILL.md exists at source path', () => {
  assert.ok(
    exists('skills/invariants-audit/SKILL.md'),
    'skills/invariants-audit/SKILL.md must exist — create this file to satisfy AC1'
  );
});

test('AC1 (invariants-audit, integration): skills/invariants-audit/review-categories.md exists at source path', () => {
  assert.ok(
    exists('skills/invariants-audit/review-categories.md'),
    'skills/invariants-audit/review-categories.md must exist — the sibling reference file for AC2 review categories'
  );
});

// ---------------------------------------------------------------------------
// AC1a: Installed copies exist and are byte-identical to source
// This proves the installer (init.sh / upgrade.sh) ran correctly.
// Matches the byte-identity pattern established by ISS-009.
// ---------------------------------------------------------------------------

test('AC1a (invariants-audit, integration): .claude/skills/invariants-audit/SKILL.md exists', () => {
  assert.ok(
    exists('.claude/skills/invariants-audit/SKILL.md'),
    '.claude/skills/invariants-audit/SKILL.md must exist — installer must copy source to installed path'
  );
});

test('AC1a (invariants-audit, integration): installed SKILL.md content is identical to source', () => {
  const source = read('skills/invariants-audit/SKILL.md');
  const installed = read('.claude/skills/invariants-audit/SKILL.md');
  assert.equal(
    installed,
    source,
    '.claude/skills/invariants-audit/SKILL.md must be byte-identical to skills/invariants-audit/SKILL.md — run init.sh or upgrade.sh to sync (AC1a)'
  );
});

test('AC1a (invariants-audit, integration): .claude/skills/invariants-audit/review-categories.md exists', () => {
  assert.ok(
    exists('.claude/skills/invariants-audit/review-categories.md'),
    '.claude/skills/invariants-audit/review-categories.md must exist — installer must copy all sibling files'
  );
});

test('AC1a (invariants-audit, integration): installed review-categories.md content is identical to source', () => {
  const source = read('skills/invariants-audit/review-categories.md');
  const installed = read('.claude/skills/invariants-audit/review-categories.md');
  assert.equal(
    installed,
    source,
    '.claude/skills/invariants-audit/review-categories.md must be byte-identical to source (AC1a sync)'
  );
});

// ---------------------------------------------------------------------------
// AC2 (integration): review-categories.md has content readable at runtime
// Simulates a reviewer loading the sibling reference file via [See reference:]
// ---------------------------------------------------------------------------

test('AC2 (invariants-audit, integration): review-categories.md is non-empty and readable', () => {
  const content = read('skills/invariants-audit/review-categories.md');
  assert.ok(
    content.trim().length > 0,
    'skills/invariants-audit/review-categories.md must have non-empty content (AC2 — all 5 categories must be documented)'
  );
});

// ---------------------------------------------------------------------------
// AC6 (integration): Sibling reference in SKILL.md resolves to existing file
// Broken [See reference:] links cause silent methodology gaps at runtime.
// ---------------------------------------------------------------------------

test('AC6 (invariants-audit, integration): all [See reference: ...] links in SKILL.md resolve to existing files', () => {
  const content = read('skills/invariants-audit/SKILL.md');
  const refPattern = /\[See reference:\s*([^\]]+)\]/g;
  let match;
  const missingRefs = [];

  while ((match = refPattern.exec(content)) !== null) {
    const refPath = match[1].trim();
    // [See reference: .claude/skills/...] paths are checked against the installed location
    if (!fs.existsSync(path.join(ROOT_DIR, refPath))) {
      missingRefs.push(refPath);
    }
  }

  assert.deepEqual(
    missingRefs,
    [],
    `Broken [See reference:] links in SKILL.md: ${missingRefs.join(', ')} — all sibling files must be installed (AC6)`
  );
});
