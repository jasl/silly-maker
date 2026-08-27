// SPDX-License-Identifier: MIT
import type { ElectronicPetActivityIdV1, ElectronicPetPoseIdV1 } from "../game/state.ts";

export interface ElectronicPetActivityDefinitionV1 {
  readonly activityId: ElectronicPetActivityIdV1;
  readonly poseId: ElectronicPetPoseIdV1;
  readonly minimumMinutes: number;
  readonly weight: number;
}

export const electronicPetActivityDefinitionsV1 = [
  { activityId: "hide_in_den", poseId: "hidden", minimumMinutes: 12, weight: 7 },
  { activityId: "observe_player", poseId: "watching", minimumMinutes: 5, weight: 8 },
  { activityId: "explore_room", poseId: "walking", minimumMinutes: 8, weight: 6 },
  { activityId: "approach_player", poseId: "near_player", minimumMinutes: 3, weight: 5 },
  { activityId: "eat_at_bowl", poseId: "eating", minimumMinutes: 4, weight: 8 },
  { activityId: "rest_nearby", poseId: "resting", minimumMinutes: 12, weight: 7 },
  { activityId: "self_groom", poseId: "grooming", minimumMinutes: 6, weight: 5 },
  { activityId: "solo_ball_play", poseId: "pouncing", minimumMinutes: 5, weight: 4 },
  {
    activityId: "belly_expose",
    poseId: "supine_relaxed",
    minimumMinutes: 5,
    weight: 2,
  },
  { activityId: "bring_ball", poseId: "near_player", minimumMinutes: 4, weight: 3 },
] as const satisfies readonly ElectronicPetActivityDefinitionV1[];

export function findElectronicPetActivityDefinitionV1(
  activityId: ElectronicPetActivityIdV1,
): ElectronicPetActivityDefinitionV1 | null {
  return electronicPetActivityDefinitionsV1.find((entry) => entry.activityId === activityId) ??
    null;
}
