export function normalizeTopics(metadata = {}) {
  const topics = Array.isArray(metadata?.topics) ? metadata.topics : [];
  return [...new Set(topics.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
}

export function isDecisionLike(thought) {
  const m = thought?.metadata || {};
  const authority = String(m.authority_level || '').toLowerCase();
  const type = String(m.thought_type || m.type || '').toLowerCase();
  const content = String(thought?.content || '').toLowerCase();
  return authority === 'approved_decision' || authority === 'council_recommendation' ||
    ['decision', 'approved_decision', 'debate_synthesis'].includes(type) ||
    content.includes('approved decision') || content.includes('council recommendation');
}

export function resolveSupersededMatches(matches, recordsById) {
  const resolved = [];
  const seenOutput = new Map();

  for (const match of matches || []) {
    let currentId = match.id;
    let current = recordsById.get(currentId) || match;
    const visited = new Set();

    while (current?.superseded_by) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const nextId = current.superseded_by;
      const next = recordsById.get(nextId);
      if (!next) break;
      currentId = nextId;
      current = next;
    }

    const out = {
      ...current,
      similarity: Math.max(Number(match.similarity || 0), Number(current?.similarity || 0)),
      replaced_match_id: currentId !== match.id ? match.id : undefined,
    };

    const existing = seenOutput.get(currentId);
    if (!existing || out.similarity > existing.similarity) seenOutput.set(currentId, out);
  }

  for (const value of seenOutput.values()) resolved.push(value);
  return resolved;
}

export function applyConflictFlags(thoughts) {
  const topicToIds = new Map();
  for (const t of thoughts || []) {
    if (!isDecisionLike(t)) continue;
    for (const topic of normalizeTopics(t.metadata)) {
      if (!topicToIds.has(topic)) topicToIds.set(topic, []);
      topicToIds.get(topic).push(t.id);
    }
  }

  const conflictsById = new Map();
  for (const [topic, ids] of topicToIds.entries()) {
    const unique = [...new Set(ids)];
    if (unique.length < 2) continue;
    for (const id of unique) {
      if (!conflictsById.has(id)) conflictsById.set(id, new Set());
      conflictsById.get(id).add(topic);
    }
  }

  return (thoughts || []).map((t) => {
    const topics = [...(conflictsById.get(t.id) || [])];
    if (!topics.length) return { ...t, conflict_topics: [] };
    const flag = `[CONFLICT_FLAG topics=${topics.join(',')}]`;
    return {
      ...t,
      conflict_topics: topics,
      content: `${flag}\n${t.content}`,
    };
  });
}
