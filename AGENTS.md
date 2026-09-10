# Amir Dev Brain — Agent Instructions

This repository is the shared development-memory and coordination layer for Amir Hamrouni's projects.

Before any coding or project-status claim:
1. Read `PROJECTS.md`.
2. Read `AI_CONTEXT.md`.
3. Read `protocol/DEVELOPMENT_SYSTEM.md`.
4. Read `protocol/ECC_AMIR_BRIDGE.md` and apply it as the default engineering workflow.
5. Read relevant entries in `decisions/APPROVED_DECISIONS.md`.
6. Inspect the actual target GitHub repository and verify current branch, commit, CI/actions and deployment/release state.
7. Continue from existing implementation; do not restart from scratch unless Amir explicitly asks.
8. Execute ECC-Amir discipline: context -> plan -> test contract -> implement -> review -> security -> verify -> remember.
9. Treat OB1/Open Brain as shared episodic memory, but GitHub as the source of truth for implementation state.
10. Treat model suggestions as opinions unless Amir explicitly approves them.
11. Never store secrets in source control.

Completion rules:
- Never claim completion without verification evidence.
- Do not bypass failing build/lint/type/test/security checks just to obtain green status.
- For runtime/deployment changes, verify the deployed behavior when applicable.
- Final engineering status must distinguish VERIFIED / GAP / NEXT ACTION.

If nested memory files are inaccessible, use root-level `AI_CONTEXT.md` as fallback and verify the project directly from its repository rather than guessing.
