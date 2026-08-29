// SPDX-License-Identifier: MIT
import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import styles from "./game-viewport.module.css";

/** The application-declared logical canvas (design resolution). */
export interface GameViewportCanvasV1 {
  readonly width: number;
  readonly height: number;
}

export type GameViewportModeV1 = "fit" | "fluid" | "expand-height" | "expand-width";

/**
 * Presentation policy for products whose authored canvas has no portrait layout.
 * `landscape-only` rotates only the managed content frame; it does not claim an
 * operating-system orientation lock.
 */
export type GameViewportContentOrientationV1 = "responsive" | "landscape-only";

export interface GameViewportRectV1 extends GameViewportCanvasV1 {
  readonly x: number;
  readonly y: number;
}

export interface GameViewportPointV1 {
  readonly x: number;
  readonly y: number;
}

/** Inclusive container-CSS-pixel query for one finite layout variant. */
export interface GameViewportLayoutQueryV1 {
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly minAspectRatio?: number;
  readonly maxAspectRatio?: number;
}

/**
 * Ordered presentation variant. The first matching declaration replaces the
 * selected fields; omitted fields inherit the application's fallback.
 */
export interface GameViewportLayoutVariantV1 {
  readonly id: string;
  readonly when: GameViewportLayoutQueryV1;
  readonly canvas?: GameViewportCanvasV1;
  readonly mode?: GameViewportModeV1;
}

/**
 * Read-only geometry of the current viewport mapping. All stage placement
 * math must go through these queries; renderers must not measure the window
 * to build a second conversion authority.
 */
export interface GameViewportGeometryV1 {
  /** The complete live logical canvas currently visible in the canvas box. */
  readonly canvas: GameViewportCanvasV1;
  /** The authored coordinate area within `canvas`. */
  readonly authoredRect: GameViewportRectV1;
  readonly mode: GameViewportModeV1;
  readonly contentOrientation: GameViewportContentOrientationV1;
  /** Clockwise presentation compensation applied by the managed canvas. */
  readonly clockwiseRotationDegrees: 0 | 90;
  readonly layoutVariantId: string | null;
  /** Continuous scale factor from logical units to CSS pixels. */
  readonly scale: number;
  readonly cssWidth: number;
  readonly cssHeight: number;
  /** Letterbox thickness in CSS pixels on each inline/block side. */
  readonly letterboxInline: number;
  readonly letterboxBlock: number;
  toCssPx(logical: number): number;
  /** Maps one authored Stage point to canvas-relative CSS pixels. */
  toCanvasCssPoint(point: GameViewportPointV1): GameViewportPointV1;
}

export interface GameViewportSizeV1 {
  readonly width: number;
  readonly height: number;
}

export interface GameViewportPropsV1 {
  readonly canvas: GameViewportCanvasV1;
  /**
   * "fit" (default) maps the fixed logical canvas onto the measured container with
   * fit scaling and letterbox. "fluid" fills the available area 1:1 —
   * geometry reports the live size as the canvas, scale stays 1, and no
   * letterbox exists. Fluid suits shells that lay out like documents or
   * desktops (text games, window managers) rather than a fixed picture;
   * the declared canvas then only serves as the measurement fallback.
   */
  readonly mode?: GameViewportModeV1;
  /**
   * `responsive` (default) follows the measured container. `landscape-only`
   * presents the same logical canvas in a clockwise landscape frame while the
   * physical container is portrait, then removes that compensation when the
   * device or window becomes landscape.
   */
  readonly contentOrientation?: GameViewportContentOrientationV1;
  /** Finite ordered variants selected only from the measured container size. */
  readonly layoutVariants?: readonly GameViewportLayoutVariantV1[];
  /**
   * Optional upper scale bound. When omitted, the canvas follows the measured
   * container without an engine-imposed cap; use `1` for a deliberate 1:1
   * ceiling such as pixel art.
   */
  readonly maxScale?: number;
  /** Size used when live measurement is unavailable (tests, headless DOM). */
  readonly fallbackSize?: GameViewportSizeV1;
  readonly children: ReactNode;
}

const GameViewportContextV1 = createContext<GameViewportGeometryV1 | null>(null);

export function useGameViewportV1(): GameViewportGeometryV1 {
  const geometry = useContext(GameViewportContextV1);
  if (geometry === null) throw new Error("ui.game_viewport_missing");
  return geometry;
}

/** Reads the viewport geometry without requiring a managed viewport. */
export function useOptionalGameViewportV1(): GameViewportGeometryV1 | null {
  return useContext(GameViewportContextV1);
}

function computeGeometryV1(
  canvas: GameViewportCanvasV1,
  available: GameViewportSizeV1,
  maxScale: number,
  mode: GameViewportModeV1,
  contentOrientation: GameViewportContentOrientationV1,
  clockwiseRotationDegrees: 0 | 90,
  layoutVariantId: string | null,
): GameViewportGeometryV1 {
  if (mode === "fluid") {
    const fluidCanvas = { width: available.width, height: available.height };
    return {
      canvas: fluidCanvas,
      authoredRect: { x: 0, y: 0, ...fluidCanvas },
      mode,
      contentOrientation,
      clockwiseRotationDegrees,
      layoutVariantId,
      scale: 1,
      cssWidth: available.width,
      cssHeight: available.height,
      letterboxInline: 0,
      letterboxBlock: 0,
      toCssPx: (logical: number) => logical,
      toCanvasCssPoint: (point: GameViewportPointV1) => point,
    };
  }
  const fitScale = Math.min(available.width / canvas.width, available.height / canvas.height);
  const scale = Math.min(Math.max(fitScale, 0), maxScale);
  const liveCanvas = mode === "expand-height"
    ? { width: canvas.width, height: Math.max(canvas.height, available.height / scale) }
    : mode === "expand-width"
    ? { width: Math.max(canvas.width, available.width / scale), height: canvas.height }
    : canvas;
  const authoredRect = {
    x: (liveCanvas.width - canvas.width) / 2,
    y: (liveCanvas.height - canvas.height) / 2,
    width: canvas.width,
    height: canvas.height,
  };
  const cssWidth = liveCanvas.width * scale;
  const cssHeight = liveCanvas.height * scale;
  return {
    canvas: liveCanvas,
    authoredRect,
    mode,
    contentOrientation,
    clockwiseRotationDegrees,
    layoutVariantId,
    scale,
    cssWidth,
    cssHeight,
    letterboxInline: Math.max(0, (available.width - cssWidth) / 2),
    letterboxBlock: Math.max(0, (available.height - cssHeight) / 2),
    toCssPx: (logical: number) => logical * scale,
    toCanvasCssPoint: (point: GameViewportPointV1) => ({
      x: (point.x + authoredRect.x) * scale,
      y: (point.y + authoredRect.y) * scale,
    }),
  };
}

function matchesLayoutVariantV1(
  query: GameViewportLayoutQueryV1,
  available: GameViewportSizeV1,
): boolean {
  const aspectRatio = available.width / available.height;
  return (query.minWidth === undefined || available.width >= query.minWidth) &&
    (query.maxWidth === undefined || available.width <= query.maxWidth) &&
    (query.minAspectRatio === undefined || aspectRatio >= query.minAspectRatio) &&
    (query.maxAspectRatio === undefined || aspectRatio <= query.maxAspectRatio);
}

function assertCanvasV1(canvas: GameViewportCanvasV1): void {
  if (
    !Number.isFinite(canvas.width) || !Number.isFinite(canvas.height) || canvas.width <= 0 ||
    canvas.height <= 0
  ) {
    throw new TypeError("ui.game_viewport_invalid_canvas");
  }
}

function admitLayoutVariantsV1(
  variants: readonly GameViewportLayoutVariantV1[] | undefined,
): readonly GameViewportLayoutVariantV1[] {
  if (variants === undefined) return [];
  const ids = new Set<string>();
  for (const variant of variants) {
    if (variant.id.length === 0 || ids.has(variant.id)) {
      throw new TypeError("ui.game_viewport_invalid_layout_variants");
    }
    ids.add(variant.id);
    if (variant.canvas !== undefined) assertCanvasV1(variant.canvas);
    const { minWidth, maxWidth, minAspectRatio, maxAspectRatio } = variant.when;
    const bounds = [minWidth, maxWidth, minAspectRatio, maxAspectRatio];
    if (bounds.some((value) => value !== undefined && (!Number.isFinite(value) || value <= 0))) {
      throw new TypeError("ui.game_viewport_invalid_layout_variants");
    }
    if (
      (minWidth !== undefined && maxWidth !== undefined && minWidth > maxWidth) ||
      (minAspectRatio !== undefined && maxAspectRatio !== undefined &&
        minAspectRatio > maxAspectRatio)
    ) {
      throw new TypeError("ui.game_viewport_invalid_layout_variants");
    }
  }
  return variants;
}

function measureElementV1(element: HTMLElement): GameViewportSizeV1 | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { width: rect.width, height: rect.height };
}

/**
 * GameViewport maps the declared logical canvas onto its measured container.
 * Stage-space content uses the selected geometry and `--gv-scale`; shell-space
 * content lays out in CSS pixels over the live canvas.
 */
export function GameViewportV1(props: GameViewportPropsV1): ReactElement {
  assertCanvasV1(props.canvas);
  if (props.fallbackSize !== undefined) {
    if (
      !Number.isFinite(props.fallbackSize.width) ||
      !Number.isFinite(props.fallbackSize.height) ||
      props.fallbackSize.width <= 0 ||
      props.fallbackSize.height <= 0
    ) {
      throw new TypeError("ui.game_viewport_invalid_fallback_size");
    }
  }
  const maxScale = props.maxScale ?? Number.POSITIVE_INFINITY;
  if (props.maxScale !== undefined && (!Number.isFinite(maxScale) || maxScale <= 0)) {
    throw new TypeError("ui.game_viewport_invalid_max_scale");
  }
  const mode = props.mode ?? "fit";
  const contentOrientation = props.contentOrientation ?? "responsive";
  const [outerElement, setOuterElement] = useState<HTMLElement | null>(null);
  const [measured, setMeasured] = useState<GameViewportSizeV1 | null>(null);

  useLayoutEffect(() => {
    if (outerElement === null) return undefined;
    const measure = (): void => {
      setMeasured(measureElementV1(outerElement));
    };
    measure();
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(measure);
      observer.observe(outerElement);
      return () => observer.disconnect();
    }
    const target: Pick<typeof globalThis, "addEventListener" | "removeEventListener"> = globalThis;
    target.addEventListener("resize", measure);
    return () => target.removeEventListener("resize", measure);
  }, [outerElement]);

  const availableWidth = measured?.width ?? props.fallbackSize?.width ?? props.canvas.width;
  const availableHeight = measured?.height ?? props.fallbackSize?.height ?? props.canvas.height;
  const layoutVariants = useMemo(
    () => admitLayoutVariantsV1(props.layoutVariants),
    [props.layoutVariants],
  );
  const geometry = useMemo(
    () => {
      const clockwiseRotationDegrees = contentOrientation === "landscape-only" &&
          availableWidth < availableHeight
        ? 90
        : 0;
      const available = clockwiseRotationDegrees === 90
        ? { width: availableHeight, height: availableWidth }
        : { width: availableWidth, height: availableHeight };
      const variant = layoutVariants.find((candidate) =>
        matchesLayoutVariantV1(candidate.when, available)
      );
      const selectedCanvas = variant?.canvas ?? props.canvas;
      return computeGeometryV1(
        selectedCanvas,
        available,
        maxScale,
        variant?.mode ?? mode,
        contentOrientation,
        clockwiseRotationDegrees,
        variant?.id ?? null,
      );
    },
    [
      availableHeight,
      availableWidth,
      contentOrientation,
      layoutVariants,
      maxScale,
      mode,
      props.canvas,
    ],
  );

  const canvasStyle = {
    inlineSize: geometry.mode === "fluid" && geometry.clockwiseRotationDegrees === 0
      ? "100%"
      : `${String(geometry.cssWidth)}px`,
    blockSize: geometry.mode === "fluid" && geometry.clockwiseRotationDegrees === 0
      ? "100%"
      : `${String(geometry.cssHeight)}px`,
    "--gv-scale": String(geometry.scale),
    "--gv-canvas-width": String(geometry.canvas.width),
    "--gv-canvas-height": String(geometry.canvas.height),
    ...(geometry.clockwiseRotationDegrees === 90
      ? {
        rotate: "90deg",
        "--silly-safe-area-block-start": "var(--silly-safe-area-physical-right)",
        "--silly-safe-area-inline-end": "var(--silly-safe-area-physical-bottom)",
        "--silly-safe-area-block-end": "var(--silly-safe-area-physical-left)",
        "--silly-safe-area-inline-start": "var(--silly-safe-area-physical-top)",
      }
      : {}),
    ...(geometry.mode === "fluid" ? {} : {
      "--silly-stage-aspect-ratio": `${String(geometry.canvas.width)} / ${
        String(geometry.canvas.height)
      }`,
    }),
  } as CSSProperties;

  return (
    <div ref={setOuterElement} className={styles["game-viewport"]} data-testid="game-viewport">
      <div
        className={styles["game-viewport__canvas"]}
        data-game-viewport-canvas="true"
        data-viewport-scale={geometry.scale.toFixed(4)}
        data-viewport-mode={geometry.mode}
        data-viewport-content-orientation={geometry.contentOrientation}
        data-viewport-rotation={String(geometry.clockwiseRotationDegrees)}
        data-viewport-layout-variant={geometry.layoutVariantId ?? undefined}
        style={canvasStyle}
      >
        <GameViewportContextV1.Provider value={geometry}>
          {props.children}
        </GameViewportContextV1.Provider>
      </div>
    </div>
  );
}
