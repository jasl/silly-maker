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
const studioBindingFileV1 = fileURLToPath(
  new URL("../cat-cafe/src/tooling/studio-binding.tsx", import.meta.url),
);
const studioRendererDeclarationV1 = "  renderers: createCatcafeStageRenderersV1(registryV1),";
const failingStudioRendererDeclarationV1 = [
  "  get renderers() {",
  '    throw new Error("studio.hmr.bad_binding");',
  "  },",
].join("\n");

type LoadSettlementV1 =
  | { readonly kind: "loaded" }
  | { readonly kind: "failed"; readonly error: unknown };

interface CleanupFailureV1 {
  readonly error: unknown;
}

type StudioHmrSettlementV1 =
  | { readonly kind: "replaced" }
  | { readonly kind: "failed"; readonly error: unknown };

interface ArmedStudioHmrSettlementV1 {
  readonly settlement: Promise<StudioHmrSettlementV1>;
}

function replaceExactlyOnceV1(source: string, before: string, after: string): string {
  const index = source.indexOf(before);
  if (index < 0 || source.indexOf(before, index + before.length) >= 0) {
    throw new Error("Studio HMR fixture source must contain exactly one renderer declaration");
  }
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
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

async function restoreStudioBindingAfterHmrV1(
  page: Page,
  originalBytes: string,
): Promise<CleanupFailureV1 | null> {
  let cleanupFailure: CleanupFailureV1 | null = null;
  let sourceNeedsRestore = true;
  try {
    sourceNeedsRestore = readFileSync(studioBindingFileV1, "utf8") !== originalBytes;
  } catch (error) {
    cleanupFailure = Object.freeze({ error });
  }
  if (!sourceNeedsRestore) return cleanupFailure;
  let armed: ArmedStudioHmrSettlementV1 | null = null;
  if (!page.isClosed()) {
    try {
      const current = page.locator(
        '#sillymaker-studio-root > [data-sillymaker-studio-epoch="current"]',
      );
      await expect(current).toHaveCount(1);
      await current.evaluate((element) => {
        element.setAttribute("data-studio-hmr-cleanup", "pending");
      });
      const settlement = page.locator('[data-studio-hmr-cleanup="pending"]')
        .waitFor({ state: "detached" })
        .then(
          () => Object.freeze({ kind: "replaced" as const }),
          (error: unknown) => Object.freeze({ kind: "failed" as const, error }),
        );
      armed = Object.freeze({ settlement });
    } catch (error) {
      cleanupFailure = Object.freeze({ error });
    }
  }
  try {
    writeFileSync(studioBindingFileV1, originalBytes);
  } catch (error) {
    cleanupFailure ??= Object.freeze({ error });
    return cleanupFailure;
  }
  if (armed !== null) {
    const settlement = await armed.settlement;
    if (settlement.kind === "failed") {
      cleanupFailure ??= Object.freeze({ error: settlement.error });
    }
  }
  return cleanupFailure;
}

test.describe("cat-cafe studio (A2)", () => {
  test("publishes binding HMR atomically while preserving the dirty scene session", async ({ page, pageDiagnostics }) => {
    const originalBytes = readFileSync(studioBindingFileV1, "utf8");
    const failingBytes = replaceExactlyOnceV1(
      originalBytes,
      studioRendererDeclarationV1,
      failingStudioRendererDeclarationV1,
    );
    let cleanupFailure: CleanupFailureV1 | null = null;
    try {
      await page.goto(catcafeTargetUrlV1("__sillymaker/studio/"));
      await page.getByLabel("条目").selectOption("tag.xiaoyu");
      const xInput = page.getByLabel("x", { exact: true });
      await expect(xInput).toHaveValue("920");
      await xInput.fill("880");
      await expect(page.getByRole("button", { name: "保存" })).toBeEnabled();

      const predecessor = page.locator(
        '#sillymaker-studio-root > [data-sillymaker-studio-epoch="current"]',
      );
      await expect(predecessor).toHaveCount(1);
      await predecessor.evaluate((element) => {
        element.setAttribute("data-studio-hmr-predecessor", "true");
      });

      const expectedFailure = page.waitForEvent("console", {
        predicate: (message) =>
          message.type() === "error" &&
          message.text().includes("SillyMaker Studio live composition failed") &&
          message.text().includes("studio.hmr.bad_binding"),
      }).then(
        (message) => Object.freeze({ kind: "reported" as const, message }),
        (error: unknown) => Object.freeze({ kind: "failed" as const, error }),
      );
      writeFileSync(studioBindingFileV1, failingBytes);
      const failureSettlement = await expectedFailure;
      if (failureSettlement.kind === "failed") throw failureSettlement.error;
      pageDiagnostics.consumeExpectedConsoleError(failureSettlement.message.text());

      // The failed candidate never touches the exact visible epoch or the
      // shared unsaved draft owned outside either React root.
      await expect(page.locator('[data-studio-hmr-predecessor="true"]')).toHaveCount(1);
      await expect(xInput).toHaveValue("880");
      await expect(page.getByRole("button", { name: "保存" })).toBeEnabled();
    } finally {
      cleanupFailure = await restoreStudioBindingAfterHmrV1(page, originalBytes);
    }
    if (cleanupFailure !== null) throw cleanupFailure.error;

    await expect(page.locator('[data-studio-hmr-predecessor="true"]')).toHaveCount(0);
    await expect(page.locator(
      '#sillymaker-studio-root > [data-sillymaker-studio-epoch="current"]',
    )).toHaveCount(1);

    // The successor remounts transient UI state, but the one shared scene
    // session still owns the dirty draft.
    await page.getByLabel("条目").selectOption("tag.xiaoyu");
    await expect(page.getByLabel("x", { exact: true })).toHaveValue("880");
    await expect(page.getByRole("button", { name: "保存" })).toBeEnabled();
  });

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
    await expect(page.locator("[data-motion-workbench-launcher]")).toBeAttached();
    await expect(
      page.locator('[data-motion-workbench-case="cue.catcafe.opening.kitten-enters"]'),
    ).toBeVisible();
  });
});
