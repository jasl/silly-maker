// SPDX-License-Identifier: MIT
import { expect, test, vnLastSoundCheckModsTargetUrlV1 } from "./fixtures.ts";

test("One Last Sound Check prebuilt Mod surface applies selected text and image", async ({ page }) => {
  await page.goto(vnLastSoundCheckModsTargetUrlV1());
  await expect(page.locator("[data-title-screen='true']")).toBeVisible();

  await page.getByRole("button", { name: "新游戏" }).click();
  await expect(page.locator("[data-dialogue='say'] p")).toHaveText(
    /^【Showcase Mod】/u,
  );

  const signalLight = page.locator(
    '[data-vn-last-sound-check-prop="signal-light"]',
  );
  await expect(signalLight).toBeVisible();
  await expect(signalLight).not.toHaveAttribute(
    "data-vn-last-sound-check-media-fallback",
  );
  await expect(signalLight.locator("img")).toHaveAttribute("src", /^blob:/u);
});
