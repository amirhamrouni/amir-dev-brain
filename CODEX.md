# Codex Instructions — Amir Dev Brain

Before any project task:
1. Read `PROJECTS.md`.
2. Read `AI_CONTEXT.md`.
3. Read `protocol/DEVELOPMENT_SYSTEM.md`.
4. Read `protocol/ECC_AMIR_BRIDGE.md`.
5. Read the matching `projects/*.md` file.
6. Read applicable entries from `decisions/APPROVED_DECISIONS.md`.
7. Inspect the actual target GitHub repository and verify current state.

Execution contract:
- Continue from existing implementation; do not restart unless Amir explicitly requests it.
- Apply ECC-Amir workflow: context -> plan -> test contract -> implement -> review -> security -> verify -> remember.
- Use the shared Amir UI/System for product/UI work unless an approved decision supersedes it.
- GitHub is the source of truth for code, commits, CI, releases and deployment history.
- Historical context is not current fact until verified.
- Reproduce bugs or define a failing check before fixing when practical.
- Define acceptance criteria before material feature implementation.
- Resolve build/lint/type/test failures; do not bypass them to manufacture a green result.
- For auth, data, network or dependency changes, perform a security review before completion.
- For runtime/deployment changes, perform a smoke test against the deployed target when possible.
- Codex recommendations remain model opinions unless Amir approves them.
- Record Codex opinions under `council/codex-opinions.md`.
- Never commit secrets or credentials.
- After a material verified milestone, update the relevant project memory record with commit SHA, verification evidence, deployment state and remaining gaps.

Definition of done:
- Requested behavior implemented.
- Relevant verification checks pass.
- No known critical regression remains.
- Deployment/runtime verified when applicable.
- Final status distinguishes VERIFIED / GAP / NEXT ACTION.
