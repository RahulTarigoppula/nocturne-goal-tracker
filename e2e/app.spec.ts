import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// House fixture: Sunday 2026-09-06 21:14 (Asia/Kolkata). A fresh install opens on Issue No. 1.
const HOUSE = new Date("2026-09-06T21:14:00+05:30");

async function open(page: Page, hash = "#/", time = HOUSE) {
  await page.clock.install({ time });
  await page.goto(`./${hash}`);
  await expect(page.locator("main .page:not([aria-busy])").first()).toBeVisible();
}

const folio = (page: Page, n: number) => page.getByRole("button", { name: new RegExp(`^Mark done, entry ${n},`) });
const composer = (page: Page) => page.getByRole("textbox", { name: "Add to the issue" });

test("first open: Issue No. 1, three teaching entries, closing prints the colophon", async ({ page, isMobile }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://localhost:4317/")) external.push(r.url());
  });
  await open(page);
  const main = page.locator("main");
  if (isMobile) await expect(main.getByText("Welcome to your first issue.")).toBeVisible();
  await expect(main.getByText("Swipe me right when I'm done")).toBeVisible();
  await expect(main.getByText("Hold me to change the order")).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await folio(page, 1).click();
    await page.waitForTimeout(450);
  }
  await expect(page.getByText("Issue No. 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Closed. Three entries.")).toBeVisible();
  await expect(page.getByText("Streak 1 day.")).toBeVisible();
  const standfirst = page.getByRole("textbox", { name: "A line for the record" });
  await standfirst.fill("The first one.");
  await standfirst.press("Enter");
  expect(external).toEqual([]);
});

test("compose: tomorrow goes to Upcoming, tonight lands in This evening", async ({ page }) => {
  await open(page);
  await composer(page).fill("call mom tomorrow 5pm #family");
  await expect(page.getByRole("button", { name: /TOMORROW 5PM/ })).toBeVisible();
  await composer(page).press("Enter");
  await composer(page).fill("read 20 pages tonight");
  await composer(page).press("Enter");
  const main = page.locator("main");
  await expect(main.getByText("II — This evening")).toBeVisible();
  await expect(main.getByText("read 20 pages", { exact: true })).toBeVisible();
  await expect(main.getByText("call mom")).toHaveCount(0);
  await page.goto("./#/upcoming");
  await expect(page.locator("main").getByText("call mom")).toBeVisible();
});

test("strike and undo restore the entry", async ({ page }) => {
  await open(page);
  await folio(page, 2).click();
  await expect(page.getByRole("button", { name: /Entry 02 closed — Undo/ })).toBeVisible();
  await expect(page.locator(".entry.done")).toHaveCount(1);
  await page.getByRole("button", { name: /Entry 02 closed — Undo/ }).click();
  await expect(page.locator(".entry.done")).toHaveCount(0);
  await expect(folio(page, 3)).toBeVisible();
});

test("swipe right strikes, a short swipe springs back, swipe left opens When", async ({ page, isMobile }) => {
  test.skip(isMobile, "mouse-driven gesture test runs on desktop");
  await open(page);
  const row = page.locator(".entry").first();
  const box = await row.boundingBox();
  if (!box) throw new Error("no row");
  const y = box.y + box.height / 2;
  const x = box.x + 80;
  // 60 px: springs back
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 30, y, { steps: 3 });
  await page.mouse.move(x + 60, y, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await expect(page.locator(".entry.done")).toHaveCount(0);
  // 120 px: strikes
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y, { steps: 4 });
  await page.mouse.move(x + 120, y, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator(".entry.done")).toHaveCount(1);
  // left: When sheet
  await page.waitForTimeout(500);
  const second = page.locator(".entry").first();
  const b2 = await second.boundingBox();
  if (!b2) throw new Error("no row");
  await page.mouse.move(b2.x + 300, b2.y + b2.height / 2);
  await page.mouse.down();
  await page.mouse.move(b2.x + 240, b2.y + b2.height / 2, { steps: 4 });
  await page.mouse.move(b2.x + 180, b2.y + b2.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByRole("dialog", { name: "When?" })).toBeVisible();
  await page.getByRole("button", { name: /^Tomorrow/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("main .entry")).toHaveCount(2);
});

test("ledger: tap completes today, tap again removes, survives reload", async ({ page }) => {
  await open(page, "#/ledger");
  const input = page.getByRole("textbox", { name: "Add a habit" });
  await input.fill("Morning pages");
  await input.press("Enter");
  const line = page.getByRole("button", { name: /^Morning pages\./ });
  await expect(line).toHaveAttribute("aria-pressed", "false");
  await line.click();
  await expect(line).toHaveAttribute("aria-pressed", "true");
  await expect(line).toHaveAccessibleName(/Streak 1, best 1, strength 5 %/);
  await page.reload();
  await expect(page.getByRole("button", { name: /^Morning pages\./ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Morning pages\./ }).click();
  await expect(page.getByRole("button", { name: /^Morning pages\./ })).toHaveAttribute("aria-pressed", "false");
});

test("rollover: past 03:00 the issue number advances and open entries roll forward as overdue", async ({ page }) => {
  await open(page);
  await folio(page, 1).click();
  await page.waitForTimeout(400);
  await page.clock.runFor(6 * 3_600_000);
  await page.reload();
  await expect(page.locator(".roll .sr-only >> visible=true").first()).toHaveText("2");
  await expect(
    page
      .locator("main")
      .getByText(/Overdue SUN/)
      .first(),
  ).toBeVisible();
  await expect(page.locator("main .entry")).toHaveCount(2);
  await page.goto("./#/issues");
  await expect(page.getByText(/No\. 1 · SUN 06 SEP · 1 \/ 3 · open/)).toBeVisible();
});

test("theme: Proof sets the attribute and the paper colour, and survives reload", async ({ page }) => {
  await open(page, "#/colophon", new Date("2026-09-06T15:00:00+05:30"));
  await page.getByRole("button", { name: "Proof" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "proof");
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await expect.poll(bg).toBe("rgb(245, 241, 232)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "proof");
});

test("evening turn: after the evening hour the ground shifts to the elevated tone", async ({ page }) => {
  await open(page);
  await expect(page.locator("html")).toHaveClass(/evening/);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(15, 23, 46)");
});

test("backup: export downloads nocturne-2026-09-06.json with the seeded entries", async ({ page, isMobile }) => {
  test.skip(isMobile, "download flow checked once");
  await open(page, "#/colophon");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "JSON" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("nocturne-2026-09-06.json");
  const path = await download.path();
  const fs = await import("node:fs");
  const doc = JSON.parse(fs.readFileSync(path, "utf8"));
  expect(doc.format).toBe("nocturne-backup");
  expect(doc.data.entries).toHaveLength(3);
});

test("storage unavailable: the vermilion footnote renders and nothing crashes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone masthead carries the footnote");
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { value: undefined });
  });
  await page.clock.install({ time: HOUSE });
  await page.goto("./#/");
  await expect(page.getByText(/Storage is unavailable in this browser/)).toBeVisible();
});

test("keyboard only: n files, j selects, x strikes, ] switches tabs, Ctrl+K finds", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard path");
  await open(page);
  await page.keyboard.press("n");
  await expect(composer(page)).toBeFocused();
  await page.keyboard.type("Write the release notes");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.keyboard.press("j");
  await page.keyboard.press("x");
  await expect(page.locator(".entry.done")).toHaveCount(1);
  await page.keyboard.press("]");
  await expect(page).toHaveURL(/#\/upcoming$/);
  await page.keyboard.press("[");
  await page.keyboard.press("Control+k");
  await page.getByRole("textbox", { name: "Find" }).fill("release");
  await expect(
    page.getByRole("dialog", { name: "Find" }).getByRole("button", { name: /Write the release notes/ }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("design tokens: hairlines, targets, one vermilion, fonts", async ({ page }) => {
  await open(page);
  const m = await page.evaluate(() => {
    const row = document.querySelector(".entry-body") as HTMLElement;
    const entry = document.querySelector(".entry") as HTMLElement;
    const f = document.querySelector(".folio") as HTMLElement;
    const title = document.querySelector(".title") as HTMLElement;
    const shadows = [...document.querySelectorAll("main *")].filter(
      (e) => getComputedStyle(e).boxShadow !== "none",
    ).length;
    const vermilion = [...document.querySelectorAll("body *")].filter(
      (e) => getComputedStyle(e).color === "rgb(236, 109, 88)",
    ).length;
    return {
      rowMin: Number.parseFloat(getComputedStyle(row).minHeight),
      border: getComputedStyle(entry).borderBottomWidth,
      folio: [f.offsetWidth, f.offsetHeight],
      titleFont: getComputedStyle(title).fontFamily,
      folioFont: getComputedStyle(f).fontFamily,
      shadows,
      vermilion,
    };
  });
  expect(m.rowMin).toBeGreaterThanOrEqual(56);
  expect(m.border).toBe("1px");
  expect(m.folio[0]).toBeGreaterThanOrEqual(44);
  expect(m.folio[1]).toBeGreaterThanOrEqual(44);
  expect(m.titleFont).toMatch(/^"Geist Variable"/);
  expect(m.folioFont).toMatch(/^"Geist Mono Variable"/);
  expect(m.shadows).toBe(0);
  expect(m.vermilion).toBeLessThanOrEqual(1);
});

test("reduced motion: nothing animates after load", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", timezoneId: "Asia/Kolkata" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:4317/nocturne/#/");
  await page.waitForTimeout(600);
  const running = await page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => a.playState === "running" && Number(a.effect?.getComputedTiming().duration ?? 0) > 120).length,
  );
  expect(running).toBe(0);
  await ctx.close();
});

for (const route of ["#/", "#/upcoming", "#/ledger", "#/issues", "#/colophon"]) {
  test(`a11y: no serious or critical axe violations on ${route}`, async ({ page }) => {
    await open(page, route);
    await page.waitForTimeout(700);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}

test("hold to reorder: the lifted row takes the lift styling and the new order persists", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "mouse-driven gesture test runs on desktop");
  await open(page);
  const titles = () => page.locator("main .entry .title-text").allInnerTexts();
  await expect(page.locator("main .entry")).toHaveCount(3);
  const before = await titles();
  const row = page.locator("main .entry").nth(0);
  const box = await row.boundingBox();
  if (!box) throw new Error("no row");
  const x = box.x + 200;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(320);
  await expect(page.locator(".entry.lifted")).toHaveCount(1);
  const radius = await page
    .locator(".entry.lifted .entry-body")
    .evaluate((e) => getComputedStyle(e).borderTopLeftRadius);
  expect(radius).toBe("12px");
  for (let i = 1; i <= 7; i++) await page.mouse.move(x, y + i * 10);
  await page.mouse.up();
  const want = [before[1], before[0], before[2]];
  await expect.poll(titles).toEqual(want);
  const after = await titles();
  await page.reload();
  await expect.poll(titles).toEqual(after);
});
