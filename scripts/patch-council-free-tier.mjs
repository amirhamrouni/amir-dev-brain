import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');

const replacements = [
  ['            max_tokens: 220,\n            reasoning: { max_tokens: 40, exclude: true },\n            messages', '            max_tokens: 1800,\n            messages'],
  ['          "PROJECT MEMORY:\\n" + compactCouncilContext(project, 1800),', '          "PROJECT MEMORY:\\n" + project,'],
  ['          "APPROVED DECISIONS:\\n" + compactCouncilContext(approved, 900),', '          "APPROVED DECISIONS:\\n" + approved,'],
  ['          "STORED GPT OPINION:\\n" + compactCouncilContext(gptOpinion, 300),', '          "STORED GPT OPINION:\\n" + gptOpinion,'],
  ['          "STORED GEMINI OPINION:\\n" + compactCouncilContext(geminiOpinion, 300),', '          "STORED GEMINI OPINION:\\n" + geminiOpinion,'],
  ['        const geminiModels = ["google/gemini-2.5-pro"];', '        const geminiModels = ["nvidia/nemotron-3-ultra-550b-a55b:free", "minimax/minimax-m3:free", "openrouter/free"];'],
  ['        const openaiModels = ["openai/gpt-5.6-luna-pro", "openai/gpt-5.5"];', '        const openaiModels = ["minimax/minimax-m3:free", "nvidia/nemotron-3-ultra-550b-a55b:free", "openrouter/free"];'],
  ['## Gemini Round ', '## Architecture Round '],
  ['## OpenAI Round ', '## Engineering Round '],
  ['You are Gemini acting as an independent product architect and multi-agent systems reviewer in Amir\'s model council.', 'You are the architecture-review side of Amir\'s technical model council, running only on zero-cost OpenRouter free-tier inference.'],
  ['You are Gemini in Amir\'s model council.', 'You are the architecture-review side of Amir\'s model council, running only on zero-cost OpenRouter free-tier inference.'],
  ['You are the OpenAI side of Amir\'s technical model council.', 'You are the engineering/execution side of Amir\'s technical model council, running only on zero-cost OpenRouter free-tier inference.'],
  ['Do not pretend to be the interactive ChatGPT session; you are an API council model.', 'Do not pretend to be ChatGPT or any paid model; identify conclusions as council-model output.'],
  ['OpenAI response:\\n', 'Engineering-side response:\\n'],
  ['Gemini\'s latest critique:\\n', 'Architecture-side latest critique:\\n'],
  ['You are the final neutral synthesizer for Amir\'s model council.', 'You are the final neutral synthesizer for Amir\'s model council, running only on zero-cost OpenRouter free-tier inference.']
];

for (const [from, to] of replacements) {
  if (!src.includes(from)) throw new Error('Free-tier council patch marker not found: ' + from.slice(0, 80));
  src = src.replaceAll(from, to);
}

fs.writeFileSync(target, src);
console.log('Patched Amir Council to current zero-cost OpenRouter free-tier models with resilient fallbacks and neutral role labels');
