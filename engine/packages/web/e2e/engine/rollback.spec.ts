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

    // Complete the active Narrative surface through its public controls.
    // HUD actions intentionally remain inert until Narrative releases focus.
    await page.getByRole("button", { name: "开始校准" }).click();
    await expect(page.getByText("需要校准信标，请跟我来。")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByText("样本读数稳定，可以开始校准。")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await page.getByRole("button", { name: "直接校准" }).click();
    await expect(page.locator("[data-lab-interaction='custom']")).toBeVisible({
      timeout: 10_000,
    });
    await page.locator("[data-lab-dial-value='1']").click();
    await expect(page.getByText("校准完成，信标已就绪。")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.locator("[data-lab-narrative='calibrated']")).toBeVisible();
    await expect(page.locator("[data-lab-interaction]")).toHaveCount(0);

    const stepsBeforeRollback = Number(
      await rollback.getAttribute("data-lab-rollback-steps"),
    );
    expect(Number.isSafeInteger(stepsBeforeRollback)).toBe(true);
    expect(stepsBeforeRollback).toBeGreaterThan(0);

    // With Narrative released, the HUD owns its normal pointer action. One
    // step restores the final Say and the settled pre-cleanup stage.
    await rollback.click();
    await expect(page.getByText("校准完成，信标已就绪。")).toBeVisible();
    await expect(rollback).toHaveAttribute(
      "data-lab-rollback-steps",
      String(stepsBeforeRollback - 1),
    );
    await expect(
      page.locator('[data-stage-key="layer.e2e.characters:tag.e2e.alpha"]'),
    ).toBeVisible();

    // Play continues normally from the restored boundary.
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.locator("[data-lab-narrative='calibrated']")).toBeVisible();
  });
});
