// SPDX-License-Identifier: MIT
// Encounters slice · UI: the regular-encounter notice (subscribes to transient effects; authoritative effects already landed in module state).
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
