import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="theme-color" content="#0b1020" />
  <title>Amir Brain Console</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at top, #18213f 0, #0b1020 42%, #070a13 100%); color: #f7f8fb; min-height: 100vh; }
    .wrap { width: min(760px, 100%); margin: 0 auto; padding: 22px 16px 40px; }
    .hero { padding: 18px 4px 16px; }
    .badge { display: inline-flex; gap: 8px; align-items: center; padding: 7px 10px; border-radius: 999px; background: rgba(105,240,174,.10); border: 1px solid rgba(105,240,174,.28); color: #9fffd0; font-size: 12px; font-weight: 700; }
    h1 { margin: 14px 0 8px; font-size: clamp(30px, 8vw, 48px); line-height: 1; letter-spacing: -1.7px; }
    .sub { margin: 0; color: #aeb7cf; line-height: 1.55; }
    .card { margin-top: 16px; padding: 16px; background: rgba(14,19,36,.86); border: 1px solid rgba(255,255,255,.08); border-radius: 20px; box-shadow: 0 22px 70px rgba(0,0,0,.35); backdrop-filter: blur(14px); }
    label { display: block; margin: 0 0 7px; font-size: 12px; color: #9aa5c1; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
    input, textarea { width: 100%; border: 1px solid #283352; background: #0b1120; color: #fff; border-radius: 14px; padding: 13px 14px; outline: none; font: inherit; }
    textarea { resize: vertical; min-height: 150px; line-height: 1.5; }
    .field { margin-bottom: 14px; }
    .row { display: grid; grid-template-columns: 1fr; gap: 12px; }
    button { width: 100%; border: 0; border-radius: 14px; padding: 14px 16px; font: inherit; font-weight: 900; cursor: pointer; background: linear-gradient(135deg,#6e8cff,#9b7cff); color: #fff; }
    .minor { margin-top: 10px; background: transparent; border: 1px solid #2a3554; color: #cbd3e6; }
    .status { margin-top: 12px; min-height: 21px; color: #9aa5c1; font-size: 13px; }
    .answer { display: none; margin-top: 16px; padding: 16px; border-radius: 16px; background: #0a0f1d; border: 1px solid #26304a; white-space: pre-wrap; line-height: 1.6; overflow-wrap: anywhere; }
    .answer.show { display: block; }
    .ok { color: #9fffd0; }
    .err { color: #ff9aab; }
    .foot { margin-top: 14px; font-size: 12px; line-height: 1.5; color: #707b96; text-align: center; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <div class="badge">● Amir Dev Brain online</div>
      <h1>Amir Brain Console</h1>
      <p class="sub">Ask Gemini using your stored project context. Gemini's answer is stored as a model opinion, never as an approved decision.</p>
    </section>
    <section class="card">
      <div class="row">
        <div class="field"><label for="project">Project key</label><input id="project" value="amir-dev-brain" autocomplete="off" /></div>
        <div class="field"><label for="key">MCP access key</label><input id="key" type="password" placeholder="Enter your private key" autocomplete="off" /></div>
      </div>
      <div class="field"><label for="question">Question</label><textarea id="question" placeholder="Example: Read Amir Dev Brain and tell me the current state of English Twin and the best next technical step."></textarea></div>
      <button id="ask">Ask Gemini</button>
      <button id="remember" class="minor" type="button">Remember key on this device</button>
      <div id="status" class="status"></div>
      <div id="answer" class="answer"></div>
    </section>
    <div class="foot">Your key is never written into GitHub or the page source. If you choose Remember, it is stored only in this browser's local storage.</div>
  </main>
  <script>
    const $ = (id) => document.getElementById(id);
    const keyInput = $('key');
    const saved = localStorage.getItem('amir_mcp_access_key');
    if (saved) keyInput.value = saved;
    $('remember').addEventListener('click', () => {
      const value = keyInput.value.trim();
      if (!value) { localStorage.removeItem('amir_mcp_access_key'); $('status').textContent = 'Saved key removed.'; return; }
      localStorage.setItem('amir_mcp_access_key', value); $('status').textContent = 'Key saved on this device only.';
    });
    $('ask').addEventListener('click', async () => {
      const project = $('project').value.trim() || 'amir-dev-brain';
      const key = keyInput.value.trim();
      const question = $('question').value.trim();
      const btn = $('ask'); const status = $('status'); const answer = $('answer');
      answer.className = 'answer'; answer.textContent = '';
      if (!key) { status.className = 'status err'; status.textContent = 'Enter MCP_ACCESS_KEY first.'; return; }
      if (!question) { status.className = 'status err'; status.textContent = 'Write a question first.'; return; }
      btn.disabled = true; status.className = 'status'; status.textContent = 'Reading Amir Dev Brain and asking Gemini…';
      try {
        const response = await fetch('/functions/v1/gemini-brain', {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-amir-key': key }, body: JSON.stringify({ project_key: project, question })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || ('HTTP ' + response.status));
        status.className = 'status ok'; status.textContent = 'Done · opinion stored in Amir Dev Brain';
        answer.textContent = data.opinion || 'No opinion returned.'; answer.className = 'answer show';
      } catch (error) { status.className = 'status err'; status.textContent = 'Error: ' + (error && error.message ? error.message : String(error)); }
      finally { btn.disabled = false; }
    });
  </script>
</body>
</html>`;

const body = new TextEncoder().encode(html);

Deno.serve((req) => {
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer"
    }
  });
});
