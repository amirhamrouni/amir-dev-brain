# English Twin

- Project: English Twin
- Repository: `amirhamrouni/lessonss`
- Default branch: `main`
- Product: AI English-learning platform/app
- Current brain status: `verified-current`
- Current release baseline: `f39d549cac4d703d03b8158d84257e6d27f8bbff`
- Current verification date: 2026-09-07
- Current verification source: live GitHub inspection plus Amir's explicit owner verification of production infrastructure
- Current label: **Production Release Ready**

## Goal
Production-quality English-learning experience with native-language support, adaptive progression, speaking, spaced review, learner memory and strong pedagogy.

## Official production release declaration — 2026-09-07
Amir explicitly confirmed that the final release blockers have been removed and directed that this version be formally declared **Production Release Ready**.

Release baseline:
- Commit: `f39d549cac4d703d03b8158d84257e6d27f8bbff`
- English Twin CI: passed for the release baseline.
- CodeQL Security Scan: passed for the release baseline.
- Production release path uses deterministic `package-lock.json` + `npm ci` installs and production dependency auditing.
- GitHub Actions in the release path are pinned to exact SHAs.
- Production Vercel CLI is pinned rather than using a floating `latest` version.
- Production deploy is gated on the verified CI result and matching CodeQL success for the exact deployment SHA.
- Dependabot is configured for controlled non-breaking maintenance; automatic major-version updates are excluded from the normal policy.
- Production response security headers and API no-store behavior are configured.
- Firestore owner isolation, authenticated AI endpoints, quota/abuse controls, privacy/account deletion, FSRS, learner memory, Guided Speech and Live voice behavior remain preserved.

Owner-confirmed final infrastructure checks:
- Branch Protection configured for the release flow.
- CI and CodeQL required before merge.
- Up-to-date branches required before merge.
- Vercel production deployment verified successfully.
- `/api/health` verified successfully in production.
- Persistent quota protection confirmed healthy.

**Release decision:** no known release blocker remains at the declaration point. English Twin is approved for production publication.

## Release interpretation
`Production Release Ready` means the declared baseline passed the defined engineering, security, build, deployment and production-health gates and has Amir's explicit release approval. It is not a claim that future defects are impossible. Every later production candidate must pass the same required gates before replacing this baseline.

## Historically verified/completed
- A0: 60 words in 10 packs × 6 with Firestore progress/resume.
- A1: 13/13 rich lessons.
- A2: 12/12 rich lessons.
- FSRS Smart Review.
- Adaptive Sentence Builder.
- Speaking tied to mistakes and FSRS.
- Persistent AI Twin learner memory.
- Guided Speech + Gemini Live with microphone/privacy consent.
- Firebase Auth/Firestore owner-scoped security.
- Authenticated per-user AI quotas.
- Privacy page.
- Error Boundary.
- Lazy routes.

## Historical checkpoint
- Commit: `638259bd14a504c4620770c25477df09632ab27a`
- Label: Final Release Polish / Release Candidate
- Historical note: CI #217 was still in progress at that checkpoint and is superseded by later successful release gates.

## Approved direction
- Treat the `f39d549...` baseline as the formally approved Production Release Ready checkpoint.
- Continue from the current repository state; do not rebuild from scratch.
- GitHub remains authoritative for live implementation state.
- Owner-verified production infrastructure can supplement connector-visible evidence when documented explicitly as owner-confirmed.
- Any later production release must re-run CI, CodeQL, production build/deploy and runtime-health gates.

## Next action
The release-readiness phase is closed. Continue only with post-release product work, store/publication operations, or a new explicitly requested development task; re-verify the repository before reporting any future `verified-current` state.
