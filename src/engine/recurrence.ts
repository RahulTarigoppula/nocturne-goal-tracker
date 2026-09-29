import { addDays, daysBetween, daysInMonth, MONTHS, parseKey, startOfWeek, toKey, weekdayOf } from "./daykey";
import type { DayKey, Entry, Id, Recurrence, Weekday } from "./types";
import { assertNever } from "./types";

/** Next occurrence strictly after `base`. */
export function nextOccurrence(r: Recurrence, base: DayKey): DayKey {
  switch (r.kind) {
    case "daily":
      return addDays(base, Math.max(1, r.interval));
    case "weekdays": {
      let k = addDays(base, 1);
      while (weekdayOf(k) === 0 || weekdayOf(k) === 6) k = addDays(k, 1);
      return k;
    }
    case "weekly": {
      if (r.days.length === 0) throw new Error("weekly recurrence needs at least one day");
      const interval = Math.max(1, r.interval);
      const anchorWeek = startOfWeek(r.anchor);
      let k = addDays(base, 1);
      for (let i = 0; i < 7 * interval + 7; i++, k = addDays(k, 1)) {
        const weeksApart = daysBetween(anchorWeek, startOfWeek(k)) / 7;
        if (r.days.includes(weekdayOf(k)) && ((weeksApart % interval) + interval) % interval === 0) return k;
      }
      throw new Error("unreachable: weekly always has >= 1 day");
    }
    case "monthly": {
      let { y, m } = parseKey(base);
      const interval = Math.max(1, r.interval);
      for (let step = 0; step < 24; step++) {
        m += interval;
        while (m > 12) {
          m -= 12;
          y++;
        }
        const dim = daysInMonth(y, m);
        const day = r.day === "last" ? dim : Math.min(r.day, dim); // CLAMP from the STORED day
        const k = toKey(y, m, day);
        if (k > base) return k;
      }
      throw new Error("unreachable");
    }
    case "yearly": {
      let { y } = parseKey(base);
      for (;;) {
        y++;
        const k = toKey(y, r.month, Math.min(r.day, daysInMonth(y, r.month)));
        if (k > base) return k;
      }
    }
    default:
      return assertNever(r);
  }
}

/** Does the rule fire on day k? (For first-instance placement and property tests.) */
export function isScheduled(r: Recurrence, k: DayKey): boolean {
  switch (r.kind) {
    case "daily":
      return true;
    case "weekdays":
      return weekdayOf(k) !== 0 && weekdayOf(k) !== 6;
    case "weekly": {
      const interval = Math.max(1, r.interval);
      const weeksApart = daysBetween(startOfWeek(r.anchor), startOfWeek(k)) / 7;
      return r.days.includes(weekdayOf(k)) && ((weeksApart % interval) + interval) % interval === 0;
    }
    case "monthly": {
      const { y, m, d } = parseKey(k);
      const dim = daysInMonth(y, m);
      return d === (r.day === "last" ? dim : Math.min(r.day, dim));
    }
    case "yearly": {
      const { y, m, d } = parseKey(k);
      return m === r.month && d === Math.min(r.day, daysInMonth(y, m));
    }
    default:
      return assertNever(r);
  }
}

/** The first day on or after `from` on which the rule fires. */
export function firstOnOrAfter(r: Recurrence, from: DayKey): DayKey {
  return isScheduled(r, from) ? from : nextOccurrence(r, from);
}

/** Move a reminder instant by whole days while preserving its local wall-clock time. */
export function shiftReminder(atMs: number, fromDay: DayKey, toDay: DayKey): number {
  const at = new Date(atMs);
  const { y, m, d } = parseKey(
    addDays(toKey(at.getFullYear(), at.getMonth() + 1, at.getDate()), daysBetween(fromDay, toDay)),
  );
  return new Date(y, m - 1, d, at.getHours(), at.getMinutes(), 0, 0).getTime();
}

/**
 * Series bookkeeping when an instance is struck. Pure: returns the record to create, or null.
 * Fixed mode walks forward from the instance's day but never spawns into the past: a late strike
 * of an overdue daily produces tomorrow's instance, not a backlog.
 */
export function spawnNext(
  done: Entry,
  completedOn: DayKey,
  nowMs: number,
  newId: () => Id,
  order: string,
): Entry | null {
  const r = done.recurrence;
  if (!r) return null;
  const from = done.rolledFrom ?? done.when ?? completedOn;
  const base = r.mode === "afterCompletion" ? completedOn : from;
  let when = nextOccurrence(r, base);
  for (let guard = 0; when <= completedOn && guard < 4000; guard++) when = nextOccurrence(r, when);
  const next: Entry = {
    ...done,
    id: newId(),
    status: "open",
    when,
    bucket: "upcoming",
    evening: done.evening,
    checklist: done.checklist.map((c) => ({ ...c, done: false })),
    seriesId: done.seriesId ?? done.id,
    instanceNo: (done.instanceNo ?? 1) + 1,
    order,
    createdAt: nowMs,
    updatedAt: nowMs,
  };
  delete next.completedAt;
  delete next.rolledFrom;
  delete next.deletedAt;
  if (done.reminderAt && done.when) next.reminderAt = shiftReminder(done.reminderAt, done.when, when);
  else delete next.reminderAt;
  if (done.deadline && done.when) next.deadline = addDays(done.deadline, daysBetween(done.when, when));
  return next;
}

const ORD = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** Human description for the Repeat row. */
export function describe(r: Recurrence): string {
  const tail = r.mode === "afterCompletion" ? " after done" : "";
  switch (r.kind) {
    case "daily":
      return (
        (r.interval === 1 ? "Every day" : r.interval === 2 ? "Every other day" : `Every ${r.interval} days`) + tail
      );
    case "weekdays":
      return `Every weekday${tail}`;
    case "weekly": {
      const days = [...r.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_NAMES[d]);
      if (r.interval === 1) return `Every ${joinAnd(days)}${tail}`;
      return `Every ${r.interval} weeks on ${joinAnd(days)}${tail}`;
    }
    case "monthly": {
      const on = r.day === "last" ? "the last day" : `the ${ORD(r.day)}`;
      return (r.interval === 1 ? `Monthly on ${on}` : `Every ${r.interval} months on ${on}`) + tail;
    }
    case "yearly":
      return `Every year on ${r.day} ${MONTHS[r.month - 1]}${tail}`;
    default:
      return assertNever(r);
  }
}

const RR_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

/**
 * RFC 5545 export string. One-way. Lossy for monthly day 29–31: RFC 5545 skips short months,
 * Nocturne clamps to the month's last day.
 */
export function toRRuleString(r: Recurrence): string {
  switch (r.kind) {
    case "daily":
      return `FREQ=DAILY;INTERVAL=${r.interval}`;
    case "weekdays":
      return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
    case "weekly":
      return `FREQ=WEEKLY;INTERVAL=${r.interval};BYDAY=${r.days.map((d: Weekday) => RR_DAYS[d]).join(",")}`;
    case "monthly":
      return `FREQ=MONTHLY;INTERVAL=${r.interval};BYMONTHDAY=${r.day === "last" ? -1 : r.day}`;
    case "yearly":
      return `FREQ=YEARLY;BYMONTH=${r.month};BYMONTHDAY=${r.day}`;
    default:
      return assertNever(r);
  }
}

/** Next `n` occurrences from a starting instance day, for the Repeat picker preview. */
export function preview(r: Recurrence, from: DayKey, n: number): DayKey[] {
  const out: DayKey[] = [];
  let k = from;
  for (let i = 0; i < n; i++) {
    k = nextOccurrence(r, k);
    out.push(k);
  }
  return out;
}
