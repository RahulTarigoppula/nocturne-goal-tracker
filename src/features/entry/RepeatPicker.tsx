import { Segmented } from "../../components/ui/Segmented";
import { parseKey, shortDate, weekdayOf } from "../../engine/daykey";
import { preview } from "../../engine/recurrence";
import type { DayKey, Recurrence, RecurrenceMode, Weekday } from "../../engine/types";

type Kind = "none" | Recurrence["kind"];
const KINDS: readonly { value: Kind; label: string }[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];
const DAYS: { d: Weekday; l: string }[] = [
  { d: 1, l: "Mon" },
  { d: 2, l: "Tue" },
  { d: 3, l: "Wed" },
  { d: 4, l: "Thu" },
  { d: 5, l: "Fri" },
  { d: 6, l: "Sat" },
  { d: 0, l: "Sun" },
];

interface Props {
  value: Recurrence | undefined;
  base: DayKey;
  onChange: (r: Recurrence | undefined) => void;
}

function make(kind: Kind, base: DayKey, mode: RecurrenceMode, prev?: Recurrence): Recurrence | undefined {
  const { m, d } = parseKey(base);
  switch (kind) {
    case "none":
      return undefined;
    case "daily":
      return { kind, interval: prev?.kind === "daily" ? prev.interval : 1, mode };
    case "weekdays":
      return { kind, mode };
    case "weekly":
      return { kind, interval: 1, days: [weekdayOf(base)], anchor: base, mode };
    case "monthly":
      return { kind, interval: 1, day: d, mode };
    case "yearly":
      return { kind, month: m, day: d, mode };
  }
}

/** The six patterns + fixed/after-completion, previewing the next three dates. */
export function RepeatPicker({ value, base, onChange }: Props) {
  const kind: Kind = value?.kind ?? "none";
  const mode = value?.mode ?? "fixed";
  const next = value && !(value.kind === "weekly" && value.days.length === 0) ? preview(value, base, 3) : [];
  return (
    <div>
      <Segmented label="Repeat" value={kind} options={KINDS} onChange={(k) => onChange(make(k, base, mode, value))} />
      {value?.kind === "daily" && (
        <label className="rh" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          Every
          <input
            className="field"
            type="number"
            min={1}
            max={365}
            style={{ width: 64, fontFamily: "var(--font-mono)" }}
            value={value.interval}
            onChange={(e) => onChange({ ...value, interval: Math.max(1, Math.min(365, Number(e.target.value) || 1)) })}
          />
          days
        </label>
      )}
      {value?.kind === "weekly" && (
        <>
          <fieldset className="weekday-pick" aria-label="Days">
            {DAYS.map(({ d, l }) => (
              <button
                key={d}
                type="button"
                aria-pressed={value.days.includes(d)}
                onClick={() => {
                  const days = value.days.includes(d) ? value.days.filter((x) => x !== d) : [...value.days, d];
                  if (days.length) onChange({ ...value, days: days.sort() });
                }}
              >
                {l}
              </button>
            ))}
          </fieldset>
          <Segmented
            label="Interval"
            value={String(value.interval)}
            options={[
              { value: "1", label: "Every week" },
              { value: "2", label: "Every 2 weeks" },
            ]}
            onChange={(v) => onChange({ ...value, interval: Number(v), anchor: base })}
          />
        </>
      )}
      {value?.kind === "monthly" && (
        <Segmented
          label="Day"
          value={value.day === "last" ? "last" : "day"}
          options={[
            { value: "day", label: `On the ${parseKey(base).d}` },
            { value: "last", label: "Last day" },
          ]}
          onChange={(v) => onChange({ ...value, day: v === "last" ? "last" : parseKey(base).d })}
        />
      )}
      {value && (
        <Segmented
          label="Counting"
          value={mode}
          options={[
            { value: "fixed", label: "On schedule" },
            { value: "afterCompletion", label: "After done" },
          ]}
          onChange={(m) => onChange({ ...value, mode: m })}
        />
      )}
      {next.length > 0 && <p className="footnote">Next: {next.map((k) => shortDate(k)).join(" · ")}</p>}
    </div>
  );
}
