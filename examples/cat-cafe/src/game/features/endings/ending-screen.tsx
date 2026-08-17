// SPDX-License-Identifier: MIT
// Endings slice · passive whole-canvas renderer for enter-postgame and restart.
import type { ReactElement } from "react";

import type { WholeCanvasSurfaceRendererPropsV1 } from "@sillymaker/ui";
import { Button, useAssetUrlV1 } from "@sillymaker/ui";

import type { CatcafeAssetRegistryV1 } from "../../../application/ui-kit.ts";
import { catcafeThemeV1 } from "../../../application/ui-kit.ts";
import { catcafeAssetIdsV1 } from "../../../content/presentation.ts";

type CatcafeWholeCanvasTargetIdV1 = "catcafe.ending";
type CatcafeWholeCanvasActionIdV1 = "cc.enter_postgame" | "cc.restart";
type CatcafeEndingFrameV1 = WholeCanvasSurfaceRendererPropsV1<
  CatcafeWholeCanvasTargetIdV1,
  CatcafeWholeCanvasActionIdV1
>;

function endingFromViewV1(frame: CatcafeEndingFrameV1): string {
  if (
    frame.kind !== "primary" ||
    frame.view === null ||
    typeof frame.view !== "object" ||
    Array.isArray(frame.view) ||
    Object.keys(frame.view).join("\u0000") !== "ending"
  ) {
    throw new TypeError("catcafe.whole_canvas_ending_view_invalid");
  }
  const ending = (frame.view as { readonly ending?: unknown }).ending;
  if (
    ending !== "champion" &&
    ending !== "signboard" &&
    ending !== "adopted" &&
    ending !== "ordinary"
  ) {
    throw new TypeError("catcafe.whole_canvas_ending_view_invalid");
  }
  return ending;
}

export function CatcafeEndingScreenV1(props: {
  readonly frame: CatcafeEndingFrameV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
}): ReactElement {
  const ending = endingFromViewV1(props.frame);
  const continueAction = props.frame.actions.find((action) =>
    action.actionId === "cc.enter_postgame"
  );
  const restartAction = props.frame.actions.find((action) => action.actionId === "cc.restart");
  if (continueAction === undefined || restartAction === undefined) {
    throw new TypeError("catcafe.whole_canvas_ending_actions_invalid");
  }
  const endingUrl = useAssetUrlV1(props.registry, catcafeAssetIdsV1.bg_title, "scene_background");
  return (
    <section
      data-cc-ending={ending}
      aria-label={props.frame.resolveText(`text.cc.ending.${ending}`)}
      style={{
        inlineSize: "100%",
        blockSize: "100%",
        display: "grid",
        placeContent: "center",
        gap: "18px",
        textAlign: "center",
        color: catcafeThemeV1.ink,
        background: endingUrl === null
          ? "rgba(10, 12, 16, 0.92)"
          : `linear-gradient(rgba(10, 12, 16, 0.55), rgba(10, 12, 16, 0.75)), url(${
            JSON.stringify(endingUrl)
          }) center / cover no-repeat`,
      }}
    >
      <p style={{ margin: 0, fontSize: "15px", letterSpacing: "0.3em", opacity: 0.8 }}>
        {props.frame.resolveText("text.cc.ending.header")}
      </p>
      <h2 style={{ margin: 0, maxInlineSize: "22em", fontSize: "26px", lineHeight: 1.6 }}>
        {props.frame.resolveText(`text.cc.ending.${ending}`)}
      </h2>
      <span style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <Button
          data-cc-ending-continue="true"
          disabled={continueAction.status !== "enabled"}
          onClick={() => props.frame.onAction("cc.enter_postgame")}
        >
          {props.frame.resolveText("text.cc.ending.continue")}
        </Button>
        <Button
          data-cc-ending-restart="true"
          disabled={restartAction.status !== "enabled"}
          onClick={() => props.frame.onAction("cc.restart")}
        >
          {props.frame.resolveText("text.cc.ending.restart")}
        </Button>
      </span>
    </section>
  );
}
