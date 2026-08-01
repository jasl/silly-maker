// SPDX-License-Identifier: MIT
import type { Locator, Page } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

const conformanceQueryV1 = "?overlay_conformance=1";
const preparationEventsV1 = Object.freeze({
  hold: "sillymaker:engine-lab:overlay-hold-next",
  ready: "sillymaker:engine-lab:overlay-ready",
  fail: "sillymaker:engine-lab:overlay-fail",
});

const labelsV1 = Object.freeze({
  homeOpen: "打开观测台",
  homeTitle: "观测台",
  alternateOpen: "打开分析台",
  alternateTitle: "分析台",
  detailOpen: "打开样本详情",
  detailTitle: "样本详情",
  detailAction: "检查样本",
  lockedOpen: "打开校验步骤",
  lockedTitle: "校验步骤",
  lockedComplete: "完成校验步骤",
  restart: "重置观测会话",
});

async function dispatchPreparationEventV1(
  page: Page,
  eventType: (typeof preparationEventsV1)[keyof typeof preparationEventsV1],
): Promise<void> {
  await page.evaluate((type) => window.dispatchEvent(new Event(type)), eventType);
}

async function expectFreshInstanceV1(previous: string, dialog: Locator): Promise<string> {
  const current = await dialog.getAttribute("data-overlay-instance");
  expect(current).not.toBeNull();
  expect(current).not.toBe(previous);
  return current!;
}

test.describe("Workspace Overlay Coordinator conformance", () => {
  test("keeps the opt-in conformance rig out of the normal Engine Lab DOM", async ({ page }) => {
    await gotoLabV1(page);

    await expect(page.locator("[data-lab-overlay-conformance-launchers]"))
      .toHaveCount(0);
    await expect(page.getByRole("button", { name: labelsV1.homeOpen }))
      .toHaveCount(0);
  });

  test("@smoke traverses replace/detail/back/close and preserves pointer, keyboard, and focus policy", async ({ page }) => {
    await gotoLabV1(page, conformanceQueryV1);

    const homeOpener = page.getByRole("button", { name: labelsV1.homeOpen });
    const alternateOpener = page.getByRole("button", { name: labelsV1.alternateOpen });
    const lockedOpener = page.getByRole("button", { name: labelsV1.lockedOpen });
    const hud = page.locator("[data-lab-hud]");

    await homeOpener.focus();
    await page.keyboard.press("Enter");
    const home = page.getByRole("dialog", { name: labelsV1.homeTitle });
    await expect(home).toBeVisible();
    const homeInstance = await home.getAttribute("data-overlay-instance");
    expect(homeInstance).not.toBeNull();
    await expect(home.getByRole("button", { name: labelsV1.detailOpen })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(home.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Tab");
    await expect(home.locator(":focus")).toHaveCount(1);

    await alternateOpener.click();
    const alternate = page.getByRole("dialog", { name: labelsV1.alternateTitle });
    await expect(alternate).toBeVisible();
    await expect(home).toHaveCount(0);
    await expectFreshInstanceV1(homeInstance!, alternate);

    const detailOpener = alternate.getByRole("button", { name: labelsV1.detailOpen });
    await detailOpener.click();
    const detail = page.getByRole("dialog", { name: labelsV1.detailTitle });
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("button", { name: labelsV1.detailAction })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);
    await expect(detailOpener).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(alternate).toHaveCount(0);
    await expect(homeOpener).toBeFocused();

    await homeOpener.focus();
    await page.keyboard.press("Enter");
    await expect(home).toBeVisible();
    await expect(home.getByRole("button", { name: labelsV1.detailOpen })).toBeFocused();
    await page.locator("[data-overlay-backdrop='0']").click({ position: { x: 4, y: 4 } });
    await expect(home).toHaveCount(0);
    await expect(homeOpener).toBeFocused();

    await homeOpener.click();
    await expect(home).toBeVisible();
    const underlayAction = hud.locator("[data-lab-action-id]:not(:disabled)").first();
    const underlayText = await hud.textContent();
    const underlayBox = await underlayAction.boundingBox();
    expect(underlayBox).not.toBeNull();
    await expect.poll(() =>
      page.evaluate(
        ({ x, y }) =>
          document.elementFromPoint(x, y)?.hasAttribute("data-overlay-backdrop") ?? false,
        {
          x: underlayBox!.x + underlayBox!.width / 2,
          y: underlayBox!.y + underlayBox!.height / 2,
        },
      )
    ).toBe(true);
    await page.mouse.click(
      underlayBox!.x + underlayBox!.width / 2,
      underlayBox!.y + underlayBox!.height / 2,
    );
    await expect(home).toHaveCount(0);
    await expect.poll(() => hud.textContent()).toBe(underlayText);
    await expect(homeOpener).toBeFocused();

    await homeOpener.click();
    await expect(home).toBeVisible();
    await home.locator("[data-lab-overlay-routed-cancel-target]").click({ button: "right" });
    await expect(home).toHaveCount(0);
    await expect(homeOpener).toBeFocused();

    await lockedOpener.focus();
    await page.keyboard.press("Enter");
    const locked = page.getByRole("dialog", { name: labelsV1.lockedTitle });
    const lockedComplete = locked.getByRole("button", { name: labelsV1.lockedComplete });
    await expect(locked).toBeVisible();
    await expect(lockedComplete).toBeFocused();

    await page.locator("[data-overlay-backdrop='0']").click({ position: { x: 4, y: 4 } });
    await expect(locked).toBeVisible();
    await expect(lockedComplete).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(locked).toBeVisible();
    await expect(lockedComplete).toBeFocused();
    await locked.locator("[data-lab-overlay-routed-cancel-target]").click({ button: "right" });
    await expect(locked).toBeVisible();

    await lockedComplete.click();
    await expect(locked).toHaveCount(0);
    await expect(lockedOpener).toBeFocused();
  });

  test("activates controllable initial, replacement, and detail readiness", async ({ page }) => {
    await gotoLabV1(page, conformanceQueryV1);
    const host = page.getByTestId("overlay-host");
    const fallback = host.locator("[data-overlay-fallback]");
    const preparing = host.locator("[data-overlay-preparing]");
    const homeOpener = page.getByRole("button", { name: labelsV1.homeOpen });
    const alternateOpener = page.getByRole("button", { name: labelsV1.alternateOpen });

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await homeOpener.click();
    await expect(fallback).toHaveCount(1);
    await expect(page.getByRole("dialog", { name: labelsV1.homeTitle })).toHaveCount(0);
    await dispatchPreparationEventV1(page, preparationEventsV1.ready);
    const home = page.getByRole("dialog", { name: labelsV1.homeTitle });
    await expect(home).toBeVisible();
    await expect(fallback).toHaveCount(0);

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await alternateOpener.click();
    await expect(preparing).toHaveCount(1);
    await expect(home).toBeVisible();
    await expect(page.getByRole("dialog", { name: labelsV1.alternateTitle })).toHaveCount(0);
    await dispatchPreparationEventV1(page, preparationEventsV1.ready);
    const alternate = page.getByRole("dialog", { name: labelsV1.alternateTitle });
    await expect(alternate).toBeVisible();
    await expect(home).toHaveCount(0);

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await alternate.getByRole("button", { name: labelsV1.detailOpen }).click();
    await expect(fallback).toHaveCount(1);
    await expect(alternate).toBeVisible();
    await expect(page.getByRole("dialog", { name: labelsV1.detailTitle })).toHaveCount(0);
    await dispatchPreparationEventV1(page, preparationEventsV1.ready);
    await expect(page.getByRole("dialog", { name: labelsV1.detailTitle })).toBeVisible();
    await expect(fallback).toHaveCount(0);

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(alternate).toHaveCount(0);
  });

  test("rolls back controllable initial, replacement, and detail failures", async ({ page }) => {
    await gotoLabV1(page, conformanceQueryV1);
    const host = page.getByTestId("overlay-host");
    const fallback = host.locator("[data-overlay-fallback]");
    const preparing = host.locator("[data-overlay-preparing]");
    const homeOpener = page.getByRole("button", { name: labelsV1.homeOpen });
    const alternateOpener = page.getByRole("button", { name: labelsV1.alternateOpen });

    await homeOpener.focus();
    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await page.keyboard.press("Enter");
    await expect(fallback).toHaveCount(1);
    await dispatchPreparationEventV1(page, preparationEventsV1.fail);
    await expect(fallback).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: labelsV1.homeTitle })).toHaveCount(0);
    await expect(homeOpener).toBeFocused();

    await homeOpener.click();
    const home = page.getByRole("dialog", { name: labelsV1.homeTitle });
    await expect(home).toBeVisible();
    const detailOpener = home.getByRole("button", { name: labelsV1.detailOpen });

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await alternateOpener.click();
    await expect(preparing).toHaveCount(1);
    await detailOpener.focus();
    await dispatchPreparationEventV1(page, preparationEventsV1.fail);
    await expect(preparing).toHaveCount(0);
    await expect(home).toBeVisible();
    await expect(page.getByRole("dialog", { name: labelsV1.alternateTitle })).toHaveCount(0);
    await expect(detailOpener).toBeFocused();

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await page.keyboard.press("Enter");
    await expect(fallback).toHaveCount(1);
    await dispatchPreparationEventV1(page, preparationEventsV1.fail);
    await expect(fallback).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: labelsV1.detailTitle })).toHaveCount(0);
    await expect(home).toBeVisible();
    await expect(detailOpener).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(home).toHaveCount(0);
  });

  test("fences close, second replacement, and application successor against late readiness", async ({ page }) => {
    await gotoLabV1(page, conformanceQueryV1);
    const host = page.getByTestId("overlay-host");
    const fallback = host.locator("[data-overlay-fallback]");
    const preparing = host.locator("[data-overlay-preparing]");
    const homeOpener = page.getByRole("button", { name: labelsV1.homeOpen });
    const alternateOpener = page.getByRole("button", { name: labelsV1.alternateOpen });

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await homeOpener.click();
    await expect(fallback).toHaveCount(1);
    await fallback.locator("[aria-hidden='true']").click({ position: { x: 4, y: 4 } });
    await expect(fallback).toHaveCount(0);
    const topologyAfterClose = await host.getAttribute("data-overlay-topology-revision");
    await dispatchPreparationEventV1(page, preparationEventsV1.fail);
    await expect(host).toHaveAttribute("data-overlay-topology-revision", topologyAfterClose!);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await homeOpener.click();
    const home = page.getByRole("dialog", { name: labelsV1.homeTitle });
    await expect(home).toBeVisible();
    const firstHomeInstance = await home.getAttribute("data-overlay-instance");

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await alternateOpener.click();
    await expect(preparing).toHaveCount(1);
    await expect(home).toHaveAttribute("data-overlay-instance", firstHomeInstance!);
    await homeOpener.click();
    await expect(preparing).toHaveCount(0);
    const secondHomeInstance = await expectFreshInstanceV1(firstHomeInstance!, home);
    const topologyAfterSecondReplace = await host.getAttribute("data-overlay-topology-revision");
    await dispatchPreparationEventV1(page, preparationEventsV1.ready);
    await expect(home).toHaveAttribute("data-overlay-instance", secondHomeInstance);
    await expect(host).toHaveAttribute(
      "data-overlay-topology-revision",
      topologyAfterSecondReplace!,
    );

    await dispatchPreparationEventV1(page, preparationEventsV1.hold);
    await alternateOpener.click();
    await expect(preparing).toHaveCount(1);
    const predecessorEpoch = await host.getAttribute("data-overlay-application-epoch");
    await page.getByRole("button", { name: labelsV1.restart }).click();
    await expect(host).not.toHaveAttribute("data-overlay-application-epoch", predecessorEpoch!);
    await expect(preparing).toHaveCount(0);
    await expect(fallback).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const successorEpoch = await host.getAttribute("data-overlay-application-epoch");
    const successorTopology = await host.getAttribute("data-overlay-topology-revision");

    await dispatchPreparationEventV1(page, preparationEventsV1.ready);
    await expect(host).toHaveAttribute("data-overlay-application-epoch", successorEpoch!);
    await expect(host).toHaveAttribute("data-overlay-topology-revision", successorTopology!);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
