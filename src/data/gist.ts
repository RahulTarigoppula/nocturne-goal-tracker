import type { BackupFile } from "./backup";

/** GitHub Gist backup with the user's own fine-grained PAT (Gists: read and write). */
const API = "https://api.github.com";
const FILE = "nocturne.json";

export class GistError extends Error {
  constructor(
    message: string,
    readonly kind: "auth" | "missing" | "offline" | "rate" | "other",
  ) {
    super(message);
  }
}

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

async function call(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    throw new GistError("Offline — will retry", "offline");
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(token), ...(init.headers ?? {}) } });
  } catch {
    throw new GistError("Offline — will retry", "offline");
  }
  if (res.ok) return res;
  if (res.status === 401) throw new GistError("Token rejected — check the Gists permission", "auth");
  if (res.status === 404) throw new GistError("Backup gist not found — Create a new one", "missing");
  if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
    const reset = Number(res.headers.get("x-ratelimit-reset") ?? 0) * 1000;
    const d = new Date(reset);
    throw new GistError(
      `Rate-limited until ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      "rate",
    );
  }
  throw new GistError(`GitHub said ${res.status}`, "other");
}

export async function verify(token: string): Promise<string> {
  const res = await call(token, "/user");
  return ((await res.json()) as { login: string }).login;
}

export async function pushBackup(token: string, file: BackupFile, gistId?: string): Promise<string> {
  const body = JSON.stringify({
    description: "Nocturne backup",
    public: false,
    files: { [FILE]: { content: JSON.stringify(file) } },
  });
  if (gistId) {
    await call(token, `/gists/${gistId}`, { method: "PATCH", body });
    return gistId;
  }
  const res = await call(token, "/gists", { method: "POST", body });
  return ((await res.json()) as { id: string }).id;
}

export async function pullBackup(token: string, gistId: string): Promise<string> {
  const res = await call(token, `/gists/${gistId}`);
  const json = (await res.json()) as {
    files: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>;
  };
  const f = json.files[FILE];
  if (!f) throw new GistError("Backup gist has no nocturne.json", "missing");
  if (f.truncated && f.raw_url) {
    const raw = await fetch(f.raw_url);
    if (!raw.ok) throw new GistError(`GitHub said ${raw.status}`, "other");
    return raw.text();
  }
  return f.content ?? "";
}
