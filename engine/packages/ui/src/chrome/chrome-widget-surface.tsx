// SPDX-License-Identifier: MIT
// Generic chrome widget host (authorable-chrome-layout M3, accepted
// 2026-08-29): renders the `widgets` section of a chrome-layout Document as
// real controls at their declared boxes. A widget only ever reports
// "intent id activated" through the Story-supplied port — routing power and
// legality stay in Story rules (the mid-hold-input boundary: declarative
// surfaces never gain routing power, and no second resolution path exists).
// The `hold_progress` kind renders a read-only meter from the committed
// pending-hold view; wall clocks and interpolation stay out.
import type { CSSProperties, ReactElement } from "react";

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

export interface ChromeWidgetSurfacePropsV1 {
  readonly layout: ChromeLayoutDocumentV1;
  readonly intents: ChromeWidgetIntentPortV1;
  /** Null/undefined hides every `hold_progress` widget. */
  readonly holdProgress?: ChromeHoldProgressViewV1 | null;
  readonly resolveText: (textId: string) => string;
  /** Optional icon delivery; without it (or the asset) the label renders. */
  readonly assets?: AssetUrlRegistryV1 | null;
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
}): ReactElement | null {
  const iconUrl = useAssetUrlV1(props.assets, props.assetId, "chrome_widget_icon");
  const state = props.intents.stateOf(props.intentId);
  if (state.status === "hidden") return null;
  const label = props.resolveText(props.labelTextId);
  const reasons = (state.reasonTextIds ?? []).map(props.resolveText).join(" · ");
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
      {iconUrl === null ? label : (
        <img
          src={iconUrl}
          alt=""
          draggable={false}
          style={{ inlineSize: "100%", blockSize: "100%", objectFit: "contain" }}
        />
      )}
    </IconButton>
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
              />
            );
          case "hold_progress": {
            if (holdProgress === null || holdProgress.totalMs <= 0) return null;
            const total = holdProgress.totalMs;
            const elapsed = Math.min(
              total,
              Math.max(0, total - holdProgress.remainingMs),
            );
            return (
              <ProgressMeter
                key={widgetName}
                accessibleName={props.resolveText(widget.labelTextId)}
                value={elapsed}
                max={total}
                data-chrome-widget={widgetName}
                data-chrome-widget-kind="hold_progress"
                style={chromeWidgetBoxStyleV1(box)}
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
