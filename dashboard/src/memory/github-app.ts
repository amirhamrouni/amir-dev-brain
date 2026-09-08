import "server-only";

import { createSign } from "node:crypto";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

type InstallationTokenResponse = {
  token?: string;
  expires_at?: string;
};

function base64Url(input: string | Buffer) {
  const bytes = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return bytes
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name.toLowerCase()}_missing`);
  return value;
}

function normalizePrivateKey(raw: string) {
  return raw.replaceAll("\\n", "\n").trim();
}

function repositoryParts(repository: string) {
  const normalized = repository.trim();
  if (!REPOSITORY_PATTERN.test(normalized)) {
    throw new Error("invalid_repository");
  }

  const [owner, repo] = normalized.split("/");
  if (!owner || !repo) throw new Error("invalid_repository");
  return { owner, repo, fullName: `${owner}/${repo}` };
}

function allowedRepositories() {
  return new Set(
    readRequiredEnv("ADB_ALLOWED_REPOSITORIES")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function assertRepositoryAllowed(repository: string) {
  const { fullName } = repositoryParts(repository);
  if (!allowedRepositories().has(fullName.toLowerCase())) {
    throw new Error("repository_not_allowed");
  }
  return fullName;
}

function createGitHubAppJwt() {
  const issuer = process.env.GITHUB_APP_CLIENT_ID?.trim() || readRequiredEnv("GITHUB_APP_ID");
  const privateKey = normalizePrivateKey(readRequiredEnv("GITHUB_APP_PRIVATE_KEY"));
  const now = Math.floor(Date.now() / 1000);

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: issuer,
    }),
  );
  const signingInput = `${header}.${payload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey);

  return `${signingInput}.${base64Url(signature)}`;
}

async function responseError(response: Response, fallback: string) {
  const body = await response.text().catch(() => "");
  const suffix = body ? `:${body.slice(0, 300)}` : "";
  return new Error(`${fallback}:${response.status}${suffix}`);
}

async function createRepositoryInstallationToken(repository: string) {
  const { repo } = repositoryParts(assertRepositoryAllowed(repository));
  const installationId = readRequiredEnv("GITHUB_APP_INSTALLATION_ID");
  const appJwt = createGitHubAppJwt();

  const response = await fetch(
    `${GITHUB_API}/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${appJwt}`,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repositories: [repo],
        permissions: {
          contents: "write",
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw await responseError(response, "github_installation_token_failed");
  }

  const body = (await response.json()) as InstallationTokenResponse;
  if (!body.token) throw new Error("github_installation_token_missing");
  return body.token;
}

export type RepositoryDispatchPayload = {
  task_id: string;
  decision_id: string;
  decision_revision: number;
  decision_sha256: string;
  base_ref: string;
};

export async function sendImplementationRepositoryDispatch(
  repository: string,
  payload: RepositoryDispatchPayload,
) {
  const { owner, repo } = repositoryParts(assertRepositoryAllowed(repository));
  const token = await createRepositoryInstallationToken(repository);

  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "adb.code.requested",
        client_payload: payload,
      }),
      cache: "no-store",
    },
  );

  if (response.status !== 204) {
    throw await responseError(response, "github_repository_dispatch_failed");
  }
}
