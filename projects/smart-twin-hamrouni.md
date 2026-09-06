# توأمي الذكي حمروني / Smart Twin Hamrouni

- Project: توأمي الذكي حمروني
- Working English name: Smart Twin Hamrouni
- Brain status: `planned`
- Phase: architecture approved / implementation next
- Repository: not created yet
- Authoritative decision: `ST-001` in `decisions/APPROVED_DECISIONS.md`

## Core vision
A standalone intelligent social-content operating system made of specialized agents that can research trends, generate human-style content, create images and short videos, prepare platform-specific posts, and schedule/publish to social platforms after Amir defines the account settings, categories, tone, constraints, and approval rules.

Target platforms currently discussed:
- Facebook
- Instagram
- TikTok

## Product intent from Amir
- This is a separate project, not Amir Music OS.
- The system should use specialized agents rather than one generic agent.
- Agents should understand the chosen niche/category and produce content that feels human rather than repetitive or obviously AI-generated.
- Agents should follow relevant trends and use them as input, not blindly copy them.
- The system should be able to generate:
  - post copy
  - images
  - short-form videos
  - captions
  - hashtags / metadata where useful
- Amir wants to configure categories, account settings, style, publishing preferences, and related controls himself.
- Scheduling and multi-platform publishing are part of the intended product.
- The system should be creative and proactive.

## Approved V1 architecture — ST-001
Amir explicitly approved the first Council architecture direction on 2026-09-07.

### Platform architecture
- **Cloud-native operational backend + rich web client.**
- Browser/laptop is the primary control surface, but scheduled publishing, durable state, retries, analytics and background execution must not depend on Amir's laptop remaining online.

### Workflow architecture
Keep specialized roles at the product/domain level, while V1 runs as one explicit workflow with three phases:

1. **Strategy**
   - trend/source ingestion
   - source/provenance validation
   - relevance/freshness scoring
   - ranked `ContentBriefs`

2. **Creation**
   - selected brief -> copy
   - Facebook/Instagram platform variants
   - image generation
   - quality/originality/repetition checks
   - final `ContentDraft`

3. **Operations**
   - approval queue
   - scheduling
   - official publishing
   - retries/idempotency/reconciliation
   - publish-result capture
   - basic performance learning

### Orchestration policy
- Business/domain services depend on a small internal capability interface such as:
  - `dispatchDurableJob(name, payload, options)`
- The interface must expose the capabilities actually required by the product: durable state, retries, idempotency, scheduling, dead-letter/error handling, reconciliation and observable execution history.
- **Inngest is the preferred initial V1 driver** when it integrates cleanly.
- Inngest must remain behind the internal orchestration abstraction; Strategy/Creation/Operations business logic must not call vendor-specific APIs directly.
- This preserves the ability to replace Inngest later with Temporal or another driver without rewriting business logic.
- Do not introduce Temporal in V1 without evidence that actual workflow complexity/scale justifies it.
- Do not build a custom Redis/BullMQ workflow platform merely to reproduce the same infrastructure capabilities.

### V1 scope
Approved narrow first scope:
- one niche
- one Facebook/Instagram account pair where API permissions allow
- text + image generation
- one automated trend source + manual trend input
- full Strategy -> Creation -> Operations vertical slice
- web approval queue: edit / approve / reject
- official platform publishing
- publish-result tracking
- basic analytics

Deferred from V1:
- TikTok
- video generation
- broad autonomous publishing
- comments/DM automation
- advanced competitor scraping
- multi-user SaaS complexity
- broad multi-account scale
- large custom analytics/ML platform

### Governance and safety
- Human approval is a hard V1 state boundary; content cannot be published before approval.
- Keep the **Product Content Brain** separate from **Amir Dev Brain**.
- Trend signals must retain provenance: source, observed time, locale/region where relevant, confidence and expiration.
- Publishing must use durable state, idempotency, retries, uncertain-outcome reconciliation, rate-limit handling and an immutable audit trail.

## First autonomous AI Council run — historical evidence
- Date: 2026-09-07
- Topic: `v1-architecture-and-pipeline`
- Execution: production E2E through `amir_council_debate`
- Models observed in the run:
  - Gemini: `google/gemini-2.5-pro`
  - OpenAI: `openai/gpt-5.6-luna-pro`
- Persistence: Open Brain thought `702e9ed1-02bf-4b43-ad3d-4ad8525dd021`
- Result: Council recommendation was reviewed by Amir. The refined capability-based orchestration approach with Inngest as initial driver was explicitly approved and promoted to `ST-001`.

## Initial agent-system ideas — product roles
These remain useful role boundaries inside the approved workflow; they do not imply separate distributed agent services in V1.

1. Trend Scout
2. Content Strategist
3. Human Voice / Brand Twin
4. Visual Director
5. Image Generation
6. Short Video — deferred for V1
7. Platform Adaptation
8. Quality / Safety / Originality
9. Scheduler / Publisher
10. Performance Learning

## Creative product ideas to evaluate after the vertical slice
- Content DNA / Content Genome
- Trend Fit Score
- Anti-AI Repetition Memory
- Multi-variant competition
- Content Series Engine
- Platform-native rewrite
- Performance learning without silently changing fixed brand constraints
- Calendar intelligence
- Trend expiration

## Decision process for this project
Before future major architecture/product decisions:
1. Gather independent model opinions when useful.
2. Keep Council results labeled as model opinions/recommendations.
3. Compare product value, reliability, platform restrictions, cost, complexity, maintainability, automation risk, content quality and scalability.
4. Only Amir's explicit approval promotes a choice to an authoritative decision.

## Mandatory Council write-back rule
When Claude, Gemini, ChatGPT, Codex, or another connected model is asked for a Council opinion about this project, the model MUST persist its completed opinion before ending the response.

Required behavior:
1. Use Amir Dev Brain/Open Brain persistence after forming the opinion.
2. Store it as model opinion/council recommendation, never as an approved decision.
3. Identify project + model clearly.
4. Include architecture proposal, MVP scope, stack, trade-offs, risks, first steps and deferred items.
5. Verify persistence before claiming success.
6. If persistence fails, report the exact failure.
7. Never ask Amir to manually copy/paste Council opinions between systems.

## Open implementation questions
These are implementation details to resolve without changing ST-001 unless they materially alter architecture:
- exact first niche
- first automated trend-source adapter
- Meta app/API permission state for the Facebook/Instagram account pair
- initial image-generation provider
- hosting/runtime choice for web/backend
- database/object-storage implementation details
- exact internal orchestration interface contract and Inngest adapter

## Current next step
Architecture discussion is closed for V1 under `ST-001`. Start implementation by creating the Smart Twin repository and establishing the first end-to-end vertical slice and core contracts before expanding features.