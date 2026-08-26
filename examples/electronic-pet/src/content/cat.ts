// SPDX-License-Identifier: MIT

export const electronicPetCatProfileV1 = {
  catId: "cat.mochi",
  preferenceByActivityId: {
    hide_in_den: 1,
    observe_player: 2,
    explore_room: 2,
    approach_player: 1,
    eat_at_bowl: 1,
    rest_nearby: 2,
    self_groom: 1,
    solo_ball_play: 3,
  },
  preferenceByInteractionId: {
    "interaction.pet.face": 2,
    "interaction.pet.neck": 2,
    "interaction.pet.back": 0,
  },
} as const;

export function electronicPetPreferenceForActivityV1(activityId: string): number {
  return electronicPetCatProfileV1.preferenceByActivityId[
    activityId as keyof typeof electronicPetCatProfileV1.preferenceByActivityId
  ] ?? 0;
}

export function electronicPetPreferenceForInteractionV1(interactionId: string): number {
  return electronicPetCatProfileV1.preferenceByInteractionId[
    interactionId as keyof typeof electronicPetCatProfileV1.preferenceByInteractionId
  ] ?? 0;
}
