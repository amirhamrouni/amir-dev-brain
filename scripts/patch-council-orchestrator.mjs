import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');
const marker = '  return server;\n}\n\n// --- Hono App with Auth + CORS ---';
if (!src.includes(marker)) throw new Error('OB1 council patch marker not found');

const injected = String.raw`
  // --- Autonomous Amir AI Council orchestrator ---
  // GenerationAdapter: OpenRouter key rotation -> direct Google AI Studio fallback.
  // Compatible with the existing single-key secrets and optional comma-separated key pools.
  function generationAdapterKeys(poolName: string, singleName: string): string[] {
    const pooled = String(Deno.env.get(poolName) || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const single = String(Deno.env.get(singleName) || '').trim();
    return Array.from(new Set([...pooled, ...(single ? [single] : [])]));
  }

  function generationAdapterError(provider: string, model: string, status: number, body: string): string {
    const compact = body.replace(/\s+/g, ' ').slice(0, 280);
    return provider + '/' + model + ': HTTP ' + status + (compact ? ' ' + compact : '');
  }

  async function generationAdapterOpenRouter(
    models: string[],
    messages: Array<{role: string; content: string}>,
  ): Promise<{model: string; text: string} | null> {
    const keys = generationAdapterKeys('OPENROUTER_API_KEYS', 'OPENROUTER_API_KEY');
    if (!keys.length) return null;
    const errors: string[] = [];

    for (const key of keys) {
      for (const model of models) {
        try {
          const r = await fetch(OPENROUTER_BASE + "/chat/completions", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + key,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://github.com/amirhamrouni/amir-dev-brain",
              "X-Title": "Amir Dev Brain Council"
            },
            body: JSON.stringify({
              model,
              temperature: 0.2,
              max_tokens: 1200,
              messages
            })
          });
          const raw = await r.text();
          if (!r.ok) {
            errors.push(generationAdapterError('openrouter', model, r.status, raw));
            continue;
          }
          const d = JSON.parse(raw);
          const text = String(d?.choices?.[0]?.message?.content || "").trim();
          if (!text) {
            errors.push('openrouter/' + model + ': empty response');
            continue;
          }
          return { model: 'openrouter/' + model, text };
        } catch (e) {
          errors.push('openrouter/' + model + ': ' + String((e as Error).message || e));
        }
      }
    }

    if (errors.length) console.warn('GenerationAdapter OpenRouter exhausted:', errors.slice(-4).join(' | '));
    return null;
  }

  async function generationAdapterGoogle(
    messages: Array<{role: string; content: string}>,
  ): Promise<{model: string; text: string} | null> {
    const keys = generationAdapterKeys('GOOGLE_AI_STUDIO_API_KEYS', 'GEMINI_API_KEY');
    if (!keys.length) return null;

    const models = Array.from(new Set([
      String(Deno.env.get('COUNCIL_GOOGLE_MODEL') || '').trim(),
      String(Deno.env.get('GEMINI_MODEL') || '').trim(),
      'gemini-2.5-flash',
    ].filter(Boolean)));
    const prompt = messages
      .map((m) => m.role.toUpperCase() + ':\n' + m.content)
      .join('\n\n---\n\n');
    const errors: string[] = [];

    for (const key of keys) {
      for (const model of models) {
        try {
          const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
          const r = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-goog-api-key': key,
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 1800 },
            }),
          });
          const raw = await r.text();
          if (!r.ok) {
            errors.push(generationAdapterError('google-ai-studio', model, r.status, raw));
            continue;
          }
          const d = JSON.parse(raw);
          const text = String((d?.candidates?.[0]?.content?.parts || [])
            .map((p: any) => String(p?.text || ''))
            .join('\n'))
            .trim();
          if (!text) {
            errors.push('google-ai-studio/' + model + ': empty response');
            continue;
          }
          return { model: 'google-ai-studio/' + model, text };
        } catch (e) {
          errors.push('google-ai-studio/' + model + ': ' + String((e as Error).message || e));
        }
      }
    }

    if (errors.length) console.warn('GenerationAdapter Google AI Studio exhausted:', errors.slice(-4).join(' | '));
    return null;
  }

  async function councilChat(models: string[], messages: Array<{role: string; content: string}>): Promise<{model: string; text: string}> {
    const openRouter = await generationAdapterOpenRouter(models, messages);
    if (openRouter) return openRouter;

    const google = await generationAdapterGoogle(messages);
    if (google) return google;

    throw new Error('Council generation failed: all configured OpenRouter keys and Google AI Studio keys/providers were exhausted or unavailable.');
  }

  async function saveCouncilThought(content: string, projectSlug: string): Promise<string> {
    const [embedding, extracted] = await Promise.all([
      getEmbedding(content),
      extractMetadata(content),
    ]);
    const metadata = {
      ...extracted,
      source: "amir-council-orchestrator",
      type: "reference",
      topics: Array.from(new Set([
        projectSlug,
        "council-debate",
        ...((Array.isArray((extracted as any)?.topics) ? (extracted as any).topics : []))
      ]))
    };
    const { data: upsertResult, error: upsertError } = await supabase.rpc("upsert_thought", {
      p_content: content,
      p_payload: { metadata },
    });
    if (upsertError) throw new Error("Council persistence failed: " + upsertError.message);
    const thoughtId = upsertResult?.id;
    const { error: embError } = await supabase.from("thoughts").update({ embedding }).eq("id", thoughtId);
    if (embError) throw new Error("Council embedding persistence failed: " + embError.message);
    return String(thoughtId || "saved");
  }

  function compactCouncilContext(text: string, maxChars: number): string {
    if (!text) return "";
    if (text.length <= maxChars) return text;
    const head = Math.floor(maxChars * 0.65);
    const tail = maxChars - head;
    return text.slice(0, head) + "\n\n...[context compacted for council budget]...\n\n" + text.slice(-tail);
  }

  server.registerTool(
    "amir_council_debate",
    {
      title: "Run Autonomous Amir AI Council Debate",
      description: "Run a server-side architectural debate using Amir Dev Brain context and persist its synthesis to Open Brain. Generation routes across configured OpenRouter keys with direct Google AI Studio fallback.",
      annotations: { readOnlyHint: false, openWorldHint: true, destructiveHint: false, idempotentHint: false },
      inputSchema: {
        project_slug: z.string().describe("Project slug, e.g. smart-twin-hamrouni"),
        question: z.string().optional().describe("Specific decision or topic to debate; defaults to the project's current architecture/MVP direction"),
        rounds: z.number().int().min(1).max(3).optional().default(1),
      },
    },
    async ({ project_slug, question, rounds }) => {
      try {
        const safe = project_slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
        const [project, gptOpinion, geminiOpinion, approved] = await Promise.all([
          fetchText(AMIR_BRAIN_RAW + "/projects/" + safe + ".md"),
          fetchText(AMIR_BRAIN_RAW + "/council/chatgpt-opinions.md").catch(() => ""),
          fetchText(AMIR_BRAIN_RAW + "/council/gemini-opinions.md").catch(() => ""),
          fetchText(AMIR_BRAIN_RAW + "/decisions/APPROVED_DECISIONS.md").catch(() => ""),
        ]);
        const topic = question || "Compare the current architecture and MVP direction, challenge weak assumptions, and converge on the strongest recommendation for Amir.";
        const baseContext = [
          "PROJECT MEMORY:\n" + compactCouncilContext(project, 1800),
          "APPROVED DECISIONS:\n" + compactCouncilContext(approved, 900),
          "STORED GPT OPINION:\n" + compactCouncilContext(gptOpinion, 300),
          "STORED GEMINI OPINION:\n" + compactCouncilContext(geminiOpinion, 300),
          "DEBATE QUESTION:\n" + topic,
          "Rule: this is model opinion only. Never claim an Approved Decision. Amir alone approves final decisions. Keep each response concise and decision-focused."
        ].join("\n\n---\n\n");

        const geminiModels = ["google/gemini-2.5-pro"];
        const openaiModels = ["openai/gpt-5.6-luna-pro", "openai/gpt-5.5"];
        const transcript: string[] = [];

        const g1 = await councilChat(geminiModels, [
          { role: "system", content: "You are Gemini acting as an independent product architect and multi-agent systems reviewer in Amir's model council. Be concrete, critical, concise, and explicitly mark Agree / Disagree / Modify." },
          { role: "user", content: baseContext + "\n\nRound 1: critique the stored GPT opinion and your prior opinion. Identify the strongest architecture for the requested topic." }
        ]);
        transcript.push("## Gemini Round 1 (" + g1.model + ")\n" + g1.text);

        let previous = g1.text;
        for (let i = 1; i <= rounds; i++) {
          const o = await councilChat(openaiModels, [
            { role: "system", content: "You are the OpenAI side of Amir's technical model council. Defend good ideas, concede valid criticism, and improve the architecture. Be concise. Do not pretend to be the interactive ChatGPT session; you are an API council model." },
            { role: "user", content: baseContext + "\n\nGemini's latest critique:\n" + previous + "\n\nRespond point-by-point and propose modifications. Council round " + i + "." }
          ]);
          transcript.push("## OpenAI Round " + i + " (" + o.model + ")\n" + o.text);
          if (i < rounds) {
            const g = await councilChat(geminiModels, [
              { role: "system", content: "You are Gemini in Amir's model council. Review the OpenAI response, concede correct points, challenge remaining weaknesses, and narrow toward a unified recommendation. Be concise." },
              { role: "user", content: baseContext + "\n\nOpenAI response:\n" + o.text + "\n\nContinue the debate. Do not create an approved decision." }
            ]);
            transcript.push("## Gemini Round " + (i + 1) + " (" + g.model + ")\n" + g.text);
            previous = g.text;
          } else {
            previous = o.text;
          }
        }

        const synthesis = await councilChat(geminiModels, [
          { role: "system", content: "You are the final neutral synthesizer for Amir's model council. Produce a concise Council Recommendation, not an approved decision. Separate consensus, unresolved disagreements, recommended MVP, architecture, risks, and decisions that require Amir approval." },
          { role: "user", content: baseContext + "\n\nDEBATE TRANSCRIPT:\n" + transcript.join("\n\n") }
        ]);
        transcript.push("## Council Synthesis (" + synthesis.model + ")\n" + synthesis.text);

        const record = [
          "# Amir AI Council Debate",
          "Project: " + safe,
          "Date: " + new Date().toISOString(),
          "Status: model opinion / council recommendation only",
          "Question: " + topic,
          "",
          ...transcript
        ].join("\n\n");
        const thoughtId = await saveCouncilThought(record, safe);
        return { content: [{ type: "text" as const, text: record + "\n\nSaved to Open Brain thought: " + thoughtId }] };
      } catch (err: unknown) {
        return { content: [{ type: "text" as const, text: "Error: " + (err as Error).message }], isError: true };
      }
    }
  );

`;

src = src.replace(marker, injected + marker);
fs.writeFileSync(target, src);
console.log('Patched Open Brain MCP with autonomous Amir AI Council orchestrator and multi-provider GenerationAdapter');
