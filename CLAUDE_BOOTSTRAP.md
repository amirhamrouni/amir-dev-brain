# Amir Dev Brain — Claude Bootstrap

Use this file as the reliable root-level entrypoint when Claude Chat, Claude Code, or a connector cannot read nested paths because of robots, indexing, or connector limitations.

## Mandatory startup order
1. Read `AI_CONTEXT.md`.
2. Read `PROJECTS.md`.
3. Read `decisions/APPROVED_DECISIONS.md` if accessible.
4. Read the relevant `projects/<project>.md` if accessible.
5. Inspect the actual project GitHub repository before reporting current implementation status.

## Access fallback rule
If any nested path fails to open:
- Do not infer that the file does not exist.
- Use this root bootstrap plus `AI_CONTEXT.md` and `PROJECTS.md` as fallback context.
- Prefer GitHub connector/MCP/API/raw-content access over web search.
- State which nested file was inaccessible.
- Still inspect the actual target project repository before making any `verified-current` claim.

## Source authority
1. Actual target GitHub repository: current code/commits/CI/releases/deployment.
2. `projects/*.md`: structured project memory/checkpoints.
3. `decisions/APPROVED_DECISIONS.md`: Amir-approved authoritative decisions.
4. `council/*.md`: model opinions only.
5. `PROJECTS.md`: central registry.

## English Twin fallback
- Repository: `amirhamrouni/lessonss`
- Branch: `main`
- Brain status: `historical-verified`
- Last verified historical checkpoint: `638259bd14a504c4620770c25477df09632ab27a`
- Label: Final Release Polish / Release Candidate
- Historical note: CI #217 was still in progress at that checkpoint.
- Approved direction: continue from the current repository state; do not rebuild from scratch.
- Current verified state: unknown until live repository inspection.

## Operating behavior
Default to action when Amir asks for project work: recover context, inspect the live repository, plan the smallest correct change, implement, test, review, resolve failures, verify CI/release when relevant, and update Amir Dev Brain after a material verified milestone.

Never convert historical context into current fact without verification. Never treat model opinion as an approved decision. Never commit secrets.
