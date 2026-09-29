# Nocturne — The Minimalist Goal Tracker

**Codename:** Nocturne · **Design:** The Evening Edition
**Tagline:** *Your day, printed as a single issue.*

Status: Planned — not started. Written 2026-09-06 against `_shared/DECISIONS.md`, `docs/RESEARCH.md` (verified) and `docs/DESIGN.md` (locked).

---

## 1. The idea

**In the owner's words.** "A daily goal and to-do list tracker using a sleek, distraction-free card interface. Pure focus and accountability. High-contrast dark navy aesthetic; a premium, calming space to organize daily life without clutter. Daily phone use, with local reminders and maybe a home-screen widget." Should be a Android App (preferably)

**Sharpened.** Nocturne treats every day as a numbered issue of a private navy broadsheet. The Front Page is Today: a masthead with the date set huge, then the day's entries as folio-numbered lines between hairlines — no cards at rest, no checkboxes, no icons. You file entries by typing plain English ("Call mom tomorrow 17:00 every week #family"), strike them with a swipe that draws a foil line through the title, reorder them by holding, and when the last entry is struck the issue *closes*: a colophon typesets itself — issue number, count, streak, time — and offers one line for the record. Habits live in a Ledger with streaks and a strength ring that forgives a miss; closed days pile up as Back Issues. Everything lives on the device (IndexedDB), works offline, and the Android build fires real reminders. Backups are a JSON file, or a GitHub Gist with the user's own token. No account, no server, no analytics, no LLM.

## 2. Who it's for

- The owner, first: one person who wants a to-do list that is beautiful enough to open every evening and quiet enough not to nag.
- Anyone who finds Things/Todoist too busy and Notion too heavy, keeps a short daily list, and cares more about *closing the day* than about projects, priorities and integrations.
- Phone-first, keyboard-friendly on desktop; dark-mode people who still want a real light theme for daylight.

## 3. Why it will be fun and valuable

- **The reward is typographic, not gamified.** Closing the day prints a colophon instead of firing confetti. The screenshot people will post is the closed issue.
- **Building it teaches the whole shared stack** (Vite/React/Tailwind tokens, Dexie, Motion gestures, Capacitor, local notifications, GitHub Actions APK signing) on the least risky project of the eight — it is the recommended first build in `_shared/GETTING-STARTED.md`.
- **Every hard part is a small, testable engine**: day-key/rollover, quick-add grammar, a 150-line recurrence engine, streak/strength math, notification diffing, LWW merge. Each is unit-tested before it gets a face.
- **Daily use from week one.** The weekend MVP already replaces a paper list; everything after that is polish the owner will feel every evening.

## 4. The vibe

**Typeset · Quiet · Accountable**

A newspaper that prints one copy, for you. Navy paper (`#0A1024`), warm paper-white ink, one gilt-foil accent for anything done or active, one printer's vermilion for the single overdue thing that matters. Bricolage Grotesque at light weight carries the masthead and the greeting; Geist sets the entries; Geist Mono sets every number. Nothing has a box at rest — hairlines do the work. Motion behaves like type being set: digits roll, lines re-set, a foil rule draws across a finished title. No gradients, no glass, no stars, no exclamation marks. The evening ground darkens at 21:00 and the running head reads EVENING EDITION.

## 5. Success criteria (measurable)

1. **Cold open to usable masthead in under 1.0 s** on a mid-range Android phone (2022, Android System WebView ≥ 110) with the service worker warm; the running head is the LCP element and paints before any font swap.
2. **Quick add parses in one keystroke:** typing `Call mom tomorrow 17:00 every week #family` and pressing Enter files an entry with `when = tomorrow`, `reminder = 17:00`, weekly recurrence on that weekday and tag `family`, with parsed chips shown inline before commit — in under 50 ms of parse time.
3. **Swipe-to-strike feels physical:** release past 90 px (or > 600 px/s) strikes the entry; the foil line, haptic at 60 % of the stroke, layout re-set and counter roll complete within 600 ms at 60 fps on that same phone; Undo is available for 5 s and restores the exact previous state.
4. **Reminders fire on Android:** a per-entry reminder set 3 minutes ahead and the 21:00 daily review both arrive as notifications on a real Android 14+ device with the app closed, and again after a reboot; when exact alarms are denied the app shows the foil footnote and opens the system setting in one tap.
5. **Recurrence never drifts:** "monthly on the 31st" created on 2026-01-31 yields 2026-02-28, 2026-03-31, 2026-04-30 in that order; "every weekday" across a DST change never skips or duplicates a day — enforced by golden unit tests.
6. **Strength math is Loop-equivalent:** 13 consecutive daily completions from zero read exactly 50 %; 30 read 80 %; one miss after 30 drops to 76 %, never to zero.
7. **Backup round-trips losslessly:** export → wipe site data → import restores every entry, habit, completion, issue and setting byte-for-byte (verified by a Vitest snapshot of the export JSON), and a Gist backup with a fine-grained PAT completes in under 3 s on a normal connection.
8. **Accessible by construction:** every text colour ≥ 4.5:1 in both Night and Proof themes, every target ≥ 44 × 44 px, the full app operable by keyboard (`j/k x w e n ⌘K [ ]`), and Playwright's reduced-motion snapshot shows no animation longer than 120 ms.

## 6. Non-goals

- No accounts, no server, no real-time multi-device sync (Dexie Cloud stays a documented "someday", never a foundation).
- No projects/areas/priorities hierarchy, no Kanban, no Gantt, no time-blocking timeline, no calendar-feed import.
- No collaboration or sharing of lists (only the colophon PNG is shareable).
- No LLM or "AI" features; the quick-add grammar is deterministic.
- No Play Store publishing, no in-app purchases, no ads, no donation link (keeps GitHub Pages' non-commercial terms clean).
- No web push server: on the web build reminders only appear while the tab is open.
- No confetti, no badges, no streak-shaming copy.
- No iOS build (no Mac, no Apple developer account).

## 7. Feature list

### MVP ✅ (weekend path; must ship before anything else)
- Front Page (Today + This Evening), masthead roll, day-gauge rule, running heads, folio numbering.
- Composer quick add with chrono-node dates/times, `#tag`, `every …` (daily, weekdays, weekly on days) and `by <date>` deadline chips.
- Ink Strike (tap folio / swipe right), Margin Words, When sheet (swipe left), Folio Renumber (long-press reorder via Motion `Reorder`), 5-second Undo.
- Entry sheet: notes, checklist sub-entries, when, deadline, repeat, reminder, tags, move to Someday, delete.
- Upcoming (Week Spread, phone layout), Someday, Back Issues list with colophons.
- Ledger: daily and day-specific habits, tap-to-complete, current/best streak, strength ring, 12-week heatmap.
- Recurrence engine: daily/every N days, weekdays, weekly on days, monthly on day N/last, yearly; fixed vs after-completion.
- Colophon: issue close detection, colophon draw, optional standfirst line.
- Night/Proof/Auto theme, evening turn, reduced motion, first-open Issue No. 1.
- JSON export/import (web download; Android share sheet), `navigator.storage.persist()`.
- PWA on GitHub Pages; Capacitor Android APK on GitHub Releases with per-entry reminders (`at`) and the 21:00 daily review (`on:`), haptics, exact-alarm onboarding footnote.

### v1 🚀
- Desktop layout: 320 px rail with mini calendar, 640 px reading column, right-margin captions; `⌘K` Quick Find (cmdk); full keyboard map.
- Week Spread desktop board with cross-day drag (dnd-kit or pragmatic-drag-and-drop after a spike) and rolling day counters.
- Frequency habits ("3× per week"), streak freeze tokens, habit reminders, archived habits.
- Notification actions (Done / Snooze 1 h), `syncSchedules()` on every resume, "Reminders not firing?" help page.
- GitHub Gist backup (BYO fine-grained PAT), auto-backup daily, LWW merge on restore; Markdown export.
- Share the issue: 1080 × 1920 colophon PNG via SVG → canvas.
- Sound: synthesised platen tick, climbing pentatonic scale, thock, closing chime; quiet hours.
- Weekly review running heads in Back Issues; frozen Front Page for any past issue.

### Someday 🔮
- Android home-screen widget (static RemoteViews 4×2, then a ListView with checkboxes) via `capacitor-widget-bridge`; app-icon badge.
- Google Drive `appDataFolder` backup on web (GIS token model) and on Android (`@capgo/capacitor-social-login`, only if a device test returns an access token).
- Advanced RRULE import/export (optional `rrule` adapter) for people migrating from other apps.
- Dexie Cloud multi-device sync as an opt-in addon; WebDAV from the Android build.
- Paste-a-list → checklist, multi-select with swipe, bulk move.
- Year heatmap and strength chart; "what went well" weekly reflection view.

## 8. Platforms

| Target | How | Notes |
|---|---|---|
| Web (PWA) | GitHub Pages at `https://<owner>.github.io/nocturne/`, hash routing, Workbox precache | Installable; offline; reminders only while open |
| Android | Capacitor 8 shell, signed APK from GitHub Actions on tag `v*`, sideloaded | `minSdk 24`, `compileSdk 36`; local notifications, haptics, share sheet; widget later |
| Desktop | The same web app at ≥ 1024 px (rail + reading column + margin) | Keyboard-first; no Electron/Tauri build |
| iOS | Not targeted | No Mac available |

## 9. Constraints

- **Free, forever:** GitHub (public repo, Pages, Actions, Releases) only. No card is entered anywhere; no Cloudflare Worker is needed because nothing requires a secret.
- **Offline-first:** every feature except Gist/Drive backup works with the network off; the app shell and fonts are precached.
- **Privacy:** no analytics, telemetry, crash reporting or accounts. Data lives in the device's IndexedDB and leaves only via an explicit export or a backup the user configured with their own token. Tokens are stored on-device only, with a "session only" option, and are never logged.
- **Licences:** app code MIT; dependencies OSI only (MIT/Apache-2.0/ISC/BSD/CC0/MPL-2.0 for two optional Capacitor plugins); fonts SIL OFL 1.1 (Bricolage Grotesque, Geist, Geist Mono) self-hosted via Fontsource; Loop Habit Tracker's score *formula* is re-implemented from the description (its GPL code is never copied). Attribution section maintained in `README.md`.
- **Design contract:** `docs/DESIGN.md` tokens, fonts, motion and screens are binding; `design/preview.html` is the visual bar the real app must meet.
- **Local toolchain:** Node 22, npm, git, Biome. No Java/Android SDK locally — `npx cap add android` only writes files; every APK is built in CI.

## 10. The one-sentence pitch

Nocturne is a local-first daily to-do and habit tracker that sets your day as a numbered issue of a private navy newspaper — type entries in plain English, strike them with a swipe, and close the issue with a colophon instead of confetti — free, offline, on the web and as an Android app with real reminders.
