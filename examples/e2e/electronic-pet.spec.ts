// SPDX-License-Identifier: MIT
import type { Locator, Page } from "@playwright/test";

import { electronicPetTargetUrlV1, expect, test } from "./fixtures.ts";

const catModelPathV1 = "/assets/models/electronic-pet-cat-m1.glb";
const automationKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";

async function openReadyPetSceneV1(page: Page, query = ""): Promise<Locator> {
  const modelResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith(catModelPathV1)
  );
  await page.goto(electronicPetTargetUrlV1(query));
  const response = await modelResponse;
  expect(response.ok(), "the application-owned GLB must load through the real dev server").toBe(
    true,
  );
  expect((await response.body()).byteLength).toBeGreaterThan(0);

  const scene = page.getByRole("region", { name: "小猫的新家" });
  await expect(scene).toHaveAttribute("data-pet-scene-status", "ready");
  await expect(scene.getByLabel("小猫与房间的三维互动场景")).toBeVisible();
  return scene;
}

async function expectViewportFitV1(page: Page, scene: Locator): Promise<void> {
  await expect(scene).toBeVisible();
  await expect(scene.locator(".pet-scene__interaction-card")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "照料与关系" })).toBeVisible();
  const viewport = page.viewportSize();
  if (viewport === null) throw new TypeError("viewport size unavailable");
  const geometry = await page.locator("html").evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(viewport.width);
  expect(geometry.scrollHeight).toBeLessThanOrEqual(viewport.height);
}

async function petCanvasGeometryV1(scene: Locator) {
  const canvas = scene.getByLabel("小猫与房间的三维互动场景");
  const box = await canvas.boundingBox();
  if (box === null) throw new TypeError("player canvas geometry unavailable");
  return {
    canvas,
    contact: { x: box.x + box.width * 0.5, y: box.y + box.height * 0.6 },
    hiddenContact: { x: box.x + box.width * 0.375, y: box.y + box.height * 0.57 },
    empty: { x: box.x + box.width * 0.06, y: box.y + box.height * 0.08 },
  };
}

interface ElectronicPetArrivalV1 {
  readonly scene: Locator;
  readonly care: Locator;
}

async function prepareNewHomeV1(
  page: Page,
  waterInput: "keyboard" | "pointer" = "pointer",
  query = "",
): Promise<ElectronicPetArrivalV1> {
  const scene = await openReadyPetSceneV1(page, query);
  const care = page.getByRole("complementary", { name: "照料与关系" });
  const water = care.getByRole("button", { name: "准备清水" });

  if (waterInput === "keyboard") {
    // WebKit follows Safari's platform preference for whether Tab visits
    // buttons, so focus the native control explicitly and prove Enter activation.
    await water.focus();
    await expect(water).toBeFocused();
    await page.keyboard.press("Enter");
  } else await water.click();
  await expect(water).toHaveCount(0);

  for (const action of ["摆好猫砂盆", "安置藏身窝"] as const) {
    const button = care.getByRole("button", { name: action });
    await button.click();
    await expect(button).toHaveCount(0);
  }
  await care.getByRole("button", { name: "放下食物" }).click();

  await expect(care.getByRole("button", { name: "添一点食物" })).toBeVisible();
  await expect(care.getByText("安全感 · 舒适", { exact: true })).toBeVisible();
  await expect(scene.getByText("正在悄悄观察你", { exact: true })).toBeVisible();
  await expect(care.getByRole("button", { name: "安静地陪它一会儿" })).toBeVisible();
  return { scene, care };
}

async function completeFirstApproachV1(
  page: Page,
  waterInput: "keyboard" | "pointer" = "pointer",
  query = "",
): Promise<ElectronicPetArrivalV1> {
  const arrival = await prepareNewHomeV1(page, waterInput, query);
  await arrival.care.getByRole("button", { name: "安静地陪它一会儿" }).click();

  await expect(arrival.scene.getByText("它主动靠近了一点", { exact: true })).toBeVisible();
  await expect(arrival.care.getByText("它正在靠近，先把手停在原地让它闻。", { exact: true }))
    .toBeVisible();
  const offer = arrival.care.getByRole("button", { name: "把手停在原地" });
  await offer.click();
  await expect(offer).toHaveCount(0);
  await expect(arrival.care.getByText("信赖 · 熟悉", { exact: true })).toBeVisible();
  await expect(arrival.care.getByRole("button", { name: "一起玩逗猫棒" })).toBeVisible();
  return arrival;
}

async function observeAutomationGameV1(page: Page): Promise<unknown> {
  return await page.evaluate((key) => {
    const automation = Reflect.get(globalThis, key) as
      | Readonly<{
        observe(): { readonly kind: string; readonly value?: { readonly game: unknown } };
      }>
      | undefined;
    const observed = automation?.observe();
    if (observed?.kind !== "ok" || observed.value === undefined) {
      throw new TypeError("automation observation unavailable");
    }
    return observed.value.game;
  }, automationKeyV1);
}

test.describe("Electronic Pet browser product", () => {
  test("loads the real GLB and exposes the care journey beside the ready 3D scene", async ({ page }) => {
    const scene = await openReadyPetSceneV1(page);
    await expect(scene.getByText("它还不准备被触碰", { exact: true })).toBeVisible();
    await expect(scene.getByText(/先用照料按钮准备清水、猫砂、藏身处和食物/u)).toBeVisible();
    await expect(scene.locator("[data-pet-last-outcome]")).toHaveAttribute(
      "data-pet-last-outcome",
      "none",
    );
    await expect(scene.locator("[data-pet-reaction-occurrence]")).toHaveAttribute(
      "data-pet-reaction-occurrence",
      "0",
    );
    const geometry = await petCanvasGeometryV1(scene);
    const canvas = scene.locator("canvas");
    const pointerFeedback = scene.getByLabel("抚摸反馈");
    await page.mouse.move(geometry.hiddenContact.x, geometry.hiddenContact.y);
    await expect(canvas).toHaveCSS("cursor", "not-allowed");
    await expect(pointerFeedback).toContainText("它还不准备被触碰");
    await page.mouse.click(geometry.hiddenContact.x, geometry.hiddenContact.y);
    await expect(scene.locator("[data-pet-reaction-occurrence]")).toHaveAttribute(
      "data-pet-reaction-occurrence",
      "0",
    );

    const care = page.getByRole("complementary", { name: "照料与关系" });
    await expect(care).toContainText("刚到新家");
    await expect(care).toContainText("信赖 · 陌生");
    await expect(care.getByRole("button", { name: "准备清水" })).toBeVisible();
    await expect(care.getByRole("button", { name: "安静地陪它一会儿" })).toHaveCount(0);
    await expect(care.getByRole("button", { name: "把手停在原地" })).toHaveCount(0);
  });

  test("keeps ordinary care controls keyboard reachable through the first contact journey", async ({ page }) => {
    const { scene, care } = await completeFirstApproachV1(page, "keyboard");
    await expect(scene.getByText("它主动靠近了一点", { exact: true })).toBeVisible();
    await expect(scene.getByText("按住并顺着毛发轻轻抚摸", { exact: true })).toBeVisible();
    await expect(care.getByText("它闻过你的手，放松了一些", { exact: true })).toBeVisible();
  });

  test("shows a premature-contact refusal, then commits a familiar mouse stroke", async ({ page }) => {
    const { scene, care } = await prepareNewHomeV1(page);
    await care.getByRole("button", { name: "安静地陪它一会儿" }).click();
    await expect(scene.getByText("先让它闻闻你的手", { exact: true })).toBeVisible();
    const outcome = scene.locator("[data-pet-last-outcome]");
    const canvas = scene.locator("canvas");
    const pointerFeedback = scene.getByLabel("抚摸反馈");
    const geometry = await petCanvasGeometryV1(scene);

    await page.mouse.move(geometry.contact.x, geometry.contact.y);
    await expect(canvas).toHaveCSS("cursor", "grab");
    await expect(pointerFeedback).toContainText("这里可以抚摸");
    await page.mouse.down();
    await expect(canvas).toHaveCSS("cursor", "grabbing");
    await expect(pointerFeedback).toContainText("继续滑动");
    await page.mouse.move(geometry.contact.x + 24, geometry.contact.y, { steps: 4 });
    await page.mouse.move(geometry.empty.x, geometry.empty.y);
    await page.mouse.up();
    await expect(outcome).toHaveAttribute("data-pet-last-outcome", "refuse");
    await expect(outcome).toHaveAttribute("data-pet-reaction-occurrence", "1");
    await expect(care.getByText("信赖 · 陌生", { exact: true })).toBeVisible();

    const offer = care.getByRole("button", { name: "把手停在原地" });
    await expect(offer).toBeVisible();
    await offer.click();
    await expect(care.getByText("信赖 · 熟悉", { exact: true })).toBeVisible();

    await page.mouse.move(geometry.contact.x, geometry.contact.y);
    await expect(canvas).toHaveCSS("cursor", "grab");
    await page.mouse.down();
    await page.mouse.move(geometry.contact.x + 3, geometry.contact.y);
    await page.mouse.up();
    await expect(pointerFeedback).toContainText("再滑动一点");
    await expect(outcome).toHaveAttribute("data-pet-last-outcome", "refuse");
    await expect(outcome).toHaveAttribute("data-pet-reaction-occurrence", "1");

    await page.mouse.move(geometry.empty.x, geometry.empty.y);
    await expect(canvas).toHaveCSS("cursor", "default");
    await page.mouse.down();
    await page.mouse.move(geometry.empty.x + 32, geometry.empty.y, { steps: 4 });
    await page.mouse.up();
    await expect(outcome).toHaveAttribute("data-pet-last-outcome", "refuse");
    await expect(outcome).toHaveAttribute("data-pet-reaction-occurrence", "1");

    await page.mouse.move(geometry.contact.x, geometry.contact.y);
    await page.mouse.down();
    await page.mouse.move(geometry.contact.x + 24, geometry.contact.y, { steps: 4 });
    await expect(pointerFeedback).toContainText("现在松手即可完成");
    await page.mouse.up();
    await expect(outcome).toHaveAttribute("data-pet-reaction-occurrence", "2");
    await expect(outcome).toHaveAttribute(
      "data-pet-last-outcome",
      /^(accept|tolerate|warn|refuse)$/u,
    );
    await expect(outcome).not.toHaveText("按住小猫并轻轻滑动，观察它的反应");
  });

  test("completes one real mouse wand round only after a clear out-and-back movement", async ({ page }) => {
    const { scene, care } = await completeFirstApproachV1(page);
    const outcome = scene.locator("[data-pet-last-outcome]");
    await care.getByRole("button", { name: "一起玩逗猫棒" }).click();

    const wand = care.getByRole("region", { name: "鼠标或触控逗猫棒区域" });
    await expect(wand).toBeVisible();
    await care.getByRole("button", { name: "放下逗猫棒" }).click();
    await expect(wand).toHaveCount(0);
    await expect(outcome).toHaveAttribute("data-pet-last-outcome", "none");

    await care.getByRole("button", { name: "一起玩逗猫棒" }).click();
    await expect(wand).toBeVisible();
    const box = await wand.boundingBox();
    if (box === null) throw new TypeError("wand surface geometry unavailable");
    const start = { x: box.x + box.width * 0.24, y: box.y + box.height * 0.52 };

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + Math.min(140, box.width * 0.36), start.y, { steps: 6 });
    await page.mouse.move(start.x + 8, start.y, { steps: 6 });
    await page.mouse.up();

    await expect(wand).toHaveCount(0);
    await expect(care.getByText("它追到了逗猫棒，玩得很尽兴", { exact: true })).toBeVisible();
    await expect(care.getByRole("button", { name: "一起玩逗猫棒" })).toBeVisible();
  });

  test("rejects stale pose and invitation commands without a partial browser-visible change", async ({ page }) => {
    const { scene, care } = await prepareNewHomeV1(
      page,
      "pointer",
      "?capability=automation_bridge",
    );
    await care.getByRole("button", { name: "安静地陪它一会儿" }).click();
    await expect(scene).toHaveAttribute("data-pet-scene-status", "ready");
    const before = await observeAutomationGameV1(page) as {
      readonly activityOccurrence: number;
      readonly invitation: { readonly occurrence: number };
    };

    const results = await page.evaluate(async (input) => {
      const automation = Reflect.get(globalThis, input.key) as
        | Readonly<{ dispatch(invocation: unknown): Promise<unknown> }>
        | undefined;
      if (automation === undefined) throw new TypeError("automation bridge unavailable");
      return {
        invitation: await automation.dispatch({
          kind: "pet.hand_offer",
          expectedActivityOccurrence: input.activityOccurrence,
          expectedInvitationOccurrence: input.invitationOccurrence + 1,
        }),
        pose: await automation.dispatch({
          kind: "pet.contact_complete",
          expectedActivityOccurrence: input.activityOccurrence + 1,
          targetInteractionId: "interaction.pet.neck",
          gesture: "stroke",
          direction: "with-fur",
          speed: "slow",
          duration: "brief",
        }),
      };
    }, {
      key: automationKeyV1,
      activityOccurrence: before.activityOccurrence,
      invitationOccurrence: before.invitation.occurrence,
    });

    expect(results.invitation).toMatchObject({
      kind: "ok",
      value: { kind: "rejected", codes: ["pet.invitation_stale"] },
    });
    expect(results.pose).toMatchObject({
      kind: "ok",
      value: { kind: "rejected", codes: ["pet.activity_stale"] },
    });
    await expect(scene).toHaveAttribute("data-pet-scene-status", "ready");
    expect(await observeAutomationGameV1(page)).toEqual(before);
    await expect(care.getByText("它正在靠近，先把手停在原地让它闻。", { exact: true }))
      .toBeVisible();
    await expect(scene).toHaveAttribute("data-pet-scene-status", "ready");
  });

  test("resumes home preparation from the Browser autosave after a reload", async ({ page }) => {
    await openReadyPetSceneV1(page);
    const care = page.getByRole("complementary", { name: "照料与关系" });
    await care.getByRole("button", { name: "准备清水" }).click();
    await expect(care.getByRole("button", { name: "准备清水" })).toHaveCount(0);

    // Autosave is deliberately debounced; wait for the product persistence boundary.
    await page.waitForTimeout(1_500);
    const modelResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(catModelPathV1)
    );
    await page.reload();
    expect((await modelResponse).ok()).toBe(true);

    await expect(page.getByRole("region", { name: "小猫的新家" })).toHaveAttribute(
      "data-pet-scene-status",
      "ready",
    );
    await expect(
      page.getByRole("complementary", { name: "照料与关系" })
        .getByRole("button", { name: "准备清水" }),
    ).toHaveCount(0);
  });

  test("requires confirmation and clears the current adoption Save", async ({ page }) => {
    await openReadyPetSceneV1(page);
    const care = page.getByRole("complementary", { name: "照料与关系" });
    await care.getByRole("button", { name: "准备清水" }).click();
    await expect(care.getByRole("button", { name: "准备清水" })).toHaveCount(0);

    await care.getByRole("button", { name: "重新领养" }).click();
    await expect(care.getByRole("button", { name: "确认清除进度" })).toBeVisible();
    await care.getByRole("button", { name: "确认清除进度" }).click();
    await expect(care.getByRole("button", { name: "准备清水" })).toBeVisible();

    await page.waitForTimeout(1_500);
    await page.reload();
    await expect(page.getByRole("region", { name: "小猫的新家" })).toHaveAttribute(
      "data-pet-scene-status",
      "ready",
    );
    await expect(
      page.getByRole("complementary", { name: "照料与关系" })
        .getByRole("button", { name: "准备清水" }),
    ).toBeVisible();
  });

  test("keeps the scene and care journey usable across narrow and wide viewports", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const scene = await openReadyPetSceneV1(page);
    await expectViewportFitV1(page, scene);
    const guide = scene.locator(".pet-scene__interaction-card");
    const guideBox = await guide.boundingBox();
    if (guideBox === null) throw new TypeError("interaction guide geometry unavailable");
    expect(
      await page.evaluate(({ x, y }) => {
        return document.elementFromPoint(x, y)?.getAttribute("aria-label") ?? null;
      }, {
        x: guideBox.x + guideBox.width / 2,
        y: guideBox.y + guideBox.height / 2,
      }),
    ).toBe("小猫与房间的三维互动场景");

    await page.setViewportSize({ width: 1280, height: 800 });
    await expectViewportFitV1(page, scene);
    await expect(scene).toHaveAttribute("data-pet-scene-status", "ready");
  });

  test("opens the dev-only 3D Inspector with current behavior and three authored fur-direction volumes", async ({ page }) => {
    const { scene: playerScene } = await completeFirstApproachV1(
      page,
      "pointer",
      "?capability=automation_bridge",
    );
    const gameBeforeAuthoring = await observeAutomationGameV1(page);
    await page.getByRole("button", { name: "打开内嵌创作", exact: true }).click();

    const authoring = page.getByRole("region", { name: "内嵌创作" });
    await expect(authoring).toBeVisible();
    const companion = authoring.locator('[data-pet-authoring-companion="visible"]');
    await expect(authoring.locator('[data-inspector-root="true"]')).toHaveCount(0);
    await expect(companion).toContainText("Electronic Pet · product-owned 3D authoring");
    const hierarchy = companion.getByRole("navigation", { name: "3D object hierarchy" });
    await expect(hierarchy.getByRole("button", { name: /Face and forehead interaction/u }))
      .toBeVisible();
    await expect(hierarchy.getByRole("button", { name: /Neck and shoulder interaction/u }))
      .toBeVisible();
    await expect(hierarchy.getByRole("button", { name: /Back interaction/u })).toBeVisible();
    await expect(companion.getByLabel("3D authoring preview")).toBeVisible();
    await expect(companion.locator('[data-pet-authoring-message="true"]')).toHaveText(
      "3D preview ready",
    );
    await expect(playerScene).toHaveAttribute("data-pet-scene-status", "ready");

    const runtime = companion.locator('[data-pet-runtime-inspector="current"]');
    await expect(runtime).toBeVisible();
    await expect(runtime).toHaveAttribute("data-activity-reason", "social_interest");
    await expect(runtime.getByText("Live behavior · read only", { exact: true })).toBeVisible();
    await expect(runtime.getByText("approach_player", { exact: true })).toBeVisible();
    await expect(runtime.getByText("social_interest", { exact: true })).toBeVisible();
    expect(await observeAutomationGameV1(page)).toEqual(gameBeforeAuthoring);

    const properties = companion.getByRole("complementary", { name: "Selected object properties" });
    await hierarchy.locator('[data-pet-object-id="pet.camera.main"]').click();
    await expect(properties.locator("header code")).toHaveText("pet.camera.main");
    await expect(properties.getByText("Camera framing", { exact: true })).toBeVisible();
    await expect(properties.getByRole("spinbutton", { name: "Blend below aspect" })).toBeVisible();
    const narrowFov = properties.getByRole("spinbutton", { name: "Narrow FOV offset" });
    const initialNarrowFov = Number(await narrowFov.inputValue());
    expect(Number.isFinite(initialNarrowFov)).toBe(true);
    await narrowFov.fill(String(initialNarrowFov + 1));
    await narrowFov.press("Tab");
    await expect(narrowFov).toHaveValue(String(initialNarrowFov + 1));
    const undo = companion.getByRole("button", { name: "Undo", exact: true });
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(properties.getByRole("spinbutton", { name: "Narrow FOV offset" })).toHaveValue(
      String(initialNarrowFov),
    );

    await hierarchy.getByRole("button", { name: /Neck and shoulder interaction/u }).click();
    await expect(properties.locator("header code")).toHaveText("pet.interaction.neck");
    await expect(properties.getByRole("spinbutton", { name: "Radius" })).toHaveValue("0.34");
    const direction = properties.getByRole("group", { name: "Preferred fur direction" });
    await expect(direction.getByRole("spinbutton", { name: "X" })).toHaveValue("0");
    await expect(direction.getByRole("spinbutton", { name: "Y" })).toHaveValue("0");
    await expect(direction.getByRole("spinbutton", { name: "Z" })).toHaveValue("-1");

    await companion.getByRole("button", { name: "Agent adjusts volume" }).click();
    await expect(properties.getByRole("spinbutton", { name: "Radius" })).toHaveValue("0.38");
    expect(await observeAutomationGameV1(page)).toEqual(gameBeforeAuthoring);
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(properties.getByRole("spinbutton", { name: "Radius" })).toHaveValue("0.34");
    expect(await observeAutomationGameV1(page)).toEqual(gameBeforeAuthoring);
    await expect(companion.getByRole("button", { name: "Save source" })).toBeDisabled();

    await authoring.getByRole("button", { name: "收起产品创作视图" }).click();
    await expect(authoring).toBeHidden();
    const reopen = page.getByRole("button", { name: "展开产品创作视图" });
    await expect(reopen).toBeVisible();
    await expect(playerScene).toHaveAttribute("data-pet-scene-status", "ready");

    await reopen.click();
    await expect(authoring).toBeVisible();
    await expect(properties.locator("header code")).toHaveText("pet.interaction.neck");
    expect(await observeAutomationGameV1(page)).toEqual(gameBeforeAuthoring);

    const standaloneModelResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(catModelPathV1)
    );
    await page.goto(electronicPetTargetUrlV1("__sillymaker/inspector/"));
    expect((await standaloneModelResponse).ok()).toBe(true);
    const standalone = page.locator('[data-pet-authoring-companion="visible"]');
    await expect(standalone).toContainText("Electronic Pet · product-owned 3D authoring");
    await expect(standalone.locator('[data-pet-runtime-inspector="detached"]')).toBeVisible();
    await expect(page.locator('[data-inspector-root="true"]')).toHaveCount(0);
    await standalone.getByRole("navigation", { name: "3D object hierarchy" })
      .getByRole("button", { name: /Neck and shoulder interaction/u }).click();
    await expect(
      standalone.getByRole("complementary", { name: "Selected object properties" })
        .locator("header code"),
    ).toHaveText("pet.interaction.neck");
  });
});

test.describe("Electronic Pet M2 touch input", () => {
  test.use({ hasTouch: true });

  test("ignores a tap and routes one real touch stroke through the same semantic action", async ({ browserName, page }) => {
    test.skip(
      browserName !== "chromium",
      "Playwright exposes native touch-drag injection through Chromium CDP only",
    );
    const client = await page.context().newCDPSession(page);
    let touchActive = false;
    try {
      const hiddenScene = await openReadyPetSceneV1(page);
      const hiddenFeedback = hiddenScene.getByLabel("抚摸反馈");
      const hiddenOutcome = hiddenScene.locator("[data-pet-last-outcome]");
      const hiddenGeometry = await petCanvasGeometryV1(hiddenScene);
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [hiddenGeometry.hiddenContact],
      });
      touchActive = true;
      await expect(hiddenFeedback).toContainText("它还不准备被触碰");
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      touchActive = false;
      await expect(hiddenOutcome).toHaveAttribute("data-pet-reaction-occurrence", "0");

      const { scene } = await completeFirstApproachV1(page);
      const outcome = scene.locator("[data-pet-last-outcome]");
      const pointerFeedback = scene.getByLabel("抚摸反馈");
      const { contact } = await petCanvasGeometryV1(scene);
      await expect(pointerFeedback).toContainText("移动到小猫身上开始互动");
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: contact.x, y: contact.y }],
      });
      touchActive = true;
      await expect(pointerFeedback).toContainText("继续滑动");
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      touchActive = false;
      await expect(pointerFeedback).toContainText("再滑动一点");
      await expect(outcome).toHaveAttribute("data-pet-last-outcome", "none");
      await expect(outcome).toHaveAttribute("data-pet-reaction-occurrence", "0");

      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: contact.x, y: contact.y }],
      });
      touchActive = true;
      await expect(pointerFeedback).toContainText("继续滑动");
      for (const offset of [8, 16, 24]) {
        await client.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: contact.x + offset, y: contact.y }],
        });
      }
      await expect(pointerFeedback).toContainText("现在松手即可完成");
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      touchActive = false;
      await expect(outcome).toHaveAttribute(
        "data-pet-last-outcome",
        /^(accept|tolerate|warn|refuse)$/u,
      );
      await expect(outcome).toHaveAttribute("data-pet-reaction-occurrence", "1");
      await expect(outcome).not.toHaveAttribute("data-pet-last-outcome", "none");
    } finally {
      if (touchActive) {
        await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
      await client.detach();
    }
  });
});
