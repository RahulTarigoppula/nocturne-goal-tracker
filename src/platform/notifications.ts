import { LocalNotifications } from "@capacitor/local-notifications";
import { db } from "../data/db";
import { currentToday, getSettings } from "../data/repo";
import { diffSchedules, planNotifications, REVIEW_ID, reviewBody } from "../engine/notifications-plan";
import { isNative } from "./index";

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";
export type ExactState = "granted" | "denied" | "n/a";

let actionsRegistered = false;

async function countOpenToday(): Promise<number> {
  const today = await currentToday();
  return (await db.entries.where("when").equals(today).toArray()).filter((e) => !e.deletedAt && e.status === "open")
    .length;
}

export async function permission(): Promise<PermissionState> {
  if (isNative()) {
    const { display } = await LocalNotifications.checkPermissions();
    return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
  }
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission === "default" ? "prompt" : Notification.permission;
}

export async function requestPermission(): Promise<PermissionState> {
  if (isNative()) {
    const { display } = await LocalNotifications.requestPermissions();
    await setup();
    await syncSchedules();
    return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
  }
  if (typeof Notification === "undefined") return "unsupported";
  const p = await Notification.requestPermission();
  await syncSchedules();
  return p === "default" ? "prompt" : p;
}

export async function exactAlarms(): Promise<ExactState> {
  if (!isNative()) return "n/a";
  try {
    const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting();
    return exact_alarm === "granted" ? "granted" : "denied";
  } catch {
    return "n/a";
  }
}

export async function openExactAlarmSetting(): Promise<void> {
  if (isNative()) await LocalNotifications.changeExactNotificationSetting().catch(() => {});
}

/** Channel + action types; once per process. */
export async function setup(): Promise<void> {
  if (!isNative() || actionsRegistered) return;
  actionsRegistered = true;
  await LocalNotifications.createChannel({ id: "reminders", name: "Reminders", importance: 4 }).catch(() => {});
  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: "ENTRY",
        actions: [
          { id: "done", title: "Done" },
          { id: "snooze", title: "Snooze 1 h" },
        ],
      },
    ],
  }).catch(() => {});
}

/* ---------------------------------------------------------------- web fallback: only while the tab is open */
const webTimers = new Map<number, number>();

async function webFallbackScheduler(): Promise<void> {
  for (const t of webTimers.values()) clearTimeout(t);
  webTimers.clear();
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const s = await getSettings();
  const now = Date.now();
  const plan = planNotifications(await db.entries.toArray(), s, now).filter((p) => p.at - now < 2 ** 31 - 1);
  for (const p of plan) {
    webTimers.set(
      p.id,
      window.setTimeout(() => {
        try {
          new Notification(p.title, { body: p.body, tag: String(p.id) });
        } catch {
          /* some browsers only allow notifications from a service worker */
        }
      }, p.at - now),
    );
  }
}

/** Reconcile pending OS alarms with what the data wants. Idempotent; safe to call often. */
export async function syncSchedules(): Promise<void> {
  if (!isNative()) return webFallbackScheduler();
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== "granted") return;
  await setup();
  const s = await getSettings();
  const desired = planNotifications(await db.entries.toArray(), s, Date.now());
  const pending = (await LocalNotifications.getPending()).notifications.map((n) => ({
    id: n.id,
    at: (n.extra as { at?: number } | undefined)?.at,
  }));
  const { cancel, schedule } = diffSchedules(desired, pending);
  if (cancel.length) await LocalNotifications.cancel({ notifications: cancel.map((id) => ({ id })) });
  if (schedule.length) {
    await LocalNotifications.schedule({
      notifications: schedule.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        actionTypeId: "ENTRY",
        extra: { ...p.extra, at: p.at },
        schedule: { at: new Date(p.at), allowWhileIdle: true },
        smallIcon: "ic_stat_nocturne",
        channelId: "reminders",
      })),
    });
  }
  // The daily review uses `on:` (cron-like, re-arms itself exactly). `at` + `repeats` would degrade to inexact.
  await LocalNotifications.cancel({ notifications: [{ id: REVIEW_ID }] }).catch(() => {});
  if (s.dailyReview.enabled) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REVIEW_ID,
          title: "Evening Edition",
          body: s.privateReminders ? "Your issue is waiting." : reviewBody(await countOpenToday()),
          schedule: { on: { hour: s.dailyReview.hour, minute: s.dailyReview.minute }, allowWhileIdle: true },
          extra: { kind: "review" },
          smallIcon: "ic_stat_nocturne",
          channelId: "reminders",
        },
      ],
    });
  }
}

let timer: number | undefined;
/** Debounced re-sync after writes (500 ms). */
export function scheduleSync(): void {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    syncSchedules().catch(() => {});
  }, 500);
}
