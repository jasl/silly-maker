// SPDX-License-Identifier: MIT
/** Focused Story runtime surface for Scene consumers and narrow import graphs. */
export {
  sceneAmbientCatalogV1 as sceneAmbientCatalog,
  sceneFromAuthoringRuntimePlanV1 as sceneFromAuthoringRuntimePlan,
  sceneFromDocumentV1 as sceneFromDocument,
  sceneStageTransitionBindingsV1 as sceneStageTransitionBindings,
} from "../contracts/scene.ts";
export type {
  AuthoringSceneRuntimePlanV1 as AuthoringSceneRuntimePlan,
  AuthoringSceneRuntimeV1 as AuthoringSceneRuntime,
  SceneStageTransitionBindingsV1 as SceneStageTransitionBindings,
  SceneV1 as Scene,
} from "../contracts/scene.ts";
export type { StageAmbientCatalogV1 as StageAmbientCatalog } from "../contracts/stage-ambient.ts";
