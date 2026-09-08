# ADB-002 — Council Lite Runtime Architecture

- Status: approved
- Scope: Amir Dev Brain / Council UI runtime
- Authority: Amir
- Decision date: 2026-09-08

## Approved decision

Council Lite is the default user-facing council runtime.

1. The council runs through a dedicated Next.js Route Handler at `dashboard/app/api/council/run/route.ts`.
2. The Route Handler calls Google Gemini directly through Google AI Studio. Open Brain, Supabase Edge Functions, MCP orchestration, OpenRouter and other generation adapters are not in the council generation critical path.
3. The council uses fixed sequential prompt chaining:
   - Architect proposes the solution.
   - Critic receives the user question plus Architect output and marks material objections with `[CONFLICT_FLAG]`.
   - Engineer receives Architect + Critic and turns the debate into concrete technical execution.
   - Judge receives all prior outputs and produces the final `Synthesis`.
4. The frontend consumes a live text stream from `/api/council/run` and updates each role card while text is being generated.
5. Open Brain is isolated to the explicit `[Approve]` action. Approval persists a structured `CouncilDecision` containing the question, role responses, conflict flags, synthesis and timestamp.
6. Failure to persist an approved decision must never invalidate, erase, or block the completed Council Lite result in the UI.
7. The Next.js runtime is dynamic, not static-export-only. The council route uses `dynamic = 'force-dynamic'` and `maxDuration = 60`.

## Architectural intent

Prioritize a short, observable, debuggable critical path that produces a working council in the user interface. Additional providers, durable background orchestration, or richer Open Brain retrieval may be added later behind explicit boundaries, but must not be required for the base Council Lite interaction.
