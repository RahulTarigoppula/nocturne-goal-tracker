import { describe, expect, it } from "vitest";
import { colophonLines, countWord } from "./colophon";
import { makeId, seededBytes } from "./ids";
import { deriveIssue, shouldPrintColophon } from "./issue";
import { mergeSnapshots, type Snapshot, TOMBSTONE_TTL } from "./merge";
import { diffSchedules, notifId, planNotifications, reviewBody } from "./notifications-plan";
import { deriveSections, keyAtEnd, keyBetween, keyForMove, needsRenumber, renumber } from "./ordering";
import { inQuietHours, scaleHz } from "./scale";
import type { DayKey, Entry, Settings } from "./types";

const k = (s: string) => s as DayKey;
const entry = (over: Partial<Entry>): Entry => ({
  id: "e",
  title: "t",
  notes: "",
  status: "open",
  bucket: "today",
  when: k("2026-09-06"),
  evening: false,
  tags: [],
  order: "a0",
  checklist: [],
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe("ids", () => {
  it("12-char base62, deterministic under a seed", () => {
    const a = makeId(seededBytes(1));
    expect(a).toMatch(/^[0-9A-Za-z]{12}$/);
    expect(makeId(seededBytes(1))).toBe(a);
  });
});

describe("ordering", () => {
  it("canonical keys", () => {
    expect(keyBetween(null, null)).toBe("a0");
    expect(keyBetween("a0", null)).toBe("a1");
    expect(keyBetween(null, "a0")).toBe("Zz");
    expect(keyBetween("a0", "a1")).toBe("a0V");
    expect(keyAtEnd([])).toBe("a0");
  });
  it("moving the third between the first two writes one key", () => {
    expect(keyForMove([{ order: "a0" }, { order: "a1" }], 1)).toBe("a0V");
  });
  it("renumber", () => {
    expect(renumber(3)).toEqual(["a0", "a1", "a2"]);
    expect(needsRenumber(["a".repeat(41)])).toBe(true);
    expect(needsRenumber(["a0"])).toBe(false);
  });
  it("sections and folios count only open entries across I and II", () => {
    const s = deriveSections([
      entry({ id: "1", order: "a1" }),
      entry({ id: "2", order: "a0", status: "done", completedAt: 5 }),
      entry({ id: "3", order: "a2", evening: true }),
      entry({ id: "4", order: "a0" }),
      entry({ id: "5", order: "a3", deletedAt: 9 }),
    ]);
    expect(s.today.map((e) => e.id)).toEqual(["4", "1", "2"]);
    expect(s.evening.map((e) => e.id)).toEqual(["3"]);
    expect([...s.folios.entries()]).toEqual([
      ["4", 1],
      ["1", 2],
      ["3", 3],
    ]);
    expect([s.total, s.done]).toEqual([4, 1]);
  });
});

describe("issue close / reopen / re-close", () => {
  const day = k("2026-09-06");
  const first = k("2026-01-01");
  it("sequence", () => {
    const open = [entry({ id: "1" }), entry({ id: "2", status: "done" })];
    const i1 = deriveIssue(undefined, open, day, first, 100, 0);
    expect(i1).toMatchObject({ issueNo: 249, total: 2, done: 1 });
    expect(i1?.closedAt).toBeUndefined();

    const closed = [entry({ id: "1", status: "done" }), entry({ id: "2", status: "done" })];
    const i2 = deriveIssue(i1, closed, day, first, 200, 11);
    expect(i2).toMatchObject({ closedAt: 200, streakAtClose: 12 });

    const withStandfirst = { ...i2!, standfirst: "Shipped." };
    const i3 = deriveIssue(withStandfirst, [...closed, entry({ id: "3" })], day, first, 300, 11);
    expect(i3?.closedAt).toBeUndefined();
    expect(i3?.standfirst).toBe("Shipped.");

    const i4 = deriveIssue(i3, [...closed, entry({ id: "3", status: "done" })], day, first, 400, 11);
    expect(i4?.closedAt).toBe(400);

    expect(deriveIssue(i4, closed, day, first, 500, 11)?.closedAt).toBe(400);
  });
  it("deleting every entry leaves no issue; deleting the only open one closes", () => {
    expect(deriveIssue(undefined, [], day, first, 1, 0)).toBeUndefined();
    const i = deriveIssue(undefined, [entry({ status: "done" }), entry({ id: "x", deletedAt: 3 })], day, first, 1, 0);
    expect(i?.closedAt).toBe(1);
  });
  it("shouldPrintColophon", () => {
    expect(shouldPrintColophon([])).toBe(false);
    expect(shouldPrintColophon([entry({ status: "done" }), entry({ status: "done", evening: true })])).toBe(true);
    expect(shouldPrintColophon([entry({ status: "done" }), entry({ evening: true })])).toBe(false);
  });
});

describe("colophon sentences", () => {
  const closedAt = new Date(2026, 8, 6, 21, 14).getTime();
  it("exact lines", () => {
    expect(colophonLines({ issueNo: 249, closedAt, total: 7, streak: 12, longest: 31 })).toEqual([
      "Issue No. 249",
      "Closed at 21:14. Seven entries.",
      "Streak 12 days. Longest 31.",
      "Set in Bricolage Grotesque & Geist.",
    ]);
  });
  it("issue No. 1 omits the time; singular forms", () => {
    expect(colophonLines({ issueNo: 1, closedAt, total: 3, streak: 1, longest: 1 })).toEqual([
      "Issue No. 1",
      "Closed. Three entries.",
      "Streak 1 day.",
      "Set in Bricolage Grotesque & Geist.",
    ]);
    expect(colophonLines({ issueNo: 2, closedAt, total: 1, streak: 2, longest: 2 })[1]).toBe(
      "Closed at 21:14. One entry.",
    );
  });
  it("count words", () => {
    expect(countWord(12)).toBe("Twelve");
    expect(countWord(13)).toBe("Thirteen");
    expect(countWord(21)).toBe("Twenty-one");
    expect(countWord(40)).toBe("Forty");
    expect(countWord(100)).toBe("100");
  });
});

describe("notification planning", () => {
  const now = 1_000_000;
  it("notifId is a positive 31-bit int, never 0 or 1, stable", () => {
    for (const id of ["a", "b", "Zz9", "abcdefghijkl"]) {
      const n = notifId(id);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(0x7fffffff);
      expect(notifId(id)).toBe(n);
    }
  });
  it("plans only open, live, future reminders within 14 days; private mode redacts", () => {
    const es = [
      entry({ id: "1", reminderAt: now + 1000, notes: "first line\nsecond" }),
      entry({ id: "2", reminderAt: now - 1 }),
      entry({ id: "3", reminderAt: now + 15 * 86_400_000 }),
      entry({ id: "4", reminderAt: now + 1000, status: "done" }),
      entry({ id: "5", reminderAt: now + 1000, deletedAt: 1 }),
    ];
    const p = planNotifications(es, { privateReminders: false }, now);
    expect(p.map((x) => x.extra.entryId)).toEqual(["1"]);
    expect(p[0]?.body).toBe("first line");
    expect(planNotifications(es, { privateReminders: true }, now)[0]).toMatchObject({
      title: "Nocturne",
      body: "An entry is due",
    });
  });
  it("diffSchedules cancels changed times and never touches id 1", () => {
    const desired = [
      { id: 10, at: 5, title: "", body: "", extra: { kind: "entry" as const } },
      { id: 11, at: 7, title: "", body: "", extra: { kind: "entry" as const } },
    ];
    const pending = [{ id: 1 }, { id: 10, at: 5 }, { id: 11, at: 6 }, { id: 12, at: 9 }];
    const { cancel, schedule } = diffSchedules(desired, pending);
    expect(cancel).toEqual([11, 12]);
    expect(schedule.map((s) => s.id)).toEqual([11]);
  });
  it("review body", () => {
    expect(reviewBody(0)).toBe("Nothing left open.");
    expect(reviewBody(1)).toBe("1 entry still open.");
    expect(reviewBody(4)).toBe("4 entries still open.");
  });
});

describe("merge", () => {
  const settings = { updatedAt: 1 } as Settings;
  const snap = (over: Partial<Snapshot>): Snapshot => ({
    entries: [],
    habits: [],
    completions: [],
    issues: [],
    settings: [settings],
    revision: 1,
    ...over,
  });
  const now = 200 * 86_400_000;
  it("last writer wins, tombstones beat older live records, union of completions", () => {
    const local = snap({
      entries: [
        entry({ id: "a", title: "local", updatedAt: 10 }),
        entry({ id: "b", deletedAt: now - 1000, updatedAt: 20 }),
      ],
      completions: [{ id: "h:1", habitId: "h", dayKey: k("2026-09-01"), value: 1, ts: 1, updatedAt: 5 }],
      revision: 4,
    });
    const remote = snap({
      entries: [
        entry({ id: "a", title: "remote", updatedAt: 11 }),
        entry({ id: "b", title: "old", updatedAt: 15 }),
        entry({ id: "c", updatedAt: 1 }),
      ],
      completions: [
        { id: "h:1", habitId: "h", dayKey: k("2026-09-01"), value: 0, ts: 1, updatedAt: 5 },
        { id: "h:2", habitId: "h", dayKey: k("2026-09-02"), value: 1, ts: 1, updatedAt: 5 },
      ],
      revision: 7,
    });
    const m = mergeSnapshots(local, remote, now);
    expect(m.entries.find((e) => e.id === "a")?.title).toBe("remote");
    expect(m.entries.find((e) => e.id === "b")?.deletedAt).toBe(now - 1000);
    expect(m.entries.map((e) => e.id).sort()).toEqual(["a", "b", "c"]);
    expect(m.completions.find((c) => c.id === "h:1")?.value).toBe(1);
    expect(m.completions).toHaveLength(2);
    expect(m.revision).toBe(8);
    const again = mergeSnapshots(m, remote, now);
    expect(again.entries).toEqual(m.entries);
    expect(again.completions).toEqual(m.completions);
  });
  it("purges tombstones older than 90 days, keeps 89", () => {
    const local = snap({
      entries: [
        entry({ id: "old", deletedAt: now - TOMBSTONE_TTL - 86_400_000, updatedAt: 1 }),
        entry({ id: "young", deletedAt: now - TOMBSTONE_TTL + 86_400_000, updatedAt: 1 }),
      ],
    });
    expect(mergeSnapshots(local, snap({}), now).entries.map((e) => e.id)).toEqual(["young"]);
  });
});

describe("climbing scale", () => {
  it.each([
    [0, 261.63],
    [1, 293.66],
    [2, 329.63],
    [3, 392.0],
    [4, 440.0],
    [5, 523.25],
    [6, 587.33],
    [9, 880.0],
    [10, 1046.52],
  ])("step %i → %f Hz", (n, hz) => expect(scaleHz(n)).toBeCloseTo(hz, 1));
  it("quiet hours wrap midnight", () => {
    expect(inQuietHours(23, 23, 8)).toBe(true);
    expect(inQuietHours(7, 23, 8)).toBe(true);
    expect(inQuietHours(8, 23, 8)).toBe(false);
    expect(inQuietHours(12, 9, 17)).toBe(true);
    expect(inQuietHours(12, 9, 9)).toBe(false);
  });
});
