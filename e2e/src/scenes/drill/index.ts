// SPDX-License-Identifier: MIT
// The explicit `authoring_scene` binding is this Scene unit's sole authority.
import type {
  AuthoringSceneRuntime,
  AuthoringSceneRuntimePlan,
  Scene,
} from "@sillymaker/base/story/scene";
import { sceneFromAuthoringRuntimePlan } from "@sillymaker/base/story/scene";

import { sceneRuntimePlanV1 } from "#sillymaker/scene/drill";

export const labDrillSceneRuntimePlanV1: AuthoringSceneRuntimePlan = sceneRuntimePlanV1;

export const labDrillSceneV1: Scene & AuthoringSceneRuntime = sceneFromAuthoringRuntimePlan(
  labDrillSceneRuntimePlanV1,
);
