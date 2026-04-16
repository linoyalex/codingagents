---
description: TDD implementation of a feature (Phase 5)
user-invocable: true
---

## Skill References

| Skill | Source path |
|-------|-------------|
| tdd | skills/tdd/SKILL.md |
| structured-logging | skills/structured-logging/SKILL.md |
| verification-gate | skills/verification-gate/SKILL.md |

Use the developer subagent.

First, load your skills:
- Read .claude/skills/tdd/SKILL.md for the TDD cycle, test structure, property-based testing, and commit protocol
- Read .claude/skills/structured-logging/SKILL.md for structured log format, log levels, and PII rules
- Read .claude/skills/verification-gate/SKILL.md for Phase 5 verification

Session requirement: This phase must run in a fresh session. If you are
continuing from a previous phase, end this session and start a new one.

Model: This phase should run with claude-sonnet-4-6.

Before reading any implementation files, run:
`node .claude/helpers/resolve-feature.cjs --command implement --phase 5 --args "$ARGUMENTS"`

- If that command exits non-zero, stop and relay the error.
- If it succeeds, treat the returned `feature` as the only valid target for this phase.
- For the rest of this command, use that resolved feature slug in place of `$ARGUMENTS`.

Your task: implement the resolved feature using strict TDD.

Rules:
- Read ONLY: docs/features/<feature>/architecture.md + test files in tests/contracts/ and tests/e2e/ + relevant review feedback files in `docs/features/<feature>/` if present (`security-audit.md`, `review.md`, `review-codex-code-<feature>.md`, and test-design review artifacts)
- Do NOT read the whole codebase — read only files you need to implement a specific failing test
- Follow the RED → GREEN → REFACTOR cycle from the tdd skill with a commit at each step:

  Step 1 RED:
    Run tests (confirm all new tests fail for the intended reason)
    State the intended RED failure reason in one sentence before writing production code
    Commit: "test: <feature> RED — all tests failing"

  Step 2 GREEN:
    Name the happy, edge, and misuse/abuse cases you are covering when relevant
    Write the minimum code to make tests pass (no over-engineering)
    Do not optimize only for the current tests; implement a general solution for valid inputs
    If present in .claude/handoff.json, review the known_risks array and address or defer each risk with a rationale before proceeding
    Run tests → must pass
    Run lint + typecheck → fix ALL errors before proceeding:
      npm run lint -- --fix    # auto-fix what's safe
      npx tsc --noEmit         # type errors require manual fix
      If lint errors remain after --fix, fix them manually now — do not defer to REFACTOR
    Commit: "feat: <feature> GREEN — all tests passing, lint clean"

  Step 3 REFACTOR:
    Clean up without changing behaviour
    Run tests + lint + typecheck (confirm all still passing and clean)
    Commit: "refactor: <feature> cleanup"

Context discipline:
- If context reaches 60%: run /compact immediately
- If you need to read more than 10 files: split the task
- If the RED failure is unrelated, stale, or contradicts the architecture/PRD, stop and resolve that mismatch before coding

## Review Feedback Loop

Before revising the implementation after review, read the relevant review feedback files
already present in `docs/features/<feature>/`, especially:
- `security-audit.md`
- `review.md`
- `review-codex-code-<feature>.md`

When you address a finding, append or refresh a `## Resolution Notes` section in each
review artifact you used. For every finding you touched, add one bullet in this shape:
- [ADDRESSED | DEFERRED | DISPUTED] <finding label or short quote> — <what changed and where, or why it remains open>

Do not delete the original findings. Later reviewers will verify these notes against
the revised implementation.

## Artifact Wiring Verification

Before committing GREEN, verify that every skill artifact declared in `## Required Artifacts`
has a corresponding output instruction in this command's Output section — check for both the
naming pattern AND the target path. If a new skill artifact was added during this feature,
update the Output section below to include it.

## Output

- Write production source code to: src/ (minimum code to make tests pass)
- Write integration tests to: tests/integration/ following [feature].integration.test.* naming pattern
- Commit GREEN at each TDD step: RED → GREEN → REFACTOR

After all three commits, run Phase 5 verification from verification-gate skill.

Then write .claude/handoff.json with:
  feature: <feature>, phase: 5, goal: "Diff-based code review in fresh context",
  scope: "Phase 6 review only", relevant_files: ["docs/features/<feature>/architecture.md", "docs/features/<feature>/prd.md"],
  acceptance_criteria: [from the PRD], verification_commands: ["git diff main...HEAD", "ls docs/features/<feature>/review.md"],
  source_spec: "docs/features/<feature>/prd.md",
  produced_by: "developer", timestamp: current ISO 8601

Then print:
"Phase 5 complete. Next: /review <feature> (in a NEW session)"
