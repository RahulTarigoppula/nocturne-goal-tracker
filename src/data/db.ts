import Dexie, { type EntityTable } from "dexie";
import type { Completion, Entry, Habit, Issue, Meta, Settings } from "../engine/types";

export type SettingsRow = Settings & { key: "settings" };

export type NocturneDB = Dexie & {
  entries: EntityTable<Entry, "id">;
  habits: EntityTable<Habit, "id">;
  completions: EntityTable<Completion, "id">;
  issues: EntityTable<Issue, "dayKey">;
  settings: EntityTable<SettingsRow, "key">;
  meta: EntityTable<Meta, "key">;
};

export const SCHEMA_VERSION = 1;

export function openDb(name = "nocturne"): NocturneDB {
  const db = new Dexie(name) as NocturneDB;
  db.version(1).stores({
    entries: "id, bucket, when, status, seriesId, updatedAt, deletedAt, reminderAt, *tags, [bucket+when]",
    habits: "id, archivedAt, updatedAt",
    completions: "id, habitId, dayKey, [habitId+dayKey], updatedAt",
    issues: "dayKey, closedAt, updatedAt",
    settings: "key",
    meta: "key",
  });
  return db;
}

export const db: NocturneDB = openDb();
