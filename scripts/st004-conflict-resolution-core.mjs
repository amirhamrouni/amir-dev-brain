export const ACTION_RULES = Object.freeze([
  {
    decisionId: 'AD-006',
    actionType: 'commit_secret',
    matches: () => true,
    reason: 'AD-006 forbids committing secrets to source control.',
  },
  {
    decisionId: 'AD-007',
    actionType: 'write_memory_backend',
    matches: (action) => String(action?.target || '').toLowerCase() !== 'open-brain',
    reason: 'AD-007 allows only Open Brain as the canonical persistent memory backend.',
  },
  {
    decisionId: 'AD-008',
    actionType: 'deploy_external_infrastructure',
    matches: (action) => action?.pinned_ref !== true,
    reason: 'AD-008 requires external infrastructure dependencies to be pinned.',
  },
  {
    decisionId: 'ST-003',
    actionType: 'cache_memory',
    matches: (action) => String(action?.scope || '').toLowerCase() !== 'metadata',
    reason: 'ST-003 limits cache scope to metadata only.',
  },
]);

export function evaluateDeterministicAction(action = {}, approvedDecisionIds = []) {
  const approved = new Set((approvedDecisionIds || []).map((id) => String(id).toUpperCase()));
  const actionType = String(action?.type || '').toLowerCase();
  const violations = [];

  for (const rule of ACTION_RULES) {
    if (rule.actionType !== actionType) continue;
    if (!approved.has(rule.decisionId)) continue;
    if (!rule.matches(action)) continue;
    violations.push({ decision_id: rule.decisionId, reason: rule.reason });
  }

  return {
    blocked_action: violations.length > 0,
    violations,
  };
}

export function shouldFailFast({ conflictDetected = false, action = {}, approvedDecisionIds = [] } = {}) {
  const evaluation = evaluateDeterministicAction(action, approvedDecisionIds);
  return {
    ...evaluation,
    fail_fast: Boolean(conflictDetected && evaluation.blocked_action),
  };
}

export function metadataCacheInvalidationRequired(before = {}, after = {}) {
  return String(before?.superseded_by || '') !== String(after?.superseded_by || '') ||
    String(before?.resolution_status || '') !== String(after?.resolution_status || '');
}
