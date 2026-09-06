# Amir Dev Brain — AI Context Fallback

This root-level file exists as a compatibility fallback for AI clients that cannot reliably fetch nested GitHub paths because of robots, indexing, connector, or cache limitations.

## Authority and source hierarchy
1. Actual target project repository = source of truth for code, commits, CI, releases, and deployment history.
2. `projects/*.md` = structured project memory and latest recorded checkpoint.
3. `decisions/APPROVED_DECISIONS.md` = Amir-approved authoritative decisions.
4. `council/*.md` = model opinions only.
5. `PROJECTS.md` = central registry/index.
6. This file = access fallback only; it must not override more specific verified sources.

## Mandatory engineering protocol
Before coding or modifying any Amir project:
1. Read `PROJECTS.md`.
2. Read the relevant project record when accessible.
3. Read applicable approved decisions.
4. Inspect the actual target GitHub repository and default branch.
5. Verify current commit/CI/deployment state before making current-status claims.
6. Continue from existing implementation; do not restart from scratch unless Amir explicitly requests it.
7. Apply ECC-style engineering discipline: inspect/context recovery → plan smallest correct change → implement → review → test/build/lint → fix failures → verify CI/release/deployment → update Amir Dev Brain after material verified milestones.

## Status vocabulary
- `verified-current`: verified against the live repository or deployment in the current session.
- `historical-verified`: previously verified at a known checkpoint; may now be stale.
- `historical-unverified`: prior context not confirmed against current code.
- `planned`: agreed target without implementation proof.
- `unknown`: no reliable state available.

Never silently convert historical information into current fact.

## Approved global decisions
- AD-001: `amirhamrouni/amir-dev-brain` is the shared cross-model development memory.
- AD-002: GitHub is the source of truth for implementation state.
- AD-003: Continue existing work; do not restart by default.
- AD-004: Use ECC (`affaan-m/ECC`) as an engineering reference for planning, memory/context, specialized agents/skills, review, testing, build-error resolution, and release discipline.
- AD-005: Use a reusable Amir UI/System instead of ad-hoc generated screens. Web/AI/SaaS generally prefers shadcn/ui + Base UI + Tailwind, with HeroUI/Mantine when useful. Android uses a deliberate Jetpack Compose design system.
- AD-006: Secrets/API keys/tokens/passwords/private credentials never belong in source control.

## English Twin fallback record
- Project: English Twin
- Repository: `amirhamrouni/lessonss`
- Default branch: `main`
- Product: AI English-learning platform/app.
- Brain status: `historical-verified`.
- Last verified historical checkpoint: `638259bd14a504c4620770c25477df09632ab27a`.
- Checkpoint label: Final Release Polish / Release Candidate.
- Historically verified/completed at that checkpoint: A0 60 words in 10 packs × 6 with Firestore progress/resume; A1 13/13 rich lessons; A2 12/12 rich lessons; FSRS Smart Review; Adaptive Sentence Builder; Speaking tied to mistakes and FSRS; persistent AI Twin learner memory; Guided Speech + Gemini Live with microphone/privacy consent; Firebase Auth/Firestore owner-scoped security; authenticated per-user AI quotas; Privacy page; Error Boundary; lazy routes.
- Historical blocker/verification requirement: CI #217 was still in progress at the recorded checkpoint.
- Approved direction: continue from the current `amirhamrouni/lessonss` repository state; do not rebuild from scratch.
- Current verified state: unknown until live repository inspection.
- Next verification action: inspect `amirhamrouni/lessonss` main branch, latest commit, Actions/CI, deployment state, and release blockers; then update the project record with `verified-current` evidence.

## Access fallback rule for AI clients
If a nested file such as `projects/english-twin.md`, `protocol/DEVELOPMENT_SYSTEM.md`, or `decisions/APPROVED_DECISIONS.md` cannot be fetched because of robots/indexing/connector limitations:
- Do not infer that the file does not exist.
- Use `AI_CONTEXT.md` plus any accessible root-level files as fallback context.
- Still inspect the actual target project repository before making current-state claims.
- State clearly which source was inaccessible and which fallback source was used.

## Decision vs opinion rule
Model suggestions remain `model opinion` unless Amir explicitly approves them. Only Amir-approved decisions may be treated as authoritative product or architecture decisions.
