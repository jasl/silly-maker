// SPDX-License-Identifier: MIT
import { expect, gotoLabV1, test } from "./fixtures.js";

test.describe("engine input actions", () => {
  test("@smoke keyboard drives the same narrative intents as pointer input", async ({ page }) => {
    await gotoLabV1(page);

    await page.getByRole("button", { name: "开始校准" }).click();
    await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();

    // Keep focus off interactive controls so the stage shortcut applies.
    await page.locator("body").click();

    // Player controls from the keyboard are pure presentation: auto stays
    // engaged at a say boundary until the text reveals and the wait runs.
    await page.keyboard.press("KeyA");
    await expect(page.getByRole("button", { name: "自动" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.keyboard.press("KeyA");
    await expect(page.getByRole("button", { name: "自动" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.keyboard.press("KeyH");
    await expect(page.locator("[data-lab-player='history-panel']")).toBeAttached();
    await page.keyboard.press("KeyH");
    await expect(page.locator("[data-lab-player='history-panel']")).toHaveCount(0);

    // Keyboard advance: wait for the natural reveal, then Enter resolves
    // the say — identical semantics to clicking 继续. The beta line follows
    // before the choice.
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.keyboard.press("Enter");
    await expect(page.getByText("样本读数稳定，可以开始校准。")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-lab-interaction='choice']")).toBeVisible();

    // The choice does not react to the advance shortcut; the boundary
    // stays put until an explicit option activation.
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-lab-interaction='choice']")).toBeVisible();
  });

  test("a synthetic gamepad forms the same intents through the poll loop", async ({ page }) => {
    await page.addInitScript(() => {
      const buttons = Array.from({ length: 8 }, () => ({ pressed: false, value: 0 }));
      const pad = {
        id: "SillyMaker Synthetic Pad",
        index: 0,
        connected: true,
        mapping: "standard",
        timestamp: 0,
        axes: [0, 0, 0, 0],
        buttons,
      };
      Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: () => [pad],
      });
      (window as unknown as Record<string, unknown>).sillymakerSetPadButton = (
        index: number,
        pressed: boolean,
      ) => {
        buttons[index] = { pressed, value: pressed ? 1 : 0 };
      };
    });
    await gotoLabV1(page);

    await page.getByRole("button", { name: "开始校准" }).click();
    await expect(page.locator("[data-lab-interaction='say']")).toBeVisible();

    const pressPad = async (index: number): Promise<void> => {
      await page.evaluate((buttonIndex) => {
        const set = (window as unknown as Record<string, unknown>).sillymakerSetPadButton as (
          index: number,
          pressed: boolean,
        ) => void;
        set(buttonIndex, true);
      }, index);
      // Release after the loop has observed the edge.
      await page.waitForTimeout(80);
      await page.evaluate((buttonIndex) => {
        const set = (window as unknown as Record<string, unknown>).sillymakerSetPadButton as (
          index: number,
          pressed: boolean,
        ) => void;
        set(buttonIndex, false);
      }, index);
    };

    // Wait for the natural reveal, then button A advances the say — the
    // same semantic resolution as Enter or clicking 继续. (The two-step
    // and player-control toggles are covered deterministically by the
    // keyboard and jsdom suites; the router is device-agnostic, so the
    // unique gamepad claim is the poll loop's rising edge itself.)
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await pressPad(0);
    await expect(page.getByText("样本读数稳定，可以开始校准。")).toBeVisible();
    await expect(page.locator("[data-lab-say-reveal='complete']")).toBeAttached();
    await pressPad(0);
    await expect(page.locator("[data-lab-interaction='choice']")).toBeVisible();

    // Holding or re-pressing at the choice forms no stray intent.
    await pressPad(0);
    await expect(page.locator("[data-lab-interaction='choice']")).toBeVisible();
  });
});
