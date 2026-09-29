import { useEffect } from "react";
import { useUi } from "../../app/store";
import type { Undo } from "../../data/repo";

/** Replaces the composer hint for exactly 5 s with a shrinking foil rule. */
export function UndoFoot({ undo, onUndo }: { undo: Undo & { label: string }; onUndo: () => void }) {
  useEffect(() => {
    const left = undo.expiresAt - Date.now();
    const t = window.setTimeout(
      () => {
        if (useUi.getState().undo === undo) useUi.getState().setUndo(null);
      },
      Math.max(0, left),
    );
    return () => clearTimeout(t);
  }, [undo]);
  return (
    <>
      <button type="button" className="undo-btn" onClick={onUndo}>
        {undo.label} — <u>Undo</u>
      </button>
      <span
        className="undo-rule"
        key={undo.expiresAt}
        style={{ animationDuration: `${undo.expiresAt - Date.now()}ms` }}
      />
    </>
  );
}
