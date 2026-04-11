# User Profile

Linoy is the owner and primary developer of the codingagents framework — a token-efficient multi-agent pipeline for Claude Code.

## Working model

- Uses Claude and Codex simultaneously as complementary agents
- Claude builds implementation (hooks, schemas, roles, deployment scripts)
- Codex reviews Claude's work and builds the Codex-specific layer (reviewers, templates, logging scripts)
- Both can work in parallel on non-overlapping files

## Collaboration style

- Wants proposals reviewed and critiqued before implementation
- Values iterative review: propose → critique → refine → implement → review
- Prefers concise, direct communication — lead with the answer
- Expects agents to flag concerns and caveats proactively before starting
- Expects agents to catch inconsistencies across documents
- Uses Codex as an independent reviewer of Claude's proposals and implementation
