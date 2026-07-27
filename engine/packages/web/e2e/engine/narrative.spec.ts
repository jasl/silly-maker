// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

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
    // advances — the beta researcher's line, not anything past it.
    await page.getByRole("button", { name: "继续" }).evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
    await expect(page.getByText("样本读数稳定，可以开始校准。")).toBeVisible();
    await expect(say).toHaveAttribute("data-lab-occurrence", "interaction-occurrence.2");

    // Both researchers entered the stage as semantic character entries.
    await expect(
      page.locator('[data-stage-key="layer.e2e.characters:tag.e2e.alpha"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-stage-key="layer.e2e.characters:tag.e2e.beta"]'),
    ).toBeVisible();

    // Wait for the natural reveal, then one activation advances the beta
    // line (the two-step confirm itself is covered where the reveal is
    // still in flight deterministically — the jsdom player suite).
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
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
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();

    // Same authoritative outcome the headless suite asserts.
    await expect(page.locator("[data-lab-narrative='calibrated']")).toBeVisible();
    await expect(page.locator("[data-lab-narrative='calibrated']")).toContainText("（3）");

    // The beacon left the stage when the script cleaned up.
    await expect(page.locator('[data-stage-key="layer.e2e.props:tag.e2e.beacon"]')).toHaveCount(0);
  });

  test("save, refresh, and load restore the same interaction and stage target", async ({
    page,
  }) => {
    await gotoLabV1(page);

    // Reach the choice — a stable interaction boundary — and save there.
    // The first activation completes the typewriter, the second resolves.
    await page.getByRole("button", { name: "开始校准" }).click();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByText("样本读数稳定，可以开始校准。")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    const choice = page.locator("[data-lab-interaction='choice']");
    await expect(choice).toBeVisible();
    const savedOccurrence = await choice.getAttribute("data-lab-occurrence");

    await page.getByRole("button", { name: "保存", exact: true }).click();
    const saveDialog = page.getByRole("dialog", { name: "保存" });
    await saveDialog.getByRole("button", { name: "手动保存" }).click();
    await expect(saveDialog.getByTestId("save-operation-result")).toHaveText("已保存到手动存档");
    await saveDialog.getByRole("button", { name: "关闭", exact: true }).click();

    // Refresh: the page boots fresh, then an explicit load restores the
    // exact interaction occurrence and the stage target (beacon included).
    await page.reload();
    await expect(page.getByRole("button", { name: "开始校准" })).toBeVisible();
    await page.getByRole("button", { name: "保存", exact: true }).click();
    const reloadDialog = page.getByRole("dialog", { name: "保存" });
    await reloadDialog.getByRole("button", { name: "载入手动存档" }).click();
    const confirmation = page.getByRole("dialog", { name: "载入手动存档" });
    await confirmation.getByRole("button", { name: "确认", exact: true }).click();
    await expect(reloadDialog.getByTestId("save-operation-result")).toHaveText("已载入存档");
    await reloadDialog.getByRole("button", { name: "关闭", exact: true }).click();

    await expect(choice).toBeVisible();
    await expect(choice).toHaveAttribute("data-lab-occurrence", savedOccurrence ?? "");
    await expect(page.locator('[data-stage-key="layer.e2e.props:tag.e2e.beacon"]')).toBeVisible();

    // The restored interaction resolves normally and the run completes.
    await page.getByRole("button", { name: "直接校准" }).click();
    await expect(page.locator("[data-lab-interaction='custom']")).toBeVisible({
      timeout: 10_000,
    });
    await page.locator("[data-lab-dial-value='2']").click();
    await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.locator("[data-lab-narrative='calibrated']")).toBeVisible();
  });

  test("restarting the script issues fresh occurrences", async ({ page }) => {
    await gotoLabV1(page);

    await page.getByRole("button", { name: "开始校准" }).click();
    const say = page.locator("[data-lab-interaction='say']");
    await expect(say).toBeVisible();
    const firstOccurrence = await say.getAttribute("data-lab-occurrence");

    // Play to completion via the basic branch: wait for each natural
    // reveal, then a single activation advances.
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
    await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.locator("[data-lab-narrative='calibrated']")).toBeVisible();

    // Re-entering the same definitions produces new occurrences.
    await page.getByRole("button", { name: "开始校准" }).click();
    await expect(say).toBeVisible();
    const reenteredOccurrence = await say.getAttribute("data-lab-occurrence");
    expect(reenteredOccurrence).not.toBe(firstOccurrence);
  });
});
