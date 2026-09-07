import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyConflictFlags,
  matchesLanguageNamespace,
  normalizeTargetLanguage,
  resolveSupersededMatches,
} from '../scripts/st003-retrieval-core.mjs';

test('normalizeTargetLanguage normalizes case and underscore separators', () => {
  assert.equal(normalizeTargetLanguage(' EN_us '), 'en-us');
  assert.equal(normalizeTargetLanguage(''), null);
});

test('language namespace blocks other and legacy languages before semantic ranking', () => {
  const options = { targetLanguage: 'en', memoryScope: 'english-twin', crossLanguage: false };
  assert.equal(matchesLanguageNamespace({ target_language: 'en', memory_scope: 'english-twin', cross_language: false }, options), true);
  assert.equal(matchesLanguageNamespace({ target_language: 'nl', memory_scope: 'english-twin', cross_language: false }, options), false);
  assert.equal(matchesLanguageNamespace({ target_language: null, memory_scope: 'english-twin', cross_language: false }, options), false);
  assert.equal(matchesLanguageNamespace({ target_language: 'en', memory_scope: 'other', cross_language: false }, options), false);
});

test('cross-language memory requires explicit opt-in from stored thought and caller', () => {
  const thought = { target_language: 'nl', memory_scope: 'english-twin', cross_language: true };
  assert.equal(matchesLanguageNamespace(thought, { targetLanguage: 'en', memoryScope: 'english-twin', crossLanguage: false }), false);
  assert.equal(matchesLanguageNamespace(thought, { targetLanguage: 'en', memoryScope: 'english-twin', crossLanguage: true }), true);
  assert.equal(matchesLanguageNamespace({ ...thought, cross_language: false }, { targetLanguage: 'en', memoryScope: 'english-twin', crossLanguage: true }), false);
});

test('unscoped retrieval preserves legacy behavior', () => {
  assert.equal(matchesLanguageNamespace({ target_language: null, memory_scope: 'global' }, {}), true);
  assert.equal(matchesLanguageNamespace({ target_language: 'fr', memory_scope: 'global' }, {}), true);
});

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
