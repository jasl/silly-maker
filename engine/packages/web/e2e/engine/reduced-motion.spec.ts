// SPDX-License-Identifier: MIT
import type { Locator } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.js";

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
});
