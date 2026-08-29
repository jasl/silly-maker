// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ReactElement } from "react";

import type { GameViewportGeometryV1 } from "./game-viewport.tsx";
import { GameViewportV1, useGameViewportV1 } from "./game-viewport.tsx";

afterEach(cleanup);

function GeometryProbeV1(props: { onGeometry(geometry: GameViewportGeometryV1): void }): null {
  props.onGeometry(useGameViewportV1());
  return null;
}

function renderViewportV1(input: {
  readonly canvas: { width: number; height: number };
  readonly fallbackSize: { width: number; height: number };
  readonly maxScale?: number;
  readonly children?: ReactElement;
}) {
  let geometry: GameViewportGeometryV1 | null = null;
  render(
    <GameViewportV1
      canvas={input.canvas}
      fallbackSize={input.fallbackSize}
      {...(input.maxScale === undefined ? {} : { maxScale: input.maxScale })}
    >
      <GeometryProbeV1
        onGeometry={(value) => {
          geometry = value;
        }}
      />
      {input.children ?? <main data-testid="stage-probe" />}
    </GameViewportV1>,
  );
  if (geometry === null) throw new Error("viewport geometry was not observed");
  return geometry as GameViewportGeometryV1;
}

describe("GameViewportV1", () => {
  it("fits the logical canvas with pillarboxing and exposes conversion queries", () => {
    const geometry = renderViewportV1({
      canvas: { width: 1600, height: 1000 },
      fallbackSize: { width: 900, height: 500 },
    });

    expect(geometry.scale).toBeCloseTo(0.5);
    expect(geometry.cssWidth).toBeCloseTo(800);
    expect(geometry.cssHeight).toBeCloseTo(500);
    expect(geometry.letterboxInline).toBeCloseTo(50);
    expect(geometry.letterboxBlock).toBeCloseTo(0);
    expect(geometry.toCssPx(100)).toBeCloseTo(50);

    const canvasBox = screen.getByTestId("game-viewport").firstElementChild;
    expect(canvasBox).toHaveAttribute("data-game-viewport-canvas", "true");
    expect(canvasBox).toHaveAttribute("data-viewport-scale", "0.5000");
  });

  it("letterboxes vertically for wide windows", () => {
    const geometry = renderViewportV1({
      canvas: { width: 1600, height: 1000 },
      fallbackSize: { width: 1600, height: 1100 },
    });
    expect(geometry.scale).toBeCloseTo(1);
    expect(geometry.letterboxInline).toBeCloseTo(0);
    expect(geometry.letterboxBlock).toBeCloseTo(50);
  });

  it("centers instead of scaling past maxScale", () => {
    const geometry = renderViewportV1({
      canvas: { width: 1600, height: 1000 },
      fallbackSize: { width: 3200, height: 2000 },
    });
    expect(geometry.scale).toBe(1);
    expect(geometry.cssWidth).toBe(1600);
    expect(geometry.letterboxInline).toBeCloseTo(800);
    expect(geometry.letterboxBlock).toBeCloseTo(500);
  });

  it("supports an explicit larger maxScale", () => {
    const geometry = renderViewportV1({
      canvas: { width: 800, height: 500 },
      fallbackSize: { width: 3200, height: 2000 },
      maxScale: 2,
    });
    expect(geometry.scale).toBe(2);
    expect(geometry.cssWidth).toBe(1600);
  });

  it("upscales a 16:9 logical canvas exactly onto 1080P and 1440P windows", () => {
    // Hidpi windows are the norm: a VN's low-res logical canvas must map
    // onto them with one proportional scale (art upscales best-effort,
    // hit regions ride the same transform) and no letterbox at exact 16:9.
    const at1080 = renderViewportV1({
      canvas: { width: 1024, height: 576 },
      fallbackSize: { width: 1920, height: 1080 },
      maxScale: 4,
    });
    expect(at1080.scale).toBeCloseTo(1.875, 12);
    expect(at1080.cssWidth).toBeCloseTo(1920);
    expect(at1080.cssHeight).toBeCloseTo(1080);
    expect(at1080.letterboxInline).toBeCloseTo(0);
    expect(at1080.letterboxBlock).toBeCloseTo(0);
    expect(at1080.toCssPx(100)).toBeCloseTo(187.5);
    cleanup();

    const at1440 = renderViewportV1({
      canvas: { width: 1024, height: 576 },
      fallbackSize: { width: 2560, height: 1440 },
      maxScale: 4,
    });
    expect(at1440.scale).toBeCloseTo(2.5, 12);
    expect(at1440.cssWidth).toBeCloseTo(2560);
    expect(at1440.letterboxInline).toBeCloseTo(0);
    expect(at1440.toCssPx(100)).toBeCloseTo(250);
  });

  it("rejects an invalid canvas and requires a provider for the hook", () => {
    expect(() =>
      render(
        <GameViewportV1 canvas={{ width: 0, height: 1000 }} fallbackSize={{ width: 1, height: 1 }}>
          <main />
        </GameViewportV1>,
      )
    ).toThrow("ui.game_viewport_invalid_canvas");

    expect(() => render(<GeometryProbeV1 onGeometry={() => undefined} />)).toThrow(
      "ui.game_viewport_missing",
    );
  });
});
