import { useEffect, useState } from "react";
import { Segmented } from "../../components/ui/Segmented";
import { useSettings } from "../../data/queries";
import { saveSettings } from "../../data/repo";
import type { Settings } from "../../engine/types";
import { isNative } from "../../platform";
import { openExternal } from "../../platform/files";
import {
  exactAlarms,
  openExactAlarmSetting,
  permission,
  requestPermission,
  scheduleSync,
} from "../../platform/notifications";
import { unlockAudio } from "../sound/synth";
import { BackupPanel } from "./BackupPanel";

const hours = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

function HourSelect({
  label,
  value,
  onChange,
  from = 0,
  to = 23,
}: {
  label: string;
  value: number;
  onChange: (h: number) => void;
  from?: number;
  to?: number;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {hours
        .filter((h) => h >= from && h <= to)
        .map((h) => (
          <option key={h} value={h}>
            {hh(h)}
          </option>
        ))}
    </select>
  );
}

export function ColophonPage() {
  const s = useSettings();
  const [perm, setPerm] = useState<string>("…");
  const [exact, setExact] = useState<string>("n/a");
  const [help, setHelp] = useState(false);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    permission().then(setPerm);
    exactAlarms().then(setExact);
  }, []);

  if (!s) return <div className="page" aria-busy="true" />;
  const set = (patch: Partial<Settings>) => saveSettings(patch);

  return (
    <div className="page page-enter">
      <div className="page-head rh">
        <span>Nocturne · Colophon</span>
        <span>Settings</span>
      </div>

      <section className="set-group" aria-labelledby="edition-head">
        <div className="section-head rh" id="edition-head">
          <span>Edition</span>
        </div>
        <div className="set-row">
          <span className="lbl">Theme</span>
          <Segmented
            label="Theme"
            value={s.theme}
            options={[
              { value: "night", label: "Night" },
              { value: "proof", label: "Proof" },
              { value: "auto", label: "Auto" },
            ]}
            onChange={(theme) => set({ theme })}
          />
        </div>
        <div className="set-row">
          <span className="lbl">
            Evening hour<small>The ground darkens; the head reads Evening Edition</small>
          </span>
          <span className="val">
            <HourSelect
              label="Evening hour"
              value={s.eveningHour}
              from={15}
              to={23}
              onChange={(eveningHour) => set({ eveningHour })}
            />
          </span>
        </div>
        <div className="set-row">
          <span className="lbl">
            Day rollover<small>A strike before this hour counts for the previous day</small>
          </span>
          <span className="val">
            <HourSelect
              label="Day rollover"
              value={s.dayRolloverHour}
              from={0}
              to={6}
              onChange={(dayRolloverHour) => set({ dayRolloverHour })}
            />
          </span>
        </div>
        <div className="set-row">
          <span className="lbl">Reader name</span>
          <input
            className="field"
            style={{ width: 160, textAlign: "right" }}
            placeholder="For the greeting"
            aria-label="Reader name"
            maxLength={40}
            value={name ?? s.readerName ?? ""}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== null && set({ readerName: name })}
          />
        </div>
        <div className="set-row">
          <span className="lbl">Motion</span>
          <Segmented
            label="Motion"
            value={s.motion}
            options={[
              { value: "system", label: "System" },
              { value: "reduced", label: "Reduced" },
            ]}
            onChange={(motion) => set({ motion })}
          />
        </div>
        <div className="set-row">
          <span className="lbl">
            Sound<small>Synthesised; quiet hours 23:00–08:00</small>
          </span>
          <Segmented
            label="Sound"
            value={!s.sound.enabled ? "off" : s.sound.quietFrom === s.sound.quietTo ? "on" : "quiet"}
            options={[
              { value: "off", label: "Off" },
              { value: "on", label: "On" },
              { value: "quiet", label: "Quiet hours" },
            ]}
            onChange={(v) => {
              unlockAudio();
              set({
                sound:
                  v === "off"
                    ? { ...s.sound, enabled: false }
                    : v === "on"
                      ? { ...s.sound, enabled: true, quietFrom: 0, quietTo: 0 }
                      : { ...s.sound, enabled: true, quietFrom: 23, quietTo: 8 },
              });
            }}
          />
        </div>
      </section>

      <section className="set-group" aria-labelledby="rem-head">
        <div className="section-head rh" id="rem-head">
          <span>Reminders</span>
        </div>
        {!isNative() && (
          <p className="footnote">
            In the browser, reminders appear only while Nocturne is open. The Android app fires real alarms.
          </p>
        )}
        <div className="set-row">
          <span className="lbl">Notifications</span>
          <span className="val">
            {perm === "granted" ? (
              "Allowed"
            ) : perm === "unsupported" ? (
              "Unavailable"
            ) : (
              <button
                type="button"
                className={perm === "denied" ? "btn-text muted" : "btn-text"}
                onClick={() => requestPermission().then(setPerm)}
              >
                {perm === "denied" ? "Not allowed · Open ›" : "Allow"}
              </button>
            )}
          </span>
        </div>
        {isNative() && (
          <div className="set-row">
            <span className="lbl">
              Daily review<small>“Evening Edition” with the count still open</small>
            </span>
            <span className="val">
              <Segmented
                label="Daily review"
                value={s.dailyReview.enabled ? "on" : "off"}
                options={[
                  { value: "on", label: "On" },
                  { value: "off", label: "Off" },
                ]}
                onChange={(v) => set({ dailyReview: { ...s.dailyReview, enabled: v === "on" } }).then(scheduleSync)}
              />
              <HourSelect
                label="Daily review time"
                value={s.dailyReview.hour}
                onChange={(hour) => set({ dailyReview: { ...s.dailyReview, hour, minute: 0 } }).then(scheduleSync)}
              />
            </span>
          </div>
        )}
        {isNative() && (
          <div className="set-row">
            <span className="lbl">Exact alarms</span>
            <span className="val">
              {exact === "granted" ? (
                "Allowed"
              ) : (
                <button
                  type="button"
                  className="btn-text"
                  style={{ color: "var(--accent)" }}
                  onClick={() => openExactAlarmSetting().then(() => exactAlarms().then(setExact))}
                >
                  Not allowed · Open ›
                </button>
              )}
            </span>
          </div>
        )}
        <div className="set-row">
          <span className="lbl">
            Private reminders<small>Lock screen shows “An entry is due”</small>
          </span>
          <Segmented
            label="Private reminders"
            value={s.privateReminders ? "on" : "off"}
            options={[
              { value: "off", label: "Off" },
              { value: "on", label: "On" },
            ]}
            onChange={(v) => set({ privateReminders: v === "on" }).then(scheduleSync)}
          />
        </div>
        <div className="set-row">
          <span className="lbl">Not firing?</span>
          <button type="button" className="btn-text" aria-expanded={help} onClick={() => setHelp(!help)}>
            {help ? "Close the note" : "Read the note ›"}
          </button>
        </div>
        {help && (
          <div className="footnote" style={{ lineHeight: 1.7 }}>
            <p>Android delivers a reminder late or not at all when:</p>
            <p>· “Alarms &amp; reminders” is not allowed for Nocturne (reminders drift by up to an hour);</p>
            <p>· the phone’s battery manager stops the app — some makers do this aggressively;</p>
            <p>· the app was force-stopped: Android drops every alarm until Nocturne is opened again.</p>
            <p>
              Opening Nocturne re-arms everything. For your phone’s maker, see{" "}
              <button type="button" onClick={() => openExternal("https://dontkillmyapp.com")}>
                dontkillmyapp.com
              </button>
              .
            </p>
          </div>
        )}
      </section>

      <BackupPanel />

      <footer className="attribution">
        <p>
          Set in Bricolage Grotesque, Geist &amp; Geist Mono (SIL OFL). Motion, Dexie, chrono-node, Lucide, Zustand,
          React Router, Capacitor (MIT / Apache-2.0 / ISC). Ordering by fractional-indexing (CC0).
        </p>
        <p>
          Habit strength re-implemented from the published description of Loop Habit Tracker’s score; no Loop code is
          used.
        </p>
        <p>No accounts. No analytics. Your data stays on this device unless you back it up.</p>
        <p>Nocturne {__APP_VERSION__}</p>
      </footer>
    </div>
  );
}
