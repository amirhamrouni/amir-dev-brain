# Amir Error & Prevention Ledger

Purpose: permanent operational memory for proven mistakes, user corrections, failure signatures, fixes, and prevention rules. This is not a blame log. It exists so the same mistake is not repeated in later chats, automations, or workers.

## Mandatory behavior
1. Before substantive work, read this ledger plus the domain state/rules relevant to the task.
2. When the user corrects a result, treat the correction as production evidence, not a disposable chat comment.
3. Every confirmed mistake must be recorded as: `mistake -> root cause -> fix -> prevention gate -> affected workers`.
4. A fix is not considered learned until its prevention gate is written into the relevant rule/state/automation.
5. If a later failure matches an existing signature, apply the stored prevention rule before inventing a new workaround.
6. Do not claim perfection. The target is cumulative reduction of repeated errors through evidence, QC, and writeback.

## Confirmed lessons

### ERR-001 — Invented Amir face instead of using a verified real reference
- Date: 2026-09-27
- Mistake: generated a test visual representing Amir with an invented face that did not match the user.
- Root cause: identity generation started without first verifying that a usable real Amir reference image was available for the current image-generation context.
- Fix: do not render Amir from imagination. For any image-generation request depicting Amir, require a usable real photo of Amir in the current conversation before calling the image generator, then preserve facial identity.
- Prevention gate: `REAL_PERSON_REFERENCE_REQUIRED`. No current-chat usable reference -> do not generate Amir. Ask for/upload the reference once instead of guessing.
- Affected workers: Amir Content, AmirPster, manual image generation, video-frame generation using Amir.

### ERR-002 — Heavy framed/preview visual identity for Amir content
- Date: 2026-09-27
- Mistake: used framed cards / preview-like compositions / poster or infographic layouts instead of clean video-first identity.
- Root cause: visual branding was treated as a layout container rather than a light overlay on the content.
- Fix: full-screen 9:16 edge-to-edge scenes; branding only as light transparent overlays.
- Prevention gate: `FRAMELESS_AMIR_IDENTITY`. Reject borders, cards, phone frames, picture frames, preview images/cards, thumbnails, storyboard panels, contact sheets, visible collage, boxed layouts, and poster-heavy compositions.
- Affected workers: Amir Content, AmirPster, Reels Intake.

### ERR-003 — Stopping publication workflows at intermediate artifacts
- Mistake: treating research, prompts, storyboards, images, local MP4, upload, or create-post response as completion.
- Root cause: success was defined by intermediate progress rather than the user-visible terminal result.
- Fix: continue through QC, publish/schedule, live destination verification, and state writeback.
- Prevention gate: `TERMINAL_RESULT_ONLY`. Publication workers succeed only after live PENDING/SCHEDULED/PUBLISHED verification on the intended account/platform.
- Affected workers: all publication-capable content workers.

### ERR-004 — Brand/account mixing risk
- Mistake pattern: risk of using Ghaba assets/account/state in Amir content or vice versa.
- Root cause: shared publishing infrastructure without a hard brand check.
- Fix: verify brand/account before creation and after publication.
- Prevention gate: `BRAND_LOCK`. Amir Metricool brandId=6926406. Ghaba Metricool brandId=7076044. Never cross-publish or cross-brand assets unless explicitly requested.
- Affected workers: Amir Content, AmirPster, Reels Intake, Ghaba production.

### ERR-005 — Google Drive private-view URL passed as publish media
- Mistake: attempting to use a private Google Drive view URL as Metricool media.
- Root cause: confusing a human-viewable Drive page with a directly usable media upload.
- Fix: attach the actual file through `mediaFiles` or a genuinely public direct HTTPS media URL.
- Prevention gate: `MATERIAL_MEDIA_REQUIRED`. If Drive URL normalization fails, retry only the upload/publish stage using the local/materialized file; do not redo discovery/rendering.
- Affected workers: Metricool publication workers.

### ERR-006 — Arabic/RTL output looked broken despite technically valid render metadata
- Mistake pattern: disconnected/reversed Arabic, missing glyph boxes, clipping, or source footer glyph failures.
- Root cause: trusting metadata or text strings without checking rendered pixels.
- Fix: shaping-aware rendering and actual frame inspection.
- Prevention gate: `PIXEL_RTL_GATE`. Inspect beginning/middle/end and scene boundaries. Any reversed/disconnected Arabic, missing glyphs, clipping, overflow, or boxes = QC_FAIL and rerender the failed stage only.
- Affected workers: Ghaba, Amir Arabic content, any Arabic visual artifact.

### ERR-007 — Duplicate/race risk between manual and scheduled Ghaba cycles
- Mistake pattern: concurrent workers could schedule overlapping stories or break A/B music rotation/state.
- Root cause: multiple writers acting on stale state.
- Fix: re-read state and Metricool live before publication, music assignment, and writeback; semantic dedupe; single-writer policy where defined.
- Prevention gate: `FRESH_STATE_BEFORE_MUTATION` + `SEMANTIC_DEDUPE`.
- Affected workers: Ghaba production/scheduled/manual workers.

### ERR-008 — Ghaba news visuals rejected as low-quality/synthetic
- Date: 2026-09-28
- Confirmed bad items: `OpenAI / DNS` (uuid `4661829563014006643`), `Karnak / two sacred lakes` (uuid `1977247858116282492`), and `Bangkok floods` (uuid `-1126825553729993065`). The user explicitly rejected these three as unacceptable.
- Mistake: news items were allowed into the queue with synthetic/illustrative or weak visuals instead of real, story-matched photojournalistic material.
- Root cause: visual sourcing was treated as a production shortcut rather than an editorial evidence gate.
- Fix: for Ghaba news, source real event media first, then real person/place/institution/context media, then directly relevant neutral real B-roll. If no acceptable real visual exists, skip the story.
- Prevention gate: `GHABA_REAL_VISUAL_OR_SKIP`. No AI-generated event/news imagery, no generic or unrelated stock, no cheap infographic/cards, no fake event depiction. Actual final pixels must be inspected before Metricool create.
- Affected workers: صحفي, Ghaba News production, manual Ghaba cycles.

### ERR-009 — Unauthorized scope expansion / mutation outside the explicit task
- Date: 2026-09-28
- Mistake: while executing one Ghaba cycle, the assistant paused/modified other scheduled posts and disabled workers that the user had not asked to change.
- Root cause: interpreting a new quality rule as permission to retroactively mutate unrelated existing assets and automations.
- Fix: changes are limited to the exact objects explicitly requested in the current task. Existing schedules, drafts, automations, queues, files, accounts, or other conversations are read-only unless the user explicitly authorizes changing them.
- Prevention gate: `EXPLICIT_SCOPE_MUTATION_ONLY`. Before any destructive or state-changing action, verify that the exact target is named or unambiguously included in the user's current instruction. Quality rules do not grant retroactive mutation authority.
- Affected workers: all automations, publishing workers, GitHub/Metricool/Drive actions, browser automation, and manual operational tasks.

## Correction ingestion rule
Any direct user correction such as “this is wrong”, “do not do this again”, “use this exact identity”, pronunciation correction, workflow correction, UI correction, account correction, publishing correction, or scope/permission correction must be evaluated immediately. If it is generalizable or recurrence-sensitive, append it here and mirror it into the relevant domain brain/rule/state only when that write is within the user's explicit scope.

## Quality target
The goal is not to pretend errors will never happen. The goal is that a confirmed error should become progressively harder to repeat because the system gains a durable prevention rule, a QC gate, or both.
