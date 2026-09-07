import test from 'node:test';
import assert from 'node:assert/strict';
import { applyConflictFlags, resolveSupersededMatches } from '../scripts/st003-retrieval-core.mjs';

test('resolveSupersededMatches replaces stale thoughts with latest thought', () => {
  const matches = [{ id: 'old', content: 'old decision', metadata: { topics: ['memory'] }, similarity: 0.91 }];
  const records = new Map([
    ['old', { id: 'old', content: 'old decision', metadata: { topics: ['memory'] }, superseded_by: 'new' }],
    ['new', { id: 'new', content: 'new decision', metadata: { topics: ['memory'] }, superseded_by: null }],
  ]);
  const out = resolveSupersededMatches(matches, records);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'new');
  assert.equal(out[0].content, 'new decision');
  assert.equal(out[0].replaced_match_id, 'old');
  assert.equal(out[0].similarity, 0.91);
});

test('resolveSupersededMatches follows multi-hop supersession and deduplicates latest result', () => {
  const matches = [
    { id: 'v1', content: 'v1', metadata: { topics: ['memory'] }, similarity: 0.7 },
    { id: 'v2', content: 'v2', metadata: { topics: ['memory'] }, similarity: 0.8 },
  ];
  const records = new Map([
    ['v1', { id: 'v1', content: 'v1', metadata: { topics: ['memory'] }, superseded_by: 'v2' }],
    ['v2', { id: 'v2', content: 'v2', metadata: { topics: ['memory'] }, superseded_by: 'v3' }],
    ['v3', { id: 'v3', content: 'v3', metadata: { topics: ['memory'] }, superseded_by: null }],
  ]);
  const out = resolveSupersededMatches(matches, records);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'v3');
  assert.equal(out[0].similarity, 0.8);
});

test('applyConflictFlags marks decision-like thoughts sharing a topic', () => {
  const thoughts = [
    { id: 'a', content: 'APPROVED DECISION A', metadata: { topics: ['retrieval'], authority_level: 'approved_decision' } },
    { id: 'b', content: 'Council Recommendation B', metadata: { topics: ['retrieval'], authority_level: 'council_recommendation' } },
    { id: 'c', content: 'ordinary note', metadata: { topics: ['retrieval'], type: 'observation' } },
  ];
  const out = applyConflictFlags(thoughts);
  assert.match(out[0].content, /^\[CONFLICT_FLAG topics=retrieval\]/);
  assert.match(out[1].content, /^\[CONFLICT_FLAG topics=retrieval\]/);
  assert.equal(out[2].content, 'ordinary note');
});
