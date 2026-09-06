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

## Decision process for this project
Before major architecture/product decisions:
1. Gather at least three independent model opinions when useful (e.g. ChatGPT, Claude, Gemini; Codex may replace one when the decision is strongly technical).
2. Keep each result labeled as `model opinion`.
3. Compare trade-offs: product value, reliability, platform restrictions, cost, complexity, maintainability, automation risk, content quality and scalability.
4. Present Amir with the recommended option and alternatives.
5. Only Amir's explicit approval promotes a choice to an authoritative decision.

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
Continue product ideation only. Do not start implementation or lock architecture until Amir asks for the three-opinion comparison and approves the resulting direction.
