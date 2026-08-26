// SPDX-License-Identifier: MIT
import type {
  ElectronicPetActivityIdV1,
  ElectronicPetInteractionOutcomeV1,
} from "../game/state.ts";

export interface PetPresentationVectorV1 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PetActivityPresentationV1 {
  readonly positionOffset: PetPresentationVectorV1;
  readonly rotationOffset: PetPresentationVectorV1;
  readonly scaleMultiplier: PetPresentationVectorV1;
  readonly interactionEnabled: boolean;
}

export interface PetReactionPresentationV1 {
  readonly durationMs: number;
  readonly positionOffset: PetPresentationVectorV1;
  readonly rotationOffset: PetPresentationVectorV1;
  readonly scaleMultiplier: PetPresentationVectorV1;
  readonly playAuthoredClip: boolean;
}

const activityPresentationByIdV1 = {
  hide_in_den: {
    positionOffset: { x: -0.95, y: -0.12, z: -0.62 },
    rotationOffset: { x: 0, y: 0.52, z: 0 },
    scaleMultiplier: { x: 0.78, y: 0.72, z: 0.78 },
    interactionEnabled: false,
  },
  observe_player: {
    positionOffset: { x: -0.62, y: 0, z: -0.08 },
    rotationOffset: { x: 0, y: 0.24, z: 0 },
    scaleMultiplier: { x: 0.94, y: 0.94, z: 0.94 },
    interactionEnabled: true,
  },
  explore_room: {
    positionOffset: { x: 0.68, y: 0.02, z: -0.18 },
    rotationOffset: { x: 0, y: -0.58, z: 0 },
    scaleMultiplier: { x: 0.98, y: 0.98, z: 0.98 },
    interactionEnabled: true,
  },
  approach_player: {
    positionOffset: { x: 0, y: 0.04, z: 0.72 },
    rotationOffset: { x: -0.04, y: 0, z: 0 },
    scaleMultiplier: { x: 1.06, y: 1.06, z: 1.06 },
    interactionEnabled: true,
  },
  eat_at_bowl: {
    positionOffset: { x: 0.92, y: -0.08, z: 0.5 },
    rotationOffset: { x: 0.24, y: -0.34, z: 0 },
    scaleMultiplier: { x: 0.96, y: 0.88, z: 1.02 },
    interactionEnabled: true,
  },
  rest_nearby: {
    positionOffset: { x: 0.42, y: -0.14, z: 0.22 },
    rotationOffset: { x: 0, y: 0.18, z: -0.18 },
    scaleMultiplier: { x: 1.08, y: 0.72, z: 1.06 },
    interactionEnabled: true,
  },
  self_groom: {
    positionOffset: { x: -0.18, y: -0.02, z: 0.18 },
    rotationOffset: { x: 0.08, y: 0.48, z: 0.16 },
    scaleMultiplier: { x: 0.95, y: 1.02, z: 0.95 },
    interactionEnabled: true,
  },
  solo_ball_play: {
    positionOffset: { x: -0.86, y: 0.12, z: 0.68 },
    rotationOffset: { x: -0.14, y: -0.72, z: 0.08 },
    scaleMultiplier: { x: 1.04, y: 0.92, z: 1.12 },
    interactionEnabled: true,
  },
} as const satisfies Record<ElectronicPetActivityIdV1, PetActivityPresentationV1>;

const reactionPresentationByOutcomeV1 = {
  accept: {
    durationMs: 720,
    positionOffset: { x: 0, y: 0.1, z: 0.2 },
    rotationOffset: { x: -0.1, y: 0, z: 0.04 },
    scaleMultiplier: { x: 1.07, y: 1.04, z: 1.07 },
    playAuthoredClip: true,
  },
  tolerate: {
    durationMs: 560,
    positionOffset: { x: -0.06, y: 0, z: -0.02 },
    rotationOffset: { x: 0, y: 0.2, z: -0.04 },
    scaleMultiplier: { x: 0.99, y: 1, z: 0.99 },
    playAuthoredClip: false,
  },
  warn: {
    durationMs: 460,
    positionOffset: { x: 0, y: 0.05, z: -0.18 },
    rotationOffset: { x: 0.12, y: -0.18, z: 0.16 },
    scaleMultiplier: { x: 1.02, y: 0.92, z: 1.04 },
    playAuthoredClip: false,
  },
  refuse: {
    durationMs: 680,
    positionOffset: { x: 0.24, y: -0.04, z: -0.34 },
    rotationOffset: { x: 0.04, y: 0.64, z: -0.08 },
    scaleMultiplier: { x: 0.92, y: 0.94, z: 0.92 },
    playAuthoredClip: false,
  },
} as const satisfies Record<ElectronicPetInteractionOutcomeV1, PetReactionPresentationV1>;

export function petActivityPresentationV1(
  activityId: ElectronicPetActivityIdV1,
): PetActivityPresentationV1 {
  return activityPresentationByIdV1[activityId];
}

export function petReactionPresentationV1(
  outcome: ElectronicPetInteractionOutcomeV1,
): PetReactionPresentationV1 {
  return reactionPresentationByOutcomeV1[outcome];
}
