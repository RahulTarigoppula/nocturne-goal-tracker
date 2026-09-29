import { memo } from "react";
import { addDays, localKey, parseKey, startOfWeek } from "../../engine/daykey";
import { scheduled } from "../../engine/streaks";
import type { DayKey, Habit } from "../../engine/types";

interface Props {
  habit: Habit;
  done: Set<DayKey>;
  frozen: Set<DayKey>;
  today: DayKey;
}

/** 12 weeks × 7 days: foil dot = done, hairline circle = missed, today = its day-of-month numeral. */
export const Heatmap12 = memo(function Heatmap12({ habit, done, frozen, today }: Props) {
  const first = addDays(startOfWeek(today), -7 * 11);
  const born = localKey(new Date(habit.createdAt));
  const cells = [];
  let doneCount = 0;
  for (let w = 0; w < 12; w++) {
    for (let d = 0; d < 7; d++) {
      const k = addDays(first, w * 7 + d);
      const cx = 7 + w * 14;
      const cy = 7 + d * 13;
      if (k > today) continue;
      if (k === today && !done.has(k)) {
        cells.push(
          <text key={k} className="tod" x={cx} y={cy + 2.5} textAnchor="middle">
            {String(parseKey(k).d).padStart(2, "0")}
          </text>,
        );
        continue;
      }
      if (done.has(k)) {
        doneCount++;
        cells.push(<circle key={k} className="dot" cx={cx} cy={cy} r={3} />);
      } else if (frozen.has(k)) cells.push(<circle key={k} className="frz" cx={cx} cy={cy} r={2.5} />);
      else if (!scheduled(habit, k)) cells.push(<circle key={k} className="off" cx={cx} cy={cy} r={1} />);
      else if (k >= born) cells.push(<circle key={k} className="miss" cx={cx} cy={cy} r={2.5} />);
      else cells.push(<circle key={k} className="off" cx={cx} cy={cy} r={1} />);
    }
  }
  return (
    <svg className="heat" viewBox="0 0 168 92" role="img" aria-label={`Last 12 weeks: ${doneCount} days done`}>
      {cells}
    </svg>
  );
});
