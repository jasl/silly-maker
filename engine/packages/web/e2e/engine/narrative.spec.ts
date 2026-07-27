// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.js";

test.describe("engine pending interactions", () => {
  test("@smoke plays the calibration narrative through every boundary", async ({ page }) => {
    await gotoLabV1(page);

    // Begin: the say boundary appears with a stable occurrence marker.
    await page.getByRole("button", { name: "开始校准" }).click();
    const say = page.locator("[data-lab-interaction='say']");
    await expect(say).toBeVisible();
    await expect(page.getByText("需要校准信标，请跟我来。")).toBeVisible();
    const firstOccurrence = await say.getAttribute("data-lab-occurrence");
    expect(firstOccurrence).toMatch(/^interaction-occurrence\.[1-9]/u);

    // Rapid double activation: two synchronous clicks fire before React
    // re-renders, so both dispatch the SAME occurrence. The first commits,
    // the queue front rejects the stale duplicate, and exactly one boundary
    // advances — the choice, not anything past it.
    await page.getByRole("button", { name: "继续" }).evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
    const choice = page.locator("[data-lab-interaction='choice']");
    await expect(choice).toBeVisible();
    await expect(page.locator("[data-lab-interaction='say']")).toHaveCount(0);

    // The pure stage node showed the beacon on the way to the choice.
    await expect(page.locator('[data-stage-key="layer.e2e.props:tag.e2e.beacon"]')).toBeVisible();

    // Availability from the shared evaluator: precise needs a sample.
    await expect(page.getByRole("button", { name: "精密校准" })).toBeDisabled();

    // Collecting a sample re-evaluates availability live.
    await page.getByRole("button", { name: "采集样本" }).click();
    await expect(page.getByRole("button", { name: "精密校准" })).toBeEnabled();

    // Choose; the acknowledged background crossfade confirms the barrier,
    // and the pause auto-resumes into the custom surface. The test observes
    // boundaries, never sleeps.
    await page.getByRole("button", { name: "直接校准" }).click();
    await expect(page.locator("[data-lab-interaction='custom']")).toBeVisible({
      timeout: 10_000,
    });

    // The schema-registered dial resolves with a validated payload.
    await page.locator("[data-lab-dial-value='3']").click();
    await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();
    await page.getByRole("button", { name: "继续" }).click();

    // Same authoritative outcome the headless suite asserts.
    await expect(page.locator("[data-lab-narrative='calibrated']")).toBeVisible();
    await expect(page.locator("[data-lab-narrative='calibrated']")).toContainText("（3）");

    // The beacon left the stage when the script cleaned up.
    await expect(page.locator('[data-stage-key="layer.e2e.props:tag.e2e.beacon"]')).toHaveCount(0);
  });

  test("restarting the script issues fresh occurrences", async ({ page }) => {
    await gotoLabV1(page);

    await page.getByRole("button", { name: "开始校准" }).click();
    const say = page.locator("[data-lab-interaction='say']");
    await expect(say).toBeVisible();
    const firstOccurrence = await say.getAttribute("data-lab-occurrence");

    // Play to completion via the basic branch.
    await page.getByRole("button", { name: "继续" }).click();
    await page.getByRole("button", { name: "直接校准" }).click();
    await expect(page.locator("[data-lab-interaction='custom']")).toBeVisible({
      timeout: 10_000,
    });
    await page.locator("[data-lab-dial-value='1']").click();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.locator("[data-lab-narrative='calibrated']")).toBeVisible();

    // Re-entering the same definitions produces new occurrences.
    await page.getByRole("button", { name: "开始校准" }).click();
    await expect(say).toBeVisible();
    const reenteredOccurrence = await say.getAttribute("data-lab-occurrence");
    expect(reenteredOccurrence).not.toBe(firstOccurrence);
  });
});
