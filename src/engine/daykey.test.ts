import { describe, expect, it } from "vitest";
import {
  addDays,
  ariaValueText,
  atLocal,
  dayGauge,
  daysBetween,
  greeting,
  hhmm,
  isDayKey,
  isEvening,
  isoWeek,
  issueNumber,
  monthName,
  parseKey,
  runningDate,
  shortDate,
  startOfWeek,
  todayKey,
  weekdayLong,
  weekdayOf,
  weekdayShort,
} from "./daykey";
import type { DayKey } from "./types";

const k = (s: string) => s as DayKey;
const at = (h: number, m = 0, d = 7) => new Date(2026, 8, d, h, m);

describe("todayKey and rollover", () => {
  it("counts 01:30 and 02:59 for the previous day, flips at 03:00", () => {
    expect(todayKey(at(1, 30), 3)).toBe("2026-09-06");
    expect(todayKey(at(2, 59), 3)).toBe("2026-09-06");
    expect(todayKey(at(3, 0), 3)).toBe("2026-09-07");
  });
  it("rollover 0 is the plain local date for all 24 hours", () => {
    for (let h = 0; h < 24; h++) expect(todayKey(at(h), 0)).toBe("2026-09-07");
  });
  it("crosses a month and a year", () => {
    expect(todayKey(new Date(2027, 0, 1, 1, 0), 3)).toBe("2026-12-31");
  });
});

describe("calendar arithmetic", () => {
  it("issue numbers", () => {
    expect(issueNumber(k("2026-09-06"), k("2026-01-01"))).toBe(249);
    expect(issueNumber(k("2026-01-01"), k("2026-01-01"))).toBe(1);
  });
  it("addDays / daysBetween across DST and leap years", () => {
    expect(addDays(k("2026-10-24"), 2)).toBe("2026-10-26");
    expect(addDays(k("2028-02-28"), 1)).toBe("2028-02-29");
    expect(daysBetween(k("2026-03-28"), k("2026-03-30"))).toBe(2);
    expect(daysBetween(k("2026-09-06"), k("2026-09-01"))).toBe(-5);
  });
  it("weekdays and weeks", () => {
    expect(weekdayOf(k("2026-09-06"))).toBe(0);
    expect(startOfWeek(k("2026-09-06"))).toBe("2026-08-31");
    expect(startOfWeek(k("2026-09-07"))).toBe("2026-09-07");
    expect(isoWeek(k("2026-09-06"))).toBe(36);
    expect(isoWeek(k("2027-01-01"))).toBe(53);
  });
  it("parse and validate", () => {
    expect(parseKey(k("2026-09-06"))).toEqual({ y: 2026, m: 9, d: 6 });
    expect(isDayKey("2026-09-06")).toBe(true);
    expect(isDayKey("2026-9-6")).toBe(false);
    expect(isDayKey(3)).toBe(false);
  });
});

describe("gauge, evening, greeting", () => {
  it("gauge values", () => {
    expect(dayGauge(at(21, 14), 3)).toBeCloseTo(0.7597, 4);
    expect(dayGauge(at(15, 0), 3)).toBe(0.5);
    expect(dayGauge(at(2, 59), 3)).toBeCloseTo(0.9993, 4);
    expect(dayGauge(at(3, 0), 3)).toBe(0);
  });
  it("aria value text", () => {
    expect(ariaValueText(at(15, 0), 3)).toBe("12 hours until rollover");
    expect(ariaValueText(at(2, 0), 3)).toBe("1 hour until rollover");
    expect(ariaValueText(at(2, 50), 3)).toBe("Less than an hour until rollover");
  });
  it("isEvening across midnight", () => {
    expect(isEvening(at(21, 0), 21, 3)).toBe(true);
    expect(isEvening(at(1, 0), 21, 3)).toBe(true);
    expect(isEvening(at(3, 0), 21, 3)).toBe(false);
    expect(isEvening(at(20, 59), 21, 3)).toBe(false);
  });
  it("greeting never says good night", () => {
    expect(greeting(5)).toBe("Good morning");
    expect(greeting(11)).toBe("Good morning");
    expect(greeting(12)).toBe("Good afternoon");
    expect(greeting(16)).toBe("Good afternoon");
    expect(greeting(17)).toBe("Good evening");
    expect(greeting(2)).toBe("Good evening");
  });
});

describe("formatting", () => {
  it("fixed English running heads", () => {
    expect(runningDate(k("2026-09-06"))).toBe("SUN 06 SEP");
    expect(runningDate(k("2026-09-05"))).toBe("SAT 05 SEP");
    expect(weekdayShort(k("2026-09-04"))).toBe("FRI");
    expect(weekdayLong(k("2026-09-06"))).toBe("Sunday");
    expect(monthName(k("2026-09-06"))).toBe("September");
    expect(shortDate(k("2026-09-12"))).toBe("Sat 12 Sep");
    expect(shortDate(k("2026-09-07"), false)).toBe("Mon 07");
    expect(hhmm(at(9, 5))).toBe("09:05");
  });
  it("atLocal", () => {
    const d = new Date(atLocal(k("2026-09-07"), 17, 0));
    expect([d.getDate(), d.getHours()]).toEqual([7, 17]);
  });
});
