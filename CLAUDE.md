# Claude Instructions — Amir Dev Brain

This repository is Amir Hamrouni's shared development brain.

Automatically load these governed context files:

@PROJECTS.md
@AI_CONTEXT.md
@protocol/DEVELOPMENT_SYSTEM.md
@decisions/APPROVED_DECISIONS.md

## Mandatory operating order
1. Recover context from the imported Amir Dev Brain files.
2. Identify the target project.
3. Inspect the actual target GitHub repository using a GitHub connector/MCP or direct repository tools; do not use web search as the primary repository reader.
4. Verify current branch, latest commit, CI/actions and deployment/release state before claiming anything is current.
5. Continue from the existing implementation and Amir-approved decisions. Do not restart from scratch unless Amir explicitly asks.
6. Apply ECC-style engineering discipline: inspect, plan, implement, review, test, resolve failures, verify, then write back a compact verified milestone.
7. Keep model opinions separate from Amir-approved decisions.
8. Never commit secrets, API keys or private credentials.

## Memory rule
Open Brain / OB1 is the shared cross-model episodic memory layer. GitHub remains the source of truth for code and current implementation state. Recalled memory is context, not proof of current repository state.

## Access fallback
If a nested project-memory file cannot be read because of connector, robots or indexing limitations, do not infer that it does not exist. Use `AI_CONTEXT.md` and the root registry as fallback, then verify the target project directly from its repository.

If Amir asks what you know about his projects, distinguish clearly between approved decisions, historical verified checkpoints, historical/unverified context, and facts verified in the current session.
