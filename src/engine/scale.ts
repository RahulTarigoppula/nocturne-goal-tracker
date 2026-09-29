const PENTATONIC = [0, 2, 4, 7, 9] as const; // C D E G A

/** Frequency of step n of the climbing scale, from C4. */
export const scaleHz = (n: number): number => 261.63 * 2 ** (((PENTATONIC[n % 5] ?? 0) + 12 * Math.floor(n / 5)) / 12);

/** Quiet hours wrap midnight when from > to (23 → 8). */
export function inQuietHours(hour: number, from: number, to: number): boolean {
  if (from === to) return false;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}
