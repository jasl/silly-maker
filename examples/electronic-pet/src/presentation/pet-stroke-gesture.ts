// SPDX-License-Identifier: MIT
import type { PetInteractionVolumeShapeV1, PetVec3V1 } from "../authoring/index.ts";
import type { ElectronicPetContactResultV1 } from "../game/kernel.ts";

export interface PetStrokeGestureAccumulatorV1 {
  readonly lastPoint: PetVec3V1;
  readonly pathDistance: number;
  readonly signedDistance: number;
}

export type PetStrokeGestureClassificationV1 = Pick<
  ElectronicPetContactResultV1,
  "direction" | "speed" | "duration"
>;

const minimumStrokeDistanceRatioV1 = 0.12;

export function beginPetStrokeGestureV1(
  point: PetVec3V1,
): PetStrokeGestureAccumulatorV1 {
  return { lastPoint: point, pathDistance: 0, signedDistance: 0 };
}

export function appendPetStrokePointV1(
  accumulator: PetStrokeGestureAccumulatorV1,
  point: PetVec3V1,
  preferredDirection: PetVec3V1,
): PetStrokeGestureAccumulatorV1 {
  const dx = point.x - accumulator.lastPoint.x;
  const dy = point.y - accumulator.lastPoint.y;
  const dz = point.z - accumulator.lastPoint.z;
  const segmentDistance = Math.hypot(dx, dy, dz);
  return {
    lastPoint: point,
    pathDistance: accumulator.pathDistance + segmentDistance,
    signedDistance: accumulator.signedDistance +
      dx * preferredDirection.x +
      dy * preferredDirection.y +
      dz * preferredDirection.z,
  };
}

function interactionSpanV1(shape: PetInteractionVolumeShapeV1): number {
  return shape.kind === "sphere"
    ? shape.radius * 2
    : Math.max(shape.size.x, shape.size.y, shape.size.z);
}

export function petStrokeCompletionV1(
  accumulator: PetStrokeGestureAccumulatorV1,
  shape: PetInteractionVolumeShapeV1,
): number {
  const normalizedDistance = accumulator.pathDistance / interactionSpanV1(shape);
  return Math.min(1, Math.max(0, normalizedDistance / minimumStrokeDistanceRatioV1));
}

/**
 * Classifies one completed local-space stroke. The preferred direction is
 * normalized by the cold authoring compiler, and the volume span makes speed
 * and the tap cutoff independent of viewport pixels and authored volume size.
 */
export function classifyPetStrokeGestureV1(
  accumulator: PetStrokeGestureAccumulatorV1,
  preferredDirection: PetVec3V1,
  shape: PetInteractionVolumeShapeV1,
  durationMs: number,
): PetStrokeGestureClassificationV1 | null {
  const span = interactionSpanV1(shape);
  const normalizedDistance = accumulator.pathDistance / span;
  if (petStrokeCompletionV1(accumulator, shape) < 1) return null;

  const alignment = accumulator.signedDistance / accumulator.pathDistance;
  const direction: ElectronicPetContactResultV1["direction"] = alignment >= 0.5
    ? "with-fur"
    : alignment <= -0.5
    ? "against-fur"
    : "cross-fur";
  const normalizedSpeed = durationMs <= 0
    ? Number.POSITIVE_INFINITY
    : normalizedDistance / (durationMs / 1_000);
  const speed: ElectronicPetContactResultV1["speed"] = normalizedSpeed < 0.65
    ? "slow"
    : normalizedSpeed > 2.4
    ? "fast"
    : "steady";
  return {
    direction,
    speed,
    duration: durationMs >= 900 ? "sustained" : "brief",
  };
}
