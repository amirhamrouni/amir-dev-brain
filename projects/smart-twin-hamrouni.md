# توأمي الذكي حمروني / Smart Twin Hamrouni

- Project: توأمي الذكي حمروني
- Working English name: Smart Twin Hamrouni
- Brain status: `planned`
- Phase: discovery / discussion only
- Repository: not created yet
- Important: no architecture, stack, provider, publishing method, automation policy, or product decision in this file is approved yet unless later promoted to `decisions/APPROVED_DECISIONS.md` by Amir.

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
- The system should be creative and proactive, but final product/architecture decisions are still under discussion.

## Initial agent-system ideas — discussion only
These are model ideas, not approved decisions:

1. Trend Scout Agent
   - watches relevant trends, platform signals, topics, hooks, formats and competitor patterns.
   - scores trend relevance against the account niche instead of chasing every viral topic.

2. Content Strategist Agent
   - turns trend signals + niche + account goals into a content plan.
   - balances trend-driven, evergreen, educational, entertainment and conversion-oriented content.

3. Human Voice / Brand Twin Agent
   - learns approved examples, tone, vocabulary, rhythm, preferred claims, banned phrases and audience style.
   - rewrites outputs to avoid generic AI phrasing and excessive repetition.

4. Visual Director Agent
   - chooses whether a post should be image, carousel, short video, talking-head style, motion graphic, meme-like format, etc.
   - creates prompts/storyboards for visual generation.

5. Image Generation Agent
   - produces images and variations aligned with the brand and content category.

6. Short Video Agent
   - produces short video concepts/scripts/storyboards and coordinates generation/editing/captions/audio where supported.

7. Platform Adaptation Agent
   - adapts one core idea separately for Facebook, Instagram and TikTok instead of cross-posting identical content blindly.

8. Quality / Safety / Originality Agent
   - checks factual claims, duplication, spamminess, awkward AI style, platform-fit and basic policy risk before approval/publishing.

9. Scheduler / Publisher Agent
   - schedules approved content and sends it through supported platform APIs/connectors.
   - records success/failure/retry state.

10. Performance Learning Agent
   - learns from reach, watch time, engagement, saves, shares, comments, click-through and posting-time performance.
   - feeds results back into future content strategy without changing Amir-approved brand constraints silently.

## Human approval modes — discussion only
Possible operating modes to evaluate later:
- Draft only: agents prepare content; Amir publishes manually.
- Approval queue: agents prepare and schedule; Amir approves each item before publishing.
- Trusted auto-publish: only pre-approved categories/formats can publish automatically.
- Mixed mode: sensitive/high-value posts require approval; routine content can auto-publish.

## Creative product ideas to evaluate
- Content DNA: structured brand profile for tone, audience, hooks, visual identity, banned styles, CTA preferences and niche knowledge.
- Trend Fit Score: not just “viral”, but fit × freshness × audience relevance × production feasibility.
- Anti-AI Repetition Memory: detect repeated hooks, sentence patterns, visuals, CTAs and topics across recent posts.
- Multi-variant competition: agents generate 3–5 hooks/concepts; a critic/ranker chooses the strongest before Amir sees it.
- Content Series Engine: recurring human-feeling series rather than isolated random posts.
- Platform-native rewrite: separate TikTok hook, Instagram caption and Facebook framing for the same idea.
- Learning loop: performance analytics influence future proposals, but never overwrite approved constraints automatically.
- Calendar intelligence: avoid topic clustering, repetitive formats and overposting.
- Trend expiration: automatically discard or downgrade stale trend ideas before they reach the queue.

## First autonomous AI Council run — model opinion only
- Date: 2026-09-07
- Topic: `v1-architecture-and-pipeline`
- Execution: production E2E through `amir_council_debate`
- Models observed in the run:
  - Gemini: `google/gemini-2.5-pro`
  - OpenAI: `openai/gpt-5.6-luna-pro`
- Persistence: saved to Open Brain thought `702e9ed1-02bf-4b43-ad3d-4ad8525dd021`
- Status: council recommendation only; not approved.

### Council consensus
- Use a **cloud-native operational backend with a rich web client**. The laptop/browser is the main control surface, but scheduled publishing and durable state must not depend on Amir's machine being online.
- Keep the specialized-agent concept, but implement V1 as **one orchestrated workflow** with explicit typed internal stages rather than many autonomous distributed agents.
- Group the product-level workflow into three phases:
  1. **Strategy** — trend/source ingestion -> validation/scoring -> ranked `ContentBriefs`.
  2. **Creation** — brief -> copy/platform variants/media -> quality/originality checks -> `ContentDraft`.
  3. **Operations** — approval -> scheduling -> publishing -> reconciliation -> performance learning.
- Keep the **Product Content Brain** separate from **Amir Dev Brain**.
- Use provider abstractions for LLM/image/video integrations, but keep V1 interfaces narrow rather than building a broad plug-in ecosystem prematurely.
- Human approval is mandatory in V1. Approval is a hard state boundary before content can become publishable.
- Publishing must use durable state, idempotency, retries, reconciliation for uncertain API outcomes, rate-limit handling, and an immutable audit trail.
- Trend signals must carry provenance such as source, observation time, region/language, confidence and expiration; LLMs must not invent trend evidence.

### Recommended MVP from council
- One niche.
- One Facebook/Instagram account pair where API permissions allow.
- Copy + image generation first.
- One automated trend source plus manual trend input.
- Full Strategy -> Creation -> Operations vertical slice.
- Web approval queue for edit / approve / reject.
- Official platform publishing where eligible.
- Publish-result capture + basic performance metrics.
- Defer TikTok/video generation, autonomous publishing, multi-user/multi-account scale, comments and DMs.

### Main unresolved issue
The remaining architectural disagreement is **workflow orchestration technology**:
- Gemini prefers adopting a dedicated durable workflow engine such as Inngest or Temporal from the start.
- OpenAI recommends a capability-based decision: use the simplest reliable durable workflow implementation that already provides job persistence, retries, idempotency, scheduling, dead-letter/error handling and observable history, then adopt a heavier engine when actual workflow complexity justifies it.
- Both reject naive cron + database flags as insufficient.

## Decision process for this project
Before major architecture/product decisions:
1. Gather at least three independent model opinions when useful (e.g. ChatGPT, Claude, Gemini; Codex may replace one when the decision is strongly technical).
2. Keep each result labeled as `model opinion`.
3. Compare trade-offs: product value, reliability, platform restrictions, cost, complexity, maintainability, automation risk, content quality and scalability.
4. Present Amir with the recommended option and alternatives.
5. Only Amir's explicit approval promotes a choice to an authoritative decision.

## Mandatory Council write-back rule
When Claude, Gemini, ChatGPT, Codex, or another connected model is asked for a Council opinion about this project, the model MUST persist its completed opinion before ending the response.

Required behavior:
1. Use the Amir Dev Brain / Open Brain `capture_thought` tool after forming the opinion.
2. Store the opinion as a model opinion, never as an approved decision.
3. Use a topic/tag that clearly identifies both the project and model, for example:
   - `smart-twin-hamrouni:council:claude`
   - `smart-twin-hamrouni:council:gemini`
   - `smart-twin-hamrouni:council:chatgpt`
   - `smart-twin-hamrouni:council:codex`
4. The stored thought should include: model name, date, architecture proposal, MVP scope, recommended stack, main trade-offs, risks, first implementation steps, and what should be deferred.
5. After capture, verify persistence with `search_thoughts` or `list_thoughts` before claiming the opinion was saved.
6. If persistence fails, report the exact tool failure; do not claim success.
7. Do not ask Amir to copy/paste the opinion into another system. The connected model is responsible for its own write-back.

This write-back rule is part of project workflow, not an architectural/product decision.

## Open questions for later discussion
- Intended user scope: Amir only vs future multi-user product.
- Number/type of social accounts and pages.
- Languages and audience regions.
- Niches/categories to support first.
- Desired approval/autonomy level.
- Image/video generation providers and cost ceiling.
- Whether the system should respond to comments/messages in a later phase.
- Analytics depth and optimization objectives.
- Official API eligibility/permissions for each platform.

## Current next step
Review the first autonomous Council recommendation with Amir. Do not promote it to an Approved Decision until Amir explicitly approves the architecture direction and the unresolved workflow-engine policy.
