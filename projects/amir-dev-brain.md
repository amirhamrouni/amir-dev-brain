# Amir Dev Brain

- Project: Amir Dev Brain
- Slug: `amir-dev-brain`
- Brain status: `verified-current`
- Repository: `amirhamrouni/amir-dev-brain`
- Default branch: `main`
- Authority: Amir

## Purpose
Amir Dev Brain is Amir's shared cross-model development memory and governance layer. It coordinates ChatGPT, Claude, Gemini, Codex and other development agents without requiring Amir to manually copy context between systems.

## Source-of-truth hierarchy
1. Actual target GitHub repository for current code, commits, CI, releases and deployment state.
2. `projects/*.md` for structured project memory and verified checkpoints.
3. `decisions/APPROVED_DECISIONS.md` and standalone approved decision records under `decisions/` for Amir-approved authoritative decisions.
4. `council/*.md` for model opinions only.
5. `PROJECTS.md` for the registry.

## Persistent memory architecture
- Canonical cross-model episodic memory: OB1/Open Brain on Supabase/PostgreSQL.
- Semantic retrieval uses embeddings stored with thoughts.
- GitHub remains authoritative for live implementation state.
- OB1/Open Brain is the single persistent shared memory layer; do not introduce a competing memory backend without Amir approval.
- Supabase project ref: `hdcpvwsndxxflbednvsq`.
- Open Brain MCP is deployed as a Supabase Edge Function using pinned OB1 upstream infrastructure plus Amir-specific tools.

## Relevant MCP capabilities
Official/Open Brain capabilities include thought capture, semantic search, recent-thought listing and statistics.
Amir-specific capabilities include:
- `amir_list_projects`
- `amir_project_context`
- `github_repo_state`
- `github_fetch_file`
- `amir_council_debate`

## Council architecture
`amir_council_debate` runs model-to-model debate server-side through OpenRouter/provider adapters, persists the transcript and synthesis into Open Brain, and labels the result as model opinion/council recommendation until Amir explicitly approves it.

Current council routing policy:
- zero-cost provider routing where configured
- provider fallback is allowed so rate limits do not stop the workflow
- long enough response budgets to avoid truncated architectural discussions
- multi-round debate supported
- persisted synthesis required before reporting success

## Premium Council Dashboard — approved and implemented scaffold
Approved decision: `decisions/ADB-001_PREMIUM_COUNCIL_DASHBOARD.md`.

The dashboard is implemented as an independent frontend under `dashboard/` so the operator UI can evolve without rewriting Open Brain MCP or existing Supabase Edge Functions.

Approved frontend architecture:
- Next.js App Router
- Tailwind CSS
- Motion for React
- Supabase Realtime Broadcast
- split-screen desktop layout: Input/Context on the left, Live Debate Thread on the right
- blue Architecture Model message component
- red Adversarial Model message component
- animated `[CONFLICT_FLAG]` governance badge
- Synthesis panel with explicit Amir Approve/Reject interaction
- mock mode when public Supabase realtime env vars are absent
- responsive mobile layout and reduced-motion support

Realtime contract:
- channel defaults to `amir-dev-brain:council`
- Broadcast event: `council_event`
- supported payload classes: `message`, `conflict`, `synthesis`
- only public Supabase browser credentials are allowed in `NEXT_PUBLIC_*`; privileged keys stay server-side

Verification:
- dependency graph is locked under `dashboard/package-lock.json`
- permanent workflow `.github/workflows/dashboard-ci.yml` uses `npm ci`
- TypeScript typecheck passed
- Next.js production build passed

## Current architecture question
Topic: `open-brain-memory-retrieval-and-context-optimization`.

Goal: design a retrieval strategy for permanent PostgreSQL/Open Brain memory that minimizes context-window consumption while preserving enough relevant historical state for long multi-model council debates and development sessions.

The Council should evaluate at least:
- metadata pre-filtering before vector retrieval
- project/topic/status/time/source filters
- hybrid lexical + semantic retrieval
- top-k and diversity/MMR-style selection
- hierarchical summaries / episodic compaction
- separating authoritative decisions from historical model opinions
- recency versus semantic relevance
- token-budget-aware retrieval and packing
- deduplication / near-duplicate suppression
- progressive retrieval (small initial context, fetch-more only when needed)
- retrieval provenance and confidence
- caching reusable project context
- long-debate memory strategy so each round does not resend the full project history
- safe handling of stale, superseded, or contradictory memories

## Governance constraints
- GitHub is source of truth for current implementation state.
- Approved decisions outrank model opinions.
- Never silently promote a Council recommendation to an approved decision.
- Amir alone approves architecture decisions.
- Secrets must never be committed to source control.
- External infrastructure should remain pinned to known commits/versions.
