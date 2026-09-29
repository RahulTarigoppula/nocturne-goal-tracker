import { useEffect, useRef, useState } from "react";
import { useUi } from "../../app/store";
import { Sheet } from "../../components/ui/Sheet";
import { newId } from "../../data/clock";
import { useDayEntries, useEntry } from "../../data/queries";
import { deleteEntry, type EntryPatch, reopen, updateChecklist, updateEntry } from "../../data/repo";
import { atLocal, hhmm, localKey, shortDate } from "../../engine/daykey";
import { deriveSections, pad2 } from "../../engine/ordering";
import { describe } from "../../engine/recurrence";
import type { ChecklistItem, Entry } from "../../engine/types";
import { isNative } from "../../platform";
import {
  exactAlarms,
  openExactAlarmSetting,
  permission,
  requestPermission,
  scheduleSync,
} from "../../platform/notifications";
import { useEntryActions } from "../front-page/useEntryActions";
import { MonthGrid } from "./MonthGrid";
import { RepeatPicker } from "./RepeatPicker";

type Editing = "deadline" | "repeat" | "reminder" | "tags" | null;

export function EntrySheet({ id }: { id: string }) {
  const entry = useEntry(id);
  const today = useUi((s) => s.today);
  const close = useUi((s) => s.close);
  const dayEntries = useDayEntries(entry?.when ?? null);
  const { move } = useEntryActions();
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [exact, setExact] = useState<"granted" | "denied" | "n/a">("n/a");
  const [notifPerm, setNotifPerm] = useState<string>("granted");

  useEffect(() => {
    if (entry?.reminderAt) {
      exactAlarms().then(setExact);
      permission().then(setNotifPerm);
    }
  }, [entry?.reminderAt]);

  if (entry === undefined || !today) return null;
  if (!entry || entry.deletedAt) {
    return (
      <Sheet label="Entry" onClose={close}>
        <p className="light-line">This entry is no longer in the issue.</p>
      </Sheet>
    );
  }

  const save = (patch: EntryPatch) =>
    updateEntry(entry.id, patch)
      .then(() => {
        setSaveError(false);
        if ("reminderAt" in patch) scheduleSync();
      })
      .catch(() => setSaveError(true));

  const folio = dayEntries ? deriveSections(dayEntries).folios.get(entry.id) : undefined;
  const folioText = entry.status === "done" ? "—" : folio ? pad2(folio) : "·";
  const whenText = !entry.when
    ? "Someday"
    : entry.when === today
      ? entry.evening
        ? "This evening"
        : "Today"
      : shortDate(entry.when);
  const reminderText = entry.reminderAt
    ? `${entry.when && localKey(new Date(entry.reminderAt)) !== entry.when ? `${shortDate(localKey(new Date(entry.reminderAt)))} ` : ""}${hhmm(new Date(entry.reminderAt))}`
    : "None";
  const showExact = isNative() && !!entry.reminderAt && exact === "denied";
  const repeatText = entry.recurrence
    ? `${describe(entry.recurrence)}${entry.instanceNo && entry.instanceNo > 1 ? ` · instance ${entry.instanceNo}` : ""}`
    : "Never";

  return (
    <Sheet label="Entry" labelledBy="entry-head" onClose={close} tall>
      <h2 className="sheet-head" id="entry-head">
        <span className="f">{folioText}</span>
        <TitleField entry={entry} onSave={(title) => save({ title })} />
      </h2>
      <div className="notes">
        <NotesField entry={entry} onSave={(notes) => save({ notes })} />
      </div>
      <Checklist
        entry={entry}
        folio={folioText}
        onSave={(fn) => updateChecklist(entry.id, fn).catch(() => setSaveError(true))}
      />

      <div className="mono-table">
        <button type="button" className="r" onClick={() => useUi.getState().open({ kind: "when", id: entry.id })}>
          <span className="k">When</span>
          <span className="v">{whenText}</span>
          <span className="chev" aria-hidden="true">
            ›
          </span>
        </button>
        <Row
          label="Deadline"
          value={entry.deadline ? shortDate(entry.deadline) : "None"}
          open={editing === "deadline"}
          onToggle={() => setEditing(editing === "deadline" ? null : "deadline")}
        />
        {editing === "deadline" && (
          <div className="editor">
            <MonthGrid
              today={today}
              value={entry.deadline}
              onPick={(k) => {
                save({ deadline: k });
                setEditing(null);
              }}
            />
            {entry.deadline && (
              <button
                type="button"
                className="btn-text muted"
                onClick={() => save({ deadline: undefined }).then(() => setEditing(null))}
              >
                Clear deadline
              </button>
            )}
          </div>
        )}
        <Row
          label="Repeat"
          value={repeatText}
          open={editing === "repeat"}
          onToggle={() => setEditing(editing === "repeat" ? null : "repeat")}
        />
        {editing === "repeat" && (
          <div className="editor">
            <RepeatPicker
              value={entry.recurrence}
              base={entry.when ?? today}
              onChange={(r) => save({ recurrence: r })}
            />
          </div>
        )}
        <Row
          label="Reminder"
          value={reminderText}
          sup={showExact ? "¹" : undefined}
          open={editing === "reminder"}
          onToggle={() => setEditing(editing === "reminder" ? null : "reminder")}
        />
        {editing === "reminder" && (
          <ReminderEditor
            entry={entry}
            fallbackDay={entry.when ?? today}
            onSave={(at) => {
              save({ reminderAt: at });
              if (at && notifPerm === "prompt") requestPermission().then(setNotifPerm);
            }}
          />
        )}
        <Row
          label="Tags"
          value={entry.tags.length ? entry.tags.map((t) => `#${t.toUpperCase()}`).join(" ") : "None"}
          open={editing === "tags"}
          onToggle={() => setEditing(editing === "tags" ? null : "tags")}
        />
        {editing === "tags" && <TagsEditor entry={entry} onSave={(tags) => save({ tags })} />}
      </div>

      {showExact && (
        <p className="footnote warn">
          ¹ Reminders may be delayed until you allow "Alarms &amp; reminders".{" "}
          <button type="button" onClick={() => openExactAlarmSetting().then(() => exactAlarms().then(setExact))}>
            Open ›
          </button>
        </p>
      )}
      {!isNative() && entry.reminderAt && (
        <p className="footnote">
          {notifPerm === "granted"
            ? "In the browser, reminders appear only while Nocturne is open."
            : "In the browser, reminders need notification permission and an open tab."}
        </p>
      )}
      {saveError && (
        <p className="footnote error">
          Could not save —{" "}
          <button type="button" onClick={() => setSaveError(false)}>
            Retry
          </button>
        </p>
      )}

      <div className="sheet-actions">
        {entry.status === "done" ? (
          <button type="button" className="btn-text" onClick={() => reopen(entry.id)}>
            Reopen
          </button>
        ) : entry.when ? (
          <button
            type="button"
            className="btn-text"
            onClick={() => {
              close();
              move(entry, "someday", "Moved to someday");
            }}
          >
            Move to Someday
          </button>
        ) : (
          <span />
        )}
        {confirmDelete ? (
          <span className="rh" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            Delete?
            <button
              type="button"
              className="btn-text danger"
              onClick={async () => {
                close();
                const u = await deleteEntry(entry.id);
                if (u) useUi.getState().setUndo({ ...u, label: "Entry deleted" });
              }}
            >
              Yes
            </button>
            <button type="button" className="btn-text" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className="btn-text danger" onClick={() => setConfirmDelete(true)}>
            Delete the entry
          </button>
        )}
      </div>
    </Sheet>
  );
}

function Row(p: { label: string; value: string; sup?: string | undefined; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="r" aria-expanded={p.open} onClick={p.onToggle}>
      <span className="k">{p.label}</span>
      <span className="v">
        {p.value}
        {p.sup && <sup> {p.sup}</sup>}
      </span>
      <span className="chev" aria-hidden="true">
        {p.open ? "‹" : "›"}
      </span>
    </button>
  );
}

/** Debounced autosave that also flushes on unmount (sheets unmount on close; blur does not fire). */
function useDebounced<T>(value: T, onSave: (v: T) => void, delay = 300) {
  const first = useRef(true);
  const saveRef = useRef(onSave);
  const pending = useRef<{ v: T } | null>(null);
  saveRef.current = onSave;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = { v: value };
    const t = window.setTimeout(() => {
      pending.current = null;
      saveRef.current(value);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  useEffect(
    () => () => {
      if (pending.current) saveRef.current(pending.current.v);
    },
    [],
  );
}

function TitleField({ entry, onSave }: { entry: Entry; onSave: (t: string) => void }) {
  const [v, setV] = useState(entry.title);
  useDebounced(v, (t) => t.trim() && t !== entry.title && onSave(t));
  return (
    <textarea
      value={v}
      rows={1}
      aria-label="Title"
      onChange={(e) => setV(e.target.value.replace(/\n/g, " "))}
      onBlur={() => v.trim() && v !== entry.title && onSave(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
    />
  );
}

function NotesField({ entry, onSave }: { entry: Entry; onSave: (t: string) => void }) {
  const [v, setV] = useState(entry.notes);
  useDebounced(v, (t) => t !== entry.notes && onSave(t));
  return (
    <textarea
      className="field"
      value={v}
      rows={Math.min(8, Math.max(2, v.split("\n").length))}
      placeholder="Notes. Paste a list to make sub-entries."
      aria-label="Notes"
      data-autofocus
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== entry.notes && onSave(v)}
      onPaste={(e) => {
        const text = e.clipboardData.getData("text");
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.replace(/^\s*([-*•]|\d+[.)]|\[.?\])\s*/, "").trim())
          .filter(Boolean);
        if (lines.length > 1 && v.trim() === "") {
          e.preventDefault();
          const items: ChecklistItem[] = lines.map((l) => ({ id: newId(), text: l, done: false }));
          updateChecklist(entry.id, (cur) => [...cur, ...items]);
        }
      }}
    />
  );
}

function Checklist({
  entry,
  folio,
  onSave,
}: {
  entry: Entry;
  folio: string;
  onSave: (fn: (c: ChecklistItem[]) => ChecklistItem[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const items = entry.checklist;
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onSave((cur) => [...cur, { id: newId(), text: t, done: false }]);
    setDraft("");
  };
  return (
    <ul className="checklist" aria-label="Sub-entries">
      {items.map((c, i) => (
        <li key={c.id}>
          <span className="f">
            {folio}.{i + 1}
          </span>
          <button
            type="button"
            className="boxbtn"
            aria-pressed={c.done}
            aria-label={`${c.done ? "Reopen" : "Close"} ${c.text}`}
            onClick={() => onSave((cur) => cur.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))}
          >
            <span className={`box${c.done ? " on" : ""}`} />
          </button>
          <span className={c.done ? "done-text" : undefined}>{c.text}</span>
          <button
            type="button"
            className="x"
            aria-label={`Remove ${c.text}`}
            onClick={() => onSave((cur) => cur.filter((x) => x.id !== c.id))}
          >
            ×
          </button>
        </li>
      ))}
      <li>
        <span className="f">
          {folio}.{items.length + 1}
        </span>
        <span className="boxbtn" aria-hidden="true">
          <span className="box" />
        </span>
        <input
          value={draft}
          placeholder="Add a sub-entry…"
          aria-label="Add a sub-entry"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
        />
        <span />
      </li>
    </ul>
  );
}

function ReminderEditor({
  entry,
  fallbackDay,
  onSave,
}: {
  entry: Entry;
  fallbackDay: string;
  onSave: (at: number | undefined) => void;
}) {
  const current = entry.reminderAt ? new Date(entry.reminderAt) : null;
  const [time, setTime] = useState(current ? hhmm(current) : "09:00");
  const day = current ? localKey(current) : fallbackDay;
  return (
    <div className="editor" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <input
        type="time"
        className="field"
        style={{ width: 140, fontFamily: "var(--font-mono)" }}
        value={time}
        aria-label="Reminder time"
        onChange={(e) => setTime(e.target.value)}
      />
      <button
        type="button"
        className="btn-text"
        onClick={() => {
          const [h = 9, m = 0] = time.split(":").map(Number);
          onSave(atLocal(day as never, h, m));
        }}
      >
        Set
      </button>
      {entry.reminderAt && (
        <button type="button" className="btn-text muted" onClick={() => onSave(undefined)}>
          Remove
        </button>
      )}
    </div>
  );
}

function TagsEditor({ entry, onSave }: { entry: Entry; onSave: (tags: string[]) => void }) {
  const [v, setV] = useState(entry.tags.map((t) => `#${t}`).join(" "));
  const commit = () =>
    onSave([
      ...new Set(
        v
          .split(/[\s,]+/)
          .map((t) => t.replace(/^#/, "").toLowerCase())
          .filter((t) => /^[\p{L}\p{N}_-]+$/u.test(t)),
      ),
    ]);
  return (
    <div className="editor">
      <input
        className="field"
        value={v}
        placeholder="#work #home"
        aria-label="Tags"
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        style={{ fontFamily: "var(--font-mono)" }}
      />
    </div>
  );
}
