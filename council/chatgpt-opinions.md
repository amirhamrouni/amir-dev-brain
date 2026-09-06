# ChatGPT Opinions

Model recommendations only. Nothing here is authoritative unless Amir explicitly approves it and it is promoted to `decisions/APPROVED_DECISIONS.md`.

## 2026-09-07 — Smart Twin Hamrouni
- Model: GPT-5.6 Sol
- Project: Smart Twin Hamrouni / توأمي الذكي حمروني
- Status: open
- Type: model opinion only
- Recommendation: Start with a laptop-first hybrid product using a single stateful agentic workflow rather than a full multi-agent swarm. Keep scheduling/publishing/webhooks in a lightweight cloud backend so publishing continues even if the laptop is off. Use official social APIs first, human approval by default, and a dedicated product Content Brain that learns from approved/rejected content and performance without competing with Amir Dev Brain.

### Product architecture
- Laptop-first primary workspace for Amir.
- Lightweight cloud backend for scheduler, queue, publishing workers, webhooks, retries, and analytics collection.
- Cloud AI providers for LLM/image/video generation where useful; local processing only where it adds real value.
- Do not build a full multi-user SaaS initially.

### Technical architecture
Use one stateful orchestrated pipeline in V1:
Trend Intelligence -> Idea Scoring -> Content Strategy -> Human Voice / Brand Twin -> Platform Adaptation -> Visual/Video Planning -> Media Generation -> Quality/Critic Gate -> Amir Approval -> Scheduler/Publisher -> Performance Learning.

Treat these as explicit stages with structured inputs/outputs, not as 10 independent autonomous services on day one. Split stages into independent agents later only when operational evidence shows that separation is useful.

### MVP
- Start with one or two niches/categories.
- Facebook + Instagram first; TikTok early when API permissions/audit allow reliable publishing.
- Generate post copy, image, and later short-form video.
- Produce 3 candidate ideas/variations per content opportunity.
- Amir can approve, reject, edit, and schedule.
- Calendar, publish status, retry/logging, and basic analytics are mandatory.
- First objective is to prove a full reliable vertical slice, not full autonomy.

### Content Brain
The product's differentiator should be a dedicated editorial learning layer that tracks:
- published content
- accepted/rejected drafts
- successful/weak hooks
- recurring patterns and repetition
- approved tone and phrasing
- effective formats and posting times
- platform-specific outcomes

This is product data, not development memory. Amir Dev Brain remains the development/project/decision memory and must not be replaced or duplicated by this product memory.

### Content Genome per social account
Maintain a structured profile for each account including:
- tone and vocabulary
- humor level
- hook style
- sentence rhythm
- CTA patterns
- banned phrases
- taboo topics
- visual identity
- strong/weak formats
- audience behavior

Analytics and approvals may propose adjustments, but fixed brand constraints must not silently change without Amir approval.

### Trend intelligence
Do not rely on one trend source. Aggregate multiple signals such as:
- Google Trends when available
- RSS/news/public web signals
- niche keywords/topics
- account/platform analytics
- historical content performance
- later, approved platform-native trend signals/APIs where available

Rank trends by a fit score rather than raw virality. Suggested concept:
Trend Fit Score = freshness × niche relevance × audience fit × originality potential × production feasibility.

### Human-feeling content
To avoid generic AI spam:
- compare against recent posts
- detect hook/CTA/visual repetition
- maintain banned generic AI phrasing
- adapt copy natively per platform
- use a critic/quality gate
- learn primarily from Amir-approved examples
- preserve controlled variation inside brand constraints

### Media generation
Use provider abstractions from the start:
- LLMProvider
- ImageProvider
- VideoProvider

Do not hard-lock core architecture to a single generation vendor. Provider choice can later be optimized by quality, latency, availability, and cost.

### Publishing
Official platform APIs should be the primary path. Browser automation should be verification/fallback, not the core publisher.

Recommended publish job lifecycle:
queued -> preparing -> ready -> approved -> scheduled -> publishing -> published / failed -> retrying.

Use idempotency and durable job state so retries cannot accidentally double-publish content.

### Approval policy
V1 default: Approval Queue.
Support architecture for future modes:
- manual/draft only
- approval queue
- trusted-rule auto-publish
- mixed mode

Do not enable broad full-autonomous publishing before the system has enough quality/performance evidence.

### Suggested stack
- Frontend: Next.js + TypeScript + Tailwind + shadcn/ui/Base UI following Amir UI/System.
- Backend: Node.js/TypeScript.
- Database: PostgreSQL.
- Durable scheduler/queue + object storage for media.
- Start with a clear state machine/workflow rather than a heavy multi-agent framework.
- Evaluate Temporal, Inngest, LangGraph or similar only if concrete orchestration requirements justify them.

### Core data model
- Account
- BrandProfile
- ContentGenome
- TrendSignal
- ContentIdea
- ContentDraft
- MediaAsset
- PlatformVariant
- Approval
- Schedule
- PublishJob
- PublishResult
- PerformanceSnapshot
- LearningSignal

### First implementation steps
1. Define one end-to-end vertical slice and one initial niche.
2. Define schemas for Account, BrandProfile, TrendSignal, ContentIdea, ContentDraft and PublishJob.
3. Build one orchestrated workflow with explicit states.
4. Add trend-input adapters with mocked provider boundaries but real internal contracts.
5. Generate three ranked content ideas from trend + brand context.
6. Generate one post and image from the selected idea.
7. Produce Facebook/Instagram-specific variants.
8. Build Amir approval/edit/reject queue.
9. Add durable scheduling + one official publisher integration.
10. Collect publish result and basic performance snapshot, then feed it back as a LearningSignal.

### Biggest risks
1. Platform API permissions/audits and changing platform restrictions.
2. Overengineering multi-agent orchestration before proving the workflow.
3. Generic/repetitive AI content that hurts account quality.
4. Video generation cost/latency and provider instability.
5. Unsafe autonomy or duplicate publishing without durable job/idempotency controls.

### What not to build yet
- 10 fully autonomous independent agents
- DM automation
- comment-reply bot
- large-scale competitor scraping
- full autonomous publishing for all content
- advanced custom ML recommender
- complex multi-user SaaS/permissions/billing
- oversized analytics suite

### Preferred first milestone
A reliable full vertical slice:
Trend input -> 3 ideas -> choose one -> generate post + image -> platform variants -> Amir approval -> schedule -> publish -> collect result.

### Bottom-line model opinion
Preferred architecture: Laptop-first Hybrid App + Cloud Scheduler + Single Stateful Agentic Workflow + Multi-provider AI + Human Approval + Official Publishing APIs + Product Content Brain + Performance Learning.

Rationale: this preserves the creative multi-agent vision while minimizing premature complexity, allowing the team to learn which roles genuinely deserve to become independent agents after observing real usage and publishing outcomes.

- Evidence level: architectural/product reasoning informed by current platform/API patterns; not an approved decision.
