import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');
const from = '            max_tokens: 1200,\n            messages';
const to = '            max_tokens: 220,\n            reasoning: { max_tokens: 40, exclude: true },\n            messages';
if (!src.includes(from)) throw new Error('Council token budget marker not found');
src = src.replace(from, to);
fs.writeFileSync(target, src);
console.log('Constrained council reasoning budget for low-credit debate execution');
