// SPDX-License-Identifier: MIT
import { AxeBuilder } from "@axe-core/playwright";
import { defaultPlayerProfileV1 } from "@sillymaker/base/runtime";
import type { Page } from "@playwright/test";

import {
  SILLYMAKER_DATABASE_VERSION_V1,
  SILLYMAKER_RECORD_STORE_NAME_V1,
} from "../../engine/packages/web/src/host/indexeddb-record-store.ts";

import { expect, test, vnReferenceTourTargetUrlV1 } from "./fixtures.ts";

const automationKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";
const databaseNameV1 = "sillymaker.example-vn-reference-tour";
const profileKeyV1 = "player-profile/story.example.vn-reference-tour";
const oldCallAssetIdV1 = "voice.vn-reference-tour.zhou-old-call";
const authoredAudioPathsV1 = [
  "/assets/audio/bgm-last-shift.mp3",
  "/assets/audio/ambient-control-room.mp3",
  "/assets/audio/ambient-rooftop.mp3",
  "/assets/audio/sfx-tape.mp3",
  "/assets/audio/sfx-switch.mp3",
  "/assets/audio/sfx-relay.mp3",
  "/assets/audio/voice-old-call.mp3",
  "/assets/audio/voice-present-sent.mp3",
] as const;

interface VnPublicationV1 {
  readonly revision: number;
  readonly game: {
    readonly audio: {
      readonly bgm: unknown;
      readonly ambient: unknown;
      readonly voice: { readonly assetId: string } | null;
    };
    readonly stage: unknown;
  };
  readonly narrative: {
    readonly phase: "idle" | "active" | "completed";
    readonly signalChoice: "archive" | "present" | null;
    readonly history: {
      readonly entries: readonly { readonly occurrenceId: string }[];
    };
    readonly pending: {
      readonly kind: string;
      readonly occurrenceId: string;
      readonly totalMs?: number;
      readonly remainingMs?: number;
      readonly tickQuantumMs?: number;
    } | null;
  };
}

async function expectNoWcagViolationsV1(page: Page, surface: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
    .analyze();
  expect(results.violations, `axe violations on ${surface}`).toEqual([]);
}

async function seedPlayerLocaleV1(page: Page, locale: string): Promise<void> {
  await page.evaluate(
    async ({ databaseName, databaseVersion, profile, profileKey, storeName }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName, databaseVersion);
        request.addEventListener("success", () => resolve(request.result));
        request.addEventListener(
          "error",
          () =>
            reject(request.error ?? new Error("player profile fixture could not open IndexedDB")),
        );
      });
      try {
        const encoded = new TextEncoder().encode(JSON.stringify(profile));
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(storeName, "readwrite");
          transaction.objectStore(storeName).put({
            namespace: "settings",
            key: profileKey,
            revision: 1,
            bytes: encoded.buffer,
          });
          transaction.addEventListener("complete", () => resolve());
          transaction.addEventListener(
            "error",
            () => reject(transaction.error ?? new Error("player profile fixture write failed")),
          );
          transaction.addEventListener(
            "abort",
            () => reject(transaction.error ?? new Error("player profile fixture write aborted")),
          );
        });
      } finally {
        database.close();
      }
    },
    {
      databaseName: databaseNameV1,
      databaseVersion: SILLYMAKER_DATABASE_VERSION_V1,
      profile: {
        ...defaultPlayerProfileV1,
        preferences: { ...defaultPlayerProfileV1.preferences, locale },
      },
      profileKey: profileKeyV1,
      storeName: SILLYMAKER_RECORD_STORE_NAME_V1,
    },
  );
}

async function expectInteractiveSurfaceFitsV1(
  page: Page,
  options: { readonly interactiveRoot?: string; readonly checkDialogue?: boolean } = {},
): Promise<void> {
  const layout = await page.evaluate(({ checkDialogue, interactiveRoot }) => {
    const canvas = document.querySelector<HTMLElement>("[data-game-viewport-canvas]") ??
      document.querySelector<HTMLElement>("[data-title-screen='true']");
    if (canvas === null) throw new TypeError("VN interactive surface missing");
    const canvasRect = canvas.getBoundingClientRect();
    const interactiveSurface = interactiveRoot === null
      ? canvas
      : document.querySelector<HTMLElement>(interactiveRoot);
    if (interactiveSurface === null) throw new TypeError("VN selected interactive root missing");
    const visibleControls = [
      ...interactiveSurface.querySelectorAll<HTMLElement>("button:not(:disabled)"),
    ]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return ({ width: rect.width, height: rect.height });
      });
    const dialogueText = checkDialogue
      ? canvas.querySelector<HTMLElement>("[data-dialogue='say'] p")
      : null;
    const playback = checkDialogue
      ? canvas.querySelector<HTMLElement>("[data-default-vn-player] nav")
      : null;
    return {
      canvas: {
        left: canvasRect.left,
        top: canvasRect.top,
        right: canvasRect.right,
        bottom: canvasRect.bottom,
        clientWidth: canvas.clientWidth,
        scrollWidth: canvas.scrollWidth,
      },
      viewport: { width: innerWidth, height: innerHeight },
      controlCount: visibleControls.length,
      minimumControlWidth: Math.min(...visibleControls.map(({ width }) => width)),
      minimumControlHeight: Math.min(...visibleControls.map(({ height }) => height)),
      dialogueBottom: dialogueText?.getBoundingClientRect().bottom ?? null,
      playbackTop: playback?.getBoundingClientRect().top ?? null,
    };
  }, {
    checkDialogue: options.checkDialogue ?? true,
    interactiveRoot: options.interactiveRoot ?? null,
  });
  expect(layout.canvas.left).toBeGreaterThanOrEqual(0);
  expect(layout.canvas.top).toBeGreaterThanOrEqual(0);
  expect(layout.canvas.right).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.canvas.bottom).toBeLessThanOrEqual(layout.viewport.height);
  expect(layout.canvas.scrollWidth).toBeLessThanOrEqual(layout.canvas.clientWidth);
  expect(layout.controlCount).toBeGreaterThan(0);
  expect(layout.minimumControlWidth).toBeGreaterThanOrEqual(44);
  expect(layout.minimumControlHeight).toBeGreaterThanOrEqual(44);
  if (layout.dialogueBottom !== null && layout.playbackTop !== null) {
    expect(layout.dialogueBottom).toBeLessThanOrEqual(layout.playbackTop);
  }
}

async function observeV1(page: Page): Promise<VnPublicationV1> {
  const result = await page.evaluate((key) => {
    const automation = Reflect.get(globalThis, key) as
      | { observe(): { readonly kind: string; readonly value?: unknown } }
      | undefined;
    return automation?.observe() ?? { kind: "capability_disabled" };
  }, automationKeyV1);
  expect(result.kind).toBe("ok");
  return result.value as VnPublicationV1;
}

async function advanceCurrentSayV1(page: Page, pending: {
  readonly occurrenceId: string;
}): Promise<void> {
  await dispatchV1(page, {
    kind: "resolve",
    expectedOccurrenceId: pending.occurrenceId,
    resolution: { kind: "advance" },
  });
}

async function dispatchV1(page: Page, invocation: unknown): Promise<void> {
  const result = await page.evaluate(
    async ({ key, invocation: bridgeInvocation }) => {
      const automation = Reflect.get(globalThis, key) as
        | { dispatch(invocation: unknown): Promise<{ readonly kind: string }> }
        | undefined;
      if (automation === undefined) throw new TypeError("automation bridge unavailable");
      return await automation.dispatch(bridgeInvocation);
    },
    { key: automationKeyV1, invocation },
  );
  expect(result.kind).toBe("ok");
}

async function finishArchiveRouteV1(page: Page): Promise<void> {
  for (let step = 0; step < 64; step += 1) {
    const publication = await observeV1(page);
    if (publication.narrative.phase === "completed") return;
    const pending = publication.narrative.pending;
    if (pending === null) throw new TypeError("active VN route has no pending interaction");

    if (pending.kind === "say") {
      await advanceCurrentSayV1(page, pending);
      continue;
    }
    if (pending.kind === "choice") {
      await dispatchV1(page, {
        kind: "resolve",
        expectedOccurrenceId: pending.occurrenceId,
        resolution: {
          kind: "choose",
          choiceId: "choice.vn-reference-tour.archive-voice",
        },
      });
      continue;
    }
    if (pending.kind === "hold" && pending.remainingMs !== undefined) {
      await dispatchV1(page, {
        kind: "time",
        tick: {
          elapsedMs: pending.remainingMs,
          expectedHoldOccurrenceId: pending.occurrenceId,
        },
      });
      continue;
    }
    if (pending.kind === "presentation_barrier") {
      await expect.poll(
        async () => (await observeV1(page)).narrative.pending?.occurrenceId,
        { timeout: 4_000 },
      ).not.toBe(pending.occurrenceId);
      continue;
    }
    throw new TypeError(`unexpected VN route boundary: ${pending.kind}`);
  }
  throw new TypeError("archive route did not finish within its frozen denominator");
}

async function reachSignalChoiceV1(page: Page): Promise<VnPublicationV1> {
  for (let step = 0; step < 40; step += 1) {
    const publication = await observeV1(page);
    const pending = publication.narrative.pending;
    if (pending?.kind === "choice") return publication;
    if (pending?.kind === "say") {
      await advanceCurrentSayV1(page, pending);
      continue;
    }
    if (pending?.kind === "presentation_barrier") {
      await expect.poll(
        async () => (await observeV1(page)).narrative.pending?.occurrenceId,
        { timeout: 4_000 },
      ).not.toBe(pending.occurrenceId);
      continue;
    }
    if (pending?.kind === "hold" && pending.remainingMs !== undefined) {
      await dispatchV1(page, {
        kind: "time",
        tick: {
          elapsedMs: pending.remainingMs,
          expectedHoldOccurrenceId: pending.occurrenceId,
        },
      });
      continue;
    }
    throw new TypeError(`unexpected VN boundary before choice: ${pending?.kind ?? "none"}`);
  }
  throw new TypeError("signal choice was not reached");
}

async function reachRouteHoldV1(
  page: Page,
  route: "archive" | "present",
): Promise<VnPublicationV1> {
  const atChoice = await reachSignalChoiceV1(page);
  const choiceId = route === "archive"
    ? "choice.vn-reference-tour.archive-voice"
    : "choice.vn-reference-tour.present-voice";
  const choice = atChoice.narrative.pending;
  if (choice?.kind !== "choice") throw new TypeError("signal Choice missing");
  await dispatchV1(page, {
    kind: "resolve",
    expectedOccurrenceId: choice.occurrenceId,
    resolution: { kind: "choose", choiceId },
  });

  for (let step = 0; step < 12; step += 1) {
    const publication = await observeV1(page);
    const pending = publication.narrative.pending;
    if (pending?.kind === "hold") return publication;
    if (pending?.kind === "say") {
      await advanceCurrentSayV1(page, pending);
      continue;
    }
    if (pending?.kind === "presentation_barrier") {
      await expect.poll(
        async () => (await observeV1(page)).narrative.pending?.occurrenceId,
        { timeout: 4_000 },
      ).not.toBe(pending.occurrenceId);
      continue;
    }
    throw new TypeError(`unexpected VN boundary before route Hold: ${pending?.kind ?? "none"}`);
  }
  throw new TypeError("route Hold was not reached");
}

async function reachOldCallV1(page: Page): Promise<VnPublicationV1> {
  await page.goto(vnReferenceTourTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );

  for (let step = 0; step < 24; step += 1) {
    const publication = await observeV1(page);
    if (publication.game.audio.voice?.assetId === oldCallAssetIdV1) return publication;
    const pending = publication.narrative.pending;
    if (pending?.kind === "say") {
      await advanceCurrentSayV1(page, pending);
      continue;
    }
    // Stage barriers acknowledge through the real mounted Stage host.
    if (pending?.kind === "presentation_barrier") {
      await page.waitForTimeout(450);
      continue;
    }
    throw new TypeError(`unexpected VN boundary before old call: ${pending?.kind ?? "none"}`);
  }
  throw new TypeError("old-call voice boundary was not reached");
}

test("VN Player reflows across wide, portrait, and 200% equivalent viewports", async ({ page }) => {
  const viewports = [
    { width: 1_280, height: 720 },
    { width: 360, height: 640 },
    // A 1280 x 720 product canvas reflowed into half its CSS-pixel viewport.
    { width: 640, height: 360 },
  ] as const;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(vnReferenceTourTargetUrlV1());
    await expect(page.locator("[data-title-screen='true']")).toBeVisible();
    await expectInteractiveSurfaceFitsV1(page);

    await page.getByRole("button", { name: "新游戏" }).click();
    const advance = page.locator("[data-dialogue-advance='true']");
    const history = page.getByRole("button", { name: "历史" });
    await expect(advance).toBeVisible();
    await expect(history).toBeDisabled();

    await advance.click();
    await expect(page.locator("[data-dialogue-reveal='complete']")).toBeVisible();
    await expectInteractiveSurfaceFitsV1(page);

    await page.keyboard.press("Shift+Tab");
    await expect.poll(() =>
      page.locator("[data-default-vn-player] nav").evaluate((navigation) =>
        navigation.contains(document.activeElement)
      )
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-narrative-surface-focus-scope]")).toBeFocused();

    const menu = page.getByRole("dialog", { name: "菜单" });
    const occurrenceBeforeMenu = await page.locator("[data-dialogue='say']").getAttribute(
      "data-dialogue-occurrence",
    );
    await page.keyboard.press("Escape");
    await expect(menu).toBeVisible();
    await expect(page.locator("[data-dialogue='say']")).toHaveAttribute(
      "data-dialogue-occurrence",
      occurrenceBeforeMenu ?? "",
    );
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    await advance.click({ button: "right" });
    await expect(menu).toBeVisible();
    await expect(page.locator("[data-dialogue='say']")).toHaveAttribute(
      "data-dialogue-occurrence",
      occurrenceBeforeMenu ?? "",
    );
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    await advance.click();
    await expect(history).toBeEnabled();
    await history.click();
    await expect(page.getByRole("dialog", { name: "对话历史" })).toBeVisible();
    await expectInteractiveSurfaceFitsV1(page, {
      interactiveRoot: "[data-default-vn-player='history']",
      checkDialogue: false,
    });
    await page.locator("[data-dialogue-history-close='true']").click({ button: "right" });
    await expect(page.getByRole("dialog", { name: "对话历史" })).toBeHidden();
    await expect(menu).toBeHidden();
  }
});

test("the default VN quick controls restore a saved Choice through confirmation", async ({ page }) => {
  await page.goto(vnReferenceTourTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );
  const saved = await reachSignalChoiceV1(page);
  if (saved.narrative.pending?.kind !== "choice") {
    throw new TypeError("signal Choice missing");
  }

  await page.getByRole("button", { name: "快速保存" }).click();
  await expect(page.getByRole("status")).toHaveText("快速保存完成。");
  await page.locator("[data-dialogue-choice='choice.vn-reference-tour.archive-voice']").click();
  await expect.poll(
    async () => (await observeV1(page)).narrative.pending?.occurrenceId,
  ).not.toBe(saved.narrative.pending.occurrenceId);

  await page.getByRole("button", { name: "快速读取" }).click();
  const confirmation = page.getByRole("dialog", { name: "快速读取" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "读取" }).click();
  await expect(confirmation).toBeHidden();
  await expect.poll(
    async () => (await observeV1(page)).narrative.pending?.occurrenceId,
  ).toBe(saved.narrative.pending.occurrenceId);
  const restored = await observeV1(page);
  expect(restored.narrative.history).toEqual(saved.narrative.history);
  expect(restored.game.audio).toEqual(saved.game.audio);

  await page.getByRole("button", { name: "菜单" }).click();
  await page.getByRole("dialog", { name: "菜单" }).getByRole("button", {
    name: "返回标题",
  }).click();
  await expect(page.locator("[data-title-screen='true']")).toBeVisible();
  const continueButton = page.getByRole("button", { name: "继续游戏" });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  await expect.poll(
    async () => (await observeV1(page)).narrative.pending?.occurrenceId,
  ).toBe(restored.narrative.pending?.occurrenceId);
  const continued = await observeV1(page);
  expect(continued.narrative).toEqual(restored.narrative);
  expect(continued.game).toEqual(restored.game);
});

test("the real Player commits recoverable partial Hold checkpoints", async ({ page }) => {
  await page.goto(vnReferenceTourTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );
  const enteredHold = await reachRouteHoldV1(page, "present");
  let partialHold = enteredHold;
  await expect.poll(
    async () => {
      partialHold = await observeV1(page);
      const pending = partialHold.narrative.pending;
      return pending?.kind === "hold" &&
        (pending.remainingMs ?? 1_200) > 0 &&
        (pending.remainingMs ?? 1_200) < 1_200;
    },
    { intervals: [20, 40, 60], timeout: 800 },
  ).toBe(true);
  if (partialHold.narrative.pending?.kind !== "hold") {
    throw new TypeError("partial Hold missing");
  }
  expect(partialHold.narrative.pending).toMatchObject({
    kind: "hold",
    totalMs: 1_200,
    tickQuantumMs: 200,
  });
  expect(partialHold.narrative.pending.remainingMs).toBeGreaterThan(0);
  expect(partialHold.narrative.pending.remainingMs).toBeLessThan(1_200);
  expect(partialHold.narrative.signalChoice).toBe("present");
});

test("VN Settings localize live and persist player preferences outside Save", async ({ page }) => {
  await page.goto(vnReferenceTourTargetUrlV1());
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.getByRole("button", { name: "设置" }).click();

  const settings = page.getByRole("dialog", { name: "设置" });
  await expect(settings).toBeVisible();
  const bgm = settings.locator('[data-default-settings-volume="bgm"]');
  const voice = settings.locator('[data-default-settings-volume="voice"]');
  const sfx = settings.locator('[data-default-settings-volume="sfx"]');
  const textSpeed = settings.locator('[data-default-settings-text-speed="true"]');
  const autoWait = settings.locator('[data-default-settings-auto-wait="true"]');
  const muted = settings.locator('[data-default-settings-muted="true"]');

  // The product starts audible. The repository Playwright base silences the
  // final device sink so this real audio lifecycle remains inaudible in CI.
  await expect(muted).not.toBeChecked();

  await bgm.fill("650");
  await voice.fill("750");
  await sfx.fill("500");
  await textSpeed.fill("80");
  await autoWait.fill("1200");
  await muted.check();
  await settings.getByRole("combobox", { name: "语言" }).selectOption("en");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(settings.getByRole("combobox", { name: "Language" })).toHaveValue("en");
  await expect(settings.getByText("Music volume", { exact: true })).toBeVisible();
  // The active managed candidate keeps its opening copy; the next candidate
  // reads the newly active locale.
  await settings.getByRole("button", { name: "关闭" }).click();
  await page.getByRole("button", { name: "Save / Load" }).click();
  const saves = page.getByRole("dialog", { name: "Save" });
  await expect(saves).toBeVisible();
  await saves.getByRole("button", { name: "Close" }).click();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "One Last Sound Check" })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  const restored = page.getByRole("dialog", { name: "Settings" });
  await expect(restored.locator('[data-default-settings-volume="bgm"]')).toHaveValue("650");
  await expect(restored.locator('[data-default-settings-volume="voice"]')).toHaveValue("750");
  await expect(restored.locator('[data-default-settings-volume="sfx"]')).toHaveValue("500");
  await expect(restored.locator('[data-default-settings-text-speed="true"]')).toHaveValue("80");
  await expect(restored.locator('[data-default-settings-auto-wait="true"]')).toHaveValue("1200");
  await expect(restored.locator('[data-default-settings-muted="true"]')).toBeChecked();
  await expect(restored.getByRole("combobox", { name: "Language" })).toHaveValue("en");
});

test("the middle pointer button hides and restores VN chrome without advancing", async ({ page }) => {
  await page.goto(vnReferenceTourTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );
  const occurrenceId = (await observeV1(page)).narrative.pending?.occurrenceId;
  if (occurrenceId === undefined) throw new TypeError("opening Say missing");

  const advance = page.locator("[data-dialogue-advance='true']");
  await advance.click();
  await expect(page.locator("[data-dialogue-reveal='complete']")).toBeVisible();
  await advance.click({ button: "middle" });
  const restore = page.locator("[data-dialogue-chrome-hidden='true']");
  await expect(restore).toBeVisible();
  expect((await observeV1(page)).narrative.pending?.occurrenceId).toBe(occurrenceId);

  await restore.click({ button: "middle" });
  await expect(advance).toBeVisible();
  expect((await observeV1(page)).narrative.pending?.occurrenceId).toBe(occurrenceId);
});

test("Continue reveals the latest autosave after a Browser reload", async ({ page }) => {
  await page.goto(vnReferenceTourTargetUrlV1("?capability=automation_bridge"));
  const continueButton = page.getByRole("button", { name: "继续游戏" });
  await expect(continueButton).toBeDisabled();

  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );
  const opening = await observeV1(page);
  if (opening.narrative.pending?.kind !== "say") {
    throw new TypeError("opening Say missing");
  }
  await advanceCurrentSayV1(page, opening.narrative.pending);
  const expected = await observeV1(page);
  expect(expected.narrative.history.entries).toHaveLength(1);
  // The Browser application deliberately batches autosaves; wait for the
  // maintained 800 ms quiet-period policy before exercising a real reload.
  await page.waitForTimeout(1_200);

  await page.reload();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );
  await expect(continueButton).toBeEnabled();
  const resumed = await observeV1(page);
  expect(resumed.narrative.pending?.occurrenceId).toBe(
    expected.narrative.pending?.occurrenceId,
  );
  expect(resumed.narrative.history.entries.map(({ occurrenceId }) => occurrenceId)).toEqual(
    expected.narrative.history.entries.map(({ occurrenceId }) => occurrenceId),
  );

  await continueButton.click();
  await expect(page.locator("[data-dialogue='say']")).toHaveAttribute(
    "data-dialogue-occurrence",
    expected.narrative.pending?.occurrenceId ?? "",
  );
  await expect(page.getByRole("img", { name: "夜间控制室" })).toBeVisible();
});

test(
  "@mobile touch reveals, advances, and restores the VN focus owner",
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-portrait",
      "touch evidence runs in the touch project",
    );
    await page.goto(vnReferenceTourTargetUrlV1("?capability=automation_bridge"));
    await page.getByRole("button", { name: "新游戏" }).tap();
    await page.waitForFunction(
      (key) => Reflect.get(globalThis, key) !== undefined,
      automationKeyV1,
    );

    const firstOccurrenceId = (await observeV1(page)).narrative.pending?.occurrenceId;
    if (firstOccurrenceId === undefined) throw new TypeError("opening Say missing");
    const advance = page.locator("[data-dialogue-advance='true']");
    await advance.tap({ position: { x: 40, y: 120 } });
    await expect(page.locator("[data-dialogue-reveal='complete']")).toBeVisible();
    await advance.tap({ position: { x: 40, y: 120 } });
    await expect.poll(
      async () => (await observeV1(page)).narrative.pending?.occurrenceId,
    ).not.toBe(firstOccurrenceId);
    await expect(page.locator("[data-narrative-surface-focus-scope]")).toBeFocused();

    await page.getByRole("button", { name: "历史" }).tap();
    await expect(page.getByRole("dialog", { name: "对话历史" })).toBeVisible();
    await expectInteractiveSurfaceFitsV1(page, {
      interactiveRoot: "[data-default-vn-player='history']",
      checkDialogue: false,
    });
    await page.locator("[data-dialogue-history-close='true']").tap();
    await expect(page.getByRole("dialog", { name: "对话历史" })).toBeHidden();
  },
);

test("English and reduced-motion remain complete through title, choice, History, and ending", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(vnReferenceTourTargetUrlV1("?capability=automation_bridge"));
  await expect(page.locator("#sillymaker-application-boot-shell")).toHaveAttribute(
    "data-sillymaker-startup-state",
    "ready",
  );
  await seedPlayerLocaleV1(page, "en");
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("application", { name: "One Last Sound Check" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One Last Sound Check" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New game" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Load game" })).toBeVisible();
  await expect(page.getByRole("button", { name: /新游戏|读取存档|设置/ })).toHaveCount(0);
  await expectInteractiveSurfaceFitsV1(page);
  await expectNoWcagViolationsV1(page, "English title");

  await page.getByRole("button", { name: "New game" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );
  await expect(page.locator("[data-dialogue-reveal='complete']")).toBeVisible();
  await expect(page.getByRole("img", { name: "Night control room" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Mixing console" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Zhou Yao" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Playback controls" })).toBeVisible();
  await expect(page.getByRole("button", { name: "History" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Q.Save" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Q.Load" })).toBeVisible();
  await expectInteractiveSurfaceFitsV1(page);
  await expectNoWcagViolationsV1(page, "English dialogue");

  await page.getByRole("button", { name: "Menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button", { name: "Preferences" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Save / Load" })).toBeVisible();
  await menu.getByRole("button", { name: "Save / Load" }).click();
  await expect(page.getByRole("dialog", { name: "Save" })).toBeVisible();
  await expect(page.getByRole("button", { name: /快速保存|手动保存|导入存档/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Save" })).toBeHidden();

  await reachSignalChoiceV1(page);
  await expect(page.getByText("The archive window permits one final transmission.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send the restored station call" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record a new call for this moment" }))
    .toBeVisible();
  await expectInteractiveSurfaceFitsV1(page);
  await expectNoWcagViolationsV1(page, "English choice");

  await page.getByRole("button", { name: "Send the restored station call" }).click();
  await expect(page.getByRole("button", { name: "History" })).toBeEnabled();
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("dialog", { name: "Dialogue history" })).toBeVisible();
  await expectInteractiveSurfaceFitsV1(page, {
    interactiveRoot: "[data-default-vn-player='history']",
    checkDialogue: false,
  });
  await expectNoWcagViolationsV1(page, "English History");
  await page.locator("[data-dialogue-history-close='true']").click();

  await finishArchiveRouteV1(page);
  await expect(page.getByRole("heading", { name: "The Old Voice, Archived" })).toBeVisible();
  await expect(page.getByText("Broadcast complete")).toBeVisible();
  await expect(page.getByRole("button", { name: "Return to title" })).toBeVisible();
  await expectInteractiveSurfaceFitsV1(page);
  await expectNoWcagViolationsV1(page, "English ending");
});

test("the frozen VN audio denominator decodes in Browser", async ({ page }) => {
  await page.goto(vnReferenceTourTargetUrlV1());
  await page.getByRole("button", { name: "新游戏" }).click();
  const decoded = await page.evaluate(async (paths) => {
    const context = new AudioContext();
    await context.resume();
    try {
      return await Promise.all(paths.map(async (path) => {
        const response = await fetch(path);
        if (!response.ok) return { path, status: response.status, duration: null };
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        return { path, status: response.status, duration: buffer.duration };
      }));
    } finally {
      await context.close();
    }
  }, authoredAudioPathsV1);
  expect(decoded.map(({ path }) => path)).toEqual(authoredAudioPathsV1);
  expect(decoded.every(({ status, duration }) => status === 200 && (duration ?? 0) > 0)).toBe(true);
});

test("VN Back and Forward navigate interaction checkpoints through physical input", async ({ page }) => {
  await page.goto(vnReferenceTourTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );

  const first = await observeV1(page);
  const firstPending = first.narrative.pending;
  if (firstPending?.kind !== "say") throw new TypeError("opening Say missing");
  await advanceCurrentSayV1(page, firstPending);
  const secondOccurrenceId = (await observeV1(page)).narrative.pending?.occurrenceId;
  if (secondOccurrenceId === undefined) throw new TypeError("second Say missing");

  const back = page.getByRole("button", { name: "回退" });
  const forward = page.getByRole("button", { name: "前进" });
  await expect(back).toBeEnabled();
  await expect(forward).toBeDisabled();

  const stage = await page.locator("[data-stage-root='true']").boundingBox();
  if (stage === null) throw new TypeError("VN stage missing");
  await page.mouse.move(stage.x + 24, stage.y + 24);
  await page.mouse.wheel(0, -200);
  await expect.poll(
    async () => (await observeV1(page)).narrative.pending?.occurrenceId,
  ).toBe(firstPending.occurrenceId);
  await expect(forward).toBeEnabled();

  await page.keyboard.press("PageDown");
  await expect.poll(
    async () => (await observeV1(page)).narrative.pending?.occurrenceId,
  ).toBe(secondOccurrenceId);
  await expect(forward).toBeDisabled();

  await page.keyboard.press("PageUp");
  await expect.poll(
    async () => (await observeV1(page)).narrative.pending?.occurrenceId,
  ).toBe(firstPending.occurrenceId);
  await advanceCurrentSayV1(page, firstPending);
  await expect(forward).toBeDisabled();
});

test("the completed ending keeps physical Back and Forward navigation available", async ({ page }) => {
  await page.goto(vnReferenceTourTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );
  await finishArchiveRouteV1(page);

  const ending = page.locator("[data-vn-reference-tour-ending='true']");
  await expect(ending).toBeVisible();
  await expect(page.getByRole("button", { name: "返回标题" })).not.toBeFocused();

  await page.keyboard.press("PageUp");
  await expect(ending).toBeHidden();
  await expect(page.getByRole("button", { name: "继续" })).toBeVisible();

  await page.keyboard.press("PageDown");
  await expect(ending).toBeVisible();

  const completed = await observeV1(page);
  expect(completed.narrative.phase).toBe("completed");
  await page.getByRole("button", { name: "返回标题" }).click();
  await expect(page.locator("[data-title-screen='true']")).toBeVisible();
  const continueButton = page.getByRole("button", { name: "继续游戏" });
  await expect(continueButton).toBeEnabled();

  await continueButton.click();
  await expect(ending).toBeVisible();
  expect((await observeV1(page)).narrative.phase).toBe("completed");
});

test("VN audio unlocks and Player Auto waits for replayed current voice", async ({ page }) => {
  const loadedAudio = new Set<string>();
  page.on("response", (response) => {
    const pathname = new URL(response.url()).pathname;
    if (response.ok() && pathname.endsWith(".mp3")) loadedAudio.add(pathname);
  });

  const publication = await reachOldCallV1(page);
  const occurrenceId = publication.narrative.pending?.occurrenceId;
  if (occurrenceId === undefined) throw new TypeError("old-call occurrence missing");
  // The visible Title pre-creates the suspended AudioContext; New Game
  // supplies the gesture that unlocks it. The first demand may start
  // immediately or queue until that resume settles.
  await page.getByRole("button", { name: "语音" }).click();
  await expect.poll(() => loadedAudio.has("/assets/audio/voice-old-call.mp3")).toBe(true);
  expect(loadedAudio).toContain("/assets/audio/bgm-last-shift.mp3");
  expect(loadedAudio).toContain("/assets/audio/ambient-control-room.mp3");

  // Let the first playback finish, then prove an explicit replay establishes
  // a fresh full voice lifetime rather than relying on the unlock playback.
  await page.waitForTimeout(6_300);
  await page.getByRole("button", { name: "语音" }).click();
  await page.getByRole("button", { name: "自动" }).click();
  await page.waitForTimeout(2_000);
  expect((await observeV1(page)).narrative.pending?.occurrenceId).toBe(occurrenceId);
  await page.waitForFunction(
    ({ key, expectedOccurrenceId }) => {
      const automation = Reflect.get(globalThis, key) as
        | { observe(): { readonly kind: string; readonly value?: unknown } }
        | undefined;
      const current = automation?.observe().value as VnPublicationV1 | undefined;
      return current?.narrative.pending?.occurrenceId !== expectedOccurrenceId;
    },
    { key: automationKeyV1, expectedOccurrenceId: occurrenceId },
    { timeout: 10_000 },
  );
});

test("unreadable current voice degrades to silence and does not park Auto", async ({ page }) => {
  await page.route(
    "**/assets/audio/voice-old-call.mp3",
    (route) =>
      route.fulfill({ status: 200, contentType: "audio/mpeg", body: "not an audio stream" }),
  );
  const publication = await reachOldCallV1(page);
  const occurrenceId = publication.narrative.pending?.occurrenceId;
  if (occurrenceId === undefined) throw new TypeError("old-call occurrence missing");

  await page.getByRole("button", { name: "语音" }).click();
  await page.getByRole("button", { name: "自动" }).click();
  await expect.poll(
    async () => (await observeV1(page)).narrative.pending?.occurrenceId,
    { timeout: 4_000 },
  ).not.toBe(occurrenceId);
});
