// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  petBellyContinuationDelayMsV1,
  petBellyRespectMinimumMsV1,
  petBellyWarningDelayMsV1,
  settlePetBellyGestureV1,
  shouldWarnPetBellyGestureV1,
} from "./pet-belly-gesture.ts";

const calmStrokeV1 = {
  direction: "with-fur",
  speed: "slow",
  duration: "brief",
} as const;

describe("pet belly gesture", () => {
  it("completes only a calm offered stroke before warning", () => {
    expect(settlePetBellyGestureV1({
      phase: "tracking",
      hasBellyOffer: true,
      stroke: calmStrokeV1,
      elapsedMs: 600,
    })).toEqual({ terminal: "completed_before_warning", stroke: calmStrokeV1 });
    expect(settlePetBellyGestureV1({
      phase: "tracking",
      hasBellyOffer: false,
      stroke: calmStrokeV1,
      elapsedMs: 600,
    })).toEqual({ terminal: "stopped_before_warning" });
  });

  it("recognizes a deliberate pre-warning stop without turning a tap into evidence", () => {
    expect(settlePetBellyGestureV1({
      phase: "tracking",
      hasBellyOffer: false,
      stroke: null,
      elapsedMs: petBellyRespectMinimumMsV1 - 1,
    })).toBeNull();
    expect(settlePetBellyGestureV1({
      phase: "tracking",
      hasBellyOffer: false,
      stroke: null,
      elapsedMs: petBellyRespectMinimumMsV1,
    })).toEqual({ terminal: "stopped_before_warning" });
  });

  it("enters warning for an unsafe stroke or elapsed hold", () => {
    expect(shouldWarnPetBellyGestureV1(
      { ...calmStrokeV1, direction: "against-fur" },
      300,
    )).toBe(true);
    expect(shouldWarnPetBellyGestureV1(
      { ...calmStrokeV1, speed: "fast" },
      300,
    )).toBe(true);
    expect(shouldWarnPetBellyGestureV1(null, petBellyWarningDelayMsV1)).toBe(true);
    expect(shouldWarnPetBellyGestureV1(calmStrokeV1, petBellyWarningDelayMsV1 - 1)).toBe(false);
  });

  it("distinguishes stopping in warning from continuing through its deadline", () => {
    expect(settlePetBellyGestureV1({
      phase: "warning",
      hasBellyOffer: true,
      stroke: calmStrokeV1,
      elapsedMs: 1_100,
    })).toEqual({ terminal: "stopped_in_warning" });
    expect(settlePetBellyGestureV1({
      phase: "warning",
      hasBellyOffer: true,
      stroke: calmStrokeV1,
      elapsedMs: petBellyContinuationDelayMsV1,
    })).toEqual({ terminal: "continued_after_warning" });
  });
});
