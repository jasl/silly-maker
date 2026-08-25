// SPDX-License-Identifier: MIT
import { cardsTargetUrlV1, expect, test } from "./fixtures.ts";

test("Feature Cards preserves the complete focus and activation contract", async ({ page }) => {
  await page.goto(cardsTargetUrlV1());

  await expect(page.getByRole("heading", { name: "Feature Cards" })).toBeVisible();
  await expect(page.getByText("3 MODULES")).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  const cards = page.getByRole("button");
  await expect(cards).toHaveCount(3);
  await expect(page.getByRole("status")).toHaveCount(0);

  const layout = page.locator("[data-card-id='layout']");
  const motion = page.locator("[data-card-id='motion']");
  const input = page.locator("[data-card-id='input']");

  await page.keyboard.press("ArrowRight");
  await expect(layout).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(motion).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Motion");

  await page.keyboard.press("ArrowRight");
  await expect(input).toBeFocused();
  await expect(page.getByRole("status")).toContainText("Motion");

  await page.keyboard.press("KeyZ");
  await expect(page.getByRole("status")).toContainText("Input");
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(motion).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("KeyZ");
  await expect(page.getByRole("status")).toHaveCount(0);

  await page.keyboard.press("ArrowRight");
  await expect(input).toBeFocused();
  await page.reload();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.locator("[data-cards-focused='none']")).toBeVisible();
});

test("pointer activation and responsive reflow retain product state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(cardsTargetUrlV1());

  const layout = page.locator("[data-card-id='layout']");
  const motion = page.locator("[data-card-id='motion']");
  const input = page.locator("[data-card-id='input']");
  const phoneBoxes = await Promise.all([layout, motion, input].map((card) => card.boundingBox()));
  expect(phoneBoxes.every((box) => box !== null)).toBe(true);
  expect(phoneBoxes[1]!.y).toBeGreaterThan(phoneBoxes[0]!.y);
  expect(phoneBoxes[2]!.y).toBeGreaterThan(phoneBoxes[1]!.y);

  await motion.click();
  await expect(page.getByRole("status")).toContainText("Motion");

  // A 640 CSS-pixel viewport is the reflow pressure produced by 200% zoom on
  // a 1280-pixel desktop viewport; state and reachability remain unchanged.
  await page.setViewportSize({ width: 640, height: 720 });
  await expect(page.getByRole("status")).toContainText("Motion");
  const zoomedSurface = await page.locator("[data-cards-product='ready']").boundingBox();
  const zoomedContent = await Promise.all(
    [layout, motion, input, page.getByRole("status")].map((element) => element.boundingBox()),
  );
  expect(zoomedSurface).not.toBeNull();
  expect(zoomedContent.every((box) =>
    box !== null && box.x >= zoomedSurface!.x &&
    box.x + box.width <= zoomedSurface!.x + zoomedSurface!.width + 1
  )).toBe(true);

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(motion).toBeFocused();
  await expect(page.getByRole("status")).toContainText("Motion");

  const desktopBoxes = await Promise.all([layout, motion, input].map((card) => card.boundingBox()));
  expect(desktopBoxes.every((box) => box !== null)).toBe(true);
  // Focus may be part-way through its deliberate 4 px lift; the cards still
  // occupy one responsive row throughout that transition.
  const desktopYs = desktopBoxes.map((box) => box!.y);
  expect(Math.max(...desktopYs) - Math.min(...desktopYs)).toBeLessThanOrEqual(5);
  expect(desktopBoxes[0]!.x).toBeLessThan(desktopBoxes[1]!.x);
  expect(desktopBoxes[1]!.x).toBeLessThan(desktopBoxes[2]!.x);
});

test("the declared gamepad map reaches the same focus and activation owner", async ({ page }) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    const gamepad = { index: 0, connected: true, buttons };
    Reflect.set(globalThis, "__CARDS_TEST_GAMEPAD__", {
      set(button: number, pressed: boolean): void {
        buttons[button] = { pressed };
      },
    });
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [gamepad],
    });
  });
  await page.goto(cardsTargetUrlV1());
  const layout = page.locator("[data-card-id='layout']");
  await expect(layout).toBeVisible();

  await page.evaluate(() => {
    const control = Reflect.get(globalThis, "__CARDS_TEST_GAMEPAD__") as {
      set(button: number, pressed: boolean): void;
    };
    control.set(15, true);
  });
  await expect(layout).toBeFocused();
  await page.evaluate(async () => {
    const control = Reflect.get(globalThis, "__CARDS_TEST_GAMEPAD__") as {
      set(button: number, pressed: boolean): void;
    };
    control.set(15, false);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    control.set(0, true);
  });
  await expect(page.getByRole("status")).toContainText("Layout");
});

test("@mobile touch activates the same semantic card", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-portrait", "touch project only");
  await page.goto(cardsTargetUrlV1());
  await page.locator("[data-card-id='motion']").tap();
  await expect(page.getByRole("status")).toContainText("Motion");
  await expect(page.locator("[data-card-id='motion']")).toBeFocused();
});

test("reduced motion keeps every state change while removing movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(cardsTargetUrlV1());

  const streakAnimation = await page.locator(".cards-streak--a").evaluate((element) =>
    getComputedStyle(element).animationName
  );
  expect(streakAnimation).toBe("none");

  await page.locator("[data-card-id='layout']").click();
  const detail = page.getByRole("status");
  await expect(detail).toContainText("Layout");
  expect(await detail.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});
