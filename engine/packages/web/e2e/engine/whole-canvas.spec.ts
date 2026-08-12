// SPDX-License-Identifier: MIT
import type { ElementHandle, Locator, Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

const conformanceQueryV1 = "?whole_canvas_conformance=1";

const targetIdsV1 = Object.freeze(
  {
    home: "lab.whole-canvas.home",
    status: "lab.whole-canvas.status",
    storage: "lab.whole-canvas.storage",
    specimenCatalog: "lab.whole-canvas.specimen-catalog",
    specimenDetail: "lab.whole-canvas.specimen-detail",
  } as const,
);

const actionIdsV1 = Object.freeze(
  {
    showHome: "lab.whole-canvas.show-home",
    showStatus: "lab.whole-canvas.show-status",
    showStorage: "lab.whole-canvas.show-storage",
    showSpecimenCatalog: "lab.whole-canvas.show-specimen-catalog",
    openSpecimenDetail: "lab.whole-canvas.open-specimen-detail",
  } as const,
);

const preparationEventsV1 = Object.freeze(
  {
    hold: "sillymaker:engine-lab:whole-canvas-hold-next",
    ready: "sillymaker:engine-lab:whole-canvas-ready",
    fail: "sillymaker:engine-lab:whole-canvas-fail",
  } as const,
);

const primaryDefinitionV1 = "surface.whole-canvas.primary";
const detailDefinitionV1 = "surface.whole-canvas.detail";

function managedSurfaceV1(
  page: Page,
  definitionId: string,
  targetId: string,
): Locator {
  return page.locator(
    `[data-managed-surface-definition="${definitionId}"]` +
      `[data-managed-surface-target="${targetId}"]`,
  );
}

function primaryV1(page: Page, targetId: string): Locator {
  return managedSurfaceV1(page, primaryDefinitionV1, targetId);
}

function detailV1(page: Page): Locator {
  return managedSurfaceV1(page, detailDefinitionV1, targetIdsV1.specimenDetail);
}

function actionV1(surface: Locator, actionId: string): Locator {
  return surface.locator(`[data-managed-surface-action="${actionId}"]`);
}

function launcherV1(
  page: Page,
  target: "home" | "status" | "storage" | "specimen-catalog" | "close" | "restart",
): Locator {
  return page.locator(`[data-lab-whole-canvas-launcher="${target}"]`);
}

async function dispatchPreparationEventV1(
  page: Page,
  eventType: (typeof preparationEventsV1)[keyof typeof preparationEventsV1],
): Promise<void> {
  await page.evaluate((type) => globalThis.dispatchEvent(new Event(type)), eventType);
}

async function requireInstanceV1(surface: Locator): Promise<string> {
  const instance = await surface.getAttribute("data-managed-surface-instance");
  expect(instance).not.toBeNull();
  return instance!;
}

async function expectFreshInstanceV1(previous: string, surface: Locator): Promise<string> {
  const current = await requireInstanceV1(surface);
  expect(current).not.toBe(previous);
  return current;
}

async function expectOnlyCurrentPrimaryV1(page: Page, targetId: string): Promise<Locator> {
  const current = primaryV1(page, targetId);
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute("data-whole-canvas-phase", "current");
  await expect(
    page.locator(
      `[data-managed-surface-definition="${primaryDefinitionV1}"]` +
        '[data-whole-canvas-phase="current"]',
    ),
  ).toHaveCount(1);
  return current;
}

async function dispatchDetachedGestureEndV1(
  handle: ElementHandle<HTMLElement | SVGElement>,
  pointerId: number,
): Promise<void> {
  await handle.dispatchEvent("pointerup", { pointerId, isPrimary: true, button: 0 });
  await handle.dispatchEvent("click");
}

test.describe("Whole Canvas production consumer conformance", () => {
  test("keeps the application source and Host absent from the normal Engine Lab", async ({ page }) => {
    await gotoLabV1(page);

    await expect(page.locator("[data-lab-whole-canvas-conformance-launchers]")).toHaveCount(0);
    await expect(page.locator("[data-whole-canvas-surface-host]")).toHaveCount(0);
    await expect(page.locator("[data-managed-surface-definition^='surface.whole-canvas.']"))
      .toHaveCount(0);
  });

  test("replaces four primaries and closes one exact-parent detail by every route", async ({ page }) => {
    await gotoLabV1(page, conformanceQueryV1);
    const hud = page.locator("[data-lab-hud]");

    let current = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.home);
    const homeInstance = await requireInstanceV1(current);
    const hudBeforeConfirm = await hud.textContent();
    const application = page.getByRole("application", { name: "引擎实验室" });
    const semanticRevisionBeforeConfirm = await application.getAttribute("data-semantic-revision");
    await expect(page.locator('[data-narrative-surface-render-shell="dialogue"]')).toHaveCount(0);
    await expect(current).toBeFocused();
    await page.keyboard.press("KeyC");
    await page.keyboard.press("KeyC");
    current = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.home);
    await expect(current).toHaveAttribute("data-managed-surface-instance", homeInstance);
    await expect(application).toHaveAttribute(
      "data-semantic-revision",
      semanticRevisionBeforeConfirm!,
    );
    await expect.poll(() => hud.textContent()).toBe(hudBeforeConfirm);
    await expect(page.locator('[data-narrative-surface-render-shell="dialogue"]')).toHaveCount(0);

    await actionV1(current, actionIdsV1.showStatus).click();
    current = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.status);
    const statusInstance = await expectFreshInstanceV1(homeInstance, current);

    await actionV1(current, actionIdsV1.showStorage).click();
    current = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.storage);
    const storageInstance = await expectFreshInstanceV1(statusInstance, current);

    await actionV1(current, actionIdsV1.showSpecimenCatalog).click();
    const catalog = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.specimenCatalog);
    await expectFreshInstanceV1(storageInstance, catalog);
    const detailOpener = actionV1(catalog, actionIdsV1.openSpecimenDetail);

    await detailOpener.focus();
    await detailOpener.click();
    let detail = detailV1(page);
    await expect(detail).toHaveCount(1);
    await expect(detail).toHaveAttribute("data-whole-canvas-phase", "current");
    await expect(detail).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(detail.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Tab");
    await expect(detail.locator(":focus")).toHaveCount(1);
    await detail.locator("[data-lab-whole-canvas-back='true']").click();
    await expect(detail).toHaveCount(0);
    await expect(detailOpener).toBeFocused();

    await detailOpener.focus();
    await detailOpener.click();
    detail = detailV1(page);
    await expect(detail).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);
    await expect(detailOpener).toBeFocused();

    await detailOpener.focus();
    await detailOpener.click();
    detail = detailV1(page);
    await detail.dispatchEvent("pointerdown", { pointerId: 41, isPrimary: true, button: 0 });
    await detail.dispatchEvent("pointerup", { pointerId: 41, isPrimary: true, button: 0 });
    await expect(detail).toHaveCount(0);
    await expect(detailOpener).toBeFocused();

    await detailOpener.focus();
    await detailOpener.click();
    detail = detailV1(page);
    await detail.locator("[data-lab-whole-canvas-kind='detail']").click({ button: "right" });
    await expect(detail).toHaveCount(0);
    await expect(detailOpener).toBeFocused();

    const catalogInstance = await requireInstanceV1(catalog);
    await launcherV1(page, "close").click();
    await expect(page.locator("[data-whole-canvas-surface-host]")).toHaveCount(0);
    await launcherV1(page, "home").click();
    const reopened = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.home);
    await expectFreshInstanceV1(catalogInstance, reopened);
  });

  test("retains predecessors across controlled readiness failure and retries an initial failure", async ({ page }) => {
    await gotoLabV1(page, conformanceQueryV1);
    const pending = page.locator('[data-managed-surface-readiness="pending"]');
    const failed = page.locator('[data-managed-surface-readiness="failed"]');
    const retry = page.locator('[data-managed-surface-retry="true"]');

    await launcherV1(page, "close").click();
    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await launcherV1(page, "home").click();
    await expect(pending).toHaveCount(1);
    await expect(
      page.locator(
        `[data-managed-surface-definition="${primaryDefinitionV1}"]` +
          '[data-whole-canvas-phase="current"]',
      ),
    ).toHaveCount(0);
    await dispatchPreparationEventV1(page, preparationEventsV1.fail);
    await expect(failed).toHaveCount(1);
    await expect(retry).toHaveCount(1);

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await retry.click();
    await expect(pending).toHaveCount(1);
    await dispatchPreparationEventV1(page, preparationEventsV1.ready);
    const home = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.home);
    const homeInstance = await requireInstanceV1(home);

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await actionV1(home, actionIdsV1.showStatus).click();
    await expect(pending).toHaveCount(1);
    await expect(home).toHaveAttribute("data-managed-surface-instance", homeInstance);
    await dispatchPreparationEventV1(page, preparationEventsV1.fail);
    await expect(pending).toHaveCount(0);
    await expect(home).toHaveAttribute("data-managed-surface-instance", homeInstance);
    await expect(primaryV1(page, targetIdsV1.status)).toHaveCount(0);

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await actionV1(home, actionIdsV1.showSpecimenCatalog).click();
    await expect(pending).toHaveCount(1);
    await dispatchPreparationEventV1(page, preparationEventsV1.ready);
    const catalog = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.specimenCatalog);

    const detailOpener = actionV1(catalog, actionIdsV1.openSpecimenDetail);
    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await detailOpener.focus();
    await detailOpener.click();
    await expect(pending).toHaveCount(1);
    await dispatchPreparationEventV1(page, preparationEventsV1.fail);
    await expect(pending).toHaveCount(0);
    await expect(detailV1(page)).toHaveCount(0);
    await expect(catalog).toHaveAttribute("data-whole-canvas-phase", "current");
    await expect(detailOpener).toBeFocused();
  });

  test("fences a stale pointer gesture and keeps higher Overlay/System owners isolated", async ({ page }) => {
    await gotoLabV1(page, conformanceQueryV1);
    const hud = page.locator("[data-lab-hud]");
    const hudBefore = await hud.textContent();
    const home = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.home);
    const oldAction = actionV1(home, actionIdsV1.showStatus);
    await oldAction.hover();
    const oldActionHandle = await oldAction.elementHandle();
    expect(oldActionHandle).not.toBeNull();
    await oldActionHandle!.dispatchEvent("pointerdown", {
      pointerId: 73,
      isPrimary: true,
      button: 0,
    });

    await page.keyboard.press("Digit3");
    let storage = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.storage);
    const storageInstance = await requireInstanceV1(storage);
    await dispatchDetachedGestureEndV1(oldActionHandle!, 73);
    storage = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.storage);
    await expect(storage).toHaveAttribute("data-managed-surface-instance", storageInstance);
    await expect.poll(() => hud.textContent()).toBe(hudBefore);

    const showHome = actionV1(storage, actionIdsV1.showHome);
    const showHomeHandle = await showHome.elementHandle();
    expect(showHomeHandle).not.toBeNull();
    await page.locator("[data-default-system-menu]").getByRole("button", { name: "设置" }).click();
    const settings = page.getByRole("dialog", { name: "设置" });
    await expect(settings).toBeVisible();
    await showHomeHandle!.dispatchEvent("click");
    await expectOnlyCurrentPrimaryV1(page, targetIdsV1.storage);
    await settings.getByRole("button", { name: "关闭" }).click();

    await page.locator("[data-default-system-menu]").getByRole("button", { name: "实验日志" })
      .click();
    const journal = page.getByRole("dialog", { name: "实验日志" });
    await expect(journal).toBeVisible();
    await showHomeHandle!.dispatchEvent("click");
    await expectOnlyCurrentPrimaryV1(page, targetIdsV1.storage);
    await page.keyboard.press("Escape");
    await expect(journal).toHaveCount(0);
  });

  test("retires a pending predecessor across restart and ignores its late settlement", async ({ page }) => {
    await gotoLabV1(page, conformanceQueryV1);
    const pending = page.locator('[data-managed-surface-readiness="pending"]');
    const home = await expectOnlyCurrentPrimaryV1(page, targetIdsV1.home);
    const predecessorInstance = await requireInstanceV1(home);
    const predecessorEpoch = await page.getByRole("application", { name: "引擎实验室" })
      .getAttribute("data-presentation-epoch");

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await actionV1(home, actionIdsV1.showStatus).click();
    await expect(pending).toHaveCount(1);
    const retiredPendingInstance = await requireInstanceV1(primaryV1(page, targetIdsV1.status));
    await launcherV1(page, "restart").click();
    await expect(page.getByRole("application", { name: "引擎实验室" }))
      .not.toHaveAttribute("data-presentation-epoch", predecessorEpoch!);
    await expect(pending).toHaveCount(0);

    const successor = page.locator(
      `[data-managed-surface-definition="${primaryDefinitionV1}"]` +
        '[data-whole-canvas-phase="current"]',
    );
    await expect(successor).toHaveCount(1);
    const successorTarget = await successor.getAttribute("data-managed-surface-target");
    const successorInstance = await expectFreshInstanceV1(predecessorInstance, successor);
    expect(successorInstance).not.toBe(retiredPendingInstance);
    await dispatchPreparationEventV1(page, preparationEventsV1.ready);
    await expect(successor).toHaveAttribute("data-managed-surface-target", successorTarget!);
    await expect(successor).toHaveAttribute("data-managed-surface-instance", successorInstance);
    await expect(pending).toHaveCount(0);
  });
});
