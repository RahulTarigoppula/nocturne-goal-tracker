import { describe, expect, it } from "vitest";
import { addDays } from "./daykey";
import {
  bestStreak,
  bestWeekStreak,
  currentStreak,
  currentWeekStreak,
  freezeAvailable,
  issueStreak,
  longestIssueStreak,
} from "./streaks";
import { multiplier, score, strength } from "./strength";
import type { DayKey, Habit, Weekday } from "./types";

const k = (s: string) => s as DayKey;
const daily: Pick<Habit, "frequency" | "scheduleDays"> = { frequency: { times: 1, per: "day" } };
const weekdaysOnly = { frequency: { times: 1, per: "day" as const }, scheduleDays: [1, 2, 3, 4, 5] as Weekday[] };
const run = (from: string, n: number) => new Set(Array.from({ length: n }, (_, i) => addDays(k(from), i)));

describe("streaks", () => {
  it("Mon–Fri schedule, weekend skipped, Tuesday missed → 3", () => {
    const done = new Set([k("2026-09-04"), k("2026-09-03"), k("2026-09-02")]);
    expect(currentStreak(weekdaysOnly, done, k("2026-09-06"))).toBe(3);
  });
  it("today is grace", () => {
    const done = run("2026-08-26", 11);
    expect(currentStreak(daily, done, k("2026-09-06"))).toBe(11);
    expect(bestStreak(daily, done, k("2026-09-06"))).toBe(11);
    expect(currentStreak(daily, done, k("2026-09-07"))).toBe(0);
  });
  it("best streak is order-independent, empty → 0", () => {
    const done = new Set(["2026-09-06", "2026-09-01", "2026-09-05", "2026-09-02", "2026-09-04"].map(k));
    expect(bestStreak(daily, done, k("2026-09-06"))).toBe(3);
    expect(bestStreak(daily, new Set(), k("2026-09-06"))).toBe(0);
    expect(bestStreak(weekdaysOnly, new Set([k("2026-09-04"), k("2026-09-07")]), k("2026-09-07"))).toBe(2);
  });
  it("frequency habits count ISO weeks", () => {
    const h = { frequency: { times: 3, per: "week" as const } };
    const done = new Set(["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-31", "2026-09-02", "2026-09-04"].map(k));
    expect(currentWeekStreak(h, done, k("2026-09-08"))).toBe(2);
    expect(currentWeekStreak(h, new Set(), k("2026-09-08"))).toBe(0);
  });
  it("20 years of completions returns quickly", () => {
    const done = run(addDays(k("2026-09-05"), -7299), 7300);
    const t0 = performance.now();
    expect(currentStreak(daily, done, k("2026-09-06"))).toBe(3659);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});

describe("strength (Loop-equivalent)", () => {
  it("multiplier", () => {
    expect(multiplier(1)).toBeCloseTo(0.948078, 6);
    expect(multiplier(3 / 7)).toBeCloseTo(0.965697, 5);
  });
  const today = (n: number) => addDays(k("2026-01-01"), n - 1);
  it.each([
    [1, 5],
    [7, 31],
    [13, 50],
    [26, 75],
    [30, 80],
    [39, 88],
  ])("%i days → %i %%", (n, pct) => {
    expect(strength(daily, run("2026-01-01", n), new Set(), today(n))).toBe(pct);
  });
  it("30 then one miss → 76 %, never zero", () => {
    const done = run("2026-01-01", 30);
    expect(score(daily, done, new Set(), today(31))).toBeCloseTo(0.757, 3);
    expect(strength(daily, done, new Set(), today(31))).toBe(76);
  });
  it("a frozen day leaves the score untouched", () => {
    const done = run("2026-01-01", 30);
    expect(score(daily, done, new Set([today(31)]), today(31))).toBe(score(daily, done, new Set(), today(30)));
  });
  it("an unscheduled day leaves the score byte-identical", () => {
    const done = new Set([k("2026-09-04")]);
    expect(score(weekdaysOnly, done, new Set(), k("2026-09-06"))).toBe(
      score(weekdaysOnly, done, new Set(), k("2026-09-04")),
    );
  });
  it("3×/week habit", () => {
    const h = { frequency: { times: 3, per: "week" as const } };
    expect(strength(h, run("2026-01-01", 13), new Set(), today(13))).toBeGreaterThan(0);
    expect(strength(h, new Set(), new Set(), today(13))).toBe(0);
  });
});

describe("issue streaks", () => {
  const i = (dayKey: string, closed: boolean, total = 3) => ({
    dayKey: k(dayKey),
    total,
    ...(closed ? { closedAt: 1 } : {}),
  });
  it("walks back from yesterday, skipping days with no issue", () => {
    const issues = [i("2026-09-01", false), i("2026-09-02", true), i("2026-09-04", true), i("2026-09-05", true)];
    expect(issueStreak(issues, k("2026-09-06"))).toBe(3);
    expect(issueStreak([...issues, i("2026-09-06", true)], k("2026-09-06"))).toBe(4);
    expect(issueStreak([...issues, i("2026-09-06", false)], k("2026-09-06"))).toBe(3);
  });
  it("longest", () => {
    expect(
      longestIssueStreak([i("2026-09-01", true), i("2026-09-02", true), i("2026-09-03", false), i("2026-09-04", true)]),
    ).toBe(2);
  });
});

describe("weekly habits and freezes", () => {
  const h = { frequency: { times: 3, per: "week" as const } };
  it("best week streak", () => {
    const done = new Set(
      ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-24", "2026-08-25", "2026-08-26", "2026-09-01"].map(k),
    );
    expect(bestWeekStreak(h, done, k("2026-09-06"))).toBe(2);
    expect(bestWeekStreak(h, new Set(), k("2026-09-06"))).toBe(0);
  });
  it("one freeze per ISO week", () => {
    expect(freezeAvailable(new Set(), k("2026-09-06"))).toBe(true);
    expect(freezeAvailable(new Set([k("2026-09-01")]), k("2026-09-06"))).toBe(false);
    expect(freezeAvailable(new Set([k("2026-08-30")]), k("2026-09-06"))).toBe(true);
  });
  it("a frozen day satisfies the streak walk", () => {
    const done = new Set([k("2026-09-04"), k("2026-09-05")]);
    const withFreeze = new Set([...done, k("2026-09-03")]);
    expect(currentStreak(daily, withFreeze, k("2026-09-06"))).toBe(3);
  });
});
