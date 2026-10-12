import { useCallback, useMemo } from "react";
import { useUi } from "../../app/store";
import { useRangeEntries, useSettings, useSomeday } from "../../data/queries";
import { addDays, hhmm, parseKey, runningDate, weekdayShort } from "../../engine/daykey";
import { byOrder, deriveSections, pad2 } from "../../engine/ordering";
import type { DayKey, Entry } from "../../engine/types";
import { Composer } from "../composer/Composer";
import { EntryRow } from "../front-page/EntryRow";
import { useEntryActions } from "../front-page/useEntryActions";

export function WeekSpread() {
  const today = useUi((s) => s.today);
  const selectedId = useUi((s) => s.selectedEntryId);
  const settings = useSettings();
  const start = today ? addDays(today, 1) : null;
  const entries = useRangeEntries(start, 7);
  const someday = useSomeday();
  const actions = useEntryActions();

  const days = useMemo(() => {
    if (!start || !entries) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const k = addDays(start, i);
      return { k, s: deriveSections(entries.filter((e) => e.when === k)) };
    });
  }, [start, entries]);

  const onStrike = useCallback((e: Entry) => actions.strike(e, null), [actions]);
  const onOpen = useCallback((e: Entry) => useUi.getState().open({ kind: "entry", id: e.id }), []);
  const onWhen = useCallback((e: Entry) => useUi.getState().open({ kind: "when", id: e.id }), []);
  const onSelect = useCallback((e: Entry) => useUi.getState().select(e.id), []);

  if (!today || !settings || !entries || !someday) return <div className="page wide" aria-busy="true" />;

  // Vermilion once per screen: the first entry whose deadline falls before its own day.
  const overdueDay = days.find((d) => [...d.s.today, ...d.s.evening].some((e) => e.deadline && e.deadline < d.k))?.k;
  const rowProps = (e: Entry, folio: number | null, tail: string, vermilion: boolean) => ({
    entry: e,
    folio,
    today,
    vermilion,
    selected: e.id === selectedId,
    showDone: false,
    instant: false,
    compact: true,
    tail,
    onStrike,
    onOpen,
    onWhen,
    onSelect,
  });
  const tailFor = (e: Entry, day: DayKey) =>
    e.status === "done"
      ? "closed"
      : e.deadline && e.deadline <= day
        ? "Due"
        : e.reminderAt
          ? hhmm(new Date(e.reminderAt))
          : e.evening
            ? "Evening"
            : e.tags[0]
              ? `#${e.tags[0]}`
              : "";
  const somedaySorted = [...someday].sort(byOrder);

  return (
    <div className="page wide page-enter">
      <div className="page-head rh">
        <span>Nocturne · Upcoming</span>
        <span>7 days</span>
      </div>
      <Composer
        today={today}
        rolloverHour={settings.dayRolloverHour}
        nextFolio={1}
        placeholder="File for tomorrow, or name a day…"
        defaultWhen={addDays(today, 1)}
      />
      <div className="week">
        {days.map(({ k, s }) => {
          const list = [...s.today, ...s.evening];
          const overdue = list.filter((e) => e.status === "open" && e.deadline && e.deadline < k).length;
          return (
            <section className="day" key={k} aria-label={runningDate(k)}>
              <div className="day-head">
                <span className="rh">{weekdayShort(k)}</span>
                <span className="dn">{pad2(parseKey(k).d)}</span>
                <span className={`cnt rh${overdue && k === overdueDay ? " over" : ""}`}>
                  {overdue
                    ? `overdue ${overdue}`
                    : list.length
                      ? `${list.length} ${list.length === 1 ? "entry" : "entries"}`
                      : ""}
                </span>
              </div>
              {list.length === 0 ? (
                <div className="day-empty">
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">Nothing filed</span>
                </div>
              ) : (
                <ul className="entries">
                  {list.map((e, i) => (
                    <EntryRow
                      key={e.id}
                      {...rowProps(
                        e,
                        e.status === "open" ? (s.folios.get(e.id) ?? i + 1) : null,
                        tailFor(e, k),
                        k === overdueDay && !!e.deadline && e.deadline < k,
                      )}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="section-head rh" style={{ marginTop: "var(--space-9)" }}>
        <span>Someday</span>
        <span>{somedaySorted.length || ""}</span>
      </div>
      {somedaySorted.length === 0 ? (
        <p className="footnote">Nothing waiting for someday.</p>
      ) : (
        <ul className="entries" aria-label="Someday">
          {somedaySorted.map((e, i) => (
            <EntryRow key={e.id} {...rowProps(e, i + 1, e.tags[0] ? `#${e.tags[0]}` : "", false)} />
          ))}
        </ul>
      )}
      <SomedayComposer today={today} rolloverHour={settings.dayRolloverHour} />
    </div>
  );
}

function SomedayComposer({ today, rolloverHour }: { today: DayKey; rolloverHour: number }) {
  return (
    <Composer
      today={today}
      rolloverHour={rolloverHour}
      nextFolio={1}
      placeholder="Someday…"
      defaultWhen={null}
      showUndo={false}
    />
  );
}
