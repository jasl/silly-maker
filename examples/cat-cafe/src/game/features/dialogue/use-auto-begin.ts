// SPDX-License-Identifier: MIT
// Dialogue slice · UI: auto-start on new game/restart — the title screen IS "start",
// no extra begin_story click; completed/in-progress saves (Continue) are unaffected.
import { useEffect, useRef } from "react";

import type { DeepReadonly } from "@sillymaker/base";

import type { CatcafeSemanticPortV1, CatcafeUiPublicationV1 } from "../../../application/ui-kit.ts";
import { dispatchV1 } from "../../../application/ui-kit.ts";

export function useCatcafeAutoBeginV1(
  publication: DeepReadonly<CatcafeUiPublicationV1>,
  semantic: CatcafeSemanticPortV1,
): void {
  const narrativePhase = publication.semantic.narrative.phase;
  const actions = publication.semantic.actions;
  // The in-flight guard resets by phase: after a restart the phase returns to idle
  // and auto-begin arms again; a boolean ref would linger under the same React tree and jam.
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
