// SPDX-License-Identifier: MIT
import type { Locator } from "@playwright/test";

import { expect, gotoLabV1, test } from "./fixtures.ts";

interface ViewportSizeV1 {
  readonly width: number;
  readonly height: number;
}

/** 16:10 design canvas, 4:3 letterbox, portrait tablet, ultrawide, small. */
const declaredViewportsV1 = Object.freeze(
  [
    Object.freeze({ width: 1600, height: 1000 }),
    Object.freeze({ width: 1024, height: 768 }),
    Object.freeze({ width: 768, height: 1024 }),
    Object.freeze({ width: 2560, height: 1080 }),
    Object.freeze({ width: 800, height: 500 }),
  ] as const satisfies readonly ViewportSizeV1[],
);

async function expectCanvasGeometryV1(canvas: Locator, viewport: ViewportSizeV1): Promise<void> {
  const bounds = await canvas.boundingBox();
  expect(bounds, "the viewport canvas must have bounds").not.toBeNull();
  if (bounds === null) return;

  const expectedScale = Math.min(1, viewport.width / 1600, viewport.height / 1000);
  expect(bounds.width).toBeCloseTo(1600 * expectedScale, 0);
  expect(bounds.height).toBeCloseTo(1000 * expectedScale, 0);

  // Letterbox centers the canvas on both axes.
  expect(Math.abs(bounds.x - (viewport.width - bounds.width) / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds.y - (viewport.height - bounds.height) / 2)).toBeLessThanOrEqual(1);

  const scaleAttribute = await canvas.getAttribute("data-viewport-scale");
  expect(Number.parseFloat(scaleAttribute ?? "0")).toBeCloseTo(expectedScale, 2);
}

test.describe("engine GameViewport", () => {
  for (const viewport of declaredViewportsV1) {
    test(
      `@responsive fits the logical canvas at ${String(viewport.width)}x${String(viewport.height)}`,
      async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(viewport);
        await gotoLabV1(page);
        const canvas = page.locator("[data-game-viewport-canvas='true']");
        await expect(canvas).toBeVisible();
        await expectCanvasGeometryV1(canvas, viewport);

        // Interactive controls keep the minimum hit target and stay reachable.
        const collect = page.getByRole("button", { name: "采集样本" });
        await collect.scrollIntoViewIfNeeded();
        const buttonBounds = await collect.boundingBox();
        expect(buttonBounds).not.toBeNull();
        if (buttonBounds !== null) {
          expect(buttonBounds.width).toBeGreaterThanOrEqual(44);
          expect(buttonBounds.height).toBeGreaterThanOrEqual(44);
        }
        if (testInfo.project.name === "chromium-touch") await collect.tap();
        else await collect.click();
        await expect(page.getByText(/样本[1-9]/u)).toBeVisible();
      },
    );
  }

  test("@responsive stays crisp and operable at 200 percent zoom", async ({
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
});
