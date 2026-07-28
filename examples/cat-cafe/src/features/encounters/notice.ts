// SPDX-License-Identifier: MIT
// 相遇切片·UI：常客相遇通知（订阅瞬态效果通道；权威效果已入模块状态）。
import { useEffect, useState } from "react";

import type { CatcafeApplicationInstanceV1 } from "../../application/core-definition.ts";

export function useCatcafeEncounterNoticeV1(instance: CatcafeApplicationInstanceV1): string | null {
  const [textId, setTextId] = useState<string | null>(null);
  useEffect(
    () =>
      instance.subscribeTransientEffects((effect) => {
        if (effect.effectId !== "effect.catcafe.encounter") return;
        setTextId((effect.payload as { readonly textId?: string }).textId ?? null);
      }),
    [instance],
  );
  return textId;
}
