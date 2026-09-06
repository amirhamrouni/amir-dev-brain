---
name: amir-dev-brain
description: Recover Amir Hamrouni's shared project context and enforce repository verification before coding, debugging, reviewing, deploying, or reporting project status. Use for any Amir software/app project, especially English Twin, Resale Intelligence Engine, BASIRA, Amir Music OS, ZZP BTW Tracker, Dutch Children Education Platform, and BrainLeague Kids.
---

# Amir Dev Brain Skill

## Trigger
Use this skill before any software task for Amir.

## Context recovery
1. Read `/CLAUDE_BOOTSTRAP.md` and `/AI_CONTEXT.md` from `amirhamrouni/amir-dev-brain`.
2. Read `/PROJECTS.md`.
3. Read `/decisions/APPROVED_DECISIONS.md` when accessible.
4. Read the matching `/projects/<project>.md` record when accessible.
5. If a nested file is blocked by robots/indexing/connector limitations, do not assume it is absent. Use root fallbacks and report the access limitation.

## Repository verification
Before claiming current status or editing code:
1. Identify the actual target repository.
2. Fetch the default branch and latest commit.
3. Inspect relevant files/current implementation.
4. Inspect CI/Actions and deployment/release state when relevant.
5. Mark only same-session verified facts as `verified-current`.

## Engineering loop
Follow ECC-style discipline:
`recover context -> inspect -> plan -> implement -> test -> review -> resolve failures -> verify -> remember`

Prefer the smallest correct change. Continue from existing implementation. Never rebuild from scratch unless Amir explicitly requests it.

## Decision safety
- `decisions/APPROVED_DECISIONS.md` contains authoritative Amir-approved decisions.
- `council/*.md` contains model opinions only.
- Never promote a model opinion into a decision without Amir's explicit approval.

## Completion
A coding task is complete only after relevant build/test/lint evidence and, when material, CI/release/deployment verification. Update Amir Dev Brain after a material verified milestone.

## Security
Never commit API keys, passwords, tokens, private credentials, or personal secrets.
