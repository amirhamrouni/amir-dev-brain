import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');

const registerMarker = '  server.registerTool(\n    "amir_council_debate",';
if (!src.includes(registerMarker)) throw new Error('Council register marker not found');

const helper = String.raw`
  async function councilRealtimeBroadcast(runId: string, event: string, payload: Record<string, unknown>) {
    if (!runId) return;
    const channel = supabase.channel("council:" + runId);
    try {
      // Server-side broadcasts must not depend on a WebSocket subscription owned by
      // this Edge Function. httpSend always uses Supabase's REST broadcast endpoint.
      await channel.httpSend(event, { run_id: runId, ...payload });
    } catch (error) {
      console.warn("Council Realtime broadcast failed", event, String((error as Error)?.message || error));
    } finally {
      await supabase.removeChannel(channel).catch(() => undefined);
    }
  }

`;
src = src.replace(registerMarker, helper + registerMarker);

function addBroadcastAfter(exact, eventExpr, textExpr) {
  if (!src.includes(exact)) throw new Error('Realtime pre patch marker not found: ' + exact.slice(0, 80));
  src = src.replace(exact, exact + `\n        await councilRealtimeBroadcast(councilRunId, "transcript", { stage: ${eventExpr}, text: ${textExpr} });`);
}

addBroadcastAfter(
  '        transcript.push("## Architecture Round 1 (" + g1.model + ")\\n" + g1.text);',
  '"architecture-1"',
  '"## Architecture Round 1 (" + g1.model + ")\\n" + g1.text'
);
addBroadcastAfter(
  '          transcript.push("## Engineering Round " + i + " (" + o.model + ")\\n" + o.text);',
  '"engineering-" + i',
  '"## Engineering Round " + i + " (" + o.model + ")\\n" + o.text'
);
addBroadcastAfter(
  '            transcript.push("## Architecture Round " + (i + 1) + " (" + g.model + ")\\n" + g.text);',
  '"architecture-" + (i + 1)',
  '"## Architecture Round " + (i + 1) + " (" + g.model + ")\\n" + g.text'
);
addBroadcastAfter(
  '        transcript.push("## Council Synthesis (" + synthesis.model + ")\\n" + synthesis.text);',
  '"synthesis"',
  '"## Council Synthesis (" + synthesis.model + ")\\n" + synthesis.text'
);

const doneMarker = '        const thoughtId = await saveCouncilThought(record, safe);\n        return { content: [{ type: "text" as const, text: record + "\\n\\nSaved to Open Brain thought: " + thoughtId }] };';
if (!src.includes(doneMarker)) throw new Error('Council completion marker not found');
src = src.replace(doneMarker, '        const thoughtId = await saveCouncilThought(record, safe);\n        await councilRealtimeBroadcast(councilRunId, "done", { status: "completed", thought_id: thoughtId });\n        return { content: [{ type: "text" as const, text: record + "\\n\\nSaved to Open Brain thought: " + thoughtId }] };');

fs.writeFileSync(target, src);
console.log('Patched council transcript with REST-backed Supabase Realtime broadcasts');
