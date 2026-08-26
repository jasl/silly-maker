// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  petActivityPresentationV1,
  petReactionPresentationV1,
} from "./pet-companion-presentation.ts";
import { electronicPetActivityIdsV1, electronicPetInteractionOutcomesV1 } from "../game/state.ts";

describe("electronic pet companion presentation", () => {
  it("gives every autonomous activity a distinct finite body placement", () => {
    const presentations = electronicPetActivityIdsV1.map(petActivityPresentationV1);
    const signatures = presentations.map((presentation) =>
      JSON.stringify([
        presentation.positionOffset,
        presentation.rotationOffset,
        presentation.scaleMultiplier,
      ])
    );

    expect(new Set(signatures).size).toBe(electronicPetActivityIdsV1.length);
    for (const presentation of presentations) {
      expect(
        Object.values(presentation.positionOffset).every(Number.isFinite) &&
          Object.values(presentation.rotationOffset).every(Number.isFinite) &&
          Object.values(presentation.scaleMultiplier).every(Number.isFinite),
      ).toBe(true);
    }
  });

  it("makes the hidden activity the sole non-interactive placement", () => {
    expect(petActivityPresentationV1("hide_in_den").interactionEnabled).toBe(false);
    for (const activityId of electronicPetActivityIdsV1) {
      if (activityId === "hide_in_den") continue;
      expect(petActivityPresentationV1(activityId).interactionEnabled).toBe(true);
    }
  });

  it("uses four distinct body reactions and never plays the positive clip for negative outcomes", () => {
    const presentations = electronicPetInteractionOutcomesV1.map(petReactionPresentationV1);
    const signatures = presentations.map((presentation) =>
      JSON.stringify([
        presentation.durationMs,
        presentation.positionOffset,
        presentation.rotationOffset,
        presentation.scaleMultiplier,
      ])
    );

    expect(new Set(signatures).size).toBe(electronicPetInteractionOutcomesV1.length);
    expect(petReactionPresentationV1("accept").playAuthoredClip).toBe(true);
    expect(petReactionPresentationV1("tolerate").playAuthoredClip).toBe(false);
    expect(petReactionPresentationV1("warn").playAuthoredClip).toBe(false);
    expect(petReactionPresentationV1("refuse").playAuthoredClip).toBe(false);
  });
});
