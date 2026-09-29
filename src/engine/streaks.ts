import { addDays, startOfWeek, weekdayOf } from "./daykey";
import type { DayKey, Habit, Issue } from "./types";

export const scheduled = (h: Pick<Habit, "scheduleDays">, k: DayKey): boolean =>
  !h.scheduleDays || h.scheduleDays.length === 0 || h.scheduleDays.includes(weekdayOf(k));

/**
 * Current streak: walk back from today. Today is GRACE (still open, does not break).
 * Unscheduled days are skipped — not counted, not breaking.
 */
export function currentStreak(h: Pick<Habit, "scheduleDays">, done: Set<DayKey>, today: DayKey): number {
  let streak = 0;
  let k = today;
  let first = true;
  for (let i = 0; i < 3660; i++, k = addDays(k, -1)) {
    if (scheduled(h, k)) {
      if (done.has(k)) streak++;
      else if (!first) break;
    }
    first = false;
  }
  return streak;
}

/** Best streak: the longest run of consecutive SCHEDULED days done, first completion → today. */
export function bestStreak(h: Pick<Habit, "scheduleDays">, done: Set<DayKey>, today: DayKey): number {
  const first = [...done].sort()[0];
  if (!first) return 0;
  let best = 0;
  let run = 0;
  for (let k = first; k <= today; k = addDays(k, 1)) {
    if (!scheduled(h, k)) continue;
    run = done.has(k) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function countInRange(done: Set<DayKey>, from: DayKey, to: DayKey): number {
  let n = 0;
  for (const k of done) if (k >= from && k <= to) n++;
  return n;
}

/** Frequency habits: the unit is the ISO week; the current week is grace. */
export function currentWeekStreak(h: Pick<Habit, "frequency">, done: Set<DayKey>, today: DayKey): number {
  let streak = 0;
  let week = startOfWeek(today);
  let first = true;
  for (let i = 0; i < 520; i++, week = addDays(week, -7)) {
    const n = countInRange(done, week, addDays(week, 6));
    if (n >= h.frequency.times) streak++;
    else if (!first) break;
    first = false;
  }
  return streak;
}

/**
 * Issue streak for the colophon: consecutive closed issues walking back from yesterday
 * (today counts once closed). Days with no issue at all are skipped.
 */
export function issueStreak(issues: Pick<Issue, "dayKey" | "closedAt" | "total">[], today: DayKey): number {
  const byDay = new Map(issues.map((i) => [i.dayKey, i]));
  let streak = byDay.get(today)?.closedAt ? 1 : 0;
  const sorted = issues.filter((i) => i.dayKey < today && i.total > 0).sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));
  for (const i of sorted) {
    if (!i.closedAt) break;
    streak++;
  }
  return streak;
}

/** Longest run of consecutive closed issues (days without an issue are skipped). */
export function longestIssueStreak(issues: Pick<Issue, "dayKey" | "closedAt" | "total">[]): number {
  let best = 0;
  let run = 0;
  for (const i of [...issues].filter((x) => x.total > 0).sort((a, b) => (a.dayKey < b.dayKey ? -1 : 1))) {
    run = i.closedAt ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Best run of consecutive ISO weeks meeting the weekly target (the current week counts only once met). */
export function bestWeekStreak(h: Pick<Habit, "frequency">, done: Set<DayKey>, today: DayKey): number {
  const first = [...done].sort()[0];
  if (!first) return 0;
  let best = 0;
  let run = 0;
  for (let week = startOfWeek(first); week <= today; week = addDays(week, 7)) {
    const met = countInRange(done, week, addDays(week, 6)) >= h.frequency.times;
    run = met ? run + 1 : week === startOfWeek(today) ? run : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** One freeze token per ISO week: available when none was spent this week. */
export function freezeAvailable(frozen: Set<DayKey>, today: DayKey): boolean {
  return countInRange(frozen, startOfWeek(today), addDays(startOfWeek(today), 6)) === 0;
}
