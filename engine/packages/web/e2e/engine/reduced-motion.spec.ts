// SPDX-License-Identifier: MIT
import type { Locator } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

function parseCssTimesV1(value: string): readonly number[] {
  return value.split(",").map((entry) => {
    const trimmed = entry.trim();
    if (trimmed.endsWith("ms")) return Number.parseFloat(trimmed) / 1000;
    if (trimmed.endsWith("s")) return Number.parseFloat(trimmed);
    return Number.NaN;
  });
}

async function expectMotionDisabledV1(label: string, witness: Locator): Promise<void> {
  await expect(witness, `${label} must be rendered`).toBeVisible();
  const computed = await witness.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      animationDuration: style.animationDuration,
      animationName: style.animationName,
      transitionDuration: style.transitionDuration,
    };
  });
  expect(
    parseCssTimesV1(computed.transitionDuration).every((duration) => duration === 0),
    `${label} transition duration`,
  ).toBe(true);
  expect(
    parseCssTimesV1(computed.animationDuration).every((duration) => duration === 0),
    `${label} animation duration`,
  ).toBe(true);
}

test.describe("engine reduced motion", () => {
  test("@responsive removes nonessential shell and overlay motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoLabV1(page);

    await expectMotionDisabledV1("stage main", page.getByRole("main"));

    await page.getByRole("button", { name: "实验日志" }).click();
    const journal = page.getByRole("dialog", { name: "实验日志" });
    await expectMotionDisabledV1("journal overlay", journal);
  });

  test("@responsive settles stage transitions directly to the target", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoLabV1(page);

    // With reduced motion the catalog settles: the background replace lands
    // instantly, no exiting ghost appears, and the stage never leaves the
    // settled state.
    await page.getByRole("button", { name: "采集样本" }).click();
    await page.getByRole("button", { name: "开始流程" }).click();
    const background = page.locator('[data-stage-key="layer.e2e.background:tag.e2e.bg"]');
    await expect(background).toHaveAttribute("data-stage-content", "content.e2e.bg.storeroom");
    await expect(page.locator("[data-semantic-stage]")).toHaveAttribute(
      "data-stage-settled",
      "true",
    );
    await expect(page.locator("[data-stage-exiting]")).toHaveCount(0);
  });

  test("@responsive completes the presentation barrier without any animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoLabV1(page);

    // Even though the crossfade settles instantly under reduced motion, the
    // acknowledged edge still confirms the barrier, so the calibration
    // narrative never deadlocks.
    await page.getByRole("button", { name: "开始校准" }).click();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByText("样本读数稳定，可以开始校准。")).toBeVisible();
    await page.getByRole("button", { name: "继续" }).click();
    await page.getByRole("button", { name: "直接校准" }).click();
    await expect(page.locator("[data-lab-interaction='custom']")).toBeVisible({
      timeout: 10_000,
    });
    await page.locator("[data-lab-dial-value='1']").click();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.locator("[data-lab-narrative='calibrated']")).toBeVisible();
  });
});
