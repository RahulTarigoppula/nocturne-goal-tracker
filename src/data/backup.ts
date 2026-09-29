import { localKey } from "../engine/daykey";
import { mergeSnapshots, type Snapshot } from "../engine/merge";
import type { Completion, Entry, Habit, Issue, Settings } from "../engine/types";
import { clock } from "./clock";
import { db, SCHEMA_VERSION } from "./db";
import { getRevision, notifyImported } from "./repo";

export interface BackupFile {
  format: "nocturne-backup";
  version: 1;
  schema: number;
  app: string;
  revision: number;
  exportedAt: number;
  data: {
    entries: Entry[];
    habits: Habit[];
    completions: Completion[];
    issues: Issue[];
    settings: Settings[];
  };
}

export class BackupError extends Error {}

export async function snapshot(): Promise<Snapshot> {
  const [entries, habits, completions, issues, settingsRows, revision] = await Promise.all([
    db.entries.toArray(),
    db.habits.toArray(),
    db.completions.toArray(),
    db.issues.toArray(),
    db.settings.toArray(),
    getRevision(),
  ]);
  const settings = settingsRows.map(({ key: _k, ...s }) => s);
  return { entries, habits, completions, issues, settings, revision };
}

/** Build the backup document. Tokens live outside the database, so they can never be exported. */
export async function exportAll(app: string): Promise<BackupFile> {
  const s = await snapshot();
  return {
    format: "nocturne-backup",
    version: 1,
    schema: SCHEMA_VERSION,
    app,
    revision: s.revision,
    exportedAt: clock.now(),
    data: {
      entries: s.entries,
      habits: s.habits,
      completions: s.completions,
      issues: s.issues,
      settings: s.settings,
    },
  };
}

export const backupFileName = (now: number): string => `nocturne-${localKey(new Date(now))}.json`;

/** Validate the header first; a bad file changes nothing. */
export function parseBackup(text: string): BackupFile {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new BackupError("Not a Nocturne backup");
  }
  const d = doc as Partial<BackupFile> | null;
  if (d?.format !== "nocturne-backup" || typeof d.data !== "object" || !d.data) {
    throw new BackupError("Not a Nocturne backup");
  }
  if (typeof d.schema !== "number" || d.schema > SCHEMA_VERSION) {
    throw new BackupError(`Backup is from a newer edition (schema ${d.schema}); update the app first.`);
  }
  const data = d.data as Partial<BackupFile["data"]>;
  for (const t of ["entries", "habits", "completions", "issues", "settings"] as const) {
    if (!Array.isArray(data[t])) throw new BackupError("Not a Nocturne backup");
  }
  return d as BackupFile;
}

export type Progress = (done: number, total: number) => void;

/** Replace everything with the backup's contents, in one transaction, reporting progress. */
export async function importAll(file: BackupFile, onProgress?: Progress): Promise<void> {
  const { entries, habits, completions, issues, settings } = file.data;
  const total = entries.length + habits.length + completions.length + issues.length + settings.length;
  let done = 0;
  const step = Math.max(1, Math.ceil(total / 10));
  await db.transaction("rw", [db.entries, db.habits, db.completions, db.issues, db.settings, db.meta], async () => {
    await Promise.all([
      db.entries.clear(),
      db.habits.clear(),
      db.completions.clear(),
      db.issues.clear(),
      db.settings.clear(),
    ]);
    const put = async <T>(rows: T[], fn: (chunk: T[]) => Promise<unknown>) => {
      for (let i = 0; i < rows.length; i += step) {
        const chunk = rows.slice(i, i + step);
        await fn(chunk);
        done += chunk.length;
        onProgress?.(done, total);
      }
    };
    await put(entries, (c) => db.entries.bulkPut(c));
    await put(habits, (c) => db.habits.bulkPut(c));
    await put(completions, (c) => db.completions.bulkPut(c));
    await put(issues, (c) => db.issues.bulkPut(c));
    await put(
      settings.map((s) => ({ ...s, updatedAt: s.updatedAt ?? 0, key: "settings" as const })),
      (c) => db.settings.bulkPut(c),
    );
    await db.meta.put({ key: "revision", value: Math.max(file.revision, 0) + 1 });
  });
  onProgress?.(total, total);
  notifyImported();
}

/** Merge a remote backup into local data (per-record last-writer-wins). */
export async function mergeRemote(file: BackupFile): Promise<Snapshot> {
  const local = await snapshot();
  const remote: Snapshot = { ...file.data, revision: file.revision };
  const merged = mergeSnapshots(local, remote, clock.now());
  await db.transaction("rw", [db.entries, db.habits, db.completions, db.issues, db.settings, db.meta], async () => {
    await Promise.all([db.entries.clear(), db.habits.clear(), db.completions.clear(), db.issues.clear()]);
    await db.entries.bulkPut(merged.entries);
    await db.habits.bulkPut(merged.habits);
    await db.completions.bulkPut(merged.completions);
    await db.issues.bulkPut(merged.issues);
    const s = merged.settings[0];
    if (s) await db.settings.put({ ...s, key: "settings" });
    await db.meta.put({ key: "revision", value: merged.revision });
    await db.meta.put({ key: "lastSyncAt", value: clock.now() });
  });
  notifyImported();
  return merged;
}

/** Markdown export — for reading, not restoring. */
export function toMarkdown(file: BackupFile): string {
  const lines = ["# Nocturne", "", "_For reading, not restoring. Use the JSON export to restore._", ""];
  const byDay = new Map<string, Entry[]>();
  for (const e of file.data.entries) {
    if (e.deletedAt) continue;
    const k = e.when ?? "someday";
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const issues = new Map(file.data.issues.map((i) => [i.dayKey as string, i]));
  for (const day of [...byDay.keys()].sort().reverse()) {
    const i = issues.get(day);
    lines.push(
      day === "someday" ? "## Someday" : `## ${day}${i ? ` — No. ${i.issueNo} · ${i.done} / ${i.total}` : ""}`,
    );
    if (i?.standfirst) lines.push("", `> ${i.standfirst}`);
    lines.push("");
    for (const e of byDay.get(day) ?? []) {
      const tags = e.tags.length ? ` ${e.tags.map((t) => `#${t}`).join(" ")}` : "";
      lines.push(`- [${e.status === "done" ? "x" : " "}] ${e.title}${tags}`);
    }
    lines.push("");
  }
  const habits = file.data.habits.filter((h) => !h.deletedAt);
  if (habits.length) {
    lines.push("## Habits", "", "| Habit | Completions |", "|---|---|");
    for (const h of habits) {
      const n = file.data.completions.filter((c) => c.habitId === h.id && !c.deletedAt && c.value > 0).length;
      lines.push(`| ${h.title.replace(/\|/g, "\\|")} | ${n} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
