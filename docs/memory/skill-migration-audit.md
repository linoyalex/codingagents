# Skill Migration Audit

**Generated:** 2026-04-12

Audit of all skills against the new size convention:
- Inline: ≤150 prose lines, ≤250 total lines
- Progressive disclosure (split): SKILL.md ≤120 prose lines + sibling reference files

## Compliant

| Skill | Total Lines | Type | Status |
|-------|------------|------|--------|
| architecture-decision | 118 | inline | Compliant |
| backlog-management | 165 | inline | Compliant |
| code-review | 141 | inline | Compliant |
| prd-writing | 103 | inline | Compliant |
| release-docs | 162 | inline | Compliant |
| security-audit | 143 | inline | Compliant |
| structured-logging | 127 | inline | Compliant |
| tdd | 85 | inline | Compliant |
| invariants-audit | 64 | progressive disclosure | Compliant (split: review-categories.md sibling) |
| verification-gate | 74 | progressive disclosure | Compliant (pilot conversion) |

## Needs Trimming (251–300 total lines)

None.

## Needs Splitting (>300 total lines)

None.

## CLAUDE.md Drift Check (AC9)

Root `CLAUDE.md` and `docs/CLAUDE.md` both define the skill-size convention with identical rules:
- ~150 lines instructional prose budget
- 250 total lines split threshold
- Progressive disclosure with ≤120 prose SKILL.md + reference files
- Stop conditions footer for pipeline-gating skills

Status: **In sync**
