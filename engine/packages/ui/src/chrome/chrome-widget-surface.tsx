// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type { ChromeLayoutBoxV1, ChromeLayoutDocumentV1 } from "@sillymaker/base";

import type { AssetUrlRegistryV1 } from "../assets/use-asset-url.ts";
import { useAssetUrlV1 } from "../assets/use-asset-url.ts";
import { IconButton } from "../primitives/icon-button.tsx";
import { ProgressMeter } from "../primitives/progress-meter.tsx";
import { useOptionalGameViewportV1 } from "../viewport/game-viewport.tsx";

export type ChromeIntentWidgetStatusV1 = "enabled" | "disabled" | "hidden";

export interface ChromeIntentWidgetStateV1 {
  readonly status: ChromeIntentWidgetStatusV1;
  readonly reasonTextIds?: readonly string[];
}

/**
 * Application-owned semantics for authorable chrome. The host only reports
 * the admitted intent id; it never maps an id to a command or reads gameplay
 * State itself.
 */
export interface ChromeWidgetIntentPortV1 {
  readonly stateOf: (intentId: string) => ChromeIntentWidgetStateV1;
  readonly onActivate: (intentId: string) => void;
}

/** A committed hold projection; no wall-clock interpolation belongs here. */
export interface ChromeHoldProgressViewV1 {
  readonly remainingMs: number;
  readonly totalMs: number;
}

export type ChromeHoldProgressResolverV1 = (
  widgetName: string,
) => ChromeHoldProgressViewV1 | null;

export interface ChromeIntentWidgetRenderContextV1 {
  readonly widgetName: string;
  readonly intentId: string;
  readonly box: ChromeLayoutBoxV1;
  readonly label: string;
  readonly status: Exclude<ChromeIntentWidgetStatusV1, "hidden">;
  readonly reasonTexts: readonly string[];
}

export interface ChromeHoldProgressRenderContextV1 {
  readonly widgetName: string;
  readonly box: ChromeLayoutBoxV1;
  readonly label: string;
  readonly remainingMs: number;
  readonly totalMs: number;
}

export interface ChromeWidgetSurfacePropsV1 {
  readonly layout: ChromeLayoutDocumentV1;
  readonly intents: ChromeWidgetIntentPortV1;
  readonly holdProgress?: ChromeHoldProgressViewV1 | ChromeHoldProgressResolverV1 | null;
  readonly resolveText: (textId: string) => string;
  readonly assets?: AssetUrlRegistryV1 | null;
  /** Product pixels inside the engine-hosted accessible button. */
  readonly renderIntent?: (context: ChromeIntentWidgetRenderContextV1) => ReactNode;
  /** Product pixels inside engine-hosted progress semantics; null hides this slot. */
  readonly renderHoldProgress?: (
    context: ChromeHoldProgressRenderContextV1,
  ) => ReactNode | null;
}

function chromeWidgetBoxStyleV1(box: ChromeLayoutBoxV1): CSSProperties {
  return {
    position: "absolute",
    insetInlineStart: `${String(box.x)}px`,
    insetBlockStart: `${String(box.y)}px`,
    inlineSize: `${String(box.width)}px`,
    blockSize: `${String(box.height)}px`,
    boxSizing: "border-box",
  };
}

function ChromeIntentWidgetButtonV1(props: {
  readonly widgetName: string;
  readonly box: ChromeLayoutBoxV1;
  readonly intentId: string;
  readonly labelTextId: string;
  readonly assetId: string | undefined;
  readonly intents: ChromeWidgetIntentPortV1;
  readonly resolveText: (textId: string) => string;
  readonly assets: AssetUrlRegistryV1 | null;
  readonly renderIntent: ChromeWidgetSurfacePropsV1["renderIntent"];
}): ReactElement | null {
  const iconUrl = useAssetUrlV1(props.assets, props.assetId, "chrome_widget_icon");
  const state = props.intents.stateOf(props.intentId);
  if (state.status === "hidden") return null;
  const label = props.resolveText(props.labelTextId);
  const reasonTexts = (state.reasonTextIds ?? []).map(props.resolveText);
  const stockPixels = iconUrl === null ? label : (
    <img
      src={iconUrl}
      alt=""
      draggable={false}
      style={{ inlineSize: "100%", blockSize: "100%", objectFit: "contain" }}
    />
  );
  return (
    <IconButton
      accessibleName={label}
      data-chrome-widget={props.widgetName}
      data-chrome-widget-kind="intent"
      data-chrome-intent={props.intentId}
      disabled={state.status === "disabled"}
      title={state.status === "disabled" && reasonTexts.length > 0
        ? reasonTexts.join(" · ")
        : label}
      style={{ ...chromeWidgetBoxStyleV1(props.box), pointerEvents: "auto" }}
      onClick={() => props.intents.onActivate(props.intentId)}
    >
      {props.renderIntent === undefined ? stockPixels : props.renderIntent({
        widgetName: props.widgetName,
        intentId: props.intentId,
        box: props.box,
        label,
        status: state.status,
        reasonTexts,
      })}
    </IconButton>
  );
}

function ChromeHoldProgressWidgetV1(props: {
  readonly widgetName: string;
  readonly box: ChromeLayoutBoxV1;
  readonly label: string;
  readonly view: ChromeHoldProgressViewV1;
  readonly renderHoldProgress: ChromeWidgetSurfacePropsV1["renderHoldProgress"];
}): ReactElement | null {
  const elapsedMs = props.view.totalMs - props.view.remainingMs;
  if (props.renderHoldProgress === undefined) {
    return (
      <ProgressMeter
        accessibleName={props.label}
        value={elapsedMs}
        max={props.view.totalMs}
        data-chrome-widget={props.widgetName}
        data-chrome-widget-kind="hold_progress"
        style={chromeWidgetBoxStyleV1(props.box)}
      />
    );
  }
  const pixels = props.renderHoldProgress({
    widgetName: props.widgetName,
    box: props.box,
    label: props.label,
    remainingMs: props.view.remainingMs,
    totalMs: props.view.totalMs,
  });
  if (pixels === null) return null;
  return (
    <div
      role="progressbar"
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuenow={elapsedMs}
      aria-valuemax={props.view.totalMs}
      data-chrome-widget={props.widgetName}
      data-chrome-widget-kind="hold_progress"
      style={chromeWidgetBoxStyleV1(props.box)}
    >
      <span aria-hidden="true">{pixels}</span>
    </div>
  );
}

/**
 * Renders authorable widgets in the same logical Stage coordinate system.
 * Under GameViewport the surface reuses its one scale and authored origin;
 * without a viewport it renders the declared canvas 1:1 for previews/tests.
 * Responsive CSS-pixel shell UI remains outside this component.
 */
export function ChromeWidgetSurfaceV1(props: ChromeWidgetSurfacePropsV1): ReactElement | null {
  const geometry = useOptionalGameViewportV1();
  const widgets = props.layout.widgets;
  const widgetEntries = useMemo(
    () => widgets === undefined ? [] : Object.entries(widgets),
    [widgets],
  );
  if (widgetEntries.length === 0) return null;
  if (
    geometry !== null &&
    (geometry.authoredRect.width !== props.layout.canvas.width ||
      geometry.authoredRect.height !== props.layout.canvas.height)
  ) {
    throw new TypeError("ui.chrome_widget_canvas_mismatch");
  }

  const scale = geometry?.scale ?? 1;
  const liveCanvas = geometry?.canvas ?? props.layout.canvas;
  const authoredRect = geometry?.authoredRect ?? {
    x: 0,
    y: 0,
    width: props.layout.canvas.width,
    height: props.layout.canvas.height,
  };
  const holdProgress = props.holdProgress ?? null;

  return (
    <div
      data-chrome-widget-surface="true"
      data-chrome-widget-scale={scale.toFixed(4)}
      style={{
        position: geometry === null ? "relative" : "absolute",
        insetBlockStart: 0,
        insetInlineStart: 0,
        inlineSize: `${String(liveCanvas.width)}px`,
        blockSize: `${String(liveCanvas.height)}px`,
        transform: scale === 1 ? undefined : `scale(${String(scale)})`,
        transformOrigin: "0 0",
        pointerEvents: "none",
      }}
    >
      <div
        data-chrome-widget-coordinate-origin="true"
        style={{
          position: "absolute",
          insetInlineStart: `${String(authoredRect.x)}px`,
          insetBlockStart: `${String(authoredRect.y)}px`,
          inlineSize: `${String(authoredRect.width)}px`,
          blockSize: `${String(authoredRect.height)}px`,
        }}
      >
        {widgetEntries.map(([widgetName, widget]) => {
          const box = props.layout.boxes[widget.box] as ChromeLayoutBoxV1;
          if (widget.kind === "intent") {
            return (
              <ChromeIntentWidgetButtonV1
                key={widgetName}
                widgetName={widgetName}
                box={box}
                intentId={widget.intentId}
                labelTextId={widget.labelTextId}
                assetId={widget.assetId}
                intents={props.intents}
                resolveText={props.resolveText}
                assets={props.assets ?? null}
                renderIntent={props.renderIntent}
              />
            );
          }
          const view = typeof holdProgress === "function" ? holdProgress(widgetName) : holdProgress;
          return view === null ? null : (
            <ChromeHoldProgressWidgetV1
              key={widgetName}
              widgetName={widgetName}
              box={box}
              label={props.resolveText(widget.labelTextId)}
              view={view}
              renderHoldProgress={props.renderHoldProgress}
            />
          );
        })}
      </div>
    </div>
  );
}
