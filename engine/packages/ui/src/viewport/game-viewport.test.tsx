// @vitest-environment jsdom
// SPDX-License-Identifier: MIT
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLayoutEffect } from "react";
import type { ReactElement } from "react";

import type { GameViewportGeometryV1 } from "./game-viewport.tsx";
import { GameViewportV1, useGameViewportV1 } from "./game-viewport.tsx";
import type { GameViewportLayoutVariantV1, GameViewportModeV1 } from "./game-viewport.tsx";

afterEach(cleanup);

function GeometryProbeV1(props: { onGeometry(geometry: GameViewportGeometryV1): void }): null {
  const geometry = useGameViewportV1();
  const { onGeometry } = props;
  useLayoutEffect(() => onGeometry(geometry), [geometry, onGeometry]);
  return null;
}

function renderViewportV1(input: {
  readonly canvas: { width: number; height: number };
  readonly fallbackSize: { width: number; height: number };
  readonly maxScale?: number;
  readonly mode?: GameViewportModeV1;
  readonly layoutVariants?: readonly GameViewportLayoutVariantV1[];
  readonly children?: ReactElement;
}) {
  let geometry: GameViewportGeometryV1 | null = null;
  render(
    <GameViewportV1
      canvas={input.canvas}
      fallbackSize={input.fallbackSize}
      {...(input.maxScale === undefined ? {} : { maxScale: input.maxScale })}
      {...(input.mode === undefined ? {} : { mode: input.mode })}
      {...(input.layoutVariants === undefined ? {} : { layoutVariants: input.layoutVariants })}
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
    expect(geometry.toCanvasCssPoint({ x: 100, y: 80 })).toEqual({ x: 50, y: 40 });
    expect(geometry.authoredRect).toEqual({ x: 0, y: 0, width: 1600, height: 1000 });
    expect(geometry.mode).toBe("fit");
    expect(geometry.layoutVariantId).toBeNull();

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

  it("uses the live container as the authored canvas in fluid mode", () => {
    const geometry = renderViewportV1({
      canvas: { width: 1280, height: 720 },
      fallbackSize: { width: 390, height: 844 },
      mode: "fluid",
    });

    expect(geometry).toMatchObject({
      canvas: { width: 390, height: 844 },
      authoredRect: { x: 0, y: 0, width: 390, height: 844 },
      mode: "fluid",
      scale: 1,
      cssWidth: 390,
      cssHeight: 844,
      letterboxInline: 0,
      letterboxBlock: 0,
    });
  });

  it("expands the live canvas vertically around the authored origin", () => {
    const geometry = renderViewportV1({
      canvas: { width: 1600, height: 1000 },
      fallbackSize: { width: 800, height: 1000 },
      mode: "expand-height",
    });

    expect(geometry.scale).toBeCloseTo(0.5);
    expect(geometry.canvas).toEqual({ width: 1600, height: 2000 });
    expect(geometry.authoredRect).toEqual({ x: 0, y: 500, width: 1600, height: 1000 });
    expect(geometry.cssWidth).toBeCloseTo(800);
    expect(geometry.cssHeight).toBeCloseTo(1000);
    expect(geometry.letterboxInline).toBeCloseTo(0);
    expect(geometry.letterboxBlock).toBeCloseTo(0);
    expect(geometry.toCanvasCssPoint({ x: -100, y: -200 })).toEqual({ x: -50, y: 150 });
  });

  it("expands the live canvas horizontally around the authored origin", () => {
    const geometry = renderViewportV1({
      canvas: { width: 1600, height: 1000 },
      fallbackSize: { width: 2000, height: 500 },
      mode: "expand-width",
    });

    expect(geometry.scale).toBeCloseTo(0.5);
    expect(geometry.canvas).toEqual({ width: 4000, height: 1000 });
    expect(geometry.authoredRect).toEqual({ x: 1200, y: 0, width: 1600, height: 1000 });
    expect(geometry.cssWidth).toBeCloseTo(2000);
    expect(geometry.cssHeight).toBeCloseTo(500);
    expect(geometry.letterboxInline).toBeCloseTo(0);
    expect(geometry.letterboxBlock).toBeCloseTo(0);
  });

  it("keeps maxScale as a cap while expanding only the selected axis", () => {
    const geometry = renderViewportV1({
      canvas: { width: 1600, height: 1000 },
      fallbackSize: { width: 3200, height: 2400 },
      mode: "expand-height",
    });

    expect(geometry.scale).toBe(1);
    expect(geometry.canvas).toEqual({ width: 1600, height: 2400 });
    expect(geometry.authoredRect).toEqual({ x: 0, y: 700, width: 1600, height: 1000 });
    expect(geometry.letterboxInline).toBe(800);
    expect(geometry.letterboxBlock).toBe(0);
  });

  it("selects the first matching container variant and falls back otherwise", () => {
    const variants = [
      {
        id: "phone",
        when: { maxWidth: 500, maxAspectRatio: 0.8 },
        mode: "expand-height",
      },
      {
        id: "second-match",
        when: { maxAspectRatio: 1 },
        canvas: { width: 900, height: 1600 },
      },
    ] as const satisfies readonly GameViewportLayoutVariantV1[];
    const phone = renderViewportV1({
      canvas: { width: 1600, height: 1000 },
      fallbackSize: { width: 390, height: 844 },
      layoutVariants: variants,
    });

    expect(phone.layoutVariantId).toBe("phone");
    expect(phone.mode).toBe("expand-height");
    expect(phone.authoredRect.width).toBe(1600);

    cleanup();
    const secondMatch = renderViewportV1({
      canvas: { width: 1600, height: 1000 },
      fallbackSize: { width: 700, height: 1000 },
      layoutVariants: variants,
    });
    expect(secondMatch.layoutVariantId).toBe("second-match");
    expect(secondMatch.scale).toBeCloseTo(0.625);
    expect(secondMatch.authoredRect).toEqual({ x: 0, y: 0, width: 900, height: 1600 });

    cleanup();
    const fallback = renderViewportV1({
      canvas: { width: 1600, height: 1000 },
      fallbackSize: { width: 1200, height: 800 },
      layoutVariants: variants,
    });
    expect(fallback.layoutVariantId).toBeNull();
    expect(fallback.mode).toBe("fit");
  });

  it("rejects ambiguous variant identities and invalid ranges once at the declaration boundary", () => {
    expect(() =>
      render(
        <GameViewportV1
          canvas={{ width: 1600, height: 1000 }}
          fallbackSize={{ width: 390, height: 844 }}
          layoutVariants={[
            { id: "phone", when: { maxWidth: 500 } },
            { id: "phone", when: { minWidth: 501 } },
          ]}
        >
          <main />
        </GameViewportV1>,
      )
    ).toThrow("ui.game_viewport_invalid_layout_variants");

    expect(() =>
      render(
        <GameViewportV1
          canvas={{ width: 1600, height: 1000 }}
          fallbackSize={{ width: 390, height: 844 }}
          layoutVariants={[{ id: "impossible", when: { minAspectRatio: 2, maxAspectRatio: 1 } }]}
        >
          <main />
        </GameViewportV1>,
      )
    ).toThrow("ui.game_viewport_invalid_layout_variants");
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

    expect(() =>
      render(
        <GameViewportV1
          canvas={{ width: 1600, height: 1000 }}
          maxScale={0}
          fallbackSize={{ width: 1, height: 1 }}
        >
          <main />
        </GameViewportV1>,
      )
    ).toThrow("ui.game_viewport_invalid_max_scale");

    expect(() =>
      render(
        <GameViewportV1
          canvas={{ width: 1600, height: 1000 }}
          fallbackSize={{ width: 0, height: 1 }}
          mode="expand-height"
        >
          <main />
        </GameViewportV1>,
      )
    ).toThrow("ui.game_viewport_invalid_fallback_size");
  });
});
