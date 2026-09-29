export type DayKey = string & { readonly __dayKey: unique symbol };
export type Id = string;
export type Bucket = "today" | "upcoming" | "someday";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type RecurrenceMode = "fixed" | "afterCompletion";

export interface ChecklistItem {
  id: Id;
  text: string;
  done: boolean;
}

export interface Entry {
  id: Id;
  title: string;
  notes: string;
  status: "open" | "done";
  /** Derived from `when` at write time; only "someday" (no `when`) is ever read back. */
  bucket: Bucket;
  when?: DayKey;
  /** The day an overdue entry was originally filed for, kept when it rolls forward. */
  rolledFrom?: DayKey;
  evening: boolean;
  deadline?: DayKey;
  tags: string[];
  order: string;
  checklist: ChecklistItem[];
  recurrence?: Recurrence;
  reminderAt?: number;
  seriesId?: Id;
  instanceNo?: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  deletedAt?: number;
}

export type Recurrence =
  | { kind: "daily"; interval: number; mode: RecurrenceMode }
  | { kind: "weekdays"; mode: RecurrenceMode }
  | { kind: "weekly"; interval: number; days: Weekday[]; anchor: DayKey; mode: RecurrenceMode }
  | { kind: "monthly"; interval: number; day: number | "last"; mode: RecurrenceMode }
  | { kind: "yearly"; month: number; day: number; mode: RecurrenceMode };

export interface Habit {
  id: Id;
  title: string;
  frequency: { times: number; per: "day" | "week" };
  scheduleDays?: Weekday[];
  reminder?: { hour: number; minute: number };
  freezes: number;
  order: string;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  deletedAt?: number;
}

export interface Completion {
  id: Id;
  habitId: Id;
  dayKey: DayKey;
  value: number;
  frozen?: boolean;
  ts: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Issue {
  dayKey: DayKey;
  issueNo: number;
  total: number;
  done: number;
  closedAt?: number;
  standfirst?: string;
  streakAtClose?: number;
  updatedAt: number;
}

export interface Settings {
  theme: "night" | "proof" | "auto";
  eveningHour: number;
  dayRolloverHour: number;
  motion: "system" | "reduced";
  sound: { enabled: boolean; quietFrom: number; quietTo: number; master: number };
  dailyReview: { enabled: boolean; hour: number; minute: number };
  privateReminders: boolean;
  firstIssueDay: DayKey;
  readerName?: string;
  backup: { gistId?: string; lastBackupAt?: number; lastBackupRevision?: number; auto: boolean };
  onboardingDone: boolean;
  updatedAt: number;
}

export interface Meta {
  key: string;
  value: unknown;
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}
