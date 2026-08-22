// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

const conformanceQueryV1 = "?overlay_conformance=1";
const sceneFileV1 = fileURLToPath(
  new URL("../../../../../e2e/src/scenes/procedure/procedure.scene.json", import.meta.url),
);
const studioBindingFileV1 = fileURLToPath(
  new URL("../../../../../e2e/src/tooling/studio-binding.tsx", import.meta.url),
);
const presentationFileV1 = fileURLToPath(
  new URL("../../../../../e2e/src/presentation.ts", import.meta.url),
);
const researcherLabelV1 = 'label: "研究员甲",';
const candidateResearcherLabelV1 = 'label: "研究员甲 R1",';
const researcherAccessibleNameV1 = 'accessibleName: "研究员甲",';
const candidateResearcherAccessibleNameV1 = 'accessibleName: "研究员甲 R2",';

interface SceneEntryOnDiskV1 {
  readonly tag: string;
  readonly placement?: { readonly x: number };
}

interface SceneDocumentOnDiskV1 {
  readonly entries: readonly SceneEntryOnDiskV1[];
}

function alphaXV1(source: string): number {
  const document = JSON.parse(source) as SceneDocumentOnDiskV1;
  const x = document.entries.find((entry) => entry.tag === "tag.e2e.alpha")?.placement?.x;
  if (x === undefined) throw new Error("Engine Lab procedure scene must place tag.e2e.alpha");
  return x;
}

function replaceExactlyOnceV1(source: string, current: string, replacement: string): string {
  const first = source.indexOf(current);
  if (first === -1 || first !== source.lastIndexOf(current)) {
    throw new Error(`Expected exactly one source marker: ${current}`);
  }
  return source.replace(current, replacement);
}

async function openEmbeddedAuthoringV1(page: Page): Promise<{
  readonly host: Locator;
  readonly panel: Locator;
}> {
  await page.locator('[data-embedded-authoring-activate="true"]').click();
  const panel = page.locator('[data-embedded-authoring-panel="true"]');
  const host = page.locator('[data-authoring-host-mode="embedded"]');
  await expect(panel).toBeVisible();
  await expect(host).toHaveAttribute("data-authoring-host-ready", "connected");
  await expect(host).toHaveAttribute("data-native-text", "true");
  await expect(page.getByRole("button", { name: "储藏室实验流程" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  return Object.freeze({ host, panel });
}

test.describe("Engine Lab embedded Authoring Host (AR3)", () => {
  test("@dev-source-io preserves draft, history, selection, and input ownership across a Game/Session successor", async ({ page }) => {
    const sourceX = alphaXV1(readFileSync(sceneFileV1, "utf8"));
    await gotoLabV1(page, conformanceQueryV1);

    // Enter a keyboard-sensitive gameplay boundary before opening the sibling
    // Authoring Host. KeyA would toggle Auto if the focused numeric editor
    // leaked into the gameplay keyboard adapter.
    await page.getByRole("button", { name: "开始校准" }).click();
    const auto = page.getByRole("button", { name: "自动" });
    await expect(auto).toHaveAttribute("aria-pressed", "false");

    const homeOpener = page.getByRole("button", { name: "打开观测台" });
    await homeOpener.click();
    const homeOverlay = page.getByRole("dialog", { name: "观测台" });
    await expect(homeOverlay).toBeVisible();

    const { host, panel } = await openEmbeddedAuthoringV1(page);
    const hostIdentity = await host.getAttribute("data-authoring-host");
    expect(hostIdentity).not.toBeNull();
    await host.evaluate((element) => element.setAttribute("data-ar3-host", "predecessor"));

    // Blank authoring chrome owns secondary pointer and wheel input too. A
    // leaked right-click would route the Game's system cancel and dismiss the
    // sibling Workspace Overlay underneath the panel.
    await panel.getByText("与独立 Studio 共享实现").click({ button: "right" });
    await expect(homeOverlay).toBeVisible();
    await page.locator('[data-embedded-authoring-close="true"]').click();
    await expect(panel).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(homeOverlay).toHaveCount(0);
    await page.locator('[data-embedded-authoring-open="true"]').click();
    await expect(panel).toBeVisible();

    const entry = host.locator('[data-studio-entry-select="true"]');
    await entry.selectOption("tag.e2e.alpha");
    const inspector = host.locator('[data-studio-entry-inspector="tag.e2e.alpha"]');
    const xInput = inspector.getByLabel("x", { exact: true });
    const editedX = sourceX + 37;
    await expect(xInput).toHaveValue(String(sourceX));
    await xInput.fill(String(editedX));
    const sceneUndo = host.locator('[data-studio-undo="true"]');
    const sceneRedo = host.locator('[data-studio-redo="true"]');
    const sceneSave = host.locator('[data-studio-save="true"]');
    await expect(sceneSave).toBeEnabled();
    await sceneUndo.click();
    await expect(xInput).toHaveValue(String(sourceX));
    await expect(entry).toHaveValue("tag.e2e.alpha");
    await sceneRedo.click();
    await expect(xInput).toHaveValue(String(editedX));

    // Cancel keeps the exact visible Host and dirty draft. Discard then
    // restores the source-backed draft without destroying the embedded shell.
    await page.locator('[data-embedded-authoring-close="true"]').click();
    const closeConfirm = page.getByRole("alertdialog", { name: "关闭未保存的创作" });
    await expect(closeConfirm).toBeVisible();
    await closeConfirm.getByRole("button", { name: "取消" }).click();
    await expect(panel).toBeVisible();
    await expect(xInput).toHaveValue(String(editedX));
    await expect(entry).toHaveValue("tag.e2e.alpha");
    await expect(page.locator('[data-ar3-host="predecessor"]')).toHaveCount(1);

    await page.locator('[data-embedded-authoring-close="true"]').click();
    await closeConfirm.getByRole("button", { name: "放弃并关闭" }).click();
    await expect(panel).toBeHidden();
    await page.locator('[data-embedded-authoring-open="true"]').click();
    await expect(panel).toBeVisible();
    await expect(entry).toHaveValue("tag.e2e.alpha");
    await expect(xInput).toHaveValue(String(sourceX));

    // Keep one dirty, selected editor alive while the sibling Game/Session is
    // replaced through its real conformance launcher.
    const successorDraftX = sourceX + 41;
    await xInput.fill(String(successorDraftX));
    await xInput.evaluate((element) => element.setAttribute("data-ar3-input", "stable"));
    await xInput.focus();
    await expect(xInput).toBeFocused();
    await page.keyboard.press("KeyA");
    await expect(auto).toHaveAttribute("aria-pressed", "false");
    await expect(xInput).toHaveValue(String(successorDraftX));

    const gameHost = page.getByTestId("overlay-host");
    const predecessorGameEpoch = await gameHost.getAttribute("data-overlay-application-epoch");
    expect(predecessorGameEpoch).not.toBeNull();
    // The author panel intentionally covers the application. Programmatic
    // activation models the sibling lifecycle request without bypassing the
    // application's own restart callback.
    await page.getByRole("button", { name: "重置观测会话" }).evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    await expect(gameHost).not.toHaveAttribute(
      "data-overlay-application-epoch",
      predecessorGameEpoch!,
    );

    await expect(page.locator('[data-ar3-host="predecessor"]')).toHaveCount(1);
    await expect(host).toHaveAttribute("data-authoring-host", hostIdentity!);
    await expect(host).toHaveAttribute("data-authoring-host-ready", "connected");
    await expect(host.locator('[data-ar3-input="stable"]')).toHaveValue(String(successorDraftX));
    await expect(entry).toHaveValue("tag.e2e.alpha");
    await expect(sceneUndo).toBeEnabled();
    await expect(xInput).toBeFocused();
    // Restart returns the Game to its initial phase, where Auto is absent.
    // Re-enter calibration through the Game's own semantic control, then
    // return focus to the retained input to verify post-successor routing.
    await page.getByRole("button", { name: "开始校准" }).evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    await xInput.focus();
    await expect(xInput).toBeFocused();
    await expect(auto).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("KeyA");
    await expect(auto).toHaveAttribute("aria-pressed", "false");
    await expect(xInput).toHaveValue(String(successorDraftX));
    await sceneUndo.click();
    await expect(xInput).toHaveValue(String(sourceX));

    // Leave no dirty beforeunload guard behind for fixture teardown.
    await page.locator('[data-embedded-authoring-close="true"]').click();
    await expect(panel).toBeHidden();
  });

  test("@dev-source-io saves from the dirty-close gate through scene CAS and restores the source", async ({ page }) => {
    const originalBytes = readFileSync(sceneFileV1, "utf8");
    const sourceX = alphaXV1(originalBytes);
    const savedX = sourceX + 53;
    let cleanupError: unknown = null;
    let pageLoads = 0;
    let expectedHostIdentity: string | null = null;
    try {
      await gotoLabV1(page, conformanceQueryV1);
      const { host, panel } = await openEmbeddedAuthoringV1(page);
      const gameHost = page.getByTestId("overlay-host");
      const predecessorGameEpoch = await gameHost.getAttribute("data-overlay-application-epoch");
      expect(predecessorGameEpoch).not.toBeNull();
      await host.locator('[data-studio-entry-select="true"]').selectOption("tag.e2e.alpha");
      const xInput = host
        .locator('[data-studio-entry-inspector="tag.e2e.alpha"]')
        .getByLabel("x", { exact: true });
      await xInput.fill(String(savedX));
      const hostIdentity = await host.getAttribute("data-authoring-host");
      expect(hostIdentity).not.toBeNull();
      expectedHostIdentity = hostIdentity;
      await host.evaluate((element) => element.setAttribute("data-ar3-save-host", "predecessor"));
      page.on("load", () => {
        pageLoads += 1;
      });

      await page.locator('[data-embedded-authoring-close="true"]').click();
      const closeConfirm = page.getByRole("alertdialog", { name: "关闭未保存的创作" });
      await expect(closeConfirm).toBeVisible();
      await closeConfirm.getByRole("button", { name: "保存并关闭" }).click();

      await expect.poll(() => alphaXV1(readFileSync(sceneFileV1, "utf8"))).toBe(savedX);
      await expect(gameHost).not.toHaveAttribute(
        "data-overlay-application-epoch",
        predecessorGameEpoch!,
      );
      await expect(panel).toBeHidden();
      expect(pageLoads).toBe(0);
      await expect(page.locator('[data-ar3-save-host="predecessor"]')).toHaveCount(1);
      await expect(host).toHaveAttribute("data-authoring-host", hostIdentity!);
      await page.locator('[data-embedded-authoring-open="true"]').click();
      await expect(panel).toBeVisible();
      await expect(host.locator('[data-studio-entry-select="true"]')).toHaveValue(
        "tag.e2e.alpha",
      );
      await expect(xInput).toHaveValue(String(savedX));
    } finally {
      try {
        if (readFileSync(sceneFileV1, "utf8") !== originalBytes) {
          const restoreGameHost = page.getByTestId("overlay-host");
          const restoreEpoch = page.isClosed()
            ? null
            : await restoreGameHost.getAttribute("data-overlay-application-epoch");
          writeFileSync(sceneFileV1, originalBytes);
          if (restoreEpoch !== null) {
            await expect(restoreGameHost).not.toHaveAttribute(
              "data-overlay-application-epoch",
              restoreEpoch,
            );
            expect(pageLoads).toBe(0);
            if (expectedHostIdentity !== null) {
              await expect(page.locator('[data-ar3-save-host="predecessor"]')).toHaveCount(1);
              await expect(page.locator('[data-authoring-host-mode="embedded"]')).toHaveAttribute(
                "data-authoring-host",
                expectedHostIdentity,
              );
            }
          }
        }
        expect(readFileSync(sceneFileV1, "utf8")).toBe(originalBytes);
      } catch (error) {
        cleanupError = error;
      }
    }
    if (cleanupError !== null) throw cleanupError;
  });

  test("@dev-source-io stages a physical Studio binding R1 candidate without replacing the dirty Host", async ({ page }) => {
    const originalBytes = readFileSync(studioBindingFileV1, "utf8");
    const candidateBytes = replaceExactlyOnceV1(
      originalBytes,
      researcherLabelV1,
      candidateResearcherLabelV1,
    );
    const sourceX = alphaXV1(readFileSync(sceneFileV1, "utf8"));
    let cleanupError: unknown = null;
    let pageLoads = 0;
    try {
      await gotoLabV1(page);
      const { host, panel } = await openEmbeddedAuthoringV1(page);
      const hostIdentity = await host.getAttribute("data-authoring-host");
      expect(hostIdentity).not.toBeNull();
      await host.evaluate((element) => element.setAttribute("data-ar3-r1-host", "predecessor"));
      const entry = host.locator('[data-studio-entry-select="true"]');
      await entry.selectOption("tag.e2e.alpha");
      const xInput = host
        .locator('[data-studio-entry-inspector="tag.e2e.alpha"]')
        .getByLabel("x", { exact: true });
      const editedX = sourceX + 61;
      await xInput.fill(String(editedX));
      await xInput.evaluate((element) => element.setAttribute("data-ar3-r1-input", "stable"));
      const undo = host.locator('[data-studio-undo="true"]');
      await expect(undo).toBeEnabled();
      page.on("load", () => {
        pageLoads += 1;
      });

      writeFileSync(studioBindingFileV1, candidateBytes);
      await expect(host.getByText("研究员甲 R1", { exact: true })).toBeVisible();
      expect(pageLoads).toBe(0);
      await expect(page.locator('[data-ar3-r1-host="predecessor"]')).toHaveCount(1);
      await expect(host).toHaveAttribute("data-authoring-host", hostIdentity!);
      await expect(host.locator('[data-ar3-r1-input="stable"]')).toHaveValue(String(editedX));
      await expect(entry).toHaveValue("tag.e2e.alpha");
      await expect(undo).toBeEnabled();

      writeFileSync(studioBindingFileV1, originalBytes);
      await expect(host.getByText("研究员甲 R1", { exact: true })).toHaveCount(0);
      await expect(host.getByText("研究员甲", { exact: true })).toBeVisible();
      expect(pageLoads).toBe(0);
      await expect(page.locator('[data-ar3-r1-host="predecessor"]')).toHaveCount(1);
      await expect(host).toHaveAttribute("data-authoring-host", hostIdentity!);
      await expect(xInput).toHaveValue(String(editedX));
      await expect(entry).toHaveValue("tag.e2e.alpha");
      await undo.click();
      await expect(xInput).toHaveValue(String(sourceX));
      await page.locator('[data-embedded-authoring-close="true"]').click();
      await expect(panel).toBeHidden();
    } finally {
      try {
        if (readFileSync(studioBindingFileV1, "utf8") !== originalBytes) {
          writeFileSync(studioBindingFileV1, originalBytes);
          if (!page.isClosed()) {
            const host = page.locator('[data-authoring-host-mode="embedded"]');
            if (await host.count() > 0) {
              await expect(host.getByText("研究员甲 R1", { exact: true })).toHaveCount(0);
              await expect(host.getByText("研究员甲", { exact: true })).toBeVisible();
            }
          }
        }
        expect(readFileSync(studioBindingFileV1, "utf8")).toBe(originalBytes);
      } catch (error) {
        cleanupError = error;
      }
    }
    if (cleanupError !== null) throw cleanupError;
  });

  test("@dev-source-io splits one shared presentation change into Game R2 and Authoring binding R1", async ({ page }) => {
    const originalBytes = readFileSync(presentationFileV1, "utf8");
    const candidateBytes = replaceExactlyOnceV1(
      originalBytes,
      researcherAccessibleNameV1,
      candidateResearcherAccessibleNameV1,
    );
    const sourceX = alphaXV1(readFileSync(sceneFileV1, "utf8"));
    let cleanupError: unknown = null;
    let pageLoads = 0;
    try {
      await gotoLabV1(page);
      const { host, panel } = await openEmbeddedAuthoringV1(page);
      const hostIdentity = await host.getAttribute("data-authoring-host");
      expect(hostIdentity).not.toBeNull();
      await host.evaluate((element) => element.setAttribute("data-ar3-shared-host", "stable"));
      const entry = host.locator('[data-studio-entry-select="true"]');
      await entry.selectOption("tag.e2e.alpha");
      const xInput = host
        .locator('[data-studio-entry-inspector="tag.e2e.alpha"]')
        .getByLabel("x", { exact: true });
      const editedX = sourceX + 71;
      await xInput.fill(String(editedX));
      const undo = host.locator('[data-studio-undo="true"]');
      await expect(undo).toBeEnabled();
      await expect(host.locator('[aria-label="研究员甲"]').first()).toBeVisible();

      const gameHost = page.getByTestId("overlay-host");
      const predecessorGameEpoch = await gameHost.getAttribute(
        "data-overlay-application-epoch",
      );
      expect(predecessorGameEpoch).not.toBeNull();
      page.on("load", () => {
        pageLoads += 1;
      });

      writeFileSync(presentationFileV1, candidateBytes);
      await expect(host.locator('[aria-label="研究员甲 R2"]').first()).toBeVisible();
      await expect(gameHost).not.toHaveAttribute(
        "data-overlay-application-epoch",
        predecessorGameEpoch!,
      );
      expect(pageLoads).toBe(0);
      await expect(page.locator('[data-ar3-shared-host="stable"]')).toHaveCount(1);
      await expect(host).toHaveAttribute("data-authoring-host", hostIdentity!);
      await expect(xInput).toHaveValue(String(editedX));
      await expect(entry).toHaveValue("tag.e2e.alpha");
      await expect(undo).toBeEnabled();

      const restoreEpoch = await gameHost.getAttribute("data-overlay-application-epoch");
      expect(restoreEpoch).not.toBeNull();
      writeFileSync(presentationFileV1, originalBytes);
      await expect(host.locator('[aria-label="研究员甲 R2"]')).toHaveCount(0);
      await expect(host.locator('[aria-label="研究员甲"]').first()).toBeVisible();
      await expect(gameHost).not.toHaveAttribute(
        "data-overlay-application-epoch",
        restoreEpoch!,
      );
      expect(pageLoads).toBe(0);
      await expect(page.locator('[data-ar3-shared-host="stable"]')).toHaveCount(1);
      await expect(host).toHaveAttribute("data-authoring-host", hostIdentity!);
      await expect(xInput).toHaveValue(String(editedX));
      await undo.click();
      await expect(xInput).toHaveValue(String(sourceX));
      await page.locator('[data-embedded-authoring-close="true"]').click();
      await expect(panel).toBeHidden();
    } finally {
      try {
        if (readFileSync(presentationFileV1, "utf8") !== originalBytes) {
          writeFileSync(presentationFileV1, originalBytes);
          if (!page.isClosed()) {
            const host = page.locator('[data-authoring-host-mode="embedded"]');
            if (await host.count() > 0) {
              await expect(host.locator('[aria-label="研究员甲 R2"]')).toHaveCount(0);
              await expect(host.locator('[aria-label="研究员甲"]').first()).toBeVisible();
            }
          }
        }
        expect(readFileSync(presentationFileV1, "utf8")).toBe(originalBytes);
      } catch (error) {
        cleanupError = error;
      }
    }
    if (cleanupError !== null) throw cleanupError;
  });
});
