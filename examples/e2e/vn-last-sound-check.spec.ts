// SPDX-License-Identifier: MIT
import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { expect, test, vnLastSoundCheckTargetUrlV1 } from "./fixtures.ts";

const automationKeyV1 = "__SILLYMAKER_AUTOMATION_V1__";
const productInteractionBudgetV1 = 82;
const oldCallAssetIdV1 = "voice.vn-last-sound-check.zhou-old-call";
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
        if (element.closest('[data-silly-tool-surface="true"]') !== null) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return ({
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        });
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
      controlFloor: matchMedia("(pointer: coarse)").matches ? 44 : 32,
      minimumControlWidth: Math.min(...visibleControls.map(({ width }) => width)),
      minimumControlHeight: Math.min(...visibleControls.map(({ height }) => height)),
      controlsWithinCanvas: visibleControls.every((rect) =>
        rect.left >= canvasRect.left - 1 &&
        rect.top >= canvasRect.top - 1 &&
        rect.right <= canvasRect.right + 1 &&
        rect.bottom <= canvasRect.bottom + 1
      ),
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
  expect(layout.minimumControlWidth).toBeGreaterThanOrEqual(layout.controlFloor);
  expect(layout.minimumControlHeight).toBeGreaterThanOrEqual(layout.controlFloor);
  expect(layout.controlsWithinCanvas).toBe(true);
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

async function openHistoryModDevelopmentPanelV1(page: Page) {
  const launcher = page.locator("[data-development-tool-panel]");
  await launcher.getByRole("button", { name: "调试" }).click();
  await expect(page.getByRole("group", { name: "调试" })).toBeVisible();
  await page.getByRole("button", { name: "History Mod" }).click();
  const window = page.locator(
    '[data-devdock-window="vn-last-sound-check.history-mod"]',
  );
  await expect(window).toBeVisible();
  return window;
}

async function loadHistoryModV1(page: Page): Promise<void> {
  const window = await openHistoryModDevelopmentPanelV1(page);
  const status = window.locator("[data-vn-history-mod-status]");
  if (await status.getAttribute("data-vn-history-mod-status") !== "loaded") {
    await window.locator("[data-vn-history-mod-load='true']").click();
  }
  await expect(status).toHaveAttribute("data-vn-history-mod-status", "loaded");
  await window.locator("[data-devdock-window-close='true']").click();
  await expect(window).toBeHidden();
}

async function unloadHistoryModV1(page: Page): Promise<void> {
  const window = await openHistoryModDevelopmentPanelV1(page);
  const status = window.locator("[data-vn-history-mod-status]");
  await expect(status).toHaveAttribute("data-vn-history-mod-status", "loaded");
  await window.locator("[data-vn-history-mod-unload='true']").click();
  await expect(status).toHaveAttribute("data-vn-history-mod-status", "idle");
  await window.locator("[data-devdock-window-close='true']").click();
  await expect(window).toBeHidden();
}

async function finishArchiveRouteV1(page: Page): Promise<void> {
  for (let step = 0; step < productInteractionBudgetV1; step += 1) {
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
          choiceId: "choice.vn-last-sound-check.archive-voice",
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
  for (let step = 0; step < productInteractionBudgetV1; step += 1) {
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
    ? "choice.vn-last-sound-check.archive-voice"
    : "choice.vn-last-sound-check.present-voice";
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
  await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );

  for (let step = 0; step < productInteractionBudgetV1; step += 1) {
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
    { width: 1_280, height: 720, maxTextSize: 18, maxDialogueRatio: 0.24 },
    { width: 360, height: 640, maxTextSize: 17, maxDialogueRatio: 0.36 },
    // A 1280 x 720 product canvas reflowed into half its CSS-pixel viewport.
    { width: 640, height: 360, maxTextSize: 16, maxDialogueRatio: 0.4 },
  ] as const;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(vnLastSoundCheckTargetUrlV1());
    await expect(page.locator("[data-title-screen='true']")).toBeVisible();
    await expectInteractiveSurfaceFitsV1(page);
    const titleDensity = await page.locator("[data-title-screen='true']").evaluate((root) => {
      const canvas = root.closest("[data-game-viewport-canvas]") ?? root;
      const heading = root.querySelector("h1");
      const menu = root.querySelector("[data-title-menu='true']");
      if (heading === null || menu === null) throw new TypeError("VN title geometry missing");
      const canvasRect = canvas.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      return {
        envelopeBlockRatio: (Math.max(headingRect.bottom, menuRect.bottom) -
          Math.min(headingRect.top, menuRect.top)) / canvasRect.height,
        envelopeInlineRatio: Math.max(headingRect.width, menuRect.width) / canvasRect.width,
        headingBlockRatio: headingRect.height / canvasRect.height,
      };
    });
    if (viewport.width === 1_280) {
      // Desktop title chrome leaves most of the key art visible; narrower
      // canvases reflow by behavior instead of inheriting this density budget.
      expect(titleDensity.envelopeBlockRatio).toBeLessThanOrEqual(0.4);
      expect(titleDensity.envelopeInlineRatio).toBeLessThanOrEqual(0.35);
      expect(titleDensity.headingBlockRatio).toBeLessThanOrEqual(0.1);
    }

    await loadHistoryModV1(page);

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
    await expectInteractiveSurfaceFitsV1(page, {
      interactiveRoot: "[data-default-vn-system-menu]",
      checkDialogue: false,
    });
    if (viewport.width === 1_280) {
      const systemMenuDensity = await menu.evaluate((root) => {
        const canvas = root.closest("[data-game-viewport-canvas]");
        const panel = root.querySelector("[data-blocking-focus-scope]");
        if (canvas === null || panel === null) {
          throw new TypeError("VN system menu geometry missing");
        }
        const canvasRect = canvas.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        return {
          blockRatio: panelRect.height / canvasRect.height,
          inlineRatio: panelRect.width / canvasRect.width,
        };
      });
      expect(systemMenuDensity.blockRatio).toBeLessThanOrEqual(0.6);
      expect(systemMenuDensity.inlineRatio).toBeLessThanOrEqual(0.35);
    }
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

    const density = await page.locator("[data-default-vn-player='say']").evaluate((root) => {
      const text = root.querySelector("[data-dialogue='say'] p");
      const dialogue = root.querySelector("[data-dialogue='say']");
      const canvas = root.closest("[data-game-viewport-canvas]");
      if (text === null || dialogue === null || canvas === null) {
        throw new TypeError("VN density surface missing");
      }
      return {
        fontSize: Number.parseFloat(getComputedStyle(text).fontSize),
        dialogueRatio: dialogue.getBoundingClientRect().height /
          canvas.getBoundingClientRect().height,
      };
    });
    expect(density.fontSize).toBeLessThanOrEqual(viewport.maxTextSize);
    expect(density.dialogueRatio).toBeLessThanOrEqual(viewport.maxDialogueRatio);

    await page.keyboard.press("Escape");
    await expect(menu).toBeVisible();
    await menu.getByRole("button", { name: "设置" }).click();
    const settings = page.locator('[data-system-dialog-root="settings"]');
    await expect(settings).toBeVisible();
    await expect(page.locator('[data-default-settings="true"]')).toHaveCount(1);
    const settingsLayout = await settings.evaluate((dialog) => {
      const content = dialog.querySelector("[data-settings-dialog-content]");
      if (content === null) throw new TypeError("VN Settings content missing");
      return {
        outerClientHeight: dialog.clientHeight,
        outerScrollHeight: dialog.scrollHeight,
        outerOverflowY: getComputedStyle(dialog).overflowY,
        innerClientHeight: content.clientHeight,
        innerScrollHeight: content.scrollHeight,
        innerOverflowY: getComputedStyle(content).overflowY,
        horizontalOverflow: dialog.scrollWidth - dialog.clientWidth,
        blockRatio: dialog.getBoundingClientRect().height /
          (dialog.closest("[data-game-viewport-canvas]")?.getBoundingClientRect().height ?? 1),
        inlineRatio: dialog.getBoundingClientRect().width /
          (dialog.closest("[data-game-viewport-canvas]")?.getBoundingClientRect().width ?? 1),
      };
    });
    expect(settingsLayout.outerOverflowY).toBe("auto");
    expect(settingsLayout.innerOverflowY).toBe("visible");
    expect(settingsLayout.innerScrollHeight).toBeLessThanOrEqual(
      settingsLayout.innerClientHeight + 1,
    );
    expect(settingsLayout.horizontalOverflow).toBeLessThanOrEqual(1);
    if (viewport.width === 1_280) {
      expect(settingsLayout.blockRatio).toBeLessThanOrEqual(0.6);
      expect(settingsLayout.inlineRatio).toBeLessThanOrEqual(0.45);
      expect(settingsLayout.outerScrollHeight).toBeLessThanOrEqual(
        settingsLayout.outerClientHeight + 1,
      );
    } else {
      expect(settingsLayout.outerScrollHeight).toBeGreaterThan(
        settingsLayout.outerClientHeight + 1,
      );
    }
    await settings.evaluate((dialog) => dialog.scrollTo(0, dialog.scrollHeight));
    const closeSettings = settings.getByRole("button", { name: "关闭" });
    if (viewport.width !== 1_280) {
      expect(await settings.evaluate((dialog) => dialog.scrollTop)).toBeGreaterThan(0);
    }
    await expect(closeSettings).toBeVisible();
    const settingsBounds = await settings.boundingBox();
    const closeBounds = await closeSettings.boundingBox();
    if (settingsBounds === null || closeBounds === null) {
      throw new TypeError("VN Settings scroll geometry missing");
    }
    expect(closeBounds.y).toBeGreaterThanOrEqual(settingsBounds.y - 1);
    expect(closeBounds.y + closeBounds.height).toBeLessThanOrEqual(
      settingsBounds.y + settingsBounds.height + 1,
    );
    await closeSettings.click();
  }
});

test("large desktops keep restrained VN chrome and honest letterboxing", async ({ page }) => {
  const largeViewports = [
    { width: 1_920, height: 1_080, blockLetterboxed: false, inlineLetterboxed: false },
    { width: 1_920, height: 1_200, blockLetterboxed: true, inlineLetterboxed: false },
    { width: 2_560, height: 1_080, blockLetterboxed: false, inlineLetterboxed: true },
  ] as const;

  for (const viewport of largeViewports) {
    await page.setViewportSize(viewport);
    await page.goto(vnLastSoundCheckTargetUrlV1());
    const title = page.locator("[data-title-screen='true']");
    await expect(title).toBeVisible();
    await expectInteractiveSurfaceFitsV1(page);

    const titleGeometry = await title.evaluate((root) => {
      const canvas = root.closest<HTMLElement>("[data-game-viewport-canvas]");
      const heading = root.querySelector<HTMLElement>("h1");
      const menu = root.querySelector<HTMLElement>("[data-title-menu='true']");
      if (canvas === null || heading === null || menu === null) {
        throw new TypeError("large desktop title geometry missing");
      }
      const canvasRect = canvas.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      return {
        canvas: {
          left: canvasRect.left,
          top: canvasRect.top,
          right: canvasRect.right,
          bottom: canvasRect.bottom,
          width: canvasRect.width,
          height: canvasRect.height,
        },
        viewport: { width: innerWidth, height: innerHeight },
        envelopeBlockRatio: (menuRect.bottom - headingRect.top) / canvasRect.height,
        menuInlineRatio: menuRect.width / canvasRect.width,
      };
    });
    expect(titleGeometry.envelopeBlockRatio).toBeLessThanOrEqual(0.4);
    expect(titleGeometry.menuInlineRatio).toBeLessThanOrEqual(0.32);
    if (viewport.inlineLetterboxed) {
      const leftGap = titleGeometry.canvas.left;
      const rightGap = titleGeometry.viewport.width - titleGeometry.canvas.right;
      expect(leftGap).toBeGreaterThan(0);
      expect(rightGap).toBeGreaterThan(0);
      expect(Math.abs(leftGap - rightGap) / titleGeometry.viewport.width).toBeLessThanOrEqual(
        0.005,
      );
    } else {
      expect(titleGeometry.canvas.width / titleGeometry.viewport.width).toBeGreaterThanOrEqual(
        0.99,
      );
    }

    const topGap = titleGeometry.canvas.top;
    const bottomGap = titleGeometry.viewport.height - titleGeometry.canvas.bottom;
    if (viewport.blockLetterboxed) {
      expect(topGap).toBeGreaterThan(0);
      expect(bottomGap).toBeGreaterThan(0);
      expect(Math.abs(topGap - bottomGap) / titleGeometry.viewport.height).toBeLessThanOrEqual(
        0.005,
      );
    } else {
      expect(topGap).toBeLessThanOrEqual(1);
      expect(bottomGap).toBeLessThanOrEqual(1);
    }
  }

  await page.setViewportSize({ width: 1_920, height: 1_080 });
  await page.goto(vnLastSoundCheckTargetUrlV1());
  await page.getByRole("button", { name: "新游戏" }).click();
  const say = page.locator("[data-default-vn-player='say']");
  await expect(say).toBeVisible();
  await expectInteractiveSurfaceFitsV1(page);
  const dialogueDensity = await say.evaluate((root) => {
    const canvas = root.closest<HTMLElement>("[data-game-viewport-canvas]");
    const dialogue = root.querySelector<HTMLElement>("[data-dialogue='say']");
    const text = root.querySelector<HTMLElement>("[data-dialogue='say'] p");
    const playbackButton = root.querySelector<HTMLElement>("[data-dialogue-playback]");
    if (canvas === null || dialogue === null || text === null || playbackButton === null) {
      throw new TypeError("large desktop Say geometry missing");
    }
    return {
      dialogueRatio: dialogue.getBoundingClientRect().height /
        canvas.getBoundingClientRect().height,
      textFontSize: Number.parseFloat(getComputedStyle(text).fontSize),
      playbackButtonHeight: playbackButton.getBoundingClientRect().height,
    };
  });
  expect(dialogueDensity.dialogueRatio).toBeLessThanOrEqual(0.18);
  expect(dialogueDensity.textFontSize).toBeLessThanOrEqual(17);
  expect(dialogueDensity.playbackButtonHeight).toBeLessThanOrEqual(36);

  await page.getByRole("button", { name: "菜单" }).click();
  const menu = page.getByRole("dialog", { name: "菜单" });
  await expect(menu).toBeVisible();
  await expectInteractiveSurfaceFitsV1(page, {
    interactiveRoot: "[data-default-vn-system-menu]",
    checkDialogue: false,
  });
  const menuRatios = await menu.evaluate((root) => {
    const canvas = root.closest<HTMLElement>("[data-game-viewport-canvas]");
    const panel = root.querySelector<HTMLElement>("[data-blocking-focus-scope]");
    if (canvas === null || panel === null) {
      throw new TypeError("large desktop menu geometry missing");
    }
    const canvasRect = canvas.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return {
      block: panelRect.height / canvasRect.height,
      inline: panelRect.width / canvasRect.width,
    };
  });
  expect(menuRatios.block).toBeLessThanOrEqual(0.6);
  expect(menuRatios.inline).toBeLessThanOrEqual(0.32);

  await menu.getByRole("button", { name: "设置" }).click();
  const settings = page.locator('[data-system-dialog-root="settings"]');
  await expect(settings).toBeVisible();
  const settingsGeometry = await settings.evaluate((dialog) => {
    const canvas = dialog.closest<HTMLElement>("[data-game-viewport-canvas]");
    if (canvas === null) throw new TypeError("large desktop Settings canvas missing");
    const canvasRect = canvas.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    return {
      blockRatio: dialogRect.height / canvasRect.height,
      inlineRatio: dialogRect.width / canvasRect.width,
      scrolls: dialog.scrollHeight > dialog.clientHeight + 1,
      horizontalOverflow: dialog.scrollWidth - dialog.clientWidth,
    };
  });
  expect(settingsGeometry.blockRatio).toBeLessThanOrEqual(0.6);
  expect(settingsGeometry.inlineRatio).toBeLessThanOrEqual(0.42);
  expect(settingsGeometry.scrolls).toBe(false);
  expect(settingsGeometry.horizontalOverflow).toBeLessThanOrEqual(1);

  await settings.getByRole("button", { name: "关闭" }).click();
  await page.getByRole("button", { name: "菜单" }).click();
  await page.getByRole("button", { name: "保存与读取" }).click();
  const saves = page.locator('[data-system-dialog-root="saves"]');
  await expect(saves.locator("[data-slot-id]")).toHaveCount(11);
  const saveOverflow = await saves.evaluate((dialog) => ({
    scrollRatio: dialog.scrollHeight / dialog.clientHeight,
    horizontalOverflow: dialog.scrollWidth - dialog.clientWidth,
  }));
  expect(saveOverflow.scrollRatio).toBeLessThanOrEqual(1.15);
  expect(saveOverflow.horizontalOverflow).toBeLessThanOrEqual(1);
});

test("development exposes a movable launcher and opens real debug tools without changing gameplay", async ({ page }) => {
  await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );
  const dialogue = page.locator("[data-dialogue='say']");
  await expect(dialogue).toBeVisible();
  const occurrenceBeforeDrag = await dialogue.getAttribute("data-dialogue-occurrence");
  const launcher = page.locator("[data-development-tool-panel]");
  const authorLauncher = launcher.getByRole("button", { name: "打开内嵌制作" });
  const debugLauncher = launcher.getByRole("button", { name: "调试" });
  const handle = launcher.locator("[data-debug-dock-chip-drag]");
  const canvas = page.locator("[data-game-viewport-canvas]");
  await expect(page.locator("[data-development-tool-panel]")).toHaveCount(1);
  await expect(authorLauncher).toBeVisible();
  await expect(debugLauncher).toBeVisible();
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute("data-devdock-chip-movable", "true");
  await expect(handle).toBeVisible();

  const before = await launcher.boundingBox();
  const grip = await handle.boundingBox();
  const canvasBounds = await canvas.boundingBox();
  if (before === null || grip === null || canvasBounds === null) {
    throw new TypeError("DevDock drag geometry missing");
  }
  expect(before.height).toBeLessThanOrEqual(36);
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBounds.x + 24, canvasBounds.y + canvasBounds.height - 24, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(launcher).toHaveAttribute("data-devdock-position", "bottom_left");
  const snapped = await launcher.boundingBox();
  if (snapped === null) throw new TypeError("snapped DevDock geometry missing");
  expect(snapped.x).toBeGreaterThanOrEqual(canvasBounds.x);
  expect(snapped.y).toBeGreaterThanOrEqual(canvasBounds.y);
  expect(snapped.x + snapped.width).toBeLessThanOrEqual(canvasBounds.x + canvasBounds.width);
  expect(snapped.y + snapped.height).toBeLessThanOrEqual(canvasBounds.y + canvasBounds.height);
  expect(canvasBounds.y + canvasBounds.height - (snapped.y + snapped.height)).toBeLessThan(48);
  await expect(dialogue).toHaveAttribute(
    "data-dialogue-occurrence",
    occurrenceBeforeDrag ?? "",
  );

  await debugLauncher.click();
  await expect(launcher).toHaveAttribute("data-devdock-position", "bottom_left");
  await expect(page.getByRole("group", { name: "调试" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Inspector" })).toBeVisible();
  await expect(page.getByRole("button", { name: "状态查看" })).toBeVisible();
  await expect(page.getByRole("button", { name: "状态编辑" })).toBeVisible();
  const expanded = await launcher.boundingBox();
  if (expanded === null) throw new TypeError("expanded DevDock geometry missing");
  expect(expanded.x).toBeGreaterThanOrEqual(canvasBounds.x);
  expect(expanded.y).toBeGreaterThanOrEqual(canvasBounds.y);
  expect(expanded.x + expanded.width).toBeLessThanOrEqual(canvasBounds.x + canvasBounds.width);
  expect(expanded.y + expanded.height).toBeLessThanOrEqual(
    canvasBounds.y + canvasBounds.height,
  );

  const semanticBeforeTools = await observeV1(page);
  await page.getByRole("button", { name: "状态查看" }).click();
  const inspectorWindow = page.locator('[data-devdock-window="engine.state_inspector"]');
  await expect(inspectorWindow.locator("[data-engine-state-inspector='true']")).toBeVisible();
  await expect(page.getByRole("group", { name: "调试" })).toHaveCount(0);
  const inspectorOverlap = await page.evaluate(() => {
    const launcherNode = document.querySelector<HTMLElement>("[data-development-tool-panel]");
    const window = document.querySelector<HTMLElement>(
      '[data-devdock-window="engine.state_inspector"]',
    );
    if (launcherNode === null || window === null) {
      throw new TypeError("debug overlap geometry missing");
    }
    const left = launcherNode.getBoundingClientRect();
    const right = window.getBoundingClientRect();
    const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
    const height = Math.max(
      0,
      Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top),
    );
    return width * height;
  });
  expect(inspectorOverlap).toBeLessThanOrEqual(1);

  // Once the complete runtime has taken over, moving its shared launcher also
  // moves the cascade origin used by existing and newly opened tool windows.
  const runtimeGrip = await handle.boundingBox();
  if (runtimeGrip === null) throw new TypeError("runtime DevDock drag geometry missing");
  await page.mouse.move(
    runtimeGrip.x + runtimeGrip.width / 2,
    runtimeGrip.y + runtimeGrip.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvasBounds.x + canvasBounds.width - 24,
    canvasBounds.y + 24,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(launcher).toHaveAttribute("data-devdock-position", "top_right");
  await expect(page.locator("[data-devdock-open='true']")).toHaveAttribute(
    "data-devdock-position",
    "top_right",
  );

  // The collapsed foreground launcher can reopen explicitly without moving
  // or closing the first tool window.
  await debugLauncher.click();
  await page.getByRole("button", { name: "状态编辑" }).click();
  const tunerWindow = page.locator('[data-devdock-window="engine.state_tuner"]');
  await expect(tunerWindow.locator("[data-engine-state-tuner='true']")).toBeVisible();
  await expect(page.getByRole("group", { name: "调试" })).toHaveCount(0);
  await expect(tunerWindow).toHaveAttribute("data-devdock-window-front", "true");
  const cascadesBeforeRaise = await Promise.all([
    inspectorWindow.evaluate((window) => window.style.getPropertyValue("--devdock-cascade")),
    tunerWindow.evaluate((window) => window.style.getPropertyValue("--devdock-cascade")),
  ]);
  await inspectorWindow.locator("[data-devdock-window-drag]").click({
    position: { x: 8, y: 8 },
  });
  await expect(inspectorWindow).toHaveAttribute("data-devdock-window-front", "true");
  await expect(tunerWindow).not.toHaveAttribute("data-devdock-window-front", "true");
  await tunerWindow.locator("[data-devdock-window-drag]").click({
    position: { x: 8, y: 8 },
  });
  await expect(tunerWindow).toHaveAttribute("data-devdock-window-front", "true");
  expect(
    await Promise.all([
      inspectorWindow.evaluate((window) => window.style.getPropertyValue("--devdock-cascade")),
      tunerWindow.evaluate((window) => window.style.getPropertyValue("--devdock-cascade")),
    ]),
  ).toEqual(cascadesBeforeRaise);

  await page.getByRole("button", { name: "设置" }).click();
  const gameSettings = page.locator('[data-system-dialog-root="settings"]');
  await expect(gameSettings).toBeVisible();
  const overlapOwner = await page.evaluate(() => {
    const game = document.querySelector<HTMLElement>('[data-system-dialog-root="settings"]');
    const tool = document.querySelector<HTMLElement>(
      '[data-devdock-window="engine.state_tuner"]',
    );
    if (game === null || tool === null) throw new TypeError("stacking geometry missing");
    const gameRect = game.getBoundingClientRect();
    const toolRect = tool.getBoundingClientRect();
    const left = Math.max(gameRect.left, toolRect.left);
    const right = Math.min(gameRect.right, toolRect.right);
    const top = Math.max(gameRect.top, toolRect.top);
    const bottom = Math.min(gameRect.bottom, toolRect.bottom);
    if (right <= left || bottom <= top) throw new TypeError("stacking overlap missing");
    return document.elementFromPoint((left + right) / 2, (top + bottom) / 2)
      ?.closest<HTMLElement>("[data-devdock-window]")?.dataset.devdockWindow ?? null;
  });
  expect(overlapOwner).toBe("engine.state_tuner");
  expect(await observeV1(page)).toEqual(semanticBeforeTools);
});

test("development loads and unloads the optional History Mod without deleting Narrative history", async ({ page }) => {
  await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );
  await expect(page.getByRole("button", { name: "历史" })).toHaveCount(0);

  const opening = await observeV1(page);
  if (opening.narrative.pending?.kind !== "say") {
    throw new TypeError("opening Say missing");
  }
  await advanceCurrentSayV1(page, opening.narrative.pending);
  await expect.poll(async () => (await observeV1(page)).narrative.history.entries.length)
    .toBeGreaterThan(0);
  const historyBeforeUnload = (await observeV1(page)).narrative.history.entries;

  await loadHistoryModV1(page);
  const historyButton = page.getByRole("button", { name: "历史" });
  await expect(historyButton).toBeEnabled();
  await historyButton.click();
  const historyDialog = page.getByRole("dialog", { name: "对话历史" });
  await expect(historyDialog).toBeVisible();

  await unloadHistoryModV1(page);
  await expect(historyDialog).toBeHidden();
  await expect(historyButton).toHaveCount(0);
  expect((await observeV1(page)).narrative.history.entries).toEqual(historyBeforeUnload);
});

test("debug runtime load failure stays local and offers reload recovery", async ({ page, pageDiagnostics }) => {
  let intercepted = false;
  await page.route(/reference-player-dev-dock-runtime\.tsx/, async (route) => {
    if (intercepted) {
      await route.continue();
      return;
    }
    intercepted = true;
    await route.abort("failed");
  });
  await page.goto(vnLastSoundCheckTargetUrlV1());
  const title = page.locator("[data-title-screen='true']");
  await expect(title).toBeVisible();
  await page.getByRole("button", { name: "调试" }).click();

  const failure = page.locator("[data-development-tool-runtime-failure='true']");
  await expect(failure).toContainText("调试工具加载失败");
  await expect(title).toBeVisible();
  const expectedResourceError = pageDiagnostics.consoleErrors.find((message) =>
    message.includes("Failed to load resource")
  );
  if (expectedResourceError !== undefined) {
    pageDiagnostics.consumeExpectedConsoleError(expectedResourceError);
  }
  await failure.getByRole("button", { name: "重新加载" }).click();
  await expect(title).toBeVisible();
  await page.getByRole("button", { name: "调试" }).click();
  await expect(page.getByRole("group", { name: "调试" })).toBeVisible();
  expect(intercepted).toBe(true);
});

test("coarse-pointer launcher leaves tool-window work area clear @mobile", async ({ page }) => {
  await page.goto(vnLastSoundCheckTargetUrlV1());
  await page.getByRole("button", { name: "调试" }).click();
  await page.getByRole("button", { name: "状态查看" }).click();
  const overlap = await page.evaluate(() => {
    const launcher = document.querySelector<HTMLElement>("[data-development-tool-panel]");
    const window = document.querySelector<HTMLElement>(
      '[data-devdock-window="engine.state_inspector"]',
    );
    if (launcher === null || window === null) {
      throw new TypeError("coarse overlap geometry missing");
    }
    const left = launcher.getBoundingClientRect();
    const right = window.getBoundingClientRect();
    return {
      coarse: matchMedia("(pointer: coarse)").matches,
      area: Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left)) *
        Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top)),
    };
  });
  expect(overlap.area).toBeLessThanOrEqual(1);
});

test("embedded authoring inherits the shared UI baseline and stays bounded", async ({ page }) => {
  const viewports = [
    { width: 2_560, height: 1_080 },
    { width: 1_920, height: 1_080 },
    { width: 1_280, height: 720 },
    { width: 1_024, height: 768 },
    { width: 720, height: 900 },
    { width: 390, height: 844 },
    { width: 360, height: 640 },
  ] as const;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(vnLastSoundCheckTargetUrlV1());
    if (viewport.width === 1_280) {
      await page.locator("[data-application-id]").evaluate((application) => {
        application.style.setProperty("--silly-text-size-base", "16px");
        application.style.setProperty("--silly-text-size-compact", "13px");
        application.style.setProperty("--silly-control-min-size", "32px");
        application.style.setProperty("--silly-control-min-size-compact", "28px");
        application.style.setProperty("--silly-color-text", "rgb(17, 34, 51)");
        application.style.setProperty("--silly-font-family", '"Courier New", serif');
      });
    }
    const developmentPanel = page.locator("[data-development-tool-panel]");
    await expect(developmentPanel).toBeVisible();
    const authorLauncher = developmentPanel.getByRole("button", {
      name: "打开内嵌制作",
      exact: true,
    });
    if (viewport.width === 1_280) {
      const title = page.locator("[data-title-screen='true']");
      const devDock = page.locator("[data-story-debug-dock]");
      await expect(title).toBeVisible();
      await expect(devDock).toBeVisible();
      const sharedScale = await page.evaluate(() => ({
        titleFontSize: Number.parseFloat(
          getComputedStyle(document.querySelector("[data-title-screen='true']")!).fontSize,
        ),
        devDockFontSize: Number.parseFloat(
          getComputedStyle(document.querySelector("[data-story-debug-dock]")!).fontSize,
        ),
      }));
      expect(sharedScale.titleFontSize).toBe(16);
      expect(sharedScale.devDockFontSize).toBe(12);
      expect((await authorLauncher.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(28);
    }
    await authorLauncher.click();

    const panel = page.getByRole("region", { name: "内嵌创作" });
    const inspector = panel.locator("[data-inspector-ready='true']");
    const search = panel.getByLabel("搜索当前应用的 Scene");
    const close = panel.getByRole("button", { name: "关闭内嵌创作", exact: true });
    await expect(panel).toBeVisible();
    await expect(inspector).toBeVisible();
    await expect(search).toBeVisible();

    const geometry = await panel.evaluate((root) => {
      const panelRect = root.getBoundingClientRect();
      const inspectorSurface = root.querySelector<HTMLElement>(
        "[data-inspector-ready='true']",
      );
      const preview = root.querySelector<HTMLElement>("[aria-label='场景预览']");
      const navigator = root.querySelector<HTMLElement>("[aria-label='Scene 导航']");
      const properties = root.querySelector<HTMLElement>("[data-inspector-properties='true']");
      const sceneList = root.querySelector<HTMLElement>("[data-inspector-scene-list]");
      if (
        inspectorSurface === null || preview === null || navigator === null ||
        properties === null ||
        sceneList === null
      ) {
        throw new TypeError("embedded Inspector work-area geometry missing");
      }
      const inspectorRect = inspectorSurface.getBoundingClientRect();
      const previewRect = preview.getBoundingClientRect();
      const navigatorRect = navigator.getBoundingClientRect();
      const propertiesRect = properties.getBoundingClientRect();
      return {
        documentHorizontalOverflow: document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        bodyHorizontalOverflow: document.body.scrollWidth - document.body.clientWidth,
        panelHorizontalOverflow: root.scrollWidth - root.clientWidth,
        panelRect: {
          left: panelRect.left,
          top: panelRect.top,
          right: panelRect.right,
          bottom: panelRect.bottom,
        },
        previewRect: {
          top: previewRect.top,
          bottom: previewRect.bottom,
          width: previewRect.width,
          height: previewRect.height,
        },
        inspectorBottom: inspectorRect.bottom,
        navigatorTop: navigatorRect.top,
        propertiesRect: {
          top: propertiesRect.top,
          bottom: propertiesRect.bottom,
        },
        sceneListHeight: sceneList.getBoundingClientRect().height,
        viewport: { width: innerWidth, height: innerHeight },
      };
    });
    expect(geometry.documentHorizontalOverflow).toBeLessThanOrEqual(1);
    expect(geometry.bodyHorizontalOverflow).toBeLessThanOrEqual(1);
    expect(geometry.panelHorizontalOverflow).toBeLessThanOrEqual(1);
    expect(geometry.panelRect.left).toBeGreaterThanOrEqual(0);
    expect(geometry.panelRect.top).toBeGreaterThanOrEqual(0);
    expect(geometry.panelRect.right).toBeLessThanOrEqual(geometry.viewport.width);
    expect(geometry.panelRect.bottom).toBeLessThanOrEqual(geometry.viewport.height);
    expect(geometry.sceneListHeight).toBeLessThanOrEqual(101);
    const singleColumn = geometry.previewRect.bottom <= geometry.navigatorTop + 1;
    if (viewport.width >= 1_280) {
      expect(geometry.previewRect.width / (geometry.panelRect.right - geometry.panelRect.left))
        .toBeGreaterThanOrEqual(0.45);
      expect(geometry.previewRect.height / (geometry.panelRect.bottom - geometry.panelRect.top))
        .toBeGreaterThanOrEqual(0.6);
      expect(geometry.panelRect.bottom - geometry.inspectorBottom).toBeLessThanOrEqual(2);
    } else if (singleColumn) {
      expect(geometry.previewRect.top).toBeLessThanOrEqual(geometry.navigatorTop);
      expect(geometry.previewRect.bottom).toBeLessThanOrEqual(geometry.navigatorTop + 1);
    } else {
      expect(geometry.propertiesRect.top).toBeGreaterThanOrEqual(geometry.panelRect.top);
      expect(geometry.propertiesRect.bottom).toBeLessThanOrEqual(geometry.panelRect.bottom + 1);
    }

    if (viewport.width === 1_280) {
      const inherited = await inspector.evaluate((root) => {
        const application = document.querySelector<HTMLElement>("[data-application-id]");
        const nestedButton = root.querySelector<HTMLElement>("button");
        const nestedInput = root.querySelector<HTMLElement>("input");
        if (application === null || nestedButton === null || nestedInput === null) {
          throw new TypeError("tool theme font fixtures missing");
        }
        const applicationStyle = getComputedStyle(application);
        const rootStyle = getComputedStyle(root);
        return {
          applicationFontSize: Number.parseFloat(applicationStyle.fontSize),
          applicationColor: applicationStyle.color,
          applicationFontFamily: applicationStyle.fontFamily,
          rootFontSize: Number.parseFloat(rootStyle.fontSize),
          rootColor: rootStyle.color,
          rootFontFamily: rootStyle.fontFamily,
          buttonFontFamily: getComputedStyle(nestedButton).fontFamily,
          inputFontFamily: getComputedStyle(nestedInput).fontFamily,
        };
      });
      expect(inherited.applicationFontSize).toBe(16);
      expect(inherited.applicationColor).toBe("rgb(17, 34, 51)");
      expect(inherited.applicationFontFamily).toContain("Courier New");
      expect(inherited.rootFontSize).toBe(14);
      expect(inherited.rootColor).not.toBe(inherited.applicationColor);
      expect(inherited.rootFontFamily).not.toContain("Courier New");
      expect(inherited.buttonFontFamily).toBe(inherited.rootFontFamily);
      expect(inherited.inputFontFamily).toBe(inherited.rootFontFamily);
      const closeBounds = await close.boundingBox();
      expect(closeBounds?.height ?? 0).toBeGreaterThanOrEqual(28);

      await close.evaluate((button) => {
        button.style.setProperty("--silly-radius-control", "0.5rem");
      });
      expect(
        Number.parseFloat(await close.evaluate((button) => getComputedStyle(button).borderRadius)),
      ).toBe(8);
    }

    await search.fill("夜间");
    await expect(panel.getByText("夜间控制室", { exact: true })).toBeVisible();
    const sourcePointer = panel.locator("[data-inspector-source-pointer]").first();
    await sourcePointer.scrollIntoViewIfNeeded();
    await expect(
      sourcePointer,
      `Inspector source pointer at ${viewport.width}x${viewport.height}`,
    ).toBeInViewport();
    await expect(close).toBeVisible();
    await close.click();
    await expect(panel).toBeHidden();
    await expect(authorLauncher).toBeVisible();
    if (viewport.width === 1_280) {
      await authorLauncher.click();
      await expect(panel).toBeVisible();
      await close.click();
      await expect(panel).toBeHidden();
    }
  }
});

test("the default VN quick controls restore a saved Choice through confirmation", async ({ page }) => {
  await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
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
  await page.locator("[data-dialogue-choice='choice.vn-last-sound-check.archive-voice']").click();
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
  await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
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
  await page.goto(vnLastSoundCheckTargetUrlV1());
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

test.describe("coarse-pointer defaults", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  test("Settings exposes touch-sized range and toggle rows", async ({ page }) => {
    await page.goto(vnLastSoundCheckTargetUrlV1());
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    await page.getByRole("button", { name: "设置" }).click();
    const settings = page.getByRole("dialog", { name: "设置" });
    await expect(settings).toBeVisible();
    const rowHeights = await settings.locator(
      '[data-default-settings-volume], [data-default-settings-muted="true"]',
    ).evaluateAll((controls) =>
      controls.map((control) => {
        const row = control.closest("label");
        if (row === null) throw new TypeError("default Settings row missing");
        return row.getBoundingClientRect().height;
      })
    );
    expect(rowHeights.length).toBe(4);
    expect(Math.min(...rowHeights)).toBeGreaterThanOrEqual(44);
  });
});

test("the middle pointer button hides and restores VN chrome without advancing", async ({ page }) => {
  await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
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
  const advanceBounds = await advance.boundingBox();
  if (advanceBounds === null) throw new TypeError("VN advance surface geometry missing");
  await page.mouse.click(
    advanceBounds.x + advanceBounds.width / 2,
    advanceBounds.y + advanceBounds.height / 2,
    { button: "middle" },
  );
  const restore = page.locator("[data-dialogue-chrome-hidden='true']");
  await expect(restore).toBeVisible();
  expect((await observeV1(page)).narrative.pending?.occurrenceId).toBe(occurrenceId);

  const restoreBounds = await restore.boundingBox();
  if (restoreBounds === null) throw new TypeError("VN chrome restore surface geometry missing");
  await page.mouse.click(
    restoreBounds.x + restoreBounds.width / 2,
    restoreBounds.y + restoreBounds.height / 2,
    { button: "middle" },
  );
  await expect(advance).toBeVisible();
  expect((await observeV1(page)).narrative.pending?.occurrenceId).toBe(occurrenceId);
});

test("Continue reveals the latest autosave after a Browser reload", async ({ page }) => {
  await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
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
    await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
    await expect(page.locator("#sillymaker-application-boot-shell")).toHaveAttribute(
      "data-sillymaker-startup-state",
      "ready",
    );
    const mobileDevDock = page.locator("[data-development-tool-panel]");
    const mobileAuthorLauncher = mobileDevDock.getByRole("button", {
      name: "打开内嵌制作",
    });
    const mobileDebugLauncher = mobileDevDock.getByRole("button", { name: "调试" });
    const mobileDevDockGrip = mobileDevDock.locator("[data-debug-dock-chip-drag]");
    await expect(page.locator("[data-development-tool-panel]")).toHaveCount(1);
    for (
      const [name, target] of [
        ["embedded author action", mobileAuthorLauncher],
        ["DevDock action", mobileDebugLauncher],
        ["DevDock drag grip", mobileDevDockGrip],
      ] as const
    ) {
      await expect(target).toBeVisible();
      const bounds = await target.boundingBox();
      if (bounds === null) throw new TypeError("mobile development control geometry missing");
      expect(bounds.width, `${name} touch width`).toBeGreaterThanOrEqual(44);
      expect(bounds.height, `${name} touch height`).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "新游戏" }).tap();
    await page.waitForFunction(
      (key) => Reflect.get(globalThis, key) !== undefined,
      automationKeyV1,
    );
    await loadHistoryModV1(page);

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
  await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
  await expect(page.locator("#sillymaker-application-boot-shell")).toHaveAttribute(
    "data-sillymaker-startup-state",
    "ready",
  );
  await page.getByRole("button", { name: "设置" }).click();
  const localeSettings = page.getByRole("dialog", { name: "设置" });
  await localeSettings.getByRole("combobox", { name: "语言" }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await localeSettings.getByRole("button", { name: "关闭" }).click();
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("application", { name: "One Last Sound Check" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One Last Sound Check" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New game" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Load game" })).toBeVisible();
  await expect(page.getByRole("button", { name: /新游戏|读取存档|设置/ })).toHaveCount(0);
  await expectInteractiveSurfaceFitsV1(page);
  await expectNoWcagViolationsV1(page, "English title");

  await loadHistoryModV1(page);

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
  await page.goto(vnLastSoundCheckTargetUrlV1());
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
  await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
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
  await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
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
  await page.goto(vnLastSoundCheckTargetUrlV1("?capability=automation_bridge"));
  await page.getByRole("button", { name: "新游戏" }).click();
  await page.waitForFunction(
    (key) => Reflect.get(globalThis, key) !== undefined,
    automationKeyV1,
  );
  await finishArchiveRouteV1(page);

  const ending = page.locator("[data-vn-last-sound-check-ending='true']");
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
