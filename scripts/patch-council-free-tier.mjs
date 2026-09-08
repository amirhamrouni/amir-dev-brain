import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');

// Keep each model turn short enough to finish comfortably inside the async worker budget.
const budgetPattern = /(\s*)max_tokens: 220,\n\1reasoning: \{ max_tokens: 40, exclude: true \},\n\1messages/;
if (!budgetPattern.test(src)) throw new Error('Free-tier council budget marker not found');
src = src.replace(budgetPattern, (_m, indent) => `${indent}max_tokens: 700,\n${indent}messages`);

// Bound every external generation request so a slow/free provider cannot stall the
// entire council worker. OpenRouter gets 12s, then Google AI Studio gets 12s fallback.
const timeoutReplacements = [
  [
    '          const r = await fetch(OPENROUTER_BASE + "/chat/completions", {\n            method: "POST",',
    '          const r = await fetch(OPENROUTER_BASE + "/chat/completions", {\n            method: "POST",\n            signal: AbortSignal.timeout(12000),',
  ],
  [
    "          const r = await fetch(endpoint, {\n            method: 'POST',",
    "          const r = await fetch(endpoint, {\n            method: 'POST',\n            signal: AbortSignal.timeout(12000),",
  ],
];
for (const [from, to] of timeoutReplacements) {
  if (!src.includes(from)) throw new Error('Council timeout patch marker not found: ' + from.slice(0, 80));
  src = src.replace(from, to);
}

if (!src.includes('generationConfig: { temperature: 0.2, maxOutputTokens: 1800 },')) {
  throw new Error('Google council output budget marker not found');
}
src = src.replace('generationConfig: { temperature: 0.2, maxOutputTokens: 1800 },', 'generationConfig: { temperature: 0.2, maxOutputTokens: 900 },');

const replacements = [
  ['          "PROJECT MEMORY:\\n" + compactCouncilContext(project, 1800),', '          "PROJECT MEMORY:\\n" + project,'],
  ['          "APPROVED DECISIONS:\\n" + compactCouncilContext(approved, 900),', '          "APPROVED DECISIONS:\\n" + approved,'],
  ['          "STORED GPT OPINION:\\n" + compactCouncilContext(gptOpinion, 300),', '          "STORED GPT OPINION:\\n" + gptOpinion,'],
  ['          "STORED GEMINI OPINION:\\n" + compactCouncilContext(geminiOpinion, 300),', '          "STORED GEMINI OPINION:\\n" + geminiOpinion,'],
  ['        const geminiModels = ["google/gemini-2.5-pro"];', '        const geminiModels = ["openrouter/free"];'],
  ['        const openaiModels = ["openai/gpt-5.6-luna-pro", "openai/gpt-5.5"];', '        const openaiModels = ["openrouter/free"];'],
  ['## Gemini Round ', '## Architecture Round '],
  ['## OpenAI Round ', '## Engineering Round '],
  ['You are Gemini acting as an independent product architect and multi-agent systems reviewer in Amir\'s model council.', 'You are the architecture-review side of Amir\'s technical model council. Use the configured zero-cost GenerationAdapter routing and remain provider-neutral.'],
  ['You are Gemini in Amir\'s model council.', 'You are the architecture-review side of Amir\'s model council. Use the configured zero-cost GenerationAdapter routing and remain provider-neutral.'],
  ['You are the OpenAI side of Amir\'s technical model council.', 'You are the engineering/execution side of Amir\'s technical model council. Use the configured zero-cost GenerationAdapter routing and remain provider-neutral.'],
  ['Do not pretend to be the interactive ChatGPT session; you are an API council model.', 'Do not pretend to be ChatGPT or any paid model; identify conclusions as council-model output.'],
  ['OpenAI response:\\n', 'Engineering-side response:\\n'],
  ['Gemini\'s latest critique:\\n', 'Architecture-side latest critique:\\n'],
  ['You are the final neutral synthesizer for Amir\'s model council.', 'You are the final neutral synthesizer for Amir\'s model council using the configured zero-cost GenerationAdapter routing.']
];

for (const [from, to] of replacements) {
  if (!src.includes(from)) throw new Error('Free-tier council patch marker not found: ' + from.slice(0, 80));
  src = src.replaceAll(from, to);
}

fs.writeFileSync(target, src);
console.log('Patched Amir Council with bounded zero-cost routing, provider timeouts, and concise output budgets');
