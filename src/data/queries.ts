import { useLiveQuery } from "dexie-react-hooks";
import { addDays } from "../engine/daykey";
import { longestIssueStreak } from "../engine/streaks";
import type { Completion, DayKey, Entry, Habit, Issue, Settings } from "../engine/types";
import { db } from "./db";

/** Read-side hooks. Components read through these; every write goes through repo.ts. */

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const row = await db.settings.get("settings");
    if (!row) return undefined;
    const { key: _k, ...s } = row;
    return s;
  });
}

export function useDayEntries(dayKey: DayKey | null): Entry[] | undefined {
  return useLiveQuery(
    async () => (dayKey ? (await db.entries.where("when").equals(dayKey).toArray()).filter((e) => !e.deletedAt) : []),
    [dayKey],
  );
}

export function useRangeEntries(from: DayKey | null, days: number): Entry[] | undefined {
  return useLiveQuery(async () => {
    if (!from) return [];
    const to = addDays(from, days - 1);
    return (await db.entries.where("when").between(from, to, true, true).toArray()).filter((e) => !e.deletedAt);
  }, [from, days]);
}

export function useSomeday(): Entry[] | undefined {
  return useLiveQuery(async () =>
    (await db.entries.where("bucket").equals("someday").toArray()).filter((e) => !e.deletedAt && !e.when),
  );
}

export function useEntry(id: string | null): Entry | undefined {
  return useLiveQuery(async () => (id ? await db.entries.get(id) : undefined), [id]);
}

export function useIssue(dayKey: DayKey | null): Issue | undefined | null {
  return useLiveQuery(async () => (dayKey ? ((await db.issues.get(dayKey)) ?? null) : null), [dayKey]);
}

export function useIssues(): Issue[] | undefined {
  return useLiveQuery(() => db.issues.orderBy("dayKey").reverse().toArray());
}

export function useHabits(): Habit[] | undefined {
  return useLiveQuery(async () => (await db.habits.toArray()).filter((h) => !h.deletedAt));
}

export function useCompletions(): Completion[] | undefined {
  return useLiveQuery(async () =>
    (await db.completions.toArray()).filter((c) => !c.deletedAt && (c.value > 0 || c.frozen)),
  );
}

/** Days in a range that have at least one live entry (mini calendar dots). */
export function useDaysWithEntries(from: DayKey, to: DayKey): Set<string> | undefined {
  return useLiveQuery(async () => {
    const rows = await db.entries.where("when").between(from, to, true, true).toArray();
    return new Set(rows.filter((e) => !e.deletedAt).map((e) => e.when as string));
  }, [from, to]);
}

export async function searchAll(q: string): Promise<{ entries: Entry[]; habits: Habit[]; issues: Issue[] }> {
  const needle = q.trim().toLowerCase();
  if (!needle) return { entries: [], habits: [], issues: [] };
  const [entries, habits, issues] = await Promise.all([
    db.entries
      .filter((e) => !e.deletedAt && (e.title.toLowerCase().includes(needle) || e.tags.some((t) => t.includes(needle))))
      .limit(20)
      .toArray(),
    db.habits
      .filter((h) => !h.deletedAt && h.title.toLowerCase().includes(needle))
      .limit(10)
      .toArray(),
    db.issues
      .filter((i) => !!i.standfirst?.toLowerCase().includes(needle) || String(i.issueNo) === needle)
      .limit(10)
      .toArray(),
  ]);
  return { entries, habits, issues };
}

/** One issue with its entries and the longest issue streak — for the share card. */
export async function loadIssue(dayKey: DayKey): Promise<{ issue: Issue; entries: Entry[]; longest: number } | null> {
  const issue = await db.issues.get(dayKey);
  if (!issue) return null;
  const entries = (await db.entries.where("when").equals(dayKey).toArray()).filter((e) => !e.deletedAt);
  return { issue, entries, longest: longestIssueStreak(await db.issues.toArray()) };
}
