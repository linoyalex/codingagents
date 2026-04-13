---
name: security-audit
description: Design-time security audit using OWASP Top 10, auth/authz checks, and dependency scanning
version: "1.0.0"
---

# Skill: Security Audit

## OWASP Top 10 Checklist

| Threat | What to look for |
|--------|-----------------|
| **Injection** | Unsanitised input in queries, shell commands, or eval |
| **Broken Auth** | Weak tokens, missing expiry, insecure password storage |
| **Sensitive Data Exposure** | PII in logs, URLs, error messages, unencrypted storage |
| **Broken Access Control** | Missing auth checks, IDOR vulnerabilities, privilege escalation |
| **Security Misconfiguration** | Debug mode in prod, open CORS, verbose errors |
| **XSS** | User content rendered without escaping in the DOM |
| **SSRF** | User-controlled URLs fetched server-side without validation |
| **Insecure Dependencies** | Outdated packages with published CVEs |
| **Insufficient Logging** | Security events not logged (login failures, permission denials) |

## Authentication & Authorisation Verification

- OAuth2 / OIDC flows: verify PKCE for SPAs, state parameter, nonce
- JWTs must: use RS256 or ES256, have short expiry, validate `aud` and `iss`
- Multi-tenant systems must enforce row-level data isolation at the database layer
- Session invalidation must be immediate on logout
- Rate limiting required on all authentication endpoints

## Data Classification

Classify every new field introduced in the architecture:

| Classification | Examples | Storage rule |
|---------------|----------|-------------|
| **Public** | Product names, public profiles | No restrictions |
| **Internal** | User preferences, settings | Encrypted at rest |
| **Confidential** | Email, phone, address | Encrypted at rest + access logging |
| **Restricted** | Payment data, health data | Tokenised, never stored raw |

## Encryption & Privacy Rules

- All data in transit: TLS 1.2+ (enforce via HSTS headers)
- PII must be encrypted at rest
- Restricted fields must be tokenised, not stored raw
- Never log PII (names, emails, phone numbers, IPs in excess of legitimate need)

## Secrets Management Verification

- Secrets load from a secrets manager, not from committed files
- All required secrets documented in `.env.example` with descriptions (never values)
- No secrets in source code, `.env` files committed to git, or inline in CI config
- Credential rotation plan documented for every external service

## Dependency Audit Procedure

```bash
# Run dependency audit
npm audit --audit-level=high
# or: pip-audit / cargo audit / bundle audit

# Check for known CVEs in direct dependencies
# Expected: "found 0 vulnerabilities" or all HIGHs documented with justification
```

## Severity Classification

| Level | CVSS | Response |
|-------|------|----------|
| **BLOCKING** | 9.0–10.0 | Pipeline stops. Immediate fix required. Notify stakeholders. |
| **HIGH** | 7.0–8.9 | Fix in current sprint before release. |
| **MEDIUM** | 4.0–6.9 | Fix in next sprint; document mitigation. |
| **LOW** | 0.1–3.9 | Track in backlog; fix within 90 days. |
| **INFO** | — | Informational finding; no action required. |

## Security Audit Document Template

Include a `**Generated:**` timestamp line per the artifact timestamp convention in `CLAUDE.md`.

```markdown
## Security Audit: [Feature Name]
**Generated:** <ISO 8601 timestamp>
**Date:** YYYY-MM-DD | **Auditor:** security-reviewer agent
**Inputs:** docs/features/<feature>/prd.md + docs/features/<feature>/architecture.md

### Summary
[1-2 sentence overall assessment]

### Findings

#### [SEVERITY]: [Finding title]
**Location:** [Which part of the design]
**Risk:** [What could go wrong]
**Recommendation:** [How to fix it]

### Dependency Audit
[Output of npm audit or equivalent]

### Verdict
APPROVED / APPROVED WITH CONDITIONS / BLOCKED
[If blocked, list which BLOCKING findings must be resolved]
```

## Serverless / Edge Function Threat Vectors

Serverless architectures introduce specific risks beyond the standard OWASP checklist. Evaluate these when the architecture includes serverless or edge functions:

| Threat | What to check |
|--------|--------------|
| **Over-permissioned functions** | Each function should have minimum IAM/role scope. No wildcard (`*`) policies. |
| **Unvalidated event inputs** | Functions triggered by non-HTTP sources (queues, S3, cron) still receive untrusted input — validate it. |
| **Environment variable leakage** | Secrets in env vars are readable by any code in the function, including dependencies. Audit transitive deps. |
| **Cold start data leakage** | `/tmp` and global state persist across warm invocations. Never store secrets or PII in function-level state. |
| **Execution timeout abuse** | Attackers can trigger long-running operations to exhaust concurrency limits. Set aggressive timeouts. |
| **Shared tenancy risks** | Edge functions run on shared infrastructure. Never assume memory isolation between invocations. |

Verification:
```bash
# Check for wildcard permissions in serverless config
grep -rn "\*" serverless.yml vercel.json netlify.toml 2>/dev/null | grep -i "policy\|role\|permission"
# Check for secrets in environment variable definitions
grep -rn "SECRET\|KEY\|TOKEN\|PASSWORD" .env* vercel.json 2>/dev/null | grep -v ".example"
```

## Design-Time vs Code-Time Audits

This skill covers **design-time** audits (Phase 4) — reviewing the architecture BEFORE code is written.

Design-time catches:
- Auth boundary violations in proposed API design
- PII flowing through systems that shouldn't see it
- Missing rate limiting on new endpoints
- Data model exposures (fields that shouldn't be in API responses)

Code-time audits run separately in CI as lightweight diff scans.
