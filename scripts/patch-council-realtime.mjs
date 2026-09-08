import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');

const registerMarker = '  server.registerTool(\n    "amir_council_debate",';
if (!src.includes(registerMarker)) throw new Error('Council register marker not found');

const helper = String.raw`
  async function councilRealtimeBroadcast(runId: string, event: string, payload: Record<string, unknown>) {
    if (!runId) return;
    const channel = supabase.channel("council:" + runId, {
      config: { broadcast: { ack: true } },
    });
    try {
      await channel.send({ type: "broadcast", event, payload: { run_id: runId, ...payload } });
    } catch (error) {
      console.warn("Council Realtime broadcast failed", event, String((error as Error)?.message || error));
    } finally {
      await supabase.removeChannel(channel).catch(() => undefined);
    }
  }

`;
src = src.replace(registerMarker, helper + registerMarker);

const schemaMarker = '        rounds: z.number().int().min(1).max(3).optional().default(1),\n';
if (!src.includes(schemaMarker)) throw new Error('Council input schema marker not found');
src = src.replace(schemaMarker, schemaMarker + '        run_id: z.string().optional().describe("Realtime run id supplied by the asynchronous council runner"),\n');

const callbackMarker = '    async ({ project_slug, question, rounds }) => {';
if (!src.includes(callbackMarker)) throw new Error('Council callback marker not found');
src = src.replace(callbackMarker, '    async ({ project_slug, question, rounds, run_id }) => {');

const topicMarker = '        const topic = question || "Compare the current architecture and MVP direction, challenge weak assumptions, and converge on the strongest recommendation for Amir.";\n';
if (!src.includes(topicMarker)) throw new Error('Council topic marker not found');
src = src.replace(topicMarker, topicMarker + '        const councilRunId = String(run_id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);\n        await councilRealtimeBroadcast(councilRunId, "status", { status: "started", project_slug: safe, question: topic });\n');

function addBroadcastAfter(exact, eventExpr, textExpr) {
  if (!src.includes(exact)) throw new Error('Realtime patch marker not found: ' + exact.slice(0, 80));
  src = src.replace(exact, exact + `\n        await councilRealtimeBroadcast(councilRunId, "transcript", { stage: ${eventExpr}, text: ${textExpr} });`);
}

addBroadcastAfter(
  '        transcript.push("## Gemini Round 1 (" + g1.model + ")\\n" + g1.text);',
  '"gemini-1"',
  '"## Gemini Round 1 (" + g1.model + ")\\n" + g1.text'
);

addBroadcastAfter(
  '          transcript.push("## OpenAI Round " + i + " (" + o.model + ")\\n" + o.text);',
  '"openai-" + i',
  '"## OpenAI Round " + i + " (" + o.model + ")\\n" + o.text'
);

addBroadcastAfter(
  '            transcript.push("## Gemini Round " + (i + 1) + " (" + g.model + ")\\n" + g.text);',
  '"gemini-" + (i + 1)',
  '"## Gemini Round " + (i + 1) + " (" + g.model + ")\\n" + g.text'
);

addBroadcastAfter(
  '        transcript.push("## Council Synthesis (" + synthesis.model + ")\\n" + synthesis.text);',
  '"synthesis"',
  '"## Council Synthesis (" + synthesis.model + ")\\n" + synthesis.text'
);

const doneMarker = '        const thoughtId = await saveCouncilThought(record, safe);\n        return { content: [{ type: "text" as const, text: record + "\\n\\nSaved to Open Brain thought: " + thoughtId }] };';
if (!src.includes(doneMarker)) throw new Error('Council completion marker not found');
src = src.replace(doneMarker, '        const thoughtId = await saveCouncilThought(record, safe);\n        await councilRealtimeBroadcast(councilRunId, "done", { status: "completed", thought_id: thoughtId });\n        return { content: [{ type: "text" as const, text: record + "\\n\\nSaved to Open Brain thought: " + thoughtId }] };');

const catchMarker = '      } catch (err: unknown) {\n        return { content: [{ type: "text" as const, text: "Error: " + (err as Error).message }], isError: true };\n      }';
if (!src.includes(catchMarker)) throw new Error('Council catch marker not found');
src = src.replace(catchMarker, '      } catch (err: unknown) {\n        const message = (err as Error).message;\n        const failedRunId = String(run_id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);\n        await councilRealtimeBroadcast(failedRunId, "error", { status: "error", message });\n        return { content: [{ type: "text" as const, text: "Error: " + message }], isError: true };\n      }');

fs.writeFileSync(target, src);
console.log('Patched council orchestration with Supabase Realtime broadcasts');
