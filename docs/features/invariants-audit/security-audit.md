# Security Audit: invariants-audit
**Generated:** 2026-04-16T20:25:00Z
**Date:** 2026-04-16 | **Auditor:** security-reviewer agent
**Inputs:** docs/features/invariants-audit/prd.md + docs/features/invariants-audit/architecture.md
**Reviewed in separate context from authoring phase** (produced_by: qa, reviewer: security-reviewer)

### Summary

This feature adds a reusable reviewer methodology skill (markdown files), wires it into
existing commands and Codex reviewer prompts, and extends contract/integration tests. It
introduces no runtime code, no user input handling, no auth flows, no network calls, no
database access, no PII processing, and no new dependencies. The attack surface is limited
to prompt-injection via skill content and supply-chain integrity of installed copies. No
BLOCKING or HIGH findings identified.

### Findings

#### INFO: No runtime attack surface
**Location:** Entire feature scope (PRD + Architecture)
**Risk:** None. This feature is documentation, prompt wiring, and test infrastructure only.
**Note:** The standard OWASP Top 10 categories (injection, broken auth, sensitive data
exposure, broken access control, security misconfiguration, XSS, SSRF) do not apply --
there is no runtime code, no server, no API, no user input path, and no data storage.

#### INFO: Prompt-injection surface is minimal and convention-bound
**Location:** skills/invariants-audit/SKILL.md, review-categories.md, Codex reviewer sections
**Risk:** A compromised or tampered skill file could instruct reviewers to skip checks or
approve unsafe code. However, the skill content is (a) committed to version control with
full diff visibility, (b) loaded only by reviewer agents in a read-only review context, and
(c) verified by structural contract tests that assert required headings, stop conditions
footer, and trigger conditions are present.
**Recommendation:** No action required. Existing controls (git review, contract tests,
byte-identity sync) are adequate for this threat class.

#### INFO: Supply-chain / sync integrity is covered by existing controls
**Location:** Architecture section "File Manifest" -- byte-copy from skills/ to .claude/skills/
**Risk:** If installed copies diverge from source, a reviewer could load stale or tampered
methodology. The architecture explicitly relies on existing `cp -r skills/* .claude/skills/`
in init.sh/upgrade.sh and byte-identity sync tests in core-skill-contracts.test.js.
**Recommendation:** No action required. The existing sync test pattern (established by
ISS-009, extended by ISS-036) covers the new skill files.

#### INFO: No gate-bypass instructions in skill content
**Location:** Architecture "Skill File Structure" and "Codex Reviewer Integration"
**Risk:** Reviewed the designed skill structure for any instructions that could weaken
security gates, skip reviews, or override stop conditions. The architecture specifies
stop conditions footer as a required structural element. The "When to Use" section uses
opt-in trigger conditions (apply when triggers match, skip otherwise) -- this is
appropriate for an optional methodology overlay and does not weaken any mandatory gate.
**Recommendation:** None. The skip-when-triggers-don't-match behavior is correct design.

#### INFO: Symmetric gate enforcement verified
**Location:** commands/review.md and commands/security-gate.md
**Risk:** If the invariants-audit skill were added to one gate command but not the other,
it could create asymmetric review coverage. Both commands already contain Source Spec
Verification, Separate Context Check, and Symmetric Gate Enforcement sections (verified
at lines 31/39/45 and 33/41/45 respectively). The architecture specifies adding the skill
to both commands.
**Recommendation:** None. Symmetry is maintained.

#### INFO: Stop conditions footer adequacy
**Location:** Architecture "Skill File Structure" -- specifies ~5 lines for stop conditions
**Risk:** If the stop conditions footer is missing or incomplete, the skill could be invoked
in a way that silently fails open. The architecture explicitly includes it in the structure,
and the test strategy includes a structural anchor check for the footer.
**Recommendation:** Phase 5 implementer should ensure the stop conditions footer includes
at minimum: (1) do not skip invariant checks when trigger conditions match, (2) do not
treat invariant analysis as a replacement for standard review. Contract tests will verify
presence.

#### INFO: No secrets, PII, or sensitive data
**Location:** Entire feature scope
**Risk:** None. No secrets, API keys, credentials, PII fields, or sensitive data are
introduced by this feature. No .env files, no environment variables, no external service
integrations.

### Dependency Audit

```
$ npm audit --audit-level=high
npm error code ENOLOCK
npm error audit This command requires an existing lockfile.
```

This project has no package.json or package-lock.json -- it is a documentation/prompt/shell
framework with no npm dependencies. The dependency audit gate is not applicable. Tests run
via `node --test` using Node.js built-in test runner with zero external dependencies.

### Data Classification

No new data fields are introduced by this feature. All artifacts are markdown documentation
files and test scripts. Classification: **Public** (no access restrictions required).

### Verdict

**APPROVED** -- No BLOCKING, HIGH, or MEDIUM findings. All findings are INFO-level,
reflecting the genuinely thin threat surface of a documentation/prompt methodology feature.
The existing framework controls (git review, contract tests, byte-identity sync, symmetric
gate enforcement) are adequate for the risks identified.
