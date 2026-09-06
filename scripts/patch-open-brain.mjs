import fs from 'node:fs';

const target = process.argv[2] || 'supabase/functions/open-brain-mcp/index.ts';
let src = fs.readFileSync(target, 'utf8');
const marker = '  return server;\n}\n\n// --- Hono App with Auth + CORS ---';
if (!src.includes(marker)) throw new Error('OB1 patch marker not found');

const injected = String.raw`
  // --- Amir Dev Brain project + GitHub tools ---
  const AMIR_BRAIN_RAW = "https://raw.githubusercontent.com/amirhamrouni/amir-dev-brain/main";

  async function fetchText(url: string): Promise<string> {
    const r = await fetch(url, { headers: { "User-Agent": "Amir-Dev-Brain-MCP/1.0" } });
    if (!r.ok) throw new Error(\`${'${r.status}'} ${'${r.statusText}'} for ${'${url}'}\`);
    return await r.text();
  }

  async function githubJson(path: string): Promise<any> {
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
      "User-Agent": "Amir-Dev-Brain-MCP/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const token = Deno.env.get("GITHUB_TOKEN");
    if (token) headers.Authorization = \`Bearer ${'${token}'}\`;
    const r = await fetch(\`https://api.github.com${'${path}'}\`, { headers });
    if (!r.ok) throw new Error(\`GitHub ${'${r.status}'}: ${'${await r.text()}'}\`);
    return await r.json();
  }

  server.registerTool(
    "amir_list_projects",
    {
      title: "List Amir Projects",
      description: "Read Amir Dev Brain's current project registry directly from GitHub raw content. Use this before project work.",
      annotations: { readOnlyHint: true },
      inputSchema: {},
    },
    async () => {
      try {
        const text = await fetchText(\`${'${AMIR_BRAIN_RAW}'}/PROJECTS.md\`);
        return { content: [{ type: "text" as const, text }] };
      } catch (err: unknown) {
        return { content: [{ type: "text" as const, text: \`Error: ${'${(err as Error).message}'}\` }], isError: true };
      }
    }
  );

  server.registerTool(
    "amir_project_context",
    {
      title: "Get Amir Project Context",
      description: "Load governed Amir Dev Brain context for one project, including development protocol, approved decisions, registry, and project memory. This bypasses web search/robots by reading raw GitHub content server-side.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        project_slug: z.string().describe("Project memory filename without .md, e.g. english-twin, basira, amir-music-os"),
      },
    },
    async ({ project_slug }) => {
      try {
        const safe = project_slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
        const urls = [
          ["DEVELOPMENT_SYSTEM", \`${'${AMIR_BRAIN_RAW}'}/protocol/DEVELOPMENT_SYSTEM.md\`],
          ["APPROVED_DECISIONS", \`${'${AMIR_BRAIN_RAW}'}/decisions/APPROVED_DECISIONS.md\`],
          ["PROJECT_REGISTRY", \`${'${AMIR_BRAIN_RAW}'}/PROJECTS.md\`],
          ["PROJECT_MEMORY", \`${'${AMIR_BRAIN_RAW}'}/projects/${'${safe}'}.md\`],
        ] as const;
        const parts: string[] = [];
        for (const [label, url] of urls) {
          try { parts.push(\`## ${'${label}'}\n${'${await fetchText(url)}'}\`); }
          catch (e: unknown) { parts.push(\`## ${'${label}'}\nUnavailable: ${'${(e as Error).message}'}\`); }
        }
        return { content: [{ type: "text" as const, text: parts.join("\n\n") }] };
      } catch (err: unknown) {
        return { content: [{ type: "text" as const, text: \`Error: ${'${(err as Error).message}'}\` }], isError: true };
      }
    }
  );

  server.registerTool(
    "github_repo_state",
    {
      title: "Get GitHub Repository Live State",
      description: "Get live repository metadata, latest commit, recent Actions runs, and releases directly from GitHub API. Use this to establish verified-current state instead of web search.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        repository: z.string().describe("owner/repo, e.g. amirhamrouni/lessonss"),
      },
    },
    async ({ repository }) => {
      try {
        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("repository must be owner/repo");
        const repo = await githubJson(\`/repos/${'${repository}'}\`);
        const branch = repo.default_branch || "main";
        const [commit, runs, releases] = await Promise.all([
          githubJson(\`/repos/${'${repository}'}/commits/${'${encodeURIComponent(branch)}'}\`),
          githubJson(\`/repos/${'${repository}'}/actions/runs?branch=${'${encodeURIComponent(branch)}'}&per_page=10\`).catch(() => ({ workflow_runs: [] })),
          githubJson(\`/repos/${'${repository}'}/releases?per_page=5\`).catch(() => []),
        ]);
        const out = {
          repository: repo.full_name,
          private: repo.private,
          default_branch: branch,
          pushed_at: repo.pushed_at,
          latest_commit: {
            sha: commit.sha,
            message: commit.commit?.message,
            date: commit.commit?.committer?.date,
            html_url: commit.html_url,
          },
          recent_actions: (runs.workflow_runs || []).map((r: any) => ({
            id: r.id, name: r.name, event: r.event, status: r.status, conclusion: r.conclusion,
            head_sha: r.head_sha, run_number: r.run_number, created_at: r.created_at, updated_at: r.updated_at, html_url: r.html_url,
          })),
          recent_releases: (Array.isArray(releases) ? releases : []).map((r: any) => ({
            tag_name: r.tag_name, name: r.name, draft: r.draft, prerelease: r.prerelease, published_at: r.published_at, html_url: r.html_url,
          })),
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }] };
      } catch (err: unknown) {
        return { content: [{ type: "text" as const, text: \`Error: ${'${(err as Error).message}'}\` }], isError: true };
      }
    }
  );

  server.registerTool(
    "github_fetch_file",
    {
      title: "Fetch GitHub Repository File",
      description: "Fetch a text file directly from a GitHub repository by owner/repo, path and optional ref. Use this instead of web browsing repository pages.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        repository: z.string().describe("owner/repo"),
        path: z.string().describe("Repository-relative file path"),
        ref: z.string().optional().describe("Branch, tag, or commit; defaults to repository default branch"),
      },
    },
    async ({ repository, path, ref }) => {
      try {
        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("repository must be owner/repo");
        const repo = await githubJson(\`/repos/${'${repository}'}\`);
        const useRef = ref || repo.default_branch || "main";
        const encodedPath = path.split("/").map(encodeURIComponent).join("/");
        const data = await githubJson(\`/repos/${'${repository}'}/contents/${'${encodedPath}'}?ref=${'${encodeURIComponent(useRef)}'}\`);
        if (data.type !== "file" || !data.content) throw new Error("Path is not a readable text file");
        const text = atob(String(data.content).replace(/\n/g, ""));
        return { content: [{ type: "text" as const, text: \`Repository: ${'${repository}'}\nRef: ${'${useRef}'}\nPath: ${'${path}'}\nSHA: ${'${data.sha}'}\n\n${'${text}'}\` }] };
      } catch (err: unknown) {
        return { content: [{ type: "text" as const, text: \`Error: ${'${(err as Error).message}'}\` }], isError: true };
      }
    }
  );

`;

src = src.replace(marker, injected + marker);
fs.writeFileSync(target, src);
console.log('Patched Open Brain MCP with Amir project/GitHub tools');
