import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');

const schemaMarker = '        rounds: z.number().int().min(1).max(3).optional().default(1),\n';
if (!src.includes(schemaMarker)) throw new Error('Council input schema marker not found');
src = src.replace(schemaMarker, schemaMarker + '        run_id: z.string().optional().describe("Realtime run id supplied by the asynchronous council runner"),\n');

const governedCallback = '    async ({ project_slug, question, rounds, pending_action }) => {';
const plainCallback = '    async ({ project_slug, question, rounds }) => {';
if (src.includes(governedCallback)) {
  src = src.replace(governedCallback, '    async ({ project_slug, question, rounds, pending_action, run_id }) => {');
} else if (src.includes(plainCallback)) {
  src = src.replace(plainCallback, '    async ({ project_slug, question, rounds, run_id }) => {');
} else {
  throw new Error('Council callback marker not found');
}

const topicMarker = '        const topic = question || "Compare the current architecture and MVP direction, challenge weak assumptions, and converge on the strongest recommendation for Amir.";\n';
if (!src.includes(topicMarker)) throw new Error('Council topic marker not found');
src = src.replace(topicMarker, topicMarker + '        const councilRunId = String(run_id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);\n        await councilRealtimeBroadcast(councilRunId, "status", { status: "started", project_slug: safe, question: topic });\n');

const catchMarker = '      } catch (err: unknown) {\n        return { content: [{ type: "text" as const, text: "Error: " + (err as Error).message }], isError: true };\n      }';
if (!src.includes(catchMarker)) throw new Error('Council catch marker not found');
src = src.replace(catchMarker, '      } catch (err: unknown) {\n        const message = (err as Error).message;\n        const failedRunId = String(run_id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);\n        await councilRealtimeBroadcast(failedRunId, "error", { status: "error", message });\n        return { content: [{ type: "text" as const, text: "Error: " + message }], isError: true };\n      }');

fs.writeFileSync(target, src);
console.log('Finalized governed council Realtime handler');
