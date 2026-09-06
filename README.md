# Amir Dev Brain

Personal AI memory and development coordination layer built around OB1 + Supabase + ECC-style engineering workflow.

## Architecture

- **Supabase / OB1**: persistent memory and semantic retrieval
- **GitHub**: source of truth for code and deployment history
- **ECC**: planning, review, debugging, testing and release discipline
- **Model Council**: separate opinions from ChatGPT, Gemini, DeepSeek, Claude and Codex
- **Approved Decisions**: only Amir-approved decisions become authoritative project decisions

## Supabase project

Project ref: `hdcpvwsndxxflbednvsq`

## Deployment

The `open-brain-mcp` Edge Function is deployed through GitHub Actions rather than the Supabase dashboard. This avoids the dashboard deploy error encountered on mobile and gives us real deployment logs.

Required GitHub Actions secret:

- `SUPABASE_ACCESS_TOKEN`

OpenRouter and MCP access keys remain stored only in Supabase Edge Function Secrets and must never be committed to this repository.

## Workflow

1. GitHub Action downloads the current official OB1 MCP server files.
2. Supabase CLI deploys `open-brain-mcp` with `--no-verify-jwt`.
3. Deployment logs stay in GitHub Actions for troubleshooting.
4. After deployment, AI clients connect to the remote MCP endpoint.
