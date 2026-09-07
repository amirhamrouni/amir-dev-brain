import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');
const marker = '  return server;\n}\n\n// --- Hono App with Auth + CORS ---';
if (!src.includes(marker)) throw new Error('ST-003 patch marker not found');

const injected = String.raw`
  // --- ST-003: governed Open Brain context retrieval ---
  function st003NormalizeTopics(metadata: Record<string, unknown> | null | undefined): string[] {
    const topics = Array.isArray((metadata as any)?.topics) ? (metadata as any).topics : [];
    return Array.from(new Set(topics.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean)));
  }

  function st003IsDecisionLike(t: any): boolean {
    const m = t?.metadata || {};
    const authority = String(m.authority_level || '').toLowerCase();
    const type = String(m.thought_type || m.type || '').toLowerCase();
    const content = String(t?.content || '').toLowerCase();
    return authority === 'approved_decision' || authority === 'council_recommendation' ||
      ['decision', 'approved_decision', 'debate_synthesis'].includes(type) ||
      content.includes('approved decision') || content.includes('council recommendation');
  }

  function st003BelongsToProject(t: any, projectSlug: string): boolean {
    const safe = projectSlug.toLowerCase();
    const m = t?.metadata || {};
    if (String(m.project || '').toLowerCase() === safe) return true;
    if (st003NormalizeTopics(m).includes(safe)) return true;
    return String(t?.content || '').toLowerCase().includes(safe);
  }

  async function st003LoadThought(id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('thoughts')
      .select('id, content, metadata, created_at, updated_at, superseded_by')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error('ST-003 thought load failed: ' + error.message);
    return data || null;
  }

  async function st003ResolveLatest(match: any): Promise<any> {
    let current = await st003LoadThought(match.id) || match;
    const originalId = match.id;
    const visited = new Set<string>();
    while (current?.superseded_by) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      const next = await st003LoadThought(String(current.superseded_by));
      if (!next) break;
      current = next;
    }
    return {
      ...current,
      similarity: Math.max(Number(match.similarity || 0), Number(current?.similarity || 0)),
      replaced_match_id: current.id !== originalId ? originalId : undefined,
    };
  }

  function st003ApplyConflictFlags(thoughts: any[]): any[] {
    const topicToIds = new Map<string, string[]>();
    for (const t of thoughts) {
      if (!st003IsDecisionLike(t)) continue;
      for (const topic of st003NormalizeTopics(t.metadata)) {
        const ids = topicToIds.get(topic) || [];
        ids.push(String(t.id));
        topicToIds.set(topic, ids);
      }
    }
    const conflicts = new Map<string, Set<string>>();
    for (const [topic, ids] of topicToIds.entries()) {
      const unique = Array.from(new Set(ids));
      if (unique.length < 2) continue;
      for (const id of unique) {
        const set = conflicts.get(id) || new Set<string>();
        set.add(topic);
        conflicts.set(id, set);
      }
    }
    return thoughts.map((t) => {
      const topics = Array.from(conflicts.get(String(t.id)) || []);
      if (!topics.length) return { ...t, conflict_topics: [] };
      return {
        ...t,
        conflict_topics: topics,
        content: '[CONFLICT_FLAG topics=' + topics.join(',') + ']\n' + t.content,
      };
    });
  }

  async function retrieveSt003Context(query: string, projectSlug: string, limit = 8): Promise<string> {
    const qEmb = await getEmbedding(query);
    const { data, error } = await supabase.rpc('match_thoughts', {
      query_embedding: qEmb,
      match_threshold: 0.45,
      match_count: Math.max(limit * 3, 12),
      filter: {},
    });
    if (error) throw new Error('ST-003 retrieval failed: ' + error.message);

    const resolvedById = new Map<string, any>();
    for (const match of (data || [])) {
      const latest = await st003ResolveLatest(match);
      if (!st003BelongsToProject(latest, projectSlug)) continue;
      const existing = resolvedById.get(String(latest.id));
      if (!existing || Number(latest.similarity || 0) > Number(existing.similarity || 0)) {
        resolvedById.set(String(latest.id), latest);
      }
    }

    const active = Array.from(resolvedById.values())
      .sort((a, b) => Number(b.similarity || 0) - Number(a.similarity || 0))
      .slice(0, limit);
    const flagged = st003ApplyConflictFlags(active);
    if (!flagged.length) return 'No governed Open Brain memories matched this project/topic.';

    return flagged.map((t, i) => {
      const topics = st003NormalizeTopics(t.metadata);
      const provenance = [
        'thought_id=' + t.id,
        'similarity=' + Number(t.similarity || 0).toFixed(3),
        'topics=' + (topics.join(',') || 'none'),
        t.replaced_match_id ? 'supersedes_match=' + t.replaced_match_id : '',
      ].filter(Boolean).join(' | ');
      return '--- Memory ' + (i + 1) + ' ---\n' + provenance + '\n' + t.content;
    }).join('\n\n');
  }

  server.registerTool(
    'amir_retrieve_memory_context',
    {
      title: 'Retrieve Governed Amir Memory Context',
      description: 'ST-003 retrieval: resolve superseded thoughts to their latest replacement, keep unresolved same-topic decisions with CONFLICT_FLAG, and return compact project-scoped context.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        project_slug: z.string(),
        query: z.string(),
        limit: z.number().int().min(1).max(20).optional().default(8),
      },
    },
    async ({ project_slug, query, limit }) => {
      try {
        const safe = project_slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
        const text = await retrieveSt003Context(query, safe, limit);
        return { content: [{ type: 'text' as const, text }] };
      } catch (err: unknown) {
        return { content: [{ type: 'text' as const, text: 'Error: ' + (err as Error).message }], isError: true };
      }
    }
  );

`;

src = src.replace(marker, injected + marker);

const topicNeedle = '        const topic = question || "Compare the current architecture and MVP direction, challenge weak assumptions, and converge on the strongest recommendation for Amir.";\n        const baseContext = [';
const topicReplacement = '        const topic = question || "Compare the current architecture and MVP direction, challenge weak assumptions, and converge on the strongest recommendation for Amir.";\n        const openBrainMemory = await retrieveSt003Context(topic, safe, 8);\n        const baseContext = [\n          "OPEN_BRAIN_RETRIEVED_MEMORY:\\n" + openBrainMemory,';
if (!src.includes(topicNeedle)) throw new Error('ST-003 council context hook not found');
src = src.replace(topicNeedle, topicReplacement);

fs.writeFileSync(target, src);
console.log('Patched Open Brain MCP with ST-003 governed retrieval and council context');
