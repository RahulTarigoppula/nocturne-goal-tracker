import { MotionConfig } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { DigitRoll } from "../components/ui/DigitRoll";
import { useDaysWithEntries, useIssue } from "../data/queries";
import {
  addDays,
  daysInMonth,
  issueNumber,
  monthName,
  parseKey,
  runningDate,
  toKey,
  weekdayLong,
  weekdayOf,
} from "../engine/daykey";
import { DayGauge, Numeral } from "../features/front-page/Masthead";
import { SheetHost } from "./SheetHost";
import { useUi } from "./store";
import { useEffectiveSettings } from "./useEffectiveSettings";

const TABS = [
  { to: "/", label: "Today" },
  { to: "/upcoming", label: "Upcoming" },
  { to: "/ledger", label: "Ledger" },
  { to: "/issues", label: "Issues" },
] as const;

function FooterTabs() {
  const loc = useLocation();
  const nav = useRef<HTMLElement>(null);
  const [bar, setBar] = useState({ x: 0, w: 40 });
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the route changes
  useLayoutEffect(() => {
    const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !nav.current) return;
    const label = el.querySelector("span") ?? el;
    const r = label.getBoundingClientRect();
    const n = nav.current.getBoundingClientRect();
    setBar({ x: r.left - n.left, w: r.width });
  }, [loc.pathname]);
  const active = TABS.some((t) => (t.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(t.to)));
  return (
    <nav className="tabs" ref={nav} aria-label="Sections">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === "/"} className="tab">
          <span>{t.label}</span>
        </NavLink>
      ))}
      <i
        className="tab-underline"
        aria-hidden="true"
        style={{ transform: `translateX(${bar.x}px)`, width: bar.w, opacity: active ? 1 : 0 }}
      />
    </nav>
  );
}

function MiniCalendar({ today }: { today: ReturnType<typeof toKey> }) {
  const { y, m } = parseKey(today);
  const first = toKey(y, m, 1);
  const last = toKey(y, m, daysInMonth(y, m));
  const dots = useDaysWithEntries(first, last);
  const lead = (weekdayOf(first) + 6) % 7;
  return (
    <div className="cal" aria-hidden="true">
      {["M", "T", "W", "T", "F", "S", "S"].map((h, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed header
        <span key={i} className="h">
          {h}
        </span>
      ))}
      {Array.from({ length: lead }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: blanks
        <span key={`b${i}`} />
      ))}
      {Array.from({ length: daysInMonth(y, m) }, (_, i) => {
        const k = addDays(first, i);
        const cls = `d${k === today ? " today" : ""}${dots?.has(k) ? " dot" : ""}${k < today ? " past" : ""}`;
        return (
          <span key={k} className={cls}>
            {i + 1}
          </span>
        );
      })}
    </div>
  );
}

function Rail() {
  const today = useUi((s) => s.today);
  const now = useUi((s) => s.now);
  const settings = useEffectiveSettings();
  const issue = useIssue(today);
  if (!today || !settings) return <aside className="rail" />;
  const issueNo = issue?.issueNo ?? issueNumber(today, settings.firstIssueDay);
  return (
    <aside className="rail" aria-label="Masthead">
      <div className="rh rh-line">
        <Link to="/colophon" style={{ color: "inherit", textDecoration: "none" }}>
          Nocturne
        </Link>
        <span>
          No. <DigitRoll value={String(issueNo)} /> ·{" "}
          <DigitRoll
            value={`${issue?.done ?? 0} / ${issue?.total ?? 0}`}
            label={`${issue?.done ?? 0} of ${issue?.total ?? 0}`}
          />
        </span>
      </div>
      <Numeral dayKey={today} />
      <span className="month">{monthName(today)}</span>
      <DayGauge now={now} rolloverHour={settings.dayRolloverHour} />
      <MiniCalendar today={today} />
      <nav className="rail-nav" aria-label="Sections">
        {[...TABS, { to: "/colophon", label: "Colophon" }].map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === "/"}>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function Shell() {
  const settings = useEffectiveSettings();
  const today = useUi((s) => s.today);
  const announce = useUi((s) => s.announce);
  const navigate = useNavigate();
  const loc = useLocation();

  // Global keys: [ ] tabs · n new · Ctrl/⌘+K find.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useUi.getState().open({ kind: "find" });
        return;
      }
      if (useUi.getState().openSheet) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = TABS.findIndex((x) => (x.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(x.to)));
      if (e.key === "]" || e.key === "[") {
        const next = (idx < 0 ? 0 : idx + (e.key === "]" ? 1 : TABS.length - 1)) % TABS.length;
        navigate(TABS[next]?.to ?? "/");
      } else if (e.key === "n") {
        e.preventDefault();
        if (loc.pathname !== "/") navigate("/");
        requestAnimationFrame(() => useUi.getState().focusComposer());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loc.pathname, navigate]);

  const reduced = settings?.motion === "reduced";
  const caption = today
    ? `Evening Edition · ${String(settings?.eveningHour ?? 21).padStart(2, "0")}:00 · ${weekdayLong(today)} ${runningDate(today).slice(4)}`
    : "";
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "user"}>
      <div className="app">
        <Rail />
        <main className="pages" id="main" key={loc.pathname}>
          <Outlet />
        </main>
        <FooterTabs />
        <div className="margin-caption" aria-hidden="true">
          {caption}
        </div>
      </div>
      <SheetHost />
      <div className="sr-only" aria-live="polite" role="status">
        {announce}
      </div>
    </MotionConfig>
  );
}
