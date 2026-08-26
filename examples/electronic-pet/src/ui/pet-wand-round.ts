// SPDX-License-Identifier: MIT

export interface PetWandPointV1 {
  readonly x: number;
  readonly y: number;
}

export type PetWandRoundOutcomeV1 = "caught" | "missed" | "ended_early";
export type PetWandRoundFinishV1 = "release" | "cancel";

export interface PetWandRoundV1 {
  readonly start: PetWandPointV1;
  readonly last: PetWandPointV1;
  readonly totalDistancePx: number;
  readonly axis: "x" | "y" | null;
  readonly direction: -1 | 0 | 1;
  readonly currentLegDistancePx: number;
  readonly deliberateTurns: number;
}

const axisLockDistancePxV1 = 12;
const directionalStepDistancePxV1 = 2;
const deliberateLegDistancePxV1 = 28;
const caughtTravelDistancePxV1 = 64;

const directionForV1 = (value: number): -1 | 0 | 1 => value > 0 ? 1 : value < 0 ? -1 : 0;

export function beginPetWandRoundV1(point: PetWandPointV1): PetWandRoundV1 {
  return {
    start: point,
    last: point,
    totalDistancePx: 0,
    axis: null,
    direction: 0,
    currentLegDistancePx: 0,
    deliberateTurns: 0,
  };
}

export function appendPetWandPointV1(
  round: PetWandRoundV1,
  point: PetWandPointV1,
): PetWandRoundV1 {
  const stepX = point.x - round.last.x;
  const stepY = point.y - round.last.y;
  const totalDistancePx = round.totalDistancePx + Math.hypot(stepX, stepY);
  let axis = round.axis;
  let direction = round.direction;
  let currentLegDistancePx = round.currentLegDistancePx;
  let deliberateTurns = round.deliberateTurns;

  if (axis === null) {
    const displacementX = point.x - round.start.x;
    const displacementY = point.y - round.start.y;
    if (Math.hypot(displacementX, displacementY) >= axisLockDistancePxV1) {
      axis = Math.abs(displacementX) >= Math.abs(displacementY) ? "x" : "y";
      const projected = axis === "x" ? displacementX : displacementY;
      direction = directionForV1(projected);
      currentLegDistancePx = Math.abs(projected);
    }
  } else {
    const projectedStep = axis === "x" ? stepX : stepY;
    if (Math.abs(projectedStep) >= directionalStepDistancePxV1) {
      const nextDirection = directionForV1(projectedStep);
      if (direction === 0 || nextDirection === direction) {
        direction = nextDirection;
        currentLegDistancePx += Math.abs(projectedStep);
      } else {
        if (currentLegDistancePx >= deliberateLegDistancePxV1) deliberateTurns += 1;
        direction = nextDirection;
        currentLegDistancePx = Math.abs(projectedStep);
      }
    }
  }

  return {
    ...round,
    last: point,
    totalDistancePx,
    axis,
    direction,
    currentLegDistancePx,
    deliberateTurns,
  };
}

export function finishPetWandRoundV1(
  round: PetWandRoundV1,
  finish: PetWandRoundFinishV1,
): PetWandRoundOutcomeV1 {
  if (finish === "cancel") return "ended_early";
  const completedReturn = round.deliberateTurns > 0 &&
    round.currentLegDistancePx >= deliberateLegDistancePxV1;
  return completedReturn && round.totalDistancePx >= caughtTravelDistancePxV1 ? "caught" : "missed";
}
