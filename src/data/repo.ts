import { addDays, atLocal, todayKey } from "../engine/daykey";
import { deriveIssue } from "../engine/issue";
import { byOrder, keyAtEnd, keyForMove, needsRenumber, renumber } from "../engine/ordering";
import { spawnNext } from "../engine/recurrence";
import { issueStreak } from "../engine/streaks";
import type {
  Bucket,
  Completion,
  DayKey,
  Entry,
  Habit,
  Id,
  Issue,
  Recurrence,
  Settings,
  Weekday,
} from "../engine/types";
import { clock, newId } from "./clock";
import { db } from "./db";

export class NotOpenError extends Error {}

/* ------------------------------------------------------------------ settings */

export function defaultSettings(today: DayKey, now: number): Settings {
  return {
    theme: "night",
    eveningHour: 21,
    dayRolloverHour: 3,
    motion: "system",
    sound: { enabled: false, quietFrom: 23, quietTo: 8, master: 0.35 },
    dailyReview: { enabled: true, hour: 21, minute: 0 },
    privateReminders: false,
    firstIssueDay: today,
    backup: { auto: false },
    onboardingDone: false,
    updatedAt: now,
  };
}

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get("settings");
  if (row) {
    const { key: _key, ...s } = row;
    return s;
  }
  const now = clock.now();
  return defaultSettings(todayKey(new Date(now), 3), now);
}

export async function currentToday(): Promise<DayKey> {
  const s = await getSettings();
  return todayKey(new Date(clock.now()), s.dayRolloverHour);
}

/* ------------------------------------------------------------------ change hooks */

export type WriteKind = "entries" | "habits" | "settings" | "issues" | "import";
type Listener = (kind: WriteKind) => void;
const listeners = new Set<Listener>();
export function onWrite(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(kind: WriteKind) {
  for (const fn of listeners) {
    try {
      fn(kind);
    } catch {
      /* a failing side effect never breaks a write */
    }
  }
}

async function bumpRevision(): Promise<number> {
  const row = await db.meta.get("revision");
  const next = (typeof row?.value === "number" ? row.value : 0) + 1;
  await db.meta.put({ key: "revision", value: next });
  return next;
}

export async function getRevision(): Promise<number> {
  const row = await db.meta.get("revision");
  return typeof row?.value === "number" ? row.value : 0;
}

/* ------------------------------------------------------------------ issues */

const bucketFor = (when: DayKey | undefined, today: DayKey): Bucket =>
  !when ? "someday" : when <= today ? "today" : "upcoming";

async function dayEntries(dayKey: DayKey): Promise<Entry[]> {
  return (await db.entries.where("when").equals(dayKey).toArray()).filter((e) => !e.deletedAt);
}

/** Recompute and persist one day's issue. Returns the record before the change for undo. */
async function recomputeIssue(
  dayKey: DayKey,
  now: number,
): Promise<{ before: Issue | undefined; after: Issue | undefined }> {
  const s = await getSettings();
  const before = await db.issues.get(dayKey);
  const earlier = await db.issues.where("dayKey").below(dayKey).toArray();
  const streakBefore = issueStreak(earlier, dayKey);
  const after = deriveIssue(before, await dayEntries(dayKey), dayKey, s.firstIssueDay, now, streakBefore);
  if (after) await db.issues.put(after);
  else if (before) await db.issues.delete(dayKey);
  return { before, after };
}

/* ------------------------------------------------------------------ entries */

export interface NewEntry {
  title: string;
  notes?: string;
  when?: DayKey | undefined;
  evening?: boolean;
  deadline?: DayKey | undefined;
  tags?: string[];
  recurrence?: Recurrence | undefined;
  reminderAt?: number | undefined;
}

async function sectionKeys(when: DayKey | undefined, evening: boolean): Promise<string[]> {
  const rows = when
    ? await db.entries.where("when").equals(when).toArray()
    : await db.entries.where("bucket").equals("someday").toArray();
  return rows
    .filter((e) => !e.deletedAt && e.status === "open" && (when ? e.evening === evening : true))
    .sort(byOrder)
    .map((e) => e.order);
}

export async function addEntry(input: NewEntry): Promise<Entry> {
  const now = clock.now();
  const today = await currentToday();
  const evening = input.when ? (input.evening ?? false) : false;
  const title = input.title.trim();
  if (!title) throw new Error("An entry needs a title");
  return db.transaction("rw", db.entries, db.issues, db.meta, db.settings, async () => {
    const e: Entry = {
      id: newId(),
      title,
      notes: input.notes ?? "",
      status: "open",
      bucket: bucketFor(input.when, today),
      evening,
      tags: input.tags ?? [],
      order: keyAtEnd(await sectionKeys(input.when, evening)),
      checklist: [],
      createdAt: now,
      updatedAt: now,
    };
    if (input.when) e.when = input.when;
    if (input.deadline) e.deadline = input.deadline;
    if (input.recurrence) e.recurrence = input.recurrence;
    if (input.reminderAt) e.reminderAt = input.reminderAt;
    await db.entries.add(e);
    if (e.when) await recomputeIssue(e.when, now);
    await bumpRevision();
    emit("entries");
    return e;
  });
}

export type EntryPatch = Partial<
  Pick<Entry, "title" | "notes" | "tags" | "checklist" | "deadline" | "recurrence" | "reminderAt" | "evening">
>;

export async function updateEntry(id: Id, patch: EntryPatch): Promise<void> {
  const now = clock.now();
  await db.transaction("rw", db.entries, db.issues, db.meta, db.settings, async () => {
    const e = await db.entries.get(id);
    if (!e) return;
    const next: Entry = { ...e, ...patch, updatedAt: now };
    for (const k of ["deadline", "recurrence", "reminderAt"] as const)
      if (k in patch && patch[k] === undefined) delete next[k];
    if (next.title.trim() === "") next.title = e.title;
    await db.entries.put(next);
    if (e.when && patch.evening !== undefined && patch.evening !== e.evening) await recomputeIssue(e.when, now);
    await bumpRevision();
  });
  emit("entries");
}

export interface Undo {
  kind: "strike" | "delete" | "move";
  before: Entry;
  nextId?: Id;
  issues: { dayKey: DayKey; before: Issue | undefined }[];
  expiresAt: number;
}

export async function strike(entryId: Id): Promise<Undo> {
  const now = clock.now();
  const today = await currentToday();
  const u = await db.transaction("rw", db.entries, db.issues, db.meta, db.settings, async () => {
    const e = await db.entries.get(entryId);
    if (!e || e.status === "done" || e.deletedAt) throw new NotOpenError();
    const before = structuredClone(e);
    const done: Entry = { ...e, status: "done", completedAt: now, updatedAt: now };
    delete done.recurrence;
    await db.entries.put(done);
    let nextId: Id | undefined;
    const next = spawnNext(e, today, now, newId, "a0");
    if (next) {
      next.order = keyAtEnd(await sectionKeys(next.when, next.evening));
      next.bucket = bucketFor(next.when, today);
      await db.entries.add(next);
      nextId = next.id;
    }
    const day = e.when ?? today;
    const issues: Undo["issues"] = [];
    if (e.when) issues.push({ dayKey: day, before: (await recomputeIssue(day, now)).before });
    if (next?.when && next.when !== e.when)
      issues.push({ dayKey: next.when, before: (await recomputeIssue(next.when, now)).before });
    await bumpRevision();
    const undo: Undo = { kind: "strike", before, issues, expiresAt: now + 5000 };
    if (nextId) undo.nextId = nextId;
    return undo;
  });
  emit("entries");
  return u;
}

/** Reopen a done entry (from the entry sheet). */
export async function reopen(entryId: Id): Promise<void> {
  const now = clock.now();
  await db.transaction("rw", db.entries, db.issues, db.meta, db.settings, async () => {
    const e = await db.entries.get(entryId);
    if (e?.status !== "done") return;
    const next: Entry = { ...e, status: "open", updatedAt: now };
    delete next.completedAt;
    await db.entries.put(next);
    if (e.when) await recomputeIssue(e.when, now);
    await bumpRevision();
  });
  emit("entries");
}

export async function undo(u: Undo): Promise<void> {
  const now = clock.now();
  await db.transaction("rw", db.entries, db.issues, db.meta, async () => {
    await db.entries.put({ ...u.before, updatedAt: now });
    if (u.nextId) await db.entries.update(u.nextId, { deletedAt: now, updatedAt: now });
    for (const i of u.issues) {
      if (i.before) await db.issues.put(i.before);
      else await db.issues.delete(i.dayKey);
    }
    await bumpRevision();
  });
  emit("entries");
}

export type MoveTarget = { when: DayKey; evening: boolean } | "someday";

export async function moveTo(entryId: Id, target: MoveTarget): Promise<Undo | undefined> {
  const now = clock.now();
  const today = await currentToday();
  const u = await db.transaction("rw", db.entries, db.issues, db.meta, db.settings, async () => {
    const e = await db.entries.get(entryId);
    if (!e) return undefined;
    const before = structuredClone(e);
    const next: Entry = { ...e, updatedAt: now };
    delete next.rolledFrom;
    if (target === "someday") {
      delete next.when;
      delete next.reminderAt;
      next.evening = false;
      next.bucket = "someday";
    } else {
      next.when = target.when;
      next.evening = target.evening;
      next.bucket = bucketFor(target.when, today);
      if (e.reminderAt) {
        const t = new Date(e.reminderAt);
        next.reminderAt = atLocal(target.when, t.getHours(), t.getMinutes());
      }
    }
    const newWhen = target === "someday" ? undefined : target.when;
    const newEvening = target === "someday" ? false : target.evening;
    next.order = keyAtEnd(await sectionKeys(newWhen, newEvening));
    await db.entries.put(next);
    const issues: Undo["issues"] = [];
    if (e.when) issues.push({ dayKey: e.when, before: (await recomputeIssue(e.when, now)).before });
    if (newWhen && newWhen !== e.when)
      issues.push({ dayKey: newWhen, before: (await recomputeIssue(newWhen, now)).before });
    await bumpRevision();
    return { kind: "move", before, issues, expiresAt: now + 5000 } satisfies Undo;
  });
  emit("entries");
  return u;
}

/** Place `entryId` at `index` of `siblings` (the section's open entries, excluding it). One record written. */
export async function reorder(entryId: Id, siblings: { id: Id; order: string }[], index: number): Promise<void> {
  const now = clock.now();
  await db.transaction("rw", db.entries, db.meta, async () => {
    const list = siblings.filter((s) => s.id !== entryId);
    const order = keyForMove(list, Math.max(0, Math.min(index, list.length)));
    await db.entries.update(entryId, { order, updatedAt: now });
    if (needsRenumber([order])) {
      const all = [...list];
      all.splice(index, 0, { id: entryId, order });
      const keys = renumber(all.length);
      await Promise.all(all.map((s, i) => db.entries.update(s.id, { order: keys[i] as string, updatedAt: now })));
    }
    await bumpRevision();
  });
  emit("entries");
}

export async function deleteEntry(entryId: Id): Promise<Undo | undefined> {
  const now = clock.now();
  const u = await db.transaction("rw", db.entries, db.issues, db.meta, db.settings, async () => {
    const e = await db.entries.get(entryId);
    if (!e) return undefined;
    const before = structuredClone(e);
    await db.entries.update(entryId, { deletedAt: now, updatedAt: now });
    const issues: Undo["issues"] = [];
    if (e.when) issues.push({ dayKey: e.when, before: (await recomputeIssue(e.when, now)).before });
    await bumpRevision();
    return { kind: "delete", before, issues, expiresAt: now + 5000 } satisfies Undo;
  });
  emit("entries");
  return u;
}

/**
 * Overdue roll-forward: open entries filed before today move onto today's issue, remembering the day
 * they were first filed for (the "OVERDUE FRI" meta). Past issues keep their record as it stood.
 */
export async function rollForward(today: DayKey): Promise<number> {
  const now = clock.now();
  const stale = (await db.entries.where("when").below(today).toArray()).filter(
    (e) => e.status === "open" && !e.deletedAt,
  );
  const upcomingNowDue = (await db.entries.where("bucket").equals("upcoming").toArray()).filter(
    (e) => e.when && e.when <= today,
  );
  if (stale.length === 0 && upcomingNowDue.length === 0) return 0;
  await db.transaction("rw", db.entries, db.issues, db.meta, db.settings, async () => {
    const keys = await sectionKeys(today, false);
    const staleIds = new Set(stale.map((e) => e.id));
    for (const e of upcomingNowDue) if (!staleIds.has(e.id)) await db.entries.update(e.id, { bucket: "today" });
    let last = keys.at(-1) ?? null;
    for (const e of stale.sort(byOrder)) {
      const order = keyAtEnd(last ? [last] : []);
      last = order;
      await db.entries.update(e.id, {
        when: today,
        rolledFrom: e.rolledFrom ?? (e.when as DayKey),
        bucket: "today",
        evening: false,
        order,
        updatedAt: now,
      });
    }
    if (stale.length) await recomputeIssue(today, now);
    await bumpRevision();
  });
  if (stale.length) emit("entries");
  return stale.length;
}

/* ------------------------------------------------------------------ habits */

export async function addHabit(title: string, scheduleDays?: Weekday[]): Promise<Habit> {
  const now = clock.now();
  const t = title.trim();
  if (!t) throw new Error("A habit needs a title");
  const h = await db.transaction("rw", db.habits, db.meta, async () => {
    const keys = (await db.habits.toArray())
      .filter((x) => !x.deletedAt)
      .sort(byOrder)
      .map((x) => x.order);
    const habit: Habit = {
      id: newId(),
      title: t,
      frequency: { times: 1, per: "day" },
      freezes: 0,
      order: keyAtEnd(keys),
      createdAt: now,
      updatedAt: now,
    };
    if (scheduleDays?.length) habit.scheduleDays = scheduleDays;
    await db.habits.add(habit);
    await bumpRevision();
    return habit;
  });
  emit("habits");
  return h;
}

export async function updateHabit(
  id: Id,
  patch: Partial<Pick<Habit, "title" | "scheduleDays" | "reminder">>,
): Promise<void> {
  const now = clock.now();
  await db.transaction("rw", db.habits, db.meta, async () => {
    const h = await db.habits.get(id);
    if (!h) return;
    const next: Habit = { ...h, ...patch, updatedAt: now };
    if ("scheduleDays" in patch && !patch.scheduleDays?.length) delete next.scheduleDays;
    if ("reminder" in patch && !patch.reminder) delete next.reminder;
    await db.habits.put(next);
    await bumpRevision();
  });
  emit("habits");
}

export async function archiveHabit(id: Id, archived: boolean): Promise<void> {
  const now = clock.now();
  await db.transaction("rw", db.habits, db.meta, async () => {
    const h = await db.habits.get(id);
    if (!h) return;
    const next: Habit = { ...h, updatedAt: now };
    if (archived) next.archivedAt = now;
    else delete next.archivedAt;
    await db.habits.put(next);
    await bumpRevision();
  });
  emit("habits");
}

export async function deleteHabit(id: Id): Promise<void> {
  const now = clock.now();
  await db.transaction("rw", db.habits, db.meta, async () => {
    await db.habits.update(id, { deletedAt: now, updatedAt: now });
    await bumpRevision();
  });
  emit("habits");
}

/** Tap = complete today; tap again = un-complete. Never a double completion (deterministic id). */
export async function toggleCompletion(habitId: Id, dayKey: DayKey): Promise<boolean> {
  const now = clock.now();
  const id = `${habitId}:${dayKey}`;
  const done = await db.transaction("rw", db.completions, db.meta, async () => {
    const c = await db.completions.get(id);
    const live = c && !c.deletedAt && c.value > 0;
    if (live) {
      await db.completions.put({ ...c, deletedAt: now, updatedAt: now });
    } else {
      const row: Completion = { id, habitId, dayKey, value: 1, ts: now, updatedAt: now };
      await db.completions.put(row);
    }
    await bumpRevision();
    return !live;
  });
  emit("habits");
  return done;
}

/** Spend this week's freeze token on a missed day: the streak survives, the strength score is untouched. */
export async function freezeDay(habitId: Id, dayKey: DayKey): Promise<void> {
  const now = clock.now();
  await db.transaction("rw", db.completions, db.meta, async () => {
    const id = `${habitId}:${dayKey}`;
    const c = await db.completions.get(id);
    if (c && !c.deletedAt && c.value > 0) return;
    await db.completions.put({ id, habitId, dayKey, value: 0, frozen: true, ts: now, updatedAt: now });
    await bumpRevision();
  });
  emit("habits");
}

export async function setFrequency(id: Id, frequency: Habit["frequency"]): Promise<void> {
  const now = clock.now();
  await db.transaction("rw", db.habits, db.meta, async () => {
    const h = await db.habits.get(id);
    if (!h) return;
    const next: Habit = { ...h, frequency, updatedAt: now };
    if (frequency.per === "week") delete next.scheduleDays;
    await db.habits.put(next);
    await bumpRevision();
  });
  emit("habits");
}

/* ------------------------------------------------------------------ issues & settings */

export async function setStandfirst(dayKey: DayKey, text: string): Promise<void> {
  const now = clock.now();
  await db.transaction("rw", db.issues, db.meta, async () => {
    const i = await db.issues.get(dayKey);
    if (!i) return;
    const next: Issue = { ...i, updatedAt: now };
    const t = text.trim();
    if (t) next.standfirst = t;
    else delete next.standfirst;
    await db.issues.put(next);
    await bumpRevision();
  });
  emit("issues");
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const now = clock.now();
  const s = await db.transaction("rw", db.settings, db.meta, async () => {
    const cur = await getSettings();
    const next: Settings = { ...cur, ...patch, updatedAt: now };
    if ("readerName" in patch && !patch.readerName?.trim()) delete next.readerName;
    await db.settings.put({ ...next, key: "settings" });
    await bumpRevision();
    return next;
  });
  emit("settings");
  return s;
}

/* ------------------------------------------------------------------ first launch */

export const TEACHING_ENTRIES = [
  "Swipe me right when I'm done",
  "Swipe me left to move me",
  "Hold me to change the order",
] as const;

/** First launch: settings with firstIssueDay = today and Issue No. 1 with the three teaching entries. */
export async function ensureSeed(): Promise<{ seeded: boolean; settings: Settings }> {
  const existing = await db.settings.get("settings");
  if (existing) {
    const { key: _k, ...s } = existing;
    return { seeded: false, settings: s };
  }
  const now = clock.now();
  const today = todayKey(new Date(now), 3);
  const settings = defaultSettings(today, now);
  await db.transaction("rw", db.settings, db.entries, db.issues, db.meta, async () => {
    if (await db.settings.get("settings")) return;
    await db.settings.put({ ...settings, key: "settings" });
    const keys = renumber(TEACHING_ENTRIES.length);
    for (const [i, title] of TEACHING_ENTRIES.entries()) {
      await db.entries.add({
        id: newId(),
        title,
        notes: "",
        status: "open",
        bucket: "today",
        when: today,
        evening: false,
        tags: [],
        order: keys[i] as string,
        checklist: [],
        createdAt: now + i,
        updatedAt: now + i,
      });
    }
    await recomputeIssue(today, now);
    await db.meta.put({ key: "schemaVersion", value: 1 });
    await bumpRevision();
  });
  return { seeded: true, settings };
}

export const tomorrowOf = (k: DayKey): DayKey => addDays(k, 1);
