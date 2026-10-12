import { useState } from "react";
import { useUi } from "../../app/store";
import { Segmented } from "../../components/ui/Segmented";
import { Sheet } from "../../components/ui/Sheet";
import { useCompletions, useHabits } from "../../data/queries";
import { archiveHabit, deleteHabit, freezeDay, setFrequency, updateHabit } from "../../data/repo";
import { addDays, shortDate } from "../../engine/daykey";
import { freezeAvailable, scheduled } from "../../engine/streaks";
import type { DayKey, Weekday } from "../../engine/types";
import { isNative } from "../../platform";

const DAYS: { d: Weekday; l: string }[] = [
  { d: 1, l: "Mon" },
  { d: 2, l: "Tue" },
  { d: 3, l: "Wed" },
  { d: 4, l: "Thu" },
  { d: 5, l: "Fri" },
  { d: 6, l: "Sat" },
  { d: 0, l: "Sun" },
];

function HabitReminder({
  value,
  onChange,
}: {
  value: { hour: number; minute: number } | undefined;
  onChange: (r: { hour: number; minute: number } | undefined) => void;
}) {
  const [time, setTime] = useState(
    value ? `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}` : "08:00",
  );
  return (
    <div className="mono-table" style={{ marginTop: 0, borderTop: 0 }}>
      <div className="r" style={{ gridTemplateColumns: "96px 1fr auto" }}>
        <span className="k">Reminder</span>
        <input
          type="time"
          className="field"
          aria-label="Habit reminder time"
          style={{ width: 120, fontFamily: "var(--font-mono)" }}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <span style={{ display: "inline-flex", gap: 8 }}>
          <button
            type="button"
            className="btn-text"
            onClick={() => {
              const [hour = 8, minute = 0] = time.split(":").map(Number);
              onChange({ hour, minute });
            }}
          >
            {value ? "Update" : "Set"}
          </button>
          {value && (
            <button type="button" className="btn-text muted" onClick={() => onChange(undefined)}>
              Off
            </button>
          )}
        </span>
      </div>
      {!isNative() && value && <p className="footnote">Habit reminders ring on the Android app.</p>}
    </div>
  );
}

export function HabitSheet({ id }: { id: string }) {
  const habits = useHabits();
  const completions = useCompletions();
  const today = useUi((s) => s.today);
  const close = useUi((s) => s.close);
  const h = habits?.find((x) => x.id === id);
  const [title, setTitle] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  if (!h || !today) return null;
  const weekly = h.frequency.per === "week";
  const specific = !weekly && !!h.scheduleDays?.length;
  const mine = (completions ?? []).filter((c) => c.habitId === h.id);
  const frozen = new Set(mine.filter((c) => c.frozen).map((c) => c.dayKey));
  const done = new Set(mine.filter((c) => c.value > 0).map((c) => c.dayKey));
  const yesterday = addDays(today, -1) as DayKey;
  const canFreeze =
    !weekly &&
    freezeAvailable(frozen, today) &&
    scheduled(h, yesterday) &&
    !done.has(yesterday) &&
    !frozen.has(yesterday) &&
    h.createdAt < Date.parse(`${today}T00:00:00`);
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
            value={weekly ? "week" : specific ? "days" : "daily"}
            options={[
              { value: "daily", label: "Daily" },
              { value: "days", label: "Some days" },
              { value: "week", label: "Weekly" },
            ]}
            onChange={async (v) => {
              if (v === "week") await setFrequency(h.id, { times: 3, per: "week" });
              else {
                if (weekly) await setFrequency(h.id, { times: 1, per: "day" });
                await updateHabit(h.id, { scheduleDays: v === "daily" ? [] : [1, 2, 3, 4, 5] });
              }
            }}
          />
        </div>
        {weekly && (
          <div className="editor">
            <Segmented
              label="Times a week"
              value={String(h.frequency.times)}
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}×` }))}
              onChange={(v) => setFrequency(h.id, { times: Number(v), per: "week" })}
            />
          </div>
        )}
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
      <HabitReminder value={h.reminder} onChange={(reminder) => updateHabit(h.id, { reminder })} />
      <p className="footnote">A miss lowers the ring a little; it never drops to zero.</p>
      {!weekly && (
        <p className="footnote warn">
          ¹ {freezeAvailable(frozen, today) ? "1 freeze available this week" : "This week's freeze is spent"}
          {canFreeze && (
            <>
              {" "}
              —{" "}
              <button type="button" onClick={() => freezeDay(h.id, yesterday)}>
                Freeze {shortDate(yesterday)}
              </button>
            </>
          )}
        </p>
      )}
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
