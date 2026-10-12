import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  label: string;
  labelledBy?: string;
  onClose: () => void;
  tall?: boolean;
  children: ReactNode;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Bottom sheet on phones, centred 560 px dialog on desktop. Focus trap, Esc, swipe-down on the grabber. */
export function Sheet({ label, labelledBy, onClose, tall, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // On touch screens never focus a text field on open (it would raise the keyboard over the sheet);
    // buttons are fine, and keyboard users get the field.
    const target = el.querySelector<HTMLElement>("[data-autofocus]");
    const isField = target?.matches("input, textarea") ?? false;
    const fine = matchMedia("(pointer: fine)").matches;
    const first = target && (fine || !isField) ? target : el;
    first.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (items.length === 0) return;
      const a = items[0] as HTMLElement;
      const z = items.at(-1) as HTMLElement;
      if (e.shiftKey && (document.activeElement === a || document.activeElement === el)) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onGrabDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onGrabMove = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    ref.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onGrabUp = () => {
    if (!drag.current || !ref.current) return;
    const { dy } = drag.current;
    drag.current = null;
    ref.current.style.transform = "";
    if (dy > 80) onClose();
  };

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className={`sheet${tall ? " tall" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        <button
          type="button"
          className="grabber"
          aria-label="Close"
          onClick={onClose}
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          onPointerCancel={onGrabUp}
        />
        {children}
      </div>
    </>,
    document.body,
  );
}
