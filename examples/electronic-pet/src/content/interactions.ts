// SPDX-License-Identifier: MIT
import { electronicPetInteractionBindingsV1 } from "./runtime-bindings.ts";
import type { ElectronicPetPoseIdV1 } from "../game/state.ts";

export interface ElectronicPetInteractionRuleV1 {
  readonly interactionId: string;
  readonly region: "face" | "neck" | "back";
  readonly baseAcceptance: number;
  readonly preferenceId: string;
}

export const electronicPetInteractionRulesV1 = [
  {
    interactionId: "interaction.pet.face",
    region: "face",
    baseAcceptance: 2,
    preferenceId: "preference.contact.face",
  },
  {
    interactionId: "interaction.pet.neck",
    region: "neck",
    baseAcceptance: 2,
    preferenceId: "preference.contact.neck",
  },
  {
    interactionId: "interaction.pet.back",
    region: "back",
    baseAcceptance: 0,
    preferenceId: "preference.contact.back",
  },
] as const satisfies readonly ElectronicPetInteractionRuleV1[];

export const electronicPetReachableRegionsByPoseV1 = {
  hidden: [],
  watching: ["face"],
  walking: ["back"],
  near_player: ["face", "neck", "back"],
  eating: ["back"],
  resting: ["face", "neck", "back"],
  grooming: ["back"],
  pouncing: ["back"],
} as const satisfies Record<
  ElectronicPetPoseIdV1,
  readonly ElectronicPetInteractionRuleV1["region"][]
>;

export function findElectronicPetInteractionRuleV1(
  interactionId: string,
): ElectronicPetInteractionRuleV1 | null {
  return electronicPetInteractionRulesV1.find((rule) => rule.interactionId === interactionId) ??
    null;
}

export function isElectronicPetBoundInteractionV1(interactionId: string): boolean {
  return electronicPetInteractionBindingsV1.some((binding) =>
    binding.interactionId === interactionId
  );
}

export function isElectronicPetInteractionReachableV1(
  poseId: ElectronicPetPoseIdV1,
  interactionId: string,
): boolean {
  const rule = findElectronicPetInteractionRuleV1(interactionId);
  return rule !== null &&
    (electronicPetReachableRegionsByPoseV1[poseId] as readonly string[]).includes(rule.region);
}
