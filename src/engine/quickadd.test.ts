import * as chrono from "chrono-node";
import { describe, expect, it } from "vitest";
import golden from "./__golden__/quickadd.json";
import { chipKey, parseQuickAdd } from "./quickadd";

const [y, mo, d, h, mi] = golden.reference as [number, number, number, number, number];
const ref = new Date(y, mo, d, h, mi);
const parse = chrono.parse as unknown as Parameters<typeof parseQuickAdd>[2];
const fmt = (t?: { hour: number; minute: number }) =>
  t ? `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}` : undefined;

describe("golden table", () => {
  for (const row of golden.rows) {
    it(row.input, () => {
      const p = parseQuickAdd(row.input, ref, parse);
      expect(p.title).toBe(row.title);
      expect(p.when).toBe((row as { when?: string }).when);
      expect(fmt(p.time)).toBe((row as { time?: string }).time);
      expect(p.tags).toEqual(row.tags);
      expect(p.evening).toBe(row.evening);
      expect(p.deadline).toBe((row as { deadline?: string }).deadline);
      const want = (row as { recurrence?: Record<string, unknown> }).recurrence;
      if (want) expect(p.recurrence).toMatchObject(want);
      else expect(p.recurrence).toBeUndefined();
      for (const c of p.chips) expect(row.input.slice(c.span[0], c.span[1])).toBe(c.text);
      // idempotence: the returned title yields no chips
      expect(parseQuickAdd(p.title, ref, parse).chips).toEqual([]);
    });
  }
});

describe("worked example (Sun 2026-09-06 20:10)", () => {
  const now = new Date(2026, 8, 6, 20, 10);
  const input = "Call mom tomorrow 17:00 every week #family";
  it("parses into the documented result in under 50 ms", () => {
    const t0 = performance.now();
    const p = parseQuickAdd(input, now, parse);
    const took = performance.now() - t0;
    expect(p.title).toBe("Call mom");
    expect(p.when).toBe("2026-09-07");
    expect(p.recurrence).toEqual({ kind: "weekly", interval: 1, days: [1], anchor: "2026-09-07", mode: "fixed" });
    expect(p.tags).toEqual(["family"]);
    expect(new Date(p.reminderAt ?? 0).getHours()).toBe(17);
    expect(p.chips.map((c) => c.label)).toEqual(["TOMORROW 17:00", "EVERY WEEK", "#FAMILY"]);
    expect(took).toBeLessThan(50);
  });
  it("a time already past today resolves to tomorrow and the chip says so", () => {
    const p = parseQuickAdd("stretch 17:00", now, parse);
    expect(p.when).toBe("2026-09-07");
    expect(p.chips[0]?.label).toBe("17:00 · TOMORROW");
  });
  it("discarding a chip keeps the text in the title", () => {
    const first = parseQuickAdd(input, now, parse);
    const tag = first.chips.find((c) => c.kind === "tag");
    const p = parseQuickAdd(input, now, parse, { ignore: new Set([chipKey(tag!)]) });
    expect(p.tags).toEqual([]);
    expect(p.title).toBe("Call mom #family");
  });
});

describe("edges", () => {
  it("never files a blank entry", () => {
    const p = parseQuickAdd("tomorrow #x", ref, parse);
    expect(p.title).toBe("tomorrow #x");
    expect(p.chips).toEqual([]);
  });
  it("works without chrono (before the chunk loads)", () => {
    const p = parseQuickAdd("tidy up today #home", ref, null);
    expect(p.title).toBe("tidy up");
    expect(p.when).toBe("2026-09-06");
    expect(p.tags).toEqual(["home"]);
  });
  it("respects the rollover hour for today", () => {
    const late = new Date(2026, 8, 7, 1, 30);
    expect(parseQuickAdd("read tonight", late, parse, { rolloverHour: 3 }).when).toBe("2026-09-06");
  });
  it("other recurrence units", () => {
    expect(parseQuickAdd("floss every day", ref, parse).recurrence).toMatchObject({ kind: "daily", interval: 1 });
    expect(parseQuickAdd("run every other day", ref, parse).recurrence).toMatchObject({ kind: "daily", interval: 2 });
    expect(parseQuickAdd("call gran every 2 weeks", ref, parse).recurrence).toMatchObject({
      kind: "weekly",
      interval: 2,
      days: [0],
    });
    expect(parseQuickAdd("birthday card every year", ref, parse).recurrence).toMatchObject({
      kind: "yearly",
      month: 9,
      day: 6,
    });
    expect(parseQuickAdd("invoice every month on the last day", ref, parse).recurrence).toMatchObject({
      kind: "monthly",
      day: "last",
    });
    expect(parseQuickAdd("rent every 3 months", ref, parse).recurrence).toMatchObject({ kind: "monthly", interval: 3 });
  });
});
