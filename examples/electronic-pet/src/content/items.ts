// SPDX-License-Identifier: MIT

export const electronicPetFoodIdsV1 = ["food.chicken", "food.salmon"] as const;
export type ElectronicPetFoodIdV1 = (typeof electronicPetFoodIdsV1)[number];

export const electronicPetToyIdsV1 = ["toy.wand", "toy.ball"] as const;
export type ElectronicPetToyIdV1 = (typeof electronicPetToyIdsV1)[number];
