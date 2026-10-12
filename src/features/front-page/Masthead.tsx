import { useEffect, useRef, useState } from "react";
import { Link } from "../../app/hash-router";
import { DigitRoll } from "../../components/ui/DigitRoll";
import { ariaValueText, dayGauge, monthName, parseKey, weekdayLong } from "../../engine/daykey";
import type { DayKey } from "../../engine/types";

interface NumeralProps {
  dayKey: DayKey;
}

/** The masthead numeral: digits rise into fixed columns on launch; on a new day the old one rolls out first. */
export function Numeral({ dayKey }: NumeralProps) {
  const [shown, setShown] = useState(dayKey);
  const [phase, setPhase] = useState<"pre" | "in" | "out">("pre");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      const t = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("in")));
      return () => cancelAnimationFrame(t);
    }
    if (dayKey === shown) return;
    setPhase("out");
    const t = window.setTimeout(() => {
      setShown(dayKey);
      setPhase("pre");
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase("in")));
    }, 480);
    return () => clearTimeout(t);
  }, [dayKey, shown]);

  const digits = String(parseKey(shown).d).padStart(2, "0");
  return (
    <div className={`numeral${phase === "in" ? " in" : phase === "out" ? " out" : ""}`} aria-hidden="true">
      {[...digits].map((d, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed digit columns
        <span key={i} className="col">
          <span style={{ transitionDelay: `${i * 30}ms` }}>{d}</span>
        </span>
      ))}
    </div>
  );
}

export function DayGauge({ now, rolloverHour }: { now: number; rolloverHour: number }) {
  const d = new Date(now);
  const g = dayGauge(d, rolloverHour);
  return (
    <div
      className="gauge"
      role="progressbar"
      aria-label="Day elapsed"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(g * 100)}
      aria-valuetext={ariaValueText(d, rolloverHour)}
      style={{ "--day-gauge": g } as React.CSSProperties}
    >
      <i />
    </div>
  );
}

interface MastheadProps {
  dayKey: DayKey;
  issueNo: number;
  done: number;
  total: number;
  now: number;
  rolloverHour: number;
  greeting: string;
  storageError: boolean;
  /** Frozen issues show a fixed gauge and no greeting. */
  frozenGauge?: number;
  lead?: string;
}

export function Masthead(p: MastheadProps) {
  const counter = `${p.done} / ${p.total}`;
  return (
    <header className="masthead phone-only">
      <div className="page-head rh">
        <span className="rh-swap">
          <span className="df">
            {p.lead ?? (
              <Link to="/colophon" className="rh-link" aria-label="Nocturne colophon: settings">
                Nocturne
              </Link>
            )}{" "}
            · No. <DigitRoll value={String(p.issueNo)} rollIn delay={60} /> · {weekdayLong(p.dayKey)}
          </span>
          <span className="ev" aria-hidden="true">
            Evening edition · No. {p.issueNo}
          </span>
        </span>
        <DigitRoll value={counter} label={`${p.done} of ${p.total}`} rollIn delay={120} />
      </div>
      {p.frozenGauge !== undefined ? (
        <div className="gauge" style={{ "--day-gauge": p.frozenGauge } as React.CSSProperties}>
          <i />
        </div>
      ) : (
        <DayGauge now={p.now} rolloverHour={p.rolloverHour} />
      )}
      <div className="date-block">
        <Numeral dayKey={p.dayKey} />
        <span className="month">{monthName(p.dayKey)}</span>
        {p.greeting && <div className="greeting">{p.greeting}</div>}
      </div>
      {p.storageError && (
        <p className="footnote error">¹ Storage is unavailable in this browser; the issue will not be saved.</p>
      )}
    </header>
  );
}
