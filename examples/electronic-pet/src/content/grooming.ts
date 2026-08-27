// SPDX-License-Identifier: MIT
import type { ElectronicPetPoseIdV1 } from "../game/state.ts";
import { isElectronicPetRegionReachableV1 } from "./interactions.ts";
import { electronicPetGroomingInteractionBindingV1 } from "./runtime-bindings.ts";

export const electronicPetGroomingRuleV1 = {
  interactionId: electronicPetGroomingInteractionBindingV1.interactionId,
  region: "back",
  baseAcceptance: 1,
  preferenceId: "preference.care.grooming",
} as const;

export function isElectronicPetGroomingReachableV1(
  poseId: ElectronicPetPoseIdV1,
  interactionId: string,
): boolean {
  return interactionId === electronicPetGroomingRuleV1.interactionId &&
    isElectronicPetRegionReachableV1(poseId, electronicPetGroomingRuleV1.region);
}
