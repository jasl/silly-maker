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
    const launcher = page.getByRole("button", { name: "打开左侧开发工具" });
    await expect(launcher).toBeVisible();
    await launcher.click();
    await expect(page.getByRole("complementary", { name: "左侧开发工具" })).toBeVisible();
  });

  test("rejects malformed capability requests without partial grants", async ({ page }) => {
    await gotoLabV1(page, "?capability=debug_tools&capability=debug_tools");
    await expect(page.getByRole("button", { name: /开发工具/u })).toHaveCount(0);
  });

  test("the lazy Lab inspectors render live read-only data in the DevDock", async ({ page }) => {
    await gotoLabV1(page, "?capability=debug_tools");

    // The narrative-graph panel lives on the left: lint-clean listing with
    // every script node, none active before the story starts.
    await page.getByRole("button", { name: "打开左侧开发工具" }).click();
    const leftDock = page.getByRole("complementary", { name: "左侧开发工具" });
    await expect(leftDock).toBeVisible();
    await leftDock.getByRole("button", { name: "叙事图" }).click();
    await expect(leftDock.locator("[data-graph-lint='clean']")).toBeVisible();
    await expect(leftDock.locator("[data-graph-node='node.e2e.cal.intro']")).toBeVisible();
    await expect(leftDock.locator("[data-graph-active='true']")).toHaveCount(0);

    // An open dock intercepts stage pointer input by design; close it,
    // start the story, and reopen to observe the live highlight.
    await page.keyboard.press("Escape");
    await expect(leftDock).toHaveCount(0);
    await page.getByRole("button", { name: "开始校准" }).click();
    await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();

    await page.getByRole("button", { name: "打开左侧开发工具" }).click();
    await expect(
      page
        .getByRole("complementary", { name: "左侧开发工具" })
        .locator("[data-graph-active='true']"),
    ).toHaveAttribute("data-graph-node", "node.e2e.cal.intro");
    await page.keyboard.press("Escape");

    // The interaction inspector on the right mirrors the live occurrence.
    await page.getByRole("button", { name: "打开右侧开发工具" }).click();
    const rightDock = page.getByRole("complementary", { name: "右侧开发工具" });
    await rightDock.getByRole("button", { name: "交互与历史" }).click();
    const inspector = rightDock.locator("[data-debug-inspector='lab-interaction']");
    await expect(inspector).toContainText("interaction.e2e.cal-intro");
    await expect(inspector).toContainText("interaction-occurrence.1");
  });
});
