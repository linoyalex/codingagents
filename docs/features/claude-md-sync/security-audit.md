## Security Audit: CLAUDE.md Sync on Init/Upgrade
**Generated:** 2026-04-14T22:00:00Z
**Date:** 2026-04-14 | **Auditor:** security-reviewer agent
**Inputs:** docs/features/claude-md-sync/prd.md + docs/features/claude-md-sync/architecture.md
**Reviewed in separate context from authoring phase** | Handoff produced_by: qa

### Summary

Low-risk feature. The sync mechanism reads markdown files and writes markdown files using
shell text processing. No network I/O, no authentication, no user-supplied data beyond
file content that is already trusted (local filesystem). The primary security surface is
shell injection via markdown content and filesystem permission handling.

### Findings

#### [MEDIUM]: Shell injection via markdown content in sync function

**Location:** `lib/sync-claude-md.sh` — sync_claude_md function processes markdown content
**Risk:** If markdown content from `docs/CLAUDE.md` or the target `CLAUDE.md` contains shell
metacharacters (backticks, `$()`, `$(...)`, or `${}`) and the sync function passes content
through `eval`, `source`, or unquoted variable expansion, it could execute arbitrary commands.
The architecture's trust boundary table explicitly states content "must not be eval'd or passed
to source," but this is a design constraint, not an enforcement mechanism.
**Recommendation:** Implementation must use `cat`, `sed`, or `awk` with single-quoted patterns
for all content manipulation. Never pass file content through `eval` or unquoted `$()`. Test
with a fixture containing backticks and `$(whoami)` to verify no command execution.

#### [MEDIUM]: Symlink following in backup and temp file paths

**Location:** `lib/sync-claude-md.sh` — write safety (CLAUDE.md.tmp, CLAUDE.md.pre-sync)
**Risk:** If `CLAUDE.md.pre-sync` or `CLAUDE.md.tmp` is a symlink placed by an attacker
(or a confused user), the sync could overwrite an arbitrary file on the filesystem. The
architecture specifies atomic write via temp file + `mv`, but doesn't address symlink
resolution.
**Recommendation:** Before writing temp/backup files, check that the path is not a symlink
(`[ -L "$path" ] && abort`). Alternatively, use `mktemp` in the same directory for the temp
file, which avoids predictable paths.

#### [LOW]: Race condition between backup creation and sync write

**Location:** `lib/sync-claude-md.sh` — write safety sequence
**Risk:** Between creating the backup (`cp CLAUDE.md CLAUDE.md.pre-sync`) and writing the
temp file, the original `CLAUDE.md` could be modified by another process. The backup would
not match the state that was actually overwritten. This is a TOCTOU (time-of-check-time-of-use)
issue, but the attack surface is minimal — it requires concurrent write access to the project
directory during the brief sync window.
**Recommendation:** Accept this risk. The atomic `mv` of the temp file provides the final
consistency guarantee. Document that concurrent modification during sync is unsupported.

#### [LOW]: Temp file left on disk after interrupt

**Location:** `lib/sync-claude-md.sh` — failure modes
**Risk:** If the sync is interrupted, `CLAUDE.md.tmp` is left on disk. This is documented
in the architecture as expected behavior, but the temp file could contain partial content
that confuses subsequent sync runs if the implementation doesn't clean up stale temp files.
**Recommendation:** On sync start, check for and remove any existing `CLAUDE.md.tmp` before
beginning. This prevents stale temp files from accumulating.

#### [INFO]: No PII or sensitive data in scope

**Location:** All data flow
**Risk:** None. The feature processes markdown text files containing project conventions
and coding guidelines. No PII, credentials, or sensitive data is read, written, or logged.
**Recommendation:** No action required.

### Data Classification

| Field / Data | Classification | Notes |
|-------------|---------------|-------|
| `docs/CLAUDE.md` content | Public | Framework conventions, committed to git |
| Target `CLAUDE.md` content | Public | Project conventions, committed to git |
| `CLAUDE.md.pre-sync` backup | Public | Copy of target CLAUDE.md |
| `CLAUDE.md.tmp` temp file | Public | Transient copy during atomic write |
| CLI output (action report) | Public | Section names and action labels |

### Dependency Audit

```
$ npm audit --audit-level=high
No package-lock.json — this is a shell-script framework with no npm dependencies.
No dependencies to audit. Clean by nature.
```

### Verdict

**APPROVED** — No BLOCKING or HIGH findings. Two MEDIUM findings (shell injection prevention,
symlink following) are design constraints that must be enforced during implementation.
Implementation should include fixture tests for shell metacharacters and symlink detection.
