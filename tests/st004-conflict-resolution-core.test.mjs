import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDeterministicAction,
  metadataCacheInvalidationRequired,
  shouldFailFast,
} from '../scripts/st004-conflict-resolution-core.mjs';

const approved = ['AD-006', 'AD-007', 'AD-008', 'ST-003'];

test('informational conflict continues when no executing action violates an approved decision', () => {
  const out = shouldFailFast({
    conflictDetected: true,
    action: { type: 'read_context' },
    approvedDecisionIds: approved,
  });
  assert.equal(out.blocked_action, false);
  assert.equal(out.fail_fast, false);
});

test('conflicting execution fails fast only for a deterministic approved-decision violation', () => {
  const out = shouldFailFast({
    conflictDetected: true,
    action: { type: 'write_memory_backend', target: 'second-memory-system' },
    approvedDecisionIds: approved,
  });
  assert.equal(out.blocked_action, true);
  assert.equal(out.fail_fast, true);
  assert.equal(out.violations[0].decision_id, 'AD-007');
});

test('same forbidden action is not classified as conflict fail-fast when context has no conflict flag', () => {
  const out = shouldFailFast({
    conflictDetected: false,
    action: { type: 'write_memory_backend', target: 'second-memory-system' },
    approvedDecisionIds: approved,
  });
  assert.equal(out.blocked_action, true);
  assert.equal(out.fail_fast, false);
});

test('Open Brain memory writes remain allowed by AD-007', () => {
  const out = evaluateDeterministicAction(
    { type: 'write_memory_backend', target: 'open-brain' },
    approved,
  );
  assert.equal(out.blocked_action, false);
});

test('metadata cache invalidates only on superseded_by or resolution_status mutation', () => {
  assert.equal(metadataCacheInvalidationRequired(
    { superseded_by: null, resolution_status: 'pending' },
    { superseded_by: 'new-id', resolution_status: 'pending' },
  ), true);
  assert.equal(metadataCacheInvalidationRequired(
    { superseded_by: null, resolution_status: 'pending' },
    { superseded_by: null, resolution_status: 'resolved' },
  ), true);
  assert.equal(metadataCacheInvalidationRequired(
    { superseded_by: null, resolution_status: 'pending', content: 'a' },
    { superseded_by: null, resolution_status: 'pending', content: 'b' },
  ), false);
});
