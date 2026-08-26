// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  electronicPetReachableRegionsByPoseV1,
  isElectronicPetInteractionReachableV1,
} from "./interactions.ts";

describe("electronic pet contact reachability", () => {
  it("keeps hidden poses non-interactive and near-player poses fully reachable", () => {
    expect(electronicPetReachableRegionsByPoseV1.hidden).toEqual([]);
    expect(electronicPetReachableRegionsByPoseV1.near_player).toEqual([
      "face",
      "neck",
      "back",
    ]);
  });

  it("limits watching to the face and moving poses to the back", () => {
    expect(isElectronicPetInteractionReachableV1("watching", "interaction.pet.face")).toBe(true);
    expect(isElectronicPetInteractionReachableV1("watching", "interaction.pet.neck")).toBe(false);
    expect(isElectronicPetInteractionReachableV1("walking", "interaction.pet.back")).toBe(true);
    expect(isElectronicPetInteractionReachableV1("walking", "interaction.pet.face")).toBe(false);
  });

  it("rejects an unknown interaction at every pose", () => {
    expect(isElectronicPetInteractionReachableV1("resting", "interaction.pet.unknown")).toBe(
      false,
    );
  });
});
