import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');

const oldFn = `  async function st003LoadThought(id: string): Promise<any | null> {\n    const { data, error } = await supabase\n      .from('thoughts')\n      .select('id, content, metadata, created_at, updated_at, superseded_by, conflict_source, resolution_status, blocked_action')\n      .eq('id', id)\n      .maybeSingle();\n    if (error) throw new Error('ST-003 thought load failed: ' + error.message);\n    return data || null;\n  }`;

if (!src.includes(oldFn)) {
  throw new Error('ST-004 metadata-cache hook not found');
}

const newFn = `  async function st004ReadCachedMetadata(id: string): Promise<Record<string, unknown> | null> {\n    const { data, error } = await supabase\n      .from('open_brain_metadata_cache')\n      .select('metadata')\n      .eq('thought_id', id)\n      .maybeSingle();\n    if (error) throw new Error('ST-004 metadata cache read failed: ' + error.message);\n    return (data?.metadata as Record<string, unknown> | undefined) || null;\n  }\n\n  async function st004WriteCachedMetadata(id: string, metadata: Record<string, unknown>): Promise<void> {\n    const { error } = await supabase\n      .from('open_brain_metadata_cache')\n      .upsert({ thought_id: id, metadata, cached_at: new Date().toISOString() }, { onConflict: 'thought_id' });\n    if (error) throw new Error('ST-004 metadata cache write failed: ' + error.message);\n  }\n\n  async function st003LoadThought(id: string): Promise<any | null> {\n    const cachedMetadata = await st004ReadCachedMetadata(id);\n    const columns = cachedMetadata\n      ? 'id, content, created_at, updated_at, superseded_by, conflict_source, resolution_status, blocked_action'\n      : 'id, content, metadata, created_at, updated_at, superseded_by, conflict_source, resolution_status, blocked_action';\n    const { data, error } = await supabase\n      .from('thoughts')\n      .select(columns)\n      .eq('id', id)\n      .maybeSingle();\n    if (error) throw new Error('ST-003 thought load failed: ' + error.message);\n    if (!data) return null;\n    if (cachedMetadata) return { ...data, metadata: cachedMetadata };\n    const metadata = ((data as any).metadata || {}) as Record<string, unknown>;\n    await st004WriteCachedMetadata(String((data as any).id), metadata);\n    return data;\n  }`;

src = src.replace(oldFn, newFn);
fs.writeFileSync(target, src);
console.log('Patched Open Brain MCP to use ST-004 metadata cache in retrieval reads');
