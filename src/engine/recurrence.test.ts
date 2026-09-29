import { expect, describe as group, it } from "vitest";
import golden from "./__golden__/recurrence.json";
import { addDays, weekdayOf } from "./daykey";
import {
  describe,
  firstOnOrAfter,
  isScheduled,
  nextOccurrence,
  preview,
  shiftReminder,
  spawnNext,
  toRRuleString,
} from "./recurrence";
import type { DayKey, Entry, Recurrence, Weekday } from "./types";

const k = (s: string) => s as DayKey;

group("nextOccurrence golden table", () => {
  for (const row of golden) {
    it(`${row.id}`, () => {
      const r = row.rule as Recurrence;
      let base = k(row.base);
      for (const want of row.expect) {
        base = nextOccurrence(r, base);
        expect(base).toBe(want);
      }
    });
  }
});

group("property: next > base and lands on a scheduled day", () => {
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)] as T;
  it("1,000 random rules", () => {
    for (let i = 0; i < 1000; i++) {
      const base = addDays(k("2020-01-01"), Math.floor(rnd() * 4000));
      const days = [...new Set([pick([0, 1, 2, 3, 4, 5, 6] as Weekday[]), pick([0, 1, 2, 3, 4, 5, 6] as Weekday[])])];
      const rules: Recurrence[] = [
        { kind: "daily", interval: 1 + Math.floor(rnd() * 10), mode: "fixed" },
        { kind: "weekdays", mode: "fixed" },
        { kind: "weekly", interval: 1 + Math.floor(rnd() * 3), days, anchor: base, mode: "fixed" },
        {
          kind: "monthly",
          interval: 1 + Math.floor(rnd() * 3),
          day: pick([1, 15, 28, 29, 30, 31, "last"] as const),
          mode: "fixed",
        },
        { kind: "yearly", month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 31), mode: "fixed" },
      ];
      const r = pick(rules);
      const next = nextOccurrence(r, base);
      expect(next > base).toBe(true);
      if (r.kind === "weekly") expect(r.days).toContain(weekdayOf(next));
      if (r.kind === "weekdays") expect([1, 2, 3, 4, 5]).toContain(weekdayOf(next));
      if (r.kind !== "monthly" || r.interval === 1) expect(isScheduled(r, next)).toBe(true);
    }
  });
});

group("helpers", () => {
  it("firstOnOrAfter", () => {
    expect(firstOnOrAfter({ kind: "weekdays", mode: "fixed" }, k("2026-09-06"))).toBe("2026-09-07");
    expect(firstOnOrAfter({ kind: "daily", interval: 3, mode: "fixed" }, k("2026-09-06"))).toBe("2026-09-06");
    expect(firstOnOrAfter({ kind: "monthly", interval: 1, day: 1, mode: "fixed" }, k("2026-09-06"))).toBe("2026-10-01");
    expect(firstOnOrAfter({ kind: "yearly", month: 9, day: 6, mode: "fixed" }, k("2026-09-06"))).toBe("2026-09-06");
  });

  it("preview monthly 31", () => {
    expect(preview({ kind: "monthly", interval: 1, day: 31, mode: "fixed" }, k("2026-01-31"), 3)).toEqual([
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("describe strings", () => {
    expect(describe({ kind: "daily", interval: 1, mode: "fixed" })).toBe("Every day");
    expect(describe({ kind: "daily", interval: 2, mode: "fixed" })).toBe("Every other day");
    expect(describe({ kind: "daily", interval: 3, mode: "fixed" })).toBe("Every 3 days");
    expect(describe({ kind: "weekdays", mode: "fixed" })).toBe("Every weekday");
    expect(describe({ kind: "weekly", interval: 1, days: [4, 1], anchor: k("2026-09-07"), mode: "fixed" })).toBe(
      "Every Monday and Thursday",
    );
    expect(describe({ kind: "weekly", interval: 2, days: [0], anchor: k("2026-09-06"), mode: "fixed" })).toBe(
      "Every 2 weeks on Sunday",
    );
    expect(describe({ kind: "monthly", interval: 1, day: 31, mode: "fixed" })).toBe("Monthly on the 31st");
    expect(describe({ kind: "monthly", interval: 2, day: 2, mode: "fixed" })).toBe("Every 2 months on the 2nd");
    expect(describe({ kind: "monthly", interval: 1, day: 23, mode: "fixed" })).toBe("Monthly on the 23rd");
    expect(describe({ kind: "monthly", interval: 1, day: 11, mode: "fixed" })).toBe("Monthly on the 11th");
    expect(describe({ kind: "monthly", interval: 1, day: "last", mode: "fixed" })).toBe("Monthly on the last day");
    expect(describe({ kind: "yearly", month: 2, day: 29, mode: "fixed" })).toBe("Every year on 29 February");
    expect(describe({ kind: "weekdays", mode: "afterCompletion" })).toBe("Every weekday after done");
    expect(describe({ kind: "weekly", interval: 1, days: [1, 3, 5], anchor: k("2026-09-07"), mode: "fixed" })).toBe(
      "Every Monday, Wednesday and Friday",
    );
  });

  it("toRRuleString", () => {
    expect(toRRuleString({ kind: "daily", interval: 3, mode: "fixed" })).toBe("FREQ=DAILY;INTERVAL=3");
    expect(toRRuleString({ kind: "weekdays", mode: "fixed" })).toBe("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
    expect(toRRuleString({ kind: "weekly", interval: 2, days: [1, 4], anchor: k("2026-09-07"), mode: "fixed" })).toBe(
      "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH",
    );
    expect(toRRuleString({ kind: "monthly", interval: 1, day: "last", mode: "fixed" })).toBe(
      "FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=-1",
    );
    expect(toRRuleString({ kind: "yearly", month: 2, day: 29, mode: "fixed" })).toBe(
      "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29",
    );
  });

  it("shiftReminder preserves wall-clock time", () => {
    const at = new Date(2026, 9, 23, 17, 0).getTime();
    const moved = new Date(shiftReminder(at, k("2026-10-23"), k("2026-10-26")));
    expect([moved.getDate(), moved.getHours(), moved.getMinutes()]).toEqual([26, 17, 0]);
  });

  it("throws on a weekly rule with no days", () => {
    expect(() =>
      nextOccurrence(
        { kind: "weekly", interval: 1, days: [], anchor: k("2026-09-06"), mode: "fixed" },
        k("2026-09-06"),
      ),
    ).toThrow();
  });
});

group("spawnNext", () => {
  const base: Entry = {
    id: "e1",
    title: "Water plants",
    notes: "",
    status: "done",
    bucket: "today",
    when: k("2026-09-06"),
    evening: false,
    tags: [],
    order: "a0",
    checklist: [{ id: "c1", text: "Ferns", done: true }],
    recurrence: { kind: "daily", interval: 3, mode: "fixed" },
    reminderAt: new Date(2026, 8, 6, 9, 30).getTime(),
    deadline: k("2026-09-07"),
    createdAt: 1,
    updatedAt: 1,
    completedAt: 5,
  };
  it("returns null without recurrence", () => {
    const { recurrence: _r, ...plain } = base;
    expect(spawnNext(plain, k("2026-09-06"), 10, () => "x", "a1")).toBeNull();
  });
  it("fixed: next from when, reminder and deadline shift, checklist resets", () => {
    const n = spawnNext(base, k("2026-09-06"), 10, () => "e2", "a1");
    expect(n?.when).toBe("2026-09-09");
    expect(n?.status).toBe("open");
    expect(n?.seriesId).toBe("e1");
    expect(n?.instanceNo).toBe(2);
    expect(n?.checklist[0]?.done).toBe(false);
    expect(n?.completedAt).toBeUndefined();
    expect(n?.deadline).toBe("2026-09-10");
    expect(new Date(n?.reminderAt ?? 0).getDate()).toBe(9);
  });
  it("fixed: an overdue strike never spawns into the past", () => {
    const late = { ...base, recurrence: { kind: "daily", interval: 1, mode: "fixed" } as Recurrence };
    const n = spawnNext(late, k("2026-09-10"), 10, () => "e2", "a1");
    expect(n?.when).toBe("2026-09-11");
  });
  it("R13: fixed ignores the completion date", () => {
    const weekly = {
      ...base,
      when: k("2026-09-07"),
      recurrence: { kind: "weekly", interval: 1, days: [0], anchor: k("2026-09-07"), mode: "fixed" } as Recurrence,
    };
    expect(spawnNext(weekly, k("2026-09-09"), 10, () => "e2", "a1")?.when).toBe("2026-09-13");
  });
  it("afterCompletion counts from the completion day", () => {
    const after = {
      ...base,
      when: k("2026-09-01"),
      recurrence: { kind: "daily", interval: 3, mode: "afterCompletion" } as Recurrence,
    };
    expect(spawnNext(after, k("2026-09-06"), 10, () => "e2", "a1")?.when).toBe("2026-09-09");
  });
  it("uses rolledFrom as the fixed base", () => {
    const rolled = { ...base, when: k("2026-09-06"), rolledFrom: k("2026-09-03") };
    expect(spawnNext(rolled, k("2026-09-06"), 10, () => "e2", "a1")?.when).toBe("2026-09-09");
  });
  it("afterCompletion daily when a recurrence spawns without a reminder", () => {
    const { reminderAt: _r, ...noRem } = base;
    expect(spawnNext(noRem, k("2026-09-06"), 10, () => "e2", "a1")?.reminderAt).toBeUndefined();
    expect(addDays(k("2026-09-06"), 1)).toBe("2026-09-07");
  });
});
