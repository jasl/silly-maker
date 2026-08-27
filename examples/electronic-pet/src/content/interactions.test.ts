// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { findElectronicPetActivityDefinitionV1 } from "./activities.ts";
import { electronicPetCatProfileV1 } from "./cat.ts";
import {
  electronicPetReachableRegionsByPoseV1,
  isElectronicPetInteractionReachableV1,
} from "./interactions.ts";
import { isElectronicPetGroomingReachableV1 } from "./grooming.ts";
import { electronicPetBellyInteractionBindingV1 } from "./runtime-bindings.ts";

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

  it("keeps the authored grooming target on poses that expose the back", () => {
    expect(isElectronicPetGroomingReachableV1("resting", "interaction.pet.groom.back")).toBe(
      true,
    );
    expect(isElectronicPetGroomingReachableV1("near_player", "interaction.pet.groom.back")).toBe(
      true,
    );
    expect(isElectronicPetGroomingReachableV1("watching", "interaction.pet.groom.back")).toBe(
      false,
    );
    expect(isElectronicPetGroomingReachableV1("resting", "interaction.pet.back")).toBe(false);
  });

  it("keeps belly exposure separate from the authored belly interaction", () => {
    expect(findElectronicPetActivityDefinitionV1("belly_expose")).toMatchObject({
      poseId: "supine_relaxed",
    });
    expect(electronicPetCatProfileV1.preferenceByInteractionId["interaction.pet.belly"])
      .toBeGreaterThan(0);
    expect(electronicPetBellyInteractionBindingV1).toMatchObject({
      interactionId: "interaction.pet.belly",
      actionId: "pet.touch_belly",
      interactionKind: "belly",
    });

    expect(isElectronicPetInteractionReachableV1(
      "supine_relaxed",
      "interaction.pet.belly",
    )).toBe(true);
    expect(isElectronicPetInteractionReachableV1(
      "near_player",
      "interaction.pet.belly",
    )).toBe(false);
    expect(new Set(electronicPetReachableRegionsByPoseV1.supine_relaxed)).toEqual(
      new Set(["face", "neck", "belly"]),
    );
  });
});
