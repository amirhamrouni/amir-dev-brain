# ECC Amir Bridge

Purpose: make Everything Claude Code (ECC) engineering discipline the default workflow layer for Amir Dev Brain without copying the entire upstream repository into every project.

Upstream reference: `affaan-m/ECC`.

## Mandatory workflow

For any material coding task, execute this sequence in order:

1. **Context & Source of Truth**
   - Read `PROJECTS.md`, `AI_CONTEXT.md`, `protocol/DEVELOPMENT_SYSTEM.md`, the matching project memory, and approved decisions.
   - Inspect the real target repository, branch, latest commit, open PRs/issues, CI, deploy/release state.
   - Never treat stale memory as current implementation state.

2. **Plan**
   - State the smallest safe implementation plan.
   - Identify assumptions, touched files, risks, tests, rollback path.
   - Prefer minimal architecture change unless the requirement needs more.

3. **Test First / Verification Contract**
   - For bug fixes: reproduce or define a failing check first when practical.
   - For features: define acceptance tests before implementation.
   - Do not mark work complete without executable verification evidence.

4. **Implement**
   - Change only what is necessary.
   - Preserve existing architecture and Amir UI/System decisions unless explicitly superseded.
   - No placeholders, fake production data, disabled errors, silent catch blocks, or hard-coded secrets.

5. **Review**
   - Review the diff for correctness, regressions, architecture drift, duplication, dead code, and dependency risk.
   - Resolve build/lint/type errors instead of bypassing them.

6. **Security**
   - Check auth/authz boundaries, secret handling, injection paths, unsafe deserialization, path traversal, SSRF, insecure network use, exposed debug endpoints, and dependency changes relevant to the stack.
   - Never expose or commit credentials.

7. **Verify**
   - Run the strongest available applicable checks: build, typecheck, lint, unit/integration/UI tests, security scan, package audit, deployment smoke test.
   - A green compile alone is not a release gate if runtime behavior changed.

8. **Remember**
   - After a material verified milestone, update the project memory with only verified facts: commit SHA, test/CI result, deploy/release state, remaining gaps.
   - Opinions stay opinions until Amir approves them.

## Fail-closed rules

- If repository state cannot be verified, do not claim completion.
- If tests are unavailable, explicitly report the verification gap.
- If a destructive migration or security-sensitive change is required, require explicit approval before execution.
- If a requirement conflicts with an approved decision, surface the conflict instead of silently overriding it.

## ECC capability mapping

Use ECC concepts selectively by task rather than loading everything into context:

- Planning / architecture -> planner discipline
- Bug fixing -> reproduce -> fix -> regression test
- Build failures -> build-error resolver discipline
- Feature work -> TDD/acceptance-test discipline
- Pull requests -> code-review discipline
- Auth/data/network/dependency changes -> security-review discipline
- Release work -> verification/release gate
- Repeated project work -> memory/continuous-learning discipline

## Definition of done

A task is done only when:

- requested behavior is implemented,
- relevant checks pass,
- no known critical regression remains,
- deployment/runtime is verified when applicable,
- final response separates VERIFIED / GAP / NEXT ACTION,
- project memory is updated for material milestones.

This bridge is the default engineering policy for Amir Dev Brain projects unless Amir explicitly overrides it for a task.
