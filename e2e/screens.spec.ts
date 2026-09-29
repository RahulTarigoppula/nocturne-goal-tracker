import { expect, test } from "@playwright/test";

// Not part of the regular suite: `SCREENS=1 npx playwright test e2e/screens.spec.ts --project=desktop-chromium`
// writes docs/screenshots/*.png for the README.
test.skip(!process.env.SCREENS, "screenshots on demand only");

const HOUSE = new Date("2026-09-06T21:14:00+05:30");

test("readme screenshots", async ({ browser }) => {
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    timezoneId: "Asia/Kolkata",
  });
  const p = await phone.newPage();
  await p.clock.install({ time: HOUSE });
  await p.goto("http://localhost:4317/nocturne/#/");
  const input = p.getByRole("textbox", { name: "Add to the issue" });
  for (const t of [
    "Call the bank about the card 09:30 #admin",
    "Draft the Nocturne README by fri #work",
    "Read 20 pages tonight",
  ]) {
    await input.fill(t);
    await input.press("Enter");
  }
  await p.locator("main .folio").first().click();
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelector("main")?.scrollTo(0, 0));
  await p.mouse.move(0, 0);
  await p.screenshot({ path: "docs/screenshots/front-page-night.png" });
  await p.goto("http://localhost:4317/nocturne/#/colophon");
  await p.getByRole("button", { name: "Proof" }).click();
  await p.goto("http://localhost:4317/nocturne/#/");
  await p.waitForTimeout(1200);
  await p.screenshot({ path: "docs/screenshots/front-page-proof.png" });
  await p.goto("http://localhost:4317/nocturne/#/colophon");
  await p.getByRole("button", { name: "Night" }).click();
  await p.goto("http://localhost:4317/nocturne/#/");
  for (let i = 0; i < 8; i++) {
    const open = p.locator('main .folio[aria-disabled="false"]');
    if ((await open.count()) === 0) break;
    await open.first().click();
    await p.waitForTimeout(450);
  }
  await p.waitForTimeout(1500);
  await p.locator(".colophon").scrollIntoViewIfNeeded();
  await p.mouse.move(0, 0);
  await p.screenshot({ path: "docs/screenshots/colophon.png" });
  await phone.close();

  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 }, timezoneId: "Asia/Kolkata" });
  const d = await desk.newPage();
  await d.clock.install({ time: new Date("2026-09-06T19:40:00+05:30") });
  await d.goto("http://localhost:4317/nocturne/#/");
  const din = d.getByRole("textbox", { name: "Add to the issue" });
  for (const t of [
    "Call the bank about the card 09:30 #admin",
    "Draft the Nocturne README #work",
    "Water the plants",
    "Read 20 pages tonight",
  ]) {
    await din.fill(t);
    await din.press("Enter");
  }
  await d.mouse.move(0, 0);
  await d.waitForTimeout(1200);
  await d.screenshot({ path: "docs/screenshots/desktop.png" });
  await expect(d.locator("main")).toBeVisible();
  await desk.close();
});
