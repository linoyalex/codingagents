## Security Audit: Review Layer Hardening
**Generated:** 2026-04-13T15:25:00Z
**Date:** 2026-04-13 | **Auditor:** security-reviewer agent | **Reviewed in separate context from authoring phase**
**Inputs:** docs/features/review-hardening/prd.md + docs/features/review-hardening/architecture.md

### Summary

This feature hardens the review pipeline by adding `source_spec` as a required field in handoff.json, enforcing adversarial reviewer stance in gate roles, and requiring separate-context for gate/review phases. The changes are additive prose and schema modifications with no new runtime dependencies, no new API surfaces, no new data stores, and no new authentication flows. The attack surface change is minimal and well-bounded. No BLOCKING findings.

### Threat Model

**Assets at risk:**
- Pipeline integrity (ensuring reviews are independent and trustworthy)
- Source spec artifacts (PRD, ticket files referenced by `source_spec`)
- Handoff state (`handoff.json` -- ephemeral but pipeline-critical)

**Threat actors:**
- Compromised or misbehaving agent session (attempts to bypass review gates)
- Malicious handoff content (crafted `source_spec` values)

**Attack surface changes:**
- New required field `source_spec` in `handoff.schema.json` introduces a file path / URL input that must be validated
- Gate commands gain a same-role detection check (`produced_by` vs current role)

### Findings

#### [HIGH]: Path traversal via `source_spec` field

**Location:** `schemas/handoff.schema.json` -- `source_spec` field definition; `checkpoint.js` -- validation logic
**Risk:** The `source_spec` field accepts a file path or URL. If validation only checks "file exists" without constraining the path to the project directory, a crafted value like `../../../etc/passwd` or an absolute path outside the repo could cause the reviewer agent to read arbitrary files. Similarly, a URL value (`https://evil.example.com/fake-prd.md`) could point to attacker-controlled content that the reviewer treats as authoritative spec.
**Recommendation:**
1. Constrain file paths: `source_spec` must be relative to the project root and must not contain `..` segments or begin with `/`. Validate with a allowlist pattern (e.g., `^docs/` or `^https://github.com/`).
2. For URL values, restrict to known domains (e.g., the project's GitHub repository) or document that URL sources are lower-trust than local file sources.
3. Add schema-level pattern validation: `"pattern": "^(docs/|https://github\\.com/)"` or equivalent.

#### [MEDIUM]: Same-agent role-switch bypass (acknowledged residual risk)

**Location:** Architecture doc, "Separate-Context Enforcement (AC6)" section
**Risk:** The architecture acknowledges that `produced_by` role check catches same-role continuity but cannot detect same-agent-different-role continuity (e.g., one session acting as developer then switching to code-reviewer). An operator in a single session could author code and then invoke the review command after changing roles, bypassing the independence guarantee.
**Recommendation:** The architecture already documents this as accepted residual risk with layered mitigations (prose instructions, artifact headers, structural tests). This is adequate for the current agent-per-phase invocation model. Ensure:
1. The residual risk is visible in the review artifact header (already required by AC10).
2. Tests verify the `produced_by` check exists and halts on match (already required by AC6/AC11).
3. Consider adding a `produced_at` timestamp to handoff.json and rejecting reviews where `produced_at` is less than N seconds ago (stale-session heuristic) as a future enhancement.

#### [MEDIUM]: No integrity check on source_spec content

**Location:** Architecture doc, "Trust Boundaries" table
**Risk:** The design validates that `source_spec` resolves to an existing file but does not verify the content has not been tampered with between authoring and review. If an attacker or misbehaving agent modifies the PRD after Phase 1 but before Phase 6, the reviewer would verify against a corrupted spec.
**Recommendation:**
1. Consider adding a `source_spec_hash` field to handoff.json (SHA-256 of the file at authoring time). The reviewer can re-hash and compare.
2. Alternatively, rely on git history: reviewers should verify the source_spec file has not been modified since the authoring phase via `git log --oneline docs/features/<feature>/prd.md`.
3. This is MEDIUM because the pipeline is designed for trusted agent invocation, not adversarial environments where file tampering is a primary threat.

#### [LOW]: Verbose error messages in review-halt scenario

**Location:** PRD AC16 -- "Review halted: source_spec missing or unresolvable"
**Risk:** The halt message includes the expected path. In a multi-tenant or shared-log environment, this could leak internal directory structure. Minimal risk in current single-tenant agent pipeline.
**Recommendation:** Acceptable for current use. If the framework is deployed in shared environments, consider logging the full path only at debug level and showing a generic message to the operator.

#### [INFO]: No new data fields requiring classification

**Location:** Architecture doc, "Files Changed" table
**Risk:** None. The `source_spec` field contains file paths or URLs pointing to project artifacts. It does not contain PII, credentials, or sensitive data.
**Classification:** `source_spec` = **Internal** (project structure metadata). No encryption-at-rest requirement. No PII scrubbing needed.

#### [INFO]: Gate roles are read-only by design

**Location:** Architecture doc, "Trust Boundaries" and role definitions
**Risk:** None. Gate reviewers (ROLE_CODE_REVIEWER.md, ROLE_SECURITY.md) are constrained to write only to `docs/features/<feature>/` and never to `src/`. This is enforced by role instructions and verified by tests (AC9). This is a positive design property worth preserving.

### OWASP Top 10 Assessment

| Threat | Applicability | Finding |
|--------|--------------|---------|
| **Injection** | `source_spec` path used in file reads | HIGH: Path traversal risk (see finding above) |
| **Broken Auth** | No auth changes in this feature | Not applicable |
| **Sensitive Data Exposure** | No PII introduced | Not applicable |
| **Broken Access Control** | Role-based gate enforcement | MEDIUM: Same-agent bypass acknowledged |
| **Security Misconfiguration** | No new config surfaces | Not applicable |
| **XSS** | No UI components | Not applicable |
| **SSRF** | `source_spec` URL values fetched by agent | Covered by path traversal finding |
| **Insecure Dependencies** | No new dependencies | Clean (see below) |
| **Insufficient Logging** | Review halt events | LOW: Halt messages adequate |

### Logging & Audit Trail

- Review halt events (AC16) produce clear error messages. These should be logged at `warn` level per structured-logging conventions.
- Review artifact headers (AC10) serve as the audit trail for reviewer identity and context separation.
- No PII is introduced by this feature. No scrubbing requirements.
- Security events to log: `source_spec` validation failures, `produced_by` role-match rejections.

### Dependency Audit

```
No package.json or lockfile present in this repository.
This is a framework/template repository with no runtime npm dependencies.
npm audit is not applicable.
Dependency audit: PASS (no dependencies to audit).
```

### Data Classification

| Field | Classification | Storage Rule |
|-------|---------------|-------------|
| `source_spec` (handoff.json) | Internal | No encryption needed; ephemeral file |
| `produced_by` (handoff.json) | Internal | No encryption needed; ephemeral file |
| Review artifact content | Internal | Committed to git; no PII expected |

### Verdict

**APPROVED WITH CONDITIONS**

No BLOCKING findings. One HIGH finding (path traversal via `source_spec`) must be addressed during implementation (Phase 5) by adding path validation constraints. Two MEDIUM findings are documented with mitigations. The design is sound for the agent-per-phase invocation model.

**Conditions for implementation:**
1. **[HIGH] Path traversal**: Implementation must validate `source_spec` against path traversal before any file read. Reject values containing `..`, absolute paths, or URLs outside allowed domains.
2. **[MEDIUM] Integrity**: Consider `source_spec_hash` or document git-based verification in reviewer instructions.
