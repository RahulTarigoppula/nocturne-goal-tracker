# Nocturne — Design System: "The Evening Edition"

Design direction locked 2026-09-06 after judging three concepts (Editorial, Atmospheric, Physical). Binding for `design/preview.html`, `src/styles/tokens.css` and every component. Stays inside `_shared/DECISIONS.md` (D1 stack, D5 licensing, D7 token contract) — no additions to the stack, no paid anything.

---

## 1. Identity

| | |
|---|---|
| **App name** | Nocturne |
| **Design name** | The Evening Edition |
| **One-liner** | Your day is a numbered issue of a private navy broadsheet: a masthead with a giant date numeral, tasks set as folio-numbered catalogue entries between hairlines, and a colophon that prints when the issue is closed. |
| **Three adjectives** | Typeset · Quiet · Accountable |
| **Voice** | A newspaper that only prints one copy, for you. Sober, warm, never chirpy. No exclamation marks, no emoji, no "You're crushing it". The app says "Issue closed." and means it. |

**What it must never look like**

- A Things/Todoist clone: no rounded card grid at rest, no floating "+" FAB, no coloured checkboxes in a list, no progress pies.
- A "dark SaaS" dashboard: no Inter on #111, no glassmorphism, no purple, no gradient blobs, no glowing borders.
- A space/meditation app: no stars, no nebulae, no shader sky (Concept 2's sky was rejected — see §3).
- A theme park: no skeuomorphic brass, no paper textures, no rotated cards, no stamps (Concept 3 rejected).
- A designer-portfolio mock: hairlines alone are not enough — 17 px titles, 56 px rows, real hierarchy, a warm greeting. If a screenshot could be a Dribbble shot with no data in it, it has failed.
- Confetti. Ever. The reward is the colophon.

---

## 2. Moodboard & references

| Reference | What we take | URL |
|---|---|---|
| Bloomberg Businessweek front-of-book | Giant numerals as the image; hairline rules; tables of contents as art | https://www.bloomberg.com/businessweek |
| Josef Müller-Brockmann, Tonhalle concert posters | Grid discipline, numerals as ornament, one accent | https://www.moma.org/artists/4155 |
| Kinfolk magazine | One column, wide margins, a single light-weight line as the only ornament | https://www.kinfolk.com |
| The New York Times "Today's Paper" | Folio numbering, section running heads, restraint | https://www.nytimes.com/section/todayspaper |
| Tate exhibition catalogues | Lot numbers in the margin, tracked small caps, pale text on dark boards | https://shop.tate.org.uk/books |
| Are.na | Flat, typographic, hairline blocks, zero chrome | https://www.are.na |
| NASA Apollo mission reports | Mono numerals set as tabular ornament | https://www.nasa.gov/history/alsj/ |
| Smythson navy diaries | Foil on navy — and nothing else | https://www.smythson.com |
| Things 3 Logbook | Structure (Today / This Evening split, Logbook), not skin | https://culturedcode.com/things/ |
| Reeder / Linear | Editorial calm; 150–240 ms layout moves; dense-but-calm dark; a book's colophon page as the reward for finishing | https://linear.app |
| Bricolage Grotesque specimen | The masthead voice: a grotesk with editorial quirk and a true optical-size axis | https://fonts.google.com/specimen/Bricolage+Grotesque |

---

## 3. Judging summary

Scores 1–10, harsh on both generic looks and illegible art projects.

| Concept | Distinctiveness | Vibe fit | Usability | Feasibility | Screenshot | **Total** | Verdict |
|---|---|---|---|---|---|---|---|
| 1 · The Evening Edition (Editorial) | 8 | 9 | 8 | 9 | 8 | **42** | **Winner** — matches "distraction-free, high-contrast navy, premium calm" almost literally; cheapest to build well; only risk is looking unfinished, which is a tuning problem, not a concept problem. Loses a point on distinctiveness because dark-to-do-with-a-serif is a genre; fixed by the folio/masthead/colophon system and by the portfolio font rule. |
| 2 · The Long Exposure (Atmospheric) | 7 | 7 | 6 | 6 | 9 | 35 | Best screenshot (constellation share) but a live WebGL sky in Android System WebView, four competing gestures on one card, text-over-shader legibility, battery and LCP costs — too much for a solo dev, and "living sky" fights "pure focus". Navy + stars is also the default wallpaper of every sleep app. |
| 3 · Eight Bells (Physical) | 9 | 5 | 6 | 6 | 9 | 35 | Most distinctive, least on-brief: "minimalist, distraction-free, without clutter" cannot be brass tabs, rotated cream cards, rubber stamps and a bell. Cream cards glare on OLED at night; CSS 3D flip + drag on low-end WebViews is a swamp; 11 px engraved brass lettering is a legibility trap. |

**Why the winner won.** The brief asks for a sleek, distraction-free card interface in high-contrast navy that feels premium and calming. Concept 1 delivers all of that with typography alone, which is the cheapest premium there is: no shader, no 3D, no textures — three font files, 1 px rules, one foil colour. Everything hard about it (digit rolls, SVG strike, layout reflow) is a 20–40-line Motion component. It is also the only concept whose empty state is beautiful, and the only one that gets better as the user adds entries rather than worse.

**What was grafted (and the conflicts resolved)**

1. **The rule is the clock** (from Concept 2's "Horizon clock"). The 1 px hairline under the masthead is a live gauge: foil from the left edge for the fraction of the day elapsed until rollover, `--border` for the rest. A quiet reading, not a widget. Replaces Concept 2's glowing horizon; nothing else from the sky survives.
2. **The climbing scale** (from Concept 2's completion tone). Each check plays one pentatonic step higher than the last (C4 D4 E4 G4 A4 C5 …), resetting at rollover, so closing a full issue plays a melody you built. Synthesised, off by default.
3. **The standfirst** (from Concept 3's "What went well?" card and Concept 1's own Logbook reflection). After the colophon prints, one light-weight line is offered: "A line for the record —". It becomes the issue's standfirst in Back Issues. One line, optional, never nagged.
4. **The sample issue** (from Concept 3's first-open onboarding). The first launch is Issue No. 1 with three pre-set entries whose titles teach the gestures ("Swipe me right when I'm done", "Swipe me left to move me", "Hold me to change the order"). No tour, no tooltips.

**Portfolio typography rule applied.** Concept 1 specified Fraunces (reserved for another app) and Schibsted Grotesk. Both are replaced: display becomes **Bricolage Grotesque** (variable, `opsz` 12–96, `wght` 200–800, `wdth` 75–100) — a grotesk with editorial quirk and a true optical-size axis, so the masthead numeral still reads as a printed masthead rather than a scaled UI font; body becomes **Geist**; numerals and labels stay mono in **Geist Mono**. Serif italic is gone; the "italic voice" of the concept (greeting, margin words, standfirst) is now Bricolage Grotesque at `wght` 200, `opsz` 96 — the light weight carries the same tenderness without a serif. Fraunces, Playfair, Instrument Serif and Inter do not appear anywhere in this app.

---

## 4. Color system

Dark ("Night") is the default and the identity. A light "Proof" theme is required by D7 and is a genuine mode (cream proof paper, navy ink), not an afterthought. Both use the D7 token names; components never reference a hex. Contrast ratios below were computed with the WCAG 2.x relative-luminance formula on 2026-09-06.

### 4.1 Night (default)

| Token | Hex | Usage | Contrast notes |
|---|---|---|---|
| `--bg` | `#0A1024` | Page ground — the broadsheet's paper. oklch ≈ 16% 0.05 270 | — |
| `--bg-elevated` | `#0F172E` | Ground after the evening hour ("Evening Edition"); sheets; composer bar | ink 15.7:1 |
| `--surface` | `#131C36` | A card **only while it lifts** (pressed / dragging entry) and the detail sheet | ink 14.9:1 |
| `--surface-2` | `#1A2542` | Active-row wash, heatmap empty cell, ring track, chips | ink 13.4:1, muted 6.2:1 |
| `--ink` | `#EEF1F8` | Primary text (warm paper white) | 16.7:1 on bg |
| `--ink-muted` | `#9AA6C4` | Running heads, meta lines, secondary text | 7.8:1 on bg, 6.2:1 on surface-2 |
| `--ink-faint` | `#5B6685` | Decorative folio numerals, completed-entry titles, disabled — **ornament only, never body text** | 3.3:1 (fails AA by design; never carries information alone) |
| `--accent` | `#E8C170` | Gilt foil — the single accent: done tick, active tab underline, day-gauge fill, habit ring fill, the one filled button | 11.1:1 on bg (AAA as text) |
| `--accent-ink` | `#0A1024` | Text on foil ("Close the issue") | 11.1:1 |
| `--accent-2` | `#EC6D58` | Printer's vermilion — overdue, deadline countdown, destructive; **at most one vermilion element per screen** | 6.2:1 on bg, 5.0:1 on surface-2 |
| `--success` | `#9CCBB0` | Backup status ("Backed up 2 h ago"), reminder-scheduled confirmations only | 10.4:1 on bg |
| `--warning` | `#E8C170` | Alias of `--accent` — a warning in this app is a foil footnote, not a yellow banner | 11.1:1 |
| `--danger` | `#EC6D58` | Alias of `--accent-2` — delete confirmations, failed backup | 6.2:1 |
| `--border` | `#26304D` | The hairline: 1 px between entries, under running heads | 1.45:1 (decorative; ≈ ink at 12 % alpha) |
| `--border-strong` | `#3A4666` | Input underline at rest, table rules in the sheet, sheet grabber | 2.0:1 |
| `--focus` | `#F2D68A` | Focus ring, 2 px solid, 2 px outside offset; keyboard-selected entry | 13.3:1 |

The palette deliberately collapses semantics to two hues (foil and vermilion). `--success`/`--warning`/`--danger` exist so shared `components/ui` primitives port; the app itself uses `--success` in exactly two places.

### 4.2 Proof (light)

| Token | Hex | Notes |
|---|---|---|
| `--bg` | `#F5F1E8` | Cream proof paper |
| `--bg-elevated` | `#ECE6D8` | Evening ground, sheets |
| `--surface` | `#FBF9F3` | Lifted card |
| `--surface-2` | `#E4DCCB` | Wash, chips, ring track |
| `--ink` | `#0A1024` | Navy ink — 16.7:1 |
| `--ink-muted` | `#414B66` | 7.7:1 on bg, 6.4:1 on surface-2 |
| `--ink-faint` | `#8A93AB` | Decorative, 2.7:1 |
| `--accent` | `#745816` | Bronze foil: 5.9:1 on bg, 4.9:1 on surface-2 (foil cannot be light on cream — it is printed as bronze ink instead) |
| `--accent-ink` | `#F5F1E8` | 5.9:1 on accent |
| `--accent-2` | `#9E2F1C` | 6.5:1 on bg, 5.4:1 on surface-2 |
| `--success` | `#24634A` | 6.3:1 on bg, 5.2:1 on surface-2 |
| `--warning` | `#745816` | alias accent |
| `--danger` | `#9E2F1C` | alias accent-2 |
| `--border` | `#D9D1BF` | 1.35:1 decorative |
| `--border-strong` | `#B8AE9B` | 1.95:1 |
| `--focus` | `#6E5414` | 6.3:1 |

Theme switching is `[data-theme="night" | "proof"]` on `<html>`, defaulting to `prefers-color-scheme` on first run and then to the user's choice. **The evening ground shift is driven by the app's own evening-hour setting, never by `prefers-color-scheme`** — it is a token swap (`--bg` takes the `--bg-elevated` value) inside whichever theme is active.

### 4.3 Materials, gradients, textures

- **No gradients** on any surface. The only "gradient" is the day-gauge rule (a hard-edged foil/border split, not a fade) and the desktop right-margin vertical caption fade (`mask-image`, 40 px).
- **Grain:** one inline SVG `<filter>` with `feTurbulence baseFrequency="0.8" numOctaves="2"` over the whole page at `--grain-opacity: 0.035`, `mix-blend-mode: overlay`. Purpose: kill navy banding on cheap OLEDs. Off under Proof (0) and under `prefers-reduced-transparency`. Nothing else textural; the optional Paper Shaders mesh from RESEARCH.md §7 stays out.
- **Shadows** exist only in two states (lifted entry, open sheet) — see §6. No shadow at rest, anywhere.
- **Blur:** the detail sheet uses `backdrop-filter: blur(16px) saturate(1.2)` over the page with a 72 % `--bg-elevated` scrim so the masthead reads through faintly. This is the only blur.
- **Hairlines are 1 px solid** `--border`. Never 0.5 px (Android WebView rounds it away), never alpha-only (it reads as unfinished on bright phones outdoors).

---

## 5. Typography

Three families, three files, all SIL OFL 1.1, self-hosted via Fontsource (latin subset), never hotlinked in production (D1). `design/preview.html` may use the Google Fonts `<link>`.

| Role | Family | Google Fonts | Fontsource | Axes / weights used |
|---|---|---|---|---|
| `--font-display` | **Bricolage Grotesque** | https://fonts.google.com/specimen/Bricolage+Grotesque | `@fontsource-variable/bricolage-grotesque` (import `/full.css` for `opsz` + `wdth`; the default `index.css` is `wght`-only — verify in `node_modules` after install) | `wght` 200–800, `opsz` 12–96, `wdth` 75–100 |
| `--font-body` | **Geist** | https://fonts.google.com/specimen/Geist | `@fontsource-variable/geist` | `wght` 400–600 |
| `--font-mono` | **Geist Mono** | https://fonts.google.com/specimen/Geist+Mono | `@fontsource-variable/geist-mono` | `wght` 400–500 |

**Font reservation.** The display face **Bricolage Grotesque** is unique to Nocturne across the eight projects (D7 only reserves display faces). `--font-body` **Geist** and `--font-mono` **Geist Mono** are deliberately shared with Marquee (08): both are neutral UI faces, and the two brands separate on display type, palette and layout, not on body type. No other project may take Bricolage Grotesque.

Fallback stacks: `"Bricolage Grotesque Variable", "Geist Variable", system-ui, sans-serif` / `"Geist Variable", system-ui, -apple-system, "Segoe UI", sans-serif` / `"Geist Mono Variable", ui-monospace, "Cascadia Mono", Consolas, monospace`. DESIGN-TOOLKIT.md notes the Google Fonts build of Geist may lack some OpenType features; the `geist` npm package (Vercel, OFL) ships the full variable woff2 as a fallback — but no counter is ever set in Geist anyway (see §5.3).

### 5.1 Voices

- **Masthead voice** — Bricolage `wght` 300, `opsz` 96, `wdth` 100 for the date numeral; `wght` 200 for the greeting, margin words ("Done.", "When?") and the standfirst. Light weight at large size is this app's "italic". Rule: the light voice appears at most twice per screen.
- **Running heads** — Geist Mono 500, 11 px, uppercase, tracked +0.08 em: `I — TODAY`, `NOCTURNE · No. 249 · SUNDAY`.
- **Entries** — Geist 500, 17 px / 24 px for titles; Geist 400, 15 px / 22 px for notes and body copy.
- **Ledger voice** — Geist Mono for every number, time, tag, counter and folio: `02`, `18:30`, `#HOME`, `3 / 7`, `No. 249`.

### 5.2 Type scale (rem, base 16 px)

| Token | rem | px | Use | Family / weight | Line-height | Tracking |
|---|---|---|---|---|---|---|
| `--text-xs` | 0.6875 | 11 | Running heads, meta lines, chips, folio numbers, footnotes | Mono 500 | 1.4 | +0.08em (upper), +0.04em (mixed) |
| `--text-sm` | 0.8125 | 13 | Tab labels, table cells, streak readouts, timestamps, colophon lines | Mono 400/500 | 1.4 | +0.04em |
| `--text-base` | 0.9375 | 15 | Notes, settings copy, checklist items, standfirst | Body 400 (standfirst: Display 200) | 1.467 (22 px) | 0 |
| `--text-md` | 1.0625 | 17 | Entry titles, sheet body | Body 500 | 1.41 (24 px) | −0.005em |
| `--text-lg` | 1.375 | 22 | Month word beside the numeral, greeting, section heads in sheet | Display 200/400, opsz 24 | 1.2 | −0.01em |
| `--text-xl` | 1.75 | 28 | Composer "+", sheet headline (folio + title) | Display 400, opsz 32 | 1.15 | −0.015em |
| `--text-2xl` | 2.25 | 36 | Week-spread day numerals, habit percentage | Display 300, opsz 36 | 1.0 | −0.02em |
| `--text-3xl` | 3 | 48 | Colophon issue number, Back Issues month heads | Display 300, opsz 48 | 1.0 | −0.02em |
| `--text-4xl` | 4.5 | 72 | Desktop masthead numeral (rail) | Display 300, opsz 72 | 0.95 | −0.03em |
| `--text-5xl` | clamp(5.5rem, 28vw, 7rem) | 88–112 | Phone masthead numeral | Display 300, opsz 96 | 0.9 | −0.04em |

`--leading-tight: 1.1`, `--leading-body: 1.467`. Display sizes always set `font-optical-sizing: auto` and, where the browser ignores it (older WebViews), an explicit `font-variation-settings: "opsz" 96`.

### 5.3 Numerals

- **Every number in the app is Geist Mono** — tabular by construction, so counters, folios, times and streaks never jitter and always align in columns. This is a hard rule; `tnum` in Geist is never relied upon.
- The masthead date numeral and week-spread numerals are the exception: Bricolage Grotesque with `font-variant-numeric: lining-nums tabular-nums`. If the Fontsource build lacks `tnum`, the numeral is fixed-width by layout — each digit sits in a `0.62em` column, which the digit-roll component needs anyway.
- Roman numerals for section heads (`I`, `II`, `III`) are Geist Mono capitals, tracked +0.08 em.
- Times are 24-hour `HH:MM`, Geist Mono. The issue number is `daysBetween(firstIssueDay, dayKey) + 1`, which equals day-of-year when the first issue was 1 January: `No. 249`. Dates in running heads: `SUN 06 SEP`.

**Special scripts:** a latin subset ships; Devanagari or CJK typed into an entry falls through to the system font at the same size — acceptable, no extra font files for this app.

---

## 6. Spacing, radius, elevation, borders

8 px baseline, 4 px half-step. Outer margins 20 px on phone, 32 px on desktop.

| Token | Value | Token | Value |
|---|---|---|---|
| `--space-1` | 0.25rem (4) | `--space-7` | 2rem (32) |
| `--space-2` | 0.5rem (8) | `--space-8` | 2.5rem (40) |
| `--space-3` | 0.75rem (12) | `--space-9` | 3rem (48) |
| `--space-4` | 1rem (16) | `--space-10` | 4rem (64) |
| `--space-5` | 1.25rem (20) | `--space-11` | 5rem (80) |
| `--space-6` | 1.5rem (24) | `--space-12` | 6rem (96) |

| Token | Value | Where |
|---|---|---|
| `--radius-sm` | 4 px | Chips, checkbox square in checklist |
| `--radius-md` | 8 px | Buttons and inputs when they gain a box (rare) |
| `--radius-lg` | 12 px | Lifted entry card, dialogs |
| `--radius-xl` | 20 px | Detail sheet top corners |
| `--radius-full` | 999 px | Habit ring, the foil dot in the heatmap |

At rest nothing has a radius because nothing at rest has a box.

| Token | Value | Where |
|---|---|---|
| `--shadow-1` | `0 1px 0 0 rgb(0 0 0 / 0.25)` | Under the composer bar when the list scrolls beneath it |
| `--shadow-2` | `0 1px 2px rgb(0 0 0 / 0.4), 0 10px 28px rgb(0 0 0 / 0.45)` | Lifted / dragging entry |
| `--shadow-3` | `0 -8px 40px rgb(0 0 0 / 0.5)` | Open detail sheet |

Borders: `1px solid var(--border)` hairline; `var(--border-strong)` for the composer underline and sheet table rules. Rows: 56 px minimum height (44 px hit target inside), 12 px vertical padding, hairline below. Section running head: 40 px tall, hairline below, 24 px space above.

Grid: phone 4 columns (col 1 = 36 px folio margin, cols 2–4 fluid); desktop 12 columns at ≥ 1024 px (rail 320 px = cols 1–3, reading column 640 px max = cols 4–9, margin cols 10–12).

---

## 7. Motion language

**Principles.** (1) Everything moves like type being set — translate, opacity, path length; never scale beyond 1.02, never bounce, never parallax. (2) Numbers never jump — every counter rolls. (3) Layout reflows, it does not pop — every entry is a Motion `layout` element. (4) Nothing auto-plays after the masthead has rolled in. (5) One easing family; springs are over-damped and used only where a finger let go of something.

| Token | Value |
|---|---|
| `--dur-fast` | 120 ms — hover wash, underline, opacity |
| `--dur-base` | 240 ms — layout reflow, tab underline slide, sheet, digit roll |
| `--dur-slow` | 480 ms — masthead roll, evening turn, colophon rule |
| `--ease-out` | `cubic-bezier(0.2, 0.7, 0.1, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--ease-spring` | CSS `linear(0, 0.29, 0.62, 0.84, 0.95, 1)` (approximation of the house spring) |
| House spring (Motion) | `{ type: "spring", stiffness: 520, damping: 46, mass: 1 }` — over-damped, no visible overshoot; used for lift-drop and reorder settle only |

### 7.1 Named animations

| # | Name | Property | From → To | Duration | Easing | Stagger |
|---|---|---|---|---|---|---|
| 1 | **Masthead roll** (launch, new day) | `transform: translateY` per digit column | `+1em → 0` (new day: old `0 → −1em`, then new `+1em → 0`) | 480 ms | `--ease-out` | 30 ms per digit; issue number 60 ms after the numeral; counter last |
| 2 | **Digit roll** (any counter) | `translateY` of a 0–9 column | `−n·1em → −m·1em` | 240 ms | `--ease-out` | 20 ms per digit, rightmost first |
| 3 | **Ink strike** | SVG `<line pathLength="1">` `stroke-dashoffset` | `1 → 0` (left→right); title `opacity 1 → 0.4`; folio colour → `--ink-faint` | 320 ms; opacity 240 ms starting at 160 ms | `--ease-out` | — |
| 4 | **Entry lift** (press / long-press) | `background` transparent → `--surface`; `border-radius 0 → 12px`; `box-shadow none → --shadow-2`; `scale 1 → 1.02` | — | 120 ms up, house spring down | `--ease-out` / spring | — |
| 5 | **Re-set** (list reflow after strike / reorder / add) | Motion `layout` (transform) | old rect → new rect | 240 ms | `--ease-out` | none — all at once, like reflowing type |
| 6 | **Tab underline slide** | `transform: translateX / scaleX` of one 1 px foil rule | old tab → new tab | 240 ms | `--ease-in-out` | — |
| 7 | **Sheet rise** | `translateY 100% → 0`; scrim `opacity 0 → 1` | — | 240 ms / 120 ms | `--ease-out` | content children `opacity` 20 ms stagger, max 6 |
| 8 | **Evening turn** (evening hour reached) | `--bg` value; running-head text swap (`opacity`) | `#0A1024 → #0F172E` | 480 ms | `--ease-in-out` | running head cross-fades at 240 ms |
| 9 | **Colophon draw** | contents `opacity 1 → 0.4`; foil rule `scaleX 0 → 1` (origin left); colophon lines `opacity 0 → 1, translateY 6px → 0` | — | 240 / 480 / 240 ms | `--ease-out` | rule starts at 240 ms; lines 60 ms apart after the rule |
| 10 | **Margin word** | `opacity` mapped to drag x | `useTransform(x, [0, 90], [0, 1])`; colour muted → foil at 90 px | live | linear | — |
| 11 | **Page change** (tabs) | View Transitions cross-fade; masthead is the shared element (`view-transition-name: masthead`, one element per page) | — | 240 ms | `--ease-in-out` | fallback: opacity swap 240 ms |
| 12 | **Day-gauge tick** | `width` of the foil segment of the masthead rule | previous fraction → current | 480 ms | `--ease-out` | recomputed every minute while visible |

### 7.2 Reduced motion

`<MotionConfig reducedMotion="user">` plus a CSS `@media (prefers-reduced-motion: reduce)` layer: digit and masthead rolls become 120 ms opacity swaps; the ink strike appears instantly (title dims over 120 ms); entry lift becomes a `--surface-2` wash with no scale/shadow; sheets fade instead of rising; layout reflow is instant; View Transitions are skipped; the day gauge snaps; nothing loops. Haptics still fire (they are not motion). The user can also force reduced motion inside Colophon › Motion.

---

## 8. Signature interactions

### 8.1 The Masthead Roll
1. App opens; the running head is already in place (it is the LCP element, plain text).
2. Each digit of the date numeral rises from `+1em` into its column, 480 ms, 30 ms stagger; `No. 249` rolls in 60 ms later; the counter `3 / 7` last.
3. On day rollover while the app is open, the old numeral rolls out upward and the new one rolls in; the day gauge resets to zero foil.
- **Physics:** pure `translateY` in overflow-hidden columns; `--ease-out`.
- **Sound/haptic:** none. The app never makes a sound before the user touches it.
- **Delight:** it is the opening title card — a date stamp landing — and the first thing a screenshot shows.

### 8.2 Ink Strike
1. Tap the folio number (44 px target) or swipe the entry right past 90 px (or velocity > 600 px/s).
2. A 1 px foil line draws left→right across the title over 320 ms.
3. At 60 % of the stroke: `Haptics.impact({ style: 'light' })`; the climbing-scale note plays if sound is on.
4. Title sinks to 40 % opacity; folio swaps to an en dash in `--ink-faint`; the meta line gains `· closed 21:14`.
5. The entry re-sets itself to the foot of its section via layout animation (240 ms) while the masthead counter rolls 3/7 → 4/7.
6. Undo: for 5 s a running-foot line "Entry 03 closed — Undo" in mono replaces the composer placeholder; tapping it reverses the strike (line retracts right→left).
- **Delight:** crossing an item off a printed list with a fine pen, and the whole page quietly re-setting itself.

### 8.3 Margin Words
1. Drag an entry horizontally (`drag="x"`, `dragConstraints ±120`, `dragElastic 0.2`).
2. Rightward: the word "Done." appears in the left margin in Bricolage 200, opacity tracking distance; leftward: "When?" in the right margin.
3. At 90 px the word snaps from `--ink-muted` to foil and `Haptics.impact({ style: 'medium' })` ticks once.
4. Release past the threshold: Ink Strike (right) or the When sheet (left). Release before: the entry springs back (house spring).
- No coloured backing slabs — just the word. Gesture arbitration follows RESEARCH.md §5.4 (12 px horizontal before 250 ms = swipe; 250 ms hold = lift; otherwise scroll).

### 8.4 Folio Renumber
1. Long-press 250 ms: `Haptics.selectionStart()`; the entry lifts onto `--surface` (radius 12, `--shadow-2`, scale 1.02) — 120 ms.
2. Drag vertically (Motion `Reorder.Group axis="y"`, handle-less, activated by the hold — this avoids RESEARCH.md open item 8); other entries reflow with `layout`.
3. As the lifted entry passes each neighbour, every affected folio number re-rolls live (240 ms digit roll) and `Haptics.selectionChanged()` ticks — the list is always correctly numbered.
4. Drop: the card flattens back into a hairline entry on the house spring; order persisted as a fractional index (RESEARCH.md §5.5).
- **Delight:** you can watch the catalogue renumber itself under your thumb.

### 8.5 The Colophon
1. The last open entry of Today is struck.
2. After the strike settles (400 ms), the contents fade to 40 %; a single foil rule draws across the reading column (480 ms).
3. Beneath it the colophon typesets line by line (60 ms apart) in Geist Mono 13 px with the issue number in Bricolage 300 / 48 px — four lines, exactly:

   ```
   Issue No. 249
   Closed at 21:14. Seven entries.
   Streak 12 days. Longest 31.
   Set in Bricolage Grotesque & Geist.
   ```

   Issue No. 1 omits the time and the `Longest` clause: `Issue No. 1` / `Closed. Three entries.` / `Streak 1 day.` / `Set in Bricolage Grotesque & Geist.` Singular forms are `One entry.` and `Streak 1 day.`; counts up to twelve are words, from 100 upwards numerals (`100 entries.`).
4. `Haptics.notification({ type: 'success' })`; the two-note closing chime if sound is on.
5. A hairline input appears: "A line for the record —" (the standfirst, optional). Enter files it into Back Issues.
6. Buttons: "Share the issue" (renders masthead + colophon to a 1080×1920 PNG via SVG → canvas; Capacitor Share on Android, download on web) and "Set tomorrow" (opens the Week Spread on tomorrow).
- **Delight:** no confetti, no badge — the day is printed and signed. This is the screenshot people post.

---

## 9. Screen-by-screen

Legend: `═` hairline `--border`, `▁` foil rule, `[ ]` 44 px target, `⋯` more rows.

### 9.1 Front Page (Today)

Phone:
```
┌──────────────────────────────────────┐
│ NOCTURNE · No. 249 · SUNDAY    3 / 7 │  running head, mono 11
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁════════════════════════ │  the rule is the clock (foil = day elapsed)
│                                      │
│   06   September                     │  Bricolage 300 / opsz 96 numeral; month 200 / 22
│        Good evening, Rahul.          │  greeting, Bricolage 200 / 22 (light line 1 of 2)
│                                      │
│ I — TODAY                            │
│ ════════════════════════════════════ │
│ 01  Call the bank about the card     │  folio mono / title Geist 500 17
│     09:30 · #ADMIN                   │  meta mono 11 upper
│ ════════════════════════════════════ │
│ 02  Draft the Nocturne README        │
│     #WORK · OVERDUE FRI              │  vermilion only when overdue (once per screen)
│ ════════════════════════════════════ │
│ —   Water the plants                 │  done: dash, 40 % title, foil strike
│     closed 18:02                     │
│ ════════════════════════════════════ │
│                                      │
│ II — THIS EVENING                    │
│ ════════════════════════════════════ │
│ 04  Read 20 pages                    │
│     21:00                            │
│ ════════════════════════════════════ │
│                                      │
│ +  Add to the issue…                 │  composer: hairline input, Bricolage "+" 28
│ ════════════════════════════════════ │
│ TODAY    UPCOMING    LEDGER   ISSUES │  footer tabs, mono 13; foil underline slides
│ ▁▁▁▁▁                                │
└──────────────────────────────────────┘  + env(safe-area-inset-bottom)
```
Desktop (≥ 1024 px):
```
┌────────────────┬──────────────────────────────────────┬────────────┐
│ NOCTURNE       │ I — TODAY                            │            │
│ No. 249        │ ════════════════════════════════════ │  E         │
│                │ 01  Call the bank about the card     │  v         │
│  06            │     09:30 · #ADMIN                   │  e         │
│  September     │ ════════════════════════════════════ │  n         │
│ ▁▁▁▁▁▁════════ │ 02  Draft the Nocturne README        │  i         │
│                │     #WORK · OVERDUE FRI              │  n         │
│  M  T  W  T  F │ ════════════════════════════════════ │  g         │
│  ·  1  2  3  4 │ II — THIS EVENING                    │            │
│  ⋯ (06) ⋯  ⋯  │ ════════════════════════════════════ │  E         │
│                │ 04  Read 20 pages                    │  d         │
│ TODAY ▁▁▁▁▁    │ ════════════════════════════════════ │  i         │
│ UPCOMING       │                                      │  t         │
│ LEDGER         │ +  Add to the issue…        ⌘K Find  │  i         │
│ ISSUES         │ ════════════════════════════════════ │  o         │
│ 320 px rail    │ 640 px reading column                │  n · 21:00 │
└────────────────┴──────────────────────────────────────┴────────────┘
```
- **Components:** Masthead, DayGauge, RunningHead, Entry, Composer, FooterTabs (phone) / RailNav + MiniCalendar (desktop), UndoFoot.
- **States:** *Empty* — no running heads; under the masthead, one light line: "Nothing set for today." and the composer. *Loading* — masthead renders from cached meta instantly; entries fade in at 240 ms (no skeletons; hairlines draw first). *Error* (IndexedDB unavailable) — a vermilion footnote under the masthead: "¹ Storage is unavailable in this browser; the issue will not be saved." *Success* — the Colophon (§8.5). *Evening* — ground turns to `--bg-elevated`, running head reads `EVENING EDITION`.
- **Gestures:** tap folio = strike; tap title = detail sheet; swipe right = strike; swipe left = When sheet; long-press = reorder; no pull-to-refresh. Keyboard: `j/k` move, `x` strike, `w` when, `e` edit, `n` new, `⌘/Ctrl+K` find.

### 9.2 Week Spread (Upcoming)

Phone (vertical run of day-heads):
```
│ NOCTURNE · UPCOMING                  │
│ ════════════════════════════════════ │
│ SUN   07               2 entries     │  mono weekday, Bricolage 36 numeral
│ ════════════════════════════════════ │
│ 01  Weekly review          10:00     │
│ 02  Groceries              #HOME     │
│                                      │
│ MON   08               overdue 1     │  vermilion, once per screen
│ ════════════════════════════════════ │
│ 01  Renew passport         DUE       │
│ ⋯                                    │
```
Desktop: seven 1-fr columns under a single hairline, each with a small masthead (weekday mono, numeral Bricolage 36) and entries beneath; drag an entry onto another day-head (dnd-kit cross-list, `DragOverlay` = the lifted entry) and both day counters roll.
- **States:** empty day = day-head only with a "—" folio; past days are not shown (they live in Issues); loading = day-heads draw first.
- **Gestures:** phone: long-press → drag to another day-head (the head washes `--surface-2` when hovered 400 ms); swipe left on an entry opens the When sheet as elsewhere.

### 9.3 The Ledger (Habits)

```
│ NOCTURNE · LEDGER                    │
│ ════════════════════════════════════ │
│ Morning pages            11 · 11   ◔ │  name Geist 17 / streak · best mono / ring 24 px
│ ════════════════════════════════════ │
│ Run                        3 · 3   ◑ │
│ ════════════════════════════════════ │
│ No sugar                  0 · 12   ○ │  missed: ring track only, no red, no shame copy
│ ════════════════════════════════════ │
│                                      │
│ 12 WEEKS                             │  (expanded on tap)
│ · · ● ● ● · ● ● ● ● ● ● · ●  06      │  foil dot = done, hairline circle = missed,
│ ● ● ● ● ● · · ● ● ● ● ● ● ●          │  today's day-of-month numeral in mono
│ 78 %  strength                       │  Bricolage 36 inside the enlarged ring
```
- **Components:** LedgerLine, StrengthRing (SVG, 1 px `--surface-2` track, foil arc, Loop score), Heatmap12 (SVG grid), DigitRoll for streaks.
- **Tap the line** completes today: arc extends 240 ms, streak digit rolls, `impact light`. Long-press opens habit detail (frequency, reminder, freeze token as a mono footnote "¹ 1 freeze available").
- **States:** empty — "No habits in the ledger." + composer variant "Add a habit…"; archived habits sit under a running head `ARCHIVED` in `--ink-faint`.
- Desktop: same list in the reading column; the right margin shows the 12-week grid of the selected habit.

### 9.4 Back Issues (Logbook)

```
│ NOCTURNE · BACK ISSUES               │
│ ════════════════════════════════════ │
│ SEPTEMBER                            │  Bricolage 48 month head
│ ════════════════════════════════════ │
│ No. 248 · SAT 05 SEP · 6 / 6 · closed 22:03 │
│     Finally shipped the keystore workflow.  │  standfirst, Bricolage 200 / 15
│ ════════════════════════════════════ │
│ No. 247 · FRI 04 SEP · 4 / 7 · open  │  not closed: no time, muted
│ ════════════════════════════════════ │
│ WEEK 36 · 25 / 29 · 3 issues closed  │  weekly review running head every Monday
│ ⋯                                    │
```
- Tap a row → that issue's Front Page, frozen, with its colophon; "Share the issue" available. Desktop: same list; the right margin shows the selected issue's colophon.
- **States:** empty — "No back issues yet. Close today's to start the archive."; loading — month heads first.

### 9.5 Entry (task detail sheet)

```
│ ░░ masthead visible through 16 px blur ░░ │
┌──────────────────────────────────────┐  --surface, radius-xl top, --shadow-3
│ ──                                   │  grabber 36×4 --border-strong
│ 02  Draft the Nocturne README        │  Bricolage 400 / 28 headline
│                                      │
│ Notes in Geist 15/22. Paste a list   │
│ to make sub-entries.                 │
│                                      │
│ 02.1  [ ] Outline                    │  checklist as sub-entries, mono folio
│ 02.2  [x] Screenshots                │
│ ════════════════════════════════════ │
│ WHEN        Today               ›    │  two-column mono table, hairlines
│ DEADLINE    Sat 12 Sep          ›    │
│ REPEAT      Every weekday       ›    │
│ REMINDER    17:00 ¹             ›    │
│ TAGS        #WORK               ›    │
│ ════════════════════════════════════ │
│ ¹ Reminders may be delayed until you │  exact-alarm footnote, mono 11, foil
│   allow "Alarms & reminders". Open › │
│                                      │
│ Move to Someday      Delete the entry│  text buttons; Delete in vermilion (the one)
└──────────────────────────────────────┘
```
- 92 % height on phone; a 560 px centered dialog on desktop (same content, scrim at 40 %).
- **States:** edits autosave (Dexie `put` on blur, 300 ms debounce); delete asks once inline ("Delete? — Yes / Keep"); recurring entries show "Instance 4 · every weekday" in the table; error saving → vermilion footnote.
- **Gestures:** drag the grabber down or swipe down on the headline to dismiss; predictive back on Android closes it.

### 9.6 Composer (Quick add)

```
│ 05  Call mom  TOMORROW 17:00  #FAMILY  EVERY WEEK   │
│ ═══════════════════════════════════════════════════ │  underline --border-strong → foil while focused
│     Enter to file · Shift+Enter for this evening    │  mono 11 hint
```
- The hairline input expands to full width; the entry's future folio (`05`) appears in the margin before commit; chrono-node and the `every …` grammar turn understood spans into inline mono small-cap chips (`--surface-2`, radius-sm) on the same baseline. Tap a chip to discard its meaning (text stays). Enter files the entry with a Re-set animation into the right section; the field stays open for rapid entry.
- **States:** parse failure shows nothing (no red); empty Enter closes; while an undo is pending the hint line becomes the UndoFoot.

### 9.7 Colophon (Settings & backup)

```
│ NOCTURNE · COLOPHON                  │
│ ════════════════════════════════════ │
│ EDITION                              │
│ Theme            Night · Proof · Auto│
│ Evening hour     21:00           ›   │
│ Day rollover     03:00           ›   │
│ Motion           System · Reduced    │
│ Sound            Off · On · Quiet hrs│
│ ════════════════════════════════════ │
│ REMINDERS                            │
│ Daily review     21:00           ›   │
│ Exact alarms     Not allowed  Open › │  foil text when denied (a warning is a footnote)
│ Not firing?      Read the note   ›   │
│ ════════════════════════════════════ │
│ BACKUPS                              │
│ Last printed     2 h ago · gist abc123 │  --success only here
│ Export / Import  JSON · Markdown     │
│ GitHub Gist      PAT ····· 7f    ›   │
│ Google Drive     Not connected   ›   │
│ ════════════════════════════════════ │
│ Set in Bricolage Grotesque, Geist &  │
│ Geist Mono (SIL OFL). Motion, Dexie, │  attribution, mono 11 — part of the design
│ chrono-node, Lucide. Nocturne 0.4.2. │
```
- **States:** Gist/Drive rows show `--danger` "Failed 10:02 — Retry" on error; the PAT entry is a hairline password field with a "session only" toggle; import shows a mono progress line `Importing 1,204 / 2,310`; the Drive row on Android explains the social-login path or hides itself if unavailable.

### 9.8 First open (Issue No. 1)

```
│ NOCTURNE · No. 1 · SUNDAY      0 / 3 │
│ ▁═══════════════════════════════════ │
│   06   September                     │
│        Welcome to your first issue.  │
│ I — TODAY                            │
│ ════════════════════════════════════ │
│ 01  Swipe me right when I'm done     │
│ 02  Swipe me left to move me         │
│ 03  Hold me to change the order      │
│ ════════════════════════════════════ │
│ +  Add to the issue…                 │
```
- Three sample entries teach the grammar; closing all three prints the first colophon ("Issue No. 1 closed. Three entries. Streak 1 day.") and only then asks for notification permission on Android. No tour, no overlay. Same layout on desktop inside the reading column.

### 9.9 Android widget (Phase 6, someday)

```
┌──────────────────────────┐
│ No. 249 · 3 / 7          │  system font (RemoteViews cannot load custom fonts)
│ ▁▁▁▁▁════════════════════ │  day gauge as two coloured views
│ Draft the Nocturne README│  next entry, ink on --bg
│ Streak 12                │
└──────────────────────────┘
```
- 4×2 static text widget first; tap deep-links `nocturne://today`. Foil and navy come from token values baked into `res/values/colors.xml`; the masthead mimicry comes from layout, not font.

---

## 10. Component inventory

| Component | Variants | States |
|---|---|---|
| Masthead | phone (numeral 88–112), rail (72), issue-frozen, widget | rolling-in, idle, evening, new-day |
| DayGauge | masthead rule, widget | 0–100 % foil; reduced (snap) |
| RunningHead | section (roman numeral), page (`NOCTURNE · …`), month (Bricolage 48), week review | default, active-section wash |
| Entry | task, sub-entry (checklist), habit line, back-issue row, frozen | rest, hover/active wash, pressed/lifted, dragging, striking, done, overdue (one vermilion token), selected (focus ring) |
| Folio | number, dash (done), future (composer preview) | rolling, dimmed |
| MarginWord | "Done." (left), "When?" (right) | tracking, armed (foil) |
| Composer | today, evening (Shift+Enter), habit, standfirst | idle, focused (foil underline), parsing (chips), undo-foot |
| Chip | parsed span, tag, table value | default, removable, discarded (muted, never red) |
| FooterTabs / RailNav | phone strip, desktop rail | active underline; badge-less (counts live in the masthead) |
| MiniCalendar (desktop) | month | today circled (hairline), entries as foil dots |
| Sheet | entry detail, When picker, habit detail, Gist/Drive setup | rising, open, dismissing; desktop dialog variant |
| MonoTable | key–value rows (sheet), backup status | editable row (›), read-only, error row |
| StrengthRing | 24 px inline, 96 px detail | 0–100 %, track only (no data) |
| Heatmap12 | 12-week grid | done dot, missed circle, today numeral, frozen (foil circle) |
| DigitRoll | 1–4 digits, `3 / 7` pair | rolling, reduced |
| Colophon | end-of-day, frozen (back issue), share render | drawing, printed, with standfirst |
| Footnote | superscript mark + mono 11 line | info (muted), warning (foil), error (vermilion) |
| Button | text (default), filled foil (max one per screen), vermilion text (destructive) | hover wash, pressed (translateY 1 px), disabled (ink-faint), focus ring |
| Segmented (Night · Proof · Auto) | mono labels | selected (foil underline) |
| Input | hairline underline, password (PAT) | rest, focused (foil), error (vermilion underline + footnote) |
| GrainOverlay | page | on (0.035), off (Proof, reduced-transparency) |
| UndoFoot | after strike / delete | 5 s countdown as a shrinking foil rule |

Primitives come from `components/ui` (shadcn on Base UI, MIT) restyled through tokens; nothing is forked.

---

## 11. Iconography, illustration, imagery

- **Icons:** Lucide (ISC, https://lucide.dev), 1.5 px stroke, 16 px, `--ink-muted`; used **only** inside the Colophon settings and for the share/undo affordances. `›` in tables is a text glyph. The main surfaces have zero icons — folio numbers, words and rules do the work. No tab icons.
- **Illustration:** none. Empty states are one light-weight line of type.
- **Imagery:** none bundled. The share PNG is rendered from the app's own SVG.
- **App icon:** a navy square with a foil "N" set in Bricolage Grotesque 300 (own artwork; glyph outlines in a logo are permitted under the OFL). Generated at all sizes by `@vite-pwa/assets-generator` (MIT).
- **Typeface licences:** Bricolage Grotesque, Geist, Geist Mono — SIL OFL 1.1 (https://openfontlicense.org). Credits rendered in the Colophon screen and in the README Attribution section (D5.4).

---

## 12. Sound & haptics

Sound is **off by default**, unlocked on first pointer event, master 0.35, with quiet hours. Everything is synthesised with Web Audio — zero assets, zero licensing; Howler (allowed by D1) is not needed for this app.

| Event | Sound (synth) | Haptic (`@capacitor/haptics`; web `navigator.vibrate`) |
|---|---|---|
| Ink strike | Platen tick: 40 ms band-passed noise burst, −18 dBFS, then the **climbing scale** note: sine, 8 ms attack / 600 ms decay, pentatonic step n of the day (C4 D4 E4 G4 A4 C5 D5 …), resets at rollover | `impact light` at 60 % of the stroke; web `vibrate(8)` |
| Swipe crosses 90 px | — | `impact medium` |
| Long-press lift | — | `selectionStart` |
| Folio renumber during drag | — (never sound; too chatty) | `selectionChanged` per passed neighbour |
| Drop | Low "thock": 90 Hz sine, 70 ms exponential decay | `selectionEnd` |
| Colophon | Two-note chime: sine 440 → 660 Hz, 300 ms, slow release | `notification success` |
| Reminder cannot be exact | — | `notification warning` (once, at setup) |
| Undo | The tick reversed (noise burst with 60 ms fade-in) | — |

Never a haptic without a gesture; never a haptic on scroll. If a CC0 sample is ever preferred for the chime, source it from freesound.org with the CC0 filter (https://freesound.org/search/?license=Creative+Commons+0) or Kenney (https://kenney.nl/assets?q=audio, CC0) and list it in `public/sounds/ATTRIBUTION.md`.

---

## 13. Accessibility rules

- **Contrast:** all text ≥ 4.5:1 in both themes (tables in §4). `--ink-faint` is decorative only and always paired with a semantic the AT can read (done, disabled). Vermilion on `--surface-2` is 5.0:1 (Night) / 5.4:1 (Proof). Foil-button text 11.1:1 / 5.9:1.
- **Focus:** `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px }` on every interactive element; the keyboard-selected entry additionally gets the `--surface-2` wash. Focus is never removed or hidden.
- **Touch targets:** every target ≥ 44×44 px — folio numbers get a 44 px hit box although the glyph is 11 px; rows are 56 px; footer tabs 48 px tall; chips 32 px tall with a 44 px hit area.
- **Motion:** §7.2. Nothing auto-plays after launch; the masthead roll is skipped under reduced motion.
- **Screen reader:** entries are list items containing a button ("Mark done, entry 3, Draft the README, overdue Friday"); a strike announces "Closed at 21:14" via `aria-live="polite"`; counters have a visually hidden text twin and the DigitRoll digits are `aria-hidden`; the day gauge is `role="progressbar"` with `aria-valuetext="14 hours until rollover"`; sheets are `role="dialog"` with focus trap and focus return; margin words are `aria-hidden` (the gesture has keyboard equivalents `x` and `w`).
- **Keyboard:** the whole app works without a pointer: `j/k` or arrows move selection, `x` strike, `w` when, `e` edit, `n` new, `⌘/Ctrl+K` find, `[` / `]` switch tabs, `Alt+↑/↓` reorder, `Esc` closes sheets.
- **Text scaling:** all sizes in rem; layout tested at 130 % font size — rows grow, nothing truncates except meta lines (ellipsis; full text in the sheet).
- **Colour is never the only signal:** overdue = vermilion **and** the word `OVERDUE`; done = dash **and** strike **and** "closed" time.
- **Language:** `lang="en"`; dates via `Intl` in the user's locale even though the running-head format is fixed.

---

## 14. Android-specific notes

- **Edge-to-edge:** Capacitor 8 SystemBars (`import { SystemBars } from "@capacitor/core"`): status and navigation bars transparent; content padded with `env(safe-area-inset-top/bottom)`; the footer tab strip sits above the gesture-nav area; keyboard avoidance uses `@capacitor/keyboard` `keyboardWillShow` to translate the composer, not the page.
- **Status bar:** light icons on Night, dark on Proof; background transparent; the masthead running head starts 8 px below the inset.
- **Gesture navigation:** no horizontal swipe target within 24 px of the screen edges (entries have a 20 px margin plus the 36 px folio column, so the swipe starts inside). Predictive back (Android 14+) closes sheets; on the root it is the system default.
- **Splash:** `@capacitor/splash-screen` with plain `--bg` navy and the foil "N" centered, `launchFadeOutDuration: 0` so the masthead roll is the real opening; `androidScaleType: CENTER`.
- **Icon:** adaptive icon — background `#0A1024`, foreground foil `#E8C170` "N" glyph with 18 % safe padding, monochrome layer = the same glyph for themed icons (Android 13+). Notification small icon: the "N" glyph in white.
- **Theme colour:** `<meta name="theme-color" content="#0A1024">` (Night) / `#F5F1E8` (Proof), switched with the theme; `manifest.background_color = "#0A1024"`.
- **Fonts in WebView:** variable fonts render fine in Android System WebView ≥ 110; cap the masthead at 112 px and test on a real device for hinting artefacts at fractional DPR; 1 px hairlines (never 0.5 px).
- **Notifications:** the exact-alarm footnote (§9.5) and the `on:` schedule per RESEARCH.md §5.7; the daily review notification copy is in the app's voice: "Evening Edition — 3 entries still open."
- **Widget:** RemoteViews with system fonts; colours from `colors.xml` mirroring the tokens; `capacitor-widget-bridge` payload `{ issue, done, total, next, streak, gauge }`.
- **Performance:** no canvas, no WebGL; the grain filter is one SVG filter on a fixed pseudo-element; lists are virtualised only beyond 200 entries; LCP is the running head (plain text).

---

## 15. CSS design tokens

Paste into `src/styles/tokens.css`; Tailwind maps them through `@theme inline`.

```css
:root {
  /* ---- Night (default) ---- */
  --bg: #0A1024;
  --bg-elevated: #0F172E;
  --surface: #131C36;
  --surface-2: #1A2542;
  --ink: #EEF1F8;
  --ink-muted: #9AA6C4;
  --ink-faint: #5B6685;
  --accent: #E8C170;
  --accent-ink: #0A1024;
  --accent-2: #EC6D58;
  --success: #9CCBB0;
  --warning: var(--accent);
  --danger: var(--accent-2);
  --border: #26304D;
  --border-strong: #3A4666;
  --focus: #F2D68A;

  /* ---- Type ---- */
  --font-display: "Bricolage Grotesque Variable", "Geist Variable", system-ui, sans-serif;
  --font-body: "Geist Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Geist Mono Variable", ui-monospace, "Cascadia Mono", Consolas, monospace;
  --text-xs: 0.6875rem;
  --text-sm: 0.8125rem;
  --text-base: 0.9375rem;
  --text-md: 1.0625rem;
  --text-lg: 1.375rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.25rem;
  --text-3xl: 3rem;
  --text-4xl: 4.5rem;
  --text-5xl: clamp(5.5rem, 28vw, 7rem);
  --leading-tight: 1.1;
  --leading-body: 1.467;
  --tracking-caps: 0.08em;
  --tracking-mono: 0.04em;
  --tracking-display: -0.03em;

  /* ---- Space ---- */
  --space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem; --space-4: 1rem;
  --space-5: 1.25rem;  --space-6: 1.5rem;   --space-7: 2rem;    --space-8: 2.5rem;
  --space-9: 3rem;     --space-10: 4rem;    --space-11: 5rem;   --space-12: 6rem;
  --page-margin: 1.25rem;
  --folio-col: 2.25rem;
  --row-min: 3.5rem;

  /* ---- Shape & depth ---- */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 20px; --radius-full: 999px;
  --shadow-1: 0 1px 0 0 rgb(0 0 0 / 0.25);
  --shadow-2: 0 1px 2px rgb(0 0 0 / 0.4), 0 10px 28px rgb(0 0 0 / 0.45);
  --shadow-3: 0 -8px 40px rgb(0 0 0 / 0.5);
  --hairline: 1px solid var(--border);
  --grain-opacity: 0.035;
  --sheet-scrim: rgb(15 23 46 / 0.72);
  --sheet-blur: 16px;

  /* ---- Motion ---- */
  --dur-fast: 120ms;
  --dur-base: 240ms;
  --dur-slow: 480ms;
  --ease-out: cubic-bezier(0.2, 0.7, 0.1, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: linear(0, 0.29, 0.62, 0.84, 0.95, 1);

  /* ---- App-specific ---- */
  --evening-hour: 21;          /* read by JS; the Evening Turn swaps --bg to the --bg-elevated value */
  --day-gauge: 0;              /* 0–1, set by JS every minute */
  --swipe-threshold: 90px;
  --strike-width: 1px;
  color-scheme: dark;
}

:root[data-theme="proof"] {
  --bg: #F5F1E8;
  --bg-elevated: #ECE6D8;
  --surface: #FBF9F3;
  --surface-2: #E4DCCB;
  --ink: #0A1024;
  --ink-muted: #414B66;
  --ink-faint: #8A93AB;
  --accent: #745816;
  --accent-ink: #F5F1E8;
  --accent-2: #9E2F1C;
  --success: #24634A;
  --border: #D9D1BF;
  --border-strong: #B8AE9B;
  --focus: #6E5414;
  --shadow-2: 0 1px 2px rgb(10 16 36 / 0.12), 0 10px 28px rgb(10 16 36 / 0.16);
  --shadow-3: 0 -8px 40px rgb(10 16 36 / 0.18);
  --sheet-scrim: rgb(236 230 216 / 0.78);
  --grain-opacity: 0;
  color-scheme: light;
}

/* "Auto" theme: `@media (prefers-color-scheme: light) { :root:not([data-theme]) { …same values as [data-theme="proof"]… } }`
   — generate both from one source (a PostCSS mixin or a duplicated block) so they never drift. */

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 120ms; --dur-slow: 120ms; }
}
```

`src/styles/motion.ts` exports the same values for Motion: `spring = { type: "spring", stiffness: 520, damping: 46, mass: 1 }`, `ease.out = [0.2, 0.7, 0.1, 1]`, `ease.inOut = [0.65, 0, 0.35, 1]`, `dur = { fast: 0.12, base: 0.24, slow: 0.48 }`.

Tailwind bridge (`src/index.css`): `@theme inline { --color-bg: var(--bg); --color-ink: var(--ink); --color-accent: var(--accent); --font-display: var(--font-display); --font-sans: var(--font-body); --font-mono: var(--font-mono); --radius-lg: var(--radius-lg); … }`.

---

## 16. Asset checklist

- [ ] `@fontsource-variable/bricolage-grotesque` (`/full.css`), `@fontsource-variable/geist`, `@fontsource-variable/geist-mono` installed; latin subset only; total ≤ 350 KB; `font-display: swap`; confirm `opsz` and `tnum` are present in the Bricolage build (quick `font-variation-settings` test in `design/preview.html`).
- [ ] `design/preview.html` — Front Page (Night + Proof + Evening), Ledger, Colophon end-state; this file is the visual contract (D9.3).
- [ ] `src/styles/tokens.css` from §15; `src/styles/motion.ts`.
- [ ] Grain SVG filter as an inline `<svg>` in `index.html`.
- [ ] App icon SVG (navy square, foil "N") → `@vite-pwa/assets-generator` output: PWA icons 192/512 + maskable, favicon, Apple touch; Android adaptive icon layers (`ic_launcher_background.xml` #0A1024, `ic_launcher_foreground.xml`, `ic_launcher_monochrome.xml`); notification small icon.
- [ ] Splash: `android/app/src/main/res/drawable/splash.xml` navy + centered glyph; `capacitor.config.ts` SplashScreen `backgroundColor: "#0A1024"`, `launchFadeOutDuration: 0`.
- [ ] `colors.xml` mirroring `--bg`, `--accent`, `--ink`, `--ink-muted` for the widget and system bars.
- [ ] Web Audio synth module (`src/features/sound/synth.ts`): tick, scale note, thock, chime, undo; no audio files. `public/sounds/ATTRIBUTION.md` only if a CC0 sample is ever added.
- [ ] Share render template (`src/features/colophon/ShareCard.tsx`): 1080×1920 SVG → PNG with fonts embedded as data URIs from the Fontsource files.
- [ ] Widget layout `widget_today.xml` + `NocturneWidgetProvider.kt` (Phase 6, someday).
- [ ] README Attribution section: fonts (OFL), Lucide (ISC), Motion (MIT), Dexie (Apache-2.0), chrono-node (MIT), Capacitor (MIT).
- [ ] Playwright screenshot tests: Front Page phone/desktop, Evening, Proof, Colophon, reduced-motion snapshot.
