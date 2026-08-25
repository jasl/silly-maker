// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

/**
 * Real-pointer evidence for shared stage input: pendings declaring
 * `stageInput: "shared"` keep the gameplay layers out of the narrative
 * isolate, so an actual browser click reaches the crate's shaped hit
 * region — resolving the shared decision menu on its own occurrence, then
 * landing the occurrence-fenced collector write mid-hold (the hold's own
 * arm cuts at the next fenced settlement's t=0). Isolated pendings keep
 * the stage inert; Chromium enforces the attribute natively. Attribute
 * and routing arithmetic are pinned headless — this suite proves the
 * pointer path end to end.
 */
test.describe("engine shared stage input", () => {
  test("a real pointer resolves the shared menu and lands the mid-hold fenced write", async ({ page }) => {
    await gotoLabV1(page);
    const backgroundLayer = page.locator('[data-stage-layer="background"]');

    // The crate (with its authored regions Document) enters on first
    // collect, during free navigation.
    await page.getByRole("button", { name: "采集样本" }).click();
    const zone = page.getByRole("button", { name: "样本箱采集口" });
    await expect(zone).toBeVisible();
    await expect(backgroundLayer).not.toHaveAttribute("inert");

    // The chamber say is isolated (undeclared): the stage layers join the
    // narrative isolate for real pointers.
    await page.getByRole("button", { name: "开始演习" }).click();
    await expect(page.getByText("环境采样进行中，保持观察。")).toBeVisible();
    await expect(backgroundLayer).toHaveAttribute("inert", "");

    // The decision menu declares shared stage input: the isolate releases
    // and a real pointer click on the crate region resolves the tripwire
    // option against the menu's own occurrence.
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByRole("button", { name: "释放脉冲" })).toBeVisible();
    await expect(backgroundLayer).not.toHaveAttribute("inert");
    await zone.click();
    await expect(page.locator("[data-lab-interaction='hold']")).toBeVisible();

    // The shared tripwire hold keeps the stage reachable: a second real
    // click lands the fenced collector write, and the hold's own arm cuts
    // to the catch line at the next fenced settlement's t=0.
    await expect(backgroundLayer).not.toHaveAttribute("inert");
    await zone.click();
    await expect(page.getByText("有动静——正好抓个正着。")).toBeVisible({ timeout: 15_000 });

    // The catch say is isolated again — declaration is per pending, not
    // per scene.
    await expect(backgroundLayer).toHaveAttribute("inert", "");
  });
});
