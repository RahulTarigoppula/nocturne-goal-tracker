import { useMemo } from "react";
import { useSettings } from "../data/queries";
import { defaultSettings } from "../data/repo";
import { todayKey } from "../engine/daykey";
import type { Settings } from "../engine/types";
import { useUi } from "./store";

/** Stored settings, or in-memory defaults when IndexedDB is unavailable (the app still runs, unsaved). */
export function useEffectiveSettings(): Settings | undefined {
  const stored = useSettings();
  const storageError = useUi((s) => s.storageError);
  return useMemo(() => {
    if (stored) return stored;
    if (!storageError) return undefined;
    const now = Date.now();
    return defaultSettings(todayKey(new Date(now), 3), now);
  }, [stored, storageError]);
}
