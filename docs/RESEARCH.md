# Nocturne — The Minimalist Goal Tracker: Research Dossier

Research date: 2026-09-06. All version numbers, licenses and last-publish dates below were pulled live from the npm registry (`npm view`) and the GitHub REST API on this date unless marked otherwise. Anything marked **(verify)** could not be confirmed first-hand and should be re-checked before relying on it.

---

## 1. Summary & feasibility

**Feasibility: 5/5.** Nocturne is the most conventional of the eight projects from a technology standpoint: a local-first to-do/habit tracker needs no external data, no API keys, and no server. Every hard requirement (free hosting, offline, Android APK built in the cloud, local reminders) has a mature, OSI-licensed answer:

- **Storage:** IndexedDB via **Dexie 4.4.5** (Apache-2.0, published 2026-08-14) with `liveQuery` for reactive UI and `dexie-export-import` for one-click JSON backup. SQLite-in-the-browser (`@sqlite.org/sqlite-wasm` 3.53.0) is available but overkill for a personal task list.
- **Android:** **Capacitor 8.5.1** (MIT) wrapping the same Vite/React build, compiled on **GitHub Actions** (unlimited minutes on public repos) and attached to **GitHub Releases** as an APK. `@capacitor/local-notifications` 8.3.1 provides scheduled, repeating, reboot-surviving reminders with action buttons.
- **Sync/backup at zero cost:** JSON export/import (no account), GitHub Gist with a bring-your-own fine-grained PAT (api.github.com sends `Access-Control-Allow-Origin: *`, verified by request today), and Google Drive `appDataFolder` (non-sensitive scope, no verification needed, CORS preflight verified). All are optional layers over an app that works fully offline.
- **Premium visuals:** **Motion 13.2.0** (MIT) for layout/reorder/drag animation, Tailwind 4.3.3, OKLCH navy palette, variable fonts under the SIL OFL, and optional WebGL grain/mesh backgrounds.

The two genuinely hard parts are (a) making Android reminders fire reliably in the face of Doze mode, OEM battery killers and Android 14+'s "exact alarms denied by default" policy, and (b) the home-screen widget, which must be written in Kotlin (`RemoteViews`/Glance — a WebView is not allowed in widgets) and can only be compiled in CI since the owner has no Android SDK locally. Both are solvable; the widget is correctly scoped as nice-to-have.

The rest of this document gives the concrete stack, verified data on each dependency, the algorithms (streaks, recurrence, ordering, merge), reference apps, a weekend MVP cut, and the claims most worth double-checking.

---

## 2. Recommended stack

| Layer | Choice | Version / license (verified 2026-09-06) | Why |
|---|---|---|---|
| Build | Vite | 8.2.2, MIT | Fast, PWA plugin ecosystem, Capacitor-friendly static output |
| UI | React 19 + TypeScript | react 19.2.8, MIT | Largest ecosystem for DnD/gesture/animation libs below |
| Styling | Tailwind CSS v4 | 4.3.3, MIT | OKLCH design tokens in CSS, tiny output, `prefers-color-scheme`/`env()` safe-area support |
| Motion | Motion (ex-Framer Motion), `import { motion, Reorder, AnimatePresence } from "motion/react"` | 13.2.0, MIT ([motion.dev](https://motion.dev/)) | Layout animations, `Reorder` for single-list drag-to-reorder, `drag="x"` for swipe-to-complete, spring physics |
| Local DB | Dexie + dexie-react-hooks + dexie-export-import | 4.4.5 / 4.4.0 / 4.4.0, Apache-2.0 ([github](https://github.com/dexie/Dexie.js), 14.5k stars, pushed 2026-08-28) | Indexed queries, `useLiveQuery`, streaming JSON export/import, works identically in Android WebView |
| UI state | zustand | 5.0.15, MIT | Ephemeral UI state (selection, sheets, filters) outside the DB |
| Accessible primitives | Base UI (`@base-ui-components/react` 1.0.0-rc.0, MIT) or Radix (`@radix-ui/react-dialog` 1.1.23, MIT) | MIT | Dialogs, popovers, menus without fighting focus management |
| Command palette | cmdk | 1.1.1, MIT | Linear-style "Quick Find" / keyboard-first |
| Natural-language dates | chrono-node | 2.10.1, MIT ([github](https://github.com/wanasit/chrono), pushed 2026-07-20) | Todoist/Things-style quick add: "call mom tomorrow 5pm" → Date, no LLM |
| Recurrence | rrule (wrapped behind a tiny adapter) | 2.8.1, BSD-3-Clause (stale: last npm publish 2023-11; repo pushed 2024-06) | RFC 5545 RRULE strings; see risks. Fallback: 100-line in-house engine for the 6 patterns the UI exposes |
| Dates | date-fns + @date-fns/tz | 4.4.0 / 1.5.0, MIT | Formatting, ISO-week math, TZ-safe day keys |
| Cross-list DnD | @dnd-kit/core + @dnd-kit/sortable | 6.3.1 / 10.0.0, MIT (last npm publish 2024-12; repo active on experimental `@dnd-kit/react` 0.5.0) | Pointer/touch/keyboard sensors, `DragOverlay` for premium drag previews. Alternative: `@atlaskit/pragmatic-drag-and-drop` 3.1.0, Apache-2.0, published 2026-08-29 |
| Swipe gestures | Motion `drag` props (no extra dep); fallback `react-swipeable` 7.0.2 (MIT, 2026-07) | MIT | Swipe-right-to-complete, swipe-left-to-schedule |
| Icons | lucide-react | 1.41.0, ISC | Consistent 1.5px stroke icon set |
| Fonts | `@fontsource-variable/inter` 5.3.0, `@fontsource-variable/geist` 5.3.0, `@fontsource/instrument-serif` 5.3.0 | SIL OFL 1.1 | Self-hosted, no Google Fonts call at runtime |
| PWA | vite-plugin-pwa | 1.3.0, MIT | Installable web app, offline precache, manifest |
| Android shell | @capacitor/core, /android, /cli | 8.5.1, MIT (requires Node ≥ 22, JDK 17+/21 recommended, AGP 8.13, Gradle 8.14.3, minSdk 24, compileSdk 36 — [docs](https://capacitorjs.com/docs/updating/8-0)) | Same web bundle in an Android WebView plus native plugins |
| Android plugins | @capacitor/local-notifications 8.3.1, /haptics 8.0.2, /preferences 8.0.1, /filesystem 8.1.3, /share 8.0.1, /app 8.1.1, /status-bar 8.0.3, /splash-screen 8.0.2, /keyboard 8.0.5 | MIT | Reminders, haptics, backup file export via share sheet, deep links, edge-to-edge |
| Widget bridge (phase 3) | capacitor-widget-bridge | 8.1.0, MIT (57 stars, Capacitor 8) | SharedPreferences bridge + `reloadAllTimelines()` + `requestWidget()`; you write the Kotlin `AppWidgetProvider` |
| CI / APK | GitHub Actions (`ubuntu-latest`, `actions/setup-java@v4` Temurin 21, `actions/setup-node@v4` 22) → `softprops/action-gh-release` | Free: unlimited minutes on public repos, 2,000 min/month on private | Owner only downloads the APK from Releases |
| Web hosting | GitHub Pages (primary) or Cloudflare Pages | Free | Pure static; no proxy needed for MVP |
| Proxy | None required | — | Every sync option is browser-callable with the user's own token |

**Rationale.** The whole app is a static bundle, so the same `dist/` folder is deployed to GitHub Pages and copied into the Capacitor Android project. No secret ever needs to live in the code: Gist and Drive backups use tokens the user grants at runtime. Capacitor is preferred over a PWA→TWA (Bubblewrap) wrapper because a TWA cannot schedule local notifications (the Notification Triggers API never shipped) and cannot host a home-screen widget. A native/cross-platform framework (Flutter, RN) is not justified: the interaction surface is lists, cards and gestures, all of which the web stack handles at 60fps.

---

## 3. Data sources & APIs

Nocturne is user-data-only; there is no external dataset to ingest. The table covers the optional sync/backup and hosting services.

| Name | URL | License / terms | Free tier / limits | Purpose | Confidence |
|---|---|---|---|---|---|
| GitHub Gist REST API | https://docs.github.com/en/rest/gists/gists | GitHub ToS; user's own token | 5,000 req/h authenticated, 60/h unauthenticated ([rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)); files > 1 MB are `truncated: true` in API responses (fetch `raw_url` instead; > 10 MB requires cloning via `git_pull_url`); the `files` list itself is truncated beyond 300 files | BYO-token JSON backup/sync. `Access-Control-Allow-Origin: *` confirmed by direct request today. Fine-grained PATs have a **Gists: read & write** account permission covering `POST /gists` and `PATCH /gists/{id}` ([docs](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)) | verified |
| Google Drive API v3 — `appDataFolder` | https://developers.google.com/workspace/drive/api/guides/appdata | Google APIs ToS; free Cloud project, no card | Drive API default quota: 1,000,000 quota units/min per project and 325,000 quota units/min per user ([limits](https://developers.google.com/workspace/drive/api/guides/limits)) — irrelevant for a single-user backup; scope `https://www.googleapis.com/auth/drive.appdata` is **non-sensitive** → verification not mandatory; Google's docs say the "Unverified apps" warning is shown when a client requests *sensitive or restricted* scopes ([scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [verification FAQ](https://support.google.com/cloud/answer/13463073), [publishing status](https://support.google.com/cloud/answer/15549945)). Brand verification is only needed to show a logo | Hidden per-app backup folder in the user's own Drive. CORS preflight from a `github.io` origin returned `Access-Control-Allow-Origin` + `Allow-Headers: authorization` today (re-confirmed 2026-09-06 for both `/drive/v3/files` and `/upload/drive/v3/files`) | verified (scope class, CORS, quota) |
| Google Identity Services — token model | https://developers.google.com/identity/oauth2/web/guides/use-token-model | Free | Implicit-grant access tokens (~1 h), **no client secret, no refresh token**; must be triggered from a user gesture; Testing mode caps 100 test users and expires consent after 7 days, Production mode with only non-sensitive scopes shows no warning ([publishing status](https://support.google.com/cloud/answer/15549945)) | Browser OAuth for the Drive backup on the **web** build | verified |
| Google Play services `AuthorizationClient` (Android) | https://developer.android.com/identity/authorization | Free | Needs an **Android OAuth client ID** (package name + SHA-1 of the signing key) and no client secret; returns a 1-hour access token directly usable against Drive REST; silent re-authorize on later launches | Drive backup on the **Android** build (Google blocks OAuth inside embedded WebViews). Reachable from Capacitor via `@capgo/capacitor-social-login` 8.5.5 (MPL-2.0) with `scopes: [...]` — the 8.5.5 source (`GoogleProvider.java`) calls `Identity.getAuthorizationClient().authorize(AuthorizationRequest.setRequestedScopes(scopes))` only when extra scopes are passed; the README says `accessToken` is null only in the default-OIDC-scopes case, and the code falls back to idToken-only if AuthorizationClient fails, so **check for a null `accessToken` at runtime** | likely (code-verified; not device-tested) |
| Dexie Cloud | https://dexie.org/cloud/pricing | Proprietary server; client addon `dexie-cloud-addon` 4.4.14 Apache-2.0 | Free: 3 production users, 100 MB, 10 databases, 20 req/s. Self-host is a paid one-time license (€3,495 Business / €7,995 Enterprise). The pricing page does not say whether a card is required for the free tier **(verify)** | Optional real-time multi-device sync with zero code beyond the addon | verified (pricing page; card requirement unstated) |
| 5apps remoteStorage | https://5apps.com/storage/beta | Partly open source (Liquor Cabinet server), service marked "experimental" | Free accounts historically; page does not state limits | Only if you want the remoteStorage protocol (`remotestoragejs` 2.0.0-beta.10, MIT) | unsure |
| WebDAV (Nextcloud etc.) | https://github.com/perry-mitchell/webdav-client (`webdav` 5.10.0, MIT) | Depends on server | Nextcloud does **not** send CORS headers by default ([issue #3131](https://github.com/nextcloud/server/issues/3131)) → browser build can't reach it without a proxy; Capacitor's native HTTP bypasses CORS on Android | Low-priority backup target for self-hosters | verified (CORS blocker) |
| GitHub Pages | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits | Non-commercial only (no e-commerce/SaaS) | 1 GB site, 100 GB/month soft bandwidth, 10 builds/h (n/a with Actions) | Primary free static host | verified |
| Cloudflare Pages | https://developers.cloudflare.com/pages/platform/limits/ | Commercial allowed | 500 builds/month, 1 concurrent build, 20,000 files, 25 MiB/file, unlimited bandwidth per third-party comparisons | Alternative host; also the natural home for a Worker if a proxy is ever needed | verified (limits page); bandwidth **(verify)** |
| Vercel Hobby | https://vercel.com/docs/limits/fair-use-guidelines | **Non-commercial only; even asking for donations counts as commercial** | 100 GB transfer, 1M function invocations | Acceptable for a personal project; avoid if the app ever links to a tip jar | verified |
| GitHub Actions | https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions | GitHub ToS | Public repos: unlimited standard runners. Private: 2,000 Linux-minutes/month + 500 MB artifacts | Cloud APK builds | verified via docs/search |

No LLM is required anywhere. The only "AI-flavoured" feature worth having — natural-language quick add — is done procedurally with chrono-node plus a small `every …` grammar (section 5.3).

---

## 4. Key libraries

| Package | Version | License | Last publish | Purpose | Notes |
|---|---|---|---|---|---|
| `dexie` | 4.4.5 | Apache-2.0 | 2026-08-14 | IndexedDB wrapper, `liveQuery`, compound indexes | 14.5k stars, active |
| `dexie-react-hooks` | 4.4.0 | Apache-2.0 | 2026-03-26 | `useLiveQuery()` | — |
| `dexie-export-import` | 4.4.0 | Apache-2.0 | 2026-03-26 | `exportDB()/importInto()` streaming JSON Blob; options `prettyJson`, `overwriteValues`, `clearTablesBeforeImport`, `progressCallback`, `transform` ([docs](https://dexie.org/docs/ExportImport/dexie-export-import)) | Backbone of every backup path |
| `@sqlite.org/sqlite-wasm` | 3.53.0-build1 | Apache-2.0 (SQLite itself public domain) | 2026-04-21 | SQL in the browser. `opfs-sahpool` VFS needs **no COOP/COEP** but is single-tab; `opfs`/`opfs-wl` need SharedArrayBuffer headers ([persistence doc](https://sqlite.org/wasm/doc/trunk/persistence.md)) | Alternative to Dexie if you want SQL/FTS; not needed for MVP |
| `wa-sqlite` | npm 1.0.0 (2024-01) but repo pushed 2026-08-28 | MIT | — | Asyncify SQLite with IndexedDB/OPFS VFS; newer builds are consumed from GitHub, not npm | Only if you want SQLite without COOP/COEP and multi-tab |
| `rrule` | 2.8.1 | BSD-3-Clause | 2023-11-10 | RFC 5545 recurrence; `RRule.fromString`, `rule.after(date, inc)`, `rule.between`; dates are "floating"/UTC-as-local — build with `datetime(y,m,d,h,mi)` ([README](https://github.com/jkbrzt/rrule)) | 3.7k stars, effectively frozen but stable. `@rrulenet/rrule` 0.1.9 (MIT, 2 stars, 2026-08) is too young to bet on |
| `date-fns` / `@date-fns/tz` | 4.4.0 / 1.5.0 | MIT | 2026-05 | `format`, `startOfISOWeek`, `differenceInCalendarDays`, `TZDate` | Temporal API is in Chrome 144+, Firefox 139+ and Android WebView 152+ but **not Safari stable** (Technology Preview only) per [caniuse](https://caniuse.com/temporal) — don't depend on it for the web build yet |
| `chrono-node` | 2.10.1 | MIT | 2026-07-20 | `chrono.parse("gym tomorrow 7am")` → `{index, text, start}`; strip matched text from the title | 5.3k stars |
| `motion` (alias `framer-motion`) | 13.2.0 | MIT | 2026-09-02 | `Reorder.Group/Item` (`axis`, `values`, `onReorder`, `useDragControls` for handles), `layout`, `AnimatePresence`, `drag="x"`, `dragConstraints`, `dragElastic`, `onDragEnd(info.offset, info.velocity)` ([Reorder docs](https://motion.dev/docs/react-reorder)) | 33.5k stars |
| `@dnd-kit/core` / `@dnd-kit/sortable` | 6.3.1 / 10.0.0 | MIT | 2024-12 | `DndContext`, `useSortable`, `SortableContext`, `DragOverlay`; `TouchSensor` with `activationConstraint: { delay: 250, tolerance: 5 }`; set `touch-action: manipulation` on draggables ([touch sensor docs](https://dndkit.com/api-documentation/sensors/touch)) | 17.6k stars; stable but no publishes in 21 months on the v6 line. React 19: peerDeps are `react >=16.8.0` so npm installs cleanly; the React-19 issues [#1511](https://github.com/clauderic/dnd-kit/issues/1511) / [#1559](https://github.com/clauderic/dnd-kit/issues/1559) were closed 2026-02 without a new v6 release, and the open React-19 StrictMode bug [#2116](https://github.com/clauderic/dnd-kit/issues/2116) is in `@dnd-kit/react`, not core — so "works with React 19.2" is plausible but unproven; spike it |
| `@dnd-kit/react` | 0.5.0 | MIT | 2026-09-05 | Next-gen dnd-kit | Pre-1.0; watch, don't adopt yet |
| `@atlaskit/pragmatic-drag-and-drop` | 3.1.0 | Apache-2.0 | 2026-08-29 | Headless, native-DnD-based, tiny; 12.7k stars | Best perf; custom drag previews on mobile need more work than dnd-kit's `DragOverlay` |
| `@use-gesture/react` | 10.3.1 | MIT | 2024-03-21 | `useDrag`, `useSwipe`-like handling with velocity | 9.6k stars but repo idle since 2024-07; prefer Motion's built-in drag |
| `react-swipeable` | 7.0.2 | MIT | 2026-07-20 | `useSwipeable({onSwipedRight, delta, preventScrollOnSwipe})` | Small, maintained fallback |
| `@capacitor/local-notifications` | 8.3.1 | MIT | 2026-08-19 | `schedule({notifications:[{id,title,body,schedule:{at|on|every,repeats,count,allowWhileIdle},actionTypeId,extra,largeBody,inboxList}]})`, `update`, `cancelAll`, `registerActionTypes`, `checkExactNotificationSetting`, `changeExactNotificationSetting` (there is **no** `openExactAlarmPermissionSettings`); plugin manifest ships `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, **`SCHEDULE_EXACT_ALARM`** and a `LocalNotificationRestoreReceiver` (`BOOT_COMPLETED`/`LOCKED_BOOT_COMPLETED`/`QUICKBOOT_POWERON`) that re-arms every stored schedule after reboot — verified in the 8.3.1 tarball. Since 8.3.0 the plugin lives in its own repo ([ionic-team/capacitor-local-notifications](https://github.com/ionic-team/capacitor-local-notifications)) | `SCHEDULE_EXACT_ALARM` is already merged in from the plugin manifest; `on:` is cron-like (re-armed with `setExact*` after each fire), whereas `at`+`repeats` and `every` use `AlarmManager.setRepeating` (inexact since API 19, ignores `allowWhileIdle`) — prefer `on:` for the daily reminder |
| `@capacitor/haptics` | 8.0.2 | MIT | 2026-08 | `Haptics.impact({style:'light'})`, `notification({type:'success'})` | Web fallback `navigator.vibrate(10)` |
| `@capacitor/filesystem` + `@capacitor/share` | 8.1.3 / 8.0.1 | MIT | 2026-08/09 | Write backup JSON to cache dir then open the Android share sheet (Drive, Gmail, Files…) | The zero-OAuth Android backup path |
| `@capacitor/app` | 8.1.1 | MIT | 2026-09 | `appStateChange` (reschedule reminders on resume), `appUrlOpen` (deep links), back button | — |
| `capacitor-widget-bridge` | 8.1.0 | MIT | 2026-03-03 | `setItem/getItem` into SharedPreferences, `reloadAllTimelines()`, `setRegisteredWidgets()`, `requestWidget()` (Android pin prompt) ([repo](https://github.com/kisimediaDE/capacitor-widget-bridge)) | You still write `AppWidgetProvider` + `RemoteViews` XML in Kotlin |
| `@capgo/capacitor-widget-kit` | 8.1.9 | MPL-2.0 | 2026-08-19 | SVG-template widgets incl. Android ([repo](https://github.com/Cap-go/capacitor-widget-kit)) | 8 stars; newer, less proven |
| `@capawesome/capacitor-badge` | 8.0.3 | MIT | 2026-09-02 | App-icon badge count (launcher-dependent on Android) | Nice-to-have |
| `@capgo/capacitor-social-login` | 8.5.5 | MPL-2.0 | 2026-09-02 | Google sign-in with extra scopes on Android (uses Credential Manager + AuthorizationClient) | Only for Drive backup on Android; MPL is file-level copyleft, fine as a dependency |
| `vite-plugin-pwa` | 1.3.0 | MIT | 2026-05-05 | Manifest + Workbox service worker | `@vite-pwa/assets-generator` 1.0.2 for icons |
| `cmdk` | 1.1.1 | MIT | 2025-08 | Command palette | — |
| `lucide-react` | 1.41.0 | ISC | 2026-09-04 | Icons | — |
| `canvas-confetti` | 1.9.4 | ISC | 2025-10 | Completion celebration | Respect `prefers-reduced-motion` |
| `@formkit/auto-animate` | 0.10.0 | MIT | 2026-07 | Zero-config list add/remove/reorder transitions | Cheap alternative to hand-built layout animations |
| `@paper-design/shaders-react` | 0.0.80 | **Apache-2.0** — confirmed in the 0.0.80 npm tarball (`LICENSE` + `NOTICE` files, `package.json`), the [repo LICENSE](https://github.com/paper-design/shaders/blob/main/LICENSE) and the [README](https://github.com/paper-design/shaders) ("Apache 2.0 … use in commercial websites, apps … without visible attribution"). No PolyForm Shield text was found anywhere (the [shaders.paper.design](https://shaders.paper.design/) site shows no license at all) | 2026-09-02 | Grain gradient / mesh gradient / dithering backgrounds | Re-check `node_modules/@paper-design/shaders-react/LICENSE` on upgrade; `ogl` 1.0.11 (Unlicense) or raw WebGL is the fallback |
| `tailwindcss` | 4.3.3 | MIT | 2026-08-31 | Styling | CSS-first config, OKLCH out of the box |
| `zustand` | 5.0.15 | MIT | 2026-08 | UI state | — |
| `react-aria-components` | 1.21.1 | Apache-2.0 | 2026-09-04 | Alternative accessible primitives | Heavier than Base UI |

---

## 5. How the core problem is solved

### 5.1 Data model (Dexie schema)

```ts
// db.ts
import Dexie, { type EntityTable } from "dexie";

export interface Task {
  id: string;                 // nanoid / ULID
  title: string;
  notes?: string;
  status: "open" | "done" | "cancelled";
  bucket: "inbox" | "today" | "upcoming" | "anytime" | "someday";
  when?: string;              // local calendar date "YYYY-MM-DD" (Things-style "when")
  deadline?: string;          // "YYYY-MM-DD"
  evening?: boolean;          // Things "This Evening"
  tags: string[];                            // projects/areas/headings surveyed and dropped (GOAL.md §6 non-goal)
  order: string;              // fractional index (see 5.5)
  rrule?: string;             // "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  recurrenceMode?: "fixed" | "afterCompletion";
  reminderAt?: string;        // ISO local datetime
  checklist?: { id: string; text: string; done: boolean }[];
  createdAt: number; updatedAt: number; completedAt?: number;
  deletedAt?: number;         // tombstone for merge
}
export interface Habit { id: string; title: string; color: string;
  frequency: { times: number; per: "day" | "week" };  // "3x per week"
  scheduleDays?: number[];    // 0..6, only for day-specific habits
  reminder?: { hour: number; minute: number };
  createdAt: number; updatedAt: number; archivedAt?: number; deletedAt?: number; }
export interface Completion { id: string; habitId: string; dayKey: string; value: number; ts: number; deletedAt?: number; }

export const db = new Dexie("nocturne") as Dexie & {
  tasks: EntityTable<Task, "id">; habits: EntityTable<Habit, "id">;
  completions: EntityTable<Completion, "id">; meta: EntityTable<{ key: string; value: unknown }, "key">;
};
db.version(1).stores({
  tasks: "id, bucket, when, status, updatedAt, *tags",
  habits: "id, archivedAt, updatedAt",
  completions: "id, habitId, dayKey, [habitId+dayKey], updatedAt",
  meta: "key",
});
```

- React reads via `useLiveQuery(() => db.tasks.where({ bucket: "today", status: "open" }).sortBy("order"))`; writes go through a small repository layer that stamps `updatedAt` and never hard-deletes (tombstones make merge trivial).
- On the web build call `navigator.storage.persist()` once so Chrome/Firefox won't evict the origin's IndexedDB under storage pressure. Inside Capacitor the WebView's IndexedDB lives in app-private storage and is only cleared when the user clears app data.
- Migration path if the data ever outgrows IndexedDB: `@sqlite.org/sqlite-wasm` with the `opfs-sahpool` VFS (no special headers) on web and `@capacitor-community/sqlite` 8.1.1 (MIT) natively on Android. Not needed for MVP.

### 5.2 Day boundaries, streaks and habit strength

**Day key.** Never compute "today" from UTC. Define a user setting `dayRolloverHour` (default 3 → a 1 a.m. check-in still counts for "yesterday"), then:

```ts
const dayKey = (d = new Date()) => format(subHours(d, settings.dayRolloverHour), "yyyy-MM-dd");
```

Store `dayKey` and the raw `ts` on every completion, so a later timezone change doesn't rewrite history.

**Current streak (daily or day-specific habits)** — walk backwards from today; today is "grace" (not yet over); unscheduled days are skipped rather than counted as misses:

```ts
function currentStreak(habit: Habit, doneDays: Set<string>, today: string): number {
  let streak = 0, cursor = today, first = true;
  for (let i = 0; i < 3660; i++) {
    const scheduled = !habit.scheduleDays || habit.scheduleDays.includes(getDay(parseISO(cursor)));
    if (scheduled) {
      if (doneDays.has(cursor)) streak++;
      else if (first) { /* today still open: don't break */ }
      else break;
    }
    first = false;
    cursor = format(subDays(parseISO(cursor), 1), "yyyy-MM-dd");
  }
  return streak;
}
```

**Frequency habits ("3× per week")** — the unit of streak is the ISO week: a week counts if `completions in week >= times`; walk back week by week, current week is grace. This mirrors OpenHabitTracker's "streak in the habit's own period".

**Best streak** — Loop Habit Tracker's approach: sort completed dayKeys, group consecutive runs, take the longest (`StreakList.recompute` in [uhabits](https://github.com/iSoron/uhabits/blob/dev/uhabits-core/src/commonMain/kotlin/org/isoron/uhabits/core/models/StreakList.kt)).

**Habit strength (the ring/score that makes a miss feel survivable)** — port Loop's exponential-smoothing score ([Score.kt](https://github.com/iSoron/uhabits/blob/dev/uhabits-core/src/commonMain/kotlin/org/isoron/uhabits/core/models/Score.kt), GPL-3.0 — reimplement the formula, don't copy the file):

```ts
// freq = target completions per day (1 for daily, 3/7 for "3x/week")
const multiplier = Math.pow(0.5, Math.sqrt(freq) / 13);        // daily habit ≈ 0.948 → half-life ≈ 13 days
score = prevScore * multiplier + checkmark * (1 - multiplier);   // checkmark ∈ [0,1], skipped days leave score unchanged
```

Iterate day-by-day from the habit's first entry; for non-daily habits Loop uses a rolling window (`rollingSum / numerator`, with numerator/denominator doubled for boolean non-daily habits) as the checkmark value. Show the score as a 0–100 % ring; it rewards consistency without the all-or-nothing cliff of a raw streak. Optional "streak freeze" tokens (Duolingo-style) are just a `Completion` with `value: 0` and a `frozen: true` flag that satisfies the streak walk but not the score.

### 5.3 Recurring tasks

> **Superseded 2026-09-06 — read this first.** The survey below recommended the `rrule` library; the binding decision went the other way. `rrule` (last publish 2023-11) is **not a dependency**: `src/engine/recurrence.ts` implements the six patterns in ~150 lines of `Date.UTC` day arithmetic, RFC 5545 strings are an **export format only** (`toRRuleString`, one-way, lossy for monthly-day-31 because Nocturne clamps where the RFC skips), and there is no "advanced raw RRULE" field in v1. See DECISIONS D8 row 01, ARCHITECTURE §5.4, TESTING §2.1 and IMPLEMENTATION-PROMPT §2.1 / §6.4. The notes below are kept as the record of *why*, including the floating-time foot-gun that made a library look expensive.

- Persist `rrule` as an RFC 5545 string and `dtstart` as the task's local `when`. UI exposes six patterns that cover ~99 % of to-do usage: daily, every weekday, weekly on chosen days, every N days/weeks, monthly on day N (or last day), yearly. Anything else is typed as a raw RRULE in an "advanced" field.
- Two modes, as in Things/Todoist: **fixed** ("every Monday" — next occurrence is computed from the schedule regardless of when you finished) and **after completion** ("every 3 days after I water the plants" — next = completion date + interval).
- On completion of a recurring task: mark the instance done (keep it for history/streaks), then create the next instance:

```ts
import { RRule, datetime } from "rrule";
const rule = RRule.fromString(`DTSTART:${dtstartFloating}\n${task.rrule}`);
const base = task.recurrenceMode === "afterCompletion" ? todayFloating() : whenFloating(task);
const next = rule.after(base, false);            // returns a "UTC" Date whose Y/M/D are meant as local
const nextWhen = `${next.getUTCFullYear()}-${pad(next.getUTCMonth()+1)}-${pad(next.getUTCDate())}`;
```

- rrule's floating-time convention is the classic foot-gun: always build inputs with `datetime(y, m, d)` / `Date.UTC` and read outputs with `getUTC*`. Wrap all of this in one `recurrence.ts` module so the library can be swapped for a hand-rolled engine (the six patterns above are ~100 lines) if rrule ever bit-rots.
- Quick-add grammar (no LLM): run `chrono.parse(text)` for the date/time, then a regex layer for `every (day|weekday|week|month|year|\d+ (days|weeks)|mon(day)?...)` → a `Recurrence` object, plus `#tag`. Strip matched spans from the title; show parsed chips inline so the user can see what was understood (Todoist-style). Todoist's project (`@`) and priority (`!`) tokens were surveyed and **dropped**: projects, areas and priorities are GOAL.md §6 non-goals, so `#tag` is the only classifier Nocturne parses.

### 5.4 Drag-and-drop cards

- **Within one list** (reorder Today): `Reorder.Group axis="y" values={ids} onReorder={persistOrder}` with `Reorder.Item` per card; use `useDragControls` + a handle so a vertical swipe still scrolls the list. Motion animates the gap closing and gives spring physics for free.
- **Between lists** (Inbox → Today, Today → Someday, project columns on desktop): `@dnd-kit` with `PointerSensor` (`distance: 8`) for mouse and `TouchSensor` (`delay: 250, tolerance: 5`) for touch, `SortableContext` per list, `closestCorners` collision, and a `DragOverlay` that renders a slightly enlarged card with a deeper shadow. Set `touch-action: manipulation` on cards. Keyboard sensor gives accessibility out of the box.
- **Gesture arbitration on mobile** (swipe vs. drag vs. scroll): pointer down → if horizontal displacement exceeds 12 px before 250 ms elapse it's a swipe (Motion `drag="x"` takes it); if the finger holds still for 250 ms the dnd-kit TouchSensor activates (haptic tick); otherwise the browser scrolls. Because both libraries use pointer/touch events (not native HTML5 DnD) they coexist; pragmatic-drag-and-drop, which uses native DnD, would need its own long-press handling on mobile.

### 5.5 Ordering that survives sync

Use fractional indexing (Figma/Linear approach): `order` is a base-62 string; inserting between `a` and `b` generates the midpoint string, so reorders touch exactly one record and concurrent devices rarely collide. Renumber a list only when a key exceeds ~40 chars. This is a 60-line function; if you'd rather depend on a package, `fractional-indexing` on npm is the canonical implementation **(verify current version/license before adopting)**.

### 5.6 Swipe-to-complete

```tsx
<motion.div drag="x" dragConstraints={{ left: -120, right: 120 }} dragElastic={0.2}
  onDragEnd={(_, info) => {
    if (info.offset.x > 90 || info.velocity.x > 600) complete(task);        // swipe right = done
    else if (info.offset.x < -90 || info.velocity.x < -600) openSchedule(task); // swipe left = when?
  }}>
```

Reveal a coloured backing layer whose opacity tracks `useTransform(x, [0, 90], [0, 1])`, fire `Haptics.impact({style:'light'})` at the threshold, and play the completion animation (checkbox spring + card collapses via `AnimatePresence` + optional `canvas-confetti` burst on the last task of the day).

### 5.7 Local notifications on Android (Capacitor)

```ts
import { LocalNotifications } from "@capacitor/local-notifications";
await LocalNotifications.requestPermissions();                 // Android 13+ POST_NOTIFICATIONS
await LocalNotifications.registerActionTypes({ types: [{ id: "TASK", actions: [
  { id: "done", title: "Done" }, { id: "snooze", title: "Snooze 1h" } ] }] });
await LocalNotifications.schedule({ notifications: [
  { id: hash(task.id), title: task.title, body: task.notes ?? "", actionTypeId: "TASK",
    extra: { taskId: task.id }, schedule: { at: new Date(task.reminderAt), allowWhileIdle: true } },
  // `on` is cron-like and repeats by itself; `repeats` only applies to `at` (README)
  { id: 1, title: "Evening review", body: "3 open tasks today", schedule: { on: { hour: 21, minute: 0 }, allowWhileIdle: true } },
]});
LocalNotifications.addListener("localNotificationActionPerformed", e => { if (e.actionId === "done") complete(e.notification.extra.taskId); });
```

- **Exactness.** Without `SCHEDULE_EXACT_ALARM` alarms are inexact (delivered within ~1 hour on Android 12+). The 8.3.1 plugin manifest already declares `SCHEDULE_EXACT_ALARM` (merged into the app manifest at build time — nothing to add). The permission is **not pre-granted on fresh installs targeting API 33+** (i.e. denied by default on Android 14+ devices), so on first reminder creation call `checkExactNotificationSetting()` and, if `denied`, explain and call `changeExactNotificationSetting()` (opens the system "Alarms & reminders" page; the plugin silently falls back to inexact `set()`/`setAndAllowWhileIdle()` otherwise). `USE_EXACT_ALARM` would be auto-granted but Play policy reserves it for alarm/calendar apps ([Android docs](https://developer.android.com/develop/background-work/services/alarms/schedule)) — irrelevant for a sideloaded APK, but stay on the compliant path anyway.
- **Doze.** `allowWhileIdle: true` lets a notification fire in Doze but only once per 9 minutes per app; schedule one "daily digest" plus per-task reminders rather than dozens of near-simultaneous alarms.
- **Reboot.** The plugin's `LocalNotificationRestoreReceiver` re-registers every schedule saved in its `NotificationStorage` after `BOOT_COMPLETED` / `LOCKED_BOOT_COMPLETED` (once the user is unlocked); one-shot `at` times missed while the phone was off are fired ~15 s after boot; `on:` schedules are re-armed for their next trigger (verified in the 8.3.1 tarball's manifest and `LocalNotificationRestoreReceiver.kt`; not device-tested). Still, re-run a `syncSchedules()` routine on every `App.appStateChange → active` that diffs `LocalNotifications.getPending()` against the next 14 days of reminders, because OEM cleaners and the user disabling exact alarms both wipe pending alarms.
- **OEM battery killers** (Xiaomi, Huawei, some Samsung modes) still kill alarms; add an in-app "Reminders not firing?" page linking to [dontkillmyapp.com](https://dontkillmyapp.com) instructions.
- **Web build.** There is no standards-track way to schedule a notification while the tab is closed (Notification Triggers never shipped). The PWA shows reminders while open (in-app toast + `Notification` if the page is open) and otherwise relies on the Android app. A free push server (Cloudflare Worker cron + Web Push, Worker free tier 100k req/day) is possible later but adds a VAPID key and a KV store — deliberately out of scope.

### 5.8 Backup & sync (all optional, all zero-cost)

Layered from simplest to richest. Everything serialises the same way: `exportDB(db, { prettyJson: false })` → Blob; import via `importInto(db, blob, { overwriteValues: true })` for restore, or the merge routine below for sync.

1. **File export/import (default, no account).** Web: `URL.createObjectURL(blob)` + `<a download="nocturne-2026-09-06.json">`. Android: `Filesystem.writeFile({ path: 'nocturne.json', data, directory: Directory.Cache })` then `Share.share({ url: uri })` → the user picks Drive/Gmail/Files. Import via `<input type="file">` (works in the WebView). Also offer a Markdown export for readability.
2. **GitHub Gist (BYO fine-grained PAT, "Gists: Read & write" only).** The user pastes a token once; store it with `@capacitor/preferences` / `localStorage`. First run: `POST https://api.github.com/gists` `{ "description": "Nocturne backup", "public": false, "files": { "nocturne.json": { "content": "<json>" } } }` with headers `Authorization: Bearer <PAT>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`. Later: `PATCH https://api.github.com/gists/{id}` with the same `files` map; restore: `GET /gists/{id}` → `files["nocturne.json"].content` (if `truncated`, fetch `raw_url`). Keep the backup under 1 MB per file or shard into `tasks.json`/`habits.json`/`completions.json` (gzip+base64 if needed). CORS from any origin is confirmed.
3. **Google Drive appDataFolder.** Web: load `https://accounts.google.com/gsi/client`, `google.accounts.oauth2.initTokenClient({ client_id, scope: "https://www.googleapis.com/auth/drive.appdata", callback })`, call `requestAccessToken()` from a button. Then: list `GET https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,modifiedTime)`; create `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` (multipart body: metadata `{ "name": "nocturne.json", "parents": ["appDataFolder"] }` + JSON part); update `PATCH https://www.googleapis.com/upload/drive/v3/files/{id}?uploadType=media`; download `GET https://www.googleapis.com/drive/v3/files/{id}?alt=media`. Publish the OAuth consent screen to **Production** (non-sensitive scope → no verification, no warning; brand verification only if you want a logo). Android: GIS is blocked inside WebViews, so use `@capgo/capacitor-social-login` (`scopes: ["https://www.googleapis.com/auth/drive.appdata"]`) backed by an Android OAuth client ID registered with the CI keystore's SHA-1 — or simply skip Drive on Android and rely on path 1/2.
4. **Dexie Cloud** (`dexie-cloud-addon` 4.4.14): `db.cloud.configure({ databaseUrl })` gives real-time sync and OTP login on the free tier (3 users, 100 MB). Proprietary server, so treat as an optional upgrade, not the foundation.
5. **WebDAV** only from the Android build (native HTTP) or behind a Cloudflare Worker proxy; lowest priority.

**Merge routine (for 2/3 when two devices both write):**
```
for each table: for each remote record r, local l = byId[r.id]
  if !l or r.updatedAt > l.updatedAt → put(r)        // last-writer-wins per record
  tombstones (deletedAt) win over older live records; purge tombstones older than 90 days
completions are append-only keyed by [habitId+dayKey] → union
```
Keep a `meta.lastSyncAt` and a monotonic `revision` in the backup header so the UI can say "Backed up 2 h ago · gist abc123".

### 5.9 Home-screen widget (phase 3, Android)

- Android widgets are `RemoteViews` (XML) or Jetpack **Glance** (Compose-style); a WebView is not permitted, and only tap + vertical scroll gestures exist. Android 12+ supports checkboxes (`CompoundButton`) with `setOnCheckedChangeResponse`, so "tick a task from the widget" is possible ([overview](https://developer.android.com/develop/ui/views/appwidgets/overview)).
- Flow with `capacitor-widget-bridge`: after every relevant DB write, `WidgetBridge.setItem({ key: "today", value: JSON.stringify({ done: 3, total: 7, next: "Call mom", streak: 12 }), group: "nocturne" })` then `reloadAllTimelines()`. The Kotlin `NocturneWidgetProvider : AppWidgetProvider` reads SharedPreferences and fills a `RemoteViews(R.layout.widget_today)`; a tap opens the app via `PendingIntent` to `nocturne://today`; a checkbox tap sends a broadcast the provider turns into a Capacitor deep link (`nocturne://complete/{id}`) handled by `App.addListener("appUrlOpen")`.
- Since there is no local Android SDK, the widget is compiled only in CI: start with a **static text widget** (progress + next task + streak — one XML layout, ~60 lines of Kotlin), get it green in Actions, then graduate to a `ListView` via `RemoteViewsService`. `WidgetBridge.requestWidget()` prompts the user to pin it.
- Alternative: `@capgo/capacitor-widget-kit` renders SVG-template widgets without hand-written layouts, but at 8 stars it's unproven; keep as a fallback experiment.

### 5.10 Cloud APK build (GitHub Actions)

```yaml
name: android
on: { push: { tags: ["v*"] }, workflow_dispatch: {} }
jobs:
  apk:
    runs-on: ubuntu-latest          # = Ubuntu 24.04 (image 20260823): Android platforms 34–37, build-tools 34–37.0.0, cmdline-tools 12, ANDROID_HOME set — covers compileSdk 36; no setup-android needed
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - run: npm ci && npm run build && npx cap sync android
      - run: echo "$RELEASE_KEYSTORE_B64" | base64 -d > android/app/release.jks
        env: { RELEASE_KEYSTORE_B64: ${{ secrets.RELEASE_KEYSTORE_B64 }} }
      - run: cd android && ./gradlew assembleRelease
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: nocturne
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
      - uses: softprops/action-gh-release@v2
        with: { files: android/app/build/outputs/apk/release/app-release.apk }
```

`android/app/build.gradle` reads the three env vars in `signingConfigs.release`. Keystore bootstrap without a local JDK: run a one-off `workflow_dispatch` job that executes `keytool -genkeypair -keystore release.jks -alias nocturne -keyalg RSA -keysize 2048 -validity 10000` and stores it with `gh secret set RELEASE_KEYSTORE_B64 --body "$(base64 -w0 release.jks)"` (needs a PAT with `secrets: write`); download the artifact once and keep a copy in a password manager — **losing it means future APKs won't install over the old one**. Builds take ~5–8 min; with a public repo minutes are unlimited. The guides at [khromov.se](https://khromov.se/build-your-capacitor-android-app-bundle-using-github-actions/) and [capgo.app](https://capgo.app/blog/automatic-capacitor-android-build-github-action/) show the same shape (older action versions); [henryhale/android-capacitor](https://github.com/henryhale/android-capacitor) (MIT) is a ready template.

---

## 6. Reference projects

| Project | Link | License | Why it matters for Nocturne |
|---|---|---|---|
| Super Productivity | https://github.com/super-productivity/super-productivity | MIT (21.8k stars, pushed 2026-09-05) | Local-first Angular to-do/time tracker with IndexedDB storage and file/WebDAV/Dropbox sync — the best OSS reference for a sync-provider abstraction and conflict handling |
| Loop Habit Tracker (uhabits) | https://github.com/iSoron/uhabits | GPL-3.0 (10.2k stars, pushed 2026-07-21) | The reference streak/score algorithms (section 5.2), plus native Android widgets (`ScoreWidgetProvider`, `StreakWidgetProvider`) to study. GPL: learn from it, don't copy code |
| Tasks.org | https://github.com/tasks/tasks | GPL-3.0 (5.5k stars, pushed 2026-09-05) | Mature Android task app: RRULE handling, reminders with exact-alarm fallbacks, widgets, CalDAV sync. Same GPL caveat |
| DoHabit | https://github.com/iNikAnn/DoHabit | AGPL-3.0 | Small local-first habit-tracker PWA in React; good for UI/flow ideas, AGPL means no code reuse |
| Synapse | https://github.com/vincenzo-afk/Synapse | MIT | Installable local-first PWA unifying habits + tasks — closest small MIT sibling |
| client-side-databases | https://github.com/pubkey/client-side-databases | Apache-2.0 | Same app built on IndexedDB/PouchDB/RxDB/SQLite variants with benchmarks — useful when deciding Dexie vs SQLite |
| capacitor-widget-bridge | https://github.com/kisimediaDE/capacitor-widget-bridge | MIT | Working Android+iOS widget bridge with example provider |
| android-capacitor | https://github.com/henryhale/android-capacitor | MIT | GitHub Actions template that builds and releases a Capacitor APK |

Commercial apps to steal interaction ideas from (none are open source):

- **Things 3** ([features](https://culturedcode.com/things/features/)): Today + This Evening split; Magic Plus button you drag to insert a task exactly where you want it; headings inside projects; Quick Find by just typing; natural-language dates ("Sat", "in four days"); progress pies on projects; swipe right to reschedule, swipe left to select; paste a bulleted list to create a checklist; Upcoming week view; Logbook.
- **Structured** ([site](https://structured.app/)): the day as a vertical timeline with time-blocked tasks and a "now" line; import calendar events into the same timeline; widgets that show the next block.
- **Todoist**: Quick Add NLP that pulls date, project, label and priority from one string; Karma streaks; "Upcoming" with drag-to-reschedule.
- **Linear**: keyboard-first, `Cmd+K` palette (cmdk), dense but calm dark UI, instantaneous optimistic updates, subtle 150 ms layout transitions — the visual bar for "premium dark".

---

## 7. Visual/design enablers

- **Palette.** Build on OKLCH so navy stays navy at every lightness: e.g. `--bg: oklch(16% 0.035 262)`, `--surface: oklch(21% 0.04 262)`, `--surface-2: oklch(26% 0.045 262)`, `--text: oklch(93% 0.01 262)`, `--muted: oklch(68% 0.02 262)`, accent `oklch(78% 0.14 80)` (warm amber) or `oklch(75% 0.12 200)` (ice) for completion states. Tailwind 4 consumes these as `@theme` tokens; use `color-mix()` for hover tints and 1 px `oklch(100% 0 0 / 6%)` hairlines instead of grey borders.
- **Typography.** Inter Variable or Geist Variable (OFL) for UI, Instrument Serif (OFL) for the daily greeting/date headline; enable `font-feature-settings: "ss01","cv11"` for Inter's single-storey a; tabular numerals (`tnum`) for counters and streaks.
- **Motion vocabulary.** Motion `layout` on every card so lists reflow smoothly; `AnimatePresence` for complete/delete; spring `{ type: "spring", stiffness: 500, damping: 40 }` as the house physics; staggered mount of Today's cards (`delayChildren`). Respect `prefers-reduced-motion` via `useReducedMotion()`.
- **Depth without clutter.** Backdrop-blur sheets (`backdrop-filter: blur(20px) saturate(1.4)`), soft two-layer shadows only on the card being dragged, and a very subtle film-grain overlay (inline SVG `feTurbulence` at 3–4 % opacity) to kill banding on navy gradients.
- **Shader background (optional).** A slow, dark mesh/grain gradient behind the Today view sells "premium calm". `@paper-design/shaders-react` (`GrainGradient`, `MeshGradient`) is the fastest route and is Apache-2.0 (verified 2026-09-06 in the npm tarball, repo LICENSE and README — the earlier "PolyForm Shield" rumour could not be substantiated). Clean-room alternative: a 40-line fragment shader (simplex noise + 3 blended navy stops) via `ogl` (Unlicense) or raw WebGL; pause it when the tab is hidden and on battery saver.
- **Feedback.** `@capacitor/haptics` light impact on check, success notification on finishing the day; `canvas-confetti` (ISC) restrained to a single burst from the checkbox origin; optional soft completion sound (bundle an OFL/CC0 sample).
- **Charts.** Habit heatmap (GitHub-style year grid) and the strength ring can be plain SVG; no chart library needed. Keep to the dataviz palette (accent for done, `--surface-2` for empty).
- **Edge-to-edge.** Capacitor 8 removed `adjustMarginsForEdgeToEdge` in favour of a System Bars plugin plus CSS `env(safe-area-inset-*)`; pad the top bar and bottom sheet with those insets.

---

## 8. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Android reminders fire late or not at all (inexact alarms, Android 14+ denies `SCHEDULE_EXACT_ALARM` by default, Doze, OEM cleaners) | Core promise of the app on phone | `SCHEDULE_EXACT_ALARM` is already declared by the plugin manifest; onboarding step that checks `checkExactNotificationSetting()` and calls `changeExactNotificationSetting()`; use `on:` (exact, re-armed) rather than `at`+`repeats` (`setRepeating`, inexact) for the daily reminder; `allowWhileIdle`; reschedule on every app resume; daily digest instead of many alarms; "reminders not firing?" help page |
| `@dnd-kit/core` v6 has had no npm release since 2024-12 (team busy on 0.x `@dnd-kit/react`) | Bugs won't be fixed on the line you ship | Use Motion `Reorder` for single-list reorder (most of the app); confine dnd-kit to cross-list moves behind a `useCardDnd()` adapter; `@atlaskit/pragmatic-drag-and-drop` 3.1.0 is the actively-published swap-in |
| `rrule` 2.8.1 unmaintained; floating-time semantics are error-prone | Wrong "next Monday", DST slips | Isolate in `recurrence.ts` with exhaustive unit tests around DST and month ends; only six UI patterns; in-house engine as plan B |
| Google OAuth cannot run inside the Capacitor WebView (`disallowed_useragent`) | Drive backup missing on Android | Use `@capgo/capacitor-social-login` (Android client ID + SHA-1 of CI keystore) or ship only file/Gist backup on Android — both are zero-cost |
| Widget needs Kotlin compiled blind in CI | Slow iteration, possible build breaks | Phase 3; static text widget first; keep widget code in one small module; use Actions `workflow_dispatch` with a debug build for fast checks |
| Losing the release keystore | Users (i.e. the owner) must uninstall to update | Generate once in a dedicated workflow, store in GitHub Secrets **and** a password manager; never regenerate |
| IndexedDB eviction on the web build / user clears site data | Data loss | `navigator.storage.persist()`, prominent "last backup" indicator, auto-export to Gist/Drive daily when configured |
| `@paper-design/shaders-react` license drift (Apache-2.0 today; a future version could relicense) | Only matters if the app ever competes with Paper — negligible for a personal tracker | Resolved for 0.0.80 (Apache-2.0 verified in tarball + repo); pin the version and re-read `LICENSE` on upgrade; `ogl`/raw WebGL fallback |
| GitHub Pages and Vercel Hobby forbid commercial use; Vercel counts donations as commercial | Account suspension if the project ever monetises | Keep the app ad-free and donation-free on those hosts; Cloudflare Pages permits commercial use if that changes |
| A stored Gist PAT on device could be exfiltrated if the device is compromised | Leak of a token that can only touch gists | Only accept fine-grained tokens with the Gists permission; short expiry; show the token's scope on the settings page; never log it |
| Web build has no background notifications | Web users miss reminders | Explain clearly in settings; in-app reminders while open; Android app is the reminder surface |
| Temporal API absent in Safari stable | Date bugs if you adopt Temporal on the web build | Stay on date-fns until Safari ships Temporal |
| Motion `Reorder` can't drag across groups; dnd-kit + Motion layout animations can fight over transforms | Janky cross-list drag | Disable Motion `layout` on the item being dragged by dnd-kit; animate only the drop via `DragOverlay` → `layoutId` handoff |

---

## 9. MVP vs full vision

**MVP in a weekend (ship Sunday night):**

1. Vite + React + TS + Tailwind 4 + Motion; navy OKLCH theme; Inter Variable.
2. Dexie schema from 5.1; `useLiveQuery` lists for Inbox / Today / Upcoming / Someday; Logbook.
3. Quick add bar with chrono-node date parsing (`tomorrow`, `fri 6pm`) and `#tag`.
4. Card interactions: tap to expand notes/checklist, checkbox spring animation + haptic, swipe-right complete, swipe-left "when?" sheet, `Reorder` drag within a list.
5. Habits tab: daily habits with tap-to-complete, current/best streak, strength ring (Loop formula), 12-week heatmap.
6. Daily recurring tasks only (`FREQ=DAILY` / weekdays) via the recurrence adapter.
7. JSON export/import (web download + Android share sheet).
8. PWA manifest/service worker; deploy to GitHub Pages via Actions.
9. Capacitor Android project; `@capacitor/local-notifications` with one configurable daily review reminder + per-task reminders (inexact acceptable for MVP); APK built by Actions and attached to a Release.

**Full vision:**

- Projects, Areas, headings, progress pies; Upcoming week board with drag-to-reschedule; cross-list dnd-kit moves; timeline "day plan" view with a now-line (Structured-style) and optional time-blocking.
- Full recurrence editor (fixed vs after-completion, monthly/yearly/N-week), deadlines with countdown chips, snooze actions on notifications, exact-alarm onboarding.
- Weekly habits ("3× a week"), skip days, streak freezes, habit notes, per-habit reminders, year heatmap, strength chart.
- Backup layer: Gist and Drive appData with auto-backup + merge; optional Dexie Cloud for live multi-device sync.
- Command palette (cmdk), keyboard-first desktop mode, Quick Find, multi-select with swipe, bulk move.
- Android home-screen widget (progress + next task, then a list with checkboxes), app-icon badge.
- Visual layer: shader background, grain, sound design, weekly review screen with a "what went well" reflection, achievements that stay tasteful.

---

## 10. Open questions

1. Which cross-list DnD library to commit to: dnd-kit v6 (stable, quiet) vs pragmatic-drag-and-drop (active, native DnD) — decide after a one-evening spike on a real Android device.
2. ~~Exact package name of Capacitor 8's "System Bars" plugin~~ — answered 2026-09-06: it is bundled with `@capacitor/core` (`import { SystemBars } from "@capacitor/core"`; [docs](https://capacitorjs.com/docs/apis/system-bars)); `@capacitor/system-bars` is indeed not on npm.
3. Whether `@capgo/capacitor-social-login` reliably returns an `accessToken` for the `drive.appdata` scope on current Android — the 8.5.5 source does route extra scopes through `AuthorizationClient`, but this is untested on a device; keep the null-check and the file/Gist-only fallback.
4. ~~Does the `ubuntu-latest` runner image still ship the Android SDK?~~ — answered 2026-09-06: yes (Ubuntu 24.04 image 20260823 has platforms android-34…37 and build-tools 34…37.0.0).
5. ~~Do gist `raw_url` responses carry CORS headers?~~ — answered 2026-09-06: `gist.githubusercontent.com/.../raw` returns `Access-Control-Allow-Origin: *`.
6. ~~Final license of `@paper-design/shaders-react`~~ — answered 2026-09-06: Apache-2.0 (tarball `LICENSE`/`NOTICE`, repo, README).
7. ~~Whether the owner wants habits and tasks in one "Today" card stack (Structured-like) or separate tabs (Things-like)~~ — answered 2026-09-06: **separate surfaces** (tasks on the Front Page, habits in the Ledger) with separately scoped `order`, and habits never enter the issue counter (ARCHITECTURE D-02, IMPLEMENTATION-PROMPT §0.2).
8. ~~Day-rollover default (3 a.m.?) and whether "This Evening" is a bucket or a flag~~ — answered 2026-09-06: **rollover 03:00, evening hour 21:00, and "This Evening" is a flag** (`entry.evening`), so evening entries stay in Today's issue and count toward the colophon (ARCHITECTURE D-01/D-03, IMPLEMENTATION-PROMPT §0.2).

---

## 11. Claims most worth re-verifying before building

1. GitHub fine-grained PATs can create/update gists ("Gists: read & write" permission) — verified from docs today (see verification log); still confirm the permission appears in the token UI.
2. Google Drive `drive.appdata` is a non-sensitive scope → production consent screen with no mandatory verification; the "Unverified apps" warning is documented only for sensitive/restricted scopes (see log).
3. `@capacitor/local-notifications` schedules survive reboot (verified in code) and `on:{hour,minute}` fires daily on Android 14/15/16 devices — **still needs a real-device test**.
4. GitHub Actions minutes are unlimited for public repos and the Android SDK is preinstalled on `ubuntu-latest` — verified (see log).
5. `@dnd-kit/core` 6.3.1 works with React 19.2 without patches — plausible, unproven; spike before committing.
6. ~~`@paper-design/shaders-react` license~~ — resolved: Apache-2.0.
7. ~~`rrule` 2.8.1 still installs cleanly under Vite 8 / TS 6~~ — moot: the library was dropped (§5.3 note, DECISIONS D8). What replaces it as a day-1 check is `chrono-node` 2.10.1 building as a lazy chunk under Vite 8 / TS strict, and `npm ls rrule howler gsap canvas-confetti` returning nothing (TESTING V-6).
8. Motion 13's `Reorder` behaves correctly on Android WebView with a drag handle while the parent scrolls.

---

## 12. Verification log (2026-09-06)

Adversarial re-check of the flagged claims plus a sweep of the rest of the file. Method: primary sources only (official docs, GitHub repos, npm registry via `npm view`/`npm pack`, live `curl` CORS probes from this machine). Anything not reachable from a primary source is marked **unverifiable**.

| # | Claim | Verdict | Evidence / source |
|---|---|---|---|
| 1 | Fine-grained PATs can create and update gists via a "Gists" account permission | **Confirmed** | [Permissions required for fine-grained PATs](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens) lists `POST /gists`, `PATCH /gists/{gist_id}` (and DELETE, comments, forks, star) under *User permissions for "Gists"* (write). The [Gists REST page](https://docs.github.com/en/rest/gists/gists) itself only mentions the OAuth `gist` scope, so the fine-grained mapping comes from the permissions page. Not checked: the token-creation UI itself (requires a logged-in session). |
| 2 | `drive.appdata` is non-sensitive → no verification, no "unverified app" warning | **Confirmed (with a precision)** | [Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) lists `drive.appdata` as *Non-sensitive*. [OAuth verification FAQ](https://support.google.com/cloud/answer/13463073): "If your app utilizes only non-sensitive scopes, it is not mandatory for your app to complete the app verification process"; brand verification only for name+logo. [Publishing status](https://support.google.com/cloud/answer/15549945): Testing = 100 users + 7-day consent expiry; "Google will display an [Unverified apps] warning message if your project's OAuth clients request authorization of scopes considered sensitive or restricted" — it does not explicitly promise *no* warning for non-sensitive-only apps, but that is the documented trigger. Without brand verification the consent screen shows no logo. |
| 3 | local-notifications 8.3.1 survives reboot; `on:{hour,minute}` repeats daily on Android 14/15/16 without native code | **Partly confirmed / partly unverifiable** | 8.3.1 tarball (`npm pack`): `android/src/main/AndroidManifest.xml` declares `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` and `LocalNotificationRestoreReceiver` on `BOOT_COMPLETED`/`LOCKED_BOOT_COMPLETED`/`QUICKBOOT_POWERON`; the receiver reloads all stored notifications and calls `schedule()` again. `LocalNotificationManager.kt`: `on:` computes `nextTrigger` and arms `setExactAndAllowWhileIdle`/`setExact` (falls back to `set*` when exact alarms are denied); `TimedNotificationPublisher.rescheduleNotificationIfNeeded` re-arms the next cron trigger after each fire. `at`+`repeats` and `every` use `setRepeating` (inexact, no idle allowance). README ([new repo](https://github.com/ionic-team/capacitor-local-notifications)): `repeats` is documented for `at`, `on` is "similar to cron". **Corrections made:** the file cited a non-existent `openExactAlarmPermissionSettings()` (real name: `changeExactNotificationSetting()`), said to add `SCHEDULE_EXACT_ALARM` yourself (the plugin manifest already has it), and linked the old monorepo path (plugin moved out at 8.3.0). **Unverifiable:** actual firing on Android 14/15/16 hardware — no device available; OEM battery killers remain a risk. |
| 4 | Actions minutes unlimited on public repos; `ubuntu-latest` has an Android SDK for AGP 8.13 / compileSdk 36 | **Confirmed** | [Actions billing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions): "GitHub Actions usage is free for … public repositories that use standard GitHub-hosted runners"; Free plan private repos: 2,000 min/month, 500 MB artifact storage. [runner-images](https://github.com/actions/runner-images): `ubuntu-latest` = Ubuntu 24.04; [Ubuntu2404-Readme](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md) (image 20260823.283.1): build-tools 34.0.0–37.0.0, platforms android-34…android-37 (incl. 36 + extensions), cmdline-tools 12.0, `ANDROID_HOME=/usr/local/lib/android/sdk`, default Java 17 (21/25 available). [Capacitor 8 upgrade guide](https://capacitorjs.com/docs/updating/8-0): AGP 8.13.0, Gradle 8.14.3, Kotlin 2.2.20, compileSdk/targetSdk 36, minSdk 24, Node ≥ 22. |
| 5 | `@dnd-kit/core` 6.3.1 / `sortable` 10.0.0 work with React 19.2 unpatched | **Plausible, not confirmed** | `npm view`: peerDependencies `react >=16.8.0` (core) / `react >=16.8.0` + `@dnd-kit/core ^6.3.0` (sortable) → no peer-dep conflict, no `--legacy-peer-deps` needed; last publish 2024-12-05. GitHub: React-19 issues [#1511](https://github.com/clauderic/dnd-kit/issues/1511) "Support React 19 & Nextjs 15" and [#1559](https://github.com/clauderic/dnd-kit/issues/1559) (JSX namespace typing) closed 2026-02-16 with no v6 release since — likely a bulk close rather than a fix; the open React-19 StrictMode bug [#2116](https://github.com/clauderic/dnd-kit/issues/2116) concerns `@dnd-kit/react`'s `DragDropProvider`, not core. No maintainer statement of React 19 support was found. Treat as "probably fine, spike first"; `@atlaskit/pragmatic-drag-and-drop` 3.1.0 (Apache-2.0, 2026-08-29) remains the actively-published alternative. |
| 6 | `@paper-design/shaders-react` is Apache-2.0, not PolyForm Shield | **Confirmed — Apache-2.0; "PolyForm Shield" claim removed** | `npm pack @paper-design/shaders-react@0.0.80`: tarball contains `LICENSE` (Apache License 2.0) and `NOTICE`, `package.json` `"license": "Apache-2.0"`, peerDeps `react ^18 || ^19`. [Repo LICENSE](https://github.com/paper-design/shaders/blob/main/LICENSE) = Apache-2.0; [README](https://github.com/paper-design/shaders) says Apache 2.0 and allows commercial use without visible attribution (keep LICENSE/NOTICE if redistributing). [shaders.paper.design](https://shaders.paper.design/) shows no license text at all, so the "reportedly PolyForm Shield" statement had no source and was corrected. |
| 7 | api.github.com and www.googleapis.com send permissive CORS for a GitHub Pages origin | **Confirmed (live curl, 2026-09-06)** | `OPTIONS https://api.github.com/gists` with `Origin: https://example.github.io` → 204, `Access-Control-Allow-Origin: *`, `allow-methods: GET, POST, PATCH, PUT, DELETE`, `allow-headers` includes `Authorization, Content-Type, X-GitHub-Api-Version`; a plain GET (even the 403 rate-limited response) carries `Access-Control-Allow-Origin: *`. `OPTIONS https://www.googleapis.com/drive/v3/files?spaces=appDataFolder` and `OPTIONS https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` → 200, `Access-Control-Allow-Origin: https://example.github.io`, methods `DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT`, headers `authorization` / `authorization,content-type`. Bonus: `gist.githubusercontent.com/.../raw` → `Access-Control-Allow-Origin: *` (answers open question 5). |
| 8 | Google blocks OAuth in Android WebViews; `@capgo/capacitor-social-login` returns an access token for `drive.appdata` | **First half confirmed; second half plausible (code-verified, not device-verified)** | [Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies): "A developer must not direct a Google OAuth 2.0 authorization request to an embedded user-agent under the developer's control" (the `disallowed_useragent` error name is not on that page; it is the well-known runtime error but was not re-verified from a primary source). `npm pack @capgo/capacitor-social-login@8.5.5` (MPL-2.0): `GoogleProvider.java` builds `AuthorizationRequest.builder().setRequestedScopes(scopes)` and calls `Identity.getAuthorizationClient(...)` only when extra scopes are requested; README: `accessToken` "may be null on Android when Credential Manager authentication succeeds but AuthorizationClient does not return an access token (authentication-only / ID-token login with default OIDC scopes)"; on AuthorizationClient failure the plugin resolves with idToken only. So requesting `drive.appdata` is the supported path, but a null check and the file/Gist fallback stay mandatory until tested on a device. |

**Sweep of the rest of the file**

- Versions/licenses of every package in sections 2–4 re-pulled with `npm view` on 2026-09-06: all match (dexie 4.4.5, dexie-react-hooks/export-import 4.4.0, dexie-cloud-addon 4.4.14, sqlite-wasm 3.53.0-build1, chrono-node 2.10.1, date-fns 4.4.0, @date-fns/tz 1.5.0, tailwindcss 4.3.3, vite 8.2.2, react 19.2.8, zustand 5.0.15, cmdk 1.1.1, lucide-react 1.41.0 ISC, vite-plugin-pwa 1.3.0, assets-generator 1.0.2, canvas-confetti 1.9.4 ISC, auto-animate 0.10.0, react-aria-components 1.21.1, base-ui 1.0.0-rc.0, radix dialog 1.1.23, react-swipeable 7.0.2, @use-gesture/react 10.3.1 (2024-03), motion/framer-motion 13.2.0, rrule 2.8.1 BSD-3 (2023-11), @rrulenet/rrule 0.1.9, all @capacitor/* 8.x MIT, capacitor-widget-bridge 8.1.0 MIT, @capgo/capacitor-widget-kit 8.1.9 MPL-2.0, @capawesome/capacitor-badge 8.0.3, @capacitor-community/sqlite 8.1.1, webdav 5.10.0, remotestoragejs 2.0.0-beta.10, ogl 1.0.11 Unlicense, fontsource packages 5.3.0 OFL-1.1, wa-sqlite npm 1.0.0 (2024-01, no license field)). `fractional-indexing` (section 5.5) is 4.0.0, **CC0-1.0**, published 2026-06 — safe to adopt.
- **No package requires payment or a card**; no API in the file has shut down. Dexie Cloud is the only proprietary service and remains optional; its free tier is confirmed on the pricing page but "no card required" is not stated there (marked verify).
- Licenses: the only copyleft items are reference projects (uhabits GPL-3.0, Tasks.org GPL-3.0, DoHabit AGPL-3.0 — confirmed on GitHub) which the file already says not to copy from; Loop's `Score.kt` header is GPL-3.0+ and the formula quoted (`0.5.pow(sqrt(frequency)/13.0)`, `score += checkmarkValue * (1 - multiplier)`) matches the source. MPL-2.0 plugins are file-level copyleft only. Synapse (MIT, 33 stars) and henryhale/android-capacitor (MIT) exist as described.
- Stale libraries: `rrule` (2023-11) and `@use-gesture/react` (2024-03) are the only >2-year-old dependencies and both are already flagged; `@dnd-kit/core` is 21 months old. No nonexistent package names found except the file's own correct note that `@capacitor/system-bars` is not on npm (System Bars ships inside `@capacitor/core`).
- Hosting limits re-read from the primary pages: GitHub Pages 1 GB / 100 GB-month soft / 10 builds-h soft, non-commercial ([limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)); Cloudflare Pages Free 500 builds/month, 1 concurrent, 20,000 files, 25 MiB/file, 100 custom domains — bandwidth is **not** stated on the limits page (still marked verify); Vercel Hobby "non-commercial personal use only", "Asking for Donations fall under commercial usage", ~100 GB fast data transfer, 1M invocations ([fair use](https://vercel.com/docs/limits/fair-use-guidelines)); Cloudflare Workers Free 100,000 req/day, 10 ms CPU ([limits](https://developers.cloudflare.com/workers/platform/limits/)).
- Rate limits: GitHub 5,000/h authenticated, 60/h unauthenticated (source added). Google Drive quota was wrong ("100-ish req/100s") — corrected to 1,000,000 units/min per project and 325,000 units/min per user ([limits](https://developers.google.com/workspace/drive/api/guides/limits)).
- Android exact alarms: [alarm docs](https://developer.android.com/develop/background-work/services/alarms/schedule) confirm inexact delivery "within one hour" on Android 12+, `SCHEDULE_EXACT_ALARM` "not pre-granted to fresh installs of apps targeting Android 13 (API level 33) and higher", and `USE_EXACT_ALARM` reserved for alarm-clock/calendar apps under Play policy. Wording in 5.7 tightened accordingly.
- Temporal support corrected to cite [caniuse](https://caniuse.com/temporal): Chrome 144+, Firefox 139+, Android WebView 152+, Safari TP only.
- Gist "300 files max" softened to the documented behaviour (file list truncated beyond 300; >10 MB files need `git_pull_url`).
- **Unverifiable today** (no primary source reachable or needs hardware): device behaviour of local notifications on Android 14/15/16 and under OEM battery managers; `@capgo/capacitor-social-login` access-token behaviour on a real device; Cloudflare Pages bandwidth; Dexie Cloud card requirement; GitHub star counts (not re-checked — API unauthenticated rate limit was exhausted); the `disallowed_useragent` error string; the exact wording shown on a Production consent screen for a non-sensitive-only, non-brand-verified app.

Sources consulted (in addition to the inline links): [Dexie.js repo](https://github.com/dexie/Dexie.js), [Dexie Cloud pricing](https://dexie.org/cloud/pricing), [SQLite Wasm persistence](https://sqlite.org/wasm/doc/trunk/persistence.md), [PowerSync SQLite-on-web May 2026 update](https://powersync.com/blog/sqlite-persistence-on-the-web), [rrule README](https://github.com/jkbrzt/rrule), [dnd-kit touch sensor](https://dndkit.com/api-documentation/sensors/touch), [PkgPulse DnD comparison 2026](https://www.pkgpulse.com/guides/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026), [Motion Reorder](https://motion.dev/docs/react-reorder), [Capacitor 8 upgrade](https://capacitorjs.com/docs/updating/8-0), [Local Notifications README](https://github.com/ionic-team/capacitor-plugins/blob/main/local-notifications/README.md), [Android alarms guide](https://developer.android.com/develop/background-work/services/alarms/schedule), [Android app widgets overview](https://developer.android.com/develop/ui/views/appwidgets/overview), [capacitor-widget-bridge](https://github.com/kisimediaDE/capacitor-widget-bridge), [GIS token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [OAuth publishing status](https://support.google.com/cloud/answer/15549945), [Android AuthorizationClient](https://developer.android.com/identity/authorization), [GitHub PKCE changelog](https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/), [Gists REST](https://docs.github.com/en/rest/gists/gists), [Fine-grained PAT permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens), [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines), [GitHub Actions billing](https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions), [Nextcloud CORS issue](https://github.com/nextcloud/server/issues/3131), [Things 3 features](https://culturedcode.com/things/features/), [Structured](https://structured.app/), [Temporal in 2026](https://bryntum.com/blog/javascript-temporal-is-it-finally-here/), [date-fns v4 TZ](https://blog.date-fns.org/v40-with-time-zone-support/), [uhabits Score.kt](https://github.com/iSoron/uhabits/blob/dev/uhabits-core/src/commonMain/kotlin/org/isoron/uhabits/core/models/Score.kt).
