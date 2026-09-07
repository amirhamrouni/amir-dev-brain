# Amir Dev Brain Dashboard

Premium council command center built with Next.js App Router, Tailwind CSS, Motion for React and Supabase Realtime Broadcast.

## Current scaffold

- Split-screen desktop layout: governed input/context on the left, live debate thread on the right.
- Blue Architecture Model message component.
- Red Adversarial Model message component.
- Animated `[CONFLICT_FLAG]` badge.
- Synthesis card with local Approve/Reject interaction.
- Supabase Realtime Broadcast hook listening for `council_event` on `amir-dev-brain:council` by default.
- Automatic mock mode when public Supabase browser env vars are absent.
- Responsive mobile layout and `prefers-reduced-motion` support.

## Realtime event contract

Broadcast one payload on event `council_event` using one of these shapes:

```ts
{ type: "message", message: CouncilMessage }
{ type: "conflict", flag: ConflictFlag }
{ type: "synthesis", synthesis: CouncilSynthesis }
```

## Environment

Copy `.env.example` to `.env.local` and set only public browser credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_COUNCIL_CHANNEL=amir-dev-brain:council
```

Never place a Supabase service-role key in `NEXT_PUBLIC_*` variables.

## Local run

```bash
npm install
npm run typecheck
npm run build
npm run dev
```
