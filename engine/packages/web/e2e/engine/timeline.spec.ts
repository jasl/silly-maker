// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.ts";

/**
 * R5 Timeline vertical proof: committing the calibration result plays the
 * beacon-pulse cue through the ordinary presentation intent. The cue is
 * decorative — its event probe appears, the overlay animates, and the stage
 * returns to the settled rendering. The reduced-motion suite proves the
 * instant-settle fallback with the same event trail.
 */
test.describe("engine timeline cues", () => {
  test("the calibration result plays the beacon pulse cue and clears", async ({ page }) => {
    await gotoLabV1(page);

    // Reach the custom dial through the ordinary route.
    await page.getByRole("button", { name: "开始校准" }).click();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.getByText("样本读数稳定，可以开始校准。")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.getByRole("button", { name: "继续" }).click();
    await expect(page.locator("[data-lab-interaction='choice']")).toBeVisible();
    await page.getByRole("button", { name: "直接校准" }).click();
    await expect(page.locator("[data-lab-interaction='custom']")).toBeVisible({
      timeout: 10_000,
    });

    // Committing the dial value triggers the cue: the event probe records
    // the chime exactly once and the stage exposes the active cue while it
    // plays (under reduced motion it settles in the same frame, so only the
    // event probe is guaranteed to be observable).
    await page.locator("[data-lab-dial-value='2']").click();
    const stageSection = page.locator("[data-lab-stage]");
    await expect(stageSection).toHaveAttribute("data-lab-cue-event", "event.e2e.beacon-chime", {
      timeout: 10_000,
    });

    // The cue always ends back at the settled rendering: no active cue
    // marker remains and the beacon entry keeps its settled identity.
    await expect(page.locator("[data-semantic-stage]")).not.toHaveAttribute(
      "data-stage-cue",
      /.+/u,
      { timeout: 10_000 },
    );
    await expect(page.locator('[data-stage-key="layer.e2e.props:tag.e2e.beacon"]')).toBeVisible();

    // Decorative means decorative: the narrative continues normally after.
    await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();
  });
});
