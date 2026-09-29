import type { Completion, Entry, Habit, Issue, Settings } from "./types";

export interface Snapshot {
  entries: Entry[];
  habits: Habit[];
  completions: Completion[];
  issues: Issue[];
  settings: Settings[];
  revision: number;
}

export const TOMBSTONE_TTL = 90 * 86_400_000;

type Rec = { updatedAt: number; deletedAt?: number };

function mergeTable<T extends Rec>(local: T[], remote: T[], pk: (r: T) => string, tie?: (l: T, r: T) => T): T[] {
  const out = new Map(local.map((r) => [pk(r), r]));
  for (const r of remote) {
    const l = out.get(pk(r));
    if (!l) out.set(pk(r), r);
    else if (r.updatedAt > l.updatedAt) out.set(pk(r), r);
    else if (r.updatedAt === l.updatedAt && tie) out.set(pk(r), tie(l, r));
  }
  return [...out.values()];
}

const purge = <T extends Rec>(rows: T[], now: number) =>
  rows.filter((r) => !(r.deletedAt && r.deletedAt < now - TOMBSTONE_TTL));

/**
 * Per-record last-writer-wins merge. A missing `deletedAt` (legacy export) means live.
 * Idempotent: merging the same remote twice changes nothing but the revision.
 */
export function mergeSnapshots(local: Snapshot, remote: Snapshot, now: number): Snapshot {
  return {
    entries: purge(
      mergeTable(local.entries, remote.entries, (r) => r.id),
      now,
    ),
    habits: purge(
      mergeTable(local.habits, remote.habits, (r) => r.id),
      now,
    ),
    completions: purge(
      mergeTable(
        local.completions,
        remote.completions,
        (r) => `${r.habitId}:${r.dayKey}`,
        (l, r) => (r.value > l.value ? r : l),
      ),
      now,
    ),
    issues: mergeTable(local.issues, remote.issues, (r) => r.dayKey),
    settings: mergeTable(local.settings, remote.settings, () => "settings"),
    revision: Math.max(local.revision, remote.revision) + 1,
  };
}
