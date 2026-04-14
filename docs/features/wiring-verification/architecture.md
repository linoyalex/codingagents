## Architecture: Wiring Verification (ISS-036)
**Generated:** 2026-04-13T22:00:00Z

### Decision

Add a single test module `tests/node/command-skill-wiring.test.js` that automatically
discovers command-to-skill relationships, parses each skill's `## Required Artifacts`
registry, and validates that the invoking command's text contains output instructions
for every declared artifact. No new runtime code, no new dependencies, no new services.

Command checklist updates go directly into `commands/implement.md` (AC4) and
`commands/test-design.md` (AC5) as single verification steps -- no new files.

**Decision confidence:** 95% -- this is a read-only test against existing markdown files
using the established `node:test` + `fs.readFileSync` pattern from `core-skill-contracts.test.js`.

**Revisit when:** (a) the number of skills exceeds 20 and glob-based discovery becomes slow,
or (b) artifact registries move from markdown tables to a machine-readable schema (JSON/YAML).

**Rollback / Fallback:** Delete the test file and revert the two command checklist additions.
Zero impact on runtime behavior -- this is purely additive test infrastructure.

---

### Module Boundaries

```
tests/node/command-skill-wiring.test.js    # All test logic lives here
tests/fixtures/wiring-gap/                 # Negative fixture (AC11)
  mock-skill.md                            # Skill with Required Artifacts table
  mock-command.md                          # Command missing one artifact slot
commands/implement.md                      # +1 verification step (AC4) + ## Skill References table
commands/test-design.md                    # +1 verification step (AC5) + ## Skill References table
```

**No new modules, no new dependencies.** Uses only `node:test`, `node:assert/strict`,
`node:fs`, `node:path` -- all Node.js built-ins already used by sibling tests.

---

### Algorithm (4 stages)

**Stage 1 -- Discovery.** Read a structural mapping table from a dedicated section
`## Skill References` in each command file. Each command that loads skills must declare
them in a markdown table: `| Skill | Source path |`. Example:
`| tdd | skills/tdd/SKILL.md |`. The test parses this table — not natural-language prose
like "Read .claude/skills/..." — so the mapping is explicit and survives rewording.
Build a map: `{ commandPath -> [skillName, ...] }`.

**Fail-closed rule:** After parsing, the test scans each command's full text for skill-loading
prose (e.g., lines matching `skills/` or `.claude/skills/`). If a command contains such prose
but has no `## Skill References` table, the test fails with:
`"Command '<command>' appears to load skills but has no ## Skill References table"`.
Commands with neither a `## Skill References` section nor any skill-loading prose are
skipped (genuinely no skills to check). This prevents the protection from silently
disappearing when a command forgets to maintain the structural table.

**Stage 2 -- Registry parse.** For each discovered skill, read `skills/<name>/SKILL.md`.
Look for the heading `## Required Artifacts`. If absent, skip (AC7). If present, parse the
markdown table expecting four columns: `Artifact | Pattern | Path | Condition`. Validation:
header row must contain all four column names; separator row must follow; at least one data
row. On failure, throw a parse error naming the skill (AC3).

**Stage 3 -- Wiring check.** For each artifact in the registry, locate a dedicated output
section in the invoking command (heading `## Output`, `### Output`, `## Deliverables`, or
`### Deliverables`). Search only within that section — not the full file — for:
(a) the Pattern value (case-sensitive substring match), and (b) at least one Path value
(AC9 -- multiple paths pass if any one matches). Patterns are matched as case-sensitive
substrings; commands must use the exact casing from the skill's `## Required Artifacts` table. This prevents incidental mentions in examples, notes, or
verification bullets from satisfying the check. If the command has no output section, fail
with `"Command '<command>' has no Output/Deliverables section"`. If pattern or path is
missing from that section, fail with:
`"Skill '<skill>' requires artifact '<artifact>' (pattern: <pattern>, path: <path>) but command '<command>' output section does not reference it"` (AC1, AC2).

**Conditional artifacts (AC8):** The Condition column is informational for human readers.
At test time, all artifacts — conditional or not — receive the same pattern+path check.
This resolves the ambiguity: the test does not relax validation for conditional artifacts.
**Note (resolved):** The PRD AC8 has been updated to match this architecture's stricter
interpretation (full pattern+path check). The PRD, architecture, and handoff are now aligned.
Original delta flagged by Codex review round 1; resolved before Phase 4.

**Stage 4 -- Negative fixture.** A dedicated `test()` block loads files from
`tests/fixtures/wiring-gap/` and runs the same wiring check, asserting it throws (AC11).
This fixture is self-contained and does not depend on real skill/command content.

---

### Trust Boundaries

| Boundary | Rule |
|----------|------|
| Test reads filesystem | Read-only; no writes, no network, no subprocess |
| Pattern matching | Substring/literal match only; no eval, no dynamic regex from file content |
| Output section scope | Wiring check reads only the Output/Deliverables section of a command, not full text |
| Skill mapping | Reads explicit `## Skill References` table, not natural-language prose |
| Fixture isolation | Negative fixture uses dedicated directory; never reads production skills |

---

### Failure Modes

| Failure | Detection | Response |
|---------|-----------|----------|
| Skill file missing on disk | `fs.readFileSync` throws ENOENT | Test fails with clear path in error message |
| Malformed artifact table | Stage 2 column validation | Test fails naming skill and malformation type (AC3) |
| Command missing artifact wiring | Stage 3 pattern/path check in output section | Test fails naming skill, command, artifact, and what is missing (AC1) |
| Command has no Output/Deliverables section | Stage 3 section-not-found check | Test fails naming the command and the missing section |
| Command missing `## Skill References` but has skill-loading prose | Stage 1 fail-closed check | Test fails naming the command — forces table to be added |
| Command with no skill references at all | Stage 1 skips command | No skills to check — silent pass (expected) |
| New skill added without registry | Stage 1 discovers it, Stage 2 skips it | Passes silently (AC7) -- no false positives |
| Fixture directory missing | `fs.readFileSync` throws ENOENT | Test fails; fixture is required infrastructure |

---

### Fitness Functions

| Function | Threshold | Automated |
|----------|-----------|-----------|
| Every skill's `## Required Artifacts` entries are wired to their invoking command | 100% pass | Yes -- `node --test tests/node/command-skill-wiring.test.js` |
| Negative fixture catches deliberate gap | Must throw | Yes -- assert.throws in fixture test |
| No regression on existing tests | 0 new failures | Yes -- `node --test tests/node/` |
| Command checklist includes wiring step | Structural anchor present | Yes -- existing `test-command-contracts.sh` pattern |

---

### Rejected Alternatives

| Alternative | Why rejected |
|-------------|-------------|
| JSON/YAML artifact registry instead of Markdown table | Adds a new format to learn; Markdown tables are already used for similar metadata in skills; machine-parseable enough for this use case |
| Separate parser module in `lib/` | Initially rejected as over-engineering. **Reconsidered during Phase 6 review:** extraction to `lib/wiring-check.js` was necessary to avoid recursive `node --test` subprocess failures when integration tests imported the wiring algorithm. Now adopted — 3 test layers import it. |
| Runtime enforcement (hook that blocks commits) | Out of scope per PRD; test-time detection is the v1 goal; runtime enforcement can layer on later without architectural change |
| Regex-based pattern matching with user-supplied patterns | Security risk (ReDoS); substring match is sufficient for naming patterns like `[feature].integration.test.*` |
| Scanning installed copies (`.claude/skills/`) instead of source (`skills/`) | Source is authoritative; installed copies may lag behind; existing sync tests (ISS-009) ensure they stay identical |
| Parsing natural-language "Read .claude/skills/..." lines for discovery | Brittle — rewording breaks discovery silently; explicit `## Skill References` table is structural and survives prose changes |
| Full-file substring search for wiring validation | Incidental mentions in examples/notes/verification could satisfy check; scoping to Output/Deliverables section prevents false passes |

---

### AC Mapping

| AC | Addressed by |
|----|-------------|
| AC1 | Stage 3 wiring check (pattern + path) |
| AC2 | Stage 3 catches tdd/test-design gap (pre-fix state) |
| AC3 | Stage 2 parse validation |
| AC4 | Checklist addition to `commands/implement.md` |
| AC5 | Checklist addition to `commands/test-design.md` |
| AC6 | Stage 2 defines and validates the table format |
| AC7 | Stage 2 skip-if-absent logic |
| AC8 | Stage 3 applies full pattern+path check (Condition column is informational, not a test-time relaxation) |
| AC9 | Stage 3 any-path-matches logic |
| AC10 | No changes to existing tests; additive only |
| AC11 | Stage 4 negative fixture |
