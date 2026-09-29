import type { DayKey, Weekday } from "./types";

export const toKey = (y: number, m: number, d: number): DayKey =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` as DayKey;

export function parseKey(k: DayKey): { y: number; m: number; d: number } {
  const [y = 1970, m = 1, d = 1] = k.split("-").map(Number);
  return { y, m, d };
}

export const isDayKey = (s: unknown): s is DayKey => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

const utc = (k: DayKey) => {
  const { y, m, d } = parseKey(k);
  return Date.UTC(y, m - 1, d);
};

export function addDays(k: DayKey, n: number): DayKey {
  const { y, m, d } = parseKey(k);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return toKey(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export const daysBetween = (a: DayKey, b: DayKey): number => Math.round((utc(b) - utc(a)) / 86_400_000);
export const weekdayOf = (k: DayKey): Weekday => new Date(utc(k)).getUTCDay() as Weekday;
export const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** Monday of the ISO week containing k. */
export const startOfWeek = (k: DayKey): DayKey => addDays(k, -((weekdayOf(k) + 6) % 7));

/** The local calendar date of an instant (no rollover shift). */
export const localKey = (d: Date): DayKey => toKey(d.getFullYear(), d.getMonth() + 1, d.getDate());

/**
 * "Today" for the app: the local wall clock shifted back by the rollover hour.
 * Uses local-field arithmetic (not ms subtraction) so a repeated or skipped DST hour never shifts the day.
 */
export function todayKey(now: Date, rolloverHour: number): DayKey {
  if (now.getHours() >= rolloverHour) return localKey(now);
  return addDays(localKey(now), -1);
}

export const issueNumber = (dayKey: DayKey, firstIssueDay: DayKey): number => daysBetween(firstIssueDay, dayKey) + 1;

/** Fraction of the current issue-day elapsed, for the masthead rule. */
export function dayGauge(now: Date, rolloverHour: number): number {
  return ((((now.getHours() * 60 + now.getMinutes() - rolloverHour * 60) % 1440) + 1440) % 1440) / 1440;
}

export const isEvening = (now: Date, eveningHour: number, rolloverHour: number): boolean =>
  now.getHours() >= eveningHour || now.getHours() < rolloverHour;

export function ariaValueText(now: Date, rolloverHour: number): string {
  const h = Math.round((1 - dayGauge(now, rolloverHour)) * 24);
  if (h <= 0) return "Less than an hour until rollover";
  return `${h} ${h === 1 ? "hour" : "hours"} until rollover`;
}

export function greeting(hour: number): "Good morning" | "Good afternoon" | "Good evening" {
  if (hour >= 5 && hour <= 11) return "Good morning";
  if (hour >= 12 && hour <= 16) return "Good afternoon";
  return "Good evening";
}

const WD_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const MON_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Fixed English running-head date regardless of locale: "SUN 06 SEP". */
export function runningDate(k: DayKey): string {
  const { m, d } = parseKey(k);
  return `${WD_SHORT[weekdayOf(k)]} ${String(d).padStart(2, "0")} ${MON_SHORT[m - 1]}`;
}
export const weekdayShort = (k: DayKey): string => WD_SHORT[weekdayOf(k)];
export const weekdayLong = (k: DayKey): string => WD_LONG[weekdayOf(k)];
export const monthName = (k: DayKey): string => MONTHS[parseKey(k).m - 1] ?? "";

/** "Sat 12 Sep" (withMonth) or "Mon 07". */
export function shortDate(k: DayKey, withMonth = true): string {
  const { m, d } = parseKey(k);
  const wd = WD_LONG[weekdayOf(k)].slice(0, 3);
  return withMonth ? `${wd} ${d} ${MONTHS[m - 1]?.slice(0, 3)}` : `${wd} ${String(d).padStart(2, "0")}`;
}

export const hhmm = (d: Date): string =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** ISO-8601 week number, for the weekly review heads. */
export function isoWeek(k: DayKey): number {
  const thursday = addDays(startOfWeek(k), 3);
  const { y } = parseKey(thursday);
  return Math.floor(daysBetween(toKey(y, 1, 1), thursday) / 7) + 1;
}

/** Epoch ms for a local wall-clock time on a day key. */
export function atLocal(k: DayKey, hour: number, minute: number): number {
  const { y, m, d } = parseKey(k);
  return new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
}
