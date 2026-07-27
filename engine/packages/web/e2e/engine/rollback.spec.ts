// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

/**
 * R7 player rollback in the browser: the HUD control steps one committed
 * boundary back, the stage and pending interaction re-project from the
 * restored Snapshot on a fresh presentation epoch, and play continues.
 */
test.describe("engine player rollback", () => {
  test("the HUD control rolls one narrative boundary back and play continues", async ({ page }) => {
    await gotoLabV1(page);

    const rollback = page.locator("[data-lab-rollback]");
    await expect(rollback).toBeDisabled();

    // Begin the story and advance once: two committed steps behind us.
    await page.getByRole("button", { name: "开始校准" }).click();
    await expect(page.getByText("需要校准信标，请跟我来。")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByText("样本读数稳定，可以开始校准。")).toBeVisible();
    await expect(rollback).toHaveAttribute("data-lab-rollback-steps", "2");

    // One step back: the intro line is pending again and both characters
    // stay on the settled stage of the restored checkpoint.
    await rollback.click();
    await expect(page.getByText("需要校准信标，请跟我来。")).toBeVisible();
    await expect(rollback).toHaveAttribute("data-lab-rollback-steps", "1");
    await expect(
      page.locator('[data-stage-key="layer.e2e.characters:tag.e2e.alpha"]'),
    ).toBeVisible();

    // Play continues normally from the restored boundary.
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByText("样本读数稳定，可以开始校准。")).toBeVisible();
  });
});
