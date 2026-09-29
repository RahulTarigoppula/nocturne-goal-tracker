import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import type { Entry } from "./types";

export const keyAtEnd = (keys: string[]): string => generateKeyBetween(keys.at(-1) ?? null, null);
export const keyBetween = (a: string | null, b: string | null): string => generateKeyBetween(a, b);
/** Moving X to index i of list L (L excludes X): exactly ONE record is written. */
export const keyForMove = (L: { order: string }[], i: number): string =>
  generateKeyBetween(L[i - 1]?.order ?? null, L[i]?.order ?? null);
/** Renumber the whole list when any key exceeds 40 chars. */
export const renumber = (n: number): string[] => generateNKeysBetween(null, null, n);
export const needsRenumber = (keys: string[]): boolean => keys.some((k) => k.length > 40);

export const byOrder = (a: { order: string }, b: { order: string }): number =>
  a.order < b.order ? -1 : a.order > b.order ? 1 : 0;

/** Open first (by order), then done (by completion time, so a fresh strike sinks to the foot). */
export function sortSection(list: Entry[]): Entry[] {
  const open = list.filter((e) => e.status === "open").sort(byOrder);
  const done = list
    .filter((e) => e.status === "done")
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0) || byOrder(a, b));
  return [...open, ...done];
}

export interface Sections {
  today: Entry[];
  evening: Entry[];
  folios: Map<string, number>;
  total: number;
  done: number;
}

/** Split a day's live entries into sections I/II and number the open ones across both. */
export function deriveSections(dayEntries: Entry[]): Sections {
  const live = dayEntries.filter((e) => !e.deletedAt);
  const today = sortSection(live.filter((e) => !e.evening));
  const evening = sortSection(live.filter((e) => e.evening));
  const folios = new Map<string, number>();
  let n = 0;
  for (const e of [...today, ...evening]) if (e.status === "open") folios.set(e.id, ++n);
  return { today, evening, folios, total: live.length, done: live.filter((e) => e.status === "done").length };
}

export const pad2 = (n: number): string => String(n).padStart(2, "0");
