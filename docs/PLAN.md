# Nocturne — Build Plan

Written 2026-09-06. Follows `../_shared/DECISIONS.md` §D9 (day 1 = live; engine first; preview is the spec; weekend MVP path; no paid anything). Effort is in **evenings (≈ 2.5 h)** and **weekend days (≈ 6 h)** for one developer. Every task is ≤ half a day and has an acceptance criterion in *italics*.

Legend: `[ ]` todo · **DoD** = definition of done for the phase · ⚠ = risk.

---

## Phase 0 — Setup: live on day 1 (1 weekend day)

Dependencies: none. Everything here is scaffolding; no feature code.

- [ ] Scaffold with the README Quickstart steps 1–5 in `01-nocturne-goal-tracker/` (Vite `react-ts`, deps, Biome, Vitest, Playwright, shadcn Dialog). *`npm run dev` shows the Vite page; `npx biome check .` and `npx vitest run` pass with one placeholder test.*
- [ ] `vite.config.ts`: `base: process.env.VITE_BASE_PATH ?? "/"`, `@tailwindcss/vite`, `VitePWA({ registerType: "prompt", manifest … })`; `src/app/router.tsx` with `createHashRouter` and the six routes rendering placeholder text. *`npm run build && npx vite preview --base /nocturne/` serves `#/ledger` and reloads without 404.*
- [ ] Paste DESIGN.md §15 into `src/styles/tokens.css`; add `src/styles/motion.ts`; Tailwind `@theme inline` bridge in `src/index.css`; import the three Fontsource fonts in `main.tsx` (Bricolage via `/full.css`). *A test page shows the three fonts; DevTools confirms `opsz` responds on Bricolage (`font-variation-settings: "opsz" 96` vs `12` visibly differ); total font transfer ≤ 350 KB.*
- [ ] Theme bootstrap: inline script in `index.html` reads `localStorage["nocturne.theme"]` and sets `data-theme` before paint; `prefers-color-scheme` fallback. *Switching the OS theme with "Auto" flips Night/Proof with no flash on reload.*
- [ ] Copy `../_shared/templates/pages.yml` → `.github/workflows/pages.yml`; `git init`, `gh repo create nocturne --public`, push; Settings → Pages → Source "GitHub Actions". *`https://<owner>.github.io/nocturne/` shows the placeholder app with the fonts loaded; the PWA is installable from Chrome on the phone.*
- [ ] `npx cap init Nocturne com.rahul.nocturne --web-dir dist && npx cap add android`; commit `android/`; add `.gitattributes` LF rules; merge `../_shared/templates/app-build.gradle.snippet` into `android/app/build.gradle` (namespace/applicationId `com.rahul.nocturne`). *`git diff` shows only the signing/version block changed in `build.gradle`.*
- [ ] Run `bash ../_shared/scripts/make-keystore.sh nocturne` outside the repo; back up the `.p12` + passphrase in the password manager; `gh secret set` the four secrets. *`gh secret list` shows `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.*
- [ ] Copy `../_shared/templates/android-release.yml` → `.github/workflows/android-release.yml`; `git tag v0.0.1 && git push origin v0.0.1`. *A Release `v0.0.1` carries `nocturne-0.0.1.apk` + `SHA256SUMS.txt`; the APK installs on the phone and opens the placeholder app.*
- [ ] App icon SVG (navy square, foil "N" in Bricolage 300) → `npx pwa-assets-generator`; Android adaptive icon layers + `ic_stat_nocturne` + `splash.xml` + `colors.xml` from DESIGN §14/§16. *Home-screen icon and splash are navy/foil on the phone; the notification small icon is a white "N".*
- [ ] `capacitor.config.ts` from ARCHITECTURE §8; `platform/index.ts` `isNative()`; register the SW only on web. *`chrome://inspect` on a debug build shows no service worker inside the APK.*
- [ ] Add `.github/workflows/ci.yml` (IMPLEMENTATION-PROMPT §11.3): `on: pull_request, push:[main]`, `npm ci` → `npx playwright install --with-deps chromium` → `npm run build` (`VITE_BASE_PATH=/nocturne/`) → `npm run test:e2e`, uploading `playwright-report/` on failure. E2E lives here and **never in `pages.yml`**. *A pull request shows two checks, `pages` and `ci`; a deliberately failing e2e fails `ci` and leaves the Pages deploy untouched.*

**DoD:** placeholder app live on Pages and installed from a signed Release APK; CI green; fonts and tokens loaded; secrets set; keystore backed up.
⚠ Gradle/AGP mismatch on first CI run — fix by pinning what `npx cap add android` generated, never by upgrading blindly. ⚠ Forgetting `VITE_BASE_PATH` → blank page on Pages.

---

## Phase 1 — Design system + skeleton screens (3 evenings + 1 weekend day)

Dependencies: Phase 0. Output is the visual contract and static screens with fake data.

- [ ] Write `design/preview.html` (Google Fonts `<link>` allowed here): Front Page phone (Night, Proof, Evening), Front Page desktop, Ledger, Colophon end-state, Entry sheet — hand-written HTML/CSS from DESIGN §9. *Opened side by side with DESIGN §9 ASCII layouts, every element is present; all text passes 4.5:1 (checked with the DevTools contrast picker).*
- [ ] `components/ui`: `Sheet` (shadcn Dialog restyled: 92 % height phone / 560 px desktop, grabber, `--shadow-3`, scrim + 16 px blur), `Button` (text / filled foil / vermilion text), `Segmented`, `Input` (hairline underline), `Chip`, `Footnote`, `RunningHead`. *Storybook-free: a `/#/_kit` dev route renders every variant and state; keyboard focus rings visible on all.*
- [ ] `DigitRoll` component: fixed-width `0.62em` digit columns, `translateY` roll, 20 ms stagger rightmost-first, `aria-hidden` digits + visually hidden text twin; reduced-motion = 120 ms opacity. *Rolling 3/7 → 4/7 animates only the changed column; VoiceOver/TalkBack reads "4 of 7".*
- [ ] `Masthead` + `DayGauge` + masthead roll (480 ms, 30 ms per digit, issue number +60 ms, counter last); gauge as a hard-edged foil/border split updated every minute. *Reload shows the roll once; the gauge fraction matches `dayGauge()` for the current time; `role="progressbar"` with `aria-valuetext`.*
- [ ] `Shell`: phone footer tabs with sliding foil underline (240 ms `--ease-in-out`) + `env(safe-area-inset-bottom)`; desktop ≥ 1024 px rail (320 px) + reading column (640 px) + right-margin vertical caption. *Tab switch uses the View Transitions cross-fade where supported, opacity fallback elsewhere; `[`/`]` keys switch tabs.*
- [ ] Static Front Page, Week Spread, Ledger, Back Issues, Colophon screens with fixture data from `src/data/fixtures.ts`. *Playwright screenshots (phone 390×844, desktop 1280×800; Night, Proof, Evening; reduced-motion) are committed as the baseline and match `design/preview.html` on visual review.*
- [ ] Grain overlay (inline SVG `feTurbulence` filter, `--grain-opacity`), evening turn (token swap at `eveningHour`, 480 ms), `MotionConfig reducedMotion="user"` + Colophon › Motion override. *Grain is off in Proof and under `prefers-reduced-transparency`; at 21:00 the ground shifts and the running head reads EVENING EDITION.*

**DoD:** every screen exists with fixture data and matches the preview; `e2e/screenshots` baseline committed; no hex values outside `tokens.css`.
⚠ "Looks unfinished" is the concept's known failure mode — tune row height (56 px), title size (17 px) and greeting before moving on. ⚠ Fontsource Bricolage `index.css` is `wght`-only; confirm `/full.css` ships `opsz`.

---

## Phase 2 — Engine + core features (2 weekends + 5 evenings)

Dependencies: Phase 1 components. Engine files first (with tests), then wiring. Order matters; each bullet is shippable.

### 2a Engine (pure, tested) — 3 evenings
- [ ] `engine/ids.ts`, `daykey.ts` (§5.1) with tests for rollover at 01:30, issue numbering, gauge at 21:14, `isEvening` across midnight. *100 % branch coverage; golden fixture `daykey.json`.*
- [ ] `engine/ordering.ts` (fractional keys, section derivation, folio numbering, renumber-at-40). *Reordering a 3-item list writes exactly one record in the test; folios re-derive correctly with done rows mixed in.*
- [ ] `engine/recurrence.ts` (§5.4) + the thirteen golden rows R1–R13 (month-end clamp, Feb 29, DST weekdays, biweekly anchor, after-completion) + `toRRuleString`. *All thirteen rows pass; a property test (1,000 random rules/dates) asserts `next > base` and `scheduled(next)`; the daily case also runs under `Pacific/Kiritimati` and `Pacific/Pago_Pago`.*
- [ ] `engine/quickadd.ts` (§5.3) with chrono in a mocked "now" of Sun 2026-09-06 20:10. *The worked example yields exactly the documented `Parsed`; 15 more phrases (`tonight`, `fri 6pm`, `in 3 days #home`, `by friday`, `every mon, wed and fri after done`) are fixtures.*
- [ ] `engine/streaks.ts` + `strength.ts` (§5.5). *Current 3 for the Mon–Fri example; strength 50 % at 13 days, 80 % at 30, 76 % after one miss; frozen day leaves score unchanged.*
- [ ] `engine/issue.ts` (§5.7) + `notifications-plan.ts` (§5.8) + `merge.ts` (§5.9). *Close/reopen/re-close sequence fixture passes; `diffSchedules` cancels changed times and keeps id 1; merge is idempotent (merging the same remote twice changes nothing).*

### 2b Data layer — 1 evening
- [ ] `data/db.ts` schema v1; `data/repo.ts` with `addEntry`, `updateEntry`, `strike`, `undo`, `moveTo(when|someday)`, `reorder`, `deleteEntry` (tombstone), `addHabit`, `toggleCompletion`, `setStandfirst`, `saveSettings`; every write stamps `updatedAt` and bumps `meta.revision`. *Vitest with `fake-indexeddb`: each repo function has a test; `strike` + `undo` restores the exact pre-state snapshot.*
- [ ] First-launch seed: `settings.firstIssueDay = today`, Issue No. 1 with the three teaching entries (DESIGN §9.8); `navigator.storage.persist()` after the first user-filed entry (web). *Fresh profile shows "Welcome to your first issue." and 0 / 3.*

### 2c Front Page + Composer — 1 weekend day
- [ ] Wire `EntryList` to `useLiveQuery` sections I/II with Motion `layout` re-set; folios via `DigitRoll`; overdue meta in vermilion (once per screen rule enforced by rendering vermilion only on the first overdue row). *Adding an entry re-sets the list in 240 ms; no row pops.*
- [ ] Composer: hairline input, future folio preview, lazy chrono load on focus, chips from `parseQuickAdd`, tap-chip-to-discard, Enter files (field stays open), Shift+Enter files to This Evening, empty Enter closes; keyboard avoidance on Android. *The worked example files correctly; `Shift+Enter` sets `evening`; parse miss shows no chips and no red.*
- [ ] Ink Strike: tap folio (44 px hit box) or swipe right; SVG `pathLength` line 320 ms, haptic at 60 %, title to 40 %, folio → dash, meta `· closed HH:MM`, counter roll, `aria-live` "Closed at 21:14". *Strike completes < 600 ms; screen reader announces; undo within 5 s reverses the line right→left and restores the record.*
- [ ] Margin Words: `drag="x"`, `dragConstraints ±120`, `dragElastic 0.2`, "Done." / "When?" with `useTransform` opacity, foil snap + `impact medium` at 90 px, release → strike / When sheet, spring back otherwise. *Gesture arbitration: 12 px horizontal within 250 ms = swipe; vertical drag scrolls; verified on the phone.*
- [ ] Folio Renumber: long-press 250 ms → lift (surface, radius 12, shadow-2, scale 1.02, `selectionStart`), `Reorder.Group axis="y"` reorder with live folio re-roll + `selectionChanged`, drop on the house spring, persist one fractional key. *Reordering 20 rows stays at 60 fps in the Android WebView; DB writes = 1 per drop.*
- [ ] UndoFoot: replaces the composer hint for 5 s with a shrinking foil rule. *Expires exactly at 5 s or on the next mutating action.*
- [ ] Day rollover ticker + masthead re-roll on a new day; `strikeCountToday` reset. *Fake the clock across 03:00 in a test; the Front Page moves yesterday's open entries into the overdue set and the issue number increments.*

### 2d Entry sheet, When sheet, Week Spread, Someday — 1 weekend day
- [ ] `EntrySheet`: headline (folio + title, Bricolage 28), notes, checklist sub-entries (`02.1`), MonoTable rows When / Deadline / Repeat / Reminder / Tags, "Move to Someday", inline "Delete? — Yes / Keep"; autosave on blur (300 ms debounce); swipe-down/grabber/predictive-back dismiss. *Every field round-trips to Dexie; the sheet traps focus and returns it to the row.*
- [ ] `WhenSheet`: Today / This Evening / Tomorrow / weekday chips / a month grid / Someday. *Swipe-left → pick Tomorrow moves the entry and rolls both counters.*
- [ ] `RepeatPicker`: the six patterns + fixed/after-completion toggle, showing the next three dates from `nextOccurrence`. *Setting "monthly on 31" from 2026-01-31 previews 28 Feb, 31 Mar, 30 Apr.*
- [ ] Week Spread (phone vertical run): day-heads (mono weekday, Bricolage 36 numeral, counts, one vermilion "overdue n"), entries under each, `—` folio for empty days; past days hidden. *Striking a recurring entry spawns the next instance under the right day-head.*
- [ ] Someday list under the Upcoming tab's running head `SOMEDAY` (no dates, reorderable). *Moving to Someday clears `when` and sets `bucket`.*

### 2e Ledger + Back Issues + Colophon — 1 weekend day
- [ ] Ledger: `LedgerLine` (name, `streak · best` mono, 24 px `StrengthRing`), tap = complete today (arc 240 ms, digit roll, `impact light`), long-press = `HabitSheet` (title, daily / days-of-week, delete/archive); habit composer "Add a habit…". *Streak and ring values match the engine fixtures for seeded completions.*
- [ ] `Heatmap12` (SVG 12 × 7 grid: foil dot / hairline circle / today numeral) expanded on tap with 96 px ring and "78 % strength" in Bricolage 36. *Renders 84 cells in < 4 ms; keyboard-focusable summary.*
- [ ] Issue close: after the last strike settles (400 ms) run the Colophon Draw (fade to 40 %, foil rule 480 ms, lines 60 ms apart, `notification success`); standfirst input "A line for the record —" saved via `setStandfirst`; "Set tomorrow" opens the Week Spread on tomorrow. *Closing Issue No. 1 prints "Issue No. 1 closed. Three entries. Streak 1 day."; adding a new entry reopens (colophon exits) and the standfirst survives.*
- [ ] Back Issues: month heads (Bricolage 48), rows `No. 248 · SAT 05 SEP · 6 / 6 · closed 22:03` + standfirst, open days muted; tap → `FrozenFrontPage` with its colophon. *Issue rows come from the `issues` table only (no scan of entries); 365 rows render in < 50 ms.*
- [ ] Colophon screen (settings): Theme, Evening hour, Day rollover, Motion, Sound (Off/On/Quiet hours), Daily review time, reader name, attribution block, version. *Every setting persists and takes effect without reload; the rollover change re-derives today.*
- [ ] Backup: JSON export (`exportDB` → web `<a download>` / Android `Filesystem` + `Share`), import with header validation and mono progress line; `Storage: persistent/best-effort` readout. *Export → clear site data → import restores everything; Vitest snapshot of the export shape.*

**DoD:** the app is a complete daily tracker on web with all MVP features; engine coverage 100 % lines; repo tests green; Playwright flows: file → strike → colophon → back issue; export/import round-trip.
⚠ Motion `layout` + `Reorder` fighting on the same rows — keep `layout` off the item currently being dragged. ⚠ chrono chunk loading late on first focus — prefetch on composer hover/`pointerdown`. ⚠ Time-zone travel: `todayKey` uses local fields, `Completion.ts` keeps the instant; test with `TZ=America/Los_Angeles npx vitest`.

---

## Phase 3 — Polish, motion, sound (4 evenings)

Dependencies: Phase 2. Nothing here changes data shapes.

- [ ] Motion audit against DESIGN §7.1: every named animation's duration/easing/stagger matches; nothing scales past 1.02; nothing auto-plays after the masthead. *A `motion-audit.md` checklist with a tick per animation, plus reduced-motion Playwright snapshot showing instant layouts.*
- [ ] Evening Edition polish: running-head cross-fade at 240 ms, `--bg` token transition 480 ms, status-bar style follows theme. *Screenshot at 20:59 vs 21:01 differs only in ground and running head.*
- [ ] Sound synth (`features/sound/synth.ts`): platen tick, climbing pentatonic scale (§5.10), thock, closing chime, undo (reversed tick); master 0.35; unlock on first pointer; quiet hours. *Seven strikes play C4 D4 E4 G4 A4 C5 D5; silent at 23:30 with quiet hours on; no audio files in `dist/`.*
- [ ] Haptics map (DESIGN §12) wired through `platform/haptics.ts`; web `vibrate(8)` fallback; never on scroll. *Manual checklist on the phone: strike, 90 px arm, lift, renumber ticks, drop, colophon.*
- [ ] Keyboard map: `j/k`/arrows select (surface-2 wash + focus ring), `x` strike, `w` when, `e` edit, `n` new, `Esc`, `Alt+↑/↓` reorder, `[`/`]` tabs. *Playwright drives a full day (file, reorder, strike, close) with the keyboard only.*
- [ ] Empty/loading/error states per DESIGN §9 (one light line each; hairlines draw first; storage-unavailable footnote). *Playwright screenshots for each state committed.*
- [ ] Text scaling pass at 130 % font size and a 320 px-wide viewport. *Nothing overlaps; only meta lines truncate.*
- [ ] Performance pass: bundle analyser, chrono/cmdk lazy chunks, `content-visibility: auto` on rows, `React.memo` on `EntryRow`, CI size gate (gz ≤ 200 KB). *Lighthouse (mobile, throttled) LCP < 2.0 s cold, ≥ 95 accessibility; 60 fps drag trace in the Performance panel.*

**DoD:** the app is indistinguishable from `design/preview.html` in motion and still; sound and haptics complete; keyboard-only path passes; budgets met.
⚠ Web Audio on Android WebView needs a *touch* gesture, not `pointerdown` from a mouse — unlock on both.

---

## Phase 4 — Android packaging (3 evenings)

Dependencies: Phase 0 CI, Phase 2 features. Every check here is on a real phone from a Release APK (`workflow_dispatch` builds for quick loops).

- [ ] `platform/notifications.ts` (§5.8): channel, `registerActionTypes`, `syncSchedules()` on write/resume/import, per-entry `at` reminders, daily review `on:`; permission asked only after Issue No. 1 closes. *A reminder set 3 min ahead fires with the app closed; the 21:00 review fires with the right open count; both re-arm after a reboot.*
- [ ] Exact-alarm onboarding: `checkExactNotificationSetting()` on resume → foil footnote in the Reminder row and the Colophon; `changeExactNotificationSetting()` opens the system page. *On an Android 14+ device the footnote appears until "Alarms & reminders" is allowed, then disappears.*
- [ ] Notification actions: Done → `strike`, Snooze 1 h → `reminderAt + 1 h`, tap → open the entry sheet via `#/?entry=<id>`. *Each action works from a killed app.*
- [ ] Edge-to-edge and system bars: `StatusBar.setOverlaysWebView`, style per theme, `env(safe-area-inset-*)` + Capacitor 8 fallback vars; footer tabs above gesture nav; masthead 8 px below the inset. *No content under the status bar or the nav pill on a gesture-nav phone; predictive back closes sheets.*
- [ ] Keyboard avoidance: `Keyboard.addListener("keyboardWillShow")` translates the composer only. *The masthead does not jump when the composer gains focus.*
- [ ] Splash + icon check, `launchFadeOutDuration: 0`, masthead roll as the opening. *Cold start: navy splash → masthead roll with no white flash.*
- [ ] Backup on Android: `Filesystem.writeFile` (Cache) + `Share.share`; import via `<input type="file">`. *Export lands in Drive/Files through the share sheet; re-import works.*
- [ ] "Reminders not firing?" help page in the Colophon linking to dontkillmyapp.com and the exact-alarm setting; note about OEM battery managers. *Page renders offline; links open in the system browser (`window.open` → Capacitor `Browser`-free `_system` target).*
- [ ] Deep-link intent filter `nocturne://` (§8) + `appUrlOpen` routing. *`adb shell am start -a android.intent.action.VIEW -d nocturne://today` (from any machine with adb) or a tapped link opens Today — or verify via the notification tap path when no adb is available.*
- [ ] Release hygiene: `versionName` from tag, `versionCode` from run number (template), `SHA256SUMS.txt`, install-over-previous-version test. *`v0.2.0` installs over `v0.1.0` without uninstalling; data survives.*

**DoD:** signed APK from a tag; reminders (exact and inexact) verified on device including reboot; edge-to-edge and back gestures correct; the manual Android checklist in `docs/TESTING.md` (written in Phase 5) passes.
⚠ Exact-alarm behaviour is unverifiable without hardware — test on the owner's phone first, then a second Android version if available. ⚠ OEM battery killers — document, do not fight.

---

## Phase 5 — Testing and launch (2 evenings + 1 weekend day)

Dependencies: Phases 2–4.

- [ ] Write `docs/TESTING.md`: engine test map, repo test map, Playwright flows and screenshot matrix, the manual Android checklist (install, permission, exact alarm, reboot, edge-to-edge, back, share, import), and the accessibility checklist. *Every item has a command or a step-by-step.*
- [ ] Playwright e2e: first issue → three strikes → colophon; quick-add matrix; reorder; recurrence spawn across a fake midnight; export/import; keyboard-only day; Night/Proof/reduced-motion screenshots. *`npx playwright test` green in `ci.yml` on push/PR — **never in `pages.yml`**, so a flaky gesture cannot block a deploy; `pages.yml` runs unit tests only.*
- [ ] Accessibility sweep: axe via `@axe-core/playwright` on every route; manual TalkBack pass on the Front Page and sheet. *Zero serious/critical axe issues; TalkBack reads folio, title, meta and the strike announcement.*
- [ ] Data-safety drills: fill 5,000 entries + 20 habits × 2 years via a script; measure Front Page query and scroll; export size; import time. *Query < 10 ms; export < 2 MB; import < 3 s; no jank.*
- [ ] Time drills: rollover at 03:00, DST switch nights (2026-10-25 EU, 2026-11-01 US), leap day, travelling +9 h. *Issue numbers and streaks stable in each scenario (Vitest with faked clocks and `TZ`).*
- [ ] README: replace "Planned" with the live URL, Release link, screenshots (phone Night, desktop, colophon); Attribution verified against `package.json` licences (`npx license-checker --summary`). *Every dependency licence is OSI/OFL/CC0; MPL only for the optional Capgo plugin.*
- [ ] Tag `v1.0.0`; install on the phone; use it as the only task list for one week; log friction in `docs/JOURNAL.md`. *Seven consecutive issues closed or consciously not; no data loss; at least three friction notes triaged into Phase 6.*

**DoD:** `pages.yml` runs lint + unit before deploy and `ci.yml` runs lint + unit + e2e on every push/PR; TESTING.md complete; `v1.0.0` on Releases and Pages; one week of daily use survived.
⚠ Playwright screenshot drift across OS font rendering — run screenshot tests only on the Linux CI runner and compare there.

---

## Phase 6 — Stretch (v1 🚀 then Someday 🔮; pick by JOURNAL.md friction)

Each item is independent unless noted.

- [ ] Desktop rail with MiniCalendar (foil dots for days with entries; today circled), right-margin captions, `⌘K` Quick Find via cmdk (lazy chunk). *Find filters entries/habits/issues across tables in < 30 ms.*
- [ ] Week Spread desktop board: seven columns, cross-day drag. Spike first: one evening each with `@dnd-kit/core` 6.3.1 and `@atlaskit/pragmatic-drag-and-drop` 3.1.0 on the phone; keep the one that coexists with Motion `Reorder` (disable `layout` on the dragged row; `DragOverlay`/custom preview = lifted entry). *Drop onto a day-head rolls both counters; touch long-press 250 ms; keyboard sensor works.*
- [ ] Frequency habits ("3× per week") with ISO-week streaks; streak-freeze tokens (Completion `value 0, frozen true`); per-habit reminders via `syncSchedules`. *Fixtures for week streaks and freezes pass; freeze leaves strength unchanged.*
- [ ] GitHub Gist backup (§9.1): PAT entry (hairline password field, "session only"), create/update/restore, auto-backup every 6 h on revision change, merge on restore, status row `Last printed 2 h ago · gist abc123`. *Two browser profiles converge after each backs up and restores; token never appears in exports or logs.*
- [ ] Markdown export (issues as headings, entries as lines, habits as a table). *Opens cleanly in any editor.*
- [ ] Share the issue: SVG → PNG 1080 × 1920 with embedded fonts; web download / Android share. *The PNG shows the masthead, struck entries and colophon in the right fonts on the phone.*
- [ ] Weekly review running heads in Back Issues (`WEEK 36 · 25 / 29 · 3 issues closed`). *Computed from `issues` only.*
- [ ] Private reminders option (redacted notification body). *Lock screen shows "An entry is due".*
- [ ] 🔮 Android widget: `capacitor-widget-bridge` payload after writes, `NocturneWidgetProvider.kt` + `widget_today.xml` (4×2 static: issue, counts, gauge as two views, next entry, streak), tap → `nocturne://today`; then a `ListView` with checkboxes → `nocturne://complete/<id>`. Build only in CI via `workflow_dispatch` debug APKs. *Widget updates within 1 s of a strike; pin prompt via `requestWidget()`.*
- [ ] 🔮 Google Drive `appDataFolder` on web (GIS token model) and, if a device test returns a non-null `accessToken`, on Android via `@capgo/capacitor-social-login`. *Create/update/restore round-trip; consent screen shows no warning for the non-sensitive scope.*
- [ ] 🔮 Optional `rrule` adapter behind `engine/recurrence-rrule.ts` for importing arbitrary RRULE strings from other apps. *Round-trip of the six native patterns through RRULE is lossless.*
- [ ] 🔮 Dexie Cloud opt-in (`dexie-cloud-addon`) as a separate lazy chunk; off by default; documented as proprietary. *App works identically with the addon absent.*
- [ ] 🔮 Paste-a-list → checklist; multi-select with swipe; bulk move; year heatmap; strength chart.

---

## Effort summary and dependencies

| Phase | Effort | Depends on |
|---|---|---|
| 0 Setup | 1 weekend day | — |
| 1 Design system + skeleton | 3 evenings + 1 weekend day | 0 |
| 2 Engine + core | 2 weekends + 5 evenings | 1 (components), 0 (CI) |
| 3 Polish/motion/sound | 4 evenings | 2 |
| 4 Android packaging | 3 evenings | 0, 2 |
| 5 Testing & launch | 2 evenings + 1 weekend day | 2, 3, 4 |
| 6 Stretch | open-ended, 1–3 evenings per item | 5 |

Total to `v1.0.0`: about **5 weekends + 17 evenings** (≈ 75 h) at a comfortable pace.

---

## Weekend MVP fast path (ship Sunday night, use Monday morning)

The minimal ordered list; everything else waits. Skip any polish not named.

**Saturday**
1. Phase 0 entirely (scaffold, tokens, fonts, Pages live, `cap add android`, keystore, secrets, `v0.0.1` APK).
2. `engine/daykey.ts`, `ordering.ts`, `quickadd.ts` (dates, times, `#tag`, `every day|weekday|week` only), `recurrence.ts` (daily, weekdays, weekly), `streaks.ts`, `strength.ts`, `issue.ts` with the golden fixtures listed for them.
3. `data/db.ts`, `repo.ts` (`addEntry`, `strike`, `undo`, `moveTo`, `reorder`, `toggleCompletion`, `saveSettings`), first-launch seed.

**Sunday**
4. `Masthead` + `DayGauge` (roll may be a plain fade for now), `RunningHead`, `EntryRow` with Ink Strike by folio tap and swipe right, Margin Words, `Reorder` long-press, `UndoFoot`.
5. Composer with chips, Enter / Shift+Enter.
6. `WhenSheet` (Today / Evening / Tomorrow / weekday / Someday); Week Spread phone run; Someday list.
7. Ledger with `LedgerLine`, streak, ring; no heatmap yet.
8. Colophon draw (rule + lines, no standfirst yet); Back Issues list.
9. Colophon settings: theme, evening hour, rollover, JSON export/import.
10. `platform/notifications.ts` with the daily review `on:` + per-entry `at` (inexact acceptable); permission request after Issue No. 1 closes.
11. Tag `v0.1.0` → install the APK → file tomorrow's issue before bed.

Deferred from the MVP without guilt: desktop layout, sound, heatmap, standfirst, share card, keyboard map, exact-alarm onboarding, Gist, Playwright screenshots (unit tests still run).
