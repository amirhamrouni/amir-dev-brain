import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');

const marker = '  return server;\n}\n\n// --- Hono App with Auth + CORS ---';
if (!src.includes(marker)) throw new Error('Open Brain server marker not found');
if (src.includes('"capture_council_decision"')) {
  console.log('capture_council_decision already present');
  process.exit(0);
}

const injected = String.raw`
  // --- Deterministic Council Lite approval persistence ---
  // Approval must never depend on generation, metadata extraction, or embedding providers.
  server.registerTool(
    "capture_council_decision",
    {
      title: "Capture Approved Council Decision",
      description:
        "Persist an owner-approved Council Lite synthesis directly to Open Brain without invoking any generation or embedding provider.",
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
      inputSchema: {
        project: z.string().min(1),
        question: z.string().optional(),
        synthesis: z.string().min(1),
        timestamp: z.string().min(1),
        council_version: z.string().optional(),
        model: z.string().optional(),
        conflict_flags: z.array(z.string()).optional(),
      },
    },
    async ({ project, question, synthesis, timestamp, council_version, model, conflict_flags }) => {
      try {
        const approvedAt = new Date().toISOString();
        const flags = Array.isArray(conflict_flags) ? conflict_flags.filter(Boolean) : [];
        const content = [
          "# Approved Council Lite Decision",
          \`Project: ${'${project}'}\`,
          \`Generated at: ${'${timestamp}'}\`,
          "Status: approved by Amir",
          council_version ? \`Council version: ${'${council_version}'}\` : "",
          model ? \`Model: ${'${model}'}\` : "",
          "",
          question ? "## Question" : "",
          question || "",
          question ? "" : "",
          "## Synthesis",
          synthesis,
          "",
          "## Conflict Flags",
          flags.length ? flags.map((flag) => \`- ${'${flag}'}\`).join("\\n") : "- None",
        ].filter((line) => line !== "").join("\\n");

        const metadata = {
          source: "council-lite-approve",
          type: "reference",
          topics: ["council-decision", project],
          project,
          status: "approved",
          generated_at: timestamp,
          approved_at: approvedAt,
          council_version: council_version || "lite-v1",
          model: model || null,
          persistence_mode: "deterministic_no_generation",
        };

        const { data: upsertResult, error: upsertError } = await supabase.rpc("upsert_thought", {
          p_content: content,
          p_payload: { metadata },
        });

        if (upsertError) {
          return {
            content: [{ type: "text" as const, text: \`Failed to persist approved council decision: ${'${upsertError.message}'}\` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              ok: true,
              thought_id: upsertResult?.id || null,
              project,
              generated_at: timestamp,
              approved_at: approvedAt,
              persistence_mode: "deterministic_no_generation",
            }),
          }],
        };
      } catch (err: unknown) {
        return {
          content: [{ type: "text" as const, text: \`Error: ${'${(err as Error).message}'}\` }],
          isError: true,
        };
      }
    }
  );

`;

src = src.replace(marker, injected + marker);
fs.writeFileSync(target, src);
console.log('Patched Open Brain MCP with deterministic Council Lite approval persistence');
