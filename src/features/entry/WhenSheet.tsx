import { useState } from "react";
import { useUi } from "../../app/store";
import { Sheet } from "../../components/ui/Sheet";
import { useEntry, useSettings } from "../../data/queries";
import { addDays, shortDate, weekdayOf } from "../../engine/daykey";
import type { DayKey } from "../../engine/types";
import { useEntryActions } from "../front-page/useEntryActions";
import { MonthGrid } from "./MonthGrid";

export function WhenSheet({ id }: { id: string }) {
  const entry = useEntry(id);
  const settings = useSettings();
  const today = useUi((s) => s.today);
  const close = useUi((s) => s.close);
  const { move } = useEntryActions();
  const [picking, setPicking] = useState(false);
  if (!entry || !today || !settings) return null;

  const tomorrow = addDays(today, 1);
  const wd = weekdayOf(today);
  const saturday = wd === 6 ? addDays(today, 7) : addDays(today, (6 - wd + 7) % 7 || 7);
  const go = async (target: { when: DayKey; evening: boolean } | "someday", label: string) => {
    close();
    await move(entry, target, label);
  };
  const title = entry.title;
  return (
    <Sheet label="When?" labelledBy="when-head" onClose={close}>
      <h2 className="sheet-head light" id="when-head">
        <span className="f">—</span>
        <span>When?</span>
      </h2>
      <p className="footnote" style={{ marginLeft: "var(--folio-col)", marginTop: 4 }}>
        {title}
      </p>
      {picking ? (
        <MonthGrid
          today={today}
          value={entry.when}
          onPick={(k) => go({ when: k, evening: false }, `Moved to ${shortDate(k)}`)}
        />
      ) : (
        <ul className="when-list">
          <li>
            <button type="button" data-autofocus onClick={() => go({ when: today, evening: false }, "Moved to today")}>
              Today <small>Section I</small>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => go({ when: today, evening: true }, "Moved to this evening")}>
              This evening <small>Section II · {String(settings.eveningHour).padStart(2, "0")}:00</small>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => go({ when: tomorrow, evening: false }, "Moved to tomorrow")}>
              Tomorrow <small>{shortDate(tomorrow, false)}</small>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => go({ when: saturday, evening: false }, "Moved to the weekend")}>
              This weekend <small>Sat · Sun</small>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setPicking(true)}>
              Pick a day <small>›</small>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => go("someday", "Moved to someday")}>
              Someday <small>No date</small>
            </button>
          </li>
        </ul>
      )}
    </Sheet>
  );
}
