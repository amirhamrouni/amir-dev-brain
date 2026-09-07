import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');
const marker = '  return server;\n}\n\n// --- Hono App with Auth + CORS ---';
if (!src.includes(marker)) throw new Error('ST-004 patch marker not found');

// ST-003 may add namespace columns. Append the ST-004 governance columns to the
// st003LoadThought select without assuming the exact ST-003 column list.
const loadSelectPattern = /(async function st003LoadThought[\s\S]*?\.from\('thoughts'\)\n\s*\.select\(')([^']+)('\))/;
const loadSelectMatch = src.match(loadSelectPattern);
if (!loadSelectMatch) throw new Error('ST-004 st003LoadThought select hook not found');
const requiredColumns = ['conflict_source', 'resolution_status', 'blocked_action'];
const currentColumns = loadSelectMatch[2].split(',').map((v) => v.trim()).filter(Boolean);
for (const column of requiredColumns) {
  if (!currentColumns.includes(column)) currentColumns.push(column);
}
src = src.replace(loadSelectPattern, `$1${currentColumns.join(', ')}$3`);

const injected = String.raw`
  // --- ST-004: deterministic Dev Brain conflict resolution ---
  type St004Action = {
    type?: string;
    target?: string;
    pinned_ref?: boolean;
    scope?: string;
  };

  type St004Violation = { decision_id: string; reason: string };

  function st004ApprovedIds(approvedText: string): Set<string> {
    const ids = new Set<string>();
    for (const id of ['AD-006', 'AD-007', 'AD-008', 'ST-003', 'ST-004']) {
      if (approvedText.includes(id)) ids.add(id);
    }
    return ids;
  }

  function st004EvaluateAction(action: St004Action | null | undefined, approvedText: string) {
    const approved = st004ApprovedIds(approvedText);
    const actionType = String(action?.type || '').toLowerCase();
    const violations: St004Violation[] = [];

    if (approved.has('AD-006') && actionType === 'commit_secret') {
      violations.push({ decision_id: 'AD-006', reason: 'Secrets may never be committed to source control.' });
    }
    if (approved.has('AD-007') && actionType === 'write_memory_backend' && String(action?.target || '').toLowerCase() !== 'open-brain') {
      violations.push({ decision_id: 'AD-007', reason: 'Open Brain is the only approved canonical persistent memory backend.' });
    }
    if (approved.has('AD-008') && actionType === 'deploy_external_infrastructure' && action?.pinned_ref !== true) {
      violations.push({ decision_id: 'AD-008', reason: 'External infrastructure must use an explicitly pinned version or commit.' });
    }
    if (approved.has('ST-003') && actionType === 'cache_memory' && String(action?.scope || '').toLowerCase() !== 'metadata') {
      violations.push({ decision_id: 'ST-003', reason: 'Open Brain cache scope is currently limited to metadata.' });
    }

    return { blocked_action: violations.length > 0, violations };
  }

  function st004ConflictDetected(contextText: string): boolean {
    return contextText.includes('[CONFLICT_FLAG');
  }

  function st004FailFastDecision(contextText: string, action: St004Action | null | undefined, approvedText: string) {
    const evaluation = st004EvaluateAction(action, approvedText);
    return {
      ...evaluation,
      conflict_detected: st004ConflictDetected(contextText),
      fail_fast: st004ConflictDetected(contextText) && evaluation.blocked_action,
    };
  }

  server.registerTool(
    'amir_governance_preflight',
    {
      title: 'Amir Deterministic Governance Preflight',
      description: 'ST-004 deterministic preflight. Informational conflicts continue with Flag & Include. Fail-fast occurs only when a pending executable action matches an explicit approved-decision prohibition.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        project_slug: z.string(),
        context: z.string(),
        action: z.object({
          type: z.string(),
          target: z.string().optional(),
          pinned_ref: z.boolean().optional(),
          scope: z.string().optional(),
        }),
      },
    },
    async ({ project_slug, context, action }) => {
      try {
        const approved = await fetchText(AMIR_BRAIN_RAW + '/decisions/APPROVED_DECISIONS.md');
        const result = st004FailFastDecision(context, action, approved);
        const safeProject = project_slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (result.fail_fast) {
          return {
            content: [{
              type: 'text' as const,
              text: '[FAIL_FAST][AMIR_INTERVENTION_REQUIRED] project=' + safeProject + '\n' + JSON.stringify(result),
            }],
            isError: true,
          };
        }
        return {
          content: [{
            type: 'text' as const,
            text: '[CONTINUE_FLAG_AND_INCLUDE] project=' + safeProject + '\n' + JSON.stringify(result),
          }],
        };
      } catch (err: unknown) {
        return { content: [{ type: 'text' as const, text: 'Error: ' + (err as Error).message }], isError: true };
      }
    }
  );

`;

src = src.replace(marker, injected + marker);

const roundsSchema = '        rounds: z.number().int().min(1).max(3).optional().default(1),';
if (!src.includes(roundsSchema)) throw new Error('ST-004 council rounds schema hook not found');
src = src.replace(
  roundsSchema,
  roundsSchema + `\n        pending_action: z.object({\n          type: z.string(),\n          target: z.string().optional(),\n          pinned_ref: z.boolean().optional(),\n          scope: z.string().optional(),\n        }).optional(),`,
);

const handlerNeedle = '    async ({ project_slug, question, rounds }) => {';
if (!src.includes(handlerNeedle)) throw new Error('ST-004 council handler hook not found');
src = src.replace(handlerNeedle, '    async ({ project_slug, question, rounds, pending_action }) => {');

const memoryNeedle = '        const openBrainMemory = await retrieveSt003Context(topic, safe, 8);';
if (!src.includes(memoryNeedle)) throw new Error('ST-004 retrieved-memory hook not found');
src = src.replace(
  memoryNeedle,
  memoryNeedle + `\n        const governance = st004FailFastDecision(openBrainMemory, pending_action, approved);\n        if (governance.fail_fast) {\n          return { content: [{ type: 'text' as const, text: '[FAIL_FAST][AMIR_INTERVENTION_REQUIRED] ' + JSON.stringify(governance) }], isError: true };\n        }`,
);

fs.writeFileSync(target, src);
console.log('Patched Open Brain MCP with ST-004 deterministic conflict resolution and namespaced thought fields');
