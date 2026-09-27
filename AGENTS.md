# Amir Dev Brain — Agent Instructions

This repository is the shared development-memory and coordination layer for Amir Hamrouni's projects.

Before any coding, content production, automation run, or project-status claim:
1. Read `PROJECTS.md`.
2. Read `AI_CONTEXT.md`.
3. Read `memory/error-ledger.md` and apply every prevention gate relevant to the current task before acting.
4. Read `protocol/DEVELOPMENT_SYSTEM.md`.
5. Read `protocol/ECC_AMIR_BRIDGE.md` and apply it as the default engineering workflow.
6. Read `protocol/USER_CORRECTION_PROTOCOL.md` and apply Amir's latest explicit corrections before generating or modifying related work.
7. Read `rules/automation-completion-contract.md` for scheduled/manual workers.
8. Read relevant entries in `decisions/APPROVED_DECISIONS.md`.
9. Inspect the actual target repository/system and verify current branch, commit, CI/actions, destination state, deployment/release/publication state as applicable.
10. Continue from existing implementation; do not restart from scratch unless Amir explicitly asks.
11. Execute ECC-Amir discipline: context -> plan -> test contract -> implement -> review -> security -> verify -> remember.
12. Treat OB1/Open Brain as shared episodic memory, but GitHub as the source of truth for implementation state.
13. Treat model suggestions as opinions unless Amir explicitly approves them.
14. When Amir corrects wording, pronunciation, workflow, sequence, UI behavior, visual identity, account selection, publishing behavior, or any recurring task rule, propagate the correction through dependent steps and record the reusable correction in `memory/error-ledger.md` during the same task when tools permit.
15. A confirmed mistake is not learned merely because the immediate result was fixed. It is learned only after a prevention gate is written and mirrored into the relevant domain rule/state/automation where applicable.
16. Never store secrets in source control.

Completion rules:
- Never claim completion without verification evidence.
- Do not bypass failing build/lint/type/test/security/QC checks just to obtain green status.
- For runtime/deployment/publication changes, verify the real destination behavior/state when applicable.
- Final engineering/content status must distinguish VERIFIED / GAP / NEXT ACTION when that distinction is relevant.
- If an error matches an existing signature in `memory/error-ledger.md`, apply the recorded prevention gate before inventing a new workaround.

If nested memory files are inaccessible, use root-level `AI_CONTEXT.md` as fallback and verify the project directly from its repository rather than guessing. If `memory/error-ledger.md` cannot be read, fail safe on identity/publishing/irreversible actions and do not guess around known user corrections.
