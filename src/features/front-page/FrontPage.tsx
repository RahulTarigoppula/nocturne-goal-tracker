import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useUi } from "../../app/store";
import { useDayEntries, useIssue, useIssues, useSettings } from "../../data/queries";
import { reorder, saveSettings } from "../../data/repo";
import { greeting, issueNumber } from "../../engine/daykey";
import { deriveSections } from "../../engine/ordering";
import { longestIssueStreak } from "../../engine/streaks";
import type { Entry } from "../../engine/types";
import { isNative } from "../../platform";
import { haptics } from "../../platform/haptics";
import { requestPermission } from "../../platform/notifications";
import { ms } from "../../styles/motion";
import { Composer } from "../composer/Composer";
import { sound } from "../sound/synth";
import { EntryList } from "./EntryList";
import { Masthead } from "./Masthead";
import { isOverdue } from "./meta";
import { useEntryActions } from "./useEntryActions";

const ColophonBlock = lazy(() => import("../colophon/ColophonBlock").then((m) => ({ default: m.ColophonBlock })));

export function FrontPage() {
  const today = useUi((s) => s.today);
  const now = useUi((s) => s.now);
  const selectedId = useUi((s) => s.selectedEntryId);
  const storageError = useUi((s) => s.storageError);
  const justClosed = useUi((s) => (today ? s.colophonJustClosed[today] : undefined));
  const settings = useSettings();
  const entries = useDayEntries(today);
  const issue = useIssue(today);
  const issues = useIssues();
  const actions = useEntryActions();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [instant, setInstant] = useState<Set<string>>(new Set());
  const [params, setParams] = useSearchParams();

  // Deep link: #/?entry=<id> opens that entry's sheet.
  useEffect(() => {
    const id = params.get("entry");
    if (id) {
      useUi.getState().open({ kind: "entry", id });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  // The colophon draw plays only when closedAt changes during this session.
  const prevClosed = useRef<number | undefined | null>(null);
  useEffect(() => {
    if (issue === undefined || !today) return;
    const closedAt = issue?.closedAt;
    if (prevClosed.current !== null && closedAt && prevClosed.current !== closedAt) {
      useUi.getState().markClosed(today, closedAt);
      window.setTimeout(() => {
        haptics.success();
        sound.chime(settings);
      }, ms.colophonDelay);
      if (settings && !settings.onboardingDone) {
        saveSettings({ onboardingDone: true });
        if (isNative()) requestPermission().catch(() => {});
      }
    }
    prevClosed.current = closedAt;
  }, [issue, today, settings]);

  const view = useMemo(() => {
    if (!entries) return null;
    const shaped = entries.map((e) => (pending.has(e.id) ? { ...e, status: "open" as const } : e));
    return deriveSections(shaped);
  }, [entries, pending]);

  const onStrike = useCallback(
    (e: Entry) => {
      if (e.status === "done") return;
      const folio = view?.folios.get(e.id) ?? null;
      setPending((s) => new Set(s).add(e.id));
      actions.strike(e, folio);
      window.setTimeout(() => {
        setPending((s) => {
          const n = new Set(s);
          n.delete(e.id);
          return n;
        });
      }, ms.strike + 40);
    },
    [actions, view],
  );
  const onOpen = useCallback((e: Entry) => useUi.getState().open({ kind: "entry", id: e.id }), []);
  const onWhen = useCallback((e: Entry) => useUi.getState().open({ kind: "when", id: e.id }), []);
  const onSelect = useCallback((e: Entry) => useUi.getState().select(e.id), []);

  // Undo of a strike retracts the line instantly rather than re-drawing it backwards through a re-set.
  const undo = useUi((s) => s.undo);
  useEffect(() => {
    if (!undo) setInstant(new Set());
  }, [undo]);

  // Keyboard: j/k select · x strike · w when · e edit · Alt+↑/↓ reorder.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!view || useUi.getState().openSheet) return;
      const t = ev.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      const all = [...view.today, ...view.evening];
      const openRows = all.filter((e) => e.status === "open");
      const sel = useUi.getState().selectedEntryId;
      const idx = all.findIndex((e) => e.id === sel);
      const focusRow = (e: Entry | undefined) => {
        if (!e) return;
        useUi.getState().select(e.id);
        document.querySelector<HTMLElement>(`[data-entry-title="${e.id}"]`)?.focus();
      };
      const cur = all[idx];
      if ((ev.key === "j" || ev.key === "ArrowDown") && !ev.altKey) {
        ev.preventDefault();
        focusRow(all[Math.min(all.length - 1, idx + 1)]);
      } else if ((ev.key === "k" || ev.key === "ArrowUp") && !ev.altKey) {
        ev.preventDefault();
        focusRow(all[Math.max(0, idx - 1)]);
      } else if (ev.key === "x" && cur) {
        onStrike(cur);
      } else if (ev.key === "w" && cur) {
        useUi.getState().open({ kind: "when", id: cur.id });
      } else if (ev.key === "e" && cur) {
        useUi.getState().open({ kind: "entry", id: cur.id });
      } else if (ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown") && cur?.status === "open") {
        ev.preventDefault();
        const section = openRows.filter((e) => e.evening === cur.evening);
        const i = section.findIndex((e) => e.id === cur.id);
        const target = ev.key === "ArrowUp" ? i - 1 : i + 1;
        if (target < 0 || target >= section.length) return;
        reorder(
          cur.id,
          section.filter((e) => e.id !== cur.id),
          target,
        ).then(() => requestAnimationFrame(() => focusRow(cur)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, onStrike]);

  if (!today || !settings || !view) {
    return <div className="page" aria-busy="true" />;
  }

  const issueNo = issue?.issueNo ?? issueNumber(today, settings.firstIssueDay);
  const hour = new Date(now).getHours();
  const name = settings.readerName ? `, ${settings.readerName}` : "";
  const greet =
    !settings.onboardingDone && issueNo === 1 ? "Welcome to your first issue." : `${greeting(hour)}${name}.`;
  const closed = !!issue?.closedAt && pending.size === 0;
  const all = [...view.today, ...view.evening];
  const firstOverdue = all.find((e) => isOverdue(e, today))?.id ?? null;
  const openToday = view.today.filter((e) => e.status === "open");
  const openEvening = view.evening.filter((e) => e.status === "open");
  const nextFolio = openToday.length + openEvening.length - pending.size + 1;
  const empty = all.length === 0;
  const common = {
    today,
    firstOverdueId: firstOverdue,
    selectedId,
    pendingDone: pending,
    instantIds: instant,
    onStrike,
    onOpen,
    onWhen,
    onSelect,
  };

  return (
    <div className="page page-enter">
      <Masthead
        dayKey={today}
        issueNo={issueNo}
        done={issue?.done ?? 0}
        total={issue?.total ?? 0}
        now={now}
        rolloverHour={settings.dayRolloverHour}
        greeting={greet}
        storageError={storageError}
      />
      <div className={`issue-body${closed ? " closed" : ""}`}>
        {empty ? (
          <p className="light-line">Nothing set for today.</p>
        ) : (
          <>
            {view.today.length > 0 && (
              <>
                <div className="section-head rh">
                  <span>I — Today</span>
                </div>
                <EntryList
                  {...common}
                  label="Today"
                  open={openToday}
                  done={view.today.filter((e) => e.status === "done")}
                  folioStart={1}
                />
              </>
            )}
            {view.evening.length > 0 && (
              <>
                <div className="section-head rh">
                  <span>{view.today.length > 0 ? "II" : "I"} — This evening</span>
                </div>
                <EntryList
                  {...common}
                  label="This evening"
                  open={openEvening}
                  done={view.evening.filter((e) => e.status === "done")}
                  folioStart={openToday.filter((e) => !pending.has(e.id)).length + 1}
                />
              </>
            )}
          </>
        )}
      </div>
      {closed && issue && (
        <Suspense fallback={null}>
          <ColophonBlock
            issue={issue}
            longest={longestIssueStreak(issues ?? [])}
            animate={justClosed === issue.closedAt}
          />
        </Suspense>
      )}
      <Composer today={today} rolloverHour={settings.dayRolloverHour} nextFolio={nextFolio} />
    </div>
  );
}
