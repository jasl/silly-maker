// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

test.describe("build-known Code Surface composition", () => {
  test("the conformance surface is exact-query gated", async ({ page }) => {
    await gotoLabV1(page);
    await expect(page.getByRole("region", { name: "Code Surface conformance" })).toHaveCount(0);

    await gotoLabV1(page, "?code_surface_conformance=true");
    await expect(page.getByRole("region", { name: "Code Surface conformance" })).toHaveCount(0);
  });

  test("native text input does not leak a Player shortcut", async ({ page }) => {
    await gotoLabV1(page, "?code_surface_conformance=1");
    const surface = page.getByRole("region", { name: "Code Surface conformance" });
    await expect(surface).toBeVisible();
    await expect(surface.getByRole("textbox", { name: "Local draft" })).toHaveCount(0);
    await page.getByRole("button", { name: "开始校准" }).click();
    const auto = page.getByRole("button", { name: "自动" });
    await expect(auto).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();

    await surface.getByRole("button", { name: "Open details" }).click();
    const draft = surface.getByRole("textbox", { name: "Local draft" });
    await draft.fill("你好，SillyMaker");
    await draft.press("KeyA");
    await expect(auto).toHaveAttribute("aria-pressed", "false");
  });

  test("a typed action updates gameplay without rebuilding local state", async ({ page }) => {
    await gotoLabV1(page, "?code_surface_conformance=1");
    const surface = page.getByRole("region", { name: "Code Surface conformance" });
    await surface.getByRole("button", { name: "Open details" }).click();
    const draft = surface.getByRole("textbox", { name: "Local draft" });
    await draft.fill("本地草稿");
    const hud = page.locator("[data-lab-hud='true']");
    await expect(hud).toContainText("样本0");
    await surface.getByRole("button", { name: "Collect sample" }).click();
    await expect(hud).toContainText(/样本[1-3]/u);
    await expect(draft).toHaveValue("本地草稿");
  });
});
