// SPDX-License-Identifier: MIT
import type { AuthoringSceneRuntimeV1 } from "@sillymaker/base";

import type { LabNarrativePlanV1 } from "./narrative-runtime.ts";
import { labNarrativePositionForCursorV1 } from "./narrative-topology.ts";

export const labProcedureSceneUnitIdV1 = "scene.e2e.procedure";
export const labDrillSceneUnitIdV1 = "scene.e2e.drill";

/** Instance-local direct-plan access used once at each authoritative command boundary. */
export interface LabExecutionContextV1 {
  requireScenePlan(sceneId: string): AuthoringSceneRuntimeV1;
  requireNarrativePlan(unitId: string): LabNarrativePlanV1;
  requireNarrativePlanForCursor(cursor: string): LabNarrativePlanV1;
}

export function defineLabExecutionContextV1(input: {
  readonly requireScenePlan: (sceneId: string) => AuthoringSceneRuntimeV1;
  readonly requireNarrativePlan: (unitId: string) => LabNarrativePlanV1;
}): LabExecutionContextV1 {
  return {
    requireScenePlan: input.requireScenePlan,
    requireNarrativePlan: input.requireNarrativePlan,
    requireNarrativePlanForCursor(cursor: string): LabNarrativePlanV1 {
      return input.requireNarrativePlan(labNarrativePositionForCursorV1(cursor).unitId);
    },
  };
}
