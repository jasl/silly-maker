// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.js";

const backgroundKeyV1 = '[data-stage-key="layer.e2e.background:tag.e2e.bg"]';
const alphaKeyV1 = '[data-stage-key="layer.e2e.characters:tag.e2e.alpha"]';
const betaKeyV1 = '[data-stage-key="layer.e2e.characters:tag.e2e.beta"]';
const crateKeyV1 = '[data-stage-key="layer.e2e.props:tag.e2e.crate"]';

test.describe("engine semantic stage", () => {
  test("@smoke stage mutations drive the visible stage with stable identities", async ({
    page,
  }) => {
    await gotoLabV1(page);

    // Opening target: the lab background under its stable key; nobody else.
    const background = page.locator(backgroundKeyV1);
    await expect(background).toBeVisible();
    await expect(background).toHaveAttribute("data-stage-content", "content.e2e.bg.lab");
    await expect(background).toHaveAttribute(
      "data-stage-renderer",
      "renderer.e2e.lab.stage-background",
    );
    await expect(page.locator(alphaKeyV1)).toHaveCount(0);
    await expect(page.locator(crateKeyV1)).toHaveCount(0);

    // show: collecting a sample brings in the crate prop.
    await page.getByRole("button", { name: "采集样本" }).click();
    await expect(page.locator(crateKeyV1)).toBeVisible();

    // replace + show: beginning the procedure swaps the background content
    // under the SAME stable key and brings both characters on stage. The
    // crossfade retains the superseded background as an exiting ghost, and
    // the stage reports its transition lifecycle as data — the test observes
    // the settled signal instead of sleeping.
    const stageRoot = page.locator("[data-semantic-stage]");
    await page.getByRole("button", { name: "开始流程" }).click();
    await expect(background).toHaveAttribute("data-stage-content", "content.e2e.bg.storeroom");
    await expect(stageRoot).toHaveAttribute("data-stage-settled", "false");
    await expect(page.locator("[data-stage-exiting]").first()).toBeAttached();
    await expect(stageRoot).toHaveAttribute("data-stage-settled", "true");
    await expect(page.locator("[data-stage-exiting]")).toHaveCount(0);
    await expect(page.locator(alphaKeyV1)).toBeVisible();
    await expect(page.locator(betaKeyV1)).toBeVisible();
    await expect(page.locator(`${alphaKeyV1} [data-lab-expression]`)).toHaveAttribute(
      "data-lab-expression",
      "neutral",
    );
    await expect(page.locator(alphaKeyV1)).toHaveCount(1);

    // The characters expose their accessible names from the Story catalog.
    await expect(page.locator(alphaKeyV1)).toHaveAttribute("aria-label", "研究员甲");
    await expect(page.locator(betaKeyV1)).toHaveAttribute("aria-label", "研究员乙");

    // setAppearance: advancing focuses the lead character.
    await page.getByRole("button", { name: "推进流程" }).click();
    await expect(page.locator(`${alphaKeyV1} [data-lab-expression]`)).toHaveAttribute(
      "data-lab-expression",
      "focused",
    );

    // Completion settles appearances and moves the camera.
    await page.getByRole("button", { name: "推进流程" }).click();
    await expect(page.locator(`${alphaKeyV1} [data-lab-expression]`)).toHaveAttribute(
      "data-lab-expression",
      "pleased",
    );
    await expect(page.locator(`${betaKeyV1} [data-lab-expression]`)).toHaveAttribute(
      "data-lab-expression",
      "pleased",
    );
    const cameraTransform = await page
      .locator('[data-stage-camera="true"]')
      .evaluate((element) => (element as HTMLElement).style.transform);
    expect(cameraTransform).toContain("scale(1.15)");

    // Stage identities survive a reload of the same authoritative state? A
    // fresh boot restores the OPENING target: browser storage only persists
    // explicit saves, so the visible stage rebuilds from state, not the DOM.
    await page.reload();
    await expect(page.locator(backgroundKeyV1)).toHaveAttribute(
      "data-stage-content",
      "content.e2e.bg.lab",
    );
  });

  test("hide releases an entry while unrelated identities stay stable", async ({ page }) => {
    await gotoLabV1(page);

    // Drive to a running procedure with exactly the collected samples.
    await page.getByRole("button", { name: "采集样本" }).click();
    await expect(page.locator(crateKeyV1)).toBeVisible();
    await page.getByRole("button", { name: "开始流程" }).click();
    await expect(page.locator(alphaKeyV1)).toBeVisible();

    // Run experiments until the samples run out and the crate is hidden, or
    // the procedure completes first (sample yield is randomized 1..3).
    const run = page.getByRole("button", { name: "进行实验" });
    const samples = page.locator("[data-lab-hud='true']");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (!(await run.isEnabled())) break;
      await run.click();
      await expect(samples).toBeVisible();
    }

    const samplesText = await samples.textContent();
    const remaining = /样本(\d+)/u.exec(samplesText ?? "")?.[1];
    if (remaining === "0") {
      await expect(page.locator(crateKeyV1)).toHaveCount(0);
    } else {
      await expect(page.locator(crateKeyV1)).toBeVisible();
    }

    // The background identity never flickered through all of this.
    await expect(page.locator(backgroundKeyV1)).toHaveAttribute(
      "data-stage-content",
      "content.e2e.bg.storeroom",
    );
  });
});
