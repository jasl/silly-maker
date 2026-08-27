// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import {
  classifyPetBallThrowV1,
  petBallRoundDurationsV1,
  petBallRoundTotalDurationMsV1,
  samplePetBallRoundMotionV1,
} from "./pet-ball-throw.ts";

const areaV1 = {
  minX: -2,
  maxX: 2,
  minZ: -1,
  maxZ: 2,
  minimumDistance: 0.45,
} as const;

const planV1 = {
  ballStart: { x: -1, y: 0.2, z: 0.5 },
  ballLanding: { x: 1, y: 0.2, z: 1.5 },
  ballReturn: { x: 0, y: 0.55, z: 0.9 },
  catStart: { x: 0, y: 0.4, z: 0 },
  catCatch: { x: 0.8, y: 0.4, z: 1.3 },
  catReturn: { x: 0, y: 0.4, z: 0.7 },
  throwArcHeight: 0.6,
} as const;

describe("pet ball throw", () => {
  it("classifies cancellation, short drags, out-of-bounds releases, and valid throws", () => {
    const start = { x: -1, y: 0.2, z: 0.5 } as const;
    expect(classifyPetBallThrowV1({
      start,
      release: { x: 1, y: 0.2, z: 1 },
      finish: "cancel",
      area: areaV1,
    })).toEqual({ kind: "cancelled" });
    expect(classifyPetBallThrowV1({
      start,
      release: { x: -0.8, y: 0.2, z: 0.6 },
      finish: "release",
      area: areaV1,
    })).toEqual({ kind: "short_drag" });
    expect(classifyPetBallThrowV1({
      start: { x: 2.2, y: 0.2, z: 1 },
      release: { x: 2.25, y: 0.2, z: 1 },
      finish: "release",
      area: areaV1,
    })).toEqual({ kind: "short_drag" });
    expect(classifyPetBallThrowV1({
      start,
      release: { x: 2.1, y: 0.2, z: 1 },
      finish: "release",
      area: areaV1,
    })).toEqual({ kind: "out_of_bounds" });
    expect(classifyPetBallThrowV1({
      start,
      release: { x: 1, y: 0.2, z: 1.5 },
      finish: "release",
      area: areaV1,
    })).toEqual({
      kind: "valid",
      landing: { x: 1, y: 0.2, z: 1.5 },
      distance: Math.hypot(2, 1),
    });
  });

  it("samples a bounded throw arc before the cat starts chasing", () => {
    const start = samplePetBallRoundMotionV1(planV1, -100);
    const midpoint = samplePetBallRoundMotionV1(planV1, petBallRoundDurationsV1.throwMs / 2);
    expect(start).toMatchObject({ phase: "throw", phaseProgress: 0, ball: planV1.ballStart });
    expect(start.cat).toEqual(planV1.catStart);
    expect(midpoint).toMatchObject({ phase: "throw", phaseProgress: 0.5 });
    expect(midpoint.ball.x).toBeCloseTo(0);
    expect(midpoint.ball.z).toBeCloseTo(1);
    expect(midpoint.ball.y).toBeCloseTo(0.8);
    expect(midpoint.cat).toEqual(planV1.catStart);
  });

  it("keeps the ball landed during chase and moves both subjects during return", () => {
    const chase = samplePetBallRoundMotionV1(
      planV1,
      petBallRoundDurationsV1.throwMs + petBallRoundDurationsV1.chaseMs / 2,
    );
    expect(chase).toMatchObject({ phase: "chase", phaseProgress: 0.5 });
    expect(chase.ball).toEqual(planV1.ballLanding);
    expect(chase.cat).toEqual({ x: 0.4, y: 0.4, z: 0.65 });

    const returnSample = samplePetBallRoundMotionV1(
      planV1,
      petBallRoundDurationsV1.throwMs + petBallRoundDurationsV1.chaseMs +
        petBallRoundDurationsV1.returnMs / 2,
    );
    expect(returnSample).toMatchObject({ phase: "return", phaseProgress: 0.5 });
    expect(returnSample.ball).toEqual({ x: 0.5, y: 0.375, z: 1.2 });
    expect(returnSample.cat).toEqual({ x: 0.4, y: 0.4, z: 1 });
  });

  it("clamps the completed sample to the declared return positions", () => {
    expect(samplePetBallRoundMotionV1(planV1, petBallRoundTotalDurationMsV1)).toEqual({
      phase: "complete",
      phaseProgress: 1,
      ball: planV1.ballReturn,
      cat: planV1.catReturn,
    });
    expect(samplePetBallRoundMotionV1(planV1, petBallRoundTotalDurationMsV1 + 10_000)).toEqual({
      phase: "complete",
      phaseProgress: 1,
      ball: planV1.ballReturn,
      cat: planV1.catReturn,
    });
  });
});
