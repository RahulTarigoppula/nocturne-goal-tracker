import type { Entry, Id, Settings } from "./types";

/** FNV-1a 32-bit, masked to a positive Java int, never 0 or 1 (1 is the daily review). */
export const notifId = (entryId: Id): number => {
  let h = 0x811c9dc5;
  for (const ch of entryId) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  const v = (h >>> 0) & 0x7fffffff;
  return v < 2 ? v + 2 : v;
};

export const REVIEW_ID = 1;

export interface Planned {
  id: number;
  at: number;
  title: string;
  body: string;
  extra: { entryId?: Id; kind: "entry" | "review" };
}

export function planNotifications(entries: Entry[], s: Pick<Settings, "privateReminders">, now: number): Planned[] {
  const horizon = now + 14 * 86_400_000;
  return entries
    .filter((e) => e.status === "open" && !e.deletedAt && e.reminderAt && e.reminderAt > now && e.reminderAt <= horizon)
    .map((e) => ({
      id: notifId(e.id),
      at: e.reminderAt as number,
      title: s.privateReminders ? "Nocturne" : e.title,
      body: s.privateReminders ? "An entry is due" : (e.notes.split("\n")[0] ?? ""),
      extra: { entryId: e.id, kind: "entry" as const },
    }));
}

/** Diff desired against pending: what to cancel, what to schedule. The review (id 1) is never touched. */
export function diffSchedules(
  desired: Planned[],
  pending: { id: number; at?: number | undefined }[],
): { cancel: number[]; schedule: Planned[] } {
  const want = new Map(desired.map((p) => [p.id, p]));
  const cancel = pending
    .filter((p) => p.id !== REVIEW_ID && (!want.has(p.id) || want.get(p.id)?.at !== p.at))
    .map((p) => p.id);
  const have = new Set(pending.filter((p) => !cancel.includes(p.id)).map((p) => p.id));
  return { cancel, schedule: desired.filter((p) => !have.has(p.id)) };
}

export const reviewBody = (open: number): string =>
  open === 0 ? "Nothing left open." : open === 1 ? "1 entry still open." : `${open} entries still open.`;
