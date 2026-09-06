# Amir Development System

This is the mandatory cross-model engineering protocol for Amir Hamrouni's software projects.

## Source hierarchy
1. Actual target GitHub repository = source of truth for code, commits, CI, releases and deployment history.
2. `projects/*.md` = structured project memory and latest verified checkpoint.
3. `decisions/APPROVED_DECISIONS.md` = authoritative Amir-approved product/architecture decisions.
4. `council/*.md` = model opinions only; never authoritative unless promoted to Approved Decisions by Amir.
5. `PROJECTS.md` = central registry/index.

## Before any coding
1. Read `PROJECTS.md`.
2. Read the relevant `projects/<project>.md` record.
3. Read applicable entries from `decisions/APPROVED_DECISIONS.md`.
4. Inspect the actual target repository and its current default branch.
5. Verify current commit/CI/deployment state before making status claims.
6. Identify what is already implemented and continue from there. Never restart from scratch unless Amir explicitly requests it.

## Engineering loop
Use ECC-style discipline:
1. Inspect and recover context.
2. Plan the smallest correct change.
3. Implement without unnecessary rewrites.
4. Review code and architecture impact.
5. Run tests/build/lint relevant to the change.
6. Resolve failures rather than hiding them.
7. For web applications, when the execution environment supports it, run a real browser verification pass with the official Google Chrome DevTools MCP before calling user-visible frontend work complete.
8. Verify CI/release/deployment state when applicable.
9. Update Amir Dev Brain after a material verified milestone.

## Browser verification gate — Web apps
Chrome DevTools MCP (`ChromeDevTools/chrome-devtools-mcp`) is the preferred browser evidence tool for web projects when available in the active coding environment.

Use it after implementation and before claiming a frontend feature, bug fix, release candidate or production deployment is complete. The agent should verify the relevant user flow against the real app rather than infer success from source code alone.

Minimum browser checks when relevant:
- Open the actual page/build and exercise the changed user flow.
- Check browser console for runtime errors, warnings that indicate broken behavior, and uncaught exceptions.
- Inspect failed or suspicious network requests and confirm key API requests return expected results.
- Inspect DOM/rendered state when the bug concerns layout, visibility, navigation, forms or state transitions.
- Capture screenshots or other browser evidence when it materially helps verify visual behavior.
- Run a DevTools performance trace when the task is about performance, loading, responsiveness or runtime bottlenecks.
- Re-test after a fix instead of assuming the code change resolved the observed problem.

Evidence rule:
- Browser verification is evidence of runtime behavior, not a replacement for tests, CI, repository state or deployment verification.
- Record material browser findings in the project record when they affect release status or the next engineering decision.
- If Chrome DevTools MCP is unavailable in the current host, say so explicitly and use the strongest available runtime/browser verification method instead; do not fabricate browser evidence.

Security rule:
- Treat browser sessions as sensitive. Do not expose credentials, tokens, personal data or authenticated private content in logs, screenshots, prompts or project memory.
- Do not use a personal authenticated browser session for destructive automation unless the task explicitly requires it and the action is appropriate.

## Status vocabulary
- `verified-current`: checked against the live repository or deployment in the current work session.
- `historical-verified`: was verified at a known checkpoint but may now be stale.
- `historical-unverified`: useful prior context but not confirmed against current code.
- `planned`: agreed target, not implemented proof.
- `unknown`: no reliable status available.

Never silently convert historical information into current fact.

## Decisions vs opinions
- A model recommendation is a `model opinion` by default.
- Only Amir can approve a product or architecture decision as authoritative.
- Approved decisions must be recorded in `decisions/APPROVED_DECISIONS.md` with date, project scope and decision text.
- If Amir later reverses a decision, keep history and mark the older decision superseded rather than deleting it.

## UI system
### Web / AI / SaaS
Prefer a reusable Amir UI/System instead of ad-hoc screens. Default tools where appropriate: shadcn/ui + Base UI + Tailwind; HeroUI for a more polished visual layer; Mantine for complex dashboards/forms; other reputable open-source components when they materially improve quality.

### Android
Use a reusable Jetpack Compose design system with coherent typography, spacing, components, states and navigation. Avoid generic generated screens and one-off styling.

## Security
- Never commit API keys, tokens, passwords, service credentials or private personal data.
- Use platform secret stores/environment variables.
- If a secret is ever exposed, treat it as compromised and rotate it.

## Completion rule
A task is not considered complete merely because code was written. Completion requires the relevant build/test/release evidence for that task and an updated project record when the milestone is material.

For user-visible web changes, when Chrome DevTools MCP is available, completion also requires relevant runtime browser evidence (for example console/network/DOM/user-flow verification) in addition to code/tests/CI.