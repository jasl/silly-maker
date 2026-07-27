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

  it("rejects an invalid canvas and requires a provider for the hook", () => {
    expect(() =>
      render(
        <GameViewportV1 canvas={{ width: 0, height: 1000 }} fallbackSize={{ width: 1, height: 1 }}>
          <main />
        </GameViewportV1>,
      ),
    ).toThrow("ui.game_viewport_invalid_canvas");

    expect(() => render(<GeometryProbeV1 onGeometry={() => undefined} />)).toThrow(
      "ui.game_viewport_missing",
    );
  });
});
