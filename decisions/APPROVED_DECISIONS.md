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

### AD-007 — One canonical memory layer; direct repository tools for live state
- Status: approved
- Scope: all projects and AI development agents
- Decision: OB1/Open Brain on Supabase is the canonical cross-model episodic memory layer. Do not add a second persistent agent-memory backend such as shared-agent-memory or AgentMemory unless Amir explicitly revises this decision. GitHub remains authoritative for live implementation state, and agents should access repositories through GitHub connector/MCP/direct repository tools rather than web search whenever available. ECC is the engineering workflow layer, not a competing source of truth.
- Authority: Amir

### AD-008 — Pin external agent infrastructure dependencies
- Status: approved
- Scope: Amir Dev Brain infrastructure
- Decision: External infrastructure such as the deployed OB1 MCP server must be pinned to a known upstream commit/version rather than pulled from a mutable `main` branch during deployment. Upgrades must be deliberate and reviewable.
- Authority: Amir

### AD-009 — Chrome DevTools MCP is the preferred web runtime verification gate
- Status: approved
- Scope: web applications and web-facing releases
- Decision: When the active coding environment supports it, use the official Google `ChromeDevTools/chrome-devtools-mcp` as the preferred browser-level verification tool after implementation and before declaring user-visible frontend work complete. Verify the real user flow and inspect relevant console, network, DOM/runtime state, screenshots and performance traces where appropriate. Browser evidence complements rather than replaces tests, CI, GitHub state and deployment verification. If the MCP is unavailable in the current host, the agent must say so and use the strongest available runtime/browser verification method instead of fabricating evidence.
- Authority: Amir

## Project decisions

### English Twin
- Continue from the current `amirhamrouni/lessonss` repository state; do not rebuild it from scratch.

### Dutch Children Education Platform
- Child-facing content should be Dutch-first, with Arabic support for Amir as a teaching aid where appropriate.
- Pedagogy should be progressive, simple, visual, interactive and age-appropriate rather than generic AI-generated lessons.

### Smart Twin Hamrouni

#### ST-001 — V1 architecture, scope and orchestration policy
- Status: approved
- Scope: Smart Twin Hamrouni V1
- Authority: Amir
- Decision date: 2026-09-07
- Decision:
  - Use a **cloud-native operational backend with a rich web client**. The browser/laptop is the control surface, but scheduling, durable state, publishing and analytics must continue independently of Amir's machine being online.
  - Keep the product conceptually composed of specialized agent roles, but implement V1 as **one explicit orchestrated workflow** grouped into three stages: **Strategy -> Creation -> Operations**.
  - Keep the **Product Content Brain** separate from **Amir Dev Brain**. Product content memory/analytics belong to the Smart Twin application; Amir Dev Brain remains development/project/governance memory.
  - V1 scope is intentionally narrow: **one niche, Facebook + Instagram, text + image, one automated trend source plus manual input, approval queue, official publishing, publish-result capture and basic analytics**. TikTok, video generation, autonomous publishing, comments/DM automation and broad multi-user/multi-account scale are deferred.
  - Human approval is a hard state boundary in V1. Content cannot become publishable before approval.
  - Publishing/workflow execution must provide durable state, retries, idempotency, scheduling, dead-letter/error handling, reconciliation for uncertain API outcomes, observable execution history and an immutable audit trail.
  - Implement orchestration behind a small **capability-based service interface** such as `dispatchDurableJob(name, payload, options)`. Business logic in Strategy, Creation and Operations must depend on this internal interface rather than directly on a specific workflow vendor.
  - Use **Inngest as the preferred initial orchestration driver for V1** when it fits cleanly, because it provides durable jobs, retries, schedules/cron and idempotency without requiring heavy self-managed infrastructure.
  - Avoid vendor lock-in: the Inngest implementation must sit behind the internal orchestration interface so it can later be replaced by Temporal or another driver without rewriting domain/business logic.
  - Do **not** introduce Temporal in V1 unless actual workflow complexity, throughput or operational requirements justify it.
  - Do **not** build a custom Redis/BullMQ workflow platform merely to reproduce capabilities already provided by the chosen driver.
- Evidence basis: first autonomous Amir AI Council E2E for `v1-architecture-and-pipeline`, Open Brain thought `702e9ed1-02bf-4b43-ad3d-4ad8525dd021`, followed by Amir's explicit approval of the capability-based Inngest formulation.

#### ST-002 — Content Brain Architecture & Approval Queue V1
- Status: approved
- Scope: Smart Twin Hamrouni V1 Content Brain and Approval Queue
- Authority: Amir
- Decision date: 2026-09-07
- Decision:
  - ST-001 remains authoritative. This decision operationalizes the Content Brain and Approval Queue without changing the three-phase Strategy -> Creation -> Operations architecture.
  - Implement the V1 Product Content Brain as a **PostgreSQL-backed structured event store**, not as a monolithic AI agent or ML platform.
  - Record at minimum: `DraftCreated`, `DraftEdited`, `DraftApproved`, `DraftRejected`, `PublishResult`, `PerformanceSnapshot`, and explicit `LearningSignal` events.
  - Learning signals may propose generation-parameter changes but may not silently modify locked brand constraints such as banned phrases, tone, taboos, or visual identity. Constraint changes require Amir's explicit approval.
  - Specialized agent roles remain conceptual/code boundaries inside the three workflow phases rather than separate V1 microservices.
  - The Approval Queue is a critical V1 operator surface. Each `ContentDraft` is reviewed individually before publishing.
  - Each approval card should expose editable generated copy, Facebook and Instagram variants, image preview/generation metadata when available, trend provenance, quality results, and the underlying `ContentBrief` rationale when available.
  - Approval actions are `Edit`, `Approve`, `Reject`, and later `Schedule`; every state-changing action must produce an immutable audit/event-store record.
  - Show the content lifecycle visibly: `PENDING_APPROVAL -> APPROVED -> SCHEDULED/PUBLISHING -> PUBLISHED | FAILED`, with current implementation allowed to omit `SCHEDULED` until scheduling UI is introduced.
  - A filtered/table overview is allowed. Bulk scheduling of already-approved drafts is allowed. **Batch approve is forbidden in V1**.
  - Defer full Content Genome vocabulary/rhythm/CTA profiling, automated constraint relaxation, multi-variant competition, and complex ML analytics until post-V1 evidence justifies them.
- Evidence basis: autonomous free-tier Amir AI Council debate `ai-content-brain-architecture-and-approval-ui`, Open Brain thought `119c15e4-c45f-4a4c-80f4-e1515131ba20`, followed by Amir's explicit approval on 2026-09-07.

## Maintenance
When Amir explicitly approves a new decision, append it here with a stable ID. If a decision is later changed, mark the older entry `superseded` and link the replacement rather than deleting history.