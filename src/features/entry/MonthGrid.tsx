import { useState } from "react";
import { addDays, daysInMonth, MONTHS, parseKey, toKey, weekdayOf } from "../../engine/daykey";
import type { DayKey } from "../../engine/types";

interface Props {
  today: DayKey;
  value?: DayKey | undefined;
  onPick: (k: DayKey) => void;
  allowPast?: boolean;
}

const HEAD = ["M", "T", "W", "T", "F", "S", "S"];

export function MonthGrid({ today, value, onPick, allowPast = false }: Props) {
  const start = parseKey(value ?? today);
  const [ym, setYm] = useState({ y: start.y, m: start.m });
  const first = toKey(ym.y, ym.m, 1);
  const lead = (weekdayOf(first) + 6) % 7;
  const n = daysInMonth(ym.y, ym.m);
  const shift = (d: number) =>
    setYm(({ y, m }) => {
      const t = m + d;
      return t < 1 ? { y: y - 1, m: 12 } : t > 12 ? { y: y + 1, m: 1 } : { y, m: t };
    });
  return (
    <div>
      <div className="month-nav">
        <button type="button" className="btn-text" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <span className="rh">
          {MONTHS[ym.m - 1]} {ym.y}
        </span>
        <button type="button" className="btn-text" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="month-grid">
        {HEAD.map((h, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed weekday header
          <span key={i} className="h" aria-hidden="true">
            {h}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: leading blanks
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: n }, (_, i) => {
          const k = addDays(first, i);
          return (
            <button
              key={k}
              type="button"
              disabled={!allowPast && k < today}
              aria-current={k === today ? "date" : undefined}
              aria-pressed={k === value}
              onClick={() => onPick(k)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
