# Nocturne — Deployment Runbook

Written 2026-09-06. Follows `_shared/DECISIONS.md` D2 (GitHub Pages, repo `nocturne`), D3 (Capacitor 8 APK signed in GitHub Actions), D6 (repo layout), D9.1 ("Day 1 = live"). Shared assets referenced here: `_shared/templates/pages.yml`, `_shared/templates/android-release.yml`, `_shared/templates/app-build.gradle.snippet`, `_shared/scripts/make-keystore.sh`. **Nocturne has no Cloudflare Worker** (D8: proxy "none") — §4 explains why and what to do if that ever changes.

> **2026-09-29 implementation notes:** the repo already contains `.github/workflows/{pages,ci,android-release}.yml`, the signing block in `android/app/build.gradle`, `.gitignore`/`.gitattributes` and `LICENSE`. Differences from this runbook: `capacitor.config.json` (not `.ts`), no Tailwind in `vite.config.ts`, the manual APK workflow builds a debug-signed APK when no keystore secrets exist, and tag builds refuse to run without them. The short version of §1–§9 is README → *Go live*.

Shell conventions: PowerShell for `npm`/`git`/`gh`; **Git Bash** for `make-keystore.sh` (needs OpenSSL and `base64 -w0`).

---

## 0. Names and constants (decide once, never change)

| Item | Value | Notes |
|---|---|---|
| GitHub repo | `nocturne` (public) | D2 suggested name; public = Pages + unlimited Actions minutes |
| Web URL | `https://<owner>.github.io/nocturne/` | `<owner>` = your GitHub username |
| Vite `base` on Pages | `/nocturne/` | injected as `VITE_BASE_PATH` by `pages.yml` |
| Vite `base` in the APK | `/` | Capacitor serves from `https://localhost/` |
| Router | React Router 7, **hash router** (`createHashRouter`) | routes look like `/nocturne/#/` (Today), `#/upcoming`, `#/ledger`, `#/issues`, `#/issues/:dayKey`, `#/colophon` |
| App name | `Nocturne` | `capacitor.config.ts` `appName`, manifest `name`/`short_name` |
| Android `appId` / `applicationId` / `namespace` | `com.rahul.nocturne` | **Immutable after the first install** — a change means a fresh app on the phone |
| Deep-link scheme | `nocturne://` (`nocturne://today`, `nocturne://complete/{id}`) | used by notifications (later) and the widget (Phase 6, someday) |
| Keystore | `nocturne-release.p12`, alias `release`, PKCS12 | produced by `make-keystore.sh nocturne`; backed up per §11 |
| Version scheme | git tag `vMAJOR.MINOR.PATCH`; Android `versionCode = github.run_number` | §9 |
| Theme colour | `#0A1024` (Night) / `#F5F1E8` (Proof) | manifest + `<meta name="theme-color">` + splash |

---

## 1. Create the repository

```powershell
# from C:\Work\Personal_Projects\01-nocturne-goal-tracker (the app scaffold lives at the repo root, per D6)
git init -b main
gh repo create nocturne --public --source . --description "The Minimalist Goal Tracker — a private navy broadsheet for your day" --disable-wiki
git remote -v   # origin -> https://github.com/<owner>/nocturne.git
```

Before the first push, make sure these exist:

```
.gitignore          # node_modules, dist, coverage, playwright-report, test-results,
                    # android/local.properties, android/app/release/, android/.gradle, android/app/build,
                    # *.p12 *.jks *.keystore *.b64, .env*.local, worker/.dev.vars (n/a)
.gitattributes      # android/gradlew text eol=lf
                    # *.sh text eol=lf
                    # e2e/visual/__screenshots__/**/*.png binary
```

Repo settings to set once (Settings → General): default branch `main`; *Allow auto-merge* off; *Automatically delete head branches* on. Settings → Actions → General: *Allow all actions*; *Workflow permissions: Read repository contents* (the workflows request what they need explicitly).

Also add `LICENSE` (MIT) and the README **Attribution** section (D5.4): Bricolage Grotesque, Geist, Geist Mono (SIL OFL 1.1); Lucide (ISC); Motion (MIT); Dexie (Apache-2.0); chrono-node (MIT); fractional-indexing (CC0-1.0); Capacitor and plugins (MIT); Loop Habit Tracker's score formula re-implemented (GPL code not copied).

---

## 2. Build configuration the deploy depends on

### 2.1 `vite.config.ts`

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
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },   // shown in the Colophon footer: "Nocturne 0.4.2"
  plugins: [
    react(),
    tailwindcss(),
    // No service worker inside the Capacitor WebView (ANDROID-PACKAGING pitfall 8): skip the plugin entirely.
    ...(isAndroid ? [] : [VitePWA({
      registerType: "prompt",                 // the update is a mono footnote "² A new edition is ready — Reload", never auto-reload mid-edit
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Nocturne",
        short_name: "Nocturne",
        description: "The Minimalist Goal Tracker",
        theme_color: "#0A1024",
        background_color: "#0A1024",
        display: "standalone",
        orientation: "any",
        start_url: base,                      // "/nocturne/" on Pages
        scope: base,
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],   // fonts are precached → works offline
        navigateFallback: `${base}index.html`,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    })]),
  ],
  build: { target: "es2022", sourcemap: false },
});
```

`src/main.tsx` registers the SW only on the web: `if (!Capacitor.isNativePlatform()) import("virtual:pwa-register").then(({ registerSW }) => registerSW({ onNeedRefresh: showEditionFootnote }))`.

All asset URLs go through `import.meta.env.BASE_URL` (HOSTING pitfall 2). Test locally with `npm run build -- --base=/nocturne/ && npx vite preview --base /nocturne/` and open `http://localhost:4173/nocturne/`.

### 2.2 Icons

`public/icon.svg` (navy square, foil "N" in Bricolage Grotesque 300, glyph outlined) → `npx pwa-assets-generator --preset minimal-2023 public/icon.svg` produces `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. Commit the outputs.

### 2.3 `index.html` essentials

`<meta name="theme-color" content="#0A1024">` (switched by the ThemeProvider), the inline grain `<svg><filter>`, the CSP `<meta http-equiv="Content-Security-Policy">` from TESTING §10 P-2, and `<html lang="en" data-theme="night">` as the SSR-less default (the ThemeProvider removes the attribute for Auto).

---

## 3. GitHub Pages (web) — first deploy

1. **Enable Pages with the Actions source.** Settings → Pages → *Build and deployment* → Source: **GitHub Actions**. (CLI equivalent: `gh api -X POST repos/<owner>/nocturne/pages -f build_type=workflow`.)
2. **Copy the shared workflow** — no edits are required for Nocturne:
   ```powershell
   New-Item -ItemType Directory -Force .github/workflows | Out-Null
   Copy-Item ..\_shared\templates\pages.yml .github\workflows\pages.yml
   ```
   What it does: `ubuntu-24.04`, Node 22 with npm cache, `npm ci`, `npm test -- --run` (Vitest — keep it; delete the line only until the first test exists), `npm run build` with `VITE_BASE_PATH=/nocturne/`, `cp dist/index.html dist/404.html` (harmless with the hash router), `configure-pages@v5` → `upload-pages-artifact@v4` → `deploy-pages@v4`, `concurrency: pages, cancel-in-progress: false`.
   The commented `VITE_API_BASE` line stays commented — Nocturne has no proxy.
3. **Add the e2e workflow** (`.github/workflows/ci.yml`, separate from Pages so a flaky gesture test never blocks a deploy):
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
           with: { name: playwright-report-${{ github.run_number }}, path: playwright-report/, retention-days: 7 }
   ```
4. **Push.**
   ```powershell
   git add -A; git commit -m "Nocturne: scaffold + Pages workflow"; git push -u origin main
   gh run watch          # ~1–2 min
   ```
5. **URL.** The deploy job summary and Settings → Pages show `https://<owner>.github.io/nocturne/`. Verify:
   ```powershell
   curl.exe -I https://<owner>.github.io/nocturne/                          # 200
   curl.exe -I https://<owner>.github.io/nocturne/manifest.webmanifest       # 200, application/manifest+json  (TESTING V-18)
   curl.exe -I https://<owner>.github.io/nocturne/sw.js                      # 200, application/javascript
   curl.exe -s https://<owner>.github.io/nocturne/ | Select-String "Nocturne" # title present
   ```
   Open `https://<owner>.github.io/nocturne/#/` — Today is the router root; Issue No. 1 with the three teaching entries is the "hello world" that ends Phase 0 (D9.1).
6. **Deep links.** `https://<owner>.github.io/nocturne/#/ledger` opens the Ledger directly (hash router; no 404 status involved). A bare `https://<owner>.github.io/nocturne/ledger` would return the `404.html` copy with a 404 status and still boot the app — acceptable but not linked anywhere.

Custom domain: not planned. If added later, `VITE_BASE_PATH` becomes `/` and the PWA scope changes — users must re-install the PWA.

---

## 4. Worker / proxy — not needed (and why)

DECISIONS D8 lists Nocturne's proxy as **none**. Every network feature uses a credential the *user* supplies at runtime and every endpoint is CORS-open to a `github.io` origin (RESEARCH §12 #7, live-verified 2026-09-06):

| Feature | Endpoint | Credential | CORS |
|---|---|---|---|
| Gist backup | `https://api.github.com/gists`, `https://gist.githubusercontent.com/…/raw` | user's fine-grained PAT (Gists: read & write) | `*` |
| Drive appData backup (web) | `https://www.googleapis.com/drive/v3/…`, `/upload/drive/v3/…` | 1-hour GIS access token from a user gesture | origin echoed |
| Drive appData backup (Android) | same | `@capgo/capacitor-social-login` token (V-15) | n/a (native) |

So there is **no `worker/` folder, no `worker.yml`, no `CLOUDFLARE_*` secrets, no `VITE_API_BASE`**. Do not add them "just in case" — every extra service is a thing that can fail at 21:14.

**Google OAuth client (web Drive backup) — public configuration, not a secret.** Do this only when the Drive feature is built:
1. console.cloud.google.com → new project `nocturne` (free, no card) → *APIs & Services* → enable **Google Drive API**.
2. *OAuth consent screen*: External; app name `Nocturne`; scopes: add `https://www.googleapis.com/auth/drive.appdata` only (non-sensitive → no verification); **Publish to Production** (Testing mode expires consent after 7 days).
3. *Credentials* → OAuth client ID → **Web application**; *Authorized JavaScript origins*: `https://<owner>.github.io` and `http://localhost:5173`; no redirect URIs (token model).
4. Put the client ID in a **repository variable** (not a secret — it ships in the bundle anyway): Settings → Secrets and variables → Actions → *Variables* → `VITE_GOOGLE_CLIENT_ID`. In `pages.yml` add `VITE_GOOGLE_CLIENT_ID: ${{ vars.VITE_GOOGLE_CLIENT_ID }}` under the build step's `env`. The app hides the Drive row when the variable is empty.
5. Android client (only if Drive-on-Android is built): *Credentials* → OAuth client ID → **Android**, package `com.rahul.nocturne`, SHA-1 of the **CI keystore** (`openssl pkcs12 -in nocturne-release.p12 -nokeys | openssl x509 -fingerprint -sha1 -noout` in Git Bash). No secret is produced.

**If a proxy is ever needed** (e.g. Workers AI garnish for the standfirst — currently rejected by DESIGN's voice rules): copy `_shared/templates/worker.yml` and `worker-proxy.ts`, set `ALLOWED_ORIGIN = https://<owner>.github.io` and `https://localhost` (Capacitor), and expose the URL to the app as `VITE_API_BASE` in `pages.yml`. Justify it in ARCHITECTURE.md first (D "Deviations must be justified").

---

## 5. Environment and configuration reference

Nothing secret exists on the web side. All `VITE_*` values are public and inlined.

| Variable | Where set | Pages value | Android value | Local dev |
|---|---|---|---|---|
| `VITE_BASE_PATH` | workflow env | `/nocturne/` | `/` | unset → `/` |
| `VITE_PLATFORM` | workflow env | unset (web) | `android` (disables the PWA plugin) | unset |
| `VITE_GOOGLE_CLIENT_ID` | repo **variable** (`vars.`) | client ID or empty | same (web client is not used natively; harmless) | `.env.local` |
| `__APP_VERSION__` | `define` from `package.json` | e.g. `0.4.2` | same | same |

Runtime settings (Colophon screen) live in the Dexie `settings` row (single record, key `"settings"`; ARCHITECTURE §4): `theme`, `eveningHour` (21), `dayRolloverHour` (3), `motion`, `sound {enabled, quietFrom, quietTo, master}`, `dailyReview {enabled, hour, minute}`, `privateReminders`, `firstIssueDay`, `readerName`, `backup {gistId, lastBackupAt, lastBackupRevision, auto}`, `onboardingDone`. The `meta` table holds only `revision`, `lastSyncAt` and `schemaVersion`. Settings are part of the JSON export; **the Gist token never is** — it lives in `platform/secrets.ts` (WebCrypto ciphertext on web, `@capacitor/preferences` on Android).

`capacitor.config.ts` (committed):

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rahul.nocturne",
  appName: "Nocturne",
  webDir: "dist",
  android: {
    webContentsDebuggingEnabled: false,      // set true only on a workflow_dispatch debug build, never on a tag
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: { backgroundColor: "#0A1024", launchFadeOutDuration: 0, androidScaleType: "CENTER", showSpinner: false },
    LocalNotifications: { smallIcon: "ic_stat_nocturne", iconColor: "#E8C170" },
    Keyboard: { resize: "none" },              // the composer translates itself via keyboardWillShow (DESIGN §14)
  },
};
export default config;
```

---

## 6. PWA install check (after every Pages deploy that touches the shell)

1. Desktop Chrome/Edge → `https://<owner>.github.io/nocturne/` → DevTools → *Application* → *Manifest*: no warnings; *Service workers*: `sw.js` activated, scope `/nocturne/`; *Storage* → check *Persistent* after install (TESTING V-12).
2. Address-bar install icon present → install → the window opens standalone in Night with the navy title bar (`theme_color`).
3. DevTools → *Network* → **Offline** → reload → Issue renders, fonts are Bricolage/Geist (no fallback flash), adding an entry works.
4. Android Chrome → same URL → menu → *Install app* (Chrome mints a WebAPK) → icon on the launcher → opens standalone. This PWA is the fallback for phones that cannot sideload; it cannot deliver reminders (RESEARCH §5.7) — the Colophon copy says so.
5. Lighthouse (DevTools) mobile: *Installable*, PWA checks green, a11y ≥ 95 (TESTING §8 runs the same via LHCI).
6. Push a trivial change → after deploy, the open PWA shows the `² A new edition is ready — Reload` footnote; Reload lands on the new version (check the Colophon footer version string).

---

## 7. Android pipeline (Capacitor 8, signed in Actions)

### 7.1 One-time: add Capacitor and plugins (local, no Java needed)

```powershell
npm i @capacitor/core @capacitor/android @capacitor/app @capacitor/haptics @capacitor/local-notifications @capacitor/preferences @capacitor/filesystem @capacitor/share @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard
npm i -D @capacitor/cli
npx cap init "Nocturne" com.rahul.nocturne --web-dir dist
npx cap add android        # "Gradle sync failed" warning is expected without a local SDK — ignore
```

(`SystemBars` ships inside `@capacitor/core` 8.5 — no extra package; RESEARCH open question 2. `capacitor-widget-bridge` is Phase 6 (someday) and is added only on the `widget` branch.)

Commit `android/` in full except the ignores in §1. Fix the wrapper's exec bit from Windows: `git update-index --chmod=+x android/gradlew`.

### 7.2 One-time: merge the Gradle snippet

Open `android/app/build.gradle` and replace its `android { … }` block with `_shared/templates/app-build.gradle.snippet`, changing both `namespace` and `applicationId` to `com.rahul.nocturne`. Keep everything else the generated file has (`apply plugin`, `repositories`, `dependencies`, `apply from: 'capacitor.build.gradle'`, the `google-services` try/catch). Result: `versionCode`/`versionName` come from `-P` properties and release signing activates only when `ANDROID_KEYSTORE_FILE` is set (unsigned local builds still work for anyone with a SDK).

### 7.3 One-time: Nocturne-specific Android files (before the first build)

`android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Reminders. The local-notifications 8.3.1 plugin manifest already declares these three;
     redeclaring is harmless (manifest merger de-duplicates) and makes intent explicit in code review. -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
<!-- Deliberately absent: USE_EXACT_ALARM (alarm-clock apps only), any storage/camera/network-state permission. INTERNET stays (Gist/Drive). -->
```

Inside the existing `<activity android:name=".MainActivity" …>` (ensure `android:exported="true"` and `android:launchMode="singleTask"`):

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="nocturne" />
</intent-filter>
```

Resources:
- `res/values/colors.xml`: `nocturne_bg #0A1024`, `nocturne_accent #E8C170`, `nocturne_ink #EEF1F8`, `nocturne_ink_muted #9AA6C4` (splash, system bars, phase-3 widget).
- `res/drawable/splash.xml`: layer-list, `@color/nocturne_bg` fill + centered foil "N" vector (from `public/icon.svg`).
- `res/drawable/ic_stat_nocturne.xml`: white "N" glyph, 24 dp (notification small icon referenced by `capacitor.config.ts`).
- `res/mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_round.xml`: adaptive icon with `ic_launcher_background` (`#0A1024`), `ic_launcher_foreground` (foil N, 18 % safe padding), `<monochrome>` layer = same glyph. Delete the Capacitor placeholder PNG mipmaps.
- `res/values/strings.xml`: `app_name = Nocturne`, `title_activity_main = Nocturne`, `package_name`/`custom_url_scheme = com.rahul.nocturne`.
- `res/values/styles.xml`: `AppTheme.NoActionBarLaunch` parent `Theme.SplashScreen` with `windowSplashScreenBackground = @color/nocturne_bg`.

Optional (only if TESTING V-11 fails): `android:enableOnBackInvokedCallback="false"` on `<application>`.

Run `npx cap sync android` once locally (pure file I/O) and commit. Then trigger a **`workflow_dispatch`** run of the Android workflow (§7.6) *before* creating any tag — the first build catches manifest/Gradle typos while nothing is published.

### 7.4 One-time: keystore (Git Bash, outside the repo)

```bash
cd ~/Desktop
bash /c/Work/Personal_Projects/_shared/scripts/make-keystore.sh nocturne
# → nocturne-release.p12 (BACK UP), nocturne-release.p12.b64 (paste into a secret)
```

The script asks for a ≥ 12-char passphrase, runs `openssl req` + `openssl pkcs12 -export` (alias `release`, key password = store password — PKCS12 rule), base64-encodes with `-w0`, and deletes the PEMs. **Do this exactly once for the life of the app.**

### 7.5 One-time: the four repository secrets

Settings → Secrets and variables → Actions → *New repository secret* (or `gh secret set NAME < file`):

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | contents of `nocturne-release.p12.b64` (single line) |
| `ANDROID_KEYSTORE_PASSWORD` | the passphrase |
| `ANDROID_KEY_ALIAS` | `release` |
| `ANDROID_KEY_PASSWORD` | the passphrase (must equal the store password) |

```powershell
gh secret set ANDROID_KEYSTORE_BASE64 --body (Get-Content "$HOME\Desktop\nocturne-release.p12.b64" -Raw).Trim()
gh secret set ANDROID_KEYSTORE_PASSWORD; gh secret set ANDROID_KEY_ALIAS --body release; gh secret set ANDROID_KEY_PASSWORD
```

Then delete `nocturne-release.p12.b64` from the Desktop; move `nocturne-release.p12` to the backup locations in §11.

### 7.6 One-time: the workflow

```powershell
Copy-Item ..\_shared\templates\android-release.yml .github\workflows\android-release.yml
```

No edits needed for Nocturne. It runs on `ubuntu-24.04` (SDK preinstalled), `setup-node@v7` (22), `setup-java@v6` Temurin **21** with Gradle cache, builds the web app with `VITE_BASE_PATH=/` and `VITE_PLATFORM=android` (no service worker in the WebView), `npx cap sync android`, decodes the keystore to `$RUNNER_TEMP/release.p12`, `./gradlew --no-daemon :app:assembleRelease -PversionCode=$GITHUB_RUN_NUMBER -PversionName=<tag without v>`, copies `app-release.apk` to `out/nocturne-<version>.apk` (fails loudly if only an unsigned APK exists), writes `SHA256SUMS.txt`, uploads an artifact (14 days) and — only on a `v*` tag — attaches both files to a GitHub Release via `softprops/action-gh-release@v3` with generated notes.

Optional Nocturne addition after "Collect output" (enforces the TESTING §8 APK budget):

```yaml
      - name: APK size budget (6 MB)
        run: |
          size=$(stat -c %s out/*.apk); echo "APK bytes: $size"
          test "$size" -le 6291456
```

First run: Actions → *android-release* → *Run workflow* (manual) → ~5–8 min → download the `apk-0.0.<run>` artifact → unzip → sideload for the §12 checklist of TESTING.md. If it fails on Gradle, read the log for the first `error:` line — typical culprits: `namespace` mismatch with the Java package folder, a missing `ic_stat_nocturne`, CRLF in `gradlew` (fixed by `.gitattributes`).

### 7.7 First tagged release → sideload

```powershell
npm version 0.1.0 --no-git-tag-version        # package.json → Colophon footer "Nocturne 0.1.0"
git add package.json package-lock.json; git commit -m "Release 0.1.0"; git push
git tag v0.1.0; git push origin v0.1.0
gh run watch
gh release view v0.1.0 --web
```

On the phone: open the Release page in Chrome → tap `nocturne-0.1.0.apk` → *Open* → allow Chrome to install unknown apps (once) → *Install*. Verify the SHA-256 against `SHA256SUMS.txt` if the download came through any other channel. First open shows Issue No. 1.

Updates install over the top as long as the keystore is unchanged and `versionCode` increased (`run_number` guarantees this). Register the free **limited-distribution developer account** (no ID, ≤ 20 devices) when it becomes available for the owner's region (TESTING V-16) so 2027's verification rollout does not add a 24-hour wait.

### 7.8 Debug builds

Need DevTools on the phone? Commit `webContentsDebuggingEnabled: true` on a branch, run `workflow_dispatch` from that branch, install the artifact APK, USB-connect, desktop Chrome `chrome://inspect#devices` (no adb install required). Never tag from that branch.

### 7.9 Phase 6 (someday): widget

On the `widget` branch: `npm i capacitor-widget-bridge`, add `NocturneWidgetProvider.kt`, `res/layout/widget_today.xml`, `res/xml/widget_today_info.xml` and the `<receiver>` in the manifest; colours from `colors.xml`; `workflow_dispatch` until green (TESTING V-17); then merge and tag. Nothing in §7.6 changes.

---

## 8. Release checklist (every `v*` tag)

1. `main` is green on `pages.yml` and `ci.yml`; the live Pages site shows the commit you intend to ship (Colophon footer version = `package.json`).
2. TESTING §13 gate: unit, e2e, visual, a11y, perf budgets, and the §12 phone checklist run on a `workflow_dispatch` APK of this exact commit (results in `docs/VERIFICATION-LOG.md`).
3. `npm audit --audit-level=high` clean; `npx cap sync android` produces no diff (plugins list unchanged or the diff is committed).
4. `CHANGELOG.md` entry (date, issue-style: "No. 0.4.0 — …"); README Attribution updated if a dependency was added.
5. `npm version <x.y.z> --no-git-tag-version`, commit `Release x.y.z`, push, wait for Pages to deploy that commit.
6. `git tag vx.y.z && git push origin vx.y.z` → watch `android-release` → Release page has `nocturne-x.y.z.apk` + `SHA256SUMS.txt` and generated notes; edit the notes to add the CHANGELOG entry.
7. Install the Release APK on the phone over the previous version; confirm data intact, version string updated, one reminder still scheduled (Colophon › Reminders shows the next daily review).
8. Export a JSON backup from the phone and from the web app (§11.2) — the release is the natural backup moment.
9. If the PWA shell changed: §6 steps 1–3 on the live site.

---

## 9. Versioning

- **Git tags** `vMAJOR.MINOR.PATCH` (SemVer-ish; a solo app — bump MINOR for a new screen/feature, PATCH for fixes, MAJOR when the export format changes incompatibly).
- **`package.json` version** = tag without `v`; injected as `__APP_VERSION__` → Colophon footer and the JSON export header, which is written verbatim as `{"format": "nocturne-backup", "version": 1, "schema": 1, "app": "0.4.2", "revision": 7, "exportedAt": 1788732840000}` (IMPLEMENTATION-PROMPT §5; `version` is the backup-format version, `app` the app version, `schema` the Dexie schema — import validates this header first).
- **Android `versionName`** = tag without `v` (workflow); **`versionCode`** = `github.run_number` of the `android-release` workflow — strictly increasing across tags and manual runs, never edited by hand. A re-run of a failed job consumes a number; that is fine.
- **Dexie schema version** (`db.version(n)`) is independent and only ever increases; every bump ships an upgrade function and a migration test (TESTING DB-3). Exports carry `schema` so import can refuse a newer schema with the footnote `Backup is from a newer edition (schema 3); update the app first.`
- **Web deploys are not versioned separately** — every push to `main` deploys; the tag marks which commit the APK was cut from.

---

## 10. Rollback

| What broke | Action |
|---|---|
| Web (Pages) shows a bad build | `git revert <sha>` on `main` and push — Pages redeploys in ~2 min. Faster alternative: Actions → *Deploy to GitHub Pages* → open the last good run → *Re-run all jobs* (it rebuilds that commit's checkout and redeploys it). The SW `prompt` strategy means open tabs keep the old version until the user taps Reload — no forced broken reload. |
| Bad APK on a Release | Android cannot downgrade `versionCode`. Fix forward: revert the offending commit, tag `vx.y.(z+1)`, install over the top. Meanwhile edit the Release: mark it *pre-release*, delete the `.apk` asset, and add a note pointing at the previous tag (older APKs stay downloadable on their own Release pages and can be reinstalled only after an uninstall — data loss unless exported; say so in the note). |
| Bad Dexie migration | Migrations must be additive and reversible-by-import: the release notes tell the user to *Import* the export made at step 8 of §8 into the fixed version. Never ship a migration that drops a table. |
| Keystore secrets wrong (build says `app-release-unsigned.apk`) | Re-run `gh secret set` for the four values from the password manager; no code change; re-run the workflow (`versionCode` increments — fine). |
| Pages deploy stuck / environment protection | Settings → Environments → `github-pages` → remove any accidental required reviewers; `concurrency: pages` guarantees no half-deployed state. |

---

## 11. Backups

### 11.1 Signing keystore (irreplaceable)

Store `nocturne-release.p12` **and** the passphrase in **three** places: (1) the password manager (attach the file, note alias `release`), (2) an encrypted offline copy (USB/external disk), (3) the GitHub secret (already there, but GitHub never shows it back — treat it as a copy, not a source). Never regenerate; never commit; never email it. Test the backup once: decode the `.b64` from the password manager copy and check `openssl pkcs12 -in nocturne-release.p12 -info -noout` (Git Bash) prompts for the passphrase and prints the certificate.

### 11.2 User data (the owner's tasks and streaks)

- The app is local-first; IndexedDB in the web build can be evicted, and *Clear data* on Android wipes it. The Colophon `Last printed` footnote is the reminder.
- Manual: Colophon › *Export / Import* → JSON (`nocturne-YYYY-MM-DD.json`) weekly, and always before a release (§8.8). Markdown export is for reading, not restoring.
- Automatic (optional, zero-cost): Gist backup with a fine-grained PAT (Gists: read & write, 90-day expiry, renew from the Colophon row) runs at most once per 6 h and only when `meta.revision` changed since the last backup (never on a metered connection); Drive appData on web when the client ID is configured. Both are restorable from the same screen; merge rules in RESEARCH §5.8.
- Keep two generations of the JSON export outside the phone (PC + cloud drive of choice). Restoring is `Import` with *overwrite* (restore) or *merge* (sync).

### 11.3 Repository

Public GitHub is the primary copy; `git clone --mirror` into the offline disk quarterly. Playwright visual baselines and `docs/` are in the repo; nothing lives only in Actions artifacts (they expire in 14 days).

---

## 12. Troubleshooting quick reference

| Symptom | Cause → fix |
|---|---|
| Pages shows a blank page, console `Failed to load module script … /assets/index-*.js 404` | `VITE_BASE_PATH` not applied → confirm the build step env in `pages.yml` and that `vite.config.ts` reads `process.env.VITE_BASE_PATH`. |
| PWA not installable on Pages | `start_url`/`scope` not `/nocturne/`; check DevTools → Manifest; the `base` variable must feed the manifest (§2.1). |
| Fonts fall back to system on the phone but not the web | Fontsource CSS imported after Tailwind layer or `VITE_PLATFORM=android` build missing the `woff2` copy → check `dist/assets/*.woff2` exists in the Android build log. |
| `npx cap sync android` fails locally with "Could not find android SDK" | It should not need one; the message comes from the optional Gradle step — safe to ignore if `android/app/src/main/assets/public/` was updated. |
| Workflow: `Execution failed for task ':app:validateSigningRelease'` | One of the four secrets is missing/empty; `ANDROID_KEY_PASSWORD` must equal `ANDROID_KEYSTORE_PASSWORD`. |
| Phone: "App not installed" on update | Different keystore or lower `versionCode` → verify the tag was built on `main` by the repo workflow (not a fork) and secrets unchanged; uninstall only as a last resort after exporting. |
| Daily review never fires | TESTING V-3/N-1…N-5: notification permission, exact-alarm setting, OEM battery restrictions (dontkillmyapp.com), app force-stopped (Android drops alarms after a force-stop until the app is launched again). |
| Reminders fire ~1 h late | Exact alarms denied → the sheet footnote → *Alarms & reminders* → allow. |
| Deep link `nocturne://today` opens nothing | Intent filter missing from `MainActivity` or `launchMode` not `singleTask` (§7.3). |
| Gist backup 401/403 from the phone but not the web | PAT expired (fine-grained tokens expire) → renew; or the token lacks Gists write. |
