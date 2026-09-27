# Amir Automation Completion Contract

Canonical user preference for all scheduled/manual automation workers.

## 0. Mandatory learning loop
Before substantive work, read `memory/error-ledger.md` plus the domain-specific rules/state. A confirmed user correction or reproducible failure is production evidence and must not die in chat history.

When a new generalizable mistake is confirmed:
1. identify the mistake and root cause;
2. fix the current task;
3. add a durable prevention gate to `memory/error-ledger.md`;
4. mirror that gate into the relevant worker/rule/state when tools permit;
5. on later runs, check known failure signatures before inventing a new workaround.

The objective is cumulative quality improvement and preventing repeated mistakes, not pretending errors can never occur.

## 1. Preserve specialization
Each worker keeps its own domain and brand. Do not merge responsibilities merely because the execution contract is shared.

Examples:
- Ghaba News production = Tunisia news production/publishing only.
- Ghaba Breaking Radar = discovery/verification only, never publishes.
- Amir content = Amir Hamrouni personal content only, never Ghaba branding/news.
- Reels Intake = ingest/brand/QC/schedule existing authorized media; do not invent a different content mission.
- App/build/release workers = engineering/release work, not social-content production.
- Shopping/deal watches = verified deal discovery only, not publishing workflows.

## 2. Terminal-result contract
A worker must not stop at an intermediate artifact when its task can continue with available tools.

For publication-capable content workers, research, prompts, storyboards, images, local MP4, upload, create-post response, or status text are not success. Success requires a final media artifact that passes QC and is verified live as PENDING, SCHEDULED, or PUBLISHED on the intended account/platform, followed by state/writeback where the workflow has a canonical state store.

For app/build/release workers, success means the terminal verified result appropriate to that worker: e.g. tests/build/package/deploy/release verification, not merely code changes or a running job.

For monitoring/radar workers, success means a verified detection matching their condition. They must not mutate or publish outside their specialty.

A run may finish as FAILED_STAGE only after materially different available recovery paths have been exhausted. Report root cause, the last valid artifact/state, and the exact restart stage. Do not send status-only RUNNING/IDLE chatter.

## 3. Recovery instead of restart
Classify the failure, change the route/arguments materially, retry only the failed stage, and continue the same run. Preserve valid artifacts. Do not redo discovery/research/rendering merely because upload or one downstream platform failed.

A failure on one publish network must not automatically block another valid network. A writeback failure after verified publication does not erase the publication; refresh state/SHA and repair writeback.

## 4. Content visual-identity hard gate
Every content worker must use the identity defined for its own brand. Brand mixing is forbidden.

Before publication, inspect the actual final pixels, not only metadata. Reject and repair any output with:
- inconsistent or amateur visual identity;
- wrong logo/brand/account;
- broken/reversed/disconnected Arabic;
- unreadable or tiny mobile text;
- clipping/overflow/safe-area collision;
- black/corrupt frames;
- visible collage grids when the format expects full-screen scenes;
- random/unrelated visuals;
- generated-text artifacts;
- distorted faces, logos, or reference identity;
- bad crop, stretching, avoidable black bars;
- weak/inaudible/clipped narration or music.

For generated visual stories, scenes should be coherent, full-screen, visually related to their sentence, and professionally composed from first frame to last frame. Re-render only the failed scene/stage when possible.

## 5. Brand-specific identity
### Ghaba News
Use the canonical Ghaba News repository/rules and Master Logo. Current news Reels use the established six-scene 9:16 production/QC contract and the approved audio rotation/state. Political or contested claims require neutral descriptive wording and attribution.

### Amir Hamrouni content
Use Amir identity only. Keep the approved handles/branding for the relevant workflow. If Amir's real reference image is used, preserve facial identity. Never invent Amir's face. For image generation depicting Amir, a usable real Amir reference image must be available in the current conversation before generation. Voice/narration must be natural and pronunciation-correct; rewrite/diacritize Arabic/Tunisian script when necessary before regenerating audio.

Amir visual identity is frameless/video-first: full-screen edge-to-edge content with light overlays only. Reject decorative borders, cards, phone/picture frames, preview cards/images, storyboard/contact-sheet layouts, and heavy poster/infographic compositions unless the user explicitly requests them.

### Reposted/ingested Amir Reels
Never publish the raw file when the workflow requires the Amir overlay/template. Apply the approved brand treatment, safe-area placement, conservative quality enhancement, dedupe, caption, scheduling, and live verification.

## 6. Live verification
Never infer terminal success from an earlier API response. Read the actual destination state after the action. For Metricool workflows, verify the intended brand/account and the resulting provider status live before reporting success.

## 7. Memory/writeback
When a worker has a canonical repository/state ledger, persist verified fixes, failure signatures, IDs, hashes, publication/deploy status, dedupe fingerprints, and the exact next state. A proven fix becomes a prevention rule so later workers do not repeat the same error.

`memory/error-ledger.md` is the cross-workflow prevention memory. Domain-specific state/rules remain authoritative for implementation details, and important corrections should be mirrored there too.

This contract supplements, not replaces, each worker's domain-specific rules. The stricter domain rule wins when there is a conflict.
