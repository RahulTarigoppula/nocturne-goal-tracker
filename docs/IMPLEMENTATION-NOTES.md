# Nocturne — Implementation Notes

Written 2026-09-29, alongside the first implementation (v0.1.0). These notes record what was built, the decisions taken where the plan was silent or wrong, and what still needs a human, a phone or a GitHub account. Where this file and `IMPLEMENTATION-PROMPT.md` disagree, this file describes the code as it is.

## 1. State of the build

| Area | State | Evidence |
|---|---|---|
| Engine (`src/engine/`) | Done: day keys, ordering, quick-add, recurrence, streaks (daily and weekly), strength, issue, colophon, notification plan, merge, scale | 110+ golden and property tests; 97–98 % line coverage |
| Data (`src/data/`) | Done: Dexie schema v1, repo, live-query hooks, JSON backup/import/merge, Markdown export, Gist client, auto-backup | Repo tests on fake-indexeddb, including strike+undo snapshot restore and the export round-trip |
| Front Page | Done: masthead roll, day gauge, running head with evening swap, sections I/II, folios, ink strike, margin words, swipe, long-press reorder (one write per drop), undo foot, composer with chips, colophon draw, standfirst, keyboard map | Playwright flows 1–4 and 12 |
| Sheets | Done: Entry (title, notes, paste-a-list → checklist, sub-entries, when, deadline, repeat, reminder, tags, someday, inline delete, reopen); When (today / evening / tomorrow / weekend / month grid / someday); Habit; Quick Find (Ctrl/⌘+K) | e2e |
| Week Spread + Someday | Done (phone vertical run; desktop seven columns) | e2e compose flow |
| Ledger | Done: daily / some-days / N-times-a-week habits, streak · best, 24 px ring, 12-week heatmap, 96 px ring, weekly freeze token, archive/restore/delete | e2e ledger flow |
| Back Issues | Done: month heads, weekly review heads, standfirsts, frozen front page per issue | e2e rollover flow |
| Colophon (settings) | Done: theme, evening hour, rollover, reader name, motion, sound (off/on/quiet hours), notifications, daily review, exact alarms, private reminders, "Not firing?" note, backups, attribution | e2e theme + backup flows |
| Share card | Done: SVG → PNG 1080×1920 with embedded fonts, falls back to system fonts | Manual check only |
| PWA | Done: Workbox precache (fonts included), `registerType: "prompt"` with the "² A new edition is ready — Reload" footnote, installable manifest, production-only CSP | Build output |
| Android | Project generated and configured: signing block, deep-link intent filter, permissions, adaptive/monochrome icon, splash, `ic_stat_nocturne`, colours | **Not compiled locally (no JDK/SDK by design); first compile happens in CI** |
| CI | `pages.yml` (Biome, unit tests, build, size gate, deploy), `ci.yml` (Biome, unit, e2e, Android bundle shape), `android-release.yml` (signed on tags; debug-signed on manual runs without secrets), Dependabot | Not yet run; the repo is not on GitHub |

## 2. Decisions and improvements over the plan

1. **Overdue entries are rolled forward in storage, not only in the query.** The plan derived Today as `when = today ∪ open entries with when < today`. That breaks two things: an entry filed for tomorrow kept `bucket = "upcoming"` and would never appear on its day, and an overdue entry could never count toward (or close) today's issue. Instead, `repo.rollForward(today)` runs at launch and on every day change. It moves open past entries to today and records `rolledFrom`, which drives the `OVERDUE FRI` meta. Past issues keep their record as it stood, so yesterday shows as `4 / 7 · open` in Back Issues. `bucket` is now derived from `when` at write time; only `someday` is ever read back.
2. **Fixed-mode recurrence never spawns into the past.** Striking a daily entry that is 3 days overdue creates tomorrow's instance, not a backlog of three. Golden row R13 still holds.
3. **`todayKey` uses local-field arithmetic**, not "subtract N hours of milliseconds". The spec's version shifted by a fixed number of milliseconds, which is off by one hour across a DST change.
4. **Empty days leave no issue.** Deleting the last entry deletes the issue record unless it carries a standfirst.
5. **Colophon counts from 13 to 99 are also words** ("Twenty-one entries."). The spec fixed only ≤ 12 and ≥ 100.
6. **Scale golden correction.** `scaleHz(10)` is C6 (1046.5 Hz) by the spec's own formula. The spec's golden said "10 → A5 880", but A5 is step 9. The test encodes the formula.
7. **Dropped dependencies:**
   - Tailwind: every style is token-driven hand-written CSS ported from `design/preview.html`, so Tailwind added nothing.
   - shadcn/Base UI: a 90-line accessible `Sheet` with focus trap, Esc, grabber drag and focus return replaces it.
   - `dexie-export-import`: a plain `{format, schema, revision, data}` JSON is smaller, diffable, merge-friendly and header-validated.
   - date-fns and @date-fns/tz: the engine has its own UTC day arithmetic.
   - cmdk: Quick Find is 100 lines.
   - lucide-react: it ended up unused.
8. **Fonts are three latin woff2 files** copied from Fontsource into `src/styles/fonts/` with their OFL licences, 129 KB in total. Fontsource ships many subsets that Workbox would precache, and Bricolage's `full.css` does not exist in 5.3. The `opsz` build is used, so `wdth` is not shipped; the spec allowed dropping it.
9. **`capacitor.config.json` instead of `.ts`.** Capacitor 8.5 cannot load a TS config under TypeScript 7 on Node 22.17.
10. **Theme bootstrap is `public/theme-boot.js`**, a blocking pre-paint script, so the production CSP can stay `script-src 'self'` without hashes. The CSP meta is injected only in production builds, because the dev server needs inline scripts.
11. **The Android build aliases `virtual:pwa-register` to a stub**, so no Workbox code reaches the APK. CI asserts there is no `sw.js`.
12. **The manual `workflow_dispatch` APK is debug-signed when no keystore secrets exist.** You can sideload a test build before creating the key. Tag builds refuse to run without the keystore.
13. **Freeze tokens:** one per ISO week, spent on yesterday from the habit sheet. The plan never defined how tokens are earned.
14. **Storage failure:** when IndexedDB is unavailable the app renders from in-memory defaults and shows the vermilion footnote. It does not crash.
15. **Routes other than the Front Page are lazy chunks**, and so are the sheets and the colophon/share card.
16. **React Router is replaced by a 120-line hash router** (`src/app/hash-router.tsx`) covering `Link`, `NavLink`, `useNavigate`, `useParams`, `useSearchParams` and route matching. React Router cost about 30 KB gzip for six fixed routes. With it gone, the initial JS is **168.6 KB gzip**, under the 180 KB target, and the CI gate now enforces 180. URLs are unchanged (`/nocturne/#/issues/2026-09-05`).

## 3. Known gaps (be honest)

- **Visual baselines are not committed.** The spec wants them generated on Linux CI only. Once the repo is on GitHub, add `toHaveScreenshot` specs and generate them there.
- **Not verified on a real device:** Android reminders, exact alarms, reboot re-arm, haptics, edge-to-edge insets, predictive back and the share sheet. The checklist is in `docs/TESTING.md`; log results in `docs/VERIFICATION-LOG.md`.
- **Not built (v1/someday):**
  - Week Spread cross-day drag on desktop (the plan calls for a dnd-kit spike first).
  - Per-habit reminders.
  - The home-screen widget.
  - Google Drive backup.
  - RRULE import.
- **Web reminders fire only while the tab is open.** The UI says so.

## 4. How the pieces talk

`repo.ts` is the only writer. Every write stamps `updatedAt`, bumps `meta.revision` and emits `onWrite`. `providers.tsx` listens: it re-syncs notifications (debounced 500 ms), requests `storage.persist()` once, and runs the auto-backup check every 30 minutes. Components read through `data/queries.ts` (`useLiveQuery`) and derive sections, folios, streaks and strength through engine functions. Ephemeral UI state (sheet, undo slot, selection, strike count, colophon-just-closed) lives in one Zustand store.

## 5. Android build (2026-10-12)

- APK built locally with a portable toolchain in `C:\Work\android-toolchain` (Temurin JDK 21, Android SDK platform 36 / build-tools 35, emulator for testing) and signed with a personal PKCS12 key kept in `C:\Work\android-toolchain\keys` (not in git). `scripts/build-apk.ps1` reproduces it. Gradle needs `-Djava.net.preferIPv4Stack=true` on this network.
- Verified on an Android 14 (API 34) emulator: cold start into the masthead, swipe-to-strike, quick add with chips, a per-entry reminder delivered as a notification on the `Reminders` channel with the foil "N" small icon, the Done action striking the entry from the shade, install-over-update keeping all data.
- **Fix found on device:** `@capacitor/local-notifications` 8.3 opens the system "Alarms & reminders" screen on every `schedule()` when exact alarms are denied (the Android 14 default), and the app re-syncs on each resume, so it nagged on every open. Reminders are now scheduled with `isExactNotification` matching the current permission; once the user allows exact alarms (from the footnote), the next sync reschedules everything as exact.
- **Fix found on device:** the footer tabs rode on top of the soft keyboard; they now hide while it is open (`@capacitor/keyboard` events → `html.kb-open`).
- Still unverified (needs your real phone): reboot re-arm, Doze delivery, OEM battery managers, haptics feel, predictive back.
