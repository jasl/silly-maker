// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

const alphaKeyV1 = "layer.e2e.characters:tag.e2e.alpha";

test.describe("engine stage provenance (M2)", () => {
  test("click-to-inspect resolves an entered character to its motion asset and source", async ({ page }) => {
    await gotoLabV1(page, "?capability=debug_tools");

    // Bring the characters on stage through the ordinary Lab flow; their
    // enter edge binds the motion transition from the JSON asset.
    await page.getByRole("button", { name: "采集样本" }).click();
    await page.getByRole("button", { name: "开始流程" }).click();
    const stageRoot = page.locator("[data-semantic-stage]");
    await expect(page.locator(`[data-stage-key="${alphaKeyV1}"]`)).toBeVisible();
    await expect(stageRoot).toHaveAttribute("data-stage-settled", "true");

    // No inspect surfaces exist until the author enables them in the panel.
    await expect(page.locator("[data-stage-inspect-hit]")).toHaveCount(0);

    // Enable inspection from the provenance panel, then close the dock —
    // an open dock intercepts stage pointer input by design.
    await page.getByRole("button", { name: "打开左侧开发工具" }).click();
    const leftDock = page.getByRole("complementary", { name: "左侧开发工具" });
    await leftDock.getByRole("button", { name: "舞台溯源" }).click();
    await leftDock.locator("[data-stage-inspect-toggle]").click();
    await page.keyboard.press("Escape");
    await expect(leftDock).toHaveCount(0);

    // Click the character on the live stage.
    await page.locator(`[data-stage-inspect-hit="${alphaKeyV1}"]`).click();

    // Reopen the dock: the provenance card resolves the settled character
    // back to its transition, motion asset, and source file.
    await page.getByRole("button", { name: "打开左侧开发工具" }).click();
    const reopenedDock = page.getByRole("complementary", { name: "左侧开发工具" });
    await reopenedDock.getByRole("button", { name: "舞台溯源" }).click();
    const field = (name: string) => reopenedDock.locator(`[data-stage-provenance-field="${name}"]`);
    await expect(field("transition")).toHaveText("transition.e2e.char-enter");
    await expect(field("motion")).toHaveText("motion.e2e.char-enter");
    await expect(field("source")).toHaveText("src/motions/char-enter.motion.json");
    await expect(
      reopenedDock.locator("[data-stage-provenance-open]"),
    ).toHaveAttribute("data-stage-provenance-open", "src/motions/char-enter.motion.json");
  });
});
