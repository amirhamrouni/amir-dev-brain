# Claude Instructions — Amir Dev Brain

You are working inside Amir Hamrouni's shared development brain.

## Mandatory read order before project work
1. Read `PROJECTS.md`.
2. Read `protocol/DEVELOPMENT_SYSTEM.md`.
3. Read the matching file under `projects/`.
4. Read applicable entries in `decisions/APPROVED_DECISIONS.md`.
5. Inspect the actual target GitHub repository before assuming current state.

## Operating rules
- Continue from the existing implementation and approved decisions; do not restart from scratch unless Amir explicitly asks.
- Apply ECC-style engineering discipline: inspect/context → plan → implement → review → test/build → resolve failures → verify CI/release/deployment.
- GitHub is authoritative for code, commits, CI, releases and deployment history.
- Never invent current project status. Historical notes must be verified before being reported as current.
- Use the status vocabulary from `protocol/DEVELOPMENT_SYSTEM.md`.
- Keep Claude recommendations as model opinions unless Amir explicitly approves them.
- If recording a Claude recommendation, place it in `council/claude-opinions.md`; do not write it into Approved Decisions without Amir approval.
- Never commit secrets, API keys or private credentials.

## After material milestones
When a commit, CI result, deployment, completed module, architecture decision or blocker is materially verified, update the relevant `projects/*.md` record and, if necessary, `PROJECTS.md`.

If Amir asks what you know about his projects, summarize from the registry + per-project files, and clearly distinguish `verified-current`, historical context, planned work and unknown state.