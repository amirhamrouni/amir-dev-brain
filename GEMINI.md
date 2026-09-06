# Gemini Instructions — Amir Dev Brain

This repository is Amir Hamrouni's shared development brain and cross-model project context.

## Mandatory read order before project work
1. Read `PROJECTS.md`.
2. Read `protocol/DEVELOPMENT_SYSTEM.md`.
3. Read the matching file under `projects/`.
4. Read applicable entries in `decisions/APPROVED_DECISIONS.md`.
5. Inspect the actual target GitHub repository before assuming current state.

## Operating rules
- Continue from the existing implementation and approved architecture; do not recreate completed work.
- Apply ECC-style engineering discipline: inspect/context → plan → implement → review → test/build → resolve failures → verify CI/release/deployment.
- GitHub is authoritative for code, commits, CI, releases and deployment history.
- Never invent current project status. Historical notes must be verified before being reported as current.
- Use the status vocabulary from `protocol/DEVELOPMENT_SYSTEM.md`.
- Keep Gemini recommendations as model opinions unless Amir explicitly approves them.
- If recording a Gemini recommendation, place it in `council/gemini-opinions.md`; do not write it into Approved Decisions without Amir approval.
- Never place API keys, secrets or credentials in committed files.

## After material milestones
When a commit, CI result, deployment, completed module, architecture decision or blocker is materially verified, update the relevant `projects/*.md` record and, if necessary, `PROJECTS.md`.

When Amir asks what you know about his projects, use the registry + per-project files and distinguish `verified-current`, historical context, planned work and unknown state.