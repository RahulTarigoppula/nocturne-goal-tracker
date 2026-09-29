import { hhmm, runningDate, weekdayShort } from "../../engine/daykey";
import type { DayKey, Entry } from "../../engine/types";

export interface MetaPart {
  text: string;
  tone?: "over" | "closed";
}

/** Is this entry overdue relative to `today`? (rolled forward, or past its deadline) */
export const isOverdue = (e: Entry, today: DayKey): boolean =>
  e.status === "open" && (!!e.rolledFrom || (!!e.deadline && e.deadline < today));

/** The mono meta line under a title: time · tags · deadline/overdue · closed HH:MM. */
export function metaParts(e: Entry, today: DayKey): MetaPart[] {
  const parts: MetaPart[] = [];
  if (e.status === "open" && e.reminderAt) parts.push({ text: hhmm(new Date(e.reminderAt)) });
  for (const t of e.tags) parts.push({ text: `#${t}` });
  if (e.status === "open") {
    if (e.deadline && e.deadline < today)
      parts.push({ text: `Overdue ${runningDate(e.deadline).slice(0, 6)}`, tone: "over" });
    else if (e.rolledFrom) parts.push({ text: `Overdue ${weekdayShort(e.rolledFrom)}`, tone: "over" });
    else if (e.deadline) parts.push({ text: e.deadline === today ? "Due today" : `Due ${runningDate(e.deadline)}` });
  }
  if (e.recurrence && e.status === "open") parts.push({ text: "Repeats" });
  if (e.checklist.length) parts.push({ text: `${e.checklist.filter((c) => c.done).length}/${e.checklist.length}` });
  if (e.status === "done" && e.completedAt)
    parts.push({ text: `closed ${hhmm(new Date(e.completedAt))}`, tone: "closed" });
  return parts;
}

export function ariaFor(e: Entry, folio: number | null, today: DayKey): string {
  const meta = metaParts(e, today)
    .map((p) => p.text)
    .join(", ");
  const n = folio ? `entry ${folio}, ` : "";
  return e.status === "done"
    ? `Done, ${e.title}${meta ? `, ${meta}` : ""}`
    : `Mark done, ${n}${e.title}${meta ? `, ${meta}` : ""}`;
}
