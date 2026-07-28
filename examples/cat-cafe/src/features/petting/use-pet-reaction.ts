// SPDX-License-Identifier: MIT
// 抚摸切片·UI：反应文案来自 commit-only 瞬态效果流（权威 facts 的
// 投影），不在点击时按 UI 状态预查反应表。
import { useEffect, useState } from "react";

import type { CatcafeApplicationInstanceV1 } from "../../application/core-definition.ts";
import { catcafePettingV1 } from "../../content.ts";

export function useCatcafePetReactionV1(instance: CatcafeApplicationInstanceV1): string | null {
  const [reactionTextId, setReactionTextId] = useState<string | null>(null);
  useEffect(
    () =>
      instance.subscribeTransientEffects((effect) => {
        if (effect.effectId !== "effect.catcafe.reaction") return;
        const reactionId = (effect.payload as { readonly reactionId?: string }).reactionId;
        const reaction = reactionId === undefined ? null : catcafePettingV1.byId(reactionId);
        setReactionTextId(reaction?.reactionTextId ?? null);
      }),
    [instance],
  );
  return reactionTextId;
}
