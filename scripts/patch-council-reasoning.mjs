import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');

// Keep this legacy step compatible with generated adapters whose nesting changes indentation.
const pattern = /(\s*)max_tokens: 1200,\n\1messages/;
if (!pattern.test(src)) throw new Error('Council token budget marker not found');
src = src.replace(pattern, (_m, indent) =>
  `${indent}max_tokens: 220,\n${indent}reasoning: { max_tokens: 40, exclude: true },\n${indent}messages`
);

fs.writeFileSync(target, src);
console.log('Constrained council reasoning budget for low-credit debate execution');
