# ADB-001 — Premium Council Dashboard Architecture

- **Status:** approved
- **Scope:** Amir Dev Brain dashboard / council operator UI
- **Authority:** Amir
- **Decision date:** 2026-09-07
- **Decision mechanism:** Executive Override; AI Council intentionally bypassed because provider limits must not block implementation.

## Approved stack

- Next.js App Router
- Tailwind CSS
- Motion for React
- Supabase Realtime using Broadcast for live council events

## Approved interaction model

- Desktop-first split-screen operator layout.
- Left pane: project, topic, council context and debate controls.
- Right pane: live multi-model debate thread.
- Distinct visual identity for the blue architecture model and red adversarial model.
- `[CONFLICT_FLAG]` must be visible as a first-class governance signal rather than hidden in prose.
- Final Synthesis must expose explicit Amir `Approve` / `Reject` actions.
- Realtime transport is prepared now even while council providers are unavailable; mock events are permitted for frontend development and validation.

## Implementation boundary

The dashboard lives under `dashboard/` and is a separate Next.js frontend. Existing Supabase Edge Functions, Open Brain MCP infrastructure, migrations and council runtime remain independent and must not be rewritten merely to accommodate the UI.

## Realtime contract

The dashboard subscribes to one Broadcast event named `council_event` on the configurable channel `NEXT_PUBLIC_COUNCIL_CHANNEL`, defaulting to `amir-dev-brain:council`.

Supported payloads:

```ts
{ type: "message", message: CouncilMessage }
{ type: "conflict", flag: ConflictFlag }
{ type: "synthesis", synthesis: CouncilSynthesis }
```

## Security rule

Only public Supabase browser credentials may be exposed through `NEXT_PUBLIC_*`. Service-role keys and other privileged secrets must never enter the browser bundle or GitHub source.

## Verification gate

The dashboard must pass deterministic locked dependency installation, TypeScript type checking and a Next.js production build before merge.
