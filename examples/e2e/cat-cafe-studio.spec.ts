// SPDX-License-Identifier: MIT
// SillyMaker Studio (VN Scene Workspace A2): the dev-only scene workspace on
// the Cat Cafe dev server. Opening a named scene needs no story progress; an
// inspector edit saves through the CAS scene port and only the scene JSON
// changes on disk.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

import { catcafeTargetUrlV1, expect, test } from "./fixtures.ts";

const sceneFileV1 = fileURLToPath(
  new URL("../cat-cafe/src/scenes/opening/opening.scene.json", import.meta.url),
);

type LoadSettlementV1 =
  | { readonly kind: "loaded" }
  | { readonly kind: "failed"; readonly error: unknown };

interface CleanupFailureV1 {
  readonly error: unknown;
}

function settleNextLoadV1(page: Page): Promise<LoadSettlementV1> {
  return page.waitForEvent("load").then(
    () => Object.freeze({ kind: "loaded" as const }),
    (error: unknown) => Object.freeze({ kind: "failed" as const, error }),
  );
}

async function restoreSceneAfterReloadV1(
  page: Page,
  originalBytes: string,
  saveReload: Promise<LoadSettlementV1> | null,
): Promise<CleanupFailureV1 | null> {
  try {
    if (readFileSync(sceneFileV1, "utf8") === originalBytes) return null;
    const saveSettlement = saveReload === null ? null : await saveReload;
    const restoreReload = page.isClosed() ? null : settleNextLoadV1(page);
    writeFileSync(sceneFileV1, originalBytes);
    if (restoreReload !== null) {
      const restoreSettlement = await restoreReload;
      if (restoreSettlement.kind === "failed") {
        return Object.freeze({ error: restoreSettlement.error });
      }
      await expect(page.locator("[data-studio-canvas]")).toBeVisible();
    }
    return saveSettlement?.kind === "failed"
      ? Object.freeze({ error: saveSettlement.error })
      : null;
  } catch (error) {
    return Object.freeze({ error });
  }
}

test.describe("cat-cafe studio (A2)", () => {
  test("opens the opening scene, edits x through the inspector, and saves via CAS", async ({ page }) => {
    const originalBytes = readFileSync(sceneFileV1, "utf8");
    let saveReload: Promise<LoadSettlementV1> | null = null;
    let cleanupFailure: CleanupFailureV1 | null = null;
    try {
      await page.goto(catcafeTargetUrlV1("__sillymaker/studio/"));

      // The navigator lists the scene by label and auto-opens the first one.
      const sceneButton = page.getByRole("button", { name: "雨后的咖啡店门口" });
      await expect(sceneButton).toBeVisible();
      await expect(sceneButton).toHaveAttribute("aria-pressed", "true");

      // The canvas renders through the real Story renderers without playing
      // to the scene, and the binding's asset registry loads the real art:
      // the shopfront background and the kitten pose are actual images.
      const canvas = page.locator("[data-studio-canvas]");
      await expect(canvas.locator('[data-stage-key="layer.catcafe.characters:tag.xiaoyu"]'))
        .toBeVisible();
      await expect(canvas.locator("img[data-cc-surface='shopfront']")).toBeVisible();
      await expect(canvas.locator("[data-cc-cat='kitten'] img")).toBeVisible();

      // Select the cat and nudge it left through the inspector.
      await page.getByLabel("条目").selectOption("tag.xiaoyu");
      const xInput = page.getByLabel("x", { exact: true });
      await expect(xInput).toHaveValue("920");
      const save = page.getByRole("button", { name: "保存" });
      await expect(save).toBeDisabled();
      await xInput.fill("880");
      await expect(save).toBeEnabled();
      saveReload = settleNextLoadV1(page);
      await save.click();
      await expect(page.getByRole("status")).toContainText("已保存");

      // The scene document is the only thing that changed on disk.
      const savedJson = JSON.parse(readFileSync(sceneFileV1, "utf8")) as {
        entries: readonly { tag: string; placement?: { x: number } }[];
      };
      const xiaoyu = savedJson.entries.find((entry) => entry.tag === "tag.xiaoyu");
      expect(xiaoyu?.placement?.x).toBe(880);
      const saveSettlement = await saveReload;
      if (saveSettlement.kind === "failed") throw saveSettlement.error;
    } finally {
      cleanupFailure = await restoreSceneAfterReloadV1(page, originalBytes, saveReload);
    }
    if (cleanupFailure !== null) throw cleanupFailure.error;
  });

  test("drags the cat on the canvas and saves the new placement (A3)", async ({ page }) => {
    const originalBytes = readFileSync(sceneFileV1, "utf8");
    let saveReload: Promise<LoadSettlementV1> | null = null;
    let cleanupFailure: CleanupFailureV1 | null = null;
    try {
      await page.goto(catcafeTargetUrlV1("__sillymaker/studio/"));

      const selectBox = page.locator('[data-studio-select="tag.xiaoyu"]');
      await expect(selectBox).toBeVisible();
      const box = await selectBox.boundingBox();
      if (box === null) throw new Error("selection box has no bounds");

      // Drag 45 CSS px left: preview scale is 720/1280 = 0.5625, so the
      // placement moves exactly 80 logical px (920 → 840) with no snap.
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 45, startY, { steps: 5 });
      await page.mouse.up();

      await expect(page.getByLabel("x", { exact: true })).toHaveValue("840");
      const save = page.getByRole("button", { name: "保存" });
      await expect(save).toBeEnabled();
      saveReload = settleNextLoadV1(page);
      await save.click();
      await expect(page.getByRole("status")).toContainText("已保存");

      const savedJson = JSON.parse(readFileSync(sceneFileV1, "utf8")) as {
        entries: readonly { tag: string; placement?: { x: number } }[];
      };
      const xiaoyu = savedJson.entries.find((entry) => entry.tag === "tag.xiaoyu");
      expect(xiaoyu?.placement?.x).toBe(840);
      const saveSettlement = await saveReload;
      if (saveSettlement.kind === "failed") throw saveSettlement.error;
    } finally {
      cleanupFailure = await restoreSceneAfterReloadV1(page, originalBytes, saveReload);
    }
    if (cleanupFailure !== null) throw cleanupFailure.error;
  });

  test("lists cue bindings and replays the scene up to a chosen cue", async ({ page }) => {
    await page.goto(catcafeTargetUrlV1("__sillymaker/studio/"));
    const canvas = page.locator("[data-studio-canvas]");
    await expect(canvas.locator('[data-stage-key="layer.catcafe.characters:tag.xiaoyu"]'))
      .toBeVisible();

    // The kitten-enters cue carries its motion binding in the cue table.
    const kittenRow = page.locator('[data-studio-cue="cue.catcafe.opening.kitten-enters"]');
    await expect(kittenRow.getByRole("combobox")).toHaveValue("motion.catcafe.cat-entrance");

    // Replaying only through the backdrop cue removes the cat from the canvas.
    await page
      .locator('[data-studio-cue="cue.catcafe.opening.shopfront"]')
      .getByRole("button", { name: "到此为止" })
      .click();
    await expect(canvas.locator('[data-stage-key="layer.catcafe.characters:tag.xiaoyu"]'))
      .toHaveCount(0);
    await expect(canvas.locator('[data-stage-key="layer.catcafe.background:tag.background"]'))
      .toBeVisible();

    // The embedded Motion Workbench lists the cue-derived preview case.
    await page.getByRole("button", { name: "Motion 工坊", exact: true }).click();
    await expect(page.locator("[data-motion-workbench-launcher]")).toBeAttached();
    await expect(
      page.locator('[data-motion-workbench-case="cue.catcafe.opening.kitten-enters"]'),
    ).toBeVisible();
  });
});
