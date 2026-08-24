// SPDX-License-Identifier: MIT
import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import styles from "./game-viewport.module.css";

/** The application-declared logical canvas (design resolution). */
export interface GameViewportCanvasV1 {
  readonly width: number;
  readonly height: number;
}

/**
 * Read-only geometry of the current viewport mapping. All stage placement
 * math must go through these queries; renderers must not measure the window
 * to build a second conversion authority.
 */
export interface GameViewportGeometryV1 {
  readonly canvas: GameViewportCanvasV1;
  /** Continuous scale factor from logical units to CSS pixels. */
  readonly scale: number;
  readonly cssWidth: number;
  readonly cssHeight: number;
  /** Letterbox thickness in CSS pixels on each inline/block side. */
  readonly letterboxInline: number;
  readonly letterboxBlock: number;
  toCssPx(logical: number): number;
}

export interface GameViewportSizeV1 {
  readonly width: number;
  readonly height: number;
}

export interface GameViewportPropsV1 {
  readonly canvas: GameViewportCanvasV1;
  /**
   * "fit" (default) maps the fixed logical canvas onto the window with
   * fit scaling and letterbox. "fluid" fills the available area 1:1 —
   * geometry reports the live size as the canvas, scale stays 1, and no
   * letterbox exists. Fluid suits shells that lay out like documents or
   * desktops (text games, window managers) rather than a fixed picture;
   * the declared canvas then only serves as the measurement fallback.
   */
  readonly mode?: "fit" | "fluid";
  /** Upper scale bound; the canvas centers instead of growing past it. */
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
  mode: "fit" | "fluid",
): GameViewportGeometryV1 {
  if (mode === "fluid") {
    const fluidCanvas = { width: available.width, height: available.height };
    return {
      canvas: fluidCanvas,
      scale: 1,
      cssWidth: available.width,
      cssHeight: available.height,
      letterboxInline: 0,
      letterboxBlock: 0,
      toCssPx: (logical: number) => logical,
    };
  }
  const fitScale = Math.min(available.width / canvas.width, available.height / canvas.height);
  const scale = Math.min(Math.max(fitScale, 0), maxScale);
  const cssWidth = canvas.width * scale;
  const cssHeight = canvas.height * scale;
  return {
    canvas,
    scale,
    cssWidth,
    cssHeight,
    letterboxInline: Math.max(0, (available.width - cssWidth) / 2),
    letterboxBlock: Math.max(0, (available.height - cssHeight) / 2),
    toCssPx: (logical: number) => logical * scale,
  };
}

function measureElementV1(element: HTMLElement): GameViewportSizeV1 | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { width: rect.width, height: rect.height };
}

/**
 * GameViewport maps the declared logical canvas onto the available window
 * with fit scaling and letterboxing. Stage-space content scales with the
 * canvas (via geometry queries or the `--gv-scale` variable); shell-space
 * content anchors to canvas regions but keeps device-pixel text rendering.
 */
export function GameViewportV1(props: GameViewportPropsV1): ReactElement {
  if (!(props.canvas.width > 0) || !(props.canvas.height > 0)) {
    throw new TypeError("ui.game_viewport_invalid_canvas");
  }
  const maxScale = props.maxScale ?? 1;
  const mode = props.mode ?? "fit";
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
  const canvasWidth = props.canvas.width;
  const canvasHeight = props.canvas.height;
  const geometry = useMemo(
    () =>
      computeGeometryV1(
        { width: canvasWidth, height: canvasHeight },
        { width: availableWidth, height: availableHeight },
        maxScale,
        mode,
      ),
    [availableHeight, availableWidth, canvasHeight, canvasWidth, maxScale, mode],
  );

  const canvasStyle = {
    inlineSize: mode === "fluid" ? "100%" : `${String(geometry.cssWidth)}px`,
    blockSize: mode === "fluid" ? "100%" : `${String(geometry.cssHeight)}px`,
    "--gv-scale": String(geometry.scale),
    "--gv-canvas-width": String(props.canvas.width),
    "--gv-canvas-height": String(props.canvas.height),
    ...(mode === "fluid" ? {} : {
      "--silly-stage-aspect-ratio": `${String(props.canvas.width)} / ${
        String(props.canvas.height)
      }`,
    }),
  } as CSSProperties;

  return (
    <div ref={setOuterElement} className={styles["game-viewport"]} data-testid="game-viewport">
      <div
        className={styles["game-viewport__canvas"]}
        data-game-viewport-canvas="true"
        data-viewport-scale={geometry.scale.toFixed(4)}
        style={canvasStyle}
      >
        <GameViewportContextV1.Provider value={geometry}>
          {props.children}
        </GameViewportContextV1.Provider>
      </div>
    </div>
  );
}
