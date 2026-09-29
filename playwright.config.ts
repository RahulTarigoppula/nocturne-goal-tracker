import { defineConfig, devices } from "@playwright/test";

/** E2E runs against the production build served under /nocturne/ (as on Pages). Build first: `npm run build`. */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4317/nocturne/",
    timezoneId: "Asia/Kolkata",
    locale: "en-GB",
    trace: "retain-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npx vite preview --base /nocturne/ --port 4317 --strictPort",
    url: "http://localhost:4317/nocturne/",
    reuseExistingServer: !process.env.CI,
    env: { VITE_BASE_PATH: "/nocturne/" },
  },
});
