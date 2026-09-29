import { addDays } from "./daykey";
import { countInRange, scheduled } from "./streaks";
import type { DayKey, Habit } from "./types";

/** Loop-style smoothing multiplier, re-implemented from the published formula 0.5^(sqrt(freq)/13). */
export const multiplier = (freq: number): number => 0.5 ** (Math.sqrt(freq) / 13);

/** Raw score in [0, 1]. */
export function score(
  h: Pick<Habit, "frequency" | "scheduleDays">,
  done: Set<DayKey>,
  frozen: Set<DayKey>,
  today: DayKey,
): number {
  const freq = h.frequency.per === "day" ? 1 : h.frequency.times / 7;
  const mult = multiplier(freq);
  const first = [...done].sort()[0];
  if (!first) return 0;
  let s = 0;
  for (let k = first; k <= today; k = addDays(k, 1)) {
    if (!scheduled(h, k) || frozen.has(k)) continue; // skipped/frozen days leave the score untouched
    const check =
      h.frequency.per === "day"
        ? done.has(k)
          ? 1
          : 0
        : Math.min(1, countInRange(done, addDays(k, -6), k) / h.frequency.times);
    s = s * mult + check * (1 - mult);
  }
  return Math.min(1, Math.max(0, s));
}

/** Strength 0–100 for the ring. */
export function strength(
  h: Pick<Habit, "frequency" | "scheduleDays">,
  done: Set<DayKey>,
  frozen: Set<DayKey>,
  today: DayKey,
): number {
  return Math.round(score(h, done, frozen, today) * 100);
}
