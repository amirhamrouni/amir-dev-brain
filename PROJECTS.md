# Amir Dev Brain — Project Registry

This file is the central cross-model registry for Amir Hamrouni's active software projects.

## Operating rule

Before planning, coding, refactoring, reviewing, debugging, or deploying any Amir project:
1. Read this registry.
2. Inspect the target GitHub repository before assuming current state.
3. Reuse prior approved architecture and decisions; do not restart from scratch.
4. Distinguish verified facts, model opinions, proposals, and Amir-approved decisions.
5. Never invent project status, commits, CI state, deployment state, credentials, or completed work.
6. Apply ECC-style engineering discipline: plan, inspect, implement, review, test, resolve build errors, then verify release state.

## 1. English Twin
- Repository: `amirhamrouni/lessonss`
- Default branch: `main`
- Goal: production-quality AI English-learning platform/app with native-language support, adaptive learning, speaking, review, learner memory, and strong pedagogical progression.
- Known checkpoint: Final Release Polish / Release Candidate.
- Verified historical checkpoint commit: `638259bd14a504c4620770c25477df09632ab27a`.
- Historically completed: A0 60 words (10×6) with Firestore progress/resume; A1 13/13 rich lessons; A2 12/12 rich lessons; FSRS Smart Review; Adaptive Sentence Builder; Speaking tied to mistakes and FSRS; persistent AI Twin learner memory; Guided Speech + Gemini Live with microphone/privacy consent; Firebase Auth/Firestore owner-scoped security; authenticated per-user AI quotas; Privacy page; Error Boundary; lazy routes.
- Important: CI #217 was previously still in progress at checkpoint; inspect GitHub before assuming current status.
- Rule: continue from current repository state; do not rebuild from scratch.

## 2. Resale Intelligence Engine
- Goal: real Android app for evaluating second-hand marketplace listings for profit, ROI, max-buy price, risk, confidence, and recommendation.
- Target stack: Kotlin, Jetpack Compose, backend Node/Fastify/Drizzle/PostgreSQL.
- Core product areas: manual analysis, Smart Deal Finder, camera/gallery scan, URL analysis, watchlist, strategy/profile thresholds, marketplace connectors, fraud/spam detection, active-vs-sold comparables, deterministic profit/risk/confidence/scoring engines.
- Historical implemented areas include domain engines, backend orchestration, DB schema, Android screens/ViewModels, tests and build verification.
- Known historical gaps: Manual Search and camera/gallery scan were incomplete; active vs sold comparables separation needed verification.
- Rule: inspect repository/current implementation before claiming these gaps still exist.

## 3. BASIRA / بصيرة
- Goal: astrology, horoscopes, tarot, dreams and spiritual-reading web application.
- Stack historically: web + Firebase Auth + AI reading engine.
- Product requirements: Google login plus guest mode, strong magical/modern UX, long contextual readings, dashboard, subscriptions/payment readiness, robust engine connectivity.
- Historical issues included Firebase auth argument errors, Google authorized-domain/login failures, dashboard navigation, engine connectivity, and unavailable subscriptions.
- Rule: verify present code/deployment before treating historical bugs as current.

## 4. Amir Music OS
- Repositories historically referenced: `amirhamrouni/amir-music-os` and an earlier `miroux-gif/amir-music-os`.
- Goal: personal AI-assisted music production/publishing operating system, not a client-management SaaS.
- Workflow: trend/demand → keywords + Suno prompt → song variants → cover + Shorts → YouTube/TikTok publishing workflow → requests/profit/analytics.
- Requirements: professional dashboard, adaptive/learning features, AI integrations, GitHub + Vercel deployability.
- Never commit API keys or secrets.

## 5. ZZP BTW Tracker
- Goal: refactor an open-source accounting app into a Dutch B2B accounting application for ZZP freelancers.
- Android target package/application ID: `com.zzp.btwtracker`.
- Requirements historically include complete rebrand, removal of previous-author references/donation/repository links, modern Compose redesign, working APK/release flow, Dutch accounting/VAT-oriented experience.
- Rule: inspect the active repository before implementation.

## 6. Dutch Children Education Platform / App
- Goal: strong child-focused Dutch education platform/app aligned with Dutch learning methods, with simple progressive pedagogy, child-friendly UX, visuals, Dutch-first child content, and Arabic support for Amir as teaching aid where appropriate.
- Reuse reputable free/open educational resources and open-source components where licensing permits.
- Prioritize progression, interaction, comprehension, and age-appropriate design over generic AI-generated screens.

## 7. BrainLeague Kids
- Goal: complete real Android educational application built with AI/Vibe Coding, Firebase/cloud backend, authentication, and production engineering quality.
- Treat as a real app, not a mock/demo. Inspect current repository and deployment state before continuing.

## 8. توأمي الذكي حمروني / Smart Twin Hamrouni
- Project record: `projects/smart-twin-hamrouni.md`
- Status: `planned` / discovery-discussion only.
- Repository: not created yet.
- Goal: standalone intelligent social-content operating system using specialized agents to research relevant trends, generate human-style posts/images/short videos, adapt content per platform, schedule/publish to Facebook/Instagram/TikTok, and learn from performance under Amir-defined settings and approval rules.
- Important: no architecture, provider, automation, or publishing decision is approved yet. Major decisions should be compared using at least three model opinions and promoted only after Amir explicitly approves.

## Shared development system
- Amir Dev Brain is the central coordination/memory layer.
- GitHub is source of truth for code, commits, CI, releases and deployment history.
- Use ECC (`affaan-m/ECC`, Everything Claude Code) as a reference framework for agent organization: planning, memory/context, skills, specialized agents, code review, testing, build-error resolution and release discipline.
- UI/system preference for web/AI/SaaS: reusable Amir UI/System; typically shadcn/ui + Base UI + Tailwind, HeroUI for a more polished visual layer, Mantine for complex dashboards/forms, and other proven open-source UI resources when beneficial.
- For Android: prefer a deliberate reusable design system in Jetpack Compose rather than ad-hoc screens.
- Security: secrets/API keys must never be committed to GitHub.

## Cross-model coordination
ChatGPT, Claude, Gemini, Codex and other agents should treat this repository as shared context. Model-generated recommendations are opinions unless explicitly approved by Amir. Approved decisions should be recorded separately from model opinions.

## Update policy
Whenever a material milestone is verified (commit, CI result, deployment, completed module, architecture decision, blocker), update this registry or the corresponding project record. Do not overwrite verified history with assumptions.