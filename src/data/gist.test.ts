import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeDeepLink } from "../platform/system";
import { maybeAutoBackup } from "./autoBackup";
import { clock } from "./clock";
import { db } from "./db";
import { GistError, pullBackup, pushBackup, verify } from "./gist";
import * as repo from "./repo";

const res = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers });

describe("gist client", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("verifies with the right headers and returns the login", async () => {
    fetchMock.mockResolvedValueOnce(res(200, { login: "rahul" }));
    expect(await verify("tok")).toBe("rahul");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/user");
    expect(init.headers).toMatchObject({ Authorization: "Bearer tok", "X-GitHub-Api-Version": "2022-11-28" });
  });

  it("creates then updates a private gist", async () => {
    fetchMock.mockResolvedValueOnce(res(201, { id: "abc123" }));
    const file = { format: "nocturne-backup" } as never;
    expect(await pushBackup("tok", file)).toBe("abc123");
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(body.public).toBe(false);
    expect(Object.keys(body.files)).toEqual(["nocturne.json"]);
    fetchMock.mockResolvedValueOnce(res(200, { id: "abc123" }));
    expect(await pushBackup("tok", file, "abc123")).toBe("abc123");
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBe("PATCH");
  });

  it("restores content, following raw_url when truncated", async () => {
    fetchMock.mockResolvedValueOnce(res(200, { files: { "nocturne.json": { content: "{}" } } }));
    expect(await pullBackup("tok", "g")).toBe("{}");
    fetchMock
      .mockResolvedValueOnce(res(200, { files: { "nocturne.json": { truncated: true, raw_url: "https://raw/x" } } }))
      .mockResolvedValueOnce(res(200, "full"));
    expect(await pullBackup("tok", "g")).toBe("full");
    fetchMock.mockResolvedValueOnce(res(200, { files: {} }));
    await expect(pullBackup("tok", "g")).rejects.toMatchObject({ kind: "missing" });
  });

  it("maps errors to inline copy", async () => {
    fetchMock.mockResolvedValueOnce(res(401, {}));
    await expect(verify("bad")).rejects.toThrow("Token rejected — check the Gists permission");
    fetchMock.mockResolvedValueOnce(res(404, {}));
    await expect(pullBackup("t", "g")).rejects.toThrow("Backup gist not found — Create a new one");
    fetchMock.mockResolvedValueOnce(res(403, {}, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1788732840" }));
    await expect(verify("t")).rejects.toThrow(/^Rate-limited until \d\d:\d\d$/);
    fetchMock.mockResolvedValueOnce(res(500, {}));
    await expect(verify("t")).rejects.toMatchObject({ kind: "other" });
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    await expect(verify("t")).rejects.toBeInstanceOf(GistError);
  });
});

describe("auto backup", () => {
  const fetchMock = vi.fn();
  beforeEach(async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    clock.now = () => new Date(2026, 8, 6, 21, 14).getTime();
    await db.delete();
    await db.open();
    await repo.ensureSeed();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("only runs when enabled, stale, changed and a token exists", async () => {
    const token = async () => "tok";
    expect(await maybeAutoBackup(token)).toBe(false); // auto off
    const s = await repo.getSettings();
    await repo.saveSettings({ backup: { ...s.backup, auto: true, gistId: "g1" } });
    expect(await maybeAutoBackup(async () => null)).toBe(false); // no token
    fetchMock.mockResolvedValueOnce(res(200, { id: "g1" }));
    const now = Date.now();
    expect(await maybeAutoBackup(token, now)).toBe(true);
    expect(await maybeAutoBackup(token, now + 60_000)).toBe(false); // < 6 h
    const later = now + 7 * 3_600_000;
    expect(await maybeAutoBackup(token, later)).toBe(false); // revision unchanged since the backup
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await repo.addEntry({ title: "New" });
    expect(await maybeAutoBackup(token, later)).toBe(false); // network failure is silent
  });
});

describe("deep links", () => {
  it("accepts only the three shapes", () => {
    expect(routeDeepLink("nocturne://today")).toEqual({ kind: "today" });
    expect(routeDeepLink("nocturne://entry/abc123")).toEqual({ kind: "entry", id: "abc123" });
    expect(routeDeepLink("nocturne://complete/abc123/")).toEqual({ kind: "complete", id: "abc123" });
    expect(routeDeepLink("nocturne://today/x")).toBeNull();
    expect(routeDeepLink("nocturne://entry")).toBeNull();
    expect(routeDeepLink("nocturne://delete/abc")).toBeNull();
    expect(routeDeepLink("https://evil.example/today")).toBeNull();
    expect(routeDeepLink("nocturne://entry/../../x")).toBeNull();
  });
});
