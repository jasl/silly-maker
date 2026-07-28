// SPDX-License-Identifier: MIT
// Stage slice · UI: the stage slot component. Semantic stage + hit-region petting wiring:
// click/keyboard activation of a part → a semantic pet invocation; reaction bubbles and
// animation come from their own slices; authoritative effects (trust deltas, expression changes, daily allowance) are decided entirely by module rules.
import { useEffect } from "react";
import type { ReactElement } from "react";

import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { DefaultGameRootSlotsV1, SemanticStageEntryRendererV1 } from "@sillymaker/ui";
import { SemanticStageV1 } from "@sillymaker/ui";

import type { CatcafeApplicationInstanceV1 } from "../../application/core-definition.ts";
import type {
  CatcafeAssetRegistryV1,
  CatcafeSemanticPortV1,
  CatcafeUiOverlayIdV1,
  CatcafeUiPublicationV1,
} from "../../application/ui-kit.ts";
import { dispatchV1, useCatcafeTextV1 } from "../../application/ui-kit.ts";
import { catcafeAssetIdsV1, catcafeStageTransitionCatalogV1 } from "../../presentation.ts";
import { CatcafePetBurstsV1, useCatcafePetBurstsV1 } from "../petting/pet-bursts.tsx";
import { catcafeCatMotionCssV1 } from "./renderers.tsx";

export function CatcafeStageV1(props: {
  readonly context: Parameters<
    NonNullable<
      DefaultGameRootSlotsV1<
        CatcafeUiPublicationV1,
        CatcafeSemanticPortV1,
        CatcafeUiOverlayIdV1
      >["background"]
    >
  >[0];
  readonly instance: CatcafeApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
  readonly renderers: Readonly<Record<string, SemanticStageEntryRendererV1>>;
}): ReactElement {
  const { context, instance } = props;
  const uiText = useCatcafeTextV1(props.playerProfile);
  const petBursts = useCatcafePetBurstsV1(instance);
  const game = context.publication.semantic.game;
  const pettingReady =
    context.publication.semantic.narrative.phase === "completed" && game.cat.pettingLeft > 0;

  // Scene-asset preload: pull the whole group on entry (the full 4MB webp set); failures degrade to code-native.
  // No explicit abort on unmount: registry.dispose stops in-flight loads, and under the jsdom
  // test environment Deno's AbortController dispatching across realms into jsdom EventTarget crashes.
  useEffect(() => {
    if (props.registry === null) return;
    const controller = new AbortController();
    void props.registry
      .preload(Object.values(catcafeAssetIdsV1) as never[], controller.signal)
      .catch(() => {});
  }, [props.registry]);

  return (
    <section
      data-cc-stage="true"
      data-cc-petting-left={String(game.cat.pettingLeft)}
      aria-label={uiText("text.cc.stage.name")}
    >
      <style>{catcafeCatMotionCssV1}</style>
      <SemanticStageV1
        target={context.publication.view.stageTarget}
        revision={context.publication.semantic.revision}
        epoch={context.publication.view.anchorEpoch}
        catalog={catcafeStageTransitionCatalogV1}
        renderers={props.renderers}
        accessibleName={uiText("text.cc.stage.name")}
        onHitRegionActivate={(activation) => {
          if (!pettingReady) return;
          dispatchV1(context.semantic, {
            kind: "pet",
            zone: activation.regionId.replace("zone.", ""),
          });
        }}
      />
      <CatcafePetBurstsV1 bursts={petBursts} uiText={uiText} />
    </section>
  );
}
