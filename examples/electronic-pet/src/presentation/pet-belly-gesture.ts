// SPDX-License-Identifier: MIT
import type { PetStrokeGestureClassificationV1 } from "./pet-stroke-gesture.ts";

export const petBellyRespectMinimumMsV1 = 250;
export const petBellyWarningDelayMsV1 = 900;
export const petBellyContinuationDelayMsV1 = 1_600;

export type PetBellyGesturePhaseV1 = "tracking" | "warning";

export type PetBellyGestureSettlementV1 =
  | {
    readonly terminal: "completed_before_warning";
    readonly stroke: PetStrokeGestureClassificationV1;
  }
  | {
    readonly terminal:
      | "stopped_before_warning"
      | "stopped_in_warning"
      | "continued_after_warning";
  }
  | null;

export function shouldWarnPetBellyGestureV1(
  stroke: PetStrokeGestureClassificationV1 | null,
  elapsedMs: number,
): boolean {
  return elapsedMs >= petBellyWarningDelayMsV1 ||
    stroke?.direction === "against-fur" ||
    stroke?.speed === "fast";
}

export function settlePetBellyGestureV1(input: {
  readonly phase: PetBellyGesturePhaseV1;
  readonly hasBellyOffer: boolean;
  readonly stroke: PetStrokeGestureClassificationV1 | null;
  readonly elapsedMs: number;
}): PetBellyGestureSettlementV1 {
  if (input.elapsedMs >= petBellyContinuationDelayMsV1) {
    return { terminal: "continued_after_warning" };
  }
  if (input.phase === "warning" || shouldWarnPetBellyGestureV1(input.stroke, input.elapsedMs)) {
    return { terminal: "stopped_in_warning" };
  }
  if (input.hasBellyOffer && input.stroke !== null) {
    return { terminal: "completed_before_warning", stroke: input.stroke };
  }
  if (!input.hasBellyOffer && input.elapsedMs >= petBellyRespectMinimumMsV1) {
    return { terminal: "stopped_before_warning" };
  }
  return null;
}
