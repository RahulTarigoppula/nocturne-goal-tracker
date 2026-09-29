import { useMemo, useRef, useState } from "react";
import { useUi } from "../../app/store";
import { DigitRoll } from "../../components/ui/DigitRoll";
import { StrengthRing } from "../../components/ui/StrengthRing";
import { useCompletions, useHabits } from "../../data/queries";
import { addHabit, toggleCompletion } from "../../data/repo";
import { byOrder } from "../../engine/ordering";
import { bestStreak, currentStreak } from "../../engine/streaks";
import { strength } from "../../engine/strength";
import type { Completion, DayKey, Habit } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { Heatmap12 } from "./Heatmap12";

export interface HabitStats {
  habit: Habit;
  done: Set<DayKey>;
  frozen: Set<DayKey>;
  current: number;
  best: number;
  strength: number;
  doneToday: boolean;
}

export function statsFor(habits: Habit[], completions: Completion[], today: DayKey): HabitStats[] {
  const by = new Map<string, { done: Set<DayKey>; frozen: Set<DayKey> }>();
  for (const c of completions) {
    const slot = by.get(c.habitId) ?? { done: new Set<DayKey>(), frozen: new Set<DayKey>() };
    if (c.frozen) slot.frozen.add(c.dayKey);
    else slot.done.add(c.dayKey);
    by.set(c.habitId, slot);
  }
  return habits.map((h) => {
    const { done, frozen } = by.get(h.id) ?? { done: new Set<DayKey>(), frozen: new Set<DayKey>() };
    const streakSet = new Set([...done, ...frozen]);
    return {
      habit: h,
      done,
      frozen,
      current: currentStreak(h, streakSet, today),
      best: bestStreak(h, streakSet, today),
      strength: strength(h, done, frozen, today),
      doneToday: done.has(today),
    };
  });
}

export function Ledger() {
  const today = useUi((s) => s.today);
  const habits = useHabits();
  const completions = useCompletions();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const stats = useMemo(
    () => (today && habits && completions ? statsFor([...habits].sort(byOrder), completions, today) : null),
    [habits, completions, today],
  );
  if (!today || !stats) return <div className="page" aria-busy="true" />;

  const active = stats.filter((s) => !s.habit.archivedAt);
  const archived = stats.filter((s) => s.habit.archivedAt);
  const focus = stats.find((s) => s.habit.id === selected) ?? active[0];

  const add = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    const h = await addHabit(t);
    setSelected(h.id);
  };

  return (
    <div className="page page-enter">
      <div className="page-head rh">
        <span>Nocturne · Ledger</span>
        <span>
          {active.length} {active.length === 1 ? "habit" : "habits"}
        </span>
      </div>
      {active.length === 0 && <p className="light-line">No habits in the ledger.</p>}
      <ul className="entries" aria-label="Habits">
        {active.map((s) => (
          <li key={s.habit.id}>
            <LedgerLine
              s={s}
              today={today}
              selected={focus?.habit.id === s.habit.id}
              onFocusHabit={() => setSelected(s.habit.id)}
            />
          </li>
        ))}
      </ul>
      {focus && !focus.habit.archivedAt && (
        <>
          <div className="section-head rh" style={{ marginTop: "var(--space-8)" }}>
            <span>12 weeks · {focus.habit.title}</span>
          </div>
          <div className="ledger-detail">
            <Heatmap12 habit={focus.habit} done={focus.done} frozen={focus.frozen} today={today} />
            <div>
              <div className="big-ring">
                <StrengthRing value={focus.strength} size={96} />
                <div className="pct">
                  <span>
                    <DigitRoll value={String(focus.strength)} label={`${focus.strength} % strength`} />
                    <small>%</small>
                  </span>
                </div>
              </div>
              <div className="strength-word" aria-hidden="true">
                strength
              </div>
            </div>
          </div>
        </>
      )}
      {archived.length > 0 && (
        <>
          <div className="section-head rh faint">
            <span>Archived</span>
          </div>
          <ul className="entries" aria-label="Archived habits">
            {archived.map((s) => (
              <li key={s.habit.id}>
                <LedgerLine s={s} today={today} selected={false} onFocusHabit={() => {}} archived />
              </li>
            ))}
          </ul>
        </>
      )}
      <form
        className="composer"
        style={{ marginTop: "var(--space-6)" }}
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="composer-row">
          <span className="plus" aria-hidden="true">
            +
          </span>
          <input
            type="text"
            value={draft}
            placeholder="Add a habit…"
            aria-label="Add a habit"
            enterKeyHint="done"
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <div className="hint">Enter to add · hold a line to edit it</div>
      </form>
    </div>
  );
}

function LedgerLine({
  s,
  today,
  selected,
  onFocusHabit,
  archived,
}: {
  s: HabitStats;
  today: DayKey;
  selected: boolean;
  onFocusHabit: () => void;
  archived?: boolean;
}) {
  const timer = useRef(0);
  const held = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const openSheet = () => useUi.getState().open({ kind: "habit", id: s.habit.id });
  return (
    <button
      type="button"
      className={`ledger-line${archived ? " archived" : ""}${selected ? " selected" : ""}`}
      aria-pressed={s.doneToday}
      aria-label={`${s.habit.title}. ${s.doneToday ? "Done today" : "Not done today"}. Streak ${s.current}, best ${s.best}, strength ${s.strength} %. ${archived ? "Archived." : "Tap to toggle today; hold or press E to edit."}`}
      onPointerDown={(e) => {
        held.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => {
          held.current = true;
          haptics.lift();
          openSheet();
        }, 450);
      }}
      onPointerMove={(e) => {
        if (Math.abs(e.clientX - start.current.x) > 8 || Math.abs(e.clientY - start.current.y) > 8)
          clearTimeout(timer.current);
      }}
      onPointerUp={() => clearTimeout(timer.current)}
      onPointerCancel={() => clearTimeout(timer.current)}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "e") openSheet();
      }}
      onFocus={onFocusHabit}
      onClick={() => {
        if (held.current) return;
        onFocusHabit();
        if (archived) {
          openSheet();
          return;
        }
        haptics.light();
        toggleCompletion(s.habit.id, today);
      }}
    >
      <span>{s.habit.title}</span>
      <span className="st" aria-hidden="true">
        <span className="now">
          <DigitRoll value={String(s.current)} />
        </span>
        <span>·</span>
        <DigitRoll value={String(s.best)} />
      </span>
      <StrengthRing value={s.strength} />
    </button>
  );
}
