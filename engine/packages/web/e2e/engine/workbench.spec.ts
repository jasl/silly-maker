// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, gotoLabV1, test } from "./fixtures.ts";

const motionFileV1 = fileURLToPath(
  new URL("../../../../../e2e/src/motions/char-enter.motion.json", import.meta.url),
);

test.describe("embedded Motion workspace (AR3)", () => {
  test("@dev-source-io edits a motion draft, saves through CAS, and the file changes on disk", async ({ page }) => {
    const originalBytes = readFileSync(motionFileV1, "utf8");
    let cleanupFailure: { readonly error: unknown } | null = null;
    let pageLoads = 0;
    try {
      await gotoLabV1(page);
      page.on("load", () => {
        pageLoads += 1;
      });
      const gameHost = page.getByTestId("overlay-host");
      const predecessorGameEpoch = await gameHost.getAttribute(
        "data-overlay-application-epoch",
      );
      expect(predecessorGameEpoch).not.toBeNull();

      // The maintained writable entry is the sibling Authoring Host, not a
      // Game-root DevDock panel. The real scene cue supplies its preview case.
      await page.locator('[data-embedded-authoring-activate="true"]').click();
      const panel = page.locator('[data-embedded-authoring-panel="true"]');
      const host = page.locator('[data-authoring-host-mode="embedded"]');
      await expect(panel).toBeVisible();
      await expect(host).toHaveAttribute("data-authoring-host-ready", "connected");
      const hostIdentity = await host.getAttribute("data-authoring-host");
      expect(hostIdentity).not.toBeNull();
      await host.evaluate((element) => element.setAttribute("data-ar3-motion-host", "stable"));

      await host.getByRole("button", { name: "Motion 工坊", exact: true }).click();
      const workbench = host.locator('[data-studio-workspace-panel="motion"]');
      await workbench.locator('[data-motion-workbench-case="cue.e2e.alpha-enters"]').click();
      await expect(workbench.locator("[data-motion-workbench]")).toBeVisible();

      // The dev port read must land before saves are possible; a fresh
      // draft is clean, so save starts disabled.
      const save = workbench.locator("[data-workbench-save]");
      await expect(save).toBeDisabled();
      await expect(workbench.locator("[data-workbench-status]")).toHaveText("与已保存一致");

      // Scrub the canvas: at t=0 the entering character holds its first
      // keyframes; the ghost start pose is always visible.
      await expect(workbench.locator("[data-workbench-ghost]")).toBeAttached();

      // Edit duration and one keyframe value (the classic tuning loop).
      const duration = workbench.locator("[data-workbench-duration]");
      await duration.fill("470");
      const firstValue = workbench
        .locator('[data-workbench-keyframe="offsetY:0"] [data-workbench-kf-value]');
      await firstValue.fill("200");

      // A hidden Motion draft remains in the Host close gate and returns
      // unchanged after canceling the close.
      await host.getByRole("button", { name: "Scene Construction", exact: true }).click();
      await expect(host.getByRole("button", { name: /Motion 工坊/ })).toContainText("未保存");
      await page.locator("[data-embedded-authoring-close]").click();
      const closeConfirm = page.locator("[data-embedded-authoring-close-confirm]");
      await expect(closeConfirm).toBeVisible();
      await closeConfirm.getByRole("button", { name: "取消" }).click();
      await host.getByRole("button", { name: /Motion 工坊/ }).click();
      await expect(duration).toHaveValue("470");
      await expect(firstValue).toHaveValue("200");

      // A/B against saved, then back to draft.
      await workbench.locator('[data-workbench-ab="saved"]').click();
      await workbench.locator('[data-workbench-ab="draft"]').click();

      // Save commits through the CAS port.
      await expect(save).toBeEnabled();
      await save.click();

      // The Story source file changed on disk — and only this file.
      await expect.poll(() => readFileSync(motionFileV1, "utf8")).not.toBe(originalBytes);
      const savedBytes = readFileSync(motionFileV1, "utf8");
      const savedJson = JSON.parse(savedBytes) as {
        durationMs: number;
        tracks: readonly { channel: string; keyframes: readonly { value: number }[] }[];
      };
      expect(savedJson.durationMs).toBe(470);
      const offsetTrack = savedJson.tracks.find((track) => track.channel === "offsetY");
      expect(offsetTrack?.keyframes[0]?.value).toBe(200);
      await expect(gameHost).not.toHaveAttribute(
        "data-overlay-application-epoch",
        predecessorGameEpoch!,
      );
      await expect(page.locator('[data-ar3-motion-host="stable"]')).toHaveCount(1);
      await expect(host).toHaveAttribute("data-authoring-host", hostIdentity!);
      expect(pageLoads).toBe(0);
    } finally {
      try {
        if (readFileSync(motionFileV1, "utf8") !== originalBytes) {
          const restoreGameHost = page.getByTestId("overlay-host");
          const restoreEpoch = page.isClosed()
            ? null
            : await restoreGameHost.getAttribute("data-overlay-application-epoch");
          writeFileSync(motionFileV1, originalBytes);
          if (restoreEpoch !== null) {
            await expect(restoreGameHost).not.toHaveAttribute(
              "data-overlay-application-epoch",
              restoreEpoch,
            );
            await expect(page.locator('[data-ar3-motion-host="stable"]')).toHaveCount(1);
            expect(pageLoads).toBe(0);
          }
        }
        expect(readFileSync(motionFileV1, "utf8")).toBe(originalBytes);
      } catch (error) {
        cleanupFailure ??= Object.freeze({ error });
      }
    }
    if (cleanupFailure !== null) throw cleanupFailure.error;
  });
});
