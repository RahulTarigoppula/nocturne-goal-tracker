import { App } from "@capacitor/app";
import { SystemBars, SystemBarsStyle } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { StatusBar } from "@capacitor/status-bar";
import { db } from "../data/db";
import * as repo from "../data/repo";
import { isNative } from "./index";
import { scheduleSync, setup } from "./notifications";

export interface SystemHooks {
  onResume: () => void;
  navigate: (hash: string) => void;
  /** Return true when something (a sheet) consumed the back press. */
  onBack: () => boolean;
}

/** Only these three deep-link shapes are honoured; anything else is ignored silently. */
export function routeDeepLink(
  url: string,
): { kind: "today" } | { kind: "entry"; id: string } | { kind: "complete"; id: string } | null {
  const m = /^nocturne:\/\/(today|entry|complete)(?:\/([A-Za-z0-9]{1,32}))?\/?$/.exec(url.trim());
  if (!m) return null;
  if (m[1] === "today" && !m[2]) return { kind: "today" };
  if (m[1] === "entry" && m[2]) return { kind: "entry", id: m[2] };
  if (m[1] === "complete" && m[2]) return { kind: "complete", id: m[2] };
  return null;
}

async function strikeQuietly(id: string) {
  const e = await db.entries.get(id);
  if (e?.status === "open") await repo.strike(id).catch(() => {});
}

export async function installSystemHooks(h: SystemHooks): Promise<void> {
  if (!isNative()) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") h.onResume();
    });
    return;
  }
  await setup();
  await App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      h.onResume();
      scheduleSync();
    }
  });
  await App.addListener("appUrlOpen", ({ url }) => {
    const r = routeDeepLink(url);
    if (!r) return;
    if (r.kind === "today") h.navigate("#/");
    else if (r.kind === "entry") h.navigate(`#/?entry=${r.id}`);
    else strikeQuietly(r.id);
  });
  await App.addListener("backButton", ({ canGoBack }) => {
    if (h.onBack()) return;
    if (canGoBack && location.hash && location.hash !== "#/") history.back();
    else App.exitApp();
  });
  await LocalNotifications.addListener("localNotificationActionPerformed", async (a) => {
    const extra = a.notification.extra as { entryId?: string; kind?: string } | undefined;
    const id = extra?.entryId;
    if (!id) {
      h.navigate(extra?.kind === "habit" ? "#/ledger" : "#/");
      return;
    }
    if (a.actionId === "done") await strikeQuietly(id);
    else if (a.actionId === "snooze") {
      await repo.updateEntry(id, { reminderAt: Date.now() + 3_600_000 });
      scheduleSync();
    } else h.navigate(`#/?entry=${id}`);
  });
}

/**
 * System bars follow the page: light icons on Night, dark on Proof. On WebViews where Capacitor pads the
 * content (Chromium < 140) the strip behind the status bar is painted with the current ground colour, so the
 * evening turn and Proof never leave a mismatched band. Newer WebViews draw edge-to-edge under the bar.
 */
export async function setStatusBar(light: boolean, ground: string): Promise<void> {
  if (!isNative()) return;
  try {
    await SystemBars.setStyle({ style: light ? SystemBarsStyle.Light : SystemBarsStyle.Dark });
  } catch {
    /* plugin unavailable */
  }
  try {
    if (/^#[0-9a-f]{6}$/i.test(ground)) await StatusBar.setBackgroundColor({ color: ground });
  } catch {
    /* no-op on edge-to-edge Android */
  }
}
