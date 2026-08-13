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

    // Enable inspection from the provenance window. Floating windows no
    // longer shield the stage, so the character stays clickable while the
    // window remains open and the card updates live.
    await page.getByRole("button", { name: "调试" }).click();
    await page.getByRole("group", { name: "调试" })
      .getByRole("button", { name: "舞台溯源" })
      .click();
    const dock = page.getByRole("dialog", { name: "舞台溯源" });
    await dock.locator("[data-stage-inspect-toggle]").click();

    // Click the character on the live stage with the window still open.
    await page.locator(`[data-stage-inspect-hit="${alphaKeyV1}"]`).click();

    // The provenance card resolves the settled character back to its
    // transition, motion asset, and source file without a reopen cycle.
    const field = (name: string) => dock.locator(`[data-stage-provenance-field="${name}"]`);
    await expect(field("transition")).toHaveText("transition.e2e.char-enter");
    await expect(field("motion")).toHaveText("motion.e2e.char-enter");
    await expect(field("source")).toHaveText("src/motions/char-enter.motion.json");
    await expect(
      dock.locator("[data-stage-provenance-open]"),
    ).toHaveAttribute("data-stage-provenance-open", "src/motions/char-enter.motion.json");
  });
});
