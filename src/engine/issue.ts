import { issueNumber } from "./daykey";
import type { DayKey, Entry, Issue } from "./types";

/**
 * Recompute a day's issue from its entries. Closing needs >= 1 entry and all done; a closed day that
 * gains an open entry reopens (closedAt clears, standfirst survives); re-closing stamps a fresh time.
 * Returns undefined when the day has no live entries and never had a standfirst worth keeping.
 */
export function deriveIssue(
  prev: Issue | undefined,
  dayEntries: Entry[],
  dayKey: DayKey,
  firstIssueDay: DayKey,
  now: number,
  streakBefore: number,
): Issue | undefined {
  const live = dayEntries.filter((e) => !e.deletedAt);
  const total = live.length;
  const done = live.filter((e) => e.status === "done").length;
  if (total === 0 && !prev?.standfirst) return undefined;
  const shouldClose = total >= 1 && done === total;
  const issue: Issue = { dayKey, issueNo: issueNumber(dayKey, firstIssueDay), total, done, updatedAt: now };
  if (shouldClose) {
    issue.closedAt = prev?.closedAt ?? now;
    issue.streakAtClose = prev?.closedAt ? (prev.streakAtClose ?? streakBefore + 1) : streakBefore + 1;
  }
  if (prev?.standfirst) issue.standfirst = prev.standfirst;
  return issue;
}

export const shouldPrintColophon = (dayEntries: Entry[]): boolean => {
  const live = dayEntries.filter((e) => !e.deletedAt);
  return live.length > 0 && live.every((e) => e.status === "done");
};
