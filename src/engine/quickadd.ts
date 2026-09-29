import { addDays, atLocal, localKey, parseKey, runningDate, weekdayOf } from "./daykey";
import { firstOnOrAfter } from "./recurrence";
import type { DayKey, Recurrence, Weekday } from "./types";

/** The slice of chrono-node the parser needs; injected so chrono stays a lazy chunk and the engine stays pure. */
export interface ChronoComponent {
  isCertain(c: "hour" | "day" | "weekday" | "meridiem" | "minute" | "month"): boolean;
  date(): Date;
}
export interface ChronoResult {
  index: number;
  text: string;
  start: ChronoComponent;
}
export type ChronoParse = (text: string, ref: Date, opt: { forwardDate: boolean }) => ChronoResult[];

export type ChipKind = "when" | "time" | "deadline" | "repeat" | "tag" | "evening";
export interface Chip {
  kind: ChipKind;
  /** Exactly the source text: input.slice(span[0], span[1]). */
  text: string;
  /** What the chip shows (upper-case, with the resolved day when it differs from the words). */
  label: string;
  span: [number, number];
}

export interface Parsed {
  title: string;
  when?: DayKey;
  time?: { hour: number; minute: number };
  reminderAt?: number;
  deadline?: DayKey;
  recurrence?: Recurrence;
  tags: string[];
  evening: boolean;
  chips: Chip[];
}

export interface ParseOptions {
  /** Chip keys (`kind@start`) the user tapped to discard. */
  ignore?: ReadonlySet<string>;
  rolloverHour?: number;
}

export const chipKey = (c: Pick<Chip, "kind" | "span">): string => `${c.kind}@${c.span[0]}`;

const DAY_RE = "(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*";
const EVERY = new RegExp(
  `\\bevery\\s+(day|weekday|week|month|year|other\\s+day|(\\d+)\\s+(days?|weeks?|months?)|${DAY_RE}(?:(?:\\s*,\\s*|\\s+and\\s+|\\s*\\/\\s*)${DAY_RE})*)\\b(\\s+on\\s+the\\s+(\\d{1,2})(?:st|nd|rd|th)\\b|\\s+on\\s+the\\s+last(?:\\s+day)?\\b)?(\\s+after\\s+done)?`,
  "i",
);
const TAG = /(^|\s)#([\p{L}\p{N}_-]+)/gu;
const BY = /\b(by|due)\s+([^#]+?)(?=\s+#|\s+every\b|\s*$)/i;
const EVENING = /\b(tonight|this\s+evening)\b/i;
const TODAY = /\btoday\b/i;
const DAY_INDEX: Record<string, Weekday> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const mask = (s: string, [a, b]: [number, number]) => s.slice(0, a) + " ".repeat(b - a) + s.slice(b);

function recurrenceFrom(m: RegExpExecArray, anchor: DayKey): Recurrence | undefined {
  const unit = (m[1] ?? "").toLowerCase().replace(/\s+/g, " ");
  const mode = m[6] ? "afterCompletion" : "fixed";
  const n = m[2] ? Number(m[2]) : 1;
  const onDay = m[5] ? Number(m[5]) : m[4] ? "last" : undefined;
  if (onDay !== undefined && typeof onDay === "number" && (onDay < 1 || onDay > 31)) return undefined;
  if (n < 1) return undefined;
  if (unit === "day") return { kind: "daily", interval: 1, mode };
  if (unit === "other day") return { kind: "daily", interval: 2, mode };
  if (unit === "weekday") return { kind: "weekdays", mode };
  if (unit === "week") return { kind: "weekly", interval: 1, days: [], anchor, mode };
  if (unit === "month") return { kind: "monthly", interval: 1, day: onDay ?? parseKey(anchor).d, mode };
  if (unit === "year") {
    const { m: mo, d } = parseKey(anchor);
    return { kind: "yearly", month: mo, day: d, mode };
  }
  if (m[3]) {
    const u = m[3].toLowerCase();
    if (u.startsWith("day")) return { kind: "daily", interval: n, mode };
    if (u.startsWith("week")) return { kind: "weekly", interval: n, days: [], anchor, mode };
    return { kind: "monthly", interval: n, day: onDay ?? parseKey(anchor).d, mode };
  }
  const days = [...unit.matchAll(new RegExp(DAY_RE, "gi"))]
    .map((d) => DAY_INDEX[d[0].slice(0, 3).toLowerCase()])
    .filter((d): d is Weekday => d !== undefined);
  if (days.length === 0) return undefined;
  return { kind: "weekly", interval: 1, days: [...new Set(days)].sort(), anchor, mode };
}

/** A bare number ("at 5", "3") is never a time: it needs a colon, am/pm, or a day word. */
function isTrustworthy(r: ChronoResult): boolean {
  const s = r.start;
  if (s.isCertain("day") || s.isCertain("weekday") || s.isCertain("month")) return true;
  return s.isCertain("meridiem") || /\d:\d{2}/.test(r.text) || /\b(noon|midnight|morning|afternoon)\b/i.test(r.text);
}

function labelFor(r: ChronoResult, when: DayKey, today: DayKey): string {
  const words = r.text.toUpperCase().replace(/\s+/g, " ").trim();
  const namesDay = r.start.isCertain("day") || r.start.isCertain("weekday") || /\b(today|tomorrow)\b/i.test(r.text);
  if (namesDay || when === today) return words;
  return `${words} · ${when === addDays(today, 1) ? "TOMORROW" : runningDate(when)}`;
}

/**
 * Deterministic quick-add ladder. Each rung consumes a span (masked with spaces so every chip span is
 * in the original string's coordinates) and records a chip.
 */
export function parseQuickAdd(input: string, now: Date, chrono: ChronoParse | null, opts: ParseOptions = {}): Parsed {
  const ignore = opts.ignore ?? new Set<string>();
  const today = (() => {
    const roll = opts.rolloverHour ?? 0;
    return now.getHours() >= roll ? localKey(now) : addDays(localKey(now), -1);
  })();
  const chips: Chip[] = [];
  let work = input;
  const take = (kind: ChipKind, span: [number, number], label?: string): boolean => {
    const chip: Chip = { kind, text: input.slice(span[0], span[1]), label: label ?? "", span };
    if (ignore.has(chipKey(chip))) return false;
    chip.label = label ?? chip.text.toUpperCase().replace(/\s+/g, " ");
    chips.push(chip);
    work = mask(work, span);
    return true;
  };

  let recurrence: Recurrence | undefined;
  let when: DayKey | undefined;
  let time: { hour: number; minute: number } | undefined;
  let deadline: DayKey | undefined;
  let evening = false;
  const tags: string[] = [];

  // 1. recurrence FIRST, so chrono never sees "every monday"
  const ev = EVERY.exec(work);
  if (ev) {
    const probe = recurrenceFrom(ev, today);
    if (probe && take("repeat", [ev.index, ev.index + ev[0].length])) recurrence = probe;
  }

  // 2. #tags
  for (const m of [...work.matchAll(TAG)]) {
    const start = (m.index ?? 0) + (m[1]?.length ?? 0);
    const tag = (m[2] ?? "").toLowerCase();
    if (take("tag", [start, start + 1 + (m[2]?.length ?? 0)]) && !tags.includes(tag)) tags.push(tag);
  }

  // 2b. tonight / this evening → today + evening flag
  const evm = EVENING.exec(work);
  if (evm && take("evening", [evm.index, evm.index + evm[0].length])) {
    evening = true;
    when = today;
  }

  if (chrono) {
    // 3. deadline: "by friday" / "due 12 sep"
    const by = BY.exec(work);
    if (by) {
      const captured = (by[2] ?? "").trimEnd();
      const start = by.index + by[0].length - (by[2]?.length ?? 0);
      const res = chrono(captured, now, { forwardDate: true })[0];
      if (res && res.index === 0 && res.text.length === captured.length && isTrustworthy(res)) {
        const d = localKey(res.start.date());
        if (take("deadline", [by.index, start + captured.length], `DUE ${runningDate(d)}`)) deadline = d;
      }
    }

    // 4. remaining text → when (+ time when the hour is certain)
    const found = chrono(work, now, { forwardDate: true }).find(isTrustworthy);
    if (found) {
      const date = found.start.date();
      const hasTime = found.start.isCertain("hour");
      const dayKey = localKey(date);
      if (take("when", [found.index, found.index + found.text.length], labelFor(found, dayKey, today))) {
        when = dayKey < today ? today : dayKey;
        if (hasTime) time = { hour: date.getHours(), minute: date.getMinutes() };
      }
    }
  }

  // 4b. a bare "today" chrono missed (or no chrono loaded yet)
  if (!when) {
    const t = TODAY.exec(work);
    if (t && take("when", [t.index, t.index + t[0].length])) when = today;
  }

  // 5. recurrence anchoring: weekly with no days takes `when`'s weekday; the first instance sits on a scheduled day.
  if (recurrence) {
    const base = when ?? today;
    if (recurrence.kind === "weekly") {
      recurrence = {
        ...recurrence,
        anchor: base,
        days: recurrence.days.length ? recurrence.days : [weekdayOf(base)],
      };
    } else if (recurrence.kind === "monthly" && !ev?.[4] && !ev?.[5]) {
      recurrence = { ...recurrence, day: parseKey(base).d };
    } else if (recurrence.kind === "yearly") {
      const { m, d } = parseKey(base);
      recurrence = { ...recurrence, month: m, day: d };
    }
    const first = firstOnOrAfter(recurrence, base);
    if (first !== when) when = first;
  }

  let title = work
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+\b(on|at|for)$/i, "")
    .trim();
  if (!title) {
    return { title: input.replace(/\s+/g, " ").trim(), tags: [], evening: false, chips: [] };
  }
  title = title.replace(/^(on|at)\s+/i, "");

  const out: Parsed = { title, tags, evening, chips: chips.sort((a, b) => a.span[0] - b.span[0]) };
  if (when) out.when = when;
  if (time) {
    out.time = time;
    out.reminderAt = atLocal(when ?? today, time.hour, time.minute);
  }
  if (deadline) out.deadline = deadline;
  if (recurrence) out.recurrence = recurrence;
  return out;
}
