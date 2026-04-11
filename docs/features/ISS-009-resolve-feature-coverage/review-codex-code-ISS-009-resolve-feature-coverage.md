# Review: fix/ISS-009-resolve-feature-coverage

## Findings
- [BLOCKING] [commands/review.md:13] The new phase commands now depend on `.claude/helpers/resolve-feature.js`, but there is no source copy under `hooks/` and neither installer copies it into target projects. `init.sh` only installs `checkpoint.js`, `archive-context.js`, and `restore-context.js` to `.claude/helpers/` ([init.sh](/Users/linoy/projects/codingagents/init.sh:111)), and `upgrade.sh` does the same ([upgrade.sh](/Users/linoy/projects/codingagents/upgrade.sh:183)). That means a fresh install or upgrade can ship commands that reference a helper file the project does not have, breaking phases 2-7 outside this repo.
- [MAJOR] [tests/node/resolve-feature.test.js:291] The new checkpoint sync coverage is too narrow to enforce the repo’s stated source/installed sync discipline. It only checks that both copies contain a `require.main` guard, even though `hooks/checkpoint.js` and `.claude/helpers/checkpoint.js` still differ in multiple lines today. This gives a false sense of protection around copy drift and would still pass if other meaningful divergences remain or grow.
- [MINOR] [tests/node/resolve-feature.test.js:85] There is still no direct regression test for the exact CLI shape `--args --bogus`. The current parser fails closed because unknown flags are rejected, so this is not a live correctness bug, but the behavior is only indirectly covered. A targeted test would make the intended handling of “missing args followed immediately by another flag” explicit and easier to preserve.

## Open Questions
- None.

## Merge Recommendation
- REQUEST CHANGES

## Verification Notes
- Reviewed `git diff main...fix/ISS-009-resolve-feature-coverage`
- Ran `node --test tests/node/resolve-feature.test.js`
- Ran `node --test tests/node/pipeline-handoff-guards.test.js tests/node/checkpoint.test.js`
- Inspected installer paths in [init.sh](/Users/linoy/projects/codingagents/init.sh:111) and [upgrade.sh](/Users/linoy/projects/codingagents/upgrade.sh:183)
- Compared `hooks/checkpoint.js` and `.claude/helpers/checkpoint.js` directly and confirmed they are not byte-identical
- Manually exercised malformed `resolve-feature.js` CLI inputs in a temp project and confirmed the current parser now fails closed for stray positional tokens and unknown flags
