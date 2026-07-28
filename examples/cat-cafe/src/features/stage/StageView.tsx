// SPDX-License-Identifier: MIT
// 舞台切片·UI：舞台槽组件。语义舞台 + 命中区域抚摸接线：点击/键盘激活
// 部位 → 语义 pet invocation；反应气泡与动画来自各自切片；权威效果
// （信任增减、表情变化、每日余量）全部由模块规则决定。
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
import { useCatcafePetReactionV1 } from "../petting/use-pet-reaction.ts";
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
  const reactionTextId = useCatcafePetReactionV1(instance);
  const game = context.publication.semantic.game;
  const pettingReady =
    context.publication.semantic.narrative.phase === "completed" && game.cat.pettingLeft > 0;

  // 场景资产预载：进入即拉全组（4MB webp 全集），失败自动降级 code-native。
  // 卸载时不显式 abort：registry.dispose 负责终止在途加载，而 jsdom 测试
  // 环境下 Deno 的 AbortController 与 jsdom EventTarget 跨 realm 派发会崩。
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
      {reactionTextId === null ? null : (
        <p
          data-cc-pet-reaction={reactionTextId}
          style={{
            position: "absolute",
            insetInlineEnd: "48px",
            insetBlockStart: "48px",
            maxInlineSize: "20em",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(16, 20, 26, 0.75)",
            color: "#f2efe8",
          }}
        >
          {uiText(reactionTextId)}
        </p>
      )}
    </section>
  );
}
