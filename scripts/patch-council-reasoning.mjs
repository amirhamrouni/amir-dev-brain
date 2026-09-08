import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');

// Keep this legacy step compatible with generated adapters whose nesting changes indentation.
const pattern = /(\s*)max_tokens: 1200,\n\1messages/;
if (!pattern.test(src)) throw new Error('Council token budget marker not found');
src = src.replace(pattern, (_m, indent) =>
  `${indent}max_tokens: 220,\n${indent}reasoning: { max_tokens: 40, exclude: true },\n${indent}messages`
);

// Normalize the MCP access key on both the server environment value and the inbound request.
// This prevents invisible whitespace/newline/"Bearer "/quoted-secret formatting differences
// from producing a false auth failure after the same secret was synced successfully.
const keyDecl = 'const MCP_ACCESS_KEY = Deno.env.get("MCP_ACCESS_KEY")!;';
if (!src.includes(keyDecl)) throw new Error('MCP access key declaration marker not found');
src = src.replace(keyDecl, `function normalizeMcpAccessKey(raw: string | null | undefined): string {
  let value = String(raw || "").trim();
  value = value.replace(/^MCP_ACCESS_KEY\\s*=\\s*/i, "").trim();
  value = value.replace(/^Bearer\\s+/i, "").trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  return value;
}
const MCP_ACCESS_KEY = normalizeMcpAccessKey(Deno.env.get("MCP_ACCESS_KEY"));`);

const providedLine = '  const provided = c.req.header("x-brain-key") || new URL(c.req.url).searchParams.get("key");';
if (!src.includes(providedLine)) throw new Error('MCP provided-key marker not found');
src = src.replace(providedLine, '  const provided = normalizeMcpAccessKey(c.req.header("x-brain-key") || new URL(c.req.url).searchParams.get("key"));');

fs.writeFileSync(target, src);
console.log('Constrained council reasoning budget and normalized MCP auth key handling');
