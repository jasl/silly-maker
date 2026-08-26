// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  appendPetStrokePointV1,
  beginPetStrokeGestureV1,
  classifyPetStrokeGestureV1,
  petStrokeCompletionV1,
} from "./pet-stroke-gesture.ts";

const sphereV1 = { kind: "sphere", radius: 0.5 } as const;
const preferredV1 = { x: 0, y: 0, z: -1 } as const;

function strokeV1(
  points: readonly { readonly x: number; readonly y: number; readonly z: number }[],
) {
  let accumulator = beginPetStrokeGestureV1(points[0]!);
  for (const point of points.slice(1)) {
    accumulator = appendPetStrokePointV1(accumulator, point, preferredV1);
  }
  return accumulator;
}

describe("pet stroke gesture", () => {
  it("classifies local-space with-fur, cross-fur, and against-fur paths at the contract boundary", () => {
    expect(classifyPetStrokeGestureV1(
      strokeV1([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -0.4 }]),
      preferredV1,
      sphereV1,
      500,
    )).toEqual({ direction: "with-fur", speed: "steady", duration: "brief" });
    expect(classifyPetStrokeGestureV1(
      strokeV1([{ x: 0, y: 0, z: 0 }, { x: 0.4, y: 0, z: 0 }]),
      preferredV1,
      sphereV1,
      500,
    )).toMatchObject({ direction: "cross-fur" });
    expect(classifyPetStrokeGestureV1(
      strokeV1([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0.4 }]),
      preferredV1,
      sphereV1,
      500,
    )).toMatchObject({ direction: "against-fur" });
  });

  it("uses volume-relative distance and elapsed time for the tap, speed, and duration categories", () => {
    expect(classifyPetStrokeGestureV1(
      strokeV1([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -0.1 }]),
      preferredV1,
      sphereV1,
      200,
    )).toBeNull();
    expect(classifyPetStrokeGestureV1(
      strokeV1([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -0.4 }]),
      preferredV1,
      sphereV1,
      100,
    )).toEqual({ direction: "with-fur", speed: "fast", duration: "brief" });
    expect(classifyPetStrokeGestureV1(
      strokeV1([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -0.4 }]),
      preferredV1,
      sphereV1,
      1_000,
    )).toEqual({ direction: "with-fur", speed: "slow", duration: "sustained" });
  });

  it("projects volume-relative stroke completion for pointer feedback", () => {
    expect(petStrokeCompletionV1(strokeV1([{ x: 0, y: 0, z: 0 }]), sphereV1)).toBe(0);
    expect(petStrokeCompletionV1(
      strokeV1([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -0.06 }]),
      sphereV1,
    )).toBeCloseTo(0.5);
    expect(petStrokeCompletionV1(
      strokeV1([{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -0.4 }]),
      sphereV1,
    )).toBe(1);
  });

  it("accumulates signed movement across the entire stroke instead of trusting one endpoint", () => {
    const accumulator = strokeV1([
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -0.35 },
      { x: 0, y: 0, z: -0.1 },
      { x: 0, y: 0, z: -0.3 },
    ]);
    expect(accumulator.pathDistance).toBeCloseTo(0.8);
    expect(classifyPetStrokeGestureV1(accumulator, preferredV1, sphereV1, 700)).toMatchObject({
      direction: "cross-fur",
    });
  });
});
