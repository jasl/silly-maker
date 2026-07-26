// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.js";

test.describe("engine default shell", () => {
  test("@smoke boots the default UI and plays through the Story HUD", async ({
    page,
  }, testInfo) => {
    await gotoLabV1(page);

    // The managed viewport hosts the seven-layer stage.
    const viewport = page.getByTestId("game-viewport");
    await expect(viewport).toBeVisible();
    await expect(page.getByTestId("stage-background")).toBeAttached();
    await expect(page.getByTestId("stage-system")).toBeAttached();
    await expect(page.getByRole("group", { name: "引擎实验室" })).toBeAttached();

    // Play one action through the Story HUD contribution.
    const collect = page.getByRole("button", { name: "采集样本" });
    await expect(collect).toBeEnabled();
    if (testInfo.project.name === "chromium-touch") await collect.tap();
    else await collect.click();
    await expect(page.getByText(/样本[1-9]/u)).toBeVisible();

    // The designed Save surface opens as a real dialog and closes.
    await page.getByRole("button", { name: "保存", exact: true }).click();
    const save = page.getByRole("dialog", { name: "保存" });
    await expect(save).toBeVisible();
    await expect(save.getByRole("button", { name: "手动保存" })).toBeVisible();
    await save.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(save).toBeHidden();

    // The Story journal overlay contribution opens through the system menu.
    await page.getByRole("button", { name: "实验日志" }).click();
    const journal = page.getByRole("dialog", { name: "实验日志" });
    await expect(journal).toBeVisible();
    await journal.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(journal).toBeHidden();
  });

  test("@smoke keeps focus-driven activation working", async ({ page }) => {
    await gotoLabV1(page);
    const collect = page.getByRole("button", { name: "采集样本" });
    await collect.focus();
    await expect(collect).toBeFocused();
    const focusVisible = await collect.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
        style.boxShadow !== "none"
      );
    });
    expect(focusVisible, "focused controls must have a visible indicator").toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByText(/样本[1-9]/u)).toBeVisible();
  });

  test("persists a manual save across a reload", async ({ page }) => {
    await gotoLabV1(page);
    await page.getByRole("button", { name: "采集样本" }).click();
    const hud = page.locator("[data-lab-hud='true']");
    const before = await hud.textContent();

    await page.getByRole("button", { name: "保存", exact: true }).click();
    const save = page.getByRole("dialog", { name: "保存" });
    await save.getByRole("button", { name: "手动保存" }).click();
    await expect(save.getByText("已保存到手动存档")).toBeVisible();
    await save.getByRole("button", { name: "关闭", exact: true }).click();

    await page.reload();
    await gotoLabV1(page);
    await page.getByRole("button", { name: "保存", exact: true }).click();
    const reopened = page.getByRole("dialog", { name: "保存" });
    await reopened.getByRole("button", { name: "载入手动存档" }).click();
    const confirmation = page.getByRole("dialog", { name: "载入手动存档" });
    await confirmation.getByRole("button", { name: "确认" }).click();
    await expect(reopened.getByText("已载入存档")).toBeVisible();
    await reopened.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(hud).toHaveText(before ?? "");
  });
});
