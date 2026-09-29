import { useState } from "react";
import { useUi } from "../../app/store";
import { Segmented } from "../../components/ui/Segmented";
import { Sheet } from "../../components/ui/Sheet";
import { useHabits } from "../../data/queries";
import { archiveHabit, deleteHabit, updateHabit } from "../../data/repo";
import type { Weekday } from "../../engine/types";

const DAYS: { d: Weekday; l: string }[] = [
  { d: 1, l: "Mon" },
  { d: 2, l: "Tue" },
  { d: 3, l: "Wed" },
  { d: 4, l: "Thu" },
  { d: 5, l: "Fri" },
  { d: 6, l: "Sat" },
  { d: 0, l: "Sun" },
];

export function HabitSheet({ id }: { id: string }) {
  const habits = useHabits();
  const close = useUi((s) => s.close);
  const h = habits?.find((x) => x.id === id);
  const [title, setTitle] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  if (!h) return null;
  const specific = !!h.scheduleDays?.length;
  const commitTitle = () => {
    if (title?.trim() && title !== h.title) updateHabit(h.id, { title: title.trim() });
  };
  return (
    <Sheet label="Habit" labelledBy="habit-head" onClose={close}>
      <h2 className="sheet-head" id="habit-head">
        <span className="f">·</span>
        <input
          value={title ?? h.title}
          aria-label="Habit title"
          data-autofocus
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </h2>
      <div className="mono-table">
        <div className="r" style={{ gridTemplateColumns: "96px 1fr" }}>
          <span className="k">Schedule</span>
          <Segmented
            label="Schedule"
            value={specific ? "days" : "daily"}
            options={[
              { value: "daily", label: "Every day" },
              { value: "days", label: "Specific days" },
            ]}
            onChange={(v) => updateHabit(h.id, { scheduleDays: v === "daily" ? [] : [1, 2, 3, 4, 5] })}
          />
        </div>
        {specific && (
          <div className="editor">
            <fieldset className="weekday-pick" aria-label="Days">
              {DAYS.map(({ d, l }) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={h.scheduleDays?.includes(d) ?? false}
                  onClick={() => {
                    const cur = h.scheduleDays ?? [];
                    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
                    if (next.length) updateHabit(h.id, { scheduleDays: next.sort() });
                  }}
                >
                  {l}
                </button>
              ))}
            </fieldset>
          </div>
        )}
      </div>
      <p className="footnote">A miss lowers the ring a little; it never drops to zero.</p>
      <div className="sheet-actions">
        <button
          type="button"
          className="btn-text"
          onClick={() => {
            archiveHabit(h.id, !h.archivedAt);
            close();
          }}
        >
          {h.archivedAt ? "Restore" : "Archive"}
        </button>
        {confirm ? (
          <span className="rh" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            Delete?
            <button
              type="button"
              className="btn-text danger"
              onClick={() => {
                deleteHabit(h.id);
                close();
              }}
            >
              Yes
            </button>
            <button type="button" className="btn-text" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className="btn-text danger" onClick={() => setConfirm(true)}>
            Delete the habit
          </button>
        )}
      </div>
    </Sheet>
  );
}
