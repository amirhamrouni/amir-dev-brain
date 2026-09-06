# Amir Approved Decisions

Only decisions explicitly approved by Amir belong here. Model suggestions are not decisions until Amir approves them.

## Global decisions

### AD-001 — Amir Dev Brain is the shared cross-model development memory
- Status: approved
- Scope: all projects
- Decision: Use `amirhamrouni/amir-dev-brain` as the central project-memory and coordination layer for ChatGPT, Claude, Gemini, Codex and other development agents.
- Authority: Amir

### AD-002 — GitHub is the source of truth for implementation state
- Status: approved
- Scope: all projects
- Decision: Current code, commits, CI, releases and deployment history must be verified from the actual project repository before being reported as current.
- Authority: Amir

### AD-003 — Continue existing work; do not restart by default
- Status: approved
- Scope: all projects
- Decision: Before modifying a project, recover prior context and continue from the existing implementation. Do not rebuild from scratch unless Amir explicitly requests it.
- Authority: Amir

### AD-004 — ECC-style engineering discipline
- Status: approved
- Scope: all programming/application work
- Decision: Use Everything Claude Code (affaan-m/ECC) as a reference for planning, memory/context, skills/specialized agents, code review, testing, build-error resolution and release discipline.
- Authority: Amir

### AD-005 — Reusable Amir UI/System
- Status: approved
- Scope: UI/application development
- Decision: Prefer a reusable design system rather than ad-hoc generated screens. For web/AI/SaaS, generally prefer shadcn/ui + Base UI + Tailwind, with HeroUI when a more polished layer is useful and Mantine for complex dashboards/forms. For Android, use a deliberate reusable Jetpack Compose design system.
- Authority: Amir

### AD-006 — Secrets never belong in source control
- Status: approved
- Scope: all projects
- Decision: API keys, tokens, passwords and private credentials must never be committed to GitHub.
- Authority: Amir

## Project decisions

### English Twin
- Continue from the current `amirhamrouni/lessonss` repository state; do not rebuild it from scratch.

### Dutch Children Education Platform
- Child-facing content should be Dutch-first, with Arabic support for Amir as a teaching aid where appropriate.
- Pedagogy should be progressive, simple, visual, interactive and age-appropriate rather than generic AI-generated lessons.

## Maintenance
When Amir explicitly approves a new decision, append it here with a stable ID. If a decision is later changed, mark the older entry `superseded` and link the replacement rather than deleting history.