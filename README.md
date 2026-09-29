# Nocturne

*Your day, printed as a single issue.*

**Status: Planned — not started** (docs complete 2026-09-06; no code yet).

## Summary

- A local-first daily to-do and habit tracker: Today is an "issue" with a masthead, folio-numbered entries between hairlines, and a colophon that prints when the last entry is struck.
- Plain-English quick add (chrono-node + a small `every …` grammar), swipe-to-strike, hold-to-reorder, an in-house recurrence engine, Loop-style habit strength.
- Vite 8 + React 19 + TypeScript, Tailwind v4 tokens, Motion 13, Dexie 4 (IndexedDB), Zustand 5; the same `dist/` ships as a PWA on GitHub Pages and as a Capacitor 8 Android APK built by GitHub Actions.
- Android extras: exact/inexact local reminders (`@capacitor/local-notifications`), haptics, share-sheet backup; home-screen widget later.
- Free, offline, no accounts, no analytics, no LLM; JSON backup by default, GitHub Gist backup with the user's own token.

## Documents

| File | What |
|---|---|
| [GOAL.md](GOAL.md) | Goal statement, vibe, success criteria, non-goals, MVP / v1 / Someday feature split |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Verified library/API research with verification log |
| [docs/DESIGN.md](docs/DESIGN.md) | "The Evening Edition" design system: tokens, type, motion, every screen |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, data model, algorithms, offline/Android/backup design, budgets |
| [docs/PLAN.md](docs/PLAN.md) | Phased build plan with checkboxes, definitions of done, the Weekend MVP path |
| [docs/TESTING.md](docs/TESTING.md) | Test strategy, the golden fixtures the engine is written against, day-1 verification list, Android manual checklist |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Repo / Pages / APK runbook: workflows, secrets, keystore, release checklist, rollback |
| [docs/IMPLEMENTATION-PROMPT.md](docs/IMPLEMENTATION-PROMPT.md) | The self-contained build prompt — every token, type, algorithm and workflow inlined. **Wins on any disagreement with the other documents** (see its §0.2) |
| [design/preview.html](design/preview.html) | The visual contract (written; if the app looks worse than this, it is not done) |
| [../_shared/DECISIONS.md](../_shared/DECISIONS.md) | Cross-project binding decisions (this project is row 01 of §D8) |

## Quickstart (from zero, Windows 11, Node 22, Git Bash)

The project folder itself becomes the repo so `docs/` and `design/` stay with the code (per `_shared/DECISIONS.md` §D6).

```bash
cd /c/Work/Personal_Projects/01-nocturne-goal-tracker

# 1. Scaffold (choose "Ignore files and continue" when Vite notices docs/ already exists)
npm create vite@latest . -- --template react-ts
npm install

# 2. Runtime dependencies
npm i tailwindcss @tailwindcss/vite motion dexie dexie-react-hooks dexie-export-import zustand \
      react-router chrono-node date-fns @date-fns/tz fractional-indexing lucide-react cmdk \
      @fontsource-variable/bricolage-grotesque @fontsource-variable/geist @fontsource-variable/geist-mono

# 3. Capacitor 8 core + the plugins Nocturne uses (all MIT)
npm i @capacitor/core @capacitor/android @capacitor/app @capacitor/haptics @capacitor/local-notifications \
      @capacitor/preferences @capacitor/filesystem @capacitor/share @capacitor/status-bar \
      @capacitor/splash-screen @capacitor/keyboard
npm i -D @capacitor/cli

# 4. Tooling
npm i -D vite-plugin-pwa @vite-pwa/assets-generator vitest @vitest/coverage-v8 \
         @testing-library/react @testing-library/user-event @testing-library/jest-dom \
         jsdom fake-indexeddb @playwright/test @axe-core/playwright @biomejs/biome
npx biome init
npx playwright install chromium

# 5. Accessible primitives (shadcn/ui on Base UI, MIT) — only the sheet/dialog is needed
npx shadcn@latest init
npx shadcn@latest add dialog

# 6. Android shell (writes files only; no Java needed locally). appId must never change after first install.
npx cap init Nocturne com.rahul.nocturne --web-dir dist
npx cap add android
printf 'android/gradlew text eol=lf\n*.sh text eol=lf\n' >> .gitattributes

# 7. Shared CI templates and signing block
mkdir -p .github/workflows
cp ../_shared/templates/pages.yml            .github/workflows/pages.yml
cp ../_shared/templates/android-release.yml  .github/workflows/android-release.yml
# Merge ../_shared/templates/app-build.gradle.snippet into android/app/build.gradle
# (namespace + applicationId = com.rahul.nocturne).

# 8. Signing key (run OUTSIDE the repo; back up the .p12 + passphrase)
(cd /c/Work && bash /c/Work/Personal_Projects/_shared/scripts/make-keystore.sh nocturne)

# 9. Repo, secrets, Pages
git init -b main && git add -A && git commit -m "Scaffold Nocturne"
gh repo create nocturne --public --source=. --push
gh secret set ANDROID_KEYSTORE_BASE64  < /c/Work/nocturne-release.p12.b64
gh secret set ANDROID_KEYSTORE_PASSWORD   # paste passphrase
gh secret set ANDROID_KEY_ALIAS  --body release
gh secret set ANDROID_KEY_PASSWORD        # same passphrase (PKCS12)
# GitHub → repo Settings → Pages → Source: "GitHub Actions". Push to main = live site.
# git tag v0.1.0 && git push origin v0.1.0  = signed APK on the Releases page.
```

`vite.config.ts` must set `base: process.env.VITE_BASE_PATH ?? "/"` (Pages builds with `/nocturne/`, the APK with `/`), use `createHashRouter`, and register the service worker only when `!Capacitor.isNativePlatform()`. Full details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §7–§9 and [docs/PLAN.md](docs/PLAN.md) Phase 0.

## Attribution

Nocturne's own code is MIT. It bundles or depends on:

| Asset / library | Licence | Notes |
|---|---|---|
| Bricolage Grotesque (Mathieu Triay) via `@fontsource-variable/bricolage-grotesque` | SIL OFL 1.1 | Display: masthead, greetings, numerals |
| Geist and Geist Mono (Vercel) via `@fontsource-variable/geist`, `@fontsource-variable/geist-mono` | SIL OFL 1.1 | Body text; every number |
| Lucide icons (`lucide-react`) | ISC | Colophon/settings icons only |
| Motion (`motion`) | MIT | Layout, drag, reorder animation |
| Dexie, dexie-react-hooks, dexie-export-import | Apache-2.0 | IndexedDB storage and backup format |
| React 19, Vite 8, React Router 7, Zustand, Tailwind CSS v4, date-fns, chrono-node, vite-plugin-pwa (Workbox), cmdk, Biome, Vitest, Playwright | MIT | Framework, build, tooling |
| `fractional-indexing` (David Greenspan) | CC0-1.0 | Ordering keys |
| Capacitor and `@capacitor/*` plugins | MIT | Android shell, notifications, haptics, filesystem, share |
| shadcn/ui components on Base UI | MIT | Dialog/sheet primitive, restyled with tokens |
| `capacitor-widget-bridge` (someday) | MIT | Android widget bridge |
| `@capgo/capacitor-social-login` (someday, optional) | MPL-2.0 | Google authorization on Android for Drive backup |
| Habit strength formula | Re-implemented from the published description of Loop Habit Tracker's score (`0.5^(sqrt(freq)/13)` smoothing); no GPL code copied | Loop itself is GPL-3.0 and is not a dependency |
| Sounds | None bundled — every sound is synthesised with Web Audio | If a CC0 sample is ever added it is listed in `public/sounds/ATTRIBUTION.md` |
| App icon, splash, share card | Original artwork (navy square, foil "N" set in Bricolage Grotesque; glyph outlines in a logo are permitted under the OFL) | — |

Runtime services (optional, user-configured, user's own tokens): GitHub Gist REST API (GitHub Terms of Service), Google Drive API `appDataFolder` (Google APIs Terms). No data is sent anywhere unless the user configures one of these.
