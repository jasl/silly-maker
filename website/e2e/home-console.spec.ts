// SPDX-License-Identifier: MIT
import { expect, test } from "../../scripts/testing/playwright-test.ts";

const websiteUrlV1 = "http://127.0.0.1:41741/";

test("the home console shares one keyboard and pointer selection", async ({ page }) => {
  await page.goto(websiteUrlV1);

  const homeConsole = page.locator("[data-home-console-ready='true']");
  await expect(homeConsole).toBeVisible();
  await expect(homeConsole).toHaveAttribute(
    "data-home-console-selected",
    "start",
  );
  await expect(homeConsole.locator(".home-console__status b")).toHaveText("01 / 04");

  await homeConsole.focus();
  await page.keyboard.press("ArrowRight");
  await expect(homeConsole).toHaveAttribute(
    "data-home-console-selected",
    "gui",
  );
  await expect(
    homeConsole.locator(
      '.home-console-route[href="./guides/gui-application/"]',
    ),
  ).toBeFocused();

  await homeConsole.locator(
    '.home-console-route[href="./guides/game-application/"]',
  ).hover();
  await expect(homeConsole).toHaveAttribute(
    "data-home-console-selected",
    "game",
  );

  const gameRoute = homeConsole.locator(
    '.home-console-route[href="./guides/game-application/"]',
  );
  await gameRoute.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/guides\/game-application\/$/u);
});

test("narrow reflow keeps the selected route reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(websiteUrlV1);

  const homeConsole = page.locator("[data-home-console-ready='true']");
  const examplesRoute = homeConsole.locator(
    '.home-console-route[href="./examples/"]',
  );
  await examplesRoute.scrollIntoViewIfNeeded();
  await examplesRoute.hover();
  await expect(homeConsole).toHaveAttribute(
    "data-home-console-selected",
    "examples",
  );
  await expect(examplesRoute).toBeVisible();

  const documentWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(documentWidth.scroll).toBeLessThanOrEqual(documentWidth.client);

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(homeConsole).toHaveAttribute(
    "data-home-console-selected",
    "examples",
  );
});

test("reduced motion preserves route changes without animated movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(websiteUrlV1);

  const homeConsole = page.locator("[data-home-console-ready='true']");
  await expect(homeConsole).toHaveAttribute(
    "data-home-console-selected",
    "start",
  );
  await homeConsole.getByRole("button", { name: "Next route" }).click();
  await expect(homeConsole).toHaveAttribute(
    "data-home-console-selected",
    "gui",
  );

  const slideAnimationName = await homeConsole.locator(
    ".home-console__slide-copy",
  ).evaluate(
    (element) => getComputedStyle(element).animationName,
  );
  const routeTransitionDuration = await homeConsole.locator(
    '.home-console-route[href="./guides/gui-application/"]',
  ).evaluate((element) => getComputedStyle(element).transitionDuration);
  const streakAnimationName = await homeConsole.evaluate((element) =>
    getComputedStyle(element, "::before").animationName
  );
  expect({ routeTransitionDuration, slideAnimationName, streakAnimationName })
    .toEqual({
      routeTransitionDuration: "0s",
      slideAnimationName: "none",
      streakAnimationName: "none",
    });
});

test("the composed site exposes the maintained products", async ({ page }) => {
  await page.goto(websiteUrlV1);

  const flagshipCard = page.locator("a.sm-example-card--vn");
  await expect(flagshipCard).toContainText("One Last Sound Check");
  await expect(page.locator("a.sm-example-card--os")).toContainText("SillyOS");

  await flagshipCard.click();
  await expect(page).toHaveURL(/\/examples\/vn-last-sound-check\/$/u);
  await page.getByRole("link", { name: "Play the VN in this site build" }).click();
  await expect(page).toHaveURL(/\/play\/vn-last-sound-check\/$/u);
  await expect(page.locator("[data-title-screen='true']")).toBeVisible();
  await expect(page.getByRole("button", { name: "新游戏" })).toBeVisible();

  await page.goto(`${websiteUrlV1}examples/silly-os/`);
  await expect(page.getByRole("link", { name: "Open the standalone SillyOS deployment" }))
    .toHaveAttribute("href", "https://silly-os.jasl9187.workers.dev/");
});
