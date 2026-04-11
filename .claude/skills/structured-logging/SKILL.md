---
name: structured-logging
description: Structured logging conventions, log levels, PII rules, and security event requirements
version: "1.0.0"
---

# Skill: Structured Logging

## Core Principle

Every log entry must answer three questions: **what happened**, **where it happened**, and **what context is needed to debug it**. If a log entry doesn't answer all three, it's noise.

## Structured Log Format

All log output must be structured JSON (not free-text strings). This enables machine parsing, filtering, and alerting.

```json
{
  "timestamp": "2026-03-30T12:00:00.000Z",
  "level": "error",
  "message": "Payment processing failed",
  "service": "checkout-api",
  "correlationId": "req-abc-123",
  "context": {
    "userId": "usr_***redacted***",
    "orderId": "ord_12345",
    "errorCode": "GATEWAY_TIMEOUT"
  }
}
```

Rules:
- Always use ISO 8601 timestamps in UTC
- Always include a correlationId that traces a request across service boundaries
- Context fields must contain enough to reproduce the issue without reading source code
- Never use string interpolation for log messages — use structured fields

## Log Levels (use exactly these — no custom levels)

| Level | When to use | Examples |
|-------|------------|---------|
| **error** | Something failed and needs human attention | Unhandled exception, external service down, data corruption |
| **warn** | Something unexpected but the system recovered | Retry succeeded, deprecated API called, approaching rate limit |
| **info** | Significant business events (audit trail) | User login, order placed, feature flag toggled |
| **debug** | Developer troubleshooting detail | Function entry/exit, cache hit/miss, query timing |

Rules:
- `error` and `warn` must ALWAYS include an `errorCode` or `reason` field
- `info` is the default production level — design info logs as your audit trail
- `debug` must NEVER appear in production builds (strip at build time or gate behind env var)
- Never log at `error` level for expected conditions (e.g., 404 is not an error, it's info)

## What to Log (positive requirements)

### Security Events (MUST log — referenced by security-audit skill)
- Authentication attempts (success and failure) with source IP
- Authorisation denials (who tried to access what)
- Privilege changes (role assignments, permission grants)
- Data export or bulk access operations
- Configuration changes in production
- Token generation and revocation

### Application Events (SHOULD log)
- Request/response for API endpoints (method, path, status code, duration — NOT body)
- Background job start, completion, and failure
- External service calls (target, duration, success/failure)
- Feature flag evaluations
- Cache hit/miss ratios (aggregated, not per-request)

### What NOT to Log
- Request/response bodies (contain passwords, tokens, PII)
- Full stack traces for expected errors (log the error code + message only)
- High-frequency events without sampling (e.g., every WebSocket heartbeat)
- Anything that would make logs useless by volume

## PII Scrubbing Rules

| Data type | Log treatment |
|-----------|--------------|
| Passwords, tokens, API keys | NEVER log, even partially |
| Email addresses | Mask: `j***@example.com` |
| Phone numbers | Mask: `***-***-1234` |
| User IDs | Allowed if opaque (UUIDs); mask if sequential integers |
| IP addresses | Allowed for security events; omit otherwise |
| Names | Mask in debug/info; allowed in security audit logs |

Implement scrubbing at the logger level (middleware or wrapper function), not at each call site. One missed call site leaks PII.

## Error Logging Checklist

When logging an error, always include:
- [ ] Error code or classification (not just the raw message)
- [ ] Correlation ID linking to the originating request
- [ ] What operation was being attempted
- [ ] What input triggered it (scrubbed of PII)
- [ ] Whether this is retriable or terminal

## Serverless / Edge Function Considerations

- Logs are ephemeral — they vanish when the function cold-starts. Route to an external sink.
- Cold start latency: log function initialisation time as a `debug` event
- Execution timeout: log a `warn` with elapsed time when execution exceeds 80% of the configured timeout
- Concurrent invocations: correlation IDs are essential since logs interleave

## Verification Commands

```bash
# Check for unstructured console.log (should use structured logger instead)
grep -rn "console\.log\|console\.error\|console\.warn" src/ --include="*.ts" --include="*.tsx" | grep -v "test\|spec\|__mocks__" | head -10
# Expected: 0 results in production code

# Check for PII in log statements (common leaks)
grep -rn "\.log.*email\|\.log.*password\|\.log.*token\|\.log.*secret" src/ --include="*.ts" --include="*.tsx" | head -10
# Expected: 0 results

# Check for error logging without context
grep -rn "console\.error\|logger\.error" src/ --include="*.ts" --include="*.tsx" | grep -v "correlationId\|requestId\|context\|{" | head -10
# Expected: 0 results (all errors should have structured context)
```

## Anti-Patterns

- ❌ `console.log("here")` — meaningless without context
- ❌ `console.log(user)` — dumps entire object, likely contains PII
- ❌ `catch(e) { logger.error(e) }` — logs the error but not what operation failed or how to reproduce
- ❌ Logging at `error` level for 404s or validation failures — these are expected, use `info` or `warn`
- ❌ Wrapping every function in try/catch with logging — let errors propagate to a central handler
