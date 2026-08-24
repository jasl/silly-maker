// SPDX-License-Identifier: MIT
// The explicit `authoring_scene` binding is the Player's sole procedure-scene
// authority. Vite replaces this package import with the runtime-only compiled
// plan; Deno tooling uses the package-import fallback beside the source.
import type {
  AuthoringSceneRuntime,
  AuthoringSceneRuntimePlan,
  Scene,
} from "@sillymaker/base/story/scene";
import { sceneFromAuthoringRuntimePlan } from "@sillymaker/base/story/scene";

import { sceneRuntimePlanV1 } from "#sillymaker/scene/procedure";

export const labProcedureSceneRuntimePlanV1: AuthoringSceneRuntimePlan = sceneRuntimePlanV1;

export const labProcedureSceneV1: Scene & AuthoringSceneRuntime = sceneFromAuthoringRuntimePlan(
  labProcedureSceneRuntimePlanV1,
);
