// SPDX-License-Identifier: MIT
// 对话切片·UI：新档/重开自动开场——标题屏就是"开始"，不再要求手点
// 一次 begin_story；已完结/进行中的存档（Continue）不受影响。
import { useEffect, useRef } from "react";

import type { DeepReadonly } from "@sillymaker/base";

import type { CatcafeSemanticPortV1, CatcafeUiPublicationV1 } from "../../application/ui-kit.ts";
import { dispatchV1 } from "../../application/ui-kit.ts";

export function useCatcafeAutoBeginV1(
  publication: DeepReadonly<CatcafeUiPublicationV1>,
  semantic: CatcafeSemanticPortV1,
): void {
  const narrativePhase = publication.semantic.narrative.phase;
  const actions = publication.semantic.actions;
  // 在途守卫按 phase 复位：重新开始（restart）后 phase 回到 idle，
  // 自动开场再次生效；boolean ref 会在同一 React 树下残留而卡死。
  const beginInFlightRef = useRef(false);
  useEffect(() => {
    if (narrativePhase !== "idle") {
      beginInFlightRef.current = false;
      return;
    }
    if (beginInFlightRef.current) return;
    const beginAction = actions.find(
      (action) => action.kind === "system" && action.actionId === "cc.begin_story",
    );
    if (beginAction === undefined || !beginAction.enabled) return;
    beginInFlightRef.current = true;
    dispatchV1(semantic, { kind: "invoke", actionId: "cc.begin_story" });
  }, [narrativePhase, actions, semantic]);
}
