# Nocturne — Testing Strategy & Test Plan

Written 2026-09-06. Binding inputs: `_shared/DECISIONS.md` (D1 tooling: Vitest + Testing Library + Playwright; D7 token contract; D9 "engine first"), `docs/RESEARCH.md` (§5 algorithms, §12 verification log), `docs/DESIGN.md` (tokens §15, motion §7, screens §9, a11y §13, Android §14). Every case below is specific to Nocturne; nothing here is a generic template.

Nocturne has **no external data source and no server**, so the test surface is: pure engine logic (dates, streaks, recurrence, quick-add, ordering, merge), the Dexie persistence layer, the editorial UI (masthead, entries, sheets, colophon), the PWA shell, and the Capacitor Android build with local notifications. The riskiest pieces — Android alarm delivery and the Kotlin widget — cannot run in CI and get a manual device checklist (§12).

---

## 1. Strategy at a glance

| Layer | Tool | What it proves | Where | Gate |
|---|---|---|---|---|
| Unit (engine) | **Vitest 3** (`environment: node`) + `fake-indexeddb` for the repository layer | `src/engine/**` is 100 % correct against golden data; DST/month-end/rollover edge cases | `src/engine/**/*.test.ts` | Every PR; ≥ 95 % line coverage on `src/engine`, 100 % on `recurrence.ts`, `streaks.ts`, `strength.ts`, `daykey.ts` |
| Component | **@testing-library/react** + **@testing-library/user-event** (jsdom) | Entry, Composer, DigitRoll, Sheet, Colophon, LedgerLine behave and announce correctly; keyboard map works | `src/features/**/__tests__/*.test.tsx` | Every PR |
| E2E | **Playwright 1.5x** (Chromium desktop + "Pixel 7" device profile) | Real IndexedDB, real hash routes, real gestures (pointer swipes/long-press), real service worker | `e2e/*.spec.ts` | Every PR on `main`; `pages.yml` runs `npm test -- --run` only (unit) — e2e runs in a separate `ci.yml` job so a flaky gesture test never blocks a deploy |
| Visual | Playwright `toHaveScreenshot` + computed-style assertions against `tokens.css` | The app matches `design/preview.html` (D9.3) in Night, Proof, Evening, Colophon, reduced-motion | `e2e/visual/*.spec.ts`, baselines in `e2e/visual/__screenshots__/` (committed, Linux-only) | Every PR; diffs reviewed by eye |
| Performance | Playwright traces + Lighthouse CI (`@lhci/cli`, `preset: desktop` and `mobile`) + `vite-bundle-visualizer` size check | Budgets in §8 | `e2e/perf/*.spec.ts`, `lighthouserc.json` | Weekly + before every tag |
| Accessibility | `@axe-core/playwright`, manual keyboard/NVDA pass | §9 | `e2e/a11y.spec.ts` | Every PR (axe), before every tag (manual) |
| Device | Manual checklist on the owner's phone (Android 14+) with a `workflow_dispatch` APK | Notifications, exact alarms, reboot, back gesture, insets, share/import | §12 | Before every `v*` tag |

**Scripts** (`package.json`):

```json
{
  "test": "vitest",
  "test:unit": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:visual": "playwright test e2e/visual",
  "test:visual:update": "playwright test e2e/visual --update-snapshots",
  "test:a11y": "playwright test e2e/a11y.spec.ts",
  "test:perf": "playwright test e2e/perf && lhci autorun",
  "test:all": "npm run test:unit && npm run build && npm run test:e2e"
}
```

**Determinism rules**
- Every engine test passes an explicit `now`/`today` — nothing reads `Date.now()` unguarded. `vi.setSystemTime(new Date("2026-09-06T21:14:00"))` is the house fixture ("Issue No. 249, Sunday, 21:14" — the colophon in DESIGN §8.5; see the calendar correction in §2.1).
- Playwright freezes time with `await page.clock.install({ time: new Date("2026-09-06T21:14:00") })` before navigation so the masthead, day gauge and colophon are byte-stable.
- Timezone for CI and local runs is pinned: `TZ=Asia/Kolkata` in `vitest.config.ts` (`env`) and `playwright.config.ts` (`timezoneId: "Asia/Kolkata"`). DST cases set `TZ` per test via `@date-fns/tz` `TZDate`, never by changing the process.
- Seeds: `fractional-indexing` and IDs use a seeded `nanoid` in tests (`customAlphabet` with a mulberry32 PRNG) so snapshots are stable.

---

## 2. Test layout and fixtures

```
src/engine/                             # PURE: no React, no Dexie, no Date.now(). Each file has a .test.ts twin
  ids.ts / ids.test.ts                  # 12-char base62 ids from an injected RNG
  daykey.ts / daykey.test.ts            # day key, rollover, issue number, day gauge + aria text, greeting, running head
  streaks.ts / streaks.test.ts          # currentStreak, bestStreak, currentWeekStreak, issueStreak
  strength.ts / strength.test.ts        # Loop-equivalent exponential smoothing score (0–100 for the ring)
  recurrence.ts / recurrence.test.ts    # the six in-house patterns + spawnNext + toRRuleString (export only)
  quickadd.ts / quickadd.test.ts        # chrono-node + "every …" grammar + #tag  (no @-project: GOAL §6 non-goal)
  ordering.ts / ordering.test.ts        # fractional index wrapper, folios, renumber
  merge.ts / merge.test.ts              # LWW + tombstones + completions union
  issue.ts / issue.test.ts              # deriveIssue: close / reopen / re-close
  colophon.ts / colophon.test.ts        # colophon sentence builder, number words
  scale.ts / scale.test.ts              # climbing pentatonic scale
  notifications-plan.ts / ….test.ts     # planNotifications + notifId + diffSchedules
  __golden__/                           # golden JSON below — data files, never inline literals
src/data/
  db.ts, repo.ts, repo.test.ts          # Dexie schema + repository (fake-indexeddb)
  migrations.test.ts                    # schema upgrade drill (v1 → v2 when the first migration ships)
src/test/
  setup.ts                              # jsdom matchMedia/ResizeObserver/IntersectionObserver polyfills, fake-indexeddb/auto
e2e/
  fixtures/seed.ts                      # seeds IndexedDB through the app's own import path
  today.spec.ts, composer.spec.ts, gestures.spec.ts, ledger.spec.ts, issues.spec.ts,
  backup.spec.ts, offline.spec.ts, keyboard.spec.ts, a11y.spec.ts
  visual/*.spec.ts, perf/*.spec.ts
```

Folder names are binding: the database lives in `src/data/` and the goldens in `src/engine/__golden__/` (ARCHITECTURE §3, IMPLEMENTATION-PROMPT §2.4). `recurrence.ts` has **one** backend — the in-house six-pattern engine; `rrule` is not a dependency (DECISIONS D8, prompt §2.1 "Explicitly not used").

### 2.1 Golden fixtures (`src/engine/__golden__/`)

All goldens were derived by hand from the algorithms in **IMPLEMENTATION-PROMPT §6**, which is the authority wherever documents disagree (§0.2), cross-checked against ARCHITECTURE §5 and DESIGN. They are **data files** in `src/engine/__golden__/`, never inline literals, so they diff cleanly. If a test disagrees with a golden, suspect the code first, then the golden — and record the correction in this file.

**`calendar.json`** — the house dates.

| Local datetime (Asia/Kolkata) | dayKey (rollover 03:00) | Issue No. = `daysBetween(firstIssueDay, dayKey) + 1` | Running head |
|---|---|---|---|
| 2026-09-06T21:14 | `2026-09-06` | 249 | `SUN 06 SEP` |
| 2026-09-07T02:59 | `2026-09-06` (still yesterday's issue) | 249 | `SUN 06 SEP` |
| 2026-09-07T03:00 | `2026-09-07` | 250 | `MON 07 SEP` |
| 2026-01-01T12:00 | `2026-01-01` | 1 | `THU 01 JAN` |
| 2026-12-31T23:59 | `2026-12-31` | 365 | `THU 31 DEC` |
| 2028-02-29T12:00 (leap) | `2028-02-29` | 60 | `TUE 29 FEB` |
| 2028-03-01T12:00 | `2028-03-01` | 61 | `WED 01 MAR` |
| 2026-01-01T01:00 (rollover 03:00) | `2025-12-31` | 365 — this row uses `firstIssueDay = 2025-01-01` | `WED 31 DEC` |

> **Calendar correction (recorded 2026-09-06, applied 2026-09-08).** Verified with `date -d 2026-09-06 +%a`: **2026-09-06 is a Sunday**, 2026-09-05 a Saturday, 2026-09-04 a Friday. The pre-correction sample copy labelled the fixture day Saturday and every Back Issues row one weekday early; the running-head *format* was binding, those *sample weekdays* were not. DESIGN.md §9, ARCHITECTURE.md §5 and `design/preview.html` now all read `SUNDAY` / `SUN 06 SEP` / `SAT 05 SEP` / `FRI 04 SEP`, so preview screenshots and app screenshots match. See IMPLEMENTATION-PROMPT §0.2, which is the authority on every ruling in this file.
>
> Every other row uses the house profile's `firstIssueDay = 2026-01-01`. A dayKey earlier than `firstIssueDay` cannot occur in the app — the value is written on first launch — so no test asserts a zero or negative issue number.
>
> The issue number is `daysBetween(settings.firstIssueDay, dayKey) + 1` — **not** day-of-year. It only *coincides* with day-of-year here because the fixture profile's `firstIssueDay` is `2026-01-01`; a fresh install opens on `No. 1` (prompt §0.2, ARCHITECTURE D-04).

**`habits.json`** — three habits and their completions.

```jsonc
{
  "today": "2026-09-06",
  "habits": [
    { "id": "h-pages", "title": "Morning pages", "frequency": { "times": 1, "per": "day" } },
    { "id": "h-run",   "title": "Run", "frequency": { "times": 1, "per": "day" }, "scheduleDays": [1, 3, 5] },
    { "id": "h-sugar", "title": "No sugar", "frequency": { "times": 3, "per": "week" } }
  ],
  "completions": {
    "h-pages": ["2026-08-26","2026-08-27","2026-08-28","2026-08-29","2026-08-30","2026-08-31",
                "2026-09-01","2026-09-02","2026-09-03","2026-09-04","2026-09-05"],
    "h-run":   ["2026-08-31","2026-09-02","2026-09-04"],
    "h-sugar": ["2026-08-24","2026-08-26","2026-08-28",  "2026-08-31","2026-09-02","2026-09-04"]
  },
  "expected": {
    "h-pages": { "current": 11, "best": 11, "todayGrace": true },
    "h-run":   { "current": 3,  "best": 3 },
    "h-sugar": { "currentWeeks": 2, "bestWeeks": 2 }
  }
}
```

**`score.json`** — Loop strength score (RESEARCH §5.2). `m = 0.5^(sqrt(freq)/13)`.

| Habit | freq | multiplier `m` | Days done from zero | Expected score (`1 − m^n`) |
|---|---|---|---|---|
| daily | 1 | 0.948078 | 1 | 0.0519 (5 %) |
| daily | 1 | 0.948078 | 7 | 0.3115 (31 %) |
| daily | 1 | 0.948078 | 13 | 0.5000 (50 %) — half-life |
| daily | 1 | 0.948078 | 26 | 0.7500 (75 %) |
| daily | 1 | 0.948078 | 39 | 0.8750 (88 %) |
| 3×/week | 3/7 | 0.965697 | 13 | 0.3648 (36 %) |

Plus the decay case: daily habit at score 0.75, then 13 missed scheduled days → `0.75 × 0.948078^13 = 0.375`. Skipped (unscheduled) days leave the score unchanged; a `frozen: true` completion satisfies the streak walk but contributes `checkmark = 0` to the score.

**`recurrence.json`** — the thirteen golden rows (IMPLEMENTATION-PROMPT §6.4, ARCHITECTURE §5.4). Rules are stored as `Recurrence` **objects** — `{kind, interval, days, day, month, anchor, mode}` — never as RRULE strings: RRULE is an export format only and `rrule` is not a dependency (DECISIONS D8, prompt §2.1). `base` is the instance's `when` in `fixed` mode and the completion dayKey in `afterCompletion` mode; the engine returns the next occurrence **strictly after** `base`.

| # | Rule | Mode | base | expected next | then |
|---|---|---|---|---|---|
| R1 | `{kind:"daily", interval:1}` | fixed | 2026-09-06 | 2026-09-07 | — |
| R2 | `{kind:"weekdays"}` | fixed | 2026-09-04 (Fri) | 2026-09-07 (Mon) | 2026-09-08 |
| R3 | `{kind:"weekly", interval:1, days:[1,3,5], anchor:"2026-09-06"}` | fixed | 2026-09-06 (Sun) | 2026-09-07 | 2026-09-09 |
| R4 | `{kind:"daily", interval:3}` | fixed | 2026-09-01 | 2026-09-04 | 2026-09-07 |
| R5 | `{kind:"daily", interval:3}` | afterCompletion, completed 2026-09-06 | 2026-09-06 | **2026-09-09** | contrast with R4 — the completion date, not `when`, is the base |
| R6 | `{kind:"monthly", interval:1, day:31}` | fixed | 2026-01-31 | **2026-02-28** | 2026-03-31, 2026-04-30 — **clamps from the stored day 31 and never drifts to the 28th** (prompt §0.2; GOAL criterion 5). RFC 5545 would skip February; Nocturne deliberately does not, and `toRRuleString` is lossy for exactly this pattern |
| R7 | `{kind:"monthly", interval:1, day:"last"}` | fixed | 2026-02-28 | 2026-03-31 | 2026-04-30 |
| R8 | `{kind:"yearly", month:2, day:29}` | fixed | 2024-02-29 | **2025-02-28** | 2026-02-28, 2027-02-28, **2028-02-29** — clamps in common years, restores on the leap year |
| R9 | `{kind:"weekly", interval:2, days:[0], anchor:"2026-09-06"}` | fixed | 2026-09-06 | 2026-09-20 | skips 09-13 (odd week) |
| R10 | `{kind:"weekly", interval:2, days:[1,4], anchor:"2026-09-07"}` | fixed | 2026-09-10 (Thu) | **2026-09-21** (Mon) | skips the week of 14 Sep |
| R11 | `{kind:"weekdays"}` | fixed | 2026-10-23 (Fri) | 2026-10-26 (Mon) | crosses the EU DST change of 2026-10-25 with no skip and no duplicate (`Europe/Berlin`) |
| R12 | `{kind:"daily", interval:1}` | fixed | 2026-03-28 | 2026-03-29 | DST *starts* in `Europe/Berlin` — still exactly one day |
| R13 | `{kind:"weekly", interval:1, days:[0], anchor:"2026-09-07"}`, `when` 09-07, completed late on 09-09 | fixed | 2026-09-07 | **2026-09-13** | fixed mode ignores the completion date; `[0]` is Sunday, so the next occurrence strictly after Mon 2026-09-07 is Sun 2026-09-13 |

**Deliberately absent: `COUNT` and `UNTIL`.** Bounded series are not representable in the `Recurrence` union (ARCHITECTURE §4, prompt §5) and are out of scope for v1 — a series runs until the entry is deleted. They belong to the 🔮 RRULE *import* adapter in PLAN Phase 6 and get their own rows if that is ever built. No test may assert a `null` "series ends" result against the v1 engine.

**Reminder shift.** `shiftReminder(atMs, fromDay, toDay)` moves a reminder by exactly `daysBetween(fromDay, toDay)` days while preserving the **local wall-clock time**: a 17:00 reminder shifted across the 2026-10-25 `Europe/Berlin` boundary is still 17:00 local, not 16:00.

**`quickadd.json`** — reference time 2026-09-06T10:00 (a **Sunday**); the twelve rows of IMPLEMENTATION-PROMPT §6.3. Recurrence is the parsed `Recurrence` object, not an RRULE string. There is no project token: `#tag` is the only classifier (projects are a GOAL.md §6 non-goal).

| Input | title | when | time | recurrence | tags | evening |
|---|---|---|---|---|---|---|
| `call mom tomorrow 5pm` | `call mom` | 2026-09-07 | 17:00 | — | `[]` | false |
| `renew passport fri` | `renew passport` | 2026-09-11 | — | — | `[]` | false |
| `gym every weekday #health` | `gym` | 2026-09-07 | — | `{kind:"weekdays", mode:"fixed"}` | `["health"]` | false |
| `water plants every 3 days` | `water plants` | 2026-09-06 | — | `{kind:"daily", interval:3, mode:"fixed"}` | `[]` | false |
| `read 20 pages tonight` | `read 20 pages` | 2026-09-06 | — | — | `[]` | **true** ("tonight" ⇒ This Evening; the time is discarded) |
| `pay rent every month on the 1st` | `pay rent` | 2026-10-01 | — | `{kind:"monthly", interval:1, day:1, mode:"fixed"}` | `[]` | false |
| `weekly review every monday 10:00` | `weekly review` | 2026-09-07 | 10:00 | `{kind:"weekly", interval:1, days:[1], anchor:"2026-09-07", mode:"fixed"}` | `[]` | false |
| `Buy 3 lemons` | `Buy 3 lemons` | — | — | — | `[]` | false (a bare number is not a date) |
| `Meet at 5` | `Meet at 5` | — | — | — | `[]` | false (ambiguous "5" with no day and no am/pm stays in the title) |
| `Draft README #work #writing` | `Draft README` | — | — | — | `["work","writing"]` | false |
| `every` | `every` | — | — | — | `[]` | false (no unit → no chip, no red) |
| `email@home and C# notes` | unchanged | — | — | — | `[]` | false (`#`/`@` inside a word is not a tag) |

Plus the §6.3 worked example, parsed at 2026-09-06T20:10: `Call mom tomorrow 17:00 every week #family` → title `Call mom`, `when` 2026-09-07, `reminderAt` 2026-09-07T17:00 local, `{kind:"weekly", interval:1, days:[1], anchor:"2026-09-07", mode:"fixed"}` (days filled from `weekdayOf("2026-09-07")` = **1, Monday**), tag `family`, chips `TOMORROW 17:00` / `EVERY WEEK` / `#FAMILY`. **Parse must complete in under 50 ms.**

**`ordering.json`** — `fractional-indexing` 4.0.0 (CC0) canonical values: `between(null,null) = "a0"`, `between("a0",null) = "a1"`, `between(null,"a0") = "Zz"`, `between("a0","a1") = "a0V"`; renumber triggers when any key length > 40.

**`merge.json`** — two devices, three tables (see §3.7 for the cases).

**`backup-v1.json`** — a `dexie-export-import` blob with 12 entries, 3 habits, 40 completions, `meta.revision = 7`, `meta.lastSyncAt`; used by import, merge, Gist and Drive tests. **`backup-v0-legacy.json`** — same shape without `deletedAt` fields to prove import tolerates older exports.

**`colophon.json`** — the exact colophon copy (IMPLEMENTATION-PROMPT §3.8 E and §6.6; DESIGN §8.5). **Four typeset lines**, asserted verbatim — not one run-on sentence:

```jsonc
{
  "issue249": {
    "input": { "issueNo": 249, "closedAt": "21:14", "entries": 7, "streak": 12, "longest": 31 },
    "lines": ["Issue No. 249",
              "Closed at 21:14. Seven entries.",
              "Streak 12 days. Longest 31.",
              "Set in Bricolage Grotesque & Geist."]
  },
  "issue1": {
    "input": { "issueNo": 1, "closedAt": "18:40", "entries": 3, "streak": 1, "longest": 1 },
    "lines": ["Issue No. 1",
              "Closed. Three entries.",
              "Streak 1 day.",
              "Set in Bricolage Grotesque & Geist."]
  }
}
```

Issue No. 1 omits the time and the `Longest` clause. Singular forms are `One entry.` and `Streak 1 day.`; counts up to twelve are words (`One`…`Twelve`), thirteen to ninety-nine are words too (`Twenty-one entries.`), and **from 100 upwards numerals** (`100 entries.`).

---

## 3. Unit tests — `src/engine` (Given / When / Then)

### 3.1 `daykey.ts`

- **DK-1** Given rollover hour 3 and local time 2026-09-07T02:59 → `dayKey()` returns `2026-09-06`; at 03:00 returns `2026-09-07`.
- **DK-2** Given rollover hour 0 → `dayKey()` equals the plain local calendar date for every hour of 2026-09-06 (property test over 24 values).
- **DK-3** Given rollover hour 3, TZ `Europe/Berlin`, 2026-10-25T02:30 (the repeated hour) → returns `2026-10-24` both times the wall clock reads 02:30 (no double-day, no skipped day).
- **DK-4** `issueNumber(dayKey, firstIssueDay)` takes **two** arguments (prompt §0.2, §6.1). With `firstIssueDay = "2026-01-01"`: `("2026-09-06") = 249`, `("2026-01-01") = 1`, `("2026-12-31") = 365`, `("2028-12-31") = 366`, `("2028-03-01") = 61`. With `firstIssueDay = "2026-09-06"` the same day reads `No. 1` — the first-open case, and the reason day-of-year is *not* the rule.
- **DK-5** `runningHead("2026-09-06") = "SUN 06 SEP"` regardless of process locale (`Intl` locale `de-DE` still yields English abbreviations — the running head format is fixed; only the greeting date uses the user locale).
- **DK-6** `greeting(hour)` has exactly **three** branches: 5–11 "Good morning", 12–16 "Good afternoon", 17–04 "Good evening" — never "Good night", and never a fourth late-night variant (prompt §6.1). Assert all 24 hours. With `evening-hour = 21`, `isEvening(21:00) = true`, `(20:59) = false`, `(02:00) = true` (before the 03:00 rollover).

### 3.2 `streaks.ts`

- **ST-1** Given `habits.json` `h-pages` and today 2026-09-06 (not yet done) → `currentStreak = 11` (today is grace).
- **ST-2** Same, but today 2026-09-07 and 09-06 never completed → `currentStreak = 0`.
- **ST-3** `h-run` (Mon/Wed/Fri) with today Sun 2026-09-06 → `3` (unscheduled days skipped, not broken).
- **ST-4** `h-run`, today Mon 2026-09-07, not done → still `3` (scheduled today, grace). Today Wed 2026-09-09 with Mon missed → `0`.
- **ST-5** `bestStreak(["2026-09-01","2026-09-02","2026-09-04","2026-09-05","2026-09-06"]) = 3`; unsorted input gives the same; empty → `0`; duplicates ignored.
- **ST-6** `h-sugar` (3×/week) with ISO weeks 35 (Aug 24–30) and 36 (Aug 31–Sep 6) each holding 3 completions → `currentWeeks = 2`; current week counts only if `>= 3`; a week with 2 → breaks; today's week is grace.
- **ST-7** Property: a streak never exceeds the number of completions; `currentStreak <= bestStreak` for random completion sets (fast-check, 200 runs).
- **ST-8** Streak freeze: completion `{ value: 0, frozen: true }` on 2026-09-03 in an otherwise daily run keeps the streak (`11`), while `strength()` treats that day as `checkmark = 0`.
- **ST-9** Walk cap: 3,660 iterations max — a habit with 20 years of daily completions returns in < 5 ms (perf assertion inside the unit test).

### 3.3 `strength.ts`

- **SC-1** `multiplier(1) ≈ 0.948078` (±1e-6); `multiplier(3/7) ≈ 0.965697`.
- **SC-2** Every row of `score.json` within ±0.0005.
- **SC-3** Decay row: `0.75 → 0.375` after 13 missed scheduled days.
- **SC-4** Unscheduled day for `h-run` leaves the score byte-identical.
- **SC-5** Output is clamped to `[0, 1]` and the ring value is `Math.round(score * 100)` — `0.995 → 100`, `0.004 → 0`.

### 3.4 `recurrence.ts`

- **RC-1…RC-13** `nextOccurrence(rule, base)` against every row of the `recurrence.json` table. One engine, one run — there is no second backend and no `describe.each`.
- **RC-14** Property test: 1,000 random (rule, base) pairs (seeded PRNG) all satisfy `next > base`, and for `weekly` / `weekdays` `weekdayOf(next)` is inside the allowed set; `monthly` never returns a day-of-month greater than the stored `day`.
- **RC-15** Export only: `toRRuleString(r, dtstart)` emits `FREQ=DAILY;INTERVAL=3`, `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`, `FREQ=MONTHLY;BYMONTHDAY=31`, `FREQ=MONTHLY;BYMONTHDAY=-1` and `FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29` for the six patterns. It is **one-way in v1** — there is no `fromRRule()` to test — and the monthly-day-31 string is asserted to carry the documented lossiness comment case (RFC 5545 skips short months where Nocturne clamps, R6).
- **RC-16** Floating-time guard: `nextOccurrence()` never returns a date one day off when the process TZ is `Pacific/Kiritimati` (+14) or `Pacific/Pago_Pago` (−11) — run R1 under both via `TZDate`.
- **RC-17** Describe strings match the sheet copy exactly: `Every day` · `Every 3 days` · `Every weekday` · `Every Monday and Thursday` · `Every 2 weeks on Sunday` · `Monthly on the 31st` · `Monthly on the last day` · `Every year on 29 February`.
- **RC-18** `spawnNext(done, completedOn, nowMs, newId)` produces exactly one new **open** entry with a fresh `id`, the same `recurrence`, `tags`, `notes` and `title`, a reset `checklist` (every item `done: false`), `reminderAt` shifted by the same day delta with the local wall-clock time preserved, `seriesId = done.seriesId ?? done.id`, `instanceNo = previous + 1`, and `bucket` = `"today"` when the next `when` is the completion day, else `"upcoming"`. The struck instance keeps `completedAt` and has its `recurrence` cleared — only the open, template-bearing instance carries the rule (§5 data model). A non-recurring entry returns `null`.

### 3.5 `quickadd.ts`

- **QA-1…QA-12** the `quickadd.json` table (twelve rows); `spans` output contains the exact `[start, end)` indices of each recognised chip so the Composer can render them inline (assert `text.slice(start, end)` equals the chip label source).
- **QA-13** Discarding a chip (`parse(text, { ignore: ["when"] })`) keeps the text in the title and drops only that meaning; the row `email@home and C# notes` already proves that `#` and `@` inside a word are not tags.
- **QA-14** Shift+Enter path: `parse(text, { evening: true })` sets `evening = true` even without "tonight".
- **QA-15** Idempotence: parsing the returned `title` again yields no chips (the stripped title contains no residual date words — guards against "call mom" → still matching "mom" as a month, which chrono does not do but the grammar might).
- **QA-16** Never file a blank entry: an input that parses to an empty title keeps the **whole string** as the title and drops every chip (prompt §6.3 edge rules). `tonight` sets `when = today` **and** `evening = true`; a time with no date attaches to `when ?? today` and, if that instant has passed, `forwardDate` moves it to tomorrow — the chip shows the resolved day.

### 3.6 `ordering.ts`

- **OR-1** Canonical `fractional-indexing` values from `ordering.json`.
- **OR-2** Inserting 1,000 times between the same two neighbours never throws and `renumberIfNeeded()` fires exactly when a key exceeds 40 chars, producing keys of length ≤ 3 for a 7-item list.
- **OR-3** Reorder of `[a,b,c,d]` moving `d` to index 1 changes exactly one record's `order` and the resulting sort is `[a,d,b,c]`.
- **OR-4** Folio numbers are derived from sort position, not stored: after OR-3, `folios() = ["01","02","03","04"]` and done entries get `"—"` and sink to the foot of their section.

### 3.7 `merge.ts`

- **MG-1** Remote record with newer `updatedAt` replaces local; older is ignored.
- **MG-2** Local tombstone (`deletedAt`) beats an older remote live record; a newer remote edit resurrects it only if `remote.updatedAt > local.deletedAt`.
- **MG-3** Tombstones older than 90 days are purged after merge; 89 days are kept.
- **MG-4** Completions: `[habitId+dayKey]` union — both devices completing "Run" on 2026-09-04 yields one row; different `value`s keep the max.
- **MG-5** `meta.revision` becomes `max(local, remote) + 1`; `lastSyncAt` is the injected `now`.
- **MG-6** Merging `backup-v0-legacy.json` (no `deletedAt` keys) does not throw and treats missing as live.

### 3.8 Day gauge (in `daykey.ts`), `colophon.ts`, `scale.ts`, `notifications-plan.ts`

- **GA-1** Rollover 03:00: at 03:00 → `0`; at 15:00 → `0.5`; at 02:59 next day → `0.9993`; `ariaValueText(15:00) = "12 hours until rollover"`, `(02:30) = "30 minutes until rollover"`.
- **CO-1** `colophon.json`: all four lines of each case compared **exactly**, in order — `Issue No. 249` / `Closed at 21:14. Seven entries.` / `Streak 12 days. Longest 31.` / `Set in Bricolage Grotesque & Geist.` `Streak 1 day` is singular; Issue No. 1 omits the time and the `Longest` clause; counts ≥ 100 use numerals.
- **CO-2** `shouldPrintColophon(tasks)` is true only when every Today **and** This Evening entry is `done`/`cancelled` and there is at least one done; an empty day never prints.
- **SL-1** `scaleHz(n)` is **0-based** (prompt §6.8): 0→C4 261.63 Hz, 1→D4 293.66, 2→E4 329.63, 3→G4 392.00, 4→A4 440.00, 5→C5 523.25, 6→D5 587.33, 10→A5 880.00 (±0.01 Hz). `n` = strikes so far today: it starts at 0, resets at rollover, and an undo decrements it — so after undoing the first strike the next strike plays C4 again.
- **RM-1** `planNotifications(entries, settings, now)` returns one `Planned` per open, undeleted entry whose `reminderAt` is in the future **and within 14 days**: `{ id: notifId(entry.id), at, title, body, extra: { entryId, kind: "entry" } }`. `notifId` is FNV-1a 32-bit masked to a positive 31-bit int and **never 0 or 1** (id 1 is reserved for the daily review); 10,000 generated ids stay in range and no two entry ids collide. With `privateReminders: true` the title is `Nocturne` and the body `An entry is due`.
- **RM-2** The daily review payload is `{ id: 1, title: "Evening Edition", body: "3 entries still open.", schedule: { on: { hour: 21, minute: 0 }, allowWhileIdle: true }, extra: { kind: "review" }, channelId: "reminders" }` — **`on:` only, never `at` + `repeats`**, which would degrade to an inexact `setRepeating` (prompt §8.2). `openCount 0` → `"Nothing left open."`; `1` → `"1 entry still open."`. Disabling the review cancels id 1.
- **RM-3** `diffSchedules(desired, pending)` returns `{ cancel, schedule }` such that `pending ∪ schedule − cancel` equals exactly the reminders inside the next 14 days; reminders in the past are cancelled; an unchanged `at` is **not** re-scheduled (Doze budget); **id 1 is never cancelled by the diff** — only the review branch owns it.

### 3.9 Repository & migrations (`fake-indexeddb`)

- **DB-1** `repo.addEntry()` stamps `createdAt`, `updatedAt`, `order` (last in its `(bucket, when, evening)` group) and `status: "open"`; `repo.deleteEntry()` sets `deletedAt` and never calls `table.delete`. Every write bumps `meta.revision` exactly once per logical operation.
- **DB-2** `liveQuery` for Today emits once per write, sorted by `order`, excluding tombstones and `done` entries only when the filter says so.
- **DB-3** Migration drill: while v1 is the only version, assert `db.verno === 1` and that an export header carries `"schema": 1`. The first schema bump (v1 → v2) must then run on `backup-v1.json` data without losing a row, with `db.verno === 2` — additive only, never dropping a table or a field an older export carries.
- **DB-4** `exportDB` → `importInto(overwriteValues: true)` round-trips `backup-v1.json` byte-for-byte on the tables (ignoring export header timestamps).
- **DB-5** `navigator.storage.persist` is called exactly once per session on the web platform and never on `Capacitor.isNativePlatform()`.

---

## 4. Component tests (Testing Library, jsdom)

Setup: `src/test/setup.ts` polyfills `matchMedia` (returns `prefers-reduced-motion: reduce` = true so Motion renders instantly), `ResizeObserver`, `IntersectionObserver`, `navigator.vibrate`, and stubs `@capacitor/haptics` with `vi.mock`.

- **C-Entry-1** Renders `<li>` containing a button labelled `"Mark done, entry 3, Draft the Nocturne README, overdue Friday"`; folio `03` is visible, the button's box is ≥ 44×44 (jsdom: assert the CSS class carries `min-h-11 min-w-11`, geometry is asserted in e2e).
- **C-Entry-2** Clicking the folio calls `onStrike(id)` once; the strike announces `"Closed at 21:14"` in the `aria-live="polite"` region.
- **C-Entry-3** Done entry shows `—` folio, `closed 21:14`, title has `aria-disabled` false but class `opacity-40`, and no `OVERDUE` text.
- **C-Entry-4** Overdue entry shows the word `OVERDUE FRI` and the vermilion class; at most one element with `text-accent-2` per rendered list (assert on a 5-entry list with two overdue → the second renders muted `OVERDUE` text without the vermilion token, per the "one vermilion per screen" rule).
- **C-Composer-1** Typing `call mom tomorrow 5pm` renders chips `TOMORROW` and `17:00`, the future folio `05` in the margin; pressing Enter calls `onFile()` with the parsed task and keeps focus in the input with empty value.
- **C-Composer-2** Shift+Enter files with `evening: true`; empty Enter calls `onClose()`.
- **C-Composer-3** Clicking the `TOMORROW` chip removes it, leaves the text, and the next parse ignores `when`.
- **C-Composer-4** While `undo` prop is set, the hint line reads `Entry 03 closed — Undo` and the button calls `onUndo`; after 5 s (fake timers) it reverts.
- **C-DigitRoll-1** `value={3}` then `value={4}` renders both digits during transition and only `4` after; `aria-hidden` on columns; visually-hidden twin reads `4 of 7`.
- **C-Masthead-1** With `today="2026-09-06"` renders numeral `06`, month `September`, `No. 249`, `SUNDAY`, counter `3 / 7`; `evening` prop swaps the running head to `EVENING EDITION`.
- **C-Sheet-1** Opening traps focus (Tab from the last control returns to the grabber), `Escape` closes and returns focus to the entry title button; `role="dialog"` with `aria-labelledby` the headline.
- **C-Sheet-2** MonoTable rows: `REPEAT` shows `Every weekday`; `REMINDER 17:00 ¹` footnote appears only when `exactAlarm === "denied"` and the footnote link calls `onOpenExactAlarmSettings`.
- **C-Sheet-3** `Delete the entry` → inline `Delete? — Yes / Keep`; `Yes` calls `onDelete`, `Keep` restores; Delete button is the only element with the vermilion class in the sheet.
- **C-Colophon-1** Renders the `colophon.json` sentence for `{ issue: 249, closedAt: "21:14", entries: 7, streak: 12 }`; standfirst input labelled `A line for the record`; Enter calls `onStandfirst(text)`; blank Enter does nothing and does not nag.
- **C-Ledger-1** `LedgerLine` for `h-pages` shows `11 · 11`, ring at `strength` %, tapping calls `onComplete(habitId, today)`; long-press (pointer down 250 ms via fake timers) calls `onOpen`.
- **C-Heatmap-1** 12×7 cells; done dots equal completions count in range; today's cell shows the day-of-month numeral `06`.
- **C-Footnote-1** `kind="warning"` uses foil, `kind="error"` vermilion, `kind="info"` muted; each renders a superscript mark matching its `n`.
- **C-Theme-1** `ThemeProvider` sets `data-theme="proof"` when the setting is `proof`, removes the attribute for `auto`, and updates `<meta name="theme-color">` to `#F5F1E8` / `#0A1024`.
- **C-Keyboard-1** With three entries mounted: `j` moves selection to entry 2, `x` strikes it, `w` opens the When sheet, `e` opens detail, `n` focuses the composer, `[`/`]` switch tabs, `Alt+ArrowDown` reorders (calls `onReorder` with the new order).

---

## 5. End-to-end (Playwright)

`playwright.config.ts`: projects `desktop-chromium` (1280×800) and `pixel-7` (`devices["Pixel 7"]`, `hasTouch: true`); `baseURL` from `vite preview --base /nocturne/` so sub-path bugs surface (HOSTING pitfall 2); `timezoneId: "Asia/Kolkata"`; `colorScheme: "dark"`; retries 1 on CI; trace `on-first-retry`.

Seeding: `e2e/fixtures/seed.ts` navigates to `/#/colophon`, uses the app's own **Import JSON** input with `backup-v1.json`, then `page.clock.install(...)`. No direct IndexedDB poking — the import path is itself under test.

### 5.1 First open (`today.spec.ts`)

- **E2E-1** Given a fresh origin, When the app loads, Then the masthead reads `No. 1`, greeting `Welcome to your first issue.`, three sample entries with the teaching titles, counter `0 / 3`, and **no** permission prompt or overlay.
- **E2E-2** Striking all three prints the colophon `Issue No. 1 closed. Three entries. Streak 1 day.` and the standfirst input appears; on web no notification prompt is shown (that is Android-only, §12).

### 5.2 Front page & composer

- **E2E-3** Seeded day: sections `I — TODAY` and `II — THIS EVENING` render; folios are `01…` per section; done entries at the foot with `—`.
- **E2E-4** Composer: type `call mom tomorrow 5pm #family`, chips appear, Enter files it; the new entry appears in **Upcoming** (tomorrow) not Today; Undo foot not shown for adds.
- **E2E-5** `read 20 pages tonight` files into `II — THIS EVENING` with a Re-set animation; counter rolls `3 / 7 → 3 / 8`.
- **E2E-6** Strike via folio tap: title dims, `closed 21:14` meta appears, counter `4 / 7`, entry re-sets to the foot; `Undo` within 5 s restores everything including the original folio.
- **E2E-7** Closing every entry prints the colophon with the seeded values; `Share the issue` on desktop triggers a download named `nocturne-issue-249.png` (assert `download.suggestedFilename()`), image is 1080×1920 (decode via `sharp` in the test).

### 5.3 Gestures (`gestures.spec.ts`, pixel-7 project only)

- **E2E-8** Swipe right 100 px on entry 02 (pointer sequence over 120 ms) → strike; swipe 60 px → springs back, no strike.
- **E2E-9** Swipe left 100 px → When sheet opens; choose `Tomorrow` → entry moves to Upcoming and Today counter rolls down.
- **E2E-10** Press-and-hold 300 ms on entry 01 → lifted state (`--surface` background, radius 12 — assert computed style), drag 70 px down → drop → order `[02, 01, 03]`, folios renumbered, persisted after reload.
- **E2E-11** Vertical pan of 40 px that starts within 200 ms scrolls the list (no lift, no strike): assert `scrollTop > 0` and status unchanged.
- **E2E-12** Horizontal swipe starting at x = 8 px (inside the 24 px edge zone) does nothing — reserved for system back.

### 5.4 Ledger, Issues, Colophon settings

- **E2E-13** Tap `Morning pages` → ring extends, streak rolls `11 → 12`, a completion for today exists after reload; tap again → no double completion (toggle off, streak back to 11).
- **E2E-14** Back Issues lists `No. 248 · SAT 05 SEP · 6 / 6 · closed 22:03` with its standfirst; tapping opens the frozen Front Page with colophon and no composer.
- **E2E-15** Colophon › Theme `Proof` → `html[data-theme="proof"]`, `--bg` computed `#F5F1E8`, grain overlay opacity `0`; reload keeps it; `Auto` removes the attribute and follows `colorScheme` emulation.
- **E2E-16** Evening hour set to `10:00` while clock is 21:14 → ground is `#0F172E` and running head `EVENING EDITION`; set to `22:00` → back to `#0A1024` (Evening Turn 480 ms — wait for `transitionend`).
- **E2E-17** Day rollover while open: `page.clock.runFor(...)` past 03:00 → masthead rolls to `No. 250`, `MON 07 SEP`, counter `0 / n`, Today shows only tasks whose `when` is 2026-09-07, yesterday's issue appears in Back Issues as `open` (not closed).

### 5.5 Backup (`backup.spec.ts`)

- **E2E-18** Export JSON downloads `nocturne-2026-09-06.json`; the file parses, its header reads `{"format":"nocturne-backup","version":1,"schema":1,"app":"…","revision":7,"exportedAt":…}` (prompt §5), and it contains 12 entries / 3 habits / 40 completions.
- **E2E-19** Import the same file with `overwriteValues` → progress line `Importing 55 / 55`, then `Last printed just now`.
- **E2E-20** Gist path with `page.route("https://api.github.com/gists*")` mocked: first backup `POST` body has `public: false`, file `nocturne.json`, headers `Authorization: Bearer …`, `X-GitHub-Api-Version: 2022-11-28`; second backup is `PATCH /gists/{id}`; restore handles `truncated: true` by fetching `raw_url` (mock both).
- **E2E-21** Gist 401 → row shows `Failed 21:14 — Retry` in vermilion; token never appears in console or DOM (`page.on("console")` assert; `page.content()` does not contain the token).
- **E2E-22** (**someday — skipped until Drive is actually built, §7.2/V-15; the CSP stays GitHub-only until then**) Drive path mocked at `https://www.googleapis.com/**`: list → create (multipart with `parents: ["appDataFolder"]`) → update (`PATCH …?uploadType=media`) → download (`alt=media`); the GIS script is stubbed via `page.addInitScript` so no real Google call happens.
- **E2E-23** "Session only" PAT toggle: token is absent from `localStorage` and from `@capacitor/preferences` mock after reload.

### 5.6 Keyboard & find (`keyboard.spec.ts`, desktop)

- **E2E-24** Full keyboard run: `n` → type → Enter → `j` `j` `x` → `[` `]` → `Ctrl+K` → type `README` → Enter opens the sheet → `Escape` returns focus to the entry.

---

## 6. Offline, PWA & persistence tests (`offline.spec.ts`)

- **OF-1** Load once online, wait for `navigator.serviceWorker.ready`, `context.setOffline(true)`, reload → app boots, masthead renders, fonts are the self-hosted Bricolage/Geist (`document.fonts.check('300 96px "Bricolage Grotesque Variable"')` true), no request to `fonts.googleapis.com` ever (assert on `page.on("request")` over the whole test).
- **OF-2** Offline: add an entry, strike one, complete a habit → all persist after a reload while still offline.
- **OF-3** Offline Gist backup → row shows `Offline — will retry` in muted (not vermilion), no exception; back online → automatic retry succeeds (mocked).
- **OF-4** `manifest.webmanifest` served at `/nocturne/manifest.webmanifest` with `start_url` and `scope` `/nocturne/`, `display: standalone`, `theme_color: #0A1024`, icons 192/512 + maskable; SW registered at `/nocturne/sw.js` (scope check).
- **OF-5** New build available → the update prompt is the mono footnote `² A new edition is ready — Reload` (never a toast), and reload activates the new SW (`skipWaiting` path).
- **OF-6** `VITE_PLATFORM=android` build: `dist/` contains **no** `sw.js` and `registerSW` is not called (Capacitor pitfall 8 in ANDROID-PACKAGING.md).
- **OF-7** Storage error state: `page.addInitScript` deletes `indexedDB` → the vermilion footnote `¹ Storage is unavailable in this browser; the issue will not be saved.` renders and the app still allows viewing the sample issue without crashing.

---

## 7. Visual tests against the design tokens (`e2e/visual/*.spec.ts`)

Baselines are captured on `ubuntu-24.04` Chromium only (`snapshotPathTemplate` includes `{platform}`; Windows-local runs use `--ignore-snapshots` or Docker `mcr.microsoft.com/playwright`). Threshold `maxDiffPixelRatio: 0.01`, `animations: "disabled"`, `caret: "hide"`, clock frozen at 21:14, fonts awaited via `document.fonts.ready`.

| Snapshot | Viewport | State | Named in DESIGN |
|---|---|---|---|
| `front-page-phone.png` | 390×844 | seeded, Night | §9.1 |
| `front-page-desktop.png` | 1280×800 | seeded, Night, rail + reading column + right margin caption | §9.1 |
| `front-page-evening.png` | 390×844 | evening hour reached | §9.1 Evening |
| `front-page-proof.png` | 390×844 | `data-theme="proof"` | §4.2 |
| `colophon-printed.png` | 390×844 | all entries closed, standfirst empty | §8.5 |
| `entry-sheet.png` | 390×844 | detail sheet open with exact-alarm footnote | §9.5 |
| `ledger-expanded.png` | 390×844 | `Morning pages` expanded with 12-week grid | §9.3 |
| `back-issues.png` | 390×844 | seeded month | §9.4 |
| `first-open.png` | 390×844 | Issue No. 1 | §9.8 |
| `reduced-motion.png` | 390×844 | `reducedMotion: "reduce"`, mid-strike frame shows instant strike | §7.2 |
| `text-130.png` | 390×844 | browser font size 130 % (`page.emulateMedia` + `document.documentElement.style.fontSize = "130%"`) | §13 |

**Token assertions** (same spec, no pixels involved — these fail with a readable message):

- `getComputedStyle(html).getPropertyValue("--bg")` is `#0A1024` (Night) / `#F5F1E8` (Proof); **every token name declared in `src/styles/tokens.css` resolves to a non-empty value in both themes** — read the names out of the stylesheet at test time (`[...sheet.cssRules]` → `--*` custom properties) rather than hard-coding a count, so adding a token can never break the assertion. DESIGN §15 / prompt §3.3 declare roughly seventy.
- Entry row `min-height ≥ 56px`; folio button box ≥ 44×44; footer tab height ≥ 48; chip hit area ≥ 44.
- Hairlines: `border-bottom-width` of entries is exactly `1px` at `deviceScaleFactor` 1, 2 and 2.625 (Pixel 7) — never 0.5.
- No element on the Front Page has a `box-shadow` at rest; exactly the lifted entry has `--shadow-2` during E2E-10.
- At most one element per page with computed color `rgb(236, 109, 88)` (`--accent-2`) on the seeded Front Page.
- No `background-image` gradients on any surface except the day-gauge rule and the desktop margin `mask-image`.
- Fonts: computed `font-family` of the numeral starts with `"Bricolage Grotesque Variable"`, of titles with `"Geist Variable"`, of every folio/time/counter with `"Geist Mono Variable"`; `font-variation-settings` on the numeral includes `"opsz" 96`.
- `--grain-opacity` is `0.035` in Night and `0` in Proof and under `prefers-reduced-transparency`.
- Every animated element's transition duration is one of `120ms | 240ms | 480ms` (scan `getComputedStyle(el).transitionDuration` across the page) — catches ad-hoc timings.
- Masthead numeral `font-size` on 390 px width is `109.2px` (`28vw`) and clamps to `112px` at ≥ 400 px and `88px` at ≤ 314 px.

The preview file is also snapshotted (`design/preview.html` at 390 and 1280) so a drift between preview and app is visible side-by-side in the report (D9.3 "Preview is the spec").

---

## 8. Performance tests and budgets

Measured on `pixel-7` with `cpuThrottlingRate: 4` and "Slow 4G" via CDP (`Network.emulateNetworkConditions`) unless stated; Lighthouse via `lighthouserc.json` with `assert` budgets.

| Metric | Budget | How |
|---|---|---|
| Initial JS (gzip) | ≤ 180 KB; total initial transfer incl. fonts ≤ 520 KB | `vite build --mode ci` + `size-limit` on `dist/assets/*.js`; fonts ≤ 350 KB (DESIGN §16) |
| Fonts | 3 woff2 files, latin subset, `font-display: swap` | assert request count and `Content-Length` in `perf/fonts.spec.ts` |
| LCP (running head text) | ≤ 1.5 s mobile throttled, ≤ 0.8 s desktop | Lighthouse `largest-contentful-paint` |
| TTI / TBT | TTI ≤ 3.0 s, TBT ≤ 200 ms mobile | Lighthouse |
| CLS | ≤ 0.02 (masthead roll is transform-only; fonts must not reflow the numeral — `size-adjust` on the fallback face) | Lighthouse + `layout-shift` PerformanceObserver in test |
| Masthead roll | 480 ms animation with ≥ 55 fps (≤ 3 dropped frames) | CDP `Tracing` → count `DroppedFrame` events |
| Strike → counter roll latency | ≤ 100 ms from `pointerup` to DigitRoll start | `performance.mark` pairs exposed on `window.__nocturne.perf` in dev/test builds |
| Reorder drag | ≥ 55 fps over a 1 s drag on a 50-entry list | tracing |
| Dexie Today query | **< 10 ms for 5,000 entries** (ARCHITECTURE §11, prompt §10) | unit perf test on fake-indexeddb + e2e on real IndexedDB with `performance.now()`, using the `[bucket+when]` index plus the overdue `IDBKeyRange` |
| Import 10,000 records | ≤ 3 s; UI stays responsive (progress line updates ≥ 5×) | `backup.spec.ts` with a generated 10k fixture |
| Export 10,000 records | ≤ 2 s | same |
| List with 1,000 entries | Front Page render ≤ 300 ms; virtualisation engages > 200 entries (DOM `li` count ≤ 60) | `perf/list.spec.ts` |
| Memory | Heap after 30 min of simulated use (500 strikes + 100 adds) ≤ 80 MB, no growth > 10 % between two GCs | CDP `HeapProfiler.collectGarbage` + `Performance.getMetrics` |
| Grain overlay | Paint cost ≤ 2 ms/frame on scroll (single fixed pseudo-element) | tracing `Paint` events |
| APK size | ≤ 6 MB (no native `.so`, no images beyond icons) | `android-release.yml` "Collect output" step prints size; assert in workflow with `stat -c %s` |
| Lighthouse PWA/installability | `installable-manifest` pass, `service-worker` pass, a11y ≥ 95, best-practices ≥ 95 | LHCI assertions |

Budget violations fail `test:perf` and the pre-tag checklist, not the Pages deploy.

---

## 9. Accessibility checks

Automated (`e2e/a11y.spec.ts`, `@axe-core/playwright`, tags `wcag2a wcag2aa wcag21aa`) on every screen in §7, Night and Proof, with zero `serious`/`critical` violations. Known-acceptable rule: `color-contrast` on elements marked `data-decorative="true"` (`--ink-faint` folios of done entries, hairlines) is excluded via `axe.exclude`.

Explicit checks beyond axe:

- **A-1** Contrast table: compute WCAG ratios in-test for every text token pair listed in DESIGN §4.1/§4.2 (ink/bg 16.7, muted/bg 7.8, accent/bg 11.1, accent-2/surface-2 5.0, Proof accent/bg 5.9 …) and assert `≥ 4.5`; fails if a token value is edited to a non-compliant hex.
- **A-2** Focus: Tab through the Front Page — every interactive element shows a `2px solid #F2D68A` outline with `outline-offset: 2px`; no `outline: none` anywhere without `:focus-visible` replacement.
- **A-3** Touch targets on `pixel-7`: every `button, a, [role=button], input` has `boundingBox ≥ 44×44` (the folio glyph is 11 px but its button is 44).
- **A-4** Screen-reader semantics: entries are `li > button[aria-label]`; strike announces via `aria-live="polite"`; DigitRoll columns `aria-hidden` with a visually-hidden twin; day gauge `role="progressbar"` with `aria-valuetext`; sheets `role="dialog" aria-modal="true"` with focus trap and return; margin words `aria-hidden`.
- **A-5** Reduced motion: `emulateMedia({ reducedMotion: "reduce" })` → no element has a running transform animation after load (`document.getAnimations().length === 0` 200 ms after `load`), digit changes are opacity swaps, colophon rule appears without `scaleX` animation; the in-app "Motion › Reduced" setting has the same effect without the media query.
- **A-6** Text scaling 130 %: no horizontal scrollbar, entry rows grow, only meta lines ellipsise, sheet remains dismissible.
- **A-7** Colour is never the only signal: overdue entries contain the text `OVERDUE`; done entries contain `closed HH:MM`; the Ledger missed state has no red and the ring alone is not the only indicator (streak `0 · 12` text present).
- **A-8** `<html lang="en">`; greeting date localised via `Intl` under `locale: "de-DE"` while the running head stays `SUN 06 SEP`.
- **A-9** Manual (before each tag): NVDA + Firefox on Windows through the Front Page, composer, sheet and colophon; TalkBack on the phone through the same; keyboard-only run of E2E-24.

---

## 10. Security / privacy checks (small, but they matter for a public repo)

- **P-1** No request leaves the origin on the Front Page, Ledger, Issues or Colophon screens without a backup configured (`page.on("request")` allow-list: own origin only).
- **P-2** CSP meta in `index.html` is exactly `connect-src 'self' https://api.github.com https://gist.githubusercontent.com; script-src 'self'; object-src 'none'; base-uri 'self'` (prompt §7.1) — the two GitHub origins and nothing else; no `unsafe-inline` scripts (styles allowed). Assert the tag verbatim and that the app still functions. The Google origins are added **only if Drive is actually built** (§7.2, V-15); shipping them now would widen the allow-list for a someday feature.
- **P-3** PAT storage: encrypted with WebCrypto AES-GCM on web (`localStorage` holds only ciphertext + iv; the key lives non-extractable in IndexedDB); on Android `@capacitor/preferences` mock receives ciphertext only.
- **P-4** `npm audit --audit-level=high` clean before every tag, and `npm audit` runs in CI as a warning. No dependency outside §2.1 of the implementation prompt appears in `package.json` — in particular **no `rrule`, no `howler`, no `gsap`, no `canvas-confetti`, and nothing that phones home** (prompt §2.1 "Explicitly not used"; day-1 item V-6).
- **P-5** Export file never contains tokens (`backup.spec.ts` greps the exported JSON for the mocked PAT).

---

## 11. Day-1 verification list (from RESEARCH §11–§12 "unverified"/"plausible")

Run these on the first day, before feature work (D9.1 "Day 1 = live"). Each has a pass condition and a fallback already decided in RESEARCH/DECISIONS.

| # | Claim to verify | How (concrete) | Pass | Fallback if it fails |
|---|---|---|---|---|
| V-1 | Fine-grained PAT UI exposes **Gists: Read & write** | Create a token at github.com/settings/personal-access-tokens/new; look under *Account permissions* | Permission listed; `POST /gists` from the app returns 201 | Accept classic PAT with `gist` scope; document it in Colophon copy |
| V-2 | Drive `drive.appdata` consent screen in **Production** shows no "unverified app" warning | Create the OAuth client, publish, run the web Drive flow once from `https://<owner>.github.io/nocturne/` | Consent screen without the warning interstitial | Keep Drive behind an "experimental" footnote; file/Gist remain the defaults |
| V-3 | `@capacitor/local-notifications` 8.3.1 `on:{hour,minute}` fires daily on the owner's Android 14/15/16 phone and survives reboot | `workflow_dispatch` debug APK; set daily review to now+3 min; wait; then reboot the phone and wait for the next day's trigger (§12 N-1…N-4) | Notification arrives within 1 min of the set time both times | Switch daily review to `at` + reschedule-on-resume; add the "Reminders not firing?" page early |
| V-4 | `changeExactNotificationSetting()` opens the system "Alarms & reminders" page and `checkExactNotificationSetting()` flips to `granted` after allowing | Tap the exact-alarm footnote in the sheet on the debug APK | Settings page opens; footnote disappears on return | Deep-link via `@capacitor/app` `openUrl` to `android.settings.REQUEST_SCHEDULE_EXACT_ALARM` intent through a 10-line Kotlin plugin |
| V-5 | `@dnd-kit/core` 6.3.1 + `sortable` 10.0.0 work with React 19.2 (Week Spread cross-day drag) | Spike branch: desktop drag between two day columns under `StrictMode` | No console errors, drop lands, no ghost overlay | `@atlaskit/pragmatic-drag-and-drop` 3.1.0 behind the `useCardDnd()` adapter |
| V-6 | `chrono-node` 2.10.1 parses the §6.3 table under Vite 8 / TS strict **as a lazy chunk**, and no banned dependency is present | `npm i chrono-node@2.10.1 && npm run build && npx vitest run quickadd`; then `npm ls rrule howler gsap canvas-confetti` | All twelve quick-add rows pass; `chrono` lands in its own chunk, not the initial bundle; the `npm ls` returns empty (the in-house recurrence engine is the only backend — DECISIONS D8) | Parse dates with a hand-rolled matcher for the six documented phrases and drop the lazy chunk |
| V-7 | Motion 13 `Reorder` works in Android System WebView with hold-to-lift while the parent scrolls | Debug APK: E2E-10/E2E-11 by hand on 50 entries | Lift after 250 ms, vertical pan scrolls, no stuck drags | Use dnd-kit `TouchSensor` for in-list reorder too |
| V-8 | `@fontsource-variable/bricolage-grotesque` `/full.css` carries `opsz` **and** `wdth`; `tnum` present | After install: inspect `node_modules/@fontsource-variable/bricolage-grotesque/full.css` for `font-stretch`/`font-variation-settings` ranges; `design/preview.html` numeral at `"opsz" 12` vs `96` renders differently | Both axes work; digits align | Fixed 0.62em digit columns (already required for DigitRoll); drop `wdth` |
| V-9 | Variable fonts + 1 px hairlines render cleanly in the phone's WebView at DPR 2.625 | Debug APK screenshot vs `front-page-phone.png` | Hairlines visible, no hinting artefacts on the 112 px numeral | Cap numeral at 96 px; hairline `transform: translateZ(0)` |
| V-10 | `SystemBars` is importable from `@capacitor/core` 8.5.1 and `env(safe-area-inset-*)` resolve in the WebView | `import { SystemBars } from "@capacitor/core"` compiles; debug APK shows the running head 8 px below the status bar | Insets non-zero on the phone | `insetsHandling` CSS-variable fallback from the plugin docs |
| V-11 | Predictive back on Android 14+/16 fires `@capacitor/app` `backButton` when a sheet is open | Debug APK: open a sheet, swipe back | Sheet closes; root back exits | `android:enableOnBackInvokedCallback="false"` on `<application>` |
| V-12 | `navigator.storage.persist()` resolves `true` on Chrome for the github.io origin after install | Console on the deployed site | `true` (or `false` before install — document) | Show the "last backup" footnote more prominently when not persisted |
| V-13 | `actions/setup-node@v7` accepts `cache: npm` without warnings | First `pages.yml` run log | No deprecation warning | Drop `cache:` (HOSTING claim 3) |
| V-14 | `fractional-indexing` 4.0.0 is CC0 and tree-shakes | `npm view fractional-indexing license`; bundle visualiser | `CC0-1.0`; < 2 KB | Inline the 60-line implementation |
| V-15 | `@capgo/capacitor-social-login` 8.5.5 returns a non-null `accessToken` for `drive.appdata` on the device (only if Drive-on-Android is built) | Debug APK with the Android OAuth client (SHA-1 of the CI keystore) | `accessToken` present; Drive list call 200 | Hide the Drive row on Android; file/Gist only (DECISIONS D8) |
| V-16 | Google developer-verification: free limited-distribution account is available for the owner's region | Android Developer Console | Registered before 2027 | Advanced-flow sideload (24 h wait) documented in README |
| V-17 | `capacitor-widget-bridge` 8.1.0 compiles against AGP 8.13 / Kotlin 2.2.20 in CI (**Phase 6, someday** — only if the widget is ever built) | Spike on a `widget` branch with `workflow_dispatch` | Green build; static widget shows `No. 249 · 3 / 7` | `@capgo/capacitor-widget-kit` or defer the widget |
| V-18 | `Pages` serves `manifest.webmanifest` and `sw.js` under `/nocturne/` with correct MIME | `curl -I https://<owner>.github.io/nocturne/manifest.webmanifest` | `200`, `application/manifest+json` | Rename to `manifest.json` (Chrome accepts `application/json`) |

Record each result (date, device model, Android version, WebView version from `chrome://inspect`) in `docs/VERIFICATION-LOG.md` under the same V-numbers.

---

## 12. Manual QA checklist — Android build

Run on the owner's phone with the APK from a `workflow_dispatch` run (unsigned-artifact path) or the tagged Release. Note the device model, Android version and Android System WebView version at the top of each run. There is no camera or gallery use in Nocturne, so those rows are intentionally absent.

**Install & identity**
- [ ] I-1 Sideload from the Releases page in Chrome; "install unknown apps" prompt appears once; `SHA256SUMS.txt` matches (`sha256sum` on the PC after downloading the same asset).
- [ ] I-2 Installing a newer tag over the old one keeps data (no uninstall); `versionName` in Colophon footer equals the tag; `versionCode` increased (`adb` not required — check *Settings › Apps › Nocturne › Version*).
- [ ] I-3 Adaptive icon: navy background, foil "N", themed (monochrome) icon on Android 13+ launcher; splash is plain navy with the glyph and fades out instantly into the masthead roll (no double splash).
- [ ] I-4 App name "Nocturne"; package id unchanged from the first install.

**First open**
- [ ] F-1 Issue No. 1 with the three teaching entries; **no** notification permission prompt yet.
- [ ] F-2 After closing all three, the `POST_NOTIFICATIONS` prompt appears exactly once; denying it leaves the app usable and the Colophon › Reminders row says `Not allowed · Open ›`.

**Permissions & notifications**
- [ ] N-1 Set Daily review to now + 3 min; lock the phone; notification arrives with title `Evening Edition` and body `3 entries still open.`; tapping opens Today.
- [ ] N-2 Per-task reminder (`at`) for now + 2 min with actions `Done` / `Snooze 1h`; `Done` strikes the entry (masthead counter updated when the app is opened); `Snooze 1h` reschedules (visible in the sheet's REMINDER row).
- [ ] N-3 Exact alarms: on a fresh install the sheet shows the footnote `¹ Reminders may be delayed until you allow "Alarms & reminders". Open ›`; tapping opens the system page; after allowing, the footnote disappears on return.
- [ ] N-4 Reboot the phone with a daily review set for the next 10 min; the notification still fires (plugin restore receiver) — V-3.
- [ ] N-5 Doze: leave the phone unplugged and idle for ≥ 1 h with a reminder due; it arrives within 9 min of the set time (`allowWhileIdle`).
- [ ] N-6 Two reminders scheduled 1 min apart both arrive (second may be ≤ 9 min late under Doze — acceptable, documented).
- [ ] N-7 Revoke notification permission in Settings, reopen the app → reminders row shows `Not allowed`, no crash, no repeated prompting.
- [ ] N-8 Notification small icon is the white "N", accent colour foil; channel name `Reminders` visible under app notification settings.
- [ ] N-9 "Reminders not firing?" page opens and links to dontkillmyapp.com in the external browser.

**Navigation & gestures**
- [ ] G-1 System back (gesture) with a sheet open closes the sheet; on the root it leaves the app (no white flash on return).
- [ ] G-2 Predictive back preview (Android 14+ with the developer toggle on / Android 16 default) shows the sheet sliding, not the app minimising — V-11.
- [ ] G-3 Swipe right/left on entries works and never triggers system back (entries start 56 px from the edge).
- [ ] G-4 Long-press lift + drag reorder on a 30-entry list while the list is scrollable; vertical flick scrolls; haptics tick per passed neighbour.
- [ ] G-5 Tab underline slide between the four tabs; View Transitions cross-fade (or opacity fallback) with no flash of unstyled content.

**Layout & display**
- [ ] L-1 Edge-to-edge: running head starts 8 px below the status bar; footer tabs sit above the gesture bar; nothing hidden behind system bars in Night and Proof; status bar icons light on Night, dark on Proof.
- [ ] L-2 Rotation to landscape on the phone: Front Page reflows (single column, masthead 88 px), sheet remains 92 % height, no clipped composer; rotate back — state and scroll position preserved (no Activity restart data loss).
- [ ] L-3 On a tablet/foldable ≥ 600 dp (if available): desktop layout (rail + reading column) appears; orientation is not locked.
- [ ] L-4 Keyboard: tapping the composer raises the keyboard; the composer translates above it (not the whole page); Enter files; keyboard dismiss restores layout.
- [ ] L-5 System font size at "Largest": rows grow, no truncated titles, footer tabs still 48 px tall.
- [ ] L-6 Dark/light system toggle with Theme = Auto switches Night/Proof live; Theme = Night ignores the system.
- [ ] L-7 1 px hairlines visible outdoors at 50 % brightness; grain not visible as noise at arm's length; no navy banding on the OLED — V-9.
- [ ] L-8 Masthead numeral renders without hinting artefacts; digits align in the roll; `No. 249` in Geist Mono.

**Data, backup, sharing**
- [ ] D-1 Export JSON → share sheet appears (Drive, Gmail, Files…); saved file opens and is valid JSON with today's date in its name.
- [ ] D-2 Import via the file picker restores a backup; progress line shows `Importing n / n`; entries and streaks match.
- [ ] D-3 Gist backup with a fine-grained PAT typed on the phone; `Last printed just now · gist …`; toggle "session only" and relaunch → token gone, backup row asks again.
- [ ] D-4 Drive row: either hidden (Drive-on-Android not built) or completes the social-login flow — V-15.
- [ ] D-5 Share the issue → PNG 1080×1920 appears in the share sheet; the fonts are embedded (compare with the in-app colophon).
- [ ] D-6 Clear the app's cache (not data) in Settings → nothing lost. (Clearing *data* wipes IndexedDB — confirm the "Last printed" footnote is the only reminder and that this is documented in Colophon copy.)
- [ ] D-7 Kill the app from Recents mid-edit (sheet open with unsaved notes) → on relaunch the notes were autosaved (300 ms debounce) or at worst the last blur.

**Sound & haptics**
- [ ] S-1 Sound is off by default; enabling plays the platen tick + climbing scale on strike, C4 first; quiet hours silence it; the phone's silent switch/DND is respected.
- [ ] S-2 Haptics: light on strike at 60 % of the stroke, medium at 90 px swipe, selection ticks during reorder, success on colophon; no haptic on scroll; reduced-motion setting leaves haptics on.

**Time behaviour**
- [ ] T-1 Change the phone's time zone (Settings) while the app is in the background; on resume the dayKey of existing completions is unchanged and today's issue number is correct for the new zone.
- [ ] T-2 Leave the app open across 03:00 (or set the phone clock to 02:59 with rollover 03:00): masthead rolls to the new issue, day gauge resets, yesterday moves to Back Issues.
- [ ] T-3 Evening hour reached while the app is open → Evening Turn (480 ms ground shift, running head `EVENING EDITION`).

**Widget (Phase 6, someday — only when the widget ships)**
- [ ] W-1 (Phase 6) `WidgetBridge.requestWidget()` opens the pin prompt; widget shows `No. 249 · 3 / 7`, gauge, next entry, streak; updates within 5 s of a strike; tap opens `nocturne://today`; survives launcher restart.

**Debugging**
- [ ] X-1 A `workflow_dispatch` build with `webContentsDebuggingEnabled: true` is inspectable from desktop Chrome `chrome://inspect#devices` over USB (no adb install needed); the release APK on a tag has it **off** (verify `chrome://inspect` shows nothing).

---

## 13. Release gate (what must be green before `git tag v*`)

1. `npm run test:unit` — 0 failures, coverage thresholds met.
2. `npm run build && npm run test:e2e` — desktop + pixel-7 green (1 retry allowed).
3. `npm run test:visual` — no unexpected diffs; any intentional diff has updated baselines in the same PR with before/after in the PR description.
4. `npm run test:a11y` — 0 serious/critical.
5. `npm run test:perf` — all budgets in §8 within limits; APK ≤ 6 MB.
6. §11 items relevant to the change re-verified (at minimum V-3 whenever anything in `src/platform/notifications*` or `capacitor.config.ts` changed).
7. §12 checklist completed on the phone with the `workflow_dispatch` APK of the release commit; results appended to `docs/VERIFICATION-LOG.md`.
8. Then follow `docs/DEPLOYMENT.md` §8 (release checklist).
