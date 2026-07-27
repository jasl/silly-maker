// SPDX-License-Identifier: MIT
import type { Page } from "@playwright/test";

import { catcafeTargetUrlV1, expect, test } from "./fixtures.ts";

/**
 * Stage hit regions in a real browser, proven on the cat-cafe example:
 * content-resolved zones render as focusable buttons inside the stage,
 * pointer/touch/keyboard all reach the same semantic path, and gameplay
 * rules (trust bands, daily budget) stay authoritative.
 */

async function playOpeningV1(page: Page): Promise<void> {
  await page.getByRole("button", { name: "开始故事" }).click();
  for (let index = 0; index < 3; index += 1) {
    await page.locator("[data-cc-advance]").click();
  }
  await page.getByRole("button", { name: "就叫「小雨」" }).click();
  await page.locator("[data-cc-advance]").click();
  await page.locator("[data-cc-advance]").click();
  await expect(page.locator("[data-cc-narrative]")).toHaveCount(0);
}

test("pointer petting routes through hit regions with table-driven reactions", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);

  // Four zones resolved from the content catalog for the kitten stage.
  await expect(page.locator("[data-stage-hit-region]")).toHaveCount(4);
  await expect(page.locator("[data-cc-stats]")).toContainText("信任10");

  // Low trust + tail: the hissing row (-3 trust) and its reaction line.
  await page.getByRole("button", { name: "碰尾巴" }).click();
  await expect(page.locator("[data-cc-stats]")).toContainText("信任7");
  await expect(page.locator("[data-cc-pet-reaction='text.cc.pet.tail.low']")).toBeVisible();
  await expect(page.locator("[data-cc-cat]")).toHaveAttribute("data-cc-expression", "hissing");

  // Keyboard reaches the same semantic path.
  await page.getByRole("button", { name: "摸头" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-cc-stats]")).toContainText("信任8");

  // The daily budget guards the fourth attempt.
  await page.getByRole("button", { name: "顺背" }).click();
  await expect(page.locator("[data-cc-stage]")).toHaveAttribute("data-cc-petting-left", "0");
  const stats = await page.locator("[data-cc-stats]").textContent();
  await page.getByRole("button", { name: "挠下巴" }).click();
  await expect(page.locator("[data-cc-stats]")).toHaveText(stats ?? "");
});

test("touch taps activate hit regions @responsive", async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.hasTouch !== true, "touch-only case");
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);
  await expect(page.locator("[data-stage-hit-region]")).toHaveCount(4);
  await page.getByRole("button", { name: "顺背" }).tap();
  await expect(page.locator("[data-cc-stats]")).toContainText("信任11");
  await expect(page.locator("[data-cc-stage]")).toHaveAttribute("data-cc-petting-left", "2");
});

test("the stage scales uniformly on small viewports and hit regions still work", async ({
  page,
}) => {
  // Play the opening at desktop size, then shrink to a phone-landscape
  // window (the genre's standard handheld posture): the 1280x720 logical
  // canvas letterboxes down live. Narrow-portrait HUD stacking is a Story
  // layout concern, not an engine scaling one.
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);
  await page.setViewportSize({ width: 844, height: 390 });

  const stageRoot = page.locator("[data-semantic-stage]");
  await expect
    .poll(async () => Number(await stageRoot.getAttribute("data-stage-scale")))
    .toBeLessThan(0.6); // ~0.49 for a 624x351 stage box
  const scale = Number(await stageRoot.getAttribute("data-stage-scale"));
  expect(scale).toBeGreaterThan(0.4);
  // The scaled tail region still receives real pointer clicks.
  await page.getByRole("button", { name: "碰尾巴" }).click();
  await expect(page.locator("[data-cc-stats]")).toContainText("信任7");
  const box = await page.getByRole("button", { name: "摸头" }).boundingBox();
  expect(box).not.toBeNull();
  // Logical 80x45 zone shrinks with the canvas transform.
  expect((box?.width ?? 0) / 80).toBeCloseTo(scale, 1);
});

test("right-click routes the VN back action: the album overlay closes", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);
  await page.locator("[data-cc-album-open]").click();
  await expect(page.locator("[data-cc-album]")).toBeVisible();
  // Secondary button on the stage area: cancel closes the overlay and the
  // native context menu stays suppressed on the claimed surface.
  await page.mouse.click(640, 600, { button: "right" });
  await expect(page.locator("[data-cc-album]")).toHaveCount(0);
});

test("language switches live in Settings and persists across reload", async ({ page }) => {
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);

  // Open the default Settings dialog and switch to English.
  await page.getByRole("button", { name: "设置" }).click();
  await page.locator("[data-cc-settings-locale]").selectOption("en");
  // In-game text switches immediately (the HUD action button).
  await expect(page.locator("[data-cc-album-open]")).toHaveText("Album");
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByRole("button", { name: "Play with Drizzle" })).toBeVisible();

  // The preference is Host data: a reload keeps English, including chrome.
  await page.reload();
  await expect(page.getByRole("button", { name: "Begin the story" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
});

test("the album overlay masks locked entries and shows unlocked meta progress", async ({
  page,
}) => {
  await page.goto(catcafeTargetUrlV1());
  await playOpeningV1(page);
  await page.locator("[data-cc-album-open]").click();
  await expect(
    page.locator("[data-cc-album-entry='album.growth.rescue'][data-cc-album-unlocked='true']"),
  ).toBeVisible();
  await expect(
    page.locator("[data-cc-album-entry='album.trophy.week3'][data-cc-album-unlocked='false']"),
  ).toBeVisible();
});
