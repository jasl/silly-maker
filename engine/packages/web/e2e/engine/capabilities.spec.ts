// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

const debugVocabularyV1 = /debug|semantic|revision|replay|fixture|diagnostic/iu;

test.describe("engine player/debug boundary", () => {
  test("resident player DOM carries no debug vocabulary", async ({ page }) => {
    await gotoLabV1(page);
    const text = await page.getByRole("application").textContent();
    expect(text ?? "").not.toMatch(debugVocabularyV1);
    await expect(page.getByRole("button", { name: /开发工具/u })).toHaveCount(0);
  });

  test("the DevDock appears only behind debug_tools and hosts the debug surface", async ({ page }) => {
    await gotoLabV1(page, "?capability=debug_tools");
    // Boot-time grants keep the collapsed chip; only runtime grants auto-open.
    const chip = page.getByRole("button", { name: "开发工具" });
    await expect(chip).toBeVisible();
    await expect(page.getByRole("navigation", { name: "开发工具" })).toHaveCount(0);
    await chip.click();
    await expect(page.getByRole("navigation", { name: "开发工具" })).toBeVisible();
  });

  test("rejects malformed capability requests without partial grants", async ({ page }) => {
    await gotoLabV1(page, "?capability=debug_tools&capability=debug_tools");
    await expect(page.getByRole("button", { name: /开发工具/u })).toHaveCount(0);
  });

  test("the lazy Lab inspectors render live read-only data in the DevDock", async ({ page }) => {
    await gotoLabV1(page, "?capability=debug_tools");

    // Every contributed panel lists in the chip menu; each opens its own
    // floating window.
    await page.getByRole("button", { name: "开发工具" }).click();
    const menu = page.getByRole("navigation", { name: "开发工具" });
    await expect(menu).toBeVisible();
    await menu.getByRole("button", { name: "叙事图" }).click();
    const graphWindow = page.getByRole("dialog", { name: "叙事图" });
    await expect(graphWindow.locator("[data-graph-lint='clean']")).toBeVisible();
    await expect(graphWindow.locator("[data-graph-node='node.e2e.cal.intro']")).toBeVisible();
    await expect(graphWindow.locator("[data-graph-active='true']")).toHaveCount(0);

    // Floating windows no longer shield the stage: drag the window aside,
    // then start the story with the window still open.
    const header = graphWindow.locator("[data-devdock-window-drag]");
    const initialBox = await graphWindow.boundingBox();
    const headerBox = await header.boundingBox();
    expect(initialBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    await page.mouse.move(headerBox!.x + 8, headerBox!.y + 8);
    await page.mouse.down();
    await page.mouse.move(headerBox!.x - 300, headerBox!.y + 120, { steps: 4 });
    await page.mouse.up();
    const movedBox = await graphWindow.boundingBox();
    expect(movedBox).not.toBeNull();
    // Tall windows may already touch the vertical clamp; horizontal
    // displacement alone proves header dragging works.
    expect(Math.abs(movedBox!.x - initialBox!.x)).toBeGreaterThan(100);

    await page.getByRole("button", { name: "开始校准" }).click();
    await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();

    // The open narrative-graph window tracks the live highlight without a
    // close/reopen cycle.
    await expect(
      graphWindow.locator("[data-graph-active='true']"),
    ).toHaveAttribute("data-graph-node", "node.e2e.cal.intro");

    // A second window opens beside the first from the same menu.
    await menu.getByRole("button", { name: "交互与历史" }).click();
    const inspectorWindow = page.getByRole("dialog", { name: "交互与历史" });
    const inspector = inspectorWindow.locator("[data-debug-inspector='lab-interaction']");
    await expect(inspector).toContainText("interaction.e2e.cal-intro");
    await expect(inspector).toContainText("interaction-occurrence.1");
    await expect(page.locator("[data-devdock-window]")).toHaveCount(2);
  });
});
