import { beforeEach, describe, expect, it } from "vitest";
import { makeId, seededBytes } from "../engine/ids";
import type { DayKey } from "../engine/types";
import { BackupError, backupFileName, exportAll, importAll, mergeRemote, parseBackup, toMarkdown } from "./backup";
import { clock, random } from "./clock";
import { db } from "./db";
import * as repo from "./repo";

const k = (s: string) => s as DayKey;
let now = new Date(2026, 8, 6, 21, 14).getTime();
clock.now = () => now;

beforeEach(async () => {
  now = new Date(2026, 8, 6, 21, 14).getTime();
  random.bytes = seededBytes(7);
  await db.delete();
  await db.open();
});

const todays = async () => (await db.entries.where("when").equals("2026-09-06").toArray()).filter((e) => !e.deletedAt);

describe("first launch", () => {
  it("seeds Issue No. 1 with three teaching entries, once", async () => {
    const { seeded, settings } = await repo.ensureSeed();
    expect(seeded).toBe(true);
    expect(settings.firstIssueDay).toBe("2026-09-06");
    expect((await todays()).map((e) => e.title)).toEqual([...repo.TEACHING_ENTRIES]);
    expect(await db.issues.get(k("2026-09-06"))).toMatchObject({ issueNo: 1, total: 3, done: 0 });
    expect((await repo.ensureSeed()).seeded).toBe(false);
    expect(await db.entries.count()).toBe(3);
  });
});

describe("entries", () => {
  beforeEach(async () => {
    await repo.ensureSeed();
  });

  it("addEntry places at the end of its section and bumps the revision", async () => {
    const r0 = await repo.getRevision();
    const e = await repo.addEntry({ title: "  Read 20 pages ", when: k("2026-09-06"), evening: true });
    expect(e.title).toBe("Read 20 pages");
    expect(e.evening).toBe(true);
    expect(await repo.getRevision()).toBe(r0 + 1);
    expect(await db.issues.get(k("2026-09-06"))).toMatchObject({ total: 4 });
    const later = await repo.addEntry({ title: "Groceries", when: k("2026-09-08") });
    expect(later.bucket).toBe("upcoming");
    const someday = await repo.addEntry({ title: "Learn film", when: k("2026-09-08"), evening: true });
    expect(someday.evening).toBe(true);
    await expect(repo.addEntry({ title: "   " })).rejects.toThrow();
    expect((await repo.addEntry({ title: "Film" })).bucket).toBe("someday");
  });

  it("strike + undo restores the exact pre-state", async () => {
    const [first] = await todays();
    const before = structuredClone(first!);
    const issueBefore = await db.issues.get(k("2026-09-06"));
    now += 1000;
    const u = await repo.strike(first!.id);
    const struck = await db.entries.get(first!.id);
    expect(struck).toMatchObject({ status: "done", completedAt: now });
    expect(await db.issues.get(k("2026-09-06"))).toMatchObject({ done: 1 });
    await expect(repo.strike(first!.id)).rejects.toBeInstanceOf(repo.NotOpenError);
    now += 1000;
    await repo.undo(u);
    const restored = await db.entries.get(first!.id);
    expect({ ...restored, updatedAt: 0 }).toEqual({ ...before, updatedAt: 0 });
    expect(await db.issues.get(k("2026-09-06"))).toEqual(issueBefore);
  });

  it("closing all three closes the issue; a new entry reopens it and keeps the standfirst", async () => {
    for (const e of await todays()) await repo.strike(e.id);
    const closed = await db.issues.get(k("2026-09-06"));
    expect(closed).toMatchObject({ done: 3, total: 3, closedAt: now, streakAtClose: 1 });
    await repo.setStandfirst(k("2026-09-06"), "  First one.  ");
    expect((await db.issues.get(k("2026-09-06")))?.standfirst).toBe("First one.");
    await repo.addEntry({ title: "One more", when: k("2026-09-06") });
    const reopened = await db.issues.get(k("2026-09-06"));
    expect(reopened?.closedAt).toBeUndefined();
    expect(reopened?.standfirst).toBe("First one.");
    await repo.setStandfirst(k("2026-09-06"), "");
    expect((await db.issues.get(k("2026-09-06")))?.standfirst).toBeUndefined();
  });

  it("striking a recurring entry spawns the next instance; undo tombstones it", async () => {
    const e = await repo.addEntry({
      title: "Water plants",
      when: k("2026-09-06"),
      recurrence: { kind: "daily", interval: 3, mode: "fixed" },
      reminderAt: new Date(2026, 8, 6, 22, 0).getTime(),
    });
    const u = await repo.strike(e.id);
    expect(u.nextId).toBeDefined();
    const next = await db.entries.get(u.nextId!);
    expect(next).toMatchObject({
      when: "2026-09-09",
      status: "open",
      instanceNo: 2,
      seriesId: e.id,
      bucket: "upcoming",
    });
    expect((await db.entries.get(e.id))?.recurrence).toBeUndefined();
    expect(await db.issues.get(k("2026-09-09"))).toMatchObject({ total: 1 });
    await repo.undo(u);
    expect((await db.entries.get(u.nextId!))?.deletedAt).toBe(now);
    expect((await db.entries.get(e.id))?.recurrence).toBeDefined();
  });

  it("reopen a done entry", async () => {
    const [first] = await todays();
    await repo.strike(first!.id);
    await repo.reopen(first!.id);
    expect((await db.entries.get(first!.id))?.status).toBe("open");
    expect((await db.entries.get(first!.id))?.completedAt).toBeUndefined();
  });

  it("moveTo someday / tomorrow / evening rolls both issues", async () => {
    const [a, b] = await todays();
    await repo.moveTo(a!.id, { when: k("2026-09-07"), evening: false });
    expect(await db.issues.get(k("2026-09-06"))).toMatchObject({ total: 2 });
    expect(await db.issues.get(k("2026-09-07"))).toMatchObject({ total: 1 });
    await repo.moveTo(b!.id, "someday");
    const s = await db.entries.get(b!.id);
    expect(s?.when).toBeUndefined();
    expect(s?.bucket).toBe("someday");
    const u = await repo.moveTo(a!.id, { when: k("2026-09-06"), evening: true });
    expect((await db.entries.get(a!.id))?.evening).toBe(true);
    await repo.undo(u!);
    expect((await db.entries.get(a!.id))?.when).toBe("2026-09-07");
    expect(await repo.moveTo("missing", "someday")).toBeUndefined();
  });

  it("moveTo keeps the reminder's wall-clock time", async () => {
    const e = await repo.addEntry({
      title: "Call",
      when: k("2026-09-06"),
      reminderAt: new Date(2026, 8, 6, 17, 30).getTime(),
    });
    await repo.moveTo(e.id, { when: k("2026-09-10"), evening: false });
    const r = new Date((await db.entries.get(e.id))?.reminderAt ?? 0);
    expect([r.getDate(), r.getHours(), r.getMinutes()]).toEqual([10, 17, 30]);
  });

  it("reorder writes exactly one record", async () => {
    const list = (await todays()).sort((x, y) => (x.order < y.order ? -1 : 1));
    const third = list[2]!;
    const before = new Map(list.map((e) => [e.id, e.updatedAt]));
    now += 5;
    await repo.reorder(third.id, list, 1);
    const after = await todays();
    const changed = after.filter((e) => e.updatedAt !== before.get(e.id));
    expect(changed.map((e) => e.id)).toEqual([third.id]);
    expect(after.sort((x, y) => (x.order < y.order ? -1 : 1)).map((e) => e.id)).toEqual([
      list[0]!.id,
      third.id,
      list[1]!.id,
    ]);
  });

  it("delete is a tombstone and closes the issue when the only open entry goes", async () => {
    const [a, b, c] = await todays();
    await repo.strike(a!.id);
    await repo.strike(b!.id);
    const u = await repo.deleteEntry(c!.id);
    expect((await db.entries.get(c!.id))?.deletedAt).toBe(now);
    expect((await db.issues.get(k("2026-09-06")))?.closedAt).toBe(now);
    await repo.undo(u!);
    expect((await db.entries.get(c!.id))?.deletedAt).toBeUndefined();
    expect(await repo.deleteEntry("nope")).toBeUndefined();
  });

  it("deleting every entry removes the issue", async () => {
    for (const e of await todays()) await repo.deleteEntry(e.id);
    expect(await db.issues.get(k("2026-09-06"))).toBeUndefined();
  });

  it("updateEntry patches and clears optional fields", async () => {
    const [a] = await todays();
    await repo.updateEntry(a!.id, { notes: "n", deadline: k("2026-09-09"), tags: ["x"] });
    expect(await db.entries.get(a!.id)).toMatchObject({ notes: "n", deadline: "2026-09-09", tags: ["x"] });
    await repo.updateEntry(a!.id, { deadline: undefined, title: "  " });
    const e = await db.entries.get(a!.id);
    expect(e?.deadline).toBeUndefined();
    expect(e?.title).toBe(a!.title);
    await repo.updateEntry(a!.id, { evening: true });
    expect((await db.entries.get(a!.id))?.evening).toBe(true);
    await repo.updateEntry("missing", { notes: "x" });
  });

  it("rollover moves yesterday's open entries onto today as overdue", async () => {
    const [a] = await todays();
    await repo.strike(a!.id);
    await repo.addEntry({ title: "Tomorrow thing", when: k("2026-09-07") });
    now = new Date(2026, 8, 7, 9, 0).getTime();
    const moved = await repo.rollForward(k("2026-09-07"));
    expect(moved).toBe(2);
    const today = (await db.entries.where("when").equals("2026-09-07").toArray()).filter((e) => !e.deletedAt);
    expect(today).toHaveLength(3);
    expect(today.filter((e) => e.rolledFrom === "2026-09-06")).toHaveLength(2);
    expect(today.every((e) => e.bucket === "today")).toBe(true);
    expect(await db.issues.get(k("2026-09-06"))).toMatchObject({ total: 3, done: 1 });
    expect(await db.issues.get(k("2026-09-07"))).toMatchObject({ total: 3, issueNo: 2 });
    expect(await repo.rollForward(k("2026-09-07"))).toBe(0);
  });
});

describe("habits", () => {
  it("add, toggle twice, archive, delete", async () => {
    await repo.ensureSeed();
    const h = await repo.addHabit("Morning pages", [1, 2, 3]);
    expect(h.scheduleDays).toEqual([1, 2, 3]);
    await expect(repo.addHabit(" ")).rejects.toThrow();
    expect(await repo.toggleCompletion(h.id, k("2026-09-06"))).toBe(true);
    expect(await db.completions.get(`${h.id}:2026-09-06`)).toMatchObject({ value: 1 });
    expect(await repo.toggleCompletion(h.id, k("2026-09-06"))).toBe(false);
    expect((await db.completions.get(`${h.id}:2026-09-06`))?.deletedAt).toBe(now);
    expect(await repo.toggleCompletion(h.id, k("2026-09-06"))).toBe(true);
    expect(await db.completions.count()).toBe(1);
    await repo.updateHabit(h.id, { title: "Pages", scheduleDays: [] });
    expect((await db.habits.get(h.id))?.scheduleDays).toBeUndefined();
    await repo.archiveHabit(h.id, true);
    expect((await db.habits.get(h.id))?.archivedAt).toBe(now);
    await repo.archiveHabit(h.id, false);
    expect((await db.habits.get(h.id))?.archivedAt).toBeUndefined();
    await repo.freezeDay(h.id, k("2026-09-05"));
    expect(await db.completions.get(`${h.id}:2026-09-05`)).toMatchObject({ value: 0, frozen: true });
    await repo.freezeDay(h.id, k("2026-09-06"));
    expect(await db.completions.get(`${h.id}:2026-09-06`)).toMatchObject({ value: 1 });
    await repo.setFrequency(h.id, { times: 3, per: "week" });
    expect((await db.habits.get(h.id))?.frequency).toEqual({ times: 3, per: "week" });
    await repo.setFrequency("missing", { times: 1, per: "day" });
    await repo.deleteHabit(h.id);
    expect((await db.habits.get(h.id))?.deletedAt).toBe(now);
    await repo.updateHabit("missing", { title: "x" });
    await repo.archiveHabit("missing", true);
  });
});

describe("settings", () => {
  it("defaults before seed, persists patches", async () => {
    expect((await repo.getSettings()).theme).toBe("night");
    await repo.ensureSeed();
    const s = await repo.saveSettings({ theme: "proof", readerName: "Rahul" });
    expect(s.theme).toBe("proof");
    expect((await repo.getSettings()).readerName).toBe("Rahul");
    await repo.saveSettings({ readerName: " " });
    expect((await repo.getSettings()).readerName).toBeUndefined();
  });
  it("change listeners fire and never break a write", async () => {
    const seen: string[] = [];
    const off = repo.onWrite((k) => seen.push(k));
    const off2 = repo.onWrite(() => {
      throw new Error("boom");
    });
    await repo.saveSettings({ eveningHour: 20 });
    off();
    off2();
    await repo.saveSettings({ eveningHour: 21 });
    expect(seen).toEqual(["settings"]);
  });
});

describe("backup", () => {
  beforeEach(async () => {
    await repo.ensureSeed();
    const h = await repo.addHabit("Run");
    await repo.toggleCompletion(h.id, k("2026-09-06"));
    const [a] = await todays();
    await repo.strike(a!.id);
  });

  it("export → wipe → import restores everything", async () => {
    const file = await exportAll("0.1.0");
    expect(file).toMatchObject({ format: "nocturne-backup", version: 1, schema: 1, app: "0.1.0" });
    const json = JSON.stringify(file);
    expect(json).not.toContain("ghp_");
    await db.delete();
    await db.open();
    const progress: number[] = [];
    await importAll(parseBackup(json), (d) => progress.push(d));
    const again = await exportAll("0.1.0");
    expect(again.data).toEqual(file.data);
    expect(progress.at(-1)).toBe(file.data.entries.length + 1 + 1 + 1 + 1);
    expect(await repo.getRevision()).toBe(file.revision + 1);
  });

  it("export shape snapshot", async () => {
    const file = await exportAll("0.1.0");
    expect({
      keys: Object.keys(file),
      tables: Object.fromEntries(Object.entries(file.data).map(([t, rows]) => [t, rows.length])),
      entryKeys: Object.keys(file.data.entries[0]!).sort(),
    }).toMatchSnapshot();
  });

  it("rejects bad headers and newer schemas without touching data", async () => {
    expect(() => parseBackup("nope")).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ format: "other" }))).toThrow("Not a Nocturne backup");
    expect(() => parseBackup(JSON.stringify({ format: "nocturne-backup", schema: 3, data: {} }))).toThrow(
      "newer edition (schema 3)",
    );
    expect(() => parseBackup(JSON.stringify({ format: "nocturne-backup", schema: 1, data: { entries: [] } }))).toThrow(
      "Not a Nocturne backup",
    );
    expect(await db.entries.count()).toBe(3);
  });

  it("merge is idempotent and keeps newer local edits", async () => {
    const file = await exportAll("0.1.0");
    const [a] = await todays();
    now += 10_000;
    await repo.updateEntry(a!.id, { notes: "newer local" });
    await mergeRemote(file);
    expect((await db.entries.get(a!.id))?.notes).toBe("newer local");
    const once = (await exportAll("x")).data;
    await mergeRemote(file);
    expect((await exportAll("x")).data).toEqual(once);
  });

  it("legacy export without deletedAt imports as live", async () => {
    const file = await exportAll("0.1.0");
    const legacy = { ...file, data: { ...file.data, entries: file.data.entries.map(({ deletedAt: _d, ...e }) => e) } };
    await importAll(parseBackup(JSON.stringify(legacy)));
    expect(await db.entries.count()).toBe(3);
  });

  it("markdown and file name", async () => {
    const md = toMarkdown(await exportAll("0.1.0"));
    expect(md).toContain("## 2026-09-06 — No. 1 · 1 / 3");
    expect(md).toContain("- [x] Swipe me right when I'm done");
    expect(md).toContain("| Run | 1 |");
    expect(backupFileName(now)).toBe("nocturne-2026-09-06.json");
    expect(makeId(seededBytes(3))).toHaveLength(12);
  });
});
