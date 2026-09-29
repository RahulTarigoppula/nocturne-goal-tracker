import { useCallback } from "react";
import { useUi } from "../../app/store";
import { deleteEntry, type MoveTarget, moveTo, NotOpenError, strike } from "../../data/repo";
import { hhmm } from "../../engine/daykey";
import { pad2 } from "../../engine/ordering";
import type { Entry } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { ms } from "../../styles/motion";
import { unlockAudio } from "../sound/synth";
import { useSound } from "../sound/useSound";

/** Strike / move / delete with haptics, sound, undo slot and screen-reader announcements. */
export function useEntryActions() {
  const snd = useSound();
  const doStrike = useCallback(
    async (e: Entry, folio: number | null, onDrawn?: () => void) => {
      unlockAudio();
      const ui = useUi.getState();
      // Haptic + note at 60 % of the 320 ms stroke.
      window.setTimeout(
        () => {
          haptics.strike();
          snd.strike(useUi.getState().strikeCountToday);
        },
        Math.round(ms.strike * 0.6),
      );
      try {
        const u = await strike(e.id);
        ui.bumpStrikes(1);
        ui.setUndo({ ...u, label: folio ? `Entry ${pad2(folio)} closed` : "Entry closed" });
        ui.say(`Closed at ${hhmm(new Date())}`);
      } catch (err) {
        if (!(err instanceof NotOpenError)) ui.say("Could not save");
      }
      onDrawn?.();
    },
    [snd],
  );

  const doMove = useCallback(async (e: Entry, target: MoveTarget, label: string) => {
    const u = await moveTo(e.id, target);
    if (u) useUi.getState().setUndo({ ...u, label });
    useUi.getState().say(label);
  }, []);

  const doDelete = useCallback(async (e: Entry) => {
    const u = await deleteEntry(e.id);
    if (u) useUi.getState().setUndo({ ...u, label: "Entry deleted" });
    useUi.getState().say("Entry deleted");
  }, []);

  return { strike: doStrike, move: doMove, remove: doDelete };
}
