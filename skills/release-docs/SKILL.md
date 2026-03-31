---
name: release-docs
description: Write changelogs, release notes, and maintain CLAUDE.md
version: "1.0.0"
---

# Skill: Release Documentation

## CHANGELOG.md Format (Keep a Changelog)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- [New feature description — write for users, not developers]

### Changed
- [Modification to existing feature]

### Fixed
- [Bug fix description with user-facing impact]

### Security
- [Security improvement or vulnerability fix]

### Deprecated
- [Feature that will be removed in a future version]

### Removed
- [Feature that was removed]
```

Rules:
- Every release gets an entry with date and version
- Write for a user, not a developer — describe what changed, not which files were edited
- One bullet per acceptance criterion from docs/prd.md

## Release Notes Template

Filename: `release-notes/YYYY-MM-DD_vX.Y.md`

To determine the exact format: **read the most recent file in `release-notes/`** and match
its structure exactly. Adapt the content but preserve the section hierarchy.

Common structure:
```markdown
# Release Notes — vX.Y
# [Product Name]
# [Date]

---

## What's New

### [Feature Name]
[Detailed description of the feature: what it does, how it works, before/after comparison]

---

### Bug Fix: [Title]
[Root cause, impact, and resolution]

---

## Spec Updates

| Document | Changes |
|----------|---------|
| **[SPEC_NAME]** | [What changed and why] |

---

## Test Coverage

| Metric | Value |
|--------|-------|
| Total automated tests | **N** |
| New tests added | N |
| Test files | N |

---

*Generated YYYY-MM-DD | N commits since vX.Y | N automated tests passing*
```

## Data Gathering Commands

```bash
# Commit count for the branch
git log main..HEAD --oneline | wc -l

# Test count
npm test 2>&1 | tail -3

# Changed files
git diff main..HEAD --name-only

# Recent commits for context
git log main..HEAD --oneline
```

## CLAUDE.md Update Procedure

CLAUDE.md is the highest-priority document — every agent session starts here.

Update when:
- A new environment variable is required
- The setup process changes
- A new architectural pattern is established
- A new gotcha is discovered
- Commands change (new scripts, changed ports, etc.)

Always update the "Last updated" timestamp at the bottom.

## .env.example Rules

- Every environment variable must have a comment describing what it's for
- Never include actual values — only descriptions and format examples
- Group variables by service (Database, Auth, API keys, etc.)

## Documentation Verification

```bash
# No broken internal links in docs
find docs/ -name "*.md" | xargs grep -h "\[.*\](\./" | grep -o '](\.\/[^)]*' | \
  sed 's/](\.\///' | while read f; do
    [ -f "docs/$f" ] || echo "BROKEN LINK: docs/$f"
  done

# No orphaned TODOs without ticket links
grep -rn "TODO" docs/ --include="*.md" | grep -v "ticket\|issue\|#" | head -20

# .env.example has descriptions for all variables
grep -n "^[A-Z_]*=$" .env.example 2>/dev/null
# Expected: no results (every variable should have a description)
```
