## Source/Installed Drift Check

For each file in the diff matching `commands/`, `skills/`, or `hooks/`, compute the installed-copy path using this mapping (adapt to your project layout):

| Source path pattern | Installed path |
|---|---|
| `commands/*.md` | `.claude/commands/*.md` |
| `skills/<name>/<any>.md` | `.claude/skills/<name>/<any>.md` (covers SKILL.md and all sibling reference files) |
| `hooks/*.js` | `.claude/helpers/*.js` |

Run `diff <source> <installed>` for each pair. Flag any divergence as a HIGH finding.

**Important:** When a skill file itself is part of the diff under review, verify commands against the pre-diff (committed) version of the installed copy, not the working-tree version. This prevents the diff from masking its own drift.

**Empty state:** If no touched files map to installable paths, skip this check with a note: "No installable paths touched — drift check skipped."

**Error state:** If the mapping is ambiguous or cannot be resolved for a particular file, note it as unresolvable. Do not block the review for an unresolvable mapping.

## Test Suite Execution

Determine the test command from the project's `CLAUDE.md` Commands section, `package.json` scripts, or equivalent project configuration. Run test suites that cover files touched by the diff — scope to affected modules rather than running the entire suite when possible.

```bash
# Examples — adapt to your stack
npm test -- --testPathPattern="<changed-module>"
node --test tests/contracts/<feature>.test.js
pytest tests/ -k "<changed-module>"
```

Report pass/fail results in the review.

**Empty state:** If no test command is found in the project configuration, note this as a finding (not a silent skip): "No test command found in project config — cannot verify test coverage."

**Error state:** If the test command fails to start (e.g., missing dependency, syntax error in config), note this as a finding. Do not block the review for a test infrastructure failure.

**Nondeterministic failures:** If a test fails and the failure appears flaky, re-run once. If the test still fails on re-run, note it as a finding. If it passes on re-run, note it as a flaky test finding at MEDIUM severity.
