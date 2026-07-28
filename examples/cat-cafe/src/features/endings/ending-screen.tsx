// SPDX-License-Identifier: MIT
// Endings slice · UI: the fullscreen ending screen (title art backdrop) with enter-postgame and restart.
import type { ReactElement } from "react";

import { Button, useAssetUrlV1 } from "@sillymaker/ui";

import type { CatcafeAssetRegistryV1, CatcafeSemanticPortV1 } from "../../application/ui-kit.ts";
import { catcafeThemeV1, dispatchV1 } from "../../application/ui-kit.ts";
import { catcafeAssetIdsV1 } from "../../presentation.ts";

export function CatcafeEndingScreenV1(props: {
  readonly ending: string;
  readonly semantic: CatcafeSemanticPortV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
  readonly uiText: (textId: string) => string;
  onRestart(): void;
}): ReactElement {
  const { uiText } = props;
  const endingUrl = useAssetUrlV1(props.registry, catcafeAssetIdsV1.bg_title, "scene_background");
  return (
    <section
      data-cc-ending={props.ending}
      role="dialog"
      aria-label={uiText(`text.cc.ending.${props.ending}`)}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeContent: "center",
        gap: "18px",
        textAlign: "center",
        color: catcafeThemeV1.ink,
        background:
          endingUrl === null
            ? "rgba(10, 12, 16, 0.92)"
            : `linear-gradient(rgba(10, 12, 16, 0.55), rgba(10, 12, 16, 0.75)), url(${JSON.stringify(endingUrl)}) center / cover no-repeat`,
        zIndex: 6,
        pointerEvents: "auto",
      }}
    >
      <p style={{ margin: 0, fontSize: "15px", letterSpacing: "0.3em", opacity: 0.8 }}>
        {uiText("text.cc.ending.header")}
      </p>
      <h2 style={{ margin: 0, maxInlineSize: "22em", fontSize: "26px", lineHeight: 1.6 }}>
        {uiText(`text.cc.ending.${props.ending}`)}
      </h2>
      <span style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <Button
          data-cc-ending-continue="true"
          onClick={() =>
            dispatchV1(props.semantic, { kind: "invoke", actionId: "cc.enter_postgame" })
          }
        >
          {uiText("text.cc.ending.continue")}
        </Button>
        <Button data-cc-ending-restart="true" onClick={props.onRestart}>
          {uiText("text.cc.ending.restart")}
        </Button>
      </span>
    </section>
  );
}
