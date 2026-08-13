// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, gotoLabV1, test } from "./fixtures.ts";

const motionFileV1 = fileURLToPath(
  new URL("../../../../../e2e/src/motions/char-enter.motion.json", import.meta.url),
);

test.describe("engine motion workbench (M3)", () => {
  test("edits a motion draft, saves through CAS, and the file changes on disk", async ({ page }) => {
    const originalBytes = readFileSync(motionFileV1, "utf8");
    try {
      await gotoLabV1(page, "?capability=debug_tools");

      // Open the Workbench window from the named preview case.
      await page.getByRole("button", { name: "开发工具" }).click();
      await page.getByRole("navigation", { name: "开发工具" })
        .getByRole("button", { name: "Motion 工坊" })
        .click();
      const dock = page.getByRole("dialog", { name: "Motion 工坊" });
      await dock.locator('[data-motion-workbench-case="case.e2e.char-enter"]').click();
      await expect(dock.locator("[data-motion-workbench]")).toBeVisible();

      // The dev port read must land before saves are possible; a fresh
      // draft is clean, so save starts disabled.
      const save = dock.locator("[data-workbench-save]");
      await expect(save).toBeDisabled();
      await expect(dock.locator("[data-workbench-status]")).toHaveText("与已保存一致");

      // Scrub the canvas: at t=0 the entering character holds its first
      // keyframes; the ghost start pose is always visible.
      await expect(dock.locator("[data-workbench-ghost]")).toBeAttached();

      // Edit duration and one keyframe value (the classic tuning loop).
      const duration = dock.locator("[data-workbench-duration]");
      await duration.fill("470");
      const firstValue = dock
        .locator('[data-workbench-keyframe="offsetY:0"] [data-workbench-kf-value]');
      await firstValue.fill("200");

      // A/B against saved, then back to draft.
      await dock.locator('[data-workbench-ab="saved"]').click();
      await dock.locator('[data-workbench-ab="draft"]').click();

      // Save commits through the CAS port.
      await expect(save).toBeEnabled();
      await save.click();
      await expect(dock.locator('[data-workbench-status="saved"]')).toBeVisible();

      // The Story source file changed on disk — and only this file.
      const savedBytes = readFileSync(motionFileV1, "utf8");
      const savedJson = JSON.parse(savedBytes) as {
        durationMs: number;
        tracks: readonly { channel: string; keyframes: readonly { value: number }[] }[];
      };
      expect(savedJson.durationMs).toBe(470);
      const offsetTrack = savedJson.tracks.find((track) => track.channel === "offsetY");
      expect(offsetTrack?.keyframes[0]?.value).toBe(200);
    } finally {
      writeFileSync(motionFileV1, originalBytes);
    }
  });
});
