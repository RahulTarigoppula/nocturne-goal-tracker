import { type ReactNode, useEffect, useRef } from "react";
import { clock } from "../data/clock";
import { ensureSeed, onWrite, rollForward } from "../data/repo";
import { isEvening, todayKey } from "../engine/daykey";
import { unlockAudio } from "../features/sound/synth";
import { isNative } from "../platform";
import { scheduleSync, syncSchedules } from "../platform/notifications";
import { installSystemHooks, setStatusBar } from "../platform/system";
import { useUi } from "./store";
import { useEffectiveSettings } from "./useEffectiveSettings";

/** Clock, rollover, theme/evening/motion classes, platform hooks, write side effects. */
export function Providers({ children, navigate }: { children: ReactNode; navigate: (hash: string) => void }) {
  const settings = useEffectiveSettings();
  const lastToday = useRef<string | null>(null);
  const navRef = useRef(navigate);
  navRef.current = navigate;

  // First launch seed + storage health.
  useEffect(() => {
    ensureSeed().catch(() => useUi.setState({ storageError: true }));
  }, []);

  // Clock ticker: every 60 s and on visibility; a new day re-rolls the masthead and rolls overdue entries forward.
  useEffect(() => {
    if (!settings) return;
    const tick = () => {
      const now = clock.now();
      const today = todayKey(new Date(now), settings.dayRolloverHour);
      useUi.getState().setNow(now, today);
      if (lastToday.current !== today) {
        lastToday.current = today;
        rollForward(today).catch(() => {});
      }
      const evening = isEvening(new Date(now), settings.eveningHour, settings.dayRolloverHour);
      document.documentElement.classList.toggle("evening", evening);
      try {
        localStorage.setItem("nocturne.evening", evening ? "1" : "0");
      } catch {
        /* private mode */
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [settings]);

  // Theme + motion on <html>, mirrored to localStorage for the pre-paint bootstrap.
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", settings.theme);
    root.classList.toggle("reduced-motion", settings.motion === "reduced");
    const mq = matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const light = settings.theme === "proof" || (settings.theme === "auto" && mq.matches);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", getComputedStyle(root).getPropertyValue("--bg").trim());
      setStatusBar(light);
    };
    apply();
    mq.addEventListener("change", apply);
    try {
      localStorage.setItem("nocturne.theme", settings.theme);
      localStorage.setItem("nocturne.motion", settings.motion);
    } catch {
      /* private mode */
    }
    return () => mq.removeEventListener("change", apply);
  }, [settings]);

  // Side effects of writes: notification re-sync (debounced) and one storage.persist() request on the web.
  useEffect(() => {
    let asked = false;
    const off = onWrite((kind) => {
      if (kind !== "issues") scheduleSync();
      if (!asked && kind === "entries" && !isNative() && navigator.storage?.persist) {
        asked = true;
        navigator.storage.persist().catch(() => {});
      }
    });
    syncSchedules().catch(() => {});
    const backup = () => {
      import("../data/autoBackup")
        .then(async ({ maybeAutoBackup }) => maybeAutoBackup((await import("../platform/secrets")).loadToken))
        .catch(() => {});
    };
    const t = window.setTimeout(backup, 10_000);
    const iv = window.setInterval(backup, 30 * 60_000);
    return () => {
      off();
      clearTimeout(t);
      clearInterval(iv);
    };
  }, []);

  // Platform hooks (resume, deep links, back button) and the audio unlock gesture.
  useEffect(() => {
    installSystemHooks({
      onResume: () => {
        const s = useUi.getState();
        s.setNow(clock.now(), s.today ?? todayKey(new Date(), 3));
      },
      navigate: (hash) => navRef.current(hash),
      onBack: () => {
        if (useUi.getState().openSheet) {
          useUi.getState().close();
          return true;
        }
        return false;
      },
    }).catch(() => {});
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
  }, []);

  return <>{children}</>;
}
