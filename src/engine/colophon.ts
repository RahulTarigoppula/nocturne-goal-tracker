import { hhmm } from "./daykey";

const WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
] as const;
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"] as const;
const TEENS = ["Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"] as const;

/** Counts up to 99 are words ("Seven", "Twenty-one"); from 100 upwards numerals. */
export function countWord(n: number): string {
  if (n >= 100 || n < 0) return String(n);
  if (n <= 12) return WORDS[n] ?? String(n);
  if (n < 20) return TEENS[n - 13] ?? String(n);
  const t = TENS[Math.floor(n / 10)] ?? "";
  const u = n % 10;
  return u === 0 ? t : `${t}-${(WORDS[u] ?? "").toLowerCase()}`;
}

export interface ColophonInput {
  issueNo: number;
  closedAt: number;
  total: number;
  streak: number;
  longest: number;
}

/** The exact colophon sentences, in print order. */
export function colophonLines(c: ColophonInput): string[] {
  const count = c.total === 1 ? "One entry." : `${countWord(c.total)} entries.`;
  const closed = c.issueNo === 1 ? `Closed. ${count}` : `Closed at ${hhmm(new Date(c.closedAt))}. ${count}`;
  const streakWord = `Streak ${c.streak} ${c.streak === 1 ? "day" : "days"}.`;
  const streak = c.longest > c.streak ? `${streakWord} Longest ${c.longest}.` : streakWord;
  return [`Issue No. ${c.issueNo}`, closed, streak, "Set in Bricolage Grotesque & Geist."];
}
