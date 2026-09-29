import { animate, type DragControls, motion, Reorder, useMotionValue, useTransform } from "motion/react";
import { memo, useEffect, useRef, useState } from "react";
import { DigitRoll } from "../../components/ui/DigitRoll";
import { pad2 } from "../../engine/ordering";
import type { DayKey, Entry } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { ms, SWIPE_THRESHOLD, SWIPE_VELOCITY, spring } from "../../styles/motion";
import { ariaFor, metaParts } from "./meta";

export interface RowHandlers {
  onStrike: (e: Entry) => void;
  onOpen: (e: Entry, el: HTMLElement) => void;
  onWhen: (e: Entry) => void;
  onSelect: (e: Entry) => void;
}

interface Props extends RowHandlers {
  entry: Entry;
  folio: number | null;
  today: DayKey;
  /** Only the first overdue row on screen is vermilion. */
  vermilion: boolean;
  selected: boolean;
  /** Done state shown optimistically (strike drawn) before the row re-sets. */
  showDone: boolean;
  instant: boolean;
  compact?: boolean;
  tail?: string;
  /** Reorder support: when present the row is a Reorder.Item activated by a long press. */
  reorder?: { value: Entry; controls: DragControls; onDragStart: () => void; onDragEnd: () => void; dragging: boolean };
}

type Mode = "idle" | "pending" | "swipe" | "lift" | "scroll";

export const EntryRow = memo(function EntryRow(p: Props) {
  const { entry: e, folio } = p;
  const x = useMotionValue(0);
  const doneOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const whenOpacity = useTransform(x, [0, -SWIPE_THRESHOLD], [0, 1]);
  const [armed, setArmed] = useState<"done" | "when" | null>(null);
  const [lifted, setLifted] = useState(false);
  const liRef = useRef<HTMLLIElement>(null);
  const g = useRef({
    mode: "idle" as Mode,
    x0: 0,
    y0: 0,
    t0: 0,
    lastX: 0,
    lastT: 0,
    v: 0,
    timer: 0,
    suppress: false,
    armed: false,
  });

  // Block native scrolling once a lift or swipe owns the gesture.
  useEffect(() => {
    const el = liRef.current;
    if (!el) return;
    const onTouchMove = (ev: TouchEvent) => {
      const m = g.current.mode;
      if (m === "lift" || m === "swipe") ev.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  const reset = () => {
    clearTimeout(g.current.timer);
    g.current.mode = "idle";
  };

  const onPointerDown = (ev: React.PointerEvent) => {
    if (ev.button !== 0 || (e.status === "done" && !p.reorder)) return;
    const s = g.current;
    s.suppress = false;
    s.armed = false;
    s.x0 = ev.clientX;
    s.y0 = ev.clientY;
    s.t0 = s.lastT = ev.timeStamp;
    s.lastX = ev.clientX;
    s.v = 0;
    // Never start a gesture inside the system back-gesture strip.
    if (ev.clientX < 24 || ev.clientX > window.innerWidth - 24) {
      s.mode = "scroll";
      return;
    }
    s.mode = "pending";
    const native = ev.nativeEvent;
    if (p.reorder && e.status === "open") {
      s.timer = window.setTimeout(() => {
        if (s.mode !== "pending") return;
        s.mode = "lift";
        s.suppress = true;
        setLifted(true);
        haptics.lift();
        p.reorder?.controls.start(native);
      }, ms.longPress);
    }
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const s = g.current;
    if (s.mode === "idle" || s.mode === "scroll" || s.mode === "lift") return;
    const dx = ev.clientX - s.x0;
    const dy = ev.clientY - s.y0;
    if (s.mode === "pending") {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) && e.status === "open") {
        s.mode = "swipe";
        s.suppress = true;
        clearTimeout(s.timer);
        (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      } else if (Math.abs(dy) > 8 || Math.abs(dx) > 12) {
        s.mode = "scroll";
        clearTimeout(s.timer);
        return;
      } else return;
    }
    // swipe: ±120 constraint with 0.2 elastic beyond
    const lim = 120;
    const clamped = Math.abs(dx) <= lim ? dx : Math.sign(dx) * (lim + (Math.abs(dx) - lim) * 0.2);
    x.set(clamped);
    const dt = ev.timeStamp - s.lastT;
    if (dt > 0) s.v = ((ev.clientX - s.lastX) / dt) * 1000;
    s.lastX = ev.clientX;
    s.lastT = ev.timeStamp;
    const nowArmed = clamped >= SWIPE_THRESHOLD ? "done" : clamped <= -SWIPE_THRESHOLD ? "when" : null;
    if (nowArmed && !s.armed) haptics.armed();
    s.armed = !!nowArmed;
    setArmed(nowArmed);
  };

  const onPointerUp = () => {
    const s = g.current;
    clearTimeout(s.timer);
    if (s.mode === "swipe") {
      const dx = x.get();
      const right = dx >= SWIPE_THRESHOLD || (s.v > SWIPE_VELOCITY && dx > 24);
      const left = dx <= -SWIPE_THRESHOLD || (s.v < -SWIPE_VELOCITY && dx < -24);
      animate(x, 0, spring);
      setArmed(null);
      if (right) p.onStrike(e);
      else if (left) p.onWhen(e);
    }
    if (s.mode !== "lift") reset();
  };

  const onDragEnd = () => {
    reset();
    setLifted(false);
    haptics.drop();
    p.reorder?.onDragEnd();
  };

  const onClickCapture = (ev: React.MouseEvent) => {
    if (g.current.suppress) {
      ev.stopPropagation();
      ev.preventDefault();
      g.current.suppress = false;
    }
  };

  const parts = metaParts(e, p.today);
  const done = p.showDone || e.status === "done";
  const cls = `entry${done ? " done" : ""}${p.selected ? " selected" : ""}${lifted ? " lifted" : ""}${p.compact ? " compact" : ""}${p.instant ? " instant" : ""}`;

  const body = (
    <>
      <span className="mw mw-left" aria-hidden="true">
        <motion.span style={{ opacity: doneOpacity }} className={`mw-inner${armed === "done" ? " armed" : ""}`}>
          Done.
        </motion.span>
      </span>
      <span className="mw mw-right" aria-hidden="true">
        <motion.span style={{ opacity: whenOpacity }} className={`mw-inner${armed === "when" ? " armed" : ""}`}>
          When?
        </motion.span>
      </span>
      <motion.div
        className="entry-slide"
        style={{ x }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        onContextMenu={(ev) => ev.preventDefault()}
      >
        <div className="entry-body">
          <button
            type="button"
            className="folio"
            aria-label={ariaFor(e, folio, p.today)}
            aria-disabled={done}
            data-entry-folio={e.id}
            onClick={() => !done && p.onStrike(e)}
            onFocus={(ev) => ev.currentTarget.matches(":focus-visible") && p.onSelect(e)}
          >
            {done || folio === null ? "—" : <DigitRoll value={pad2(folio)} label={String(folio)} />}
          </button>
          <div className="entry-main">
            <button
              type="button"
              className="title"
              data-entry-title={e.id}
              onClick={(ev) => p.onOpen(e, ev.currentTarget)}
              onFocus={(ev) => ev.currentTarget.matches(":focus-visible") && p.onSelect(e)}
            >
              <span className="title-text">
                {e.title}
                <svg className="strike" aria-hidden="true">
                  <line x1="0" y1="56%" x2="100%" y2="56%" pathLength={1} />
                </svg>
              </span>
            </button>
            {parts.length > 0 && !p.compact && (
              <div className="meta">
                {parts.map((m, i) => (
                  <span key={m.text}>
                    {i > 0 && <span className="sep">·</span>}
                    <span
                      className={m.tone === "over" && p.vermilion ? "over" : m.tone === "closed" ? "closed" : undefined}
                    >
                      {m.text}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {p.compact && <span className={`tail${p.vermilion ? " over" : ""}`}>{p.tail ?? ""}</span>}
        </div>
      </motion.div>
    </>
  );

  if (p.reorder) {
    return (
      <Reorder.Item
        ref={liRef}
        as="li"
        value={p.reorder.value}
        dragListener={false}
        dragControls={p.reorder.controls}
        onDragStart={p.reorder.onDragStart}
        onDragEnd={onDragEnd}
        layout="position"
        layoutId={e.id}
        transition={{ duration: 0.24, ease: [0.2, 0.7, 0.1, 1] }}
        className={cls}
        style={{ position: "relative" }}
        whileDrag={{ scale: 1.02 }}
      >
        {body}
      </Reorder.Item>
    );
  }
  return (
    <motion.li
      ref={liRef}
      layout="position"
      layoutId={e.id}
      transition={{ duration: 0.24, ease: [0.2, 0.7, 0.1, 1] }}
      className={cls}
    >
      {body}
    </motion.li>
  );
});
