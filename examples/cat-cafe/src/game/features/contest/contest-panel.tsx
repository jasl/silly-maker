// SPDX-License-Identifier: MIT
// Contest slice · UI: the contest panel (opponent art, morale bars, move row) and the win/loss toast.
import { useEffect, useState } from "react";
import type { CSSProperties, ReactElement } from "react";

import type { DeepReadonly } from "@sillymaker/base";
import { Button, useAssetUrlV1 } from "@sillymaker/ui";

import type { CatcafeApplicationInstanceV1 } from "../../../application/core-definition.ts";
import { CatcafeStatBarV1 } from "../../../application/stat-bar.tsx";
import type {
  CatcafeAssetRegistryV1,
  CatcafeSemanticPortV1,
  CatcafeUiPublicationV1,
} from "../../../application/ui-kit.ts";
import { catcafeThemeV1, dispatchV1 } from "../../../application/ui-kit.ts";
import { catcafeMovesV1, catcafeRivalsV1 } from "../../content.ts";
import { catcafeAssetIdsV1 } from "../../../content/presentation.ts";

export const catcafeRivalAssetForV1 = (rivalId: string): string | undefined =>
  rivalId === "rival.mochi"
    ? catcafeAssetIdsV1.rival_mochi
    : rivalId === "rival.smoke"
    ? catcafeAssetIdsV1.rival_smoke
    : rivalId === "rival.general"
    ? catcafeAssetIdsV1.rival_general
    : undefined;

/** Win/loss toast: subscribes to the transient-effect channel (a UI notice, not authoritative state). */
export function useCatcafeContestToastV1(
  instance: CatcafeApplicationInstanceV1,
): "won" | "lost" | null {
  const [toast, setToast] = useState<"won" | "lost" | null>(null);
  useEffect(
    () =>
      instance.subscribeTransientEffects((effect) => {
        if (effect.effectId !== "effect.catcafe.contest") return;
        const outcome = (effect.payload as { readonly outcome?: string }).outcome;
        setToast(outcome === "won" ? "won" : "lost");
      }),
    [instance],
  );
  return toast;
}

type CatcafeContestViewV1 = NonNullable<
  DeepReadonly<CatcafeUiPublicationV1>["semantic"]["game"]["contest"]
>;

export function CatcafeContestPanelV1(props: {
  readonly contest: CatcafeContestViewV1;
  readonly semantic: CatcafeSemanticPortV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
  readonly uiText: (textId: string) => string;
  readonly panelStyle: CSSProperties;
}): ReactElement {
  const { contest, uiText } = props;
  const rivalUrl = useAssetUrlV1(
    props.registry,
    catcafeRivalAssetForV1(contest.rivalId),
    "character_pose",
  );
  return (
    <div
      role="group"
      aria-label="运动会"
      data-cc-contest={String(contest.round)}
      style={{
        ...props.panelStyle,
        display: "grid",
        gap: "10px",
        inlineSize: "min(560px, 90%)",
        justifyItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {rivalUrl === null ? null : (
          <img
            src={rivalUrl}
            alt=""
            data-cc-rival={contest.rivalId}
            style={{
              inlineSize: "84px",
              blockSize: "112px",
              objectFit: "cover",
              borderRadius: "10px",
              border: catcafeThemeV1.panelBorder,
            }}
          />
        )}
        <div style={{ display: "grid", gap: "6px", minInlineSize: "260px" }}>
          <p
            data-cc-contest-morale={`${String(contest.morale)}:${String(contest.rivalMorale)}`}
            style={{ margin: 0, fontSize: "14px" }}
          >
            {uiText("text.cc.contest.round")}
            {String(contest.round)} · {uiText("text.cc.contest.morale")}
            {String(contest.morale)} vs {String(contest.rivalMorale)}
          </p>
          <CatcafeStatBarV1
            label="小雨"
            value={Math.min(100, contest.morale)}
            accent="#e8b465"
            testId="contest-self"
          />
          <CatcafeStatBarV1
            label={uiText(
              catcafeRivalsV1.byId(contest.rivalId)?.nameTextId ?? "text.cc.stage.name",
            )}
            value={Math.min(100, contest.rivalMorale)}
            accent="#c96a5a"
            testId="contest-rival"
          />
        </div>
      </div>
      <span style={{ display: "flex", gap: "8px" }}>
        {catcafeMovesV1.rows().map((move) => (
          <Button
            key={move.id}
            data-cc-move={move.id}
            onClick={() => dispatchV1(props.semantic, { kind: "contest_move", moveId: move.id })}
          >
            {uiText(move.nameTextId)}
          </Button>
        ))}
      </span>
    </div>
  );
}
