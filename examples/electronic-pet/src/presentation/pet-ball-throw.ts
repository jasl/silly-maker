// SPDX-License-Identifier: MIT

export interface PetBallPointV1 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PetBallThrowAreaV1 {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly minimumDistance: number;
}

export type PetBallThrowClassificationV1 =
  | {
    readonly kind: "valid";
    readonly landing: PetBallPointV1;
    readonly distance: number;
  }
  | { readonly kind: "short_drag" }
  | { readonly kind: "out_of_bounds" }
  | { readonly kind: "cancelled" };

export interface PetBallRoundMotionPlanV1 {
  readonly ballStart: PetBallPointV1;
  readonly ballLanding: PetBallPointV1;
  readonly ballReturn: PetBallPointV1;
  readonly catStart: PetBallPointV1;
  readonly catCatch: PetBallPointV1;
  readonly catReturn: PetBallPointV1;
  readonly throwArcHeight: number;
}

export type PetBallRoundMotionPhaseV1 = "throw" | "chase" | "return" | "complete";

export interface PetBallRoundMotionSampleV1 {
  readonly phase: PetBallRoundMotionPhaseV1;
  readonly phaseProgress: number;
  readonly ball: PetBallPointV1;
  readonly cat: PetBallPointV1;
}

export const petBallRoundDurationsV1 = {
  throwMs: 480,
  chaseMs: 620,
  returnMs: 760,
} as const;

export const petBallRoundTotalDurationMsV1 = petBallRoundDurationsV1.throwMs +
  petBallRoundDurationsV1.chaseMs + petBallRoundDurationsV1.returnMs;

function planarDistanceV1(left: PetBallPointV1, right: PetBallPointV1): number {
  return Math.hypot(right.x - left.x, right.z - left.z);
}

function isInsideThrowAreaV1(point: PetBallPointV1, area: PetBallThrowAreaV1): boolean {
  return point.x >= area.minX && point.x <= area.maxX &&
    point.z >= area.minZ && point.z <= area.maxZ;
}

export function classifyPetBallThrowV1(input: {
  readonly start: PetBallPointV1;
  readonly release: PetBallPointV1;
  readonly finish: "release" | "cancel";
  readonly area: PetBallThrowAreaV1;
}): PetBallThrowClassificationV1 {
  if (input.finish === "cancel") return { kind: "cancelled" };
  const distance = planarDistanceV1(input.start, input.release);
  if (distance < input.area.minimumDistance) return { kind: "short_drag" };
  if (!isInsideThrowAreaV1(input.release, input.area)) return { kind: "out_of_bounds" };
  return { kind: "valid", landing: input.release, distance };
}

function clampUnitV1(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstepV1(value: number): number {
  const t = clampUnitV1(value);
  return t * t * (3 - 2 * t);
}

function lerpPointV1(
  start: PetBallPointV1,
  end: PetBallPointV1,
  progress: number,
): PetBallPointV1 {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
    z: start.z + (end.z - start.z) * progress,
  };
}

export function samplePetBallRoundMotionV1(
  plan: PetBallRoundMotionPlanV1,
  elapsedMs: number,
): PetBallRoundMotionSampleV1 {
  const elapsed = Math.min(petBallRoundTotalDurationMsV1, Math.max(0, elapsedMs));
  if (elapsed < petBallRoundDurationsV1.throwMs) {
    const phaseProgress = elapsed / petBallRoundDurationsV1.throwMs;
    const ball = lerpPointV1(plan.ballStart, plan.ballLanding, phaseProgress);
    return {
      phase: "throw",
      phaseProgress,
      ball: {
        ...ball,
        y: ball.y + plan.throwArcHeight * 4 * phaseProgress * (1 - phaseProgress),
      },
      cat: plan.catStart,
    };
  }

  const chaseStartMs = petBallRoundDurationsV1.throwMs;
  const returnStartMs = chaseStartMs + petBallRoundDurationsV1.chaseMs;
  if (elapsed < returnStartMs) {
    const phaseProgress = (elapsed - chaseStartMs) / petBallRoundDurationsV1.chaseMs;
    return {
      phase: "chase",
      phaseProgress,
      ball: plan.ballLanding,
      cat: lerpPointV1(plan.catStart, plan.catCatch, smoothstepV1(phaseProgress)),
    };
  }

  if (elapsed < petBallRoundTotalDurationMsV1) {
    const phaseProgress = (elapsed - returnStartMs) / petBallRoundDurationsV1.returnMs;
    const eased = smoothstepV1(phaseProgress);
    return {
      phase: "return",
      phaseProgress,
      ball: lerpPointV1(plan.ballLanding, plan.ballReturn, eased),
      cat: lerpPointV1(plan.catCatch, plan.catReturn, eased),
    };
  }

  return {
    phase: "complete",
    phaseProgress: 1,
    ball: plan.ballReturn,
    cat: plan.catReturn,
  };
}
