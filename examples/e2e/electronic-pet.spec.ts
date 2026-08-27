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

interface ElectronicPetTrustingArrivalV1 extends ElectronicPetArrivalV1 {
  readonly observedAtMs: number;
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

async function dispatchAutomationV1(page: Page, invocation: unknown): Promise<unknown> {
  const envelope = await page.evaluate(async ({ key, payload }) => {
    const automation = Reflect.get(globalThis, key) as
      | Readonly<{ dispatch(invocation: unknown): Promise<unknown> }>
      | undefined;
    if (automation === undefined) throw new TypeError("automation bridge unavailable");
    return await automation.dispatch(payload);
  }, { key: automationKeyV1, payload: invocation });
  expect(envelope).toMatchObject({ kind: "ok", value: { kind: "committed" } });
  return envelope;
}

interface ElectronicPetAutomationViewV1 {
  readonly progression: string;
  readonly trustStage: string;
  readonly activityId: string;
  readonly poseId: string;
  readonly activityOccurrence: number;
  readonly invitation: { readonly kind: string; readonly occurrence: number } | null;
  readonly home: {
    readonly returnSummary: { readonly visitOrdinal: number } | null;
  };
  readonly lastOutcome: string | null;
  readonly lastInteractionKind: string | null;
  readonly lastInteractionTargetId: string | null;
  readonly lastBellyTerminal: string | null;
}

async function reachTrustingV1(page: Page): Promise<ElectronicPetTrustingArrivalV1> {
  const arrival = await completeFirstApproachV1(
    page,
    "pointer",
    "?capability=automation_bridge",
  );
  let game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  await dispatchAutomationV1(page, {
    kind: "pet.play_complete",
    expectedActivityOccurrence: game.activityOccurrence,
    toyId: "toy.wand",
    roundResult: "caught",
  });
  game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  await dispatchAutomationV1(page, {
    kind: "pet.contact_complete",
    expectedActivityOccurrence: game.activityOccurrence,
    targetInteractionId: "interaction.pet.neck",
    gesture: "stroke",
    direction: "with-fur",
    speed: "slow",
    duration: "brief",
  });

  let observedAtMs = Date.now() + 16 * 60_000;
  await dispatchAutomationV1(page, {
    kind: "pet.time_settle",
    mode: "session_open",
    observedAtMs,
    elapsedMs: 0,
  });
  game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  if (game.home.returnSummary !== null) {
    await dispatchAutomationV1(page, {
      kind: "pet.return_summary_dismiss",
      expectedVisitOrdinal: game.home.returnSummary.visitOrdinal,
    });
  }
  await dispatchAutomationV1(page, { kind: "pet.food_place", foodId: "food.chicken" });
  game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  expect(game.progression).toBe("routine");

  for (let step = 0; step < 12 && game.invitation?.kind !== "head_contact"; step += 1) {
    observedAtMs += 15 * 60_000;
    await dispatchAutomationV1(page, {
      kind: "pet.time_settle",
      mode: "active",
      observedAtMs,
      elapsedMs: 15 * 60_000,
    });
    game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  }
  expect(game.invitation?.kind).toBe("head_contact");
  await expect(arrival.care.getByText("它主动把头靠近了你。", { exact: true })).toBeVisible();

  const geometry = await petCanvasGeometryV1(arrival.scene);
  await page.mouse.move(geometry.contact.x, geometry.contact.y);
  await page.mouse.down();
  await page.mouse.move(geometry.contact.x + 24, geometry.contact.y, { steps: 6 });
  await page.waitForTimeout(350);
  await page.mouse.up();
  await expect(arrival.care.getByText("信赖 · 信赖", { exact: true })).toBeVisible();
  await expect(arrival.scene.locator("[data-pet-reaction-occurrence]")).toHaveAttribute(
    "data-pet-reaction-occurrence",
    "1",
  );
  return { ...arrival, observedAtMs };
}

async function findGroomingPointV1(page: Page, scene: Locator): Promise<{ x: number; y: number }> {
  const canvas = scene.getByLabel("小猫与房间的三维互动场景");
  const box = await canvas.boundingBox();
  if (box === null) throw new TypeError("player canvas geometry unavailable");
  const candidates: Array<{ readonly x: number; readonly y: number }> = [];
  for (const yFraction of [0.5, 0.55, 0.6, 0.65, 0.7]) {
    for (const xFraction of [0.4, 0.45, 0.5, 0.55, 0.6]) {
      const point = { x: box.x + box.width * xFraction, y: box.y + box.height * yFraction };
      await page.mouse.move(point.x, point.y);
      if (await canvas.evaluate((element) => getComputedStyle(element).cursor) === "crosshair") {
        candidates.push(point);
      }
    }
  }
  const center = { x: box.x + box.width * 0.5, y: box.y + box.height * 0.6 };
  const point =
    candidates.toSorted((left, right) =>
      Math.hypot(left.x - center.x, left.y - center.y) -
      Math.hypot(right.x - center.x, right.y - center.y)
    )[0];
  if (point === undefined) throw new TypeError("reachable grooming point unavailable");
  await page.mouse.move(point.x, point.y);
  return point;
}

async function settleToBellyExposureV1(
  page: Page,
  observedAtMs: number,
  afterOccurrence = -1,
): Promise<{ readonly game: ElectronicPetAutomationViewV1; readonly observedAtMs: number }> {
  let game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  for (
    let step = 0;
    step < 32 &&
    (game.activityId !== "belly_expose" || game.activityOccurrence === afterOccurrence);
    step += 1
  ) {
    observedAtMs += 15 * 60_000;
    await dispatchAutomationV1(page, {
      kind: "pet.time_settle",
      mode: "active",
      observedAtMs,
      elapsedMs: 15 * 60_000,
    });
    game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  }
  expect(game).toMatchObject({ activityId: "belly_expose", poseId: "supine_relaxed" });
  expect(game.activityOccurrence).not.toBe(afterOccurrence);
  return { game, observedAtMs };
}

async function findBellyPointV1(page: Page, scene: Locator): Promise<{ x: number; y: number }> {
  const canvas = scene.getByLabel("小猫与房间的三维互动场景");
  const feedback = scene.getByLabel("互动反馈");
  const box = await canvas.boundingBox();
  if (box === null) throw new TypeError("player canvas geometry unavailable");
  const observedFeedback = new Set<string>();
  const candidates: Array<{ readonly x: number; readonly y: number }> = [];
  for (const yFraction of [0.46, 0.5, 0.54, 0.58, 0.62, 0.66]) {
    for (const xFraction of [0.38, 0.42, 0.46, 0.5, 0.54, 0.58]) {
      const point = { x: box.x + box.width * xFraction, y: box.y + box.height * yFraction };
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(20);
      const label = (await feedback.textContent()) ?? "";
      observedFeedback.add(label);
      if (label.includes("肚皮") || label.includes("腹部")) {
        candidates.push(point);
      }
    }
  }
  if (candidates.length === 0) {
    throw new TypeError(
      `reachable belly point unavailable:${JSON.stringify([...observedFeedback].toSorted())}`,
    );
  }
  const sum = candidates.reduce(
    (accumulator, candidate) => ({
      x: accumulator.x + candidate.x,
      y: accumulator.y + candidate.y,
    }),
    { x: 0, y: 0 },
  );
  const point = {
    x: sum.x / candidates.length,
    y: sum.y / candidates.length,
  };
  await page.mouse.move(point.x, point.y);
  return point;
}

async function stopBeforeBellyWarningV1(
  page: Page,
  point: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(320);
  await page.mouse.up();
}

async function completeInvitedBellyStrokeV1(
  page: Page,
  point: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(300);
  for (const [x, y] of [[-8, -4], [-16, -8], [-24, -12]] as const) {
    await page.mouse.move(point.x + x, point.y + y);
    await page.waitForTimeout(110);
  }
  await page.mouse.up();
}

async function reachBringBallInvitationV1(page: Page): Promise<{
  readonly scene: Locator;
  readonly care: Locator;
  readonly game: ElectronicPetAutomationViewV1;
}> {
  const trusting = await reachTrustingV1(page);
  let observedAtMs = trusting.observedAtMs;
  let game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  await dispatchAutomationV1(page, {
    kind: "pet.groom_complete",
    expectedActivityOccurrence: game.activityOccurrence,
    targetInteractionId: "interaction.pet.groom.back",
    gesture: "stroke",
    direction: "with-fur",
    speed: "slow",
    duration: "brief",
  });

  let exposure = await settleToBellyExposureV1(page, observedAtMs);
  observedAtMs = exposure.observedAtMs;
  await dispatchAutomationV1(page, {
    kind: "pet.belly_complete",
    expectedActivityOccurrence: exposure.game.activityOccurrence,
    targetInteractionId: "interaction.pet.belly",
    terminal: "stopped_before_warning",
  });
  const firstExposureOccurrence = exposure.game.activityOccurrence;
  observedAtMs += 16 * 60_000;
  await dispatchAutomationV1(page, {
    kind: "pet.time_settle",
    mode: "session_open",
    observedAtMs,
    elapsedMs: 0,
  });
  game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  if (game.home.returnSummary !== null) {
    await dispatchAutomationV1(page, {
      kind: "pet.return_summary_dismiss",
      expectedVisitOrdinal: game.home.returnSummary.visitOrdinal,
    });
  }
  exposure = await settleToBellyExposureV1(page, observedAtMs, firstExposureOccurrence);
  observedAtMs = exposure.observedAtMs;
  await dispatchAutomationV1(page, {
    kind: "pet.belly_complete",
    expectedActivityOccurrence: exposure.game.activityOccurrence,
    targetInteractionId: "interaction.pet.belly",
    terminal: "stopped_before_warning",
  });

  game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  for (let step = 0; step < 32 && game.activityId !== "bring_ball"; step += 1) {
    observedAtMs += 30 * 60_000;
    await dispatchAutomationV1(page, {
      kind: "pet.time_settle",
      mode: "active",
      observedAtMs,
      elapsedMs: 30 * 60_000,
    });
    game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
  }
  expect(game).toMatchObject({
    trustStage: "bonded",
    activityId: "bring_ball",
    poseId: "near_player",
    invitation: { kind: "shared_play" },
  });
  return { scene: trusting.scene, care: trusting.care, game };
}

async function findBallPointV1(page: Page, scene: Locator): Promise<{ x: number; y: number }> {
  const canvas = scene.getByLabel("小猫与房间的三维互动场景");
  const feedback = scene.getByLabel("互动反馈");
  const box = await canvas.boundingBox();
  if (box === null) throw new TypeError("player canvas geometry unavailable");
  for (const yOffset of [-0.08, -0.04, 0, 0.04, 0.08, 0.12]) {
    for (const xOffset of [-0.1, -0.06, -0.03, 0, 0.03, 0.06, 0.1]) {
      const point = {
        x: box.x + box.width * (0.5 + xOffset),
        y: box.y + box.height * (0.56 + yOffset),
      };
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(24);
      if (((await feedback.textContent()) ?? "").includes("抓住 Mochi 叼来的小球")) {
        return point;
      }
    }
  }
  throw new TypeError("reachable ball point unavailable");
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
    const pointerFeedback = scene.getByLabel("互动反馈");
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
    const pointerFeedback = scene.getByLabel("互动反馈");
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

  test("crosses visits into trusting and commits one real mouse grooming stroke", async ({ page }) => {
    const { scene, care } = await reachTrustingV1(page);
    const toolControl = scene.locator("[data-pet-interaction-tool]");
    const brush = toolControl.getByRole("button");
    await expect(brush).toBeEnabled();
    await brush.click();
    await expect(toolControl).toHaveAttribute("data-pet-interaction-tool", "brush");
    await expect(brush).toHaveAttribute("aria-pressed", "true");
    await expect(scene.getByText("从肩背顺着毛发轻轻梳理", { exact: true })).toBeVisible();

    const point = await findGroomingPointV1(page, scene);
    const canvas = scene.getByLabel("小猫与房间的三维互动场景");
    const feedback = scene.getByLabel("互动反馈");
    await expect(canvas).toHaveCSS("cursor", "crosshair");
    await expect(feedback).toContainText("这里可以梳理");
    await page.mouse.down();
    await page.mouse.move(point.x + 3, point.y);
    await page.mouse.up();
    await expect(feedback).toContainText("再梳长一点");
    await expect(scene.locator("[data-pet-reaction-occurrence]")).toHaveAttribute(
      "data-pet-reaction-occurrence",
      "1",
    );

    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x - 8, point.y, { steps: 2 });
    await page.mouse.move(point.x - 16, point.y, { steps: 2 });
    await page.mouse.move(point.x - 26, point.y, { steps: 3 });
    await page.waitForTimeout(350);
    await page.mouse.up();
    await expect(scene.locator("[data-pet-reaction-occurrence]")).toHaveAttribute(
      "data-pet-reaction-occurrence",
      "2",
    );
    await expect(scene.locator("[data-pet-last-outcome]")).toHaveAttribute(
      "data-pet-last-outcome",
      "accept",
    );
    await expect(scene.getByText("它放松身体，舒服地贴近了梳子", { exact: true })).toBeVisible();
    expect(await observeAutomationGameV1(page)).toMatchObject({
      progression: "trust",
      trustStage: "trusting",
      lastOutcome: "accept",
      lastInteractionKind: "grooming",
    });

    await page.waitForTimeout(1_500);
    const modelResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(catModelPathV1)
    );
    await page.reload();
    expect((await modelResponse).ok()).toBe(true);
    const reopenedScene = page.getByRole("region", { name: "小猫的新家" });
    await expect(reopenedScene).toHaveAttribute("data-pet-scene-status", "ready");
    await expect(care.getByText("信赖 · 信赖", { exact: true })).toBeVisible();
    await expect(reopenedScene.locator("[data-pet-interaction-tool]")).toHaveAttribute(
      "data-pet-interaction-tool",
      "hand",
    );
    await expect(reopenedScene.getByRole("button", { name: /拿起梳子/u })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(reopenedScene.getByText("它放松身体，舒服地贴近了梳子", { exact: true }))
      .toBeVisible();
  });

  test("earns a belly invitation by respecting boundaries across visits", async ({ page }) => {
    const trusting = await reachTrustingV1(page);
    const { scene, care } = trusting;
    let observedAtMs = trusting.observedAtMs;
    let game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;

    await dispatchAutomationV1(page, {
      kind: "pet.groom_complete",
      expectedActivityOccurrence: game.activityOccurrence,
      targetInteractionId: "interaction.pet.groom.back",
      gesture: "stroke",
      direction: "with-fur",
      speed: "slow",
      duration: "brief",
    });

    let exposure = await settleToBellyExposureV1(page, observedAtMs);
    observedAtMs = exposure.observedAtMs;
    expect(exposure.game.invitation).toBeNull();
    await expect(scene.getByText("它把肚皮露给你看了——这是信任，不是触摸邀请", { exact: true }))
      .toBeVisible();
    let bellyPoint = await findBellyPointV1(page, scene);
    const beforeWarning = await observeAutomationGameV1(page);
    await page.mouse.down();
    await page.waitForTimeout(1_050);
    await expect(scene.getByLabel("互动反馈")).toContainText("尾巴开始甩动——立刻停手");
    expect(await observeAutomationGameV1(page)).toEqual(beforeWarning);
    await page.mouse.up();
    game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
    expect(game).toMatchObject({
      trustStage: "trusting",
      lastOutcome: "warn",
      lastBellyTerminal: "stopped_in_warning",
    });

    await page.waitForTimeout(700);
    bellyPoint = await findBellyPointV1(page, scene);
    await stopBeforeBellyWarningV1(page, bellyPoint);
    game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
    expect(game).toMatchObject({
      trustStage: "trusting",
      lastOutcome: "accept",
      lastInteractionKind: "belly",
      lastInteractionTargetId: "interaction.pet.belly",
      lastBellyTerminal: "stopped_before_warning",
    });
    await expect(scene.getByText("你及时收回手，它安心地继续保持放松", { exact: true }))
      .toBeVisible();

    const firstExposureOccurrence = exposure.game.activityOccurrence;
    observedAtMs += 16 * 60_000;
    await dispatchAutomationV1(page, {
      kind: "pet.time_settle",
      mode: "session_open",
      observedAtMs,
      elapsedMs: 0,
    });
    game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
    if (game.home.returnSummary !== null) {
      await dispatchAutomationV1(page, {
        kind: "pet.return_summary_dismiss",
        expectedVisitOrdinal: game.home.returnSummary.visitOrdinal,
      });
    }

    exposure = await settleToBellyExposureV1(page, observedAtMs, firstExposureOccurrence);
    observedAtMs = exposure.observedAtMs;
    expect(exposure.game.invitation).toBeNull();
    bellyPoint = await findBellyPointV1(page, scene);
    await stopBeforeBellyWarningV1(page, bellyPoint);
    game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
    expect(game).toMatchObject({
      trustStage: "bonded",
      lastBellyTerminal: "stopped_before_warning",
    });
    expect(game.invitation).toBeNull();
    await expect(care.getByText("信赖 · 家人", { exact: true })).toBeVisible();

    exposure = await settleToBellyExposureV1(
      page,
      observedAtMs,
      exposure.game.activityOccurrence,
    );
    expect(exposure.game.invitation?.kind).toBe("belly_offer");
    await expect(care.getByText(/愿意让你短暂碰一碰腹部/u)).toBeVisible();

    bellyPoint = await findBellyPointV1(page, scene);
    await completeInvitedBellyStrokeV1(page, bellyPoint);
    game = await observeAutomationGameV1(page) as ElectronicPetAutomationViewV1;
    expect(game).toMatchObject({
      trustStage: "bonded",
      lastOutcome: "accept",
      lastInteractionKind: "belly",
      lastInteractionTargetId: "interaction.pet.belly",
      lastBellyTerminal: "completed_before_warning",
    });
    await expect(scene.getByText("它放松前爪，舒服地接受了短暂触碰", { exact: true }))
      .toBeVisible();
  });

  test("throws the bonded invitation ball through the 3D room and receives it back", async ({ page }) => {
    const { scene, care } = await reachBringBallInvitationV1(page);
    await expect(scene.getByText("它叼着小球，正在邀请你一起玩", { exact: true })).toBeVisible();
    await expect(care.getByText(/Mochi 把小球叼到你面前/u)).toBeVisible();
    await expect(care.getByRole("button", { name: "一起玩逗猫棒" })).toHaveCount(0);

    const canvas = scene.getByLabel("小猫与房间的三维互动场景");
    const feedback = scene.getByLabel("互动反馈");
    const ball = await findBallPointV1(page, scene);
    const box = await canvas.boundingBox();
    if (box === null) throw new TypeError("player canvas geometry unavailable");
    await page.mouse.down();
    await page.mouse.move(
      Math.min(box.x + box.width - 28, ball.x + Math.min(180, box.width * 0.24)),
      Math.min(box.y + box.height - 28, ball.y + Math.min(90, box.height * 0.14)),
      { steps: 8 },
    );
    await expect(feedback).toContainText("松手投球");
    await page.mouse.up();

    await expect(feedback).not.toContainText("松手投球");
    await expect(feedback).toContainText("Mochi 把球叼回来了", { timeout: 4_000 });
    await expect(scene.getByText("Mochi 追上小球，又把它叼回到你面前", { exact: true }))
      .toBeVisible();
    expect(await observeAutomationGameV1(page)).toMatchObject({
      trustStage: "bonded",
      activityId: "observe_player",
      invitation: null,
      lastOutcome: "accept",
      lastInteractionKind: "play",
      lastInteractionTargetId: "toy.ball",
    });

    await page.waitForTimeout(1_500);
    const modelResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname.endsWith(catModelPathV1)
    );
    await page.reload();
    expect((await modelResponse).ok()).toBe(true);
    const reopened = page.getByRole("region", { name: "小猫的新家" });
    await expect(reopened).toHaveAttribute("data-pet-scene-status", "ready");
    await expect(reopened.getByText("Mochi 追上小球，又把它叼回到你面前", { exact: true }))
      .toBeVisible();
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
    const toolControl = scene.locator(".pet-scene__tool-control");
    const care = page.getByRole("complementary", { name: "照料与关系" });
    const [toolBox, careBox] = await Promise.all([
      toolControl.boundingBox(),
      care.boundingBox(),
    ]);
    if (toolBox === null || careBox === null) {
      throw new TypeError("narrow product controls geometry unavailable");
    }
    expect(toolBox.y + toolBox.height).toBeLessThan(careBox.y);
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

  test("opens the dev-only 3D Inspector with current behavior, brush, and grooming volume", async ({ page }) => {
    const { scene: playerScene } = await completeFirstApproachV1(
      page,
      "pointer",
      "?capability=automation_bridge",
    );
    const gameBeforeAuthoring = await observeAutomationGameV1(page);
    await page.setViewportSize({ width: 390, height: 844 });
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
    await expect(hierarchy.getByRole("button", { name: /Grooming brush/u })).toBeVisible();
    await expect(hierarchy.getByRole("button", { name: /Back grooming interaction/u }))
      .toBeVisible();
    await expect(hierarchy.getByRole("button", { name: /Belly interaction/u })).toBeVisible();
    await expect(hierarchy.getByRole("button", { name: /Ball toy/u })).toBeVisible();
    await expect(companion.getByLabel("3D authoring preview")).toBeVisible();
    await expect(companion.locator('[data-pet-authoring-message="true"]')).toHaveText(
      "3D preview ready",
    );
    const actions = companion.locator(".pet-authoring__actions");
    const [actionsBox, actionButtonBoxes] = await Promise.all([
      actions.boundingBox(),
      actions.getByRole("button").evaluateAll((buttons) =>
        buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        })
      ),
    ]);
    if (actionsBox === null) throw new TypeError("narrow authoring actions geometry unavailable");
    expect(actionButtonBoxes).toHaveLength(4);
    for (const box of actionButtonBoxes) {
      expect(box.left).toBeGreaterThanOrEqual(actionsBox.x);
      expect(box.right).toBeLessThanOrEqual(actionsBox.x + actionsBox.width);
    }
    await expect(companion.getByRole("button", { name: "Save source" })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(playerScene).toHaveAttribute("data-pet-scene-status", "ready");

    const runtime = companion.locator('[data-pet-runtime-inspector="current"]');
    await expect(runtime).toBeVisible();
    await expect(runtime).toHaveAttribute("data-activity-reason", "social_interest");
    await expect(runtime.getByText("Live behavior · read only", { exact: true })).toBeVisible();
    await expect(runtime.getByText("approach_player", { exact: true })).toBeVisible();
    await expect(runtime.getByText("social_interest", { exact: true })).toBeVisible();
    expect(await observeAutomationGameV1(page)).toEqual(gameBeforeAuthoring);

    const properties = companion.getByRole("complementary", { name: "Selected object properties" });
    await hierarchy.getByRole("button", { name: /Ball toy/u }).click();
    await expect(properties.locator("header code")).toHaveText("pet.toy");
    await expect(properties).toContainText(
      "Toy · toy.ball · Action · pet.play_complete · Behavior · pet.game.companion",
    );
    await hierarchy.getByRole("button", { name: /New kitten/u }).click();
    await expect(properties.locator("header code")).toHaveText("pet.cat");
    await expect(properties.getByText("Socket · cat.mouth", { exact: true })).toBeVisible();
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

    await hierarchy.getByRole("button", { name: /Grooming brush/u }).click();
    await expect(properties.locator("header code")).toHaveText("pet.tool.brush");
    await expect(properties.getByText("electronic-pet.tool.brush", { exact: true })).toBeVisible();
    await hierarchy.getByRole("button", { name: /Back grooming interaction/u }).click();
    await expect(properties.locator("header code")).toHaveText("pet.interaction.groom.back");
    await expect(properties.getByRole("spinbutton", { name: "Radius" })).toHaveValue("0.3");
    await expect(properties).toContainText("grooming · Action · care.groom.back");

    await hierarchy.getByRole("button", { name: /Belly interaction/u }).click();
    await expect(properties.locator("header code")).toHaveText("pet.interaction.belly");
    await expect(properties.getByRole("spinbutton", { name: "Radius" })).toHaveValue("0.32");
    await expect(properties).toContainText("belly · Action · pet.touch_belly");
    const bellyDirection = properties.getByRole("group", { name: "Preferred fur direction" });
    await expect(bellyDirection.getByRole("spinbutton", { name: "X" })).toHaveValue("0");
    await expect(bellyDirection.getByRole("spinbutton", { name: "Y" })).toHaveValue("0");
    await expect(bellyDirection.getByRole("spinbutton", { name: "Z" })).toHaveValue("-1");

    await hierarchy.getByRole("button", { name: /Neck and shoulder interaction/u }).click();
    await expect(properties.locator("header code")).toHaveText("pet.interaction.neck");
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

test.describe("Electronic Pet direct touch input", () => {
  test.use({ hasTouch: true });

  test("throws the bonded ball with native touch at the narrow product layout", async ({ browserName, page }) => {
    test.skip(
      browserName !== "chromium",
      "Playwright exposes native touch-drag injection through Chromium CDP only",
    );
    const { scene } = await reachBringBallInvitationV1(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectViewportFitV1(page, scene);
    const canvas = scene.getByLabel("小猫与房间的三维互动场景");
    const feedback = scene.getByLabel("互动反馈");
    const ball = await findBallPointV1(page, scene);
    const box = await canvas.boundingBox();
    if (box === null) throw new TypeError("player canvas geometry unavailable");
    const target = {
      x: Math.min(box.x + box.width - 24, ball.x + Math.min(140, box.width * 0.4)),
      y: Math.min(box.y + box.height - 24, ball.y + Math.min(86, box.height * 0.18)),
    };
    const client = await page.context().newCDPSession(page);
    let touchActive = false;
    try {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [ball],
      });
      touchActive = true;
      await expect(feedback).toContainText("拖向房间空处");
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [target],
      });
      await expect(feedback).toContainText("松手投球");
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      touchActive = false;
      await expect(scene.getByText("Mochi 追上小球，又把它叼回到你面前", { exact: true }))
        .toBeVisible({ timeout: 4_000 });
      expect(await observeAutomationGameV1(page)).toMatchObject({
        activityId: "observe_player",
        lastOutcome: "accept",
        lastInteractionKind: "play",
      });
    } finally {
      if (touchActive) {
        await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
      await client.detach();
    }
  });

  test("ignores a tap and routes one real touch stroke through the same semantic action", async ({ browserName, page }) => {
    test.skip(
      browserName !== "chromium",
      "Playwright exposes native touch-drag injection through Chromium CDP only",
    );
    const client = await page.context().newCDPSession(page);
    let touchActive = false;
    try {
      const hiddenScene = await openReadyPetSceneV1(page);
      const hiddenFeedback = hiddenScene.getByLabel("互动反馈");
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
      const pointerFeedback = scene.getByLabel("互动反馈");
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

  test("keeps brush selection transient and commits one grooming result from native touch", async ({ browserName, page }) => {
    test.skip(
      browserName !== "chromium",
      "Playwright exposes native touch-drag injection through Chromium CDP only",
    );
    const { scene } = await reachTrustingV1(page);
    await scene.getByRole("button", { name: /拿起梳子/u }).click();
    const point = await findGroomingPointV1(page, scene);
    const feedback = scene.getByLabel("互动反馈");
    const occurrence = scene.locator("[data-pet-reaction-occurrence]");
    const client = await page.context().newCDPSession(page);
    let touchActive = false;
    try {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [point],
      });
      touchActive = true;
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      touchActive = false;
      await expect(feedback).toContainText("再梳长一点");
      await expect(occurrence).toHaveAttribute("data-pet-reaction-occurrence", "1");

      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [point],
      });
      touchActive = true;
      for (const offset of [8, 16, 26]) {
        await client.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: point.x - offset, y: point.y }],
        });
      }
      await page.waitForTimeout(350);
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      touchActive = false;
      await expect(occurrence).toHaveAttribute("data-pet-reaction-occurrence", "2");
      expect(await observeAutomationGameV1(page)).toMatchObject({
        trustStage: "trusting",
        lastOutcome: "accept",
        lastInteractionKind: "grooming",
      });
    } finally {
      if (touchActive) {
        await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
      await client.detach();
    }
  });
});
