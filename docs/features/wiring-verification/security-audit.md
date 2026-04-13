## Security Audit: Wiring Verification (ISS-036)
**Generated:** 2026-04-13T21:50:00Z
**Date:** 2026-04-13 | **Auditor:** security-reviewer agent
**Reviewed in separate context from authoring phase** | Reviewer: security-reviewer (handoff produced_by: qa)
**Inputs:** docs/features/wiring-verification/prd.md + docs/features/wiring-verification/architecture.md
**Source spec:** docs/issues/tickets/ISS-036.md

### Summary

This feature adds a single read-only test module (`tests/node/command-skill-wiring.test.js`) that cross-references skill artifact registries against command output sections. It introduces no runtime code, no new dependencies, no network access, no user input handling, and no data storage. The attack surface is effectively zero — the entire feature is a deterministic filesystem read executed in a test harness.

### OWASP Top 10 Assessment

| Threat | Applicable | Notes |
|--------|-----------|-------|
| Injection | No | No queries, shell commands, or eval. Substring match only — no dynamic regex from file content (ReDoS explicitly rejected in architecture). |
| Broken Auth | No | No authentication or session management involved. |
| Sensitive Data Exposure | No | No PII, secrets, or sensitive data processed. Reads only markdown skill/command files. |
| Broken Access Control | No | No authorization boundaries. Test reads local filesystem with existing permissions. |
| Security Misconfiguration | No | No configuration surfaces. No environment variables. No deployment artifacts. |
| XSS | No | No DOM rendering. No user-facing output beyond test pass/fail. |
| SSRF | No | No network access. Architecture explicitly states "no network, no subprocess." |
| Insecure Dependencies | No | Uses only Node.js built-ins: `node:test`, `node:assert/strict`, `node:fs`, `node:path`. Zero new dependencies. |
| Insufficient Logging | No | Test-time only; no security events to log. |

### Serverless / Edge Function Threats

Not applicable — this feature is a local test module with no deployment footprint.

### Trust Boundaries

The architecture defines clear trust boundaries (reviewed and confirmed):

| Boundary | Assessment |
|----------|-----------|
| Filesystem reads | Read-only; no writes. Acceptable for test infrastructure. |
| Pattern matching | Substring/literal match only. No `eval`, no `new RegExp()` from file content. ReDoS risk explicitly mitigated by rejecting regex-based matching. |
| Output section scoping | Wiring check scopes to Output/Deliverables sections only, preventing false passes from incidental mentions. Sound design. |
| Fixture isolation | Negative fixture uses dedicated `tests/fixtures/wiring-gap/` directory; never touches production skills. Clean isolation. |
| Fail-closed discovery | Commands with skill-loading prose but no `## Skill References` table cause test failure. Prevents silent protection loss. Good security posture. |

### Data Classification

No new data fields introduced. The feature reads existing markdown files and produces only pass/fail test output.

### Secrets Management

Not applicable — no secrets accessed, stored, or transmitted.

### Codex Review Integration

Two findings from the Codex architecture review (`reviews-codex-architecture-wiring-verification.md`)
were not surfaced in the initial security audit. They are incorporated below as MEDIUM and LOW findings.

**RCA — why these were missed initially:**
The audit correctly identified zero OWASP threats (appropriate for read-only test infrastructure)
but did not shift to an adversarial lens on the protection mechanism itself. For features that
ARE test/protection infrastructure, the most valuable security analysis is "can this protection
be bypassed or produce false confidence?" — not traditional threat modeling. The fail-closed
heuristic was accepted at face value, and a stale architecture note was not caught.

Existing backlog coverage: ISS-025 AC7 (fail-open defaults in Phase 2 self-review) and
ISS-029 AC4a (PRD↔architecture delta check) already capture both gap patterns with ISS-036
cited as evidence. No new tickets required.

### Findings

#### [MEDIUM]: Fail-closed heuristic has residual bypass risk (from Codex review)

**Location:** Architecture Stage 1 — Discovery, fail-closed rule
**Risk:** The fail-closed rule scans command text for `skills/` or `.claude/skills/` patterns.
If a command loads skills through an indirect mechanism (e.g., a helper script or a reference
that doesn't literally contain `skills/`), or if prose is later reworded to remove those
patterns, the command would be silently skipped — the protection disappears without signal.
The heuristic is sound for current conventions but depends on prose patterns that are not
structurally enforced.
**Recommendation:** Accept for v1 — current commands all use `skills/` paths explicitly.
Document this assumption in the test file's header comment. If future commands use indirect
skill loading, tighten to a registry of known-skill-loading commands. Tracked under ISS-025
AC7 (adversarial self-review for fail-open defaults).

#### [LOW]: Stale architecture note could mislead implementer (from Codex review, now resolved)

**Location:** Architecture doc, AC8 note
**Risk:** The architecture contained a note claiming the PRD's AC8 "describes
acknowledgment-by-name-or-pattern only" and needed updating. In fact, the PRD was already
updated to "full pattern+path check" before Phase 4. An implementer reading the stale note
could waste time reconciling a non-existent mismatch or, worse, implement the weaker version
described in the note.
**Recommendation:** Fixed — the architecture note has been updated to reflect the resolved
state. Tracked under ISS-029 AC4a (PRD↔architecture delta check at authoring time).

#### [LOW]: Fail-open risk if test file is deleted or excluded from CI

**Location:** `tests/node/command-skill-wiring.test.js` (proposed)
**Risk:** If the test file is accidentally deleted or excluded from the test glob, wiring gaps would go undetected silently. The protection would disappear without any signal.
**Recommendation:** The fail-closed discovery mechanism (Stage 1) mitigates this for individual commands, but the test file itself has no guardian. Consider adding a CI step that asserts the file exists, or add it to the fitness function list in an existing meta-test. Low severity because accidental deletion would be caught in code review.

#### [INFO]: Substring matching may produce false positives

**Location:** Architecture Stage 3 — wiring check
**Risk:** Substring matching (e.g., checking for `integration.test` in command text) could match unintended content within the Output/Deliverables section. For example, a comment like "do NOT create integration.test files" would satisfy the check.
**Recommendation:** Acknowledged as acceptable for v1 given the constrained scope (Output/Deliverables section only). If false positives emerge in practice, tighten to line-level structural matching. No action required now.

### Dependency Audit

```
$ npm audit --audit-level=high
npm error code ENOLOCK
npm error audit This command requires an existing lockfile.
```

This project has no `package-lock.json` — it is a framework template repo that uses only Node.js built-ins and has no `node_modules`. The dependency audit is not applicable: there are zero npm dependencies to audit, and this feature adds none.

### Verdict

**APPROVED WITH CONDITIONS**

No BLOCKING or HIGH findings. One MEDIUM finding (fail-closed heuristic bypass risk) is
accepted for v1 with documentation recommended. The feature is purely additive test
infrastructure with zero runtime impact, zero new dependencies, and a well-defined read-only
trust boundary. The MEDIUM finding is tracked under ISS-025 AC7; no implementation changes
required before proceeding.
