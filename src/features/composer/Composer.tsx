import { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "../../app/store";
import { addEntry, undo as undoRepo } from "../../data/repo";
import { pad2 } from "../../engine/ordering";
import { type Chip, type ChronoParse, chipKey, parseQuickAdd } from "../../engine/quickadd";
import type { DayKey } from "../../engine/types";
import { UndoFoot } from "../front-page/UndoFoot";
import { useSound } from "../sound/useSound";

let chronoParse: ChronoParse | null = null;
let chronoLoading: Promise<void> | null = null;
/** chrono-node is a lazy chunk: prefetched on hover/pointerdown/focus so the first keystroke is never late. */
export function prefetchChrono(): Promise<void> {
  if (chronoParse) return Promise.resolve();
  chronoLoading ??= import("chrono-node").then((m) => {
    chronoParse = m.parse as unknown as ChronoParse;
  });
  return chronoLoading;
}

interface Props {
  today: DayKey;
  rolloverHour: number;
  nextFolio: number;
  placeholder?: string;
  /** Upcoming/Someday composers file with a default day. */
  defaultWhen?: DayKey | null;
  onFiled?: (when: DayKey | undefined) => void;
  showUndo?: boolean;
}

export function Composer({
  today,
  rolloverHour,
  nextFolio,
  placeholder = "Add to the issue…",
  defaultWhen,
  onFiled,
  showUndo = true,
}: Props) {
  const [text, setText] = useState("");
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [chronoReady, force] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const undo = useUi((s) => s.undo);
  const setUndo = useUi((s) => s.setUndo);
  const bumpStrikes = useUi((s) => s.bumpStrikes);
  const focusTick = useUi((s) => s.composerFocusTick);
  const snd = useSound();

  useEffect(() => {
    if (focusTick > 0) {
      inputRef.current?.focus();
      prefetchChrono().then(() => force((n) => n + 1));
    }
  }, [focusTick]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: chronoReady re-parses once the lazy chrono chunk lands
  const parsed = useMemo(
    () => (text.trim() ? parseQuickAdd(text, new Date(), chronoParse, { ignore: ignored, rolloverHour }) : null),
    [text, ignored, rolloverHour, chronoReady],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: chronoReady re-parses once the lazy chrono chunk lands
  const chips: (Chip & { off: boolean })[] = useMemo(() => {
    if (!text.trim()) return [];
    const on = parsed?.chips ?? [];
    // Re-derive discarded chips from an unfiltered parse so they stay visible (muted, struck).
    const all = parseQuickAdd(text, new Date(), chronoParse, { rolloverHour }).chips;
    return all.map((c) => ({ ...c, off: !on.some((o) => chipKey(o) === chipKey(c)) }));
  }, [text, parsed, rolloverHour, chronoReady]);

  const file = async (evening: boolean) => {
    if (!parsed) return;
    const when = parsed.when ?? (defaultWhen === null ? undefined : (defaultWhen ?? today));
    // Clear first: typing may continue while the write lands.
    setText("");
    setIgnored(new Set());
    const e = await addEntry({
      title: parsed.title,
      when,
      evening: evening || parsed.evening,
      tags: parsed.tags,
      deadline: parsed.deadline,
      recurrence: parsed.recurrence,
      reminderAt: parsed.reminderAt,
    });
    setUndo(null);
    onFiled?.(e.when);
  };

  const onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      if (!text.trim()) {
        inputRef.current?.blur();
        return;
      }
      file(ev.shiftKey).catch(() => {});
    } else if (ev.key === "Escape") {
      setText("");
      inputRef.current?.blur();
    }
  };

  const doUndo = async () => {
    if (!undo) return;
    setUndo(null);
    await undoRepo(undo);
    if (undo.kind === "strike") {
      bumpStrikes(-1);
      snd.undo();
    }
  };

  const hasText = text.trim().length > 0;
  return (
    <form className="composer" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
      <div className="composer-row">
        <span className={`plus${hasText ? " folio-preview" : ""}`} aria-hidden="true">
          {hasText ? pad2(nextFolio) : "+"}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={text}
          placeholder={placeholder}
          aria-label={placeholder.replace("…", "")}
          enterKeyHint="done"
          data-composer
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => prefetchChrono().then(() => force((n) => n + 1))}
          onPointerEnter={() => prefetchChrono()}
          onPointerDown={() => prefetchChrono()}
        />
        <button
          type="button"
          className="find-hint"
          onClick={() => useUi.getState().open({ kind: "find" })}
          aria-label="Find (Control K)"
        >
          ⌘K Find
        </button>
      </div>
      <div className="chips">
        {chips.map((c) => (
          <button
            key={chipKey(c)}
            type="button"
            className={`chip${c.off ? " off" : ""}`}
            aria-pressed={!c.off}
            aria-label={`${c.label}${c.off ? ", ignored" : ""}. Tap to ${c.off ? "use" : "ignore"}`}
            onClick={() => {
              const next = new Set(ignored);
              if (next.has(chipKey(c))) next.delete(chipKey(c));
              else next.add(chipKey(c));
              setIgnored(next);
              inputRef.current?.focus();
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="hint">
        {undo && showUndo ? <UndoFoot undo={undo} onUndo={doUndo} /> : "Enter to file · Shift+Enter for this evening"}
      </div>
    </form>
  );
}
