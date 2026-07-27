// SPDX-License-Identifier: MIT
import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

async function expectNoWcagViolationsV1(page: Page, surface: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze();
  expect(results.violations, `axe violations on ${surface}`).toEqual([]);
}

test.describe("engine default UI accessibility", () => {
  test("has no WCAG A or AA violations on play, save, journal, and DevDock surfaces", async ({
    page,
  }) => {
    await gotoLabV1(page, "?capability=debug_tools");
    await expectNoWcagViolationsV1(page, "play");

    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "保存" })).toBeVisible();
    await expectNoWcagViolationsV1(page, "save");
    await page
      .getByRole("dialog", { name: "保存" })
      .getByRole("button", { name: "关闭", exact: true })
      .click();

    await page.getByRole("button", { name: "实验日志" }).click();
    await expect(page.getByRole("dialog", { name: "实验日志" })).toBeVisible();
    await expectNoWcagViolationsV1(page, "journal");
    await page
      .getByRole("dialog", { name: "实验日志" })
      .getByRole("button", { name: "关闭", exact: true })
      .click();

    await page.getByRole("button", { name: "打开左侧开发工具" }).click();
    await expect(page.getByRole("complementary", { name: "左侧开发工具" })).toBeVisible();
    await expectNoWcagViolationsV1(page, "DevDock");
  });

  test("settings opens as a modal dialog with an escape route", async ({ page }) => {
    await gotoLabV1(page);
    await page.getByRole("button", { name: "设置" }).click();
    const settings = page.getByRole("dialog", { name: "设置" });
    await expect(settings).toBeVisible();
    await expectNoWcagViolationsV1(page, "settings");
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();
  });
});
