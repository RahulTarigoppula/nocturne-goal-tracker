# Nocturne — Implementation Prompt

**Read this end to end before writing code. It is complete on its own: every token, type, algorithm, wireframe, workflow file and acceptance criterion is inlined. You need no other document. Where you have others and they disagree, this one wins — the known disagreements are resolved in §0.2.**

Written 2026-09-06. Target: an empty folder → a deployed, premium, daily-driver app.

## 0. HOW TO USE THIS

**Order.** Build in the order of §9. Each checkpoint ends with a command and an observable result; fix a failing checkpoint before moving on.

**Three rules that override everything.** (1) **Day 1 = live** — a placeholder must be on GitHub Pages *and* installed from a signed APK before any feature work; hosting problems found on day 30 cost a week. (2) **Engine first, UI second** — everything in `src/engine/` is pure TypeScript with no React, no Dexie and no `Date.now()`, unit-tested against §6's golden tables before it gets a face. (3) **The preview is the spec** — `design/preview.html` (§3.13) is the visual contract; if the app looks worse than the preview, it is not done.

### 0.1 Where the spec is silent

Prefer the quieter option. The failure modes here are "looks like a generic dark dashboard" and "shouts at the user". When in doubt: fewer boxes, more hairlines; fewer colours, more type; no badge, no toast, no exclamation mark.

### 0.2 Conflicts already resolved — do not re-litigate

| Question | Ruling |
|---|---|
| Is 2026-09-06 a Saturday or Sunday? | **Sunday.** Older sample copy reads `SATURDAY`/`SAT 06 SEP`; it is wrong. Use the real calendar: `SUN 06 SEP`, `SAT 05 SEP`, `FRI 04 SEP`. The running-head *format* is binding, the sample weekdays are not. |
| Issue number: day-of-year or days since the first issue? | **`daysBetween(settings.firstIssueDay, dayKey) + 1`**, so a fresh install opens on "No. 1". With `firstIssueDay = 2026-01-01` this coincides with day-of-year — which is why 2026-09-06 reads `No. 249` in every example below. |
| "Monthly on the 31st" from 2026-01-31: clamp or skip February (RFC 5545)? | **Clamp**, always from the *stored* day 31, so the series never drifts down: `2026-02-28 → 2026-03-31 → 2026-04-30`. This is an acceptance criterion (§12). RRULE export of that pattern is therefore lossy in one edge case; note it in a comment and move on. |
| Is "This Evening" a bucket or a flag? | **A flag** (`entry.evening`). Evening entries belong to Today's issue and count toward the colophon. |
| Do habits appear in the issue counter? | **No.** Tasks (Front Page) and habits (Ledger) are separate surfaces with separately scoped ordering. |

## 1. ROLE & MISSION

**You are** a principal front-end engineer with a typographer's eye, building a personal app for one demanding user on Windows 11 with Node 22, npm and git. You have **no Java, no Android SDK and no Flutter locally, and need none** — `npx cap add android` only writes files; every APK is compiled and signed by GitHub Actions. You ship small verifiable increments and write the test before the face.

**The product.** **Nocturne** is a local-first daily to-do and habit tracker that sets each day as a numbered issue of a private navy broadsheet. The Front Page is Today: a masthead with the date set huge, a hairline beneath it that fills with gold foil as the day elapses, and the day's entries as folio-numbered lines between hairlines — no cards at rest, no checkboxes, no icons. You file entries by typing plain English (`Call mom tomorrow 17:00 every week #family`), strike them with a swipe that draws a foil line through the title, reorder them by holding, and when the last entry is struck the issue *closes*: a colophon typesets itself — issue number, count, streak, time — and offers one optional line "for the record". Habits live in a Ledger with streaks and a strength ring that forgives a miss; closed days pile up as Back Issues. Everything lives on the device in IndexedDB, works offline, and the Android build fires real reminders. Backups are a JSON file, or a GitHub Gist with the user's own token. No account, no server, no analytics, no LLM. *Tagline: Your day, printed as a single issue.*

**The quality bar.** **If it looks like a generic dashboard, start over.** No Inter on `#111`, no glassmorphism, no purple, no gradient blobs, no glowing borders, no rounded card grid at rest, no floating `+` FAB, no coloured checkboxes, no progress pies, no confetti ever. **If a screenshot could be a Dribbble mock with no data in it, it has failed** — hairlines alone are not a design; you need 17 px titles, 56 px rows, real hierarchy and a warm human greeting. The reward is typographic, not gamified: closing the day prints a colophon, and that is the screenshot people post. Premium here is cheap — three font files, 1 px rules, one foil colour, one vermilion accent; no shader, no 3D, no canvas, no texture bitmaps. And it must be genuinely usable: 44 × 44 px targets, WCAG AA text contrast in both themes, complete keyboard operation, `prefers-reduced-motion` honoured, TalkBack-legible. A beautiful app the owner cannot use at 23:40 with one thumb has failed.

**Done feels like:** the owner opens it every evening for a week without opening anything else, closes seven issues, never loses data, and shows someone the colophon unprompted.

## 2. NON-NEGOTIABLES

### 2.1 Exact stack

Pin every version (no `^`, no `~`). Where marked *latest*, take what npm resolves at scaffold time and pin the result.

| Layer | Packages (version · licence) |
|---|---|
| Build | `vite` 8.2.2 · `@vitejs/plugin-react` latest · `typescript` as pinned by `create-vite`, **strict** — MIT/Apache |
| UI | `react` + `react-dom` 19.2.8 — MIT |
| Styling | `tailwindcss` + `@tailwindcss/vite` 4.3.3 — MIT |
| Motion | `motion` 13.2.0, imported from `motion/react` — MIT |
| Storage | `dexie` 4.4.5 · `dexie-react-hooks` 4.4.0 · `dexie-export-import` 4.4.0 — Apache-2.0 |
| UI state | `zustand` 5.0.15 — MIT |
| Routing | `react-router` 7.x, hash router — MIT |
| Dates | `date-fns` 4.4.0 · `@date-fns/tz` 1.5.0 — MIT |
| Quick add | `chrono-node` 2.10.1, lazy chunk — MIT |
| Ordering | `fractional-indexing` 4.0.0 — CC0-1.0 |
| Icons | `lucide-react` 1.41.0 — ISC |
| Fonts | `@fontsource-variable/bricolage-grotesque` (import `/full.css`), `@fontsource-variable/geist`, `@fontsource-variable/geist-mono` 5.3.0 — SIL OFL 1.1 |
| Palette (v1) | `cmdk` 1.1.1, lazy chunk — MIT |
| PWA | `vite-plugin-pwa` 1.3.0 · `@vite-pwa/assets-generator` 1.0.2 — MIT |
| Android | `@capacitor/core`, `/android`, `/cli` 8.5.1; plugins `local-notifications` 8.3.1, `haptics` 8.0.2, `preferences` 8.0.1, `filesystem` 8.1.3, `share` 8.0.1, `app` 8.1.1, `status-bar` 8.0.3, `splash-screen` 8.0.2, `keyboard` 8.0.5 — MIT |
| Primitives | shadcn/ui on Base UI — **Dialog only** (`npx shadcn@latest add dialog`) — MIT |
| Tests | `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `/user-event`, `/jest-dom`, `jsdom`, `fake-indexeddb`, `@playwright/test`, `@axe-core/playwright` — latest, MIT |
| Lint | `@biomejs/biome` latest — MIT · package manager **npm** |

**Explicitly not used:** `rrule` (unmaintained; the six patterns are ~150 lines — RRULE is an *export string* only) · `howler` (all sound is Web Audio synthesis, zero assets) · `gsap` (no timeline justifies a non-OSI licence) · `canvas-confetti` (the reward is the colophon) · any analytics, telemetry, crash reporter or dependency that phones home — adding one is a build failure · anything AGPL or non-commercial.

### 2.2 Rules

**Free only.** GitHub public repo, Pages, Actions, Releases. **No Cloudflare Worker** — nothing here needs a hidden secret, because every network feature uses a credential the *user* pastes at runtime. Do not add a `worker/` folder "just in case". If a step asks for a card, stop.

**Licences.** App code MIT (`LICENSE` at root). Dependencies OSI only: MIT/Apache-2.0/ISC/BSD/CC0, and MPL-2.0 only for the two optional "someday" plugins. Fonts SIL OFL 1.1, self-hosted via Fontsource, **never hotlinked in a production build** (`design/preview.html` may use a Google Fonts `<link>`). The habit strength formula is **re-implemented from the published description** of Loop Habit Tracker's score; Loop is GPL-3.0 and is never copied, vendored or depended on. `README.md` carries an Attribution section (§7.3); adding a dependency without its row is an incomplete change.

**Privacy.** No accounts, no server, no analytics, no telemetry, no crash reporting. The production bundle makes **zero network requests** until the user configures a backup target. Data lives in the device's IndexedDB and leaves only via an explicit export or a user-configured backup. Tokens are on-device only (encrypted on web, `@capacitor/preferences` on Android), offer a "session only" mode, are never exported and never logged.

**Offline.** Every feature except Gist backup works with the network off. The shell, the three woff2 files and all icons are Workbox-precached. `navigator.storage.persist()` is requested (web only) after the first filed entry, and the Colophon reports `persistent` or `best-effort` honestly.

**Platforms.** Web PWA on GitHub Pages (installable, offline; reminders fire only while the tab is open — say so in the UI). Android via Capacitor 8, signed APK on tag `v*`, sideloaded (`minSdk 24`, `compileSdk 36`). Desktop = the same web app at ≥ 1024 px, keyboard-first, no Electron/Tauri. iOS not targeted.

### 2.3 Names and constants — decide once, never change

Repo `nocturne` (public) · URL `https://<owner>.github.io/nocturne/` · Vite `base` `/nocturne/` on Pages and `/` in the APK · React Router 7 `createHashRouter` with routes `#/`, `#/upcoming`, `#/ledger`, `#/issues`, `#/issues/:dayKey`, `#/colophon` · app name `Nocturne` · Android `appId`/`applicationId`/`namespace` `com.rahul.nocturne` (**immutable after the first install**) · deep-link scheme `nocturne://` (`today`, `entry/<id>`, `complete/<id>`) · keystore `nocturne-release.p12`, alias `release`, PKCS12 · tags `vMAJOR.MINOR.PATCH`, `versionCode = github.run_number` · theme colour `#0A1024` Night / `#F5F1E8` Proof · Dexie database name `nocturne`.

### 2.4 Folder layout

The project folder is the repo root, so `docs/` and `design/` ship with the code.

```
nocturne/
├── .github/workflows/{pages.yml, ci.yml, android-release.yml}
├── android/                     # generated by `npx cap add android`; COMMITTED
│   └── app/src/main/{AndroidManifest.xml, res/values/colors.xml, res/drawable/*, java/com/rahul/nocturne/}
├── public/{icon.svg, icons/}    # icons generated by @vite-pwa/assets-generator
├── src/
│   ├── app/{main.tsx, router.tsx, Shell.tsx, providers.tsx}
│   ├── features/
│   │   ├── front-page/          # Masthead, DayGauge, RunningHead, EntryList, EntryRow, MarginWord, UndoFoot
│   │   ├── composer/            # Composer, ParsedChips, useQuickAdd
│   │   ├── entry/               # EntrySheet, WhenSheet, RepeatPicker, ReminderRow, Checklist
│   │   ├── week-spread/  ledger/  back-issues/
│   │   ├── colophon/            # Colophon, Standfirst, ShareCard, Settings, BackupPanel
│   │   ├── onboarding/          # firstIssue.ts — the three teaching entries
│   │   └── sound/               # synth.ts, useSound
│   ├── engine/                  # PURE. No React, no Dexie, no Date.now(). Each file has a .test.ts twin
│   │   ├── types.ts ids.ts daykey.ts ordering.ts quickadd.ts recurrence.ts
│   │   ├── streaks.ts strength.ts issue.ts colophon.ts notifications-plan.ts merge.ts scale.ts
│   │   └── __golden__/          # calendar, recurrence, quickadd, streaks, score, ordering, colophon, merge
│   ├── data/{db.ts, repo.ts, backup.ts, gist.ts, fixtures.ts}
│   ├── components/ui/           # Sheet, Button, Segmented, Input, Chip, Footnote, DigitRoll, MonoTable
│   ├── styles/{tokens.css, motion.ts, index.css}
│   └── platform/{index.ts, notifications.ts, haptics.ts, files.ts, secrets.ts, system.ts}
├── e2e/                         # Playwright specs, fixtures, visual baselines
├── docs/  design/preview.html
└── capacitor.config.ts  vite.config.ts  biome.json  LICENSE  package.json
```

## 3. DESIGN & AESTHETICS

Self-contained: build the visuals from this section alone.

### 3.1 Identity

**Nocturne · "The Evening Edition".** Your day is a numbered issue of a private navy broadsheet: a masthead with a giant date numeral, tasks set as folio-numbered catalogue entries between hairlines, and a colophon that prints when the issue is closed. **Three adjectives: Typeset · Quiet · Accountable.** **Voice:** a newspaper that only prints one copy, for you — sober, warm, never chirpy. No exclamation marks, no emoji, no "You're crushing it". The app says "Issue closed." and means it.

**Reference feel** (absorb, do not copy): Bloomberg Businessweek front-of-book (giant numerals as the image, hairline rules) · Müller-Brockmann's Tonhalle posters (grid discipline, numerals as ornament, one accent) · Kinfolk (one column, wide margins) · the NYT "Today's Paper" (folio numbering, section running heads) · Tate exhibition catalogues (lot numbers in the margin, pale text on dark boards) · Are.na (flat, typographic, zero chrome) · Smythson navy diaries (foil on navy and nothing else) · Linear and Reeder (editorial calm, 150–240 ms layout moves).

**It must never look like** a Things/Todoist clone (no rounded card grid at rest, no FAB, no coloured checkboxes, no progress pies) · a dark-SaaS dashboard (no Inter on `#111`, no glassmorphism, no purple, no gradient blobs, no glowing borders) · a space or meditation app (no stars, no nebulae, no shader sky) · a theme park (no skeuomorphic brass, no paper textures, no rotated cards, no rubber stamps) · a designer-portfolio mock (hairlines alone are not enough) · anything with confetti.

### 3.2 Colour

Night is the default and the identity; Proof is a genuine light mode (cream proof paper, navy ink), not an afterthought. **Components never reference a hex** — only tokens.

| Token | Night | Usage | Contrast |
|---|---|---|---|
| `--bg` | `#0A1024` | Page ground — the broadsheet's paper | — |
| `--bg-elevated` | `#0F172E` | Ground after the evening hour; sheets; composer bar | ink 15.7:1 |
| `--surface` | `#131C36` | A card **only while it lifts** (pressed/dragging) and the detail sheet | ink 14.9:1 |
| `--surface-2` | `#1A2542` | Active-row wash, heatmap empty cell, ring track, chips | ink 13.4:1, muted 6.2:1 |
| `--ink` | `#EEF1F8` | Primary text (warm paper white) | 16.7:1 |
| `--ink-muted` | `#9AA6C4` | Running heads, meta lines, secondary text | 7.8:1 |
| `--ink-faint` | `#5B6685` | Decorative folios, completed titles, disabled — **ornament only, never body text** | 3.3:1, fails AA by design; never carries information alone |
| `--accent` | `#E8C170` | Gilt foil — the single accent: strike, active tab underline, day gauge, habit ring, the one filled button | 11.1:1 |
| `--accent-ink` | `#0A1024` | Text on foil | 11.1:1 |
| `--accent-2` | `#EC6D58` | Printer's vermilion — overdue, deadline, destructive; **at most one per screen** | 6.2:1 bg, 5.0:1 surface-2 |
| `--success` | `#9CCBB0` | Backup status only | 10.4:1 |
| `--warning` / `--danger` | aliases of `--accent` / `--accent-2` | A warning is a foil footnote, never a yellow banner | — |
| `--border` / `--border-strong` | `#26304D` / `#3A4666` | The hairline; input underline, sheet rules, grabber | decorative |
| `--focus` | `#F2D68A` | Focus ring, 2 px solid, 2 px offset | 13.3:1 |

**Proof:** `--bg #F5F1E8` · `--bg-elevated #ECE6D8` · `--surface #FBF9F3` · `--surface-2 #E4DCCB` · `--ink #0A1024` · `--ink-muted #414B66` · `--ink-faint #8A93AB` · `--accent #745816` (foil cannot be light on cream — it prints as bronze ink, 5.9:1) · `--accent-ink #F5F1E8` · `--accent-2 #9E2F1C` · `--success #24634A` · `--border #D9D1BF` · `--border-strong #B8AE9B` · `--focus #6E5414`.

**Rules.** The palette collapses semantics to two hues; `--success` appears in exactly two places in the whole app. Theme switching is `[data-theme="night"|"proof"]` on `<html>`; absent attribute = Auto. **The evening ground shift is driven by the app's own evening-hour setting, never by `prefers-color-scheme`** — it is a token swap inside the active theme (`--bg` takes the `--bg-elevated` value). **No gradients on any surface**, the only two exceptions in the app being the day-gauge rule (a hard-edged foil/border split, not a fade) and the desktop margin caption's 40 px `mask-image`. **Shadows exist in exactly two states** — lifted entry (`--shadow-2`), open sheet (`--shadow-3`); nothing has a shadow at rest. **Blur exists in exactly one place** — the sheet scrim. **Hairlines are `1px solid var(--border)`**: never 0.5 px (Android WebView rounds it away), never alpha-only (reads unfinished outdoors).

### 3.3 The complete token block

Write verbatim to `src/styles/tokens.css`. This is the **only** file in `src/` that may contain a hex value.

```css
:root {
  /* ---- Night (default) ---- */
  --bg: #0A1024;  --bg-elevated: #0F172E;  --surface: #131C36;  --surface-2: #1A2542;
  --ink: #EEF1F8; --ink-muted: #9AA6C4;    --ink-faint: #5B6685;
  --accent: #E8C170; --accent-ink: #0A1024; --accent-2: #EC6D58; --success: #9CCBB0;
  --warning: var(--accent); --danger: var(--accent-2);
  --border: #26304D; --border-strong: #3A4666; --focus: #F2D68A;

  /* ---- Type ---- */
  --font-display: "Bricolage Grotesque Variable", "Geist Variable", system-ui, sans-serif;
  --font-body: "Geist Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Geist Mono Variable", ui-monospace, "Cascadia Mono", Consolas, monospace;
  --text-xs: 0.6875rem;   /* 11 */   --text-sm: 0.8125rem;  /* 13 */
  --text-base: 0.9375rem; /* 15 */   --text-md: 1.0625rem;  /* 17 */
  --text-lg: 1.375rem;    /* 22 */   --text-xl: 1.75rem;    /* 28 */
  --text-2xl: 2.25rem;    /* 36 */   --text-3xl: 3rem;      /* 48 */
  --text-4xl: 4.5rem;     /* 72 */   --text-5xl: clamp(5.5rem, 28vw, 7rem); /* 88–112 */
  --leading-tight: 1.1; --leading-body: 1.467;
  --tracking-caps: 0.08em; --tracking-mono: 0.04em; --tracking-display: -0.03em;

  /* ---- Space ---- */
  --space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem; --space-4: 1rem;
  --space-5: 1.25rem;  --space-6: 1.5rem;   --space-7: 2rem;    --space-8: 2.5rem;
  --space-9: 3rem;     --space-10: 4rem;    --space-11: 5rem;   --space-12: 6rem;
  --page-margin: 1.25rem; --folio-col: 2.25rem; --row-min: 3.5rem;

  /* ---- Shape & depth ---- */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 20px; --radius-full: 999px;
  --shadow-1: 0 1px 0 0 rgb(0 0 0 / 0.25);
  --shadow-2: 0 1px 2px rgb(0 0 0 / 0.4), 0 10px 28px rgb(0 0 0 / 0.45);
  --shadow-3: 0 -8px 40px rgb(0 0 0 / 0.5);
  --hairline: 1px solid var(--border);
  --grain-opacity: 0.035; --sheet-scrim: rgb(15 23 46 / 0.72); --sheet-blur: 16px;

  /* ---- Motion ---- */
  --dur-fast: 120ms; --dur-base: 240ms; --dur-slow: 480ms;
  --ease-out: cubic-bezier(0.2, 0.7, 0.1, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: linear(0, 0.29, 0.62, 0.84, 0.95, 1);

  /* ---- App-specific ---- */
  --evening-hour: 21;   /* read by JS; the Evening Turn swaps --bg to the --bg-elevated value */
  --day-gauge: 0;       /* 0–1, set by JS every minute */
  --swipe-threshold: 90px; --strike-width: 1px;
  color-scheme: dark;
}

:root[data-theme="proof"] {
  --bg: #F5F1E8; --bg-elevated: #ECE6D8; --surface: #FBF9F3; --surface-2: #E4DCCB;
  --ink: #0A1024; --ink-muted: #414B66; --ink-faint: #8A93AB;
  --accent: #745816; --accent-ink: #F5F1E8; --accent-2: #9E2F1C; --success: #24634A;
  --border: #D9D1BF; --border-strong: #B8AE9B; --focus: #6E5414;
  --shadow-2: 0 1px 2px rgb(10 16 36 / 0.12), 0 10px 28px rgb(10 16 36 / 0.16);
  --shadow-3: 0 -8px 40px rgb(10 16 36 / 0.18);
  --sheet-scrim: rgb(236 230 216 / 0.78);
  --grain-opacity: 0;
  color-scheme: light;
}

/* "Auto": the same declarations under prefers-color-scheme when no data-theme is set.
   Generate this from the same source as [data-theme="proof"] so the two never drift. */
@media (prefers-color-scheme: light) { :root:not([data-theme]) { /* …identical to proof… */ } }

@media (prefers-reduced-motion: reduce) { :root { --dur-fast: 0ms; --dur-base: 120ms; --dur-slow: 120ms; } }
@media (prefers-reduced-transparency: reduce) { :root { --grain-opacity: 0; --sheet-blur: 0px; } }
```

`src/styles/motion.ts` exports the same values for Motion:

```ts
export const spring = { type: "spring", stiffness: 520, damping: 46, mass: 1 } as const;
export const ease = { out: [0.2, 0.7, 0.1, 1], inOut: [0.65, 0, 0.35, 1] } as const;
export const dur = { fast: 0.12, base: 0.24, slow: 0.48 } as const;
```

`src/index.css` bridges them into Tailwind: `@import "tailwindcss"; @import "./styles/tokens.css";` then `@theme inline { --color-bg: var(--bg); --color-surface: var(--surface); --color-surface-2: var(--surface-2); --color-ink: var(--ink); --color-ink-muted: var(--ink-muted); --color-ink-faint: var(--ink-faint); --color-accent: var(--accent); --color-accent-2: var(--accent-2); --color-border: var(--border); --font-display: var(--font-display); --font-sans: var(--font-body); --font-mono: var(--font-mono); --radius-lg: var(--radius-lg); }`

### 3.4 Fonts

Three families, three variable woff2 files, all SIL OFL 1.1, self-hosted, latin subset, **≤ 350 KB total**, `font-display: swap`.

- `--font-display` **Bricolage Grotesque** — `import "@fontsource-variable/bricolage-grotesque/full.css"`. The default `index.css` is `wght`-only and will silently break `opsz`; **verify in `node_modules` after install.** Axes `wght` 200–800, `opsz` 12–96, `wdth` 75–100.
- `--font-body` **Geist** — `import "@fontsource-variable/geist"`, `wght` 400–600.
- `--font-mono` **Geist Mono** — `import "@fontsource-variable/geist-mono"`, `wght` 400–500.

Display sizes always set `font-optical-sizing: auto` **and** an explicit `font-variation-settings: "opsz" <n>`, because older Android WebViews ignore the former. **Day-1 check:** render the numeral at `"opsz" 12` and `"opsz" 96` side by side in the preview; if they look identical the axis did not ship — fall back to fixed 0.62em digit columns (which DigitRoll needs anyway) and drop `wdth`.

### 3.5 Type scale and voices

| Token | px | Use | Family / weight | Leading | Tracking |
|---|---|---|---|---|---|
| `--text-xs` | 11 | Running heads, meta, chips, folios, footnotes | Mono 500 | 1.4 | +0.08em upper / +0.04em mixed |
| `--text-sm` | 13 | Tab labels, table cells, streaks, times, colophon lines | Mono 400/500 | 1.4 | +0.04em |
| `--text-base` | 15 | Notes, settings copy, checklist, standfirst | Body 400 (standfirst Display 200) | 22 px | 0 |
| `--text-md` | 17 | Entry titles, sheet body | Body 500 | 24 px | −0.005em |
| `--text-lg` | 22 | Month word, greeting, margin words, sheet heads | Display 200/400, opsz 24 | 1.2 | −0.01em |
| `--text-xl` | 28 | Composer "+", sheet headline | Display 400, opsz 32 | 1.15 | −0.015em |
| `--text-2xl` | 36 | Week-spread numerals, habit percentage | Display 300, opsz 36 | 1.0 | −0.02em |
| `--text-3xl` | 48 | Colophon issue number, month heads | Display 300, opsz 48 | 1.0 | −0.02em |
| `--text-4xl` | 72 | Desktop masthead numeral (rail) | Display 300, opsz 72 | 0.95 | −0.03em |
| `--text-5xl` | 88–112 | Phone masthead numeral | Display 300, opsz 96 | 0.9 | −0.04em |

**Four voices, and only four.** (1) **Masthead** — Bricolage 300 / opsz 96 / wdth 100 for the numeral; Bricolage **200** for the greeting, margin words and standfirst; the light weight at large size is this app's "italic", and **it appears at most twice per screen**. (2) **Running heads** — Geist Mono 500, 11 px, uppercase, +0.08 em: `I — TODAY`, `NOCTURNE · No. 249 · SUNDAY`. (3) **Entries** — Geist 500 17/24 for titles, Geist 400 15/22 for notes. (4) **Ledger** — Geist Mono for every number, time, tag, counter and folio: `02`, `18:30`, `#HOME`, `3 / 7`, `No. 249`.

**Numeral rules.** Every number in the app is Geist Mono, tabular by construction, so counters, folios, times and streaks never jitter — never rely on `tnum`. The masthead and week-spread numerals are the single exception (Bricolage with `font-variant-numeric: lining-nums tabular-nums`), and every digit sits in a fixed 0.62–0.64em column. Roman section numerals (`I`, `II`) are Geist Mono capitals at +0.08 em. Times are 24-hour `HH:MM`; issue numbers are `No. 249`; running-head dates are `SUN 06 SEP` — fixed English abbreviations regardless of locale, with only the greeting's date using `Intl`. A latin subset ships; Devanagari or CJK falls through to the system font at the same size, which is acceptable — ship no extra font files.

### 3.6 Spacing, radius, elevation, grid

8 px baseline, 4 px half-step, outer margins 20 px phone / 32 px desktop. **Radius:** `sm 4` chips and checklist boxes, `md 8` the rare boxed button/input, `lg 12` lifted entry and desktop dialog, `xl 20` sheet top corners, `full` habit ring and heatmap dots — **at rest nothing has a radius, because at rest nothing has a box.** **Shadows:** `--shadow-1` under the composer only when the list scrolls beneath it, `--shadow-2` lifted/dragging entry, `--shadow-3` open sheet; nothing else, ever. **Rows:** 56 px minimum, 12 px vertical padding, 44 px hit target inside, hairline below. **Section running head:** 40 px tall, hairline below, 24 px above. **Grid, phone:** 4 columns, column 1 being the 36 px folio margin. **Grid, desktop (≥ 1024 px):** 12 columns — rail 320 px (1–3), reading column max 640 px (4–9), right margin (10–12) for the vertical caption.

### 3.7 Motion language

**Five principles.** Everything moves like type being set — translate, opacity, path length; never scale beyond 1.02, never bounce, never parallax. Numbers never jump — every counter rolls. Layout reflows, it does not pop — every entry is a Motion `layout` element. Nothing auto-plays after the masthead has rolled in. One easing family; springs are over-damped and used only where a finger let go of something.

**Tokens.** `--dur-fast 120ms` (hover wash, underline, opacity) · `--dur-base 240ms` (layout reflow, tab underline, sheet, digit roll) · `--dur-slow 480ms` (masthead roll, evening turn, colophon rule) · easings as in §3.3 · house spring `{ stiffness: 520, damping: 46, mass: 1 }`, over-damped with no visible overshoot, used for lift-drop and reorder settle only.

| # | Name | Property | From → To | Duration | Easing | Stagger |
|---|---|---|---|---|---|---|
| 1 | **Masthead roll** (launch, new day) | `translateY` per digit column in `overflow:hidden` | `+1em → 0`; on a new day the old numeral first goes `0 → −1em` | 480 ms | out | 30 ms/digit; `No. 249` +60 ms; the counter last |
| 2 | **Digit roll** (any counter) | `translateY` of a 0–9 column | `−n·1em → −m·1em` | 240 ms | out | 20 ms/digit, rightmost first |
| 3 | **Ink strike** | SVG `<line pathLength="1">` `stroke-dashoffset` | `1 → 0` left→right; title `opacity 1 → 0.4`; folio → `--ink-faint` | 320 ms; opacity leg 240 ms starting at 160 ms | out | — |
| 4 | **Entry lift** | `background → --surface`; `radius 0 → 12px`; `shadow → --shadow-2`; `scale 1 → 1.02` | — | 120 ms up, spring down | out / spring | — |
| 5 | **Re-set** (reflow after strike/reorder/add) | Motion `layout`, transform only | old rect → new rect | 240 ms | out | **none** — all rows at once, like reflowing type |
| 6 | **Tab underline slide** | `translateX` + `width` of one 1 px foil rule | old tab → new tab | 240 ms | in-out | — |
| 7 | **Sheet rise** | `translateY 100% → 0`; scrim `opacity 0 → 1` | — | 240 / 120 ms | out | children 20 ms apart, max 6 |
| 8 | **Evening turn** | `--bg` value + running-head cross-fade | `#0A1024 → #0F172E` | 480 ms | in-out | head cross-fades at 240 ms |
| 9 | **Colophon draw** | body `opacity 1 → 0.4`; foil rule `scaleX 0 → 1` origin left; lines `opacity 0 → 1`, `translateY 6px → 0` | — | 240 / 480 / 240 ms | out | rule at 240 ms; lines 60 ms apart after it |
| 10 | **Margin word** | `opacity` mapped to drag x | `useTransform(x, [0, 90], [0, 1])`; colour muted → foil at 90 px | live | linear | — |
| 11 | **Page change** | View Transitions cross-fade; masthead is the shared element (`view-transition-name: masthead`, one per page) | — | 240 ms | in-out | fallback: 240 ms opacity swap |
| 12 | **Day-gauge tick** | `width` of the foil segment | previous → current fraction | 480 ms | out | recomputed every 60 s while visible |

**Reduced motion.** Wrap the app in `<MotionConfig reducedMotion="user">` plus a CSS `@media (prefers-reduced-motion: reduce)` layer: digit and masthead rolls become 120 ms opacity swaps; the strike appears instantly (title dims over 120 ms); the lift becomes a `--surface-2` wash with no scale and no shadow; sheets fade instead of rising; reflow is instant; View Transitions are skipped; the gauge snaps; nothing loops. **Haptics still fire** — they are not motion. The Colophon › Motion setting must have exactly the same effect as the media query.

### 3.8 The five signature interactions

**A · The Masthead Roll.** (1) The app opens with the running head already in place — plain text, the LCP element, painting before any font swap. (2) Each digit of the numeral rises from `+1em` into its fixed column over 480 ms with a 30 ms stagger; `No. 249` rolls 60 ms later; the `3 / 7` counter last. (3) On rollover while open, the old numeral rolls out upward and the new one in; the gauge resets to zero foil; the climbing-scale index resets. *Physics:* pure `translateY` inside `overflow: hidden`, `--ease-out` — no opacity, no scale. *Sound/haptic:* none — the app never makes a sound before the user touches it. It is the opening title card, and the first thing a screenshot shows.

**B · The Ink Strike.** (1) Tap the folio (11 px glyph, **44 px hit box**) or swipe right past 90 px or at > 600 px/s. (2) A 1 px foil line draws left→right over 320 ms (`<line pathLength="1">`, `stroke-dashoffset 1 → 0`, `vector-effect: non-scaling-stroke`). (3) At **60 % of the stroke** (≈ 190 ms): `Haptics.impact({ style: 'light' })` and the climbing-scale note if sound is on. (4) Title sinks to 40 % opacity; folio becomes an en dash in `--ink-faint`; the meta line gains `· closed 21:14`. (5) The entry re-sets to the foot of its section (240 ms `layout`) while the counter rolls `3 / 7 → 4 / 7`. (6) **Undo:** for 5 s the composer hint becomes a running foot — `Entry 03 closed — Undo` in mono over a 1 px foil rule shrinking `scaleX 1 → 0` across exactly 5 s; tapping it reverses the strike and retracts the line right→left. (7) Announce `Closed at 21:14` via `aria-live="polite"`. *Budget:* `pointerup` → counter roll ≤ 100 ms, everything complete within 600 ms at 60 fps on a 2022 mid-range Android. The animation starts on pointer-up and **does not wait for the database write**; `useLiveQuery` re-renders when the write lands (≤ 10 ms). *Feel:* crossing an item off a printed list with a fine pen, and the whole page quietly re-setting itself.

**C · Margin Words.** (1) `drag="x"`, `dragConstraints={{ left: -120, right: 120 }}`, `dragElastic={0.2}`. (2) Rightward, the word **"Done."** appears in the left margin in Bricolage 200 / 22 px with opacity tracking distance; leftward, **"When?"** in the right margin. (3) At 90 px the word snaps from `--ink-muted` to `--accent` and `Haptics.impact({ style: 'medium' })` ticks once. (4) Release past the threshold (or `|velocity| > 600`) → Ink Strike (right) or the When sheet (left); release before → spring back on the house spring. **No coloured backing slabs — just the word.** This is the single most important "not a to-do app" detail. *Arbitration:* on pointer-down, horizontal displacement > 12 px before 250 ms is a swipe; a still finger at 250 ms is a lift; otherwise the browser scrolls. Set `touch-action: pan-y`. Margin words are `aria-hidden` — the gesture has keyboard equivalents (`x`, `w`).

**D · Folio Renumber.** (1) Long-press 250 ms → `Haptics.selectionStart()`; the entry lifts onto `--surface` (radius 12, `--shadow-2`, `scale 1.02`) over 120 ms. (2) Drag vertically with Motion `Reorder.Group axis="y"`, handle-less, activated by the hold; other entries reflow with `layout`. (3) As the lifted entry passes each neighbour, **every affected folio re-rolls live** (240 ms) and `Haptics.selectionChanged()` ticks, so the list is always correctly numbered under the thumb. (4) Drop → the card flattens back to a hairline entry on the house spring, `Haptics.selectionEnd()`, and the order persists as a single fractional index (§6.2) — **exactly one record written**. *Critical:* keep Motion `layout` **off the row being dragged**, or `layout` and `Reorder` fight and the row sticks.

**E · The Colophon.** (1) The last open entry of Today (including This Evening) is struck. (2) After the strike settles (400 ms), the issue body fades to 40 % and a single foil rule draws across the reading column (`scaleX 0 → 1`, origin left, 480 ms). (3) Beneath it the colophon typesets line by line, 60 ms apart, in Geist Mono 13 px with the issue number in Bricolage 300 / 48 px: `Issue No. 249` / `Closed at 21:14. Seven entries.` / `Streak 12 days. Longest 31.` / `Set in Bricolage Grotesque & Geist.` (4) `Haptics.notification({ type: 'success' })` and the two-note chime if sound is on. (5) A hairline input appears — placeholder `A line for the record —` in Bricolage 200 / 15 px; Enter files it as the issue's **standfirst**, shown in Back Issues; blank Enter does nothing and the app never nags. (6) Two actions: **"Share the issue"** (the one filled foil button on the screen; renders a 1080 × 1920 PNG, §6.9) and **"Set tomorrow"** (text button → Week Spread on tomorrow). (7) Adding an open entry to a closed day **reopens** it: `closedAt` clears, the colophon exits via `AnimatePresence`, the standfirst is kept. (8) The draw plays **only when `closedAt` changed during this session** (tracked in Zustand), never on a cold open of an already-closed day. *Feel:* no confetti, no badge — the day is printed and signed.

### 3.9 Textures, materials, backgrounds — and how to build them

**Grain, the only texture.** One inline SVG in `index.html` — `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/></filter></svg>` — applied through one fixed pseudo-element: `body::after { content:""; position:fixed; inset:0; pointer-events:none; z-index:100; filter:url(#grain); opacity:var(--grain-opacity); mix-blend-mode:overlay; }`. Its only purpose is to kill navy banding on cheap OLEDs. Budget ≤ 2 ms paint per scrolled frame; if the phone exceeds that, swap the filter for a pre-rendered 128 × 128 base64 PNG tiled at the same opacity — never remove the anti-banding on Night. Off in Proof and under `prefers-reduced-transparency`.

**The day-gauge rule.** A 1 px `--border` bar with an absolutely positioned `--accent` child of `width: calc(var(--day-gauge) * 100%)`, transitioning `width` over 480 ms. Hard edge — not a gradient, not a fade.

**The sheet scrim.** `background: var(--sheet-scrim); backdrop-filter: blur(var(--sheet-blur)) saturate(1.2)` — ship the `-webkit-` prefix too. **The desktop margin caption.** `writing-mode: vertical-rl` with `mask-image: linear-gradient(to bottom, transparent, #000 40px, #000 calc(100% - 40px), transparent)`.

**No canvas, no WebGL, no shader, no bundled image assets** beyond the app icon set. Memory must stay under 60 MB in the WebView.

### 3.10 Iconography

**Lucide** (ISC), 1.5 px stroke, 16 px, `--ink-muted` — used **only** inside the Colophon settings screen and for the share/undo affordances; `›` in tables is a text glyph, not an icon. The four main surfaces have **zero icons** and **no tab icons**: folio numbers, words and rules do the work. **No illustration** — empty states are one light-weight line of type. **No imagery** — the share PNG is rendered from the app's own SVG. **App icon:** a navy square with a foil "N" set in Bricolage Grotesque 300, drawn as outlines in `public/icon.svg` (glyph outlines in a logo are permitted under the OFL), with every size generated by `@vite-pwa/assets-generator`.

### 3.11 Sound & haptics

Sound is **off by default**, unlocked on the first pointer/touch event, master gain 0.35, silent inside quiet hours (default 23:00–08:00). Everything is synthesised with Web Audio — zero audio files, zero licensing.

| Event | Sound | Haptic |
|---|---|---|
| Ink strike | Platen tick (40 ms band-passed noise, −18 dBFS), then the **climbing scale** note: sine, 8 ms attack / 600 ms decay, pentatonic step *n* of the day (C4 D4 E4 G4 A4 C5 D5 …), reset at rollover | `impact light` at 60 % of the stroke; web `navigator.vibrate(8)` |
| Swipe crosses 90 px | — | `impact medium` |
| Long-press lift | — | `selectionStart` |
| Renumber during drag | — (never sound; far too chatty) | `selectionChanged` per passed neighbour |
| Drop | Low "thock": 90 Hz sine, 70 ms exponential decay | `selectionEnd` |
| Colophon | Two-note chime: sine 440 → 660 Hz, 300 ms, slow release | `notification success` |
| Exact alarm unavailable | — | `notification warning`, once, at setup |
| Undo | The tick reversed (noise burst with a 60 ms fade-in) | — |

**Never a haptic without a gesture; never a haptic on scroll.** Reduced motion does not disable haptics. Android WebView requires a *touch* gesture to unlock `AudioContext` — listen for both `pointerdown` and `touchstart`.

### 3.12 Accessibility

**Contrast** — every text colour ≥ 4.5:1 in both themes; `--ink-faint` is decorative and always paired with a semantic the assistive tech can read. **Focus** — `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px }` on every interactive element, plus the `--surface-2` wash on the keyboard-selected entry; focus is never removed or hidden. **Targets** — every one ≥ 44 × 44 px: the folio glyph is 11 px but its button box is 44; rows 56, footer tabs 48, chips 32 tall with a 44 px hit area. **Screen reader** — entries are `<li>` containing `<button aria-label="Mark done, entry 3, Draft the Nocturne README, overdue Friday">`; a strike announces `Closed at 21:14` via `aria-live="polite"`; DigitRoll columns are `aria-hidden` with a visually hidden twin (`4 of 7`); the gauge is `role="progressbar"` with `aria-valuetext="14 hours until rollover"`; sheets are `role="dialog" aria-modal="true"` with a focus trap and focus return; margin words are `aria-hidden`. **Keyboard** — the whole app works without a pointer: `j`/`k` or arrows move, `x` strike, `w` when, `e` edit, `n` new, `⌘/Ctrl+K` find, `[`/`]` tabs, `Alt+↑/↓` reorder, `Esc` closes. **Text scaling** — all sizes in rem, surviving 130 % font size and a 320 px viewport; rows grow and only meta lines truncate (full text in the sheet). **Colour is never the only signal** — overdue is vermilion **and** the word `OVERDUE`; done is an en-dash folio **and** a strike **and** a `closed HH:MM` time. `<html lang="en">`; the greeting date uses `Intl`, the running head stays fixed English.

### 3.13 Android chrome and the preview file

**Edge-to-edge is mandatory** at `targetSdk 36`: use Capacitor 8's `SystemBars` (in `@capacitor/core`, no extra package) with transparent status and navigation bars, content padded with `env(safe-area-inset-top/bottom)` plus the Capacitor fallback vars, and the footer tab strip above the gesture-nav area. **Status bar** light icons on Night (`Style.Dark`), dark on Proof (`Style.Light`), transparent background, running head 8 px below the top inset. **Gesture navigation** — no horizontal swipe target within 24 px of the edges (entries already start inside, behind a 20 px margin plus a 36 px folio column); predictive back closes sheets and is the system default at the root. **Splash** — plain `--bg` navy with the centred foil "N", `launchFadeOutDuration: 0`, `androidScaleType: "CENTER"`, so the masthead roll is the real opening: no double splash, no white flash. **Adaptive icon** — background `#0A1024`, foreground foil `#E8C170` "N" with 18 % safe padding, `<monochrome>` layer for Android 13+ themed icons; notification small icon `ic_stat_nocturne`, a white "N" at 24 dp tinted `#E8C170`. **`theme-color`** switches with the theme; manifest `background_color: "#0A1024"`. **Fonts in WebView** — variable fonts are fine on System WebView ≥ 110; cap the numeral at 112 px and check hinting at DPR 2.625 on a real device; 1 px hairlines only. **`colors.xml`** mirrors the tokens for splash, system bars and the phase-6 widget: `nocturne_bg #0A1024`, `nocturne_accent #E8C170`, `nocturne_ink #EEF1F8`, `nocturne_ink_muted #9AA6C4`.

**`design/preview.html` — the visual contract.** Before writing React, hand-write one self-contained file (no build, no libraries; a Google Fonts `<link>` is allowed here only) containing the Front Page phone in Night, Proof and Evening; the Front Page desktop; Week Spread; Ledger with heatmap and 96 px ring; Back Issues; the Entry and When sheets; and the Colophon end state. Implement the strike, margin words, lift, digit roll and colophon draw in plain CSS/JS so the *timing* is settled before React exists. Every visual baseline is judged against this file; if the React app looks worse, the React app is wrong.

## 4. SCREENS

Legend: `═` hairline `--border` · `▁` foil rule · `⋯` more rows. Gestures and animations referenced here are specified in §3.7–§3.8.

### 4.1 Front Page (Today) — `#/`

**Purpose:** the only screen that matters — everything due today, set as one issue, closable in one sitting.

```
┌──────────────────────────────────────┐  PHONE 390×844
│ NOCTURNE · No. 249 · SUNDAY    3 / 7 │  running head, Mono 500/11/caps
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁════════════════════════ │  the rule is the clock (foil = day elapsed)
│                                      │
│   06   September                     │  numeral Bricolage 300/opsz 96/88–112; month 200/22
│        Good evening, Rahul.          │  greeting, Bricolage 200/22 (light voice, 1 of max 2)
│                                      │
│ I — TODAY                            │  section head, 40 px, hairline below
│ ════════════════════════════════════ │
│ 01  Call the bank about the card     │  folio Mono 11 / title Geist 500/17/24
│     09:30 · #ADMIN                   │  meta Mono 11 caps, --ink-muted
│ ════════════════════════════════════ │
│ 02  Draft the Nocturne README        │
│     #WORK · OVERDUE FRI              │  vermilion ONLY on the first overdue row on screen
│ ════════════════════════════════════ │
│ —   Water the plants                 │  done: en-dash folio, 40 % title, foil strike
│     closed 18:02                     │
│ ════════════════════════════════════ │
│ II — THIS EVENING                    │
│ ════════════════════════════════════ │
│ 04  Read 20 pages            21:00   │
│ ════════════════════════════════════ │
│ +  Add to the issue…                 │  composer: hairline underline, Bricolage "+" 28
│ ──────────────────────────────────── │
│ Enter to file · Shift+Enter this eve │  hint / UndoFoot, Mono 11
│ TODAY   UPCOMING   LEDGER   ISSUES   │  footer tabs, Mono 13 caps, 48 px tall
│ ▁▁▁▁▁                                │  foil underline slides between tabs
└──────────────────────────────────────┘  + env(safe-area-inset-bottom)

┌────────────────┬──────────────────────────────────────┬────────────┐  DESKTOP ≥1024
│ NOCTURNE       │ I — TODAY                            │            │
│ No. 249  3 / 7 │ ════════════════════════════════════ │  E         │
│                │ 01  Call the bank about the card     │  v         │
│  06            │     09:30 · #ADMIN                   │  e         │
│  September     │ ════════════════════════════════════ │  n         │
│ ▁▁▁▁▁▁════════ │ 02  Draft the Nocturne README        │  i         │
│                │     #WORK · OVERDUE FRI              │  n         │
│  M  T  W  T  F │ ════════════════════════════════════ │  g         │
│  ·  1  2  3  4 │ II — THIS EVENING                    │            │
│  ⋯ (06) ⋯  ⋯   │ ════════════════════════════════════ │  E         │
│                │ 04  Read 20 pages                    │  d         │
│ TODAY ▁▁▁▁▁    │ ════════════════════════════════════ │  i         │
│ UPCOMING       │                                      │  t         │
│ LEDGER         │ +  Add to the issue…        ⌘K Find  │  i         │
│ ISSUES         │ ════════════════════════════════════ │  o         │
│ 320 px rail    │ 640 px reading column                │  n · 21:00 │
└────────────────┴──────────────────────────────────────┴────────────┘
```

Desktop: the numeral drops to 72 px in the rail; the mini calendar circles today with a hairline and marks days that have entries with a 3 px foil dot; the right margin is a `writing-mode: vertical-rl` caption with the mask fade.

**Component tree.** `FrontPage` → `Masthead` (phone) / `RailMasthead` (desktop) containing `RunningHead` (`NOCTURNE · No. <DigitRoll> · SUNDAY` and `<DigitRoll>3 / 7</>`), `DayGauge`, `DateNumeral`, `MonthWord`, `Greeting` and an optional vermilion `StorageFootnote`; then `IssueBody` (which fades to 0.4 when the issue closes) holding `SectionHead "I — TODAY"` → `EntryList` (a `Reorder.Group` of `EntryRow`: `Folio` · `Title` + strike line · `Meta` · two `MarginWord`s) → `SectionHead "II — THIS EVENING"` → `EntryList`; then `Colophon` inside `AnimatePresence` (rendered only when `issue.closedAt && dayKey === today`); then `Composer` (folio preview · input · `ParsedChips` · hint/`UndoFoot`); then `FooterTabs` (phone) or `RailNav` + `MiniCalendar` (desktop).

**States.** *Empty* — no section heads at all: under the masthead, one light line `Nothing set for today.` and the composer, nothing else. *Loading* — the masthead renders immediately from a `localStorage` cache of `{ issueNo, done, total }`, hairlines draw first, entries fade in over 240 ms; **no skeletons**. *Error* (IndexedDB unavailable) — a vermilion footnote `¹ Storage is unavailable in this browser; the issue will not be saved.`, and the app still runs in memory. *Success* — the Colophon. *Evening* — the ground turns to `--bg-elevated` over 480 ms and the running head cross-fades to `EVENING EDITION · No. 249`.

**Gestures.** Tap folio = strike · tap title = Entry sheet · swipe right = strike · swipe left = When sheet · long-press = reorder · **no pull-to-refresh**. Keyboard as in §3.12.

### 4.2 Week Spread (Upcoming) — `#/upcoming`

**Purpose:** the next seven days plus Someday — where you push what you are not doing now.

```
│ NOCTURNE · UPCOMING          7 DAYS  │
│ ════════════════════════════════════ │
│ MON   07               2 entries     │  weekday Mono 11 caps, numeral Bricolage 300/36
│ ════════════════════════════════════ │
│ 01  Weekly review          10:00     │  compact rows: 44 px, title 15, tail Mono 11
│ 02  Groceries              #HOME     │
│                                      │
│ TUE   08               overdue 1     │  vermilion count — once per screen
│ ════════════════════════════════════ │
│ 01  Renew passport         DUE       │
│ ⋯                                    │
│ SOMEDAY                              │  running head; no dates, reorderable
│ ════════════════════════════════════ │
│ 01  Learn to develop film            │
```

**Desktop:** seven 1-fr columns under a single hairline, each with a small masthead (weekday in mono, numeral in Bricolage 36) and its entries beneath. Dragging an entry onto another day-head washes that head `--surface-2` after 400 ms of hover, and on drop **both** day counters roll. **States:** an empty day shows only its day-head with a `—` folio row; past days never appear here (they live in Back Issues); loading draws day-heads first. **Gestures:** phone — long-press then drag to another day-head; swipe left opens the When sheet as everywhere else. Desktop — pointer drag, with a keyboard sensor for accessibility.

### 4.3 The Ledger (Habits) — `#/ledger`

```
│ NOCTURNE · LEDGER           4 HABITS │
│ ════════════════════════════════════ │
│ Morning pages            11 · 11   ◔ │  name Geist 17 · streak·best Mono 13 · ring 24 px
│ ════════════════════════════════════ │
│ Run                        3 · 3   ◑ │
│ ════════════════════════════════════ │
│ No sugar                   0 · 12  ○ │  missed: ring track only. No red. No shame copy.
│ ════════════════════════════════════ │
│ 12 WEEKS · MORNING PAGES             │
│ · · ● ● ● · ● ● ● ● ● ● · ●    06    │  foil dot = done, hairline circle = missed,
│ ● ● ● ● ● · · ● ● ● ● ● ● ●          │  today shows its day-of-month numeral in mono
│                              78 %    │  Bricolage 300/36 inside the 96 px ring
│                           strength   │
│ ════════════════════════════════════ │
│ ARCHIVED                             │  --ink-faint running head
│ +  Add a habit…                      │
```

**Components:** `LedgerLine`, `StrengthRing` (SVG, 1 px `--surface-2` track, 1.5 px foil arc, `pathLength="100"`, `stroke-dashoffset` over 240 ms), `Heatmap12` (SVG 12 × 7, 84 cells, < 4 ms), `DigitRoll` for the streak pair. **Tap** the line completes today (arc extends 240 ms, streak rolls, `impact light`); tapping again un-completes — never a double completion. **Long-press** opens the habit sheet (title, daily vs specific days, reminder, freeze token as a mono footnote `¹ 1 freeze available`, archive, delete). **Empty:** one light line `No habits in the ledger.` plus an `Add a habit…` composer. **Desktop:** the same list in the reading column, with the selected habit's 12-week grid in the right margin.

### 4.4 Back Issues (Logbook) — `#/issues`, `#/issues/:dayKey`

```
│ NOCTURNE · BACK ISSUES     10 ISSUES │
│ ════════════════════════════════════ │
│ September                            │  month head, Bricolage 300/48
│ ════════════════════════════════════ │
│ No. 248 · SAT 05 SEP · 6 / 6 · closed 22:03 │  Mono 13
│     Finally shipped the keystore workflow.  │  standfirst, Bricolage 200/15
│ ════════════════════════════════════ │
│ No. 247 · FRI 04 SEP · 4 / 7 · open  │  not closed: no time, whole row --ink-muted
│ ════════════════════════════════════ │
│ WEEK 36 · 25 / 29 · 3 ISSUES CLOSED  │  weekly review running head, every Monday
```

Tapping a row opens that issue's **frozen** Front Page (`#/issues/2026-09-05`): the same masthead and entries, the gauge fixed at the close fraction, its colophon printed, **no composer**, and "Share the issue" available. **Empty:** `No back issues yet. Close today's to start the archive.` Rows come from the `issues` table only — **never scan `entries` to build this list**; 365 rows must render in under 50 ms.

### 4.5 Entry detail sheet (overlay on any screen)

```
│ ░░ masthead visible through 16 px blur ░░ │
┌──────────────────────────────────────┐  --surface, radius-xl top, --shadow-3
│ ──                                   │  grabber 36×4, --border-strong
│ 02  Draft the Nocturne README        │  folio Mono 13 · headline Bricolage 400/28
│ Notes in Geist 15/22. Paste a list   │
│ to make sub-entries.                 │
│ 02.1  [ ] Outline                    │  checklist sub-entries, mono folio, 14 px box
│ 02.2  [x] Screenshots                │
│ ════════════════════════════════════ │
│ WHEN        Today               ›    │  MonoTable: 96 px key column, hairline 44 px rows
│ DEADLINE    Sat 12 Sep          ›    │
│ REPEAT      Every weekday       ›    │
│ REMINDER    17:00 ¹             ›    │
│ TAGS        #WORK               ›    │
│ ════════════════════════════════════ │
│ ¹ Reminders may be delayed until you │  exact-alarm footnote, Mono 11, FOIL (not red)
│   allow "Alarms & reminders". Open › │
│ Move to Someday      Delete the entry│  text buttons; Delete is the one vermilion element
└──────────────────────────────────────┘
```

92 % height on phone; a 560 px centred dialog on desktop with a 40 % scrim. Edits autosave (Dexie `put` on blur, 300 ms debounce); delete asks once inline (`Delete? — Yes / Keep`); a recurring entry shows `Instance 4 · every weekday` in REPEAT; a save failure shows a vermilion footnote `Could not save — Retry`. Dismiss by dragging the grabber down, swiping down on the headline, Android predictive back, or `Esc`; focus is trapped while open and returns to the entry title button.

### 4.6 When sheet, Composer, Colophon settings, First open

**When sheet** (swipe left) — a short auto-height sheet with a light headline (`03  When?`, Bricolage 200/22) over hairline 48 px rows, each with a mono sub-label: `Today · Section I` / `This evening · Section II · 21:00` / `Tomorrow · Mon 07` / `This weekend · Sat · Sun` / `Pick a day ›` (month grid) / `Someday · No date`. Choosing a day moves the entry and rolls **both** affected counters.

**Composer** — `│ 05  Call mom  TOMORROW 17:00  #FAMILY  EVERY WEEK │` over a `--border-strong` underline that turns foil on focus, with the hint `Enter to file · Shift+Enter for this evening` beneath. The entry's **future folio** replaces the `+` before commit. Understood spans become inline mono uppercase chips (`--surface-2`, `radius-sm`, 32 px tall, 44 px hit area); **tapping a chip discards its meaning** — it goes muted with a line-through and the text stays in the title. `Enter` files with a Re-set animation and **keeps the field open**; `Shift+Enter` files to This Evening; empty `Enter` closes. **A parse failure shows nothing** — no red, no error, no shake. While an undo is pending the hint becomes the UndoFoot with its shrinking foil rule.

**Colophon settings** — `#/colophon`, three hairline groups under mono running heads. *EDITION:* Theme (`Night · Proof · Auto` segmented with a foil underline), Evening hour `21:00 ›`, Day rollover `03:00 ›`, Reader name, Motion (`System · Reduced`), Sound (`Off · On · Quiet hours`). *REMINDERS:* Daily review `21:00 ›`, Exact alarms `Not allowed  Open ›` in **foil** when denied, Private reminders, `Not firing?  Read the note ›`. *BACKUPS:* `Last printed 2 h ago · gist abc…` (the only `--success` in the app), `Storage persistent`, Export/Import (JSON · Markdown), GitHub Gist `PAT ····· 7f ›`. Then the attribution block in Mono 11 — part of the design, not a legal box — ending with the version string. A failed backup renders `Failed 10:02 — Retry` in vermilion **inline, never a modal**; import shows a mono progress line `Importing 1,204 / 2,310`.

**First open (Issue No. 1)** — masthead `No. 1 · SUNDAY  0 / 3`, greeting `Welcome to your first issue.`, and three entries whose titles teach the three gestures: `01 Swipe me right when I'm done` / `02 Swipe me left to move me` / `03 Hold me to change the order`. **No tour, no tooltips, no overlay, no permission prompt.** Closing all three prints the first colophon (`Issue No. 1 · Closed. Three entries. Streak 1 day.` — no time on No. 1) and **only then** does Android ask for notification permission.

**Android widget (someday)** — a 4 × 2 RemoteViews block reading `No. 249 · 3 / 7`, the gauge as two coloured Views, the next entry and `Streak 12`, in the system font (RemoteViews cannot load custom fonts), with colours from `colors.xml` and a tap deep-linking to `nocturne://today`. The masthead mimicry comes from layout, not from a font.

**Transitions.** Tab and rail navigation use the View Transitions API with the masthead as the shared element (`view-transition-name: masthead`, exactly one per page), 240 ms `--ease-in-out`, falling back to a 240 ms opacity swap. Sheets rise over whatever screen is showing and never change the route — they are Zustand state (`openSheet`), except the deep-linked `#/?entry=<id>` case.

## 5. DATA MODEL

Every "calendar day" is a `DayKey` (`"YYYY-MM-DD"`, local, rollover-adjusted); every instant is epoch milliseconds. **Nothing is ever hard-deleted** — `deletedAt` tombstones make merge trivial and undo cheap.

```ts
// src/engine/types.ts
export type DayKey = string & { readonly __dayKey: unique symbol };   // "2026-09-06"
export type Id = string;                    // 12-char base62 from crypto.getRandomValues (ids.ts)
export type Bucket = "today" | "upcoming" | "someday";  // when === today · when > today · no when
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;        // 0 = Sunday (JS convention)
export type RecurrenceMode = "fixed" | "afterCompletion";

export interface Entry {                    // a task; "entry" in the UI voice
  id: Id;
  title: string;
  notes: string;                            // plain text, "" when empty
  status: "open" | "done";
  bucket: Bucket;
  when?: DayKey;                            // the day it is filed under
  evening: boolean;                         // "This Evening" — a FLAG, not a bucket
  deadline?: DayKey;                        // vermilion countdown; overdue when deadline < today
  tags: string[];                           // lower-case, stored without the '#'
  order: string;                            // fractional index within (bucket, when, evening)
  checklist: { id: Id; text: string; done: boolean }[];
  recurrence?: Recurrence;                  // only on the open, template-bearing instance
  reminderAt?: number;                      // epoch ms, local wall-clock at creation
  seriesId?: Id;                            // shared by every instance of one recurring entry
  instanceNo?: number;                      // 1-based → "Instance 4 · every weekday"
  createdAt: number; updatedAt: number;
  completedAt?: number;                     // the "closed 21:14" stamp
  deletedAt?: number;                       // tombstone
}

export type Recurrence =
  | { kind: "daily";    interval: number; mode: RecurrenceMode }
  | { kind: "weekdays"; mode: RecurrenceMode }
  | { kind: "weekly";   interval: number; days: Weekday[]; anchor: DayKey; mode: RecurrenceMode }
  | { kind: "monthly";  interval: number; day: number | "last"; mode: RecurrenceMode }
  | { kind: "yearly";   month: number; day: number; mode: RecurrenceMode };   // month 1..12

export interface Habit {
  id: Id; title: string;
  frequency: { times: number; per: "day" | "week" };   // {1,"day"} daily · {3,"week"} v1
  scheduleDays?: Weekday[];                            // day-specific habits ("Mon Wed Fri")
  reminder?: { hour: number; minute: number };         // v1
  freezes: number;                                     // streak-freeze tokens available (v1)
  order: string;
  createdAt: number; updatedAt: number; archivedAt?: number; deletedAt?: number;
}

export interface Completion {               // one per habit per day; append-mostly
  id: Id;                                   // `${habitId}:${dayKey}` — deterministic → union-merge dedupes
  habitId: Id; dayKey: DayKey;
  value: number;                            // 1 = done; 0 with frozen=true = a freeze token was spent
  frozen?: boolean;
  ts: number;                               // instant of the tap; never rewritten on a tz change
  updatedAt: number; deletedAt?: number;
}

export interface Issue {                    // one per calendar day that had >= 1 entry
  dayKey: DayKey;                           // primary key
  issueNo: number;                          // daysBetween(firstIssueDay, dayKey) + 1
  total: number; done: number;              // live entries filed for the day (today + evening)
  closedAt?: number;                        // set when done === total && total >= 1; cleared on reopen
  standfirst?: string;                      // "A line for the record —"
  streakAtClose?: number;                   // consecutive closed issues including this one
  updatedAt: number;
}

export interface Settings {                 // single row, key "settings"
  theme: "night" | "proof" | "auto";
  eveningHour: number;                      // 21
  dayRolloverHour: number;                  // 3
  motion: "system" | "reduced";
  sound: { enabled: boolean; quietFrom: number; quietTo: number; master: number };  // off, 23, 8, 0.35
  dailyReview: { enabled: boolean; hour: number; minute: number };                  // on, 21:00 (Android)
  privateReminders: boolean;                // redact the notification body on the lock screen
  firstIssueDay: DayKey;                    // set on first launch; drives issueNo
  readerName?: string;                      // "Good evening, Rahul."
  backup: { gistId?: string; lastBackupAt?: number; lastBackupRevision?: number; auto: boolean };
  onboardingDone: boolean;
}

export interface Meta { key: string; value: unknown }   // "revision" (monotonic), "lastSyncAt", "schemaVersion"
```

```ts
// src/data/db.ts
import Dexie, { type EntityTable } from "dexie";
export const db = new Dexie("nocturne") as Dexie & {
  entries: EntityTable<Entry, "id">;   habits: EntityTable<Habit, "id">;
  completions: EntityTable<Completion, "id">;   issues: EntityTable<Issue, "dayKey">;
  settings: EntityTable<Settings & { key: "settings" }, "key">;   meta: EntityTable<Meta, "key">;
};
db.version(1).stores({
  entries:     "id, bucket, when, status, seriesId, updatedAt, deletedAt, reminderAt, *tags, [bucket+when]",
  habits:      "id, archivedAt, updatedAt",
  completions: "id, habitId, dayKey, [habitId+dayKey], updatedAt",
  issues:      "dayKey, closedAt, updatedAt",
  settings:    "key",
  meta:        "key",
});
```

**Index rationale.** The Front Page uses `[bucket+when]` plus an `IDBKeyRange` on `when` for the overdue roll-forward — budget **< 10 ms for 5,000 entries**. `*tags` is a multi-entry index for future filtering. `completions` keyed by `[habitId+dayKey]` makes a 12-week heatmap one range query.

**Migrations.** Dexie versions only increase, and every bump ships an upgrade function plus a migration test. Migrations are **additive and reversible-by-import**: never drop a table, never remove a field an older export carries. Exports include `schema`, so import can refuse a newer one with `Backup is from a newer edition (schema 3); update the app first.`

**Export format.** A `dexie-export-import` blob with the header written as `meta` rows: `{ "format": "nocturne-backup", "version": 1, "schema": 1, "app": "0.4.2", "revision": 7, "exportedAt": 1788732840000 }`. *Export:* `exportDB(db, { prettyJson: false })` → `nocturne-YYYY-MM-DD.json`. *Restore:* validate the header **first**, then `importInto(db, blob, { overwriteValues: true, clearTablesBeforeImport: true })` in a transaction; a bad header changes nothing and shows `Not a Nocturne backup`. *Merge* (a second device): per-record LWW, §6.7. **Tokens are never included in an export** — assert it in a test. A v1 Markdown export writes issues as headings, entries as lines, habits as a table; it is for reading, not restoring, and says so.

**Repository rules (`src/data/repo.ts`).** Every write goes through `repo.ts`; no component or hook touches `db.*`. It stamps `updatedAt` on every touched record, bumps `meta.revision` once per logical operation, **never hard-deletes**, wraps multi-table work in one `db.transaction("rw", …)`, calls the pure engine for every derived value, and fires side effects (notification re-sync debounced 500 ms, widget payload, a single `navigator.storage.persist()`) from write hooks rather than from components. API: `addEntry`, `updateEntry`, `strike`, `undo`, `moveTo`, `setEvening`, `reorder`, `deleteEntry`, `addHabit`, `updateHabit`, `toggleCompletion`, `archiveHabit`, `setStandfirst`, `saveSettings`, `exportAll`, `importAll`, `mergeRemote`.

## 6. ENGINE / ALGORITHMS

Everything here lives in `src/engine/`, takes plain data and an explicit `now`/`today`, returns plain data, and has a `.test.ts` twin. **No engine file may import React, Dexie or a DOM API, or call `Date.now()`, `new Date()` with no argument, or `Math.random()`.**

### 6.1 Day key, issue number, day gauge (`daykey.ts`)

Calendar arithmetic runs on `{y, m, d}` through `Date.UTC`, so DST can never shift a day.

```ts
export const toKey = (y: number, m: number, d: number): DayKey =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` as DayKey;
export const parseKey = (k: DayKey) => { const [y, m, d] = k.split("-").map(Number); return { y, m, d }; };
const ymd = (k: DayKey) => { const { y, m, d } = parseKey(k); return [y, m - 1, d] as const; };

export function addDays(k: DayKey, n: number): DayKey {
  const { y, m, d } = parseKey(k);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return toKey(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
export const daysBetween = (a: DayKey, b: DayKey) =>
  Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 86_400_000);
export const weekdayOf = (k: DayKey): Weekday => new Date(Date.UTC(...ymd(k))).getUTCDay() as Weekday;
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const startOfWeek = (k: DayKey): DayKey => addDays(k, -((weekdayOf(k) + 6) % 7));  // Monday

/** "Today" for the app: the local wall clock shifted back by the rollover hour. */
export function todayKey(now: Date, rolloverHour: number): DayKey {
  const t = new Date(now.getTime() - rolloverHour * 3_600_000);   // shift, THEN read LOCAL fields
  return toKey(t.getFullYear(), t.getMonth() + 1, t.getDate());
}
export const issueNumber = (dayKey: DayKey, firstIssueDay: DayKey) => daysBetween(firstIssueDay, dayKey) + 1;

/** Fraction of the current issue-day elapsed, for the masthead rule. */
export function dayGauge(now: Date, rolloverHour: number): number {
  return ((now.getHours() * 60 + now.getMinutes() - rolloverHour * 60 + 1440) % 1440) / 1440;
}
export const isEvening = (now: Date, eveningHour: number, rolloverHour: number) =>
  now.getHours() >= eveningHour || now.getHours() < rolloverHour;
```

**Worked values** (rollover 3, `firstIssueDay = 2026-01-01`): `todayKey(2026-09-07T01:30)` and `…T02:59` both → `"2026-09-06"` (a 1 a.m. strike still counts for Sunday), `…T03:00` → `"2026-09-07"` · `issueNumber("2026-09-06")` = 248 + 1 = **249**, `("2026-01-01")` = **1** · `dayGauge(21:14)` = (1274 − 180)/1440 = **0.7597** → 76 % foil; `dayGauge(15:00)` = **0.5**; `dayGauge(02:59)` = **0.9993** · `weekdayOf("2026-09-06")` = **0** (Sunday) · `ariaValueText(15:00)` = `"12 hours until rollover"` · `greeting(hour)`: 5–11 "Good morning", 12–16 "Good afternoon", 17–4 "Good evening" — **never "Good night"**.

**Edges.** `Europe/Berlin` 2026-10-25T02:30 happens twice (DST ends); both readings must return `"2026-10-24"` — no double day, no skipped day. With `rolloverHour = 0` the key equals the plain local date for all 24 hours. The running head is `SUN 06 SEP` regardless of process locale.

**Rollover ticker.** `providers.tsx` recomputes `todayKey` every 60 s and on `visibilitychange`. On a change: the masthead re-rolls, the gauge resets, `strikeCountToday` resets to 0, yesterday's open entries roll forward into the overdue set, and the colophon state re-evaluates.

### 6.2 Sections, folios and ordering (`ordering.ts`)

The Front Page is **derived, never stored**:

```
today = entries where !deletedAt and bucket = "today" and when = todayKey
      ∪ entries where !deletedAt and status = "open" and when < todayKey    // overdue rolls forward
section I  (TODAY)        = today where !evening, sorted by (status: open first, then order asc)
section II (THIS EVENING) = today where  evening, same sort
folio(entry) = 1-based index across I ++ II counting ONLY open entries; done entries render "—"
```

```ts
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
export const keyAtEnd   = (keys: string[]) => generateKeyBetween(keys.at(-1) ?? null, null);
export const keyBetween = (a: string | null, b: string | null) => generateKeyBetween(a, b);
/** Moving X to index i of list L (L excludes X): exactly ONE record is written. */
export const keyForMove = (L: { order: string }[], i: number) =>
  generateKeyBetween(L[i - 1]?.order ?? null, L[i]?.order ?? null);
/** Renumber the whole list when any key exceeds 40 chars. */
export const renumber = (n: number) => generateNKeysBetween(null, null, n);
```

**Golden values:** `between(null,null) = "a0"` · `between("a0",null) = "a1"` · `between(null,"a0") = "Zz"` · `between("a0","a1") = "a0V"`. **Worked example:** keys `["a0","a1","a2"]`; move the third entry between the first two → `"a0V"`; sorted order becomes `a0, a0V, a1` and folios re-roll `01 02 03`, with one record written.

### 6.3 Quick-add grammar (`quickadd.ts`)

A deterministic ladder; each rung consumes a span and records a chip so the composer can render it inline. chrono-node loads lazily on first focus — **prefetch on hover/`pointerdown`** so the first keystroke is never late.

```ts
export interface Parsed {
  title: string;
  when?: DayKey; time?: { hour: number; minute: number };   // time → reminderAt on `when` (or today)
  deadline?: DayKey; recurrence?: Recurrence; tags: string[]; evening: boolean;
  chips: { kind: "when"|"time"|"deadline"|"repeat"|"tag"|"evening"; text: string; span: [number, number] }[];
}
const EVERY = /\bevery\s+(day|weekday|week|month|year|other\s+day|(\d+)\s+(days?|weeks?)|(mon|tue|wed|thu|fri|sat|sun)[a-z]*(?:(?:\s*,\s*|\s+and\s+|\s*\/\s*)(mon|tue|wed|thu|fri|sat|sun)[a-z]*)*)\b(\s+after\s+done)?/i;
const TAG = /(^|\s)#([\p{L}\p{N}_-]+)/gu;
const BY  = /\b(?:by|due)\s+([^#]+?)(?=\s+#|\s+every\b|$)/i;

// 1. recurrence FIRST, so chrono never sees "every monday"
// 2. #tags (lower-cased, '#' stripped)
// 3. deadline: "by friday" / "due 12 sep" → chrono on the captured span
// 4. remaining text → chrono.parse(text, ref, { forwardDate: true })[0] → when (+ time when the hour is certain)
// 5. a weekly rule with no explicit days anchors on `when` (else today)
// title = what remains, whitespace-collapsed and trimmed
```

`recurrenceFrom` maps `day → daily/1` · `other day → daily/2` · `N days → daily/N` · `weekday → weekdays` · `week → weekly/1 days []` (filled by step 5) · `N weeks → weekly/N` · `mon, wed and fri → weekly/1 days [1,3,5]` · `month → monthly/1` on the day of `when ?? today` · `year → yearly`. A trailing `after done` sets `mode: "afterCompletion"`.

**Worked example**, typed Sunday 2026-09-06 at 20:10 — `Call mom tomorrow 17:00 every week #family`: `every week` → `{kind:"weekly", interval:1, days:[], anchor:"2026-09-07", mode:"fixed"}` + chip `EVERY WEEK`; `#family` → tag + chip; no `by`; chrono → `when 2026-09-07`, `time 17:00`, chip `TOMORROW 17:00`; weekly `days ← [1]` (Monday). Result: title **"Call mom"**, `reminderAt` 2026-09-07T17:00 local, weekly on Mondays, tag `family`. **Parse must complete in under 50 ms.**

**Golden table** (reference 2026-09-06T10:00, Sunday):

| Input | title | when | time | recurrence | tags | evening |
|---|---|---|---|---|---|---|
| `call mom tomorrow 5pm` | `call mom` | 09-07 | 17:00 | — | — | false |
| `renew passport fri` | `renew passport` | 09-11 | — | — | — | false |
| `gym every weekday #health` | `gym` | 09-07 | — | weekdays | `["health"]` | false |
| `water plants every 3 days` | `water plants` | 09-06 | — | daily/3 | — | false |
| `read 20 pages tonight` | `read 20 pages` | 09-06 | — | — | — | **true** (time discarded) |
| `pay rent every month on the 1st` | `pay rent` | 10-01 | — | monthly/1 day 1 | — | false |
| `weekly review every monday 10:00` | `weekly review` | 09-07 | 10:00 | weekly/1 `[1]` | — | false |
| `Buy 3 lemons` | unchanged | — | — | — | — | false (a bare number is not a date) |
| `Meet at 5` | unchanged | — | — | — | — | false (ambiguous "5" without a day or am/pm stays in the title) |
| `Draft README #work #writing` | `Draft README` | — | — | — | `["work","writing"]` | false |
| `every` | `every` | — | — | — | — | false (no unit → no chip, no red) |
| `email@home and C# notes` | unchanged | — | — | — | **[]** | false (`#`/`@` inside a word is not a tag) |

**Edge rules.** An input parsing to an empty title keeps the whole string as the title and drops every chip — **never file a blank entry**. `today` → `when = today`; `tonight` → `when = today` **and** `evening = true`. A time with no date attaches to `when ?? today`, and if that instant is already past, `forwardDate` moves it to tomorrow — the chip shows the resolved day so the user sees it. Parsing the returned `title` again must yield no chips (idempotence). Discarding a chip re-parses with that meaning ignored and leaves the text alone. Chip spans must satisfy `text.slice(start, end) === chipSource`.

### 6.4 Recurrence engine (`recurrence.ts`)

```ts
/** Next occurrence strictly after `base`.
 *  base = the instance's `when` (fixed) or the completion dayKey (afterCompletion). */
export function nextOccurrence(r: Recurrence, base: DayKey): DayKey {
  switch (r.kind) {
    case "daily": return addDays(base, r.interval);
    case "weekdays": {
      let k = addDays(base, 1);
      while (weekdayOf(k) === 0 || weekdayOf(k) === 6) k = addDays(k, 1);
      return k;
    }
    case "weekly": {
      const anchorWeek = startOfWeek(r.anchor);
      for (let k = addDays(base, 1), i = 0; i < 7 * r.interval + 7; k = addDays(k, 1), i++) {
        const weeksApart = daysBetween(anchorWeek, startOfWeek(k)) / 7;
        if (r.days.includes(weekdayOf(k)) && weeksApart % r.interval === 0) return k;
      }
      throw new Error("unreachable: weekly always has >= 1 day");
    }
    case "monthly": {
      let { y, m } = parseKey(base);
      for (let step = 0; step < 24; step++) {
        m += r.interval; while (m > 12) { m -= 12; y++; }
        const dim = daysInMonth(y, m);
        const day = r.day === "last" ? dim : Math.min(r.day, dim);   // CLAMP from the STORED day
        const k = toKey(y, m, day);
        if (k > base) return k;
      }
      throw new Error("unreachable");
    }
    case "yearly": {
      let { y } = parseKey(base);
      for (;;) { y++;
        const k = toKey(y, r.month, Math.min(r.day, daysInMonth(y, r.month)));
        if (k > base) return k; }
    }
  }
}

/** Series bookkeeping when an instance is struck. Pure: returns the record to create, or null. */
export function spawnNext(done: Entry, completedOn: DayKey, nowMs: number, newId: () => Id): Entry | null {
  if (!done.recurrence) return null;
  const base = done.recurrence.mode === "afterCompletion" ? completedOn : (done.when ?? completedOn);
  const when = nextOccurrence(done.recurrence, base);
  return { ...done, id: newId(), status: "open", when,
    bucket: when === completedOn ? "today" : "upcoming",
    completedAt: undefined,
    checklist: done.checklist.map(c => ({ ...c, done: false })),
    reminderAt: done.reminderAt ? shiftReminder(done.reminderAt, done.when!, when) : undefined,
    seriesId: done.seriesId ?? done.id,
    instanceNo: (done.instanceNo ?? 1) + 1,
    order: keyAtEnd([]), createdAt: nowMs, updatedAt: nowMs };
}
```

`shiftReminder(atMs, fromDay, toDay)` moves the reminder by exactly `daysBetween(fromDay, toDay)` days while **preserving the local wall-clock time** — compute with `Date.UTC` day arithmetic, then re-apply the original local hours/minutes, so a DST boundary never shifts the clock time.

**Golden fixtures — all must pass:**

| # | Rule | Mode | base | → next | then |
|---|---|---|---|---|---|
| R1 | daily/1 | fixed | 2026-09-06 | 2026-09-07 | — |
| R2 | weekdays | fixed | 2026-09-04 (Fri) | 2026-09-07 (Mon) | 2026-09-08 |
| R3 | weekly `[1,3,5]` | fixed | 2026-09-06 (Sun) | 2026-09-07 | 2026-09-09 |
| R4 | daily/3 | fixed | 2026-09-01 | 2026-09-04 | 2026-09-07 |
| R5 | daily/3 | afterCompletion, completed 09-06 | 2026-09-06 | **2026-09-09** | contrast with R4 |
| R6 | monthly/1 day **31** | fixed | 2026-01-31 | **2026-02-28** | 2026-03-31, 2026-04-30 — clamps from the stored 31, **never drifts to the 28th** |
| R7 | monthly/1 day `"last"` | fixed | 2026-02-28 | 2026-03-31 | 2026-04-30 |
| R8 | yearly 02-29 | fixed | 2024-02-29 | 2025-02-28 | 2026-02-28, 2027-02-28, **2028-02-29** |
| R9 | weekly/2 `[0]` anchor 09-06 | fixed | 2026-09-06 | 2026-09-20 | skips 09-13 |
| R10 | weekly/2 `[1,4]` anchor 09-07 | fixed | 2026-09-10 (Thu) | **2026-09-21** (Mon) | skips the week of 14 Sep |
| R11 | weekdays | fixed | 2026-10-23 (Fri) | 2026-10-26 (Mon) | crosses the EU DST change of 2026-10-25 with no skip, no duplicate |
| R12 | daily/1 | fixed | 2026-03-28 | 2026-03-29 | DST starts in `Europe/Berlin` |
| R13 | weekly `[0]` (Sun), when 09-07, completed late on 09-09 | fixed | 2026-09-07 | **2026-09-13** | fixed mode ignores the completion date; the next Sunday strictly after Mon 09-07 is 09-13 |

Add a **property test**: 1,000 random (rule, base) pairs satisfy `next > base`, and for `weekly`/`weekdays` `weekdayOf(next)` is in the allowed set. Run the daily case under `Pacific/Kiritimati` (+14) and `Pacific/Pago_Pago` (−11) to prove the floating-time guard.

**Export.** `toRRuleString(r, dtstart)` emits `FREQ=…;INTERVAL=…;BYDAY=…;BYMONTHDAY=…` for backups and future import. One-way in the MVP, and **lossy for monthly-day-31** because RFC 5545 skips short months where Nocturne clamps — note that beside the function. **Describe strings** for the sheet read exactly: `Every day` · `Every 3 days` · `Every weekday` · `Every Monday and Thursday` · `Every 2 weeks on Sunday` · `Monthly on the 31st` · `Monthly on the last day` · `Every year on 29 February`.

### 6.5 Streaks and strength (`streaks.ts`, `strength.ts`)

```ts
const scheduled = (h: Habit, k: DayKey) => !h.scheduleDays || h.scheduleDays.includes(weekdayOf(k));

/** Current streak: walk back from today. Today is GRACE (still open, does not break).
 *  Unscheduled days are skipped — not counted, not breaking. */
export function currentStreak(h: Habit, done: Set<DayKey>, today: DayKey): number {
  let streak = 0, k = today, first = true;
  for (let i = 0; i < 3660; i++, k = addDays(k, -1)) {
    if (scheduled(h, k)) { if (done.has(k)) streak++; else if (!first) break; }
    first = false;
  }
  return streak;
}

/** Best streak: the longest run of consecutive SCHEDULED days done, first completion → today. */
export function bestStreak(h: Habit, done: Set<DayKey>, today: DayKey): number {
  const first = [...done].sort()[0]; if (!first) return 0;
  let best = 0, run = 0;
  for (let k = first; k <= today; k = addDays(k, 1)) {
    if (!scheduled(h, k)) continue;
    run = done.has(k) ? run + 1 : 0; best = Math.max(best, run);
  }
  return best;
}

/** Frequency habits (v1): the unit is the ISO week; the current week is grace. */
export function currentWeekStreak(h: Habit, done: Set<DayKey>, today: DayKey): number {
  let streak = 0, week = startOfWeek(today), first = true;
  for (let i = 0; i < 520; i++, week = addDays(week, -7)) {
    const n = countInRange(done, week, addDays(week, 6));
    if (n >= h.frequency.times) streak++; else if (!first) break;
    first = false;
  }
  return streak;
}

/** Strength — Loop's exponential smoothing, re-implemented from the published formula. */
export function strength(h: Habit, done: Set<DayKey>, frozen: Set<DayKey>, today: DayKey): number {
  const freq = h.frequency.per === "day" ? 1 : h.frequency.times / 7;
  const mult = Math.pow(0.5, Math.sqrt(freq) / 13);        // daily: 0.5^(1/13) = 0.948078
  const first = [...done].sort()[0]; if (!first) return 0;
  let score = 0;
  for (let k = first; k <= today; k = addDays(k, 1)) {
    if (!scheduled(h, k) || frozen.has(k)) continue;        // skipped/frozen days leave the score untouched
    const check = h.frequency.per === "day" ? (done.has(k) ? 1 : 0)
      : Math.min(1, countInRange(done, addDays(k, -6), k) / h.frequency.times);
    score = score * mult + check * (1 - mult);
  }
  return Math.round(Math.min(1, Math.max(0, score)) * 100);   // 0–100 for the ring
}
```

**Golden numbers** (daily from zero, `score = 1 − 0.948078ⁿ`, tolerance ±0.0005): n = 1 → 5 % · 7 → 31 % · **13 → 50 %** (the half-life) · 26 → 75 % · **30 → 80 %** · 39 → 88 % · **30 then one miss → 0.798 × 0.948078 = 0.757 → 76 %** — visible, survivable, never zero. `multiplier(3/7) ≈ 0.965697`, so a 3×/week habit reads 36 % at 13 days. A daily habit at 0.75 missing 13 scheduled days decays to 0.375. An unscheduled day leaves the score byte-identical. A `frozen: true` completion satisfies the **streak** walk but contributes `check = 0` to the **score**.

**Streak fixtures.** Schedule Mon–Fri, today Sunday 2026-09-06, done `{09-04, 09-03, 09-02}`, 09-01 missed: Sun skip, Sat skip, Fri +1, Thu +2, Wed +3, Tue missed → stop → **current 3**. A daily habit done 08-26…09-05 with today 09-06 not yet done → `current 11`, `best 11` (today is grace); the same set with today 09-07 and 09-06 never done → `current 0`. `bestStreak(["09-01","09-02","09-04","09-05","09-06"])` = 3, order-independent, duplicates ignored, empty → 0. The walk is capped at 3,660 iterations and returns in under 5 ms for 20 years of completions.

**Issue streak** (for the colophon): `issueStreak(issues, today)` counts consecutive `closedAt` days walking back from **yesterday** (today counts once it closes), stopping at the first day that had an issue but was not closed. **Days with no issue at all are skipped** — a day you filed nothing does not break the streak.

### 6.6 Issue close/reopen and the strike transaction (`issue.ts`, `colophon.ts`, `repo.ts`)

```ts
export function deriveIssue(prev: Issue | undefined, dayEntries: Entry[], dayKey: DayKey,
                            settings: Settings, now: number, streakBefore: number): Issue {
  const live = dayEntries.filter(e => !e.deletedAt);
  const total = live.length, done = live.filter(e => e.status === "done").length;
  const shouldClose = total >= 1 && done === total;
  const wasClosed = !!prev?.closedAt;
  return { dayKey, issueNo: issueNumber(dayKey, settings.firstIssueDay), total, done,
    closedAt: shouldClose ? (prev?.closedAt ?? now) : undefined,
    streakAtClose: shouldClose ? (wasClosed ? prev!.streakAtClose : streakBefore + 1) : undefined,
    standfirst: prev?.standfirst,        // survives a reopen
    updatedAt: now };
}
```

**Rules.** (1) Closing happens only through a strike; deleting the *only open* entry when others are done **does** close the issue (`done === total`), while deleting every entry leaves `total = 0` → no issue. (2) Adding an open entry to a closed day **reopens** it — `closedAt` clears, the colophon un-draws, the standfirst is kept. (3) Striking again re-closes with a **fresh** `closedAt`. (4) The colophon renders when `issue.closedAt` is set **and** `dayKey === todayKey`, and animates only when `closedAt` changed this session.

```ts
export async function strike(entryId: Id, now = Date.now()): Promise<Undo> {
  return db.transaction("rw", db.entries, db.issues, db.meta, async () => {
    const e = await db.entries.get(entryId);
    if (!e || e.status === "done") throw new NotOpenError();
    const today = todayKeyNow(), before = structuredClone(e);
    await db.entries.update(e.id, { status: "done", completedAt: now, updatedAt: now, recurrence: undefined });
    const next = spawnNext(e, today, now, newId);
    if (next) await db.entries.add(next);
    const { before: issueBefore } = await recomputeIssue(e.when ?? today, now);
    await bumpRevision();
    return { kind: "strike", before, nextId: next?.id, issueBefore, expiresAt: now + 5000 };
  });
}
export async function undo(u: Undo) {          // from UndoFoot, within 5 s
  await db.transaction("rw", db.entries, db.issues, db.meta, async () => {
    await db.entries.put({ ...u.before, updatedAt: Date.now() });
    if (u.nextId) await db.entries.update(u.nextId, { deletedAt: Date.now(), updatedAt: Date.now() });
    if (u.issueBefore) await db.issues.put(u.issueBefore); else await db.issues.delete(u.before.when!);
    await bumpRevision();
  });
}
```

Undo is a **one-slot store**, not an event log; it expires after exactly 5 s or on the next mutating action, whichever comes first.

**Colophon sentences** (`colophon.ts`), exact: `Issue No. 249` / `Closed at 21:14. Seven entries.` / `Streak 12 days. Longest 31.` / `Set in Bricolage Grotesque & Geist.` Issue No. 1 omits the time (`Closed. Three entries.` / `Streak 1 day.`). Singular forms are `One entry.` and `Streak 1 day.`; counts up to twelve are words (`One`…`Twelve`) and **from 100 upwards are numerals** (`100 entries.`). `shouldPrintColophon(entries)` is true only when every Today **and** This Evening entry is done and there is at least one — an empty day never prints.

### 6.7 Backup merge (`merge.ts`)

```
for table in [entries, habits, completions, issues, settings]:
  for r in remote[table]:
    l = local.get(r.pk)
    if !l                              → put(r)
    else if r.updatedAt > l.updatedAt  → put(r)          // whole-record last-writer-wins
completions: pk is `${habitId}:${dayKey}` → union; on a tie keep max(value)
after merge: purge tombstones with deletedAt < now − 90 days
             revision = max(local, remote) + 1; lastSyncAt = now; syncSchedules()
```

A local tombstone beats an older remote live record; a newer remote edit resurrects it only if `remote.updatedAt > local.deletedAt`. Tombstones at 89 days are kept, at 91 days purged. **Merging the same remote twice changes nothing** — assert idempotence. A legacy export with no `deletedAt` fields imports without throwing, treating missing as live. Conflicts *inside* one record resolve whole-record LWW; that is acceptable for one user with two devices, and the Colophon backup copy says so plainly.

### 6.8 Climbing scale (`scale.ts`, `features/sound/synth.ts`)

```ts
const PENTATONIC = [0, 2, 4, 7, 9];                       // C D E G A
export const scaleHz = (n: number) =>
  261.63 * Math.pow(2, (PENTATONIC[n % 5] + 12 * Math.floor(n / 5)) / 12);

export function playStrike(n: number, ctx: AudioContext, master: GainNode) {
  tick(ctx, master);                                      // 40 ms band-passed noise, −18 dBFS
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.value = scaleHz(n);
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime + 0.62);
}
```

`n` = strikes so far today, reset at rollover and decremented by an undo. Expected: `0 → C4 261.63` · `1 → D4 293.66` · `2 → E4 329.63` · `3 → G4 392.00` · `4 → A4 440.00` · `5 → C5 523.25` · `6 → D5 587.33` · `10 → A5 880.00`. The `AudioContext` is created lazily on the first pointer/touch event. **No audio file may appear in `dist/`** — assert it.

### 6.9 Share card (`features/colophon/ShareCard.tsx`, v1)

Build a 1080 × 1920 SVG string from the frozen issue (masthead numeral, gauge rule at the close fraction, entries as struck lines, colophon text); embed the fonts as `@font-face` with `data:font/woff2;base64,…` read once from the Fontsource files (`import url from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url"` → `fetch` → base64, cached in memory); then `Blob → Image → canvas.drawImage → canvas.toBlob("image/png")`. Web: `<a download="nocturne-issue-249.png">`. Android: `Filesystem.writeFile({ path: "share/issue-249.png", data: base64, directory: Directory.Cache })` → `Share.share({ files: [uri] })`. **Fallback:** some WebViews refuse `@font-face` inside an `<img>`-loaded SVG — if the render comes out in the fallback font, re-render with system fonts and note it in the card footer rather than shipping a broken image.

## 7. DATA SOURCES & APIS

Nocturne bundles **no dataset** and calls **no API by default** — no weather, no dictionary, no LLM, no CDN, no font host, no icon host, no analytics endpoint. The production bundle makes zero network requests until the user configures a backup target with their own credential. Everything here is optional and user-initiated.

### 7.1 GitHub Gist backup (v1) — `src/data/gist.ts`

The only network feature in scope. The user pastes a **fine-grained PAT** with exactly one permission: *Account permissions → Gists: Read and write*. CORS is `*` on both hosts, so no proxy is needed. Headers on every call: `Authorization: Bearer <PAT>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`.

| Operation | Request | Response used |
|---|---|---|
| Verify | `GET https://api.github.com/user` | `login` → `Backing up as @login` |
| Create | `POST https://api.github.com/gists` body `{ "description": "Nocturne backup", "public": false, "files": { "nocturne.json": { "content": "<export json>" } } }` | `201` → `id`, `html_url`; store `settings.backup.gistId` |
| Update | `PATCH https://api.github.com/gists/{id}` with the same `files` map | `200` → `updated_at` |
| Restore | `GET https://api.github.com/gists/{id}` | `files["nocturne.json"].content`; if `truncated: true`, follow `raw_url` on `gist.githubusercontent.com` (CORS `*`) |

**Rules.** Keep each file under 1 MB; when the export exceeds 800 KB, shard into `nocturne.json` (settings + issues + habits), `entries.json` and `completions.json`. The 5,000/h rate limit is irrelevant but handled: a `403`/`429` with `x-ratelimit-remaining: 0` shows `Rate-limited until HH:MM` from `x-ratelimit-reset`. **Auto-backup** at most once per 6 hours, only when `meta.revision` changed, never on a metered connection (`navigator.connection?.saveData`). **Error copy, always inline in the Colophon row and never a modal:** `401` → `Token rejected — check the Gists permission`; `404` → `Backup gist not found — Create a new one`; offline → `Offline — will retry` in `--ink-muted`, because being offline is not an error. The token renders as `PAT ····· 7f`, is forgettable in one tap, and never reaches an export, a log or the DOM.

**Token storage (`src/platform/secrets.ts`).** Web: WebCrypto AES-GCM with a key generated `extractable: false` in IndexedDB; `localStorage` holds only ciphertext + IV. Android: `@capacitor/preferences` with the same ciphertext. "Session only" keeps it in memory alone. CSP in `index.html`: `connect-src 'self' https://api.github.com https://gist.githubusercontent.com; script-src 'self'; object-src 'none'; base-uri 'self'` — add Google origins only if Drive is actually built.

### 7.2 Google Drive `appDataFolder` (someday, optional)

Only if the owner asks. Web uses the GIS token model (`google.accounts.oauth2.initTokenClient`, scope `https://www.googleapis.com/auth/drive.appdata` — non-sensitive, so no verification and no warning once the consent screen is published to Production): list `GET /drive/v3/files?spaces=appDataFolder`, create `POST /upload/drive/v3/files?uploadType=multipart` with `parents: ["appDataFolder"]`, update `PATCH /upload/drive/v3/files/{id}?uploadType=media`, download `GET /drive/v3/files/{id}?alt=media`. The client ID is **public configuration, not a secret** — a repo *variable* `VITE_GOOGLE_CLIENT_ID`, with the Drive row hidden when it is empty. On Android the GIS script is blocked inside a WebView, so Drive needs `@capgo/capacitor-social-login` (MPL-2.0) with an Android OAuth client registered against the CI keystore's SHA-1; **ship it only if a real device test returns a non-null `accessToken`**, otherwise hide the row.

### 7.3 Attribution

`README.md` carries this table and the Colophon renders the short form (`Set in Bricolage Grotesque, Geist & Geist Mono (SIL OFL). Motion, Dexie, chrono-node, Lucide. Nocturne <version>.`): Bricolage Grotesque (Mathieu Triay), Geist and Geist Mono (Vercel) — **SIL OFL 1.1** · Lucide — **ISC** · Motion — **MIT** · Dexie, dexie-react-hooks, dexie-export-import — **Apache-2.0** · React, Vite, React Router, Zustand, Tailwind, date-fns, chrono-node, vite-plugin-pwa, cmdk, Biome, Vitest, Playwright — **MIT** · fractional-indexing (David Greenspan) — **CC0-1.0** · Capacitor and plugins — **MIT** · shadcn/ui on Base UI — **MIT** · habit strength formula — re-implemented from the published description of Loop Habit Tracker's score; Loop is GPL-3.0, is not a dependency, and no GPL code is copied · sounds — none bundled, all Web Audio · app icon, splash and share card — original artwork. Runtime services (optional, user-configured): the GitHub Gist REST API. Nothing is sent anywhere unless the user configures it.

## 8. PLATFORM INTEGRATION (Capacitor 8 / Android)

```ts
// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.rahul.nocturne", appName: "Nocturne", webDir: "dist",
  android: {
    webContentsDebuggingEnabled: false,   // true ONLY on a workflow_dispatch debug branch, never on a tag
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: { backgroundColor: "#0A1024", launchFadeOutDuration: 0,
                    androidScaleType: "CENTER", showSpinner: false, launchAutoHide: true },
    LocalNotifications: { smallIcon: "ic_stat_nocturne", iconColor: "#E8C170" },
    Keyboard: { resize: "none" },         // the composer translates itself; the page never jumps
  },
};
export default config;
```

**Plugin map.** `local-notifications` → `platform/notifications.ts` (§8.2), with permission requested **only after Issue No. 1 closes** and the channel created once via `createChannel({ id: "reminders", name: "Reminders", importance: 4 })` · `haptics` → `platform/haptics.ts`, falling back to `navigator.vibrate(8)` on web, **never on scroll** · `app` → `platform/system.ts`, where `appStateChange → isActive` triggers `syncSchedules()` and a rollover check, `appUrlOpen` handles deep links and `backButton` closes sheets · `status-bar` plus `SystemBars` (already in `@capacitor/core` 8.5) → `setOverlaysWebView({ overlay: true })`, `setStyle` per theme, transparent background, content padded with `env(safe-area-inset-*)` and the Capacitor fallback vars · `keyboard` → the composer listens to `keyboardWillShow` and translates by `keyboardHeight` · `splash-screen` → navy + foil "N", instant fade-out · `filesystem` + `share` → backup export and the share card via `Directory.Cache` · `preferences` → PAT ciphertext and the theme mirror · `capacitor-widget-bridge` (someday) → `{ issue, done, total, next, streak, gauge }` after writes affecting today.

### 8.1 Manifest and resources

`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED` and `VIBRATE` are merged in by the plugins' own manifests; redeclaring them in `android/app/src/main/AndroidManifest.xml` is harmless and makes intent explicit. **Deliberately absent:** `USE_EXACT_ALARM` (reserved for alarm-clock apps) and every storage/camera/location/network-state permission; `INTERNET` stays, for Gist. Inside the existing `<activity android:name=".MainActivity" android:exported="true" android:launchMode="singleTask">` add:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="nocturne" />
</intent-filter>
```

`App.addListener("appUrlOpen", …)` maps `nocturne://today` → `#/`, `nocturne://entry/<id>` → `#/?entry=<id>` (opens the sheet) and `nocturne://complete/<id>` → `strike(id)`. **Accept only these three shapes; ignore anything else silently.**

Resources under `android/app/src/main/res/`: `values/colors.xml` (the four token mirrors from §3.13) · `drawable/splash.xml` (layer-list: `@color/nocturne_bg` + centred foil "N" vector) · `drawable/ic_stat_nocturne.xml` (white "N", 24 dp) · `mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` (adaptive icon with background, foreground and `<monochrome>` layers — **delete the Capacitor placeholder PNG mipmaps**) · `values/strings.xml` (`app_name = Nocturne`, `custom_url_scheme = com.rahul.nocturne`) · `values/styles.xml` (`AppTheme.NoActionBarLaunch` with `windowSplashScreenBackground = @color/nocturne_bg`). Add `android:enableOnBackInvokedCallback="false"` to `<application>` **only** if predictive back misbehaves on the test device.

### 8.2 Notification planning (`engine/notifications-plan.ts` + `platform/notifications.ts`)

IDs must be **31-bit positive ints** (Java `int`); id `1` is reserved for the daily review.

```ts
export const notifId = (entryId: Id) => {                 // FNV-1a 32-bit, masked positive, never 0 or 1
  let h = 0x811c9dc5;
  for (const ch of entryId) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  const v = (h >>> 0) & 0x7fffffff;
  return v < 2 ? v + 2 : v;
};
export interface Planned { id: number; at: number; title: string; body: string;
                           extra: { entryId?: Id; kind: "entry" | "review" } }

export function planNotifications(entries: Entry[], s: Settings, now: number): Planned[] {
  const horizon = now + 14 * 86_400_000;                  // never schedule beyond 14 days
  return entries
    .filter(e => e.status === "open" && !e.deletedAt && e.reminderAt
                 && e.reminderAt > now && e.reminderAt <= horizon)
    .map(e => ({ id: notifId(e.id), at: e.reminderAt!,
      title: s.privateReminders ? "Nocturne" : e.title,
      body:  s.privateReminders ? "An entry is due" : (e.notes.split("\n")[0] ?? ""),
      extra: { entryId: e.id, kind: "entry" as const } }));
}

/** Diff desired against pending: what to cancel, what to schedule. Nothing else is touched. */
export function diffSchedules(desired: Planned[], pending: { id: number; at?: number }[]) {
  const want = new Map(desired.map(p => [p.id, p]));
  const cancel = pending.filter(p => p.id !== 1 && (!want.has(p.id) || want.get(p.id)!.at !== p.at))
                        .map(p => p.id);
  const have = new Set(pending.filter(p => !cancel.includes(p.id)).map(p => p.id));
  return { cancel, schedule: desired.filter(p => !have.has(p.id)) };
}

export async function syncSchedules() {
  if (!isNative()) return webFallbackScheduler();
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== "granted") return;
  const desired = planNotifications(await db.entries.toArray(), settings, Date.now());
  const pending = (await LocalNotifications.getPending()).notifications
    .map(n => ({ id: n.id, at: n.extra?.at as number | undefined }));
  const { cancel, schedule } = diffSchedules(desired, pending);
  if (cancel.length) await LocalNotifications.cancel({ notifications: cancel.map(id => ({ id })) });
  if (schedule.length) await LocalNotifications.schedule({ notifications: schedule.map(p => ({
    id: p.id, title: p.title, body: p.body, actionTypeId: "ENTRY", extra: { ...p.extra, at: p.at },
    schedule: { at: new Date(p.at), allowWhileIdle: true },
    smallIcon: "ic_stat_nocturne", channelId: "reminders" })) });

  // The daily review uses `on:` — cron-like, re-arms itself with setExact*.
  // `at` + `repeats` would degrade to an INEXACT setRepeating. Do not use it.
  const open = await countOpenToday();
  if (settings.dailyReview.enabled) {
    await LocalNotifications.schedule({ notifications: [{ id: 1, title: "Evening Edition",
      body: open === 0 ? "Nothing left open." : open === 1 ? "1 entry still open."
                                              : `${open} entries still open.`,
      schedule: { on: { hour: settings.dailyReview.hour, minute: settings.dailyReview.minute },
                  allowWhileIdle: true },
      extra: { kind: "review" }, channelId: "reminders" }] });
  } else {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  }
}
```

**`syncSchedules()` runs** after every repo write touching `reminderAt`, `status` or `deletedAt` (debounced 500 ms), on `App.appStateChange → isActive`, after an import and after a merge.

**Actions.** `registerActionTypes({ types: [{ id: "ENTRY", actions: [{ id: "done", title: "Done" }, { id: "snooze", title: "Snooze 1 h" }] }] })`; in `localNotificationActionPerformed`, `done` → `strike(entryId)`, `snooze` → `reminderAt += 3_600_000` then re-sync, a plain tap → `#/?entry=<id>` with the sheet open.

**Exactness.** `SCHEDULE_EXACT_ALARM` is **denied by default on Android 14+**. On first reminder creation and on every resume call `checkExactNotificationSetting()`; when `denied`, render the foil footnote in the entry sheet and the Colophon (`¹ Reminders may be delayed until you allow "Alarms & reminders". Open ›`) wired to `changeExactNotificationSetting()`. Reminders still schedule inexactly meanwhile — the app degrades, it does not break. **Doze:** `allowWhileIdle: true` permits delivery but only once per ~9 minutes per app, so schedule one daily digest plus per-entry reminders, never dozens of near-simultaneous alarms. **Reboot:** the plugin's restore receiver re-registers saved schedules, but do not rely on it alone — `syncSchedules()` on resume is the safety net, because OEM cleaners and a revoked exact-alarm permission both wipe pending alarms. **OEM battery killers:** document, do not fight — ship a "Reminders not firing?" page linking to `dontkillmyapp.com` in the system browser and explaining that a force-stop drops all alarms until the app is opened again.

### 8.3 Web vs Android

| Concern | Web | Android |
|---|---|---|
| Service worker | Registered (`registerType: "prompt"`) | **Never** — `VITE_PLATFORM=android` removes the PWA plugin; assert `dist/` has no `sw.js` |
| Vite `base` | `/nocturne/` | `/` |
| Reminders | Only while the tab is open: a `setTimeout` scheduler recomputed on every write, plus a `Notification` if permission was granted from the Reminder row. **Say so plainly in the UI** | Real `AlarmManager` alarms, surviving reboot |
| Haptics | `navigator.vibrate(8)` | `@capacitor/haptics` |
| Export / import | `createObjectURL` + `<a download>` / `<input type="file">` | `Filesystem` + `Share` / the same file input, which works in the WebView |
| Storage | `navigator.storage.persist()` after the first filed entry; report the result honestly | App-private; never call `persist()` |
| Secrets | WebCrypto AES-GCM | `@capacitor/preferences` |
| Safe areas | none | `env(safe-area-inset-*)` wherever the shell touches an edge |

**Native code:** none in MVP or v1. The someday widget is one Kotlin `AppWidgetProvider` plus one XML layout, compiled only in CI.

## 9. BUILD ORDER WITH CHECKPOINTS

Work strictly in this order; run the command and verify the result before continuing.

### Phase 0 — Live on day 1 (≈ 1 day)

**0.1 Scaffold.** `npm create vite@latest . -- --template react-ts` (choose "Ignore files and continue"), then install every package in §2.1, `npx biome init`, `npx playwright install chromium`, `npx shadcn@latest init && npx shadcn@latest add dialog`. → *`npm run dev` serves; `npx biome check .` and `npx vitest run` pass with one placeholder test.*

**0.2 Vite config and router.** Write `vite.config.ts` (§11.1) and `src/app/router.tsx` with `createHashRouter` and six placeholder routes. → *`npm run build && npx vite preview --base /nocturne/`, then `http://localhost:4173/nocturne/#/ledger` reloads with no 404.*

**0.3 Tokens and fonts.** Paste §3.3 into `src/styles/tokens.css`, add `motion.ts` and the `@theme inline` bridge, import the three Fontsource packages (**Bricolage via `/full.css`**). → *All three families render; `"opsz" 96` and `"opsz" 12` differ visibly; font transfer ≤ 350 KB.*

**0.4 Theme bootstrap.** An inline script in `index.html` reads `localStorage["nocturne.theme"]` and sets `data-theme` **before first paint**, falling back to `prefers-color-scheme`. → *With Auto, flipping the OS theme flips Night/Proof on reload with no flash.*

**0.5 Pages live.** Add `pages.yml` (§11.2), `git init -b main`, `gh repo create nocturne --public --source . --push`, Settings → Pages → Source = **GitHub Actions**. → *The URL serves the placeholder with fonts; `curl -I …/manifest.webmanifest` returns 200; Chrome on the phone offers "Install app".*

**0.6 Android shell.** `npx cap init Nocturne com.rahul.nocturne --web-dir dist && npx cap add android` (a "Gradle sync failed" warning without a local SDK is expected), add the `.gitattributes` lines from §11.5, `git update-index --chmod=+x android/gradlew`, and merge the Gradle block from §11.4 with `namespace`/`applicationId` = `com.rahul.nocturne`. → *`git diff` shows only the `android { … }` block changed; `android/` is committed except the §11.5 ignores.*

**0.7 Keystore and secrets.** Run the script in §11.4 in Git Bash **outside the repo**, then `gh secret set` the four values. → *`gh secret list` shows all four.* **Back up the `.p12` and passphrase in three places before continuing.**

**0.8 First APK.** Add `android-release.yml` (§11.3), run it once via `workflow_dispatch` **before** any tag, then `git tag v0.0.1 && git push origin v0.0.1`. → *Release `v0.0.1` carries `nocturne-0.0.1.apk` + `SHA256SUMS.txt`; the APK installs and opens.*

**0.9 Icons and splash.** Draw `public/icon.svg`, run `npx pwa-assets-generator --preset minimal-2023 public/icon.svg`, add the Android layers from §8.1. → *Home-screen icon and splash are navy/foil; the notification small icon is a white "N".*

**DoD:** placeholder live on Pages **and** installed from a signed Release APK; CI green; fonts and tokens loaded; keystore backed up.

### Phase 1 — Design system and skeleton (≈ 4 days)

Build `design/preview.html` (§3.13) → *every element of §4 present, all text ≥ 4.5:1.* Then `components/ui` (Sheet, Button, Segmented, Input, Chip, Footnote, MonoTable, RunningHead) plus a dev-only `/#/_kit` route → *focus rings visible on every variant.* Then `DigitRoll` → *rolling `3/7 → 4/7` animates only the changed column and reads "4 of 7".* Then `Masthead` + `DayGauge` + the roll → *the gauge matches `dayGauge()`; `role="progressbar"` carries `aria-valuetext`.* Then `Shell` with phone tabs and the desktop rail → *`[`/`]` switch tabs; View Transitions where supported.* Then all five screens with `src/data/fixtures.ts` → *Playwright baselines committed at 390 × 844 and 1280 × 800 in Night, Proof, Evening and reduced-motion.* Then the grain overlay, the evening turn and `MotionConfig reducedMotion="user"` → *grain off in Proof; at the evening hour the ground shifts and the head reads `EVENING EDITION`.*

**DoD:** every screen exists with fixture data and matches the preview; baselines committed; **no hex outside `tokens.css`.** ⚠ "Looks unfinished" is this concept's known failure mode — tune row height, title size and greeting before moving on.

### Phase 2 — Engine, then data, then features (≈ 7 days)

**2a Engine — write the test first, every time.** In order: `ids.ts` and `daykey.ts` (§6.1) → *rollover at 01:30/02:59/03:00, issue numbering, gauge at 21:14, `isEvening` across midnight, the Berlin repeated hour; 100 % branch coverage.* `ordering.ts` (§6.2) → *four canonical values; one record per reorder; renumber at > 40 chars.* `recurrence.ts` (§6.4) → *all thirteen rows, the property test, the ±14 h runs.* `quickadd.ts` (§6.3) with a mocked now of 2026-09-06T20:10 → *the worked example and all twelve rows; chip spans exact.* `streaks.ts` + `strength.ts` (§6.5) → *current 3; 50/80/76 %; frozen day inert.* `issue.ts`, `colophon.ts`, `notifications-plan.ts`, `merge.ts`, `scale.ts` → *close/reopen/re-close passes; sentences exact; `diffSchedules` never touches id 1; merge idempotent.*

**2b Data layer.** `db.ts` schema v1 and the full `repo.ts` API (§5), then the first-launch seed. → *Every repo function tested on `fake-indexeddb`; `strike` + `undo` restores an exact snapshot; a fresh profile shows `Welcome to your first issue.` and `0 / 3`.*

**2c Front Page + Composer.** `EntryList` on `useLiveQuery` with Motion `layout` and `DigitRoll` folios, vermilion on **only the first** overdue row → *adding an entry re-sets the list in 240 ms; no row pops.* Composer with lazy chrono prefetched on hover → *the worked example files; a parse miss shows no chips and no red.* Ink Strike → *complete within 600 ms; `aria-live` announces; undo restores the original folio.* Margin Words → *12 px/250 ms arbitration verified on a real phone.* Folio Renumber → *20 rows at 60 fps in the WebView; one DB write per drop.* UndoFoot → *expires at exactly 5 s.* Rollover ticker → *faking the clock across 03:00 rolls the masthead and moves yesterday's open entries to overdue.*

**2d Sheets and Week Spread.** Entry sheet, When sheet, RepeatPicker, Week Spread, Someday (§4.2, §4.5–4.6). → *Every field round-trips; focus is trapped and returned; "monthly on 31" from 2026-01-31 previews 28 Feb, 31 Mar, 30 Apr; striking a recurring entry spawns the next instance under the right day-head.*

**2e Ledger, Back Issues, Colophon, backup.** → *Streaks and rings match the fixtures; `Heatmap12` renders 84 cells in < 4 ms; closing Issue No. 1 prints its colophon; adding an entry reopens it and the standfirst survives; export → clear site data → import restores everything.*

**DoD:** a complete daily tracker on web; engine coverage ≥ 95 % (100 % on `recurrence`, `streaks`, `strength`, `daykey`); the flow *file → strike → colophon → back issue* passes. ⚠ Disable `layout` on the row being dragged. ⚠ Test time-zone travel with `TZ=America/Los_Angeles npx vitest`.

### Phase 3 — Polish, motion, sound (≈ 2 days)

Audit every animation against §3.7 (keep `docs/motion-audit.md` with a tick per row) · evening-turn polish and the status-bar style · the sound synth → *seven strikes play C4 D4 E4 G4 A4 C5 D5; silent at 23:30; no audio files in `dist/`* · the haptics map with its web fallback and no-scroll rule · the full keyboard map → *Playwright drives a whole day with the keyboard only* · every empty/loading/error state, each with a committed screenshot · a text-scaling pass at 130 % and 320 px · a performance pass (lazy chunks, `content-visibility: auto`, `React.memo` on `EntryRow`, CI size gate) → *Lighthouse mobile LCP < 2.0 s cold, a11y ≥ 95, a 60 fps drag trace.*

### Phase 4 — Android packaging (≈ 2 days, all on a real phone)

Use `workflow_dispatch` builds for fast loops and verify each on device: notifications complete (§8.2) → *a 3-minute reminder fires with the app closed, the 21:00 review has the right count, both survive a reboot* · exact-alarm onboarding → *the footnote appears until allowed, then disappears on return* · notification actions → *each works from a killed app* · edge-to-edge and system bars → *nothing under the status bar or nav pill in either theme; predictive back closes sheets* · keyboard avoidance → *the masthead does not jump* · splash and icon → *navy splash → masthead roll, no white flash* · backup via share sheet and file picker · the "Reminders not firing?" page → *renders offline, opens links externally* · deep links → *a notification tap opens the right entry* · release hygiene → *`v0.2.0` installs over `v0.1.0` and data survives.*

### Phase 5 — Testing and launch (≈ 3 days)

Complete §10 in full; run the axe sweep on every route; a data drill (5,000 entries, 20 habits × 2 years); time drills (rollover, both DST nights, leap day, travelling +9 h); update the README with the live URL and screenshots; verify `npx license-checker --summary` against §7.3. Then tag `v1.0.0`, install it, and use it as the only task list for one week, logging friction in `docs/JOURNAL.md`.

### Phase 6 — Stretch, chosen by real friction

Desktop rail with mini calendar and `⌘K` Quick Find · Week Spread desktop board with cross-day drag (spike `@dnd-kit/core` first; keep whichever coexists with Motion `Reorder`) · frequency habits and freeze tokens · Gist backup with LWW merge · Markdown export · the share PNG · weekly review running heads · private reminders · 🔮 Android widget · 🔮 Google Drive · 🔮 an RRULE import adapter · 🔮 paste-a-list → checklist.

### Weekend MVP fast path

If the goal is "use it Monday morning": **Saturday** — all of Phase 0; then `daykey`, `ordering`, `quickadd` (dates, times, `#tag`, `every day|weekday|week` only), `recurrence` (daily, weekdays, weekly), `streaks`, `strength`, `issue` with their fixtures; then `db.ts`, `repo.ts` (`addEntry`, `strike`, `undo`, `moveTo`, `reorder`, `toggleCompletion`, `saveSettings`) and the seed. **Sunday** — Masthead + DayGauge (a plain fade instead of the roll is acceptable), RunningHead, EntryRow with strike by folio tap and swipe, Margin Words, hold-to-reorder, UndoFoot; Composer with chips; When sheet; Week Spread phone run; Someday; Ledger with streak and ring; the colophon draw; Back Issues; settings for theme/evening hour/rollover plus JSON export/import; notifications with the daily review and per-entry reminders (inexact is fine); tag `v0.1.0`, install, and file tomorrow's issue before bed. Deferred without guilt: desktop layout, sound, heatmap, standfirst, share card, keyboard map, exact-alarm onboarding, Gist, visual tests.

## 10. TESTING REQUIREMENTS

Scripts: `"test": "vitest"` · `"test:unit": "vitest run --coverage"` · `"test:e2e": "playwright test"` · `"test:visual": "playwright test e2e/visual"` · `"test:a11y": "playwright test e2e/a11y.spec.ts"` · `"test:all": "npm run test:unit && npm run build && npm run test:e2e"`.

**Determinism (non-negotiable).** Every engine test passes an explicit `now`/`today`; **no engine code reads `Date.now()`**. The house fixture instant is `2026-09-06T21:14:00`, a **Sunday**, issue No. 249, gauge 0.76. `TZ=Asia/Kolkata` is pinned in `vitest.config.ts` and `playwright.config.ts`; DST cases set the zone per test with `@date-fns/tz` `TZDate`, never by mutating the process. Playwright freezes the clock with `page.clock.install({ time: … })` **before** navigation. IDs and fractional keys use a seeded PRNG so snapshots are stable.

| Layer | Tool | Gate |
|---|---|---|
| Engine | Vitest, `environment: node` | Every golden table in §6; ≥ 95 % lines on `src/engine`, **100 % on `recurrence`, `streaks`, `strength`, `daykey`** |
| Repo | Vitest + `fake-indexeddb` | Every `repo.ts` function; `strike` + `undo` exact-snapshot restore; tombstones instead of deletes; schema upgrade keeps every row |
| Component | Testing Library + user-event (jsdom) | Entry, Composer, DigitRoll, Sheet, Colophon, LedgerLine, Footnote, Theme, the keyboard map |
| E2E | Playwright, `desktop-chromium` 1280 × 800 and `pixel-7` (`hasTouch`) | The twelve flows below, in `ci.yml` — never in `pages.yml`, so a flaky gesture cannot block a deploy |
| Visual | `toHaveScreenshot`, `maxDiffPixelRatio: 0.01`, `animations: "disabled"`, baselines on **Linux CI only** | The app matches `design/preview.html` |
| A11y | `@axe-core/playwright` (`wcag2a wcag2aa wcag21aa`) + manual | Zero serious/critical |
| Perf | Playwright traces + Lighthouse | The budgets below, before every tag |
| Device | The manual checklist below | Before every `v*` tag |

**Golden fixtures** live in `src/engine/__golden__/` as data files, not inline literals: `calendar.json`, `recurrence.json`, `quickadd.json`, `streaks.json`, `score.json`, `ordering.json`, `colophon.json`, `merge.json`, plus `backup-v1.json` (12 entries, 3 habits, 40 completions, `revision 7`) and `backup-v0-legacy.json` (the same without `deletedAt`). **If a test disagrees with a golden, suspect the code first, then the golden — and record any correction here.**

**The twelve e2e flows.** (1) **First open** — fresh origin → `No. 1`, `Welcome to your first issue.`, three teaching entries, `0 / 3`, no prompt, no overlay; striking all three prints the colophon and the standfirst input. (2) **Compose** — `call mom tomorrow 5pm #family` chips then files into **Upcoming**, not Today; `read 20 pages tonight` lands in `II — THIS EVENING` and the counter rolls. (3) **Strike + undo** — folio tap dims the title, adds `closed 21:14`, rolls the counter, re-sets the row; Undo within 5 s restores everything including the folio. (4) **Gestures** (pixel-7) — 100 px right strikes, 60 px springs back, left opens the When sheet; a 300 ms hold lifts (assert computed `--surface` and `12px` radius) and a 70 px drag reorders and persists across reload; a 40 px vertical pan within 200 ms scrolls and changes nothing; a swipe starting at x = 8 px does nothing. (5) **Ledger** — tapping extends the ring, rolls the streak, survives reload, and tapping again removes it. (6) **Rollover** — `clock.runFor` past 03:00 → `No. 250`, `MON 07 SEP`, Today shows only tomorrow's entries, yesterday is in Back Issues as `open`. (7) **Theme + evening** — Proof sets the attribute, `--bg` computes `#F5F1E8`, grain 0, survives reload; changing the evening hour flips the ground and head over 480 ms. (8) **Backup** — export downloads `nocturne-2026-09-06.json` with the seeded counts, import shows the progress line and restores, and the JSON **does not contain the mocked PAT**. (9) **Offline** — after `setOffline(true)` the app boots, `document.fonts.check('300 96px "Bricolage Grotesque Variable"')` is true, and **no request to `fonts.googleapis.com` occurs anywhere in the test**; adding and striking persist. (10) **Android build shape** — a `VITE_PLATFORM=android` build has **no `sw.js`** and never calls `registerSW`. (11) **Storage failure** — with `indexedDB` deleted by an init script the vermilion footnote renders and nothing crashes. (12) **Keyboard only** — `n` → type → Enter → `j j x` → `[ ]` → `Ctrl+K` → search → Enter → `Esc` returns focus.

**Token assertions** (same spec, no pixels, readable failures): `--bg` is `#0A1024` / `#F5F1E8` and **every token name declared in §3.3 exists and is non-empty in both themes** (derive the list from `tokens.css` in the test — never hard-code a count, or adding a token breaks the assertion) · row `min-height ≥ 56px`, folio button ≥ 44 × 44, tab height ≥ 48, chip hit area ≥ 44 · entry `border-bottom-width` is exactly `1px` at DPR 1, 2 and 2.625 · **no `box-shadow` at rest on the Front Page**, and exactly the lifted entry has `--shadow-2` during the drag test · **at most one element per page** computes `rgb(236, 109, 88)` · no `background-image` gradient except the gauge and the desktop mask · the numeral's family starts with `"Bricolage Grotesque Variable"` and its `font-variation-settings` includes `"opsz" 96`, titles are `"Geist Variable"`, every folio/time/counter is `"Geist Mono Variable"` · `--grain-opacity` is `0.035` / `0` · **every animated element's transition duration is one of `120ms | 240ms | 480ms`** (scan the page — this catches ad-hoc timings) · the numeral is `109.2px` at 390 px, clamping to `112px` above 400 px and `88px` below 314 px · under `reducedMotion: "reduce"`, `document.getAnimations().length === 0` 200 ms after load. **Screenshot matrix** (390 × 844 unless noted): `front-page-phone`, `front-page-desktop` (1280 × 800), `front-page-evening`, `front-page-proof`, `colophon-printed`, `entry-sheet`, `ledger-expanded`, `back-issues`, `first-open`, `reduced-motion`, `text-130` — plus `design/preview.html` at 390 and 1280, so preview-versus-app drift shows side by side.

**Budgets.** Initial JS ≤ 180 KB gzip (CI fails above 200 KB) · fonts ≤ 350 KB in 3 woff2 files · total initial transfer ≤ 520 KB · LCP ≤ 1.5 s mobile throttled, ≤ 0.8 s desktop, **< 1.0 s on the phone with a warm SW** · CLS ≤ 0.02 · masthead roll ≥ 55 fps · `pointerup` → DigitRoll ≤ 100 ms · reorder ≥ 55 fps over a 1 s drag on 50 entries · Dexie Today query ≤ 10 ms for 5,000 entries · Front Page with 1,000 entries ≤ 300 ms with virtualisation beyond 200 (DOM `li` ≤ 60) · import/export of 10,000 records ≤ 3 s / ≤ 2 s with the progress line updating ≥ 5 times · grain ≤ 2 ms paint per scrolled frame · memory steady < 60 MB and ≤ 80 MB after 500 simulated strikes · APK ≤ 6 MB · Lighthouse installable and service-worker pass, a11y ≥ 95, best-practices ≥ 95.

**Manual Android checklist** (before every tag; record device, Android version and WebView version in `docs/VERIFICATION-LOG.md`). *Install* — the unknown-apps prompt appears once, `SHA256SUMS.txt` matches, a newer tag installs over the old one keeping all data, the version string equals the tag, the adaptive icon is navy/foil and themed on Android 13+, and the splash fades instantly into the masthead roll with no double splash. *First open* — Issue No. 1 with **no** notification prompt; after closing all three the prompt appears exactly once, and denying it leaves the app usable with `Not allowed · Open ›`. *Notifications* — the daily review at now + 3 min arrives with the right body and opens Today; a per-entry reminder shows Done/Snooze and both work from a killed app; the exact-alarm footnote appears, opens the system page and disappears after allowing; a reboot with a review pending still fires; a Doze-idle reminder arrives within 9 minutes; revoking permission causes no crash and no repeated prompting; the small icon is the white "N" on a channel named `Reminders`. *Navigation* — system back closes a sheet and exits from the root; predictive back previews the sheet sliding; entry swipes never trigger system back; long-press reorder works on a 30-entry scrollable list with a haptic per neighbour; the tab underline slides with no unstyled flash. *Layout* — the running head sits 8 px below the status bar and the tabs above the gesture bar in both themes, with light icons on Night and dark on Proof; landscape reflows without clipping and preserves scroll; "Largest" system font grows rows without truncating titles; 1 px hairlines are visible outdoors at 50 % brightness with no navy banding and invisible grain; the numeral shows no hinting artefacts. *Data* — export reaches the share sheet and re-imports; a Gist backup typed on the phone reports `Last printed just now`; "session only" forgets the token after relaunch; killing the app mid-edit loses nothing past the last blur; clearing *cache* loses nothing. *Sound, haptics, time* — sound is off by default and starts at C4 when enabled, quiet hours silence it, haptics fire on strike, threshold, lift, renumber, drop and colophon and **never on scroll**; changing the time zone leaves completion day-keys unchanged; crossing 03:00 rolls the masthead; the evening hour performs the Evening Turn. *Debugging* — a `workflow_dispatch` debug build is inspectable via `chrome://inspect#devices`; the tagged release APK is **not**.

## 11. DEPLOYMENT

### 11.1 `vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
const isAndroid = process.env.VITE_PLATFORM === "android";
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },   // Colophon footer: "Nocturne 0.4.2"
  plugins: [
    react(),
    tailwindcss(),
    // No service worker inside the Capacitor WebView: skip the plugin entirely on the Android build.
    ...(isAndroid ? [] : [VitePWA({
      registerType: "prompt",   // update = the footnote "² A new edition is ready — Reload", never auto-reload
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Nocturne", short_name: "Nocturne", description: "The Minimalist Goal Tracker",
        theme_color: "#0A1024", background_color: "#0A1024",
        display: "standalone", orientation: "any",
        start_url: base, scope: base,
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],   // fonts precached → real offline
        navigateFallback: `${base}index.html`,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    })]),
  ],
  build: { target: "es2022", sourcemap: false },
});
```

`src/app/main.tsx` registers the worker only on the web: `if (!Capacitor.isNativePlatform()) import("virtual:pwa-register").then(({ registerSW }) => registerSW({ onNeedRefresh: showEditionFootnote }));`. Every asset URL goes through `import.meta.env.BASE_URL`. `index.html` carries `<html lang="en" data-theme="night">`, `<meta name="theme-color" content="#0A1024">`, the inline grain filter, the CSP meta from §7.1 and the pre-paint theme bootstrap.

### 11.2 `.github/workflows/pages.yml`

```yaml
# Deploy Nocturne to GitHub Pages. Prereq: Settings → Pages → Source = "GitHub Actions".
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test -- --run          # Vitest only; e2e lives in ci.yml
      - name: Build (served from /nocturne/)
        run: npm run build
        env:
          VITE_BASE_PATH: /${{ github.event.repository.name }}/
      - name: SPA fallback for deep links (harmless with hash routing)
        run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-24.04
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**No `VITE_API_BASE`, no Cloudflare secrets, no worker job** — Nocturne has no proxy; do not add one.

### 11.3 `.github/workflows/ci.yml` and `android-release.yml`

```yaml
name: ci
on: { pull_request: {}, push: { branches: [main] } }
permissions: { contents: read }
jobs:
  e2e:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
        env: { VITE_BASE_PATH: /nocturne/ }
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: playwright-report-${{ github.run_number }}
          path: playwright-report/
          retention-days: 7
```

```yaml
# Build a SIGNED Capacitor APK in the cloud and attach it to a GitHub Release.
# Needs the four keystore secrets and the signingConfigs block from §11.4.
#   git tag v1.0.0 && git push origin v1.0.0   → APK on the Releases page.
name: android-release
on:
  push: { tags: ['v*'] }
  workflow_dispatch:          # manual run → signed APK as a downloadable artifact only
permissions: { contents: write }
concurrency: { group: android-${{ github.ref }}, cancel-in-progress: true }
jobs:
  apk:
    runs-on: ubuntu-24.04     # Android SDK 34–37, build-tools and JDKs preinstalled
    timeout-minutes: 30
    env:
      VERSION_CODE: ${{ github.run_number }}
      VERSION_NAME: ${{ github.ref_type == 'tag' && github.ref_name || format('0.0.{0}', github.run_number) }}
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 22, cache: npm }
      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: 21    # Capacitor 8 targets Java 21; the runner default is 17
          cache: gradle
      - name: Build web app (base "/" because Capacitor serves from https://localhost/)
        run: |
          npm ci
          npm run build
        env:
          VITE_BASE_PATH: /
          VITE_PLATFORM: android    # disables vite-plugin-pwa: no service worker in the WebView
      - name: Sync web assets and plugins into android/
        run: npx cap sync android
      - name: Decode keystore
        env:
          KS_B64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: printf '%s' "$KS_B64" | base64 -d > "$RUNNER_TEMP/release.p12"
      - name: Build signed release APK
        working-directory: android
        env:
          ANDROID_KEYSTORE_FILE: ${{ runner.temp }}/release.p12
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          chmod +x gradlew
          ./gradlew --no-daemon :app:assembleRelease \
            -PversionCode="$VERSION_CODE" -PversionName="${VERSION_NAME#v}"
      - name: Collect output (fails loudly if the APK came out unsigned)
        run: |
          mkdir -p out
          cp android/app/build/outputs/apk/release/app-release.apk \
             "out/nocturne-${VERSION_NAME#v}.apk"
          (cd out && sha256sum *.apk > SHA256SUMS.txt)
          ls -la out
      - name: APK size budget (6 MB)
        run: |
          size=$(stat -c %s out/*.apk); echo "APK bytes: $size"
          test "$size" -le 6291456
      - uses: actions/upload-artifact@v7
        with:
          name: apk-${{ env.VERSION_NAME }}
          path: out/
          retention-days: 14
      - name: Attach APK to GitHub Release
        if: github.ref_type == 'tag'
        uses: softprops/action-gh-release@v3
        with:
          tag_name: ${{ github.ref_name }}
          generate_release_notes: true
          files: |
            out/*.apk
            out/SHA256SUMS.txt
```

### 11.4 Gradle signing block and the keystore

Replace the `android { … }` block in `android/app/build.gradle`, keeping everything else the generated file has (`apply plugin`, `repositories`, `dependencies`, `apply from: 'capacitor.build.gradle'`, the `google-services` try/catch):

```groovy
def ciVersionCode = (project.findProperty('versionCode') ?: '1').toInteger()
def ciVersionName = project.findProperty('versionName') ?: '0.0.0'
def ksFile = System.getenv('ANDROID_KEYSTORE_FILE')

android {
    namespace "com.rahul.nocturne"
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.rahul.nocturne"   // NEVER changes after the first install
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode ciVersionCode
        versionName ciVersionName
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions { ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~' }
    }
    signingConfigs {
        release {
            if (ksFile) {
                storeFile file(ksFile)
                storeType 'PKCS12'
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            if (ksFile) signingConfig signingConfigs.release
        }
    }
}
```

Generate the keystore in **Git Bash, outside the repo, exactly once for the life of the app** — no JDK needed:

```bash
set -euo pipefail
APP="nocturne"
read -r -s -p "Choose a long passphrase (store it in your password manager): " STOREPASS; echo
if [ "${#STOREPASS}" -lt 12 ]; then echo "Use at least 12 characters."; exit 1; fi
openssl req -x509 -newkey rsa:2048 -sha256 -days 10000 -nodes \
  -keyout "$APP-key.pem" -out "$APP-cert.pem" -subj "/CN=$APP/O=Personal/C=IN"
openssl pkcs12 -export -inkey "$APP-key.pem" -in "$APP-cert.pem" \
  -name release -out "$APP-release.p12" -passout "pass:$STOREPASS"
base64 -w0 "$APP-release.p12" > "$APP-release.p12.b64"
rm -f "$APP-key.pem" "$APP-cert.pem"
```

Set four repository secrets: `ANDROID_KEYSTORE_BASE64` (the `.b64` contents on one line), `ANDROID_KEYSTORE_PASSWORD` (the passphrase), `ANDROID_KEY_ALIAS` = `release`, `ANDROID_KEY_PASSWORD` = **the same passphrase** (PKCS12 requires key password = store password). Delete the `.b64` afterwards. **Losing this keystore means future APKs cannot install over old ones** — keep the `.p12` and passphrase in the password manager, on an encrypted offline copy, and (as a copy, never a source) in the GitHub secret; verify the backup once with `openssl pkcs12 -in nocturne-release.p12 -info -noout`.

### 11.5 Ignores, release checklist, rollback, troubleshooting

`.gitignore`: `node_modules/ dist/ coverage/ playwright-report/ test-results/ android/local.properties android/.gradle/ android/app/build/ android/app/release/ *.p12 *.jks *.keystore *.b64 .env*.local`. `.gitattributes`: `android/gradlew text eol=lf`, `*.sh text eol=lf`, `e2e/visual/__screenshots__/**/*.png binary`.

**Every `v*` tag:** (1) `main` green on `pages.yml` and `ci.yml`, with the live site showing the intended commit. (2) The §10 gate passes, including the phone checklist against a `workflow_dispatch` APK of **this exact commit**, logged in `docs/VERIFICATION-LOG.md`. (3) `npm audit --audit-level=high` clean and `npx cap sync android` producing no uncommitted diff. (4) A `CHANGELOG.md` entry, with the README Attribution updated if a dependency changed. (5) `npm version <x.y.z> --no-git-tag-version`, commit `Release x.y.z`, push, wait for Pages. (6) `git tag vx.y.z && git push origin vx.y.z` → the Release carries the APK and `SHA256SUMS.txt`. (7) Install over the previous version and confirm data, version string and a scheduled reminder. (8) Export a JSON backup from both the phone and the web app — a release is the natural backup moment.

**Rollback.** A bad Pages build: `git revert` and push (≈ 2 min), or re-run the last good workflow; the `prompt` update strategy means open tabs keep the old version until the user taps Reload, so nothing force-reloads into a broken build. A bad APK: Android cannot downgrade `versionCode`, so **fix forward** — revert, tag `x.y.(z+1)`, install over the top; meanwhile mark the Release pre-release, delete the `.apk` asset and point at the previous tag. A bad migration: migrations are additive and reversible-by-import, so tell the user to Import the export from step 8 — **never ship a migration that drops a table.** `app-release-unsigned.apk` in the log means a missing secret or key password ≠ store password.

**Troubleshooting.** Blank page with a 404 on `/assets/index-*.js` → `VITE_BASE_PATH` not applied. PWA not installable → `start_url`/`scope` are not `/nocturne/`; the `base` variable must feed the manifest. Fonts fall back on the phone but not the web → Fontsource CSS imported after the Tailwind layer, or the Android build lost its woff2 copies. `validateSigningRelease` fails → a missing or empty secret. "App not installed" on update → a different keystore or a lower `versionCode`. The daily review never fires → permission, exact-alarm setting, OEM battery restrictions, or a force-stop (Android drops all alarms after a force-stop until the app is launched again). Reminders ~1 h late → exact alarms denied. `nocturne://today` opens nothing → a missing intent filter or `launchMode` ≠ `singleTask`.

## 12. DEFINITION OF DONE

**Measurable acceptance criteria.** (1) **Cold open to a usable masthead in under 1.0 s** on a 2022 mid-range Android (WebView ≥ 110) with the service worker warm; the running head is the LCP element and paints before any font swap. (2) **Quick add parses in one keystroke:** `Call mom tomorrow 17:00 every week #family` + Enter files an entry with `when = tomorrow`, `reminderAt = 17:00`, weekly recurrence on that weekday and tag `family`, with chips shown inline before commit, in **under 50 ms**. (3) **Swipe-to-strike feels physical:** release past 90 px or > 600 px/s strikes; the foil line, the haptic at 60 %, the layout re-set and the counter roll complete within **600 ms at 60 fps**; Undo is available for 5 s and restores the exact previous state. (4) **Reminders fire on Android:** a 3-minute reminder and the 21:00 review both arrive with the app closed on a real Android 14+ device, **and again after a reboot**; when exact alarms are denied the app shows the foil footnote and opens the system setting in one tap. (5) **Recurrence never drifts:** "monthly on the 31st" from 2026-01-31 yields 2026-02-28, 2026-03-31, 2026-04-30 in that order, and "every weekday" across a DST change never skips or duplicates a day. (6) **Strength is Loop-equivalent:** 13 consecutive daily completions read exactly **50 %**, 30 read **80 %**, one miss after 30 drops to **76 %** and never to zero. (7) **Backup round-trips losslessly:** export → wipe site data → import restores every entry, habit, completion, issue and setting, verified by a Vitest snapshot; a Gist backup completes in under 3 s. (8) **Accessible by construction:** every text colour ≥ 4.5:1 in both themes, every target ≥ 44 × 44 px, the whole app operable by keyboard, and the reduced-motion snapshot showing no animation longer than 120 ms.

**Design fidelity against the preview.** ☐ The Front Page in Night, Proof and Evening is indistinguishable from `design/preview.html` at 390 × 844, and the desktop layout at 1280 × 800 shows rail + 640 px column + vertical caption. ☐ The numeral is Bricolage 300 at `opsz` 96, 88–112 px, in fixed columns that roll on launch and rollover. ☐ The gauge is a **hard-edged** foil/border split matching `dayGauge()`, updated every minute. ☐ Nothing at rest has a box, a radius or a shadow; the only lifted surface is a dragged entry and the only blur is the sheet scrim. ☐ The strike is a 1 px foil SVG line drawing left→right in 320 ms with the haptic at 60 %. ☐ Margin words are bare Bricolage 200 type — **no coloured backing slab** — snapping to foil at 90 px. ☐ Folios re-roll live while reordering and one drop writes one record. ☐ The colophon draws in the documented order with the exact sentences, offers the standfirst, and un-draws on reopen. ☐ **At most one vermilion element** per screen; `--success` only in the backup row. ☐ Every number is Geist Mono except the masthead and week-spread numerals. ☐ Zero icons on the four main surfaces. ☐ No confetti, badge, toast, exclamation mark or emoji anywhere in the copy. ☐ Empty states are exactly one light-weight line of type. ☐ Grain present in Night, absent in Proof, ≤ 2 ms per scrolled frame. ☐ `grep -rn "#[0-9a-fA-F]\{3,8\}" src/ --include=*.tsx --include=*.ts --include=*.css | grep -v tokens.css` returns **nothing**.

**Engineering gates.** ☐ `npx biome check .` clean and TypeScript strict with **zero `any`** in `src/engine` and `src/data`. ☐ Engine coverage ≥ 95 % lines, 100 % on `recurrence`, `streaks`, `strength`, `daykey`. ☐ Every golden table in §6 passes, including the property tests and ±14 h timezone runs. ☐ `test:e2e`, `test:visual` and `test:a11y` green with zero serious/critical axe violations. ☐ All §10 budgets met, including APK ≤ 6 MB and initial JS ≤ 180 KB gzip. ☐ The device checklist complete and logged. ☐ The production bundle makes **zero network requests** with no backup configured, asserted by a Playwright request allow-list. ☐ No token in any export, log or DOM node, asserted. ☐ `npx license-checker --summary` shows only OSI/OFL/CC0 licences and matches the README table. ☐ `v1.0.0` live on Pages and on Releases with a signed APK and `SHA256SUMS.txt`. ☐ The owner has used it as their only task list for **seven consecutive days** with no data loss.

## 13. CODE QUALITY RULES

**TypeScript.** `strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride`. **No `any`** in `src/engine` or `src/data`; elsewhere it needs a one-line comment saying why. Model the domain with discriminated unions (`Recurrence` is the template) and let the compiler prove exhaustiveness — every `switch` on a union ends with `default: assertNever(x)`. Branded types (`DayKey`) exist so a raw string can never be mistaken for a day key; never cast around them outside the constructor functions.

**Biome** is the only lint and format tool, run in CI. No ESLint, no Prettier, no per-file overrides. Fix warnings; do not silence them.

**Engine purity — the hard rule.** A file in `src/engine/` may not import React, Dexie, Capacitor or a DOM API, and may not call `Date.now()`, `Math.random()` or `new Date()` without an argument. Every such value is a parameter. This is what makes the golden tests possible and it is not negotiable — if you want a clock inside the engine, pass one in.

**Data layer.** Every write goes through `repo.ts`; a component importing `db` directly is a bug. Reads use `useLiveQuery`, and derived values (sections, folios, streaks, strength, issue state) are computed in `useMemo` by calling engine functions — never re-derived inline in JSX and never stored, except `Issue`, which is persisted because history and the widget need it.

**Components.** One per file, named after the file. Presentational components take data and callbacks; they do not fetch, do not write, and do not know about Dexie. `EntryRow` is `React.memo`'d and re-renders only when its own record, folio, status or order changes; the list container owns the `Reorder.Group`. All ephemeral UI state (`selectedEntryId`, `openSheet`, `composer`, `undo`, `strikeCountToday`, `audioUnlocked`, `dragging`, `colophonJustClosed`) lives in one Zustand store, and nothing else does.

**Styling.** Tokens or nothing. **`src/styles/tokens.css` is the only file in `src/` containing a hex value** — a grep-able gate in §12. Use Tailwind utilities for layout and spacing; hand-write CSS for the hairline system, the strike, the sheet and the grain, because those are the app's identity and belong in one readable place. No inline style objects except for genuinely runtime values (the gauge width, a drag transform).

**Motion.** Import durations and easings from `src/styles/motion.ts` — never type `0.24` into a component. Every named animation in §3.7 has exactly one implementation; if two components need the same movement, extract it. Nothing animates a property other than `transform`, `opacity`, `stroke-dashoffset`, `width` (the gauge only) or a CSS custom property.

**Accessibility is part of the component, not a later pass.** A component without its `aria-label`, focus behaviour and keyboard path is unfinished, not "pending polish".

**No dead code.** No commented-out blocks, no `TODO` without an owner and a date, no unused exports, no "just in case" abstraction, no flags for features that do not exist. A Phase 6 idea that is not being built now lives in the plan, not in the source.

**Errors.** Engine functions throw only on programmer error. User-facing failures render as a **footnote** — a superscript mark plus one mono line — muted for information, foil for a warning, vermilion for an error. Never a modal, never a toast, never a red banner. Every route has an error boundary rendering the masthead plus `This page could not be set — Reload`.

**Testing discipline.** The test is written before or alongside the code, never "after it works". A bug fix starts with a failing test encoding the golden value. Golden fixtures are data files, not inline literals, so they diff cleanly.

**Commits.** Small, imperative, one concern each: `engine: clamp monthly recurrence from the stored day`, `front-page: re-roll folios during reorder`. Commit at every checkpoint in §9 — a checkpoint that passes is a commit. Never commit a red build to `main`; branch for anything longer than a day and squash-merge; tag only from `main`, and only when §11.5 is fully green.

**Dependencies.** Adding one requires a licence check against §2.2, a bundle-size check against §10, a row in the README Attribution table, and a sentence in the commit message saying what it replaced. Dependabot runs weekly; `npm audit` runs in CI as a warning, and `--audit-level=high` must be clean before a tag.
