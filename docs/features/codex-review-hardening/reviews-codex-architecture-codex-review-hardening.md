# Architecture Review: codex-review-hardening
**Generated:** 2026-04-13T21:09:07Z

## Findings
- [HIGH] [AC7 Test Strategy] The architecture calls AC7 a "behavioral contract test," but the proposed mechanism is still path-string presence in `init.sh`/`upgrade.sh`. That can false-pass on commented lines, dead branches, stale manifests, or copy logic that mentions the destination path without actually installing the source file. Because AC7 exists to catch real install drift, this design under-addresses the core failure mode.
- [HIGH] [AC7 / Exclusion list] The explicit exclusion array creates an unbounded escape hatch in the main safety invariant. AC7 says each source file in the scoped globs should have installer coverage, but the architecture allows exceptions with only an inline comment. Without a tighter ownership rule or a narrow, predefined exclusion policy, future contributors can silence the contract test instead of fixing installer drift.
- [MEDIUM] [Module Boundaries / AC7] The architecture says the Codex review layer "must NOT cross into" `commands/` and `hooks/`, but AC7's test strategy necessarily reads `commands/*.md` and `hooks/*.js` as source-of-truth inputs. That boundary statement is too absolute for the chosen design and makes ownership unclear: the test depends on those directories even if it does not modify them.
- [MEDIUM] [Failure Modes / AC7] Upgrade-path coverage is left ambiguous. The main problem statement and AC1 both treat install and upgrade operationalization as first-class risks, but the architecture says to repeat the assertions for `upgrade.sh` only "where applicable" without defining applicability. That leaves a gap where fresh installs are protected while upgrades silently drift.

## Open Questions
- What is the stable behavioral contract for AC7: textual installer declarations, or proof that a clean target project actually receives every scoped file?
- Which files, if any, are legitimately allowed in the `skills/*/SKILL.md`, `commands/*.md`, and `hooks/*.js` source set without installer coverage, and who is allowed to approve those exceptions?
- What concrete rule determines when `upgrade.sh` must cover a file versus when `init.sh` alone is sufficient?

## Recommendation
- Proceed with changes
