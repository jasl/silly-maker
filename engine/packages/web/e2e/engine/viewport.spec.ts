// SPDX-License-Identifier: MIT
import type { Locator } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

interface ViewportSizeV1 {
  readonly width: number;
  readonly height: number;
}

async function sampleCountV1(probe: Locator): Promise<number> {
  return Number(await probe.getAttribute("data-lab-samples"));
}

async function expectSampleIncreaseV1(probe: Locator, previous: number): Promise<number> {
  await expect.poll(() => sampleCountV1(probe)).toBeGreaterThan(previous);
  return sampleCountV1(probe);
}

/** 16:10 design canvas, 4:3 letterbox, portrait tablet, ultrawide, small. */
const declaredViewportsV1 = [
  { width: 1600, height: 1000 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 2560, height: 1080 },
  { width: 800, height: 500 },
] as const satisfies readonly ViewportSizeV1[];

async function expectCanvasGeometryV1(canvas: Locator, viewport: ViewportSizeV1): Promise<void> {
  const portrait = viewport.width / viewport.height <= 0.8;
  await expect(canvas).toHaveAttribute(
    "data-viewport-mode",
    portrait ? "expand-height" : "fit",
  );
  if (portrait) {
    await expect(canvas).toHaveAttribute("data-viewport-layout-variant", "phone_portrait");
  } else await expect(canvas).not.toHaveAttribute("data-viewport-layout-variant");

  const bounds = await canvas.boundingBox();
  expect(bounds, "the viewport canvas must have bounds").not.toBeNull();
  if (bounds === null) return;

  const expectedScale = Math.min(viewport.width / 1600, viewport.height / 1000);
  expect(bounds.width).toBeCloseTo(portrait ? viewport.width : 1600 * expectedScale, 0);
  expect(bounds.height).toBeCloseTo(portrait ? viewport.height : 1000 * expectedScale, 0);

  // Fit letterbox or the expanded live canvas remains centered on both axes.
  expect(Math.abs(bounds.x - (viewport.width - bounds.width) / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds.y - (viewport.height - bounds.height) / 2)).toBeLessThanOrEqual(1);

  const scaleAttribute = await canvas.getAttribute("data-viewport-scale");
  expect(Number.parseFloat(scaleAttribute ?? "0")).toBeCloseTo(expectedScale, 2);

  const authoredOrigin = canvas.locator("[data-stage-coordinate-origin='true']").first();
  const authoredBounds = await authoredOrigin.boundingBox();
  expect(authoredBounds, "the authored Stage rect must have bounds").not.toBeNull();
  if (authoredBounds === null) return;
  expect(authoredBounds.width).toBeCloseTo(1600 * expectedScale, 0);
  expect(authoredBounds.height).toBeCloseTo(1000 * expectedScale, 0);
  expect(authoredBounds.x).toBeCloseTo(bounds.x + (bounds.width - authoredBounds.width) / 2, 0);
  expect(authoredBounds.y).toBeCloseTo(bounds.y + (bounds.height - authoredBounds.height) / 2, 0);
}

test.describe("engine GameViewport", () => {
  for (const viewport of declaredViewportsV1) {
    test(
      `@responsive maps the logical canvas at ${String(viewport.width)}x${String(viewport.height)}`,
      async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(viewport);
        await gotoLabV1(page);
        const canvas = page.locator("[data-game-viewport-canvas='true']");
        await expect(canvas).toBeVisible();
        await expectCanvasGeometryV1(canvas, viewport);

        // Interactive controls use normal desktop density and retain the touch
        // floor only for the coarse-pointer project.
        const collect = page.getByRole("button", { name: "采集样本" });
        await collect.scrollIntoViewIfNeeded();
        const buttonBounds = await collect.boundingBox();
        expect(buttonBounds).not.toBeNull();
        if (buttonBounds !== null) {
          const targetFloor = testInfo.project.name === "chromium-touch" ? 44 : 32;
          expect(buttonBounds.width).toBeGreaterThanOrEqual(targetFloor);
          expect(buttonBounds.height).toBeGreaterThanOrEqual(targetFloor);
        }
        if (testInfo.project.name === "chromium-touch") await collect.tap();
        else await collect.click();
        await expect(page.getByText(/样本[1-9]/u)).toBeVisible();
      },
    );
  }

  test("@responsive keeps CSS geometry and remains operable at DPR 2", async ({
    browser,
  }, testInfo) => {
    const touch = testInfo.project.name === "chromium-touch";
    const context = await browser.newContext({
      viewport: { width: 800, height: 500 },
      deviceScaleFactor: 2,
      hasTouch: touch,
    });
    try {
      const page = await context.newPage();
      await gotoLabV1(page);
      expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
      const canvas = page.locator("[data-game-viewport-canvas='true']");
      await expectCanvasGeometryV1(canvas, { width: 800, height: 500 });
      const collect = page.getByRole("button", { name: "采集样本" });
      if (touch) await collect.tap();
      else await collect.click();
      await expect(page.getByText(/样本[1-9]/u)).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test(
    "@responsive switches portrait expansion without reload and preserves epoch and state",
    async ({
      page,
    }, testInfo) => {
      let loadCount = 0;
      page.on("load", () => loadCount += 1);
      await page.setViewportSize({ width: 1200, height: 800 });
      await gotoLabV1(page);

      const application = page.locator("[data-application-id='e2e']");
      const initialEpoch = await application.getAttribute("data-presentation-epoch");
      const canvas = page.locator("[data-game-viewport-canvas='true']");
      const sampleProbe = page.locator("[data-lab-samples]");
      const collectAction = page.getByRole("button", { name: "采集样本" });
      const collectZone = page.getByRole("button", { name: "样本箱采集口" });
      await expectCanvasGeometryV1(canvas, { width: 1200, height: 800 });
      // The first ordinary action introduces the crate and its authored Stage region.
      const initialSamples = await sampleCountV1(sampleProbe);
      if (testInfo.project.name === "chromium-touch") await collectAction.tap();
      else await collectAction.click();
      const samplesAfterHudAction = await expectSampleIncreaseV1(sampleProbe, initialSamples);
      await expect(collectZone).toBeVisible();

      await page.setViewportSize({ width: 390, height: 844 });
      await expectCanvasGeometryV1(canvas, { width: 390, height: 844 });
      await collectZone.focus();
      await expect(collectZone).toBeFocused();
      if (testInfo.project.name === "chromium-touch") await collectZone.tap();
      else await collectZone.click();
      const samplesAfterPortraitHit = await expectSampleIncreaseV1(
        sampleProbe,
        samplesAfterHudAction,
      );

      await page.setViewportSize({ width: 1200, height: 800 });
      await expectCanvasGeometryV1(canvas, { width: 1200, height: 800 });
      if (testInfo.project.name === "chromium-touch") await collectZone.tap();
      else await collectZone.click();
      await expectSampleIncreaseV1(sampleProbe, samplesAfterPortraitHit);

      await expect(application).toHaveAttribute("data-presentation-epoch", initialEpoch ?? "0");
      expect(loadCount).toBe(1);
    },
  );
});
