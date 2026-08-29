// SPDX-License-Identifier: MIT
// Generic chrome widget host (authorable-chrome-layout M3, accepted
// 2026-08-29): renders the `widgets` section of a chrome-layout Document as
// real controls at their declared boxes. A widget only ever reports
// "intent id activated" through the Story-supplied port — routing power and
// legality stay in Story rules (the mid-hold-input boundary: declarative
// surfaces never gain routing power, and no second resolution path exists).
// The `hold_progress` kind renders a read-only meter from the committed
// pending-hold view; wall clocks and interpolation stay out.
//
// Story pixel ownership (evidence-gated by the golden-baseline migration,
// same day): the optional `renderIntent`/`renderHoldProgress` hooks let a
// Story replace the stock visuals while the host keeps every semantic —
// the button element with its accessibility and single-activation wiring,
// the progressbar role with committed values, box placement, and the
// availability projection. Multi-slot HUDs may resolve the committed view
// per widget by passing a function as `holdProgress`.
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type { ChromeLayoutBoxV1, ChromeLayoutDocumentV1 } from "@sillymaker/base";

import type { AssetUrlRegistryV1 } from "../assets/use-asset-url.ts";
import { useAssetUrlV1 } from "../assets/use-asset-url.ts";
import { IconButton } from "../primitives/icon-button.tsx";
import { ProgressMeter } from "../primitives/progress-meter.tsx";

export type ChromeIntentWidgetStatusV1 = "enabled" | "disabled" | "hidden";

export interface ChromeIntentWidgetStateV1 {
  readonly status: ChromeIntentWidgetStatusV1;
  /** Story text ids explaining a disabled control (rendered as the title). */
  readonly reasonTextIds?: readonly string[];
}

/**
 * The Story-side intent port. `stateOf` is the availability projection
 * (unknown intent ids should report `hidden`); `onActivate` receives the
 * declared intent id exactly once per activation and owns the mapping to a
 * semantic invocation.
 */
export interface ChromeWidgetIntentPortV1 {
  readonly stateOf: (intentId: string) => ChromeIntentWidgetStateV1;
  readonly onActivate: (intentId: string) => void;
}

/** Committed authoritative pending-hold view (no wall-clock smoothing). */
export interface ChromeHoldProgressViewV1 {
  readonly remainingMs: number;
  readonly totalMs: number;
}

/**
 * Per-widget committed-view resolver for multi-slot progress HUDs: the
 * Story returns the view only for the widget the current hold occupies
 * (null hides that widget). Values still come from committed facts only.
 */
export type ChromeHoldProgressResolverV1 = (
  widgetName: string,
) => ChromeHoldProgressViewV1 | null;

/** Story pixel hook input for an `intent` widget (semantics stay hosted). */
export interface ChromeIntentWidgetRenderContextV1 {
  readonly widgetName: string;
  readonly intentId: string;
  readonly box: ChromeLayoutBoxV1;
  readonly label: string;
  readonly status: Exclude<ChromeIntentWidgetStatusV1, "hidden">;
  /** Resolved disabled reasons (empty when enabled). */
  readonly reasonTexts: readonly string[];
}

/** Story pixel hook input for a `hold_progress` widget. */
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
  /**
   * Null/undefined hides every `hold_progress` widget; a function resolves
   * the committed view per widget (multi-slot HUDs).
   */
  readonly holdProgress?: ChromeHoldProgressViewV1 | ChromeHoldProgressResolverV1 | null;
  readonly resolveText: (textId: string) => string;
  /** Optional icon delivery; without it (or the asset) the label renders. */
  readonly assets?: AssetUrlRegistryV1 | null;
  /**
   * Optional Story-owned pixels inside the hosted button (the host keeps
   * the element, accessibility, disabled gating, and single activation).
   */
  readonly renderIntent?: (context: ChromeIntentWidgetRenderContextV1) => ReactNode;
  /**
   * Optional Story-owned pixels inside the hosted progressbar (the host
   * keeps the role, committed values, and box placement). Returning null
   * hides that widget.
   */
  readonly renderHoldProgress?: (context: ChromeHoldProgressRenderContextV1) => ReactNode | null;
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
  readonly renderIntent: ((context: ChromeIntentWidgetRenderContextV1) => ReactNode) | undefined;
}): ReactElement | null {
  const iconUrl = useAssetUrlV1(props.assets, props.assetId, "chrome_widget_icon");
  const state = props.intents.stateOf(props.intentId);
  if (state.status === "hidden") return null;
  const label = props.resolveText(props.labelTextId);
  const reasonTexts = (state.reasonTextIds ?? []).map(props.resolveText);
  const reasons = reasonTexts.join(" · ");
  const stockChildren = iconUrl === null ? label : (
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
      title={state.status === "disabled" && reasons.length > 0 ? reasons : label}
      style={chromeWidgetBoxStyleV1(props.box)}
      onClick={() => {
        props.intents.onActivate(props.intentId);
      }}
    >
      {props.renderIntent === undefined ? stockChildren : props.renderIntent({
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
  readonly renderHoldProgress:
    | ((context: ChromeHoldProgressRenderContextV1) => ReactNode | null)
    | undefined;
}): ReactElement | null {
  const total = props.view.totalMs;
  const elapsed = Math.min(total, Math.max(0, total - props.view.remainingMs));
  if (props.renderHoldProgress === undefined) {
    return (
      <ProgressMeter
        accessibleName={props.label}
        value={elapsed}
        max={total}
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
    totalMs: total,
  });
  if (pixels === null) return null;
  // Story owns the pixels; the host keeps the progressbar semantics and
  // the committed values (the visual content is presentational only).
  return (
    <div
      role="progressbar"
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuenow={elapsed}
      aria-valuemax={total}
      data-chrome-widget={props.widgetName}
      data-chrome-widget-kind="hold_progress"
      style={chromeWidgetBoxStyleV1(props.box)}
    >
      <span aria-hidden="true">{pixels}</span>
    </div>
  );
}

/**
 * Mount inside the Story's HUD-slot chrome: the parent element must
 * establish the containing block in logical canvas space (the same space
 * the chrome-layout Document's boxes are authored in).
 */
export function ChromeWidgetSurfaceV1(props: ChromeWidgetSurfacePropsV1): ReactElement | null {
  const widgets = props.layout.widgets;
  if (widgets === undefined) return null;
  const entries = Object.entries(widgets);
  if (entries.length === 0) return null;
  const holdProgress = props.holdProgress ?? null;
  return (
    <>
      {entries.map(([widgetName, widget]) => {
        // Admission guarantees the referenced box exists.
        const box = props.layout.boxes[widget.box] as ChromeLayoutBoxV1;
        switch (widget.kind) {
          case "intent":
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
          case "hold_progress": {
            const view = typeof holdProgress === "function"
              ? holdProgress(widgetName)
              : holdProgress;
            if (view === null || view.totalMs <= 0) return null;
            return (
              <ChromeHoldProgressWidgetV1
                key={widgetName}
                widgetName={widgetName}
                box={box}
                label={props.resolveText(widget.labelTextId)}
                view={view}
                renderHoldProgress={props.renderHoldProgress}
              />
            );
          }
          default: {
            const unreachable: never = widget;
            throw new TypeError(`chrome_widget_kind_unreachable:${String(unreachable)}`);
          }
        }
      })}
    </>
  );
}
