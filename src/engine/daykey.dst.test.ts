import { describe, expect, it } from "vitest";
import { addDays, todayKey } from "./daykey";
import { nextOccurrence, shiftReminder } from "./recurrence";
import type { DayKey } from "./types";

// This file runs in its own worker; switch the zone before any Date is built.
process.env.TZ = "Europe/Berlin";
const k = (s: string) => s as DayKey;

describe("Europe/Berlin DST", () => {
  it("the zone switch took effect", () => {
    expect(new Date("2026-07-01T12:00:00Z").getTimezoneOffset()).toBe(-120);
  });

  it("both readings of the repeated 02:30 on 2026-10-25 belong to the 24th", () => {
    const first = new Date("2026-10-25T00:30:00Z"); // 02:30 CEST
    const second = new Date("2026-10-25T01:30:00Z"); // 02:30 CET
    expect([first.getHours(), second.getHours()]).toEqual([2, 2]);
    expect(todayKey(first, 3)).toBe("2026-10-24");
    expect(todayKey(second, 3)).toBe("2026-10-24");
    expect(todayKey(new Date("2026-10-25T02:00:00Z"), 3)).toBe("2026-10-25"); // 03:00 CET
  });

  it("the spring-forward night neither skips nor repeats a day", () => {
    expect(todayKey(new Date("2026-03-29T00:59:00Z"), 3)).toBe("2026-03-28"); // 01:59 CET
    expect(todayKey(new Date("2026-03-29T01:00:00Z"), 3)).toBe("2026-03-29"); // 03:00 CEST
  });

  it("weekdays and dailies across both changes", () => {
    expect(nextOccurrence({ kind: "weekdays", mode: "fixed" }, k("2026-10-23"))).toBe("2026-10-26");
    expect(nextOccurrence({ kind: "daily", interval: 1, mode: "fixed" }, k("2026-03-28"))).toBe("2026-03-29");
    let d = k("2026-10-20");
    const seen: string[] = [];
    for (let i = 0; i < 10; i++) {
      d = nextOccurrence({ kind: "daily", interval: 1, mode: "fixed" }, d);
      seen.push(d);
    }
    expect(new Set(seen).size).toBe(10);
    expect(seen.at(-1)).toBe(addDays(k("2026-10-20"), 10));
  });

  it("a reminder keeps its wall-clock time across the change", () => {
    const at = new Date(2026, 9, 24, 17, 0).getTime();
    const moved = new Date(shiftReminder(at, k("2026-10-24"), k("2026-10-26")));
    expect([moved.getDate(), moved.getHours(), moved.getMinutes()]).toEqual([26, 17, 0]);
  });
});
