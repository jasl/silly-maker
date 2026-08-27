// SPDX-License-Identifier: MIT
import {
  sceneAmbientCatalog,
  sceneFromAuthoringRuntimePlan,
  sceneStageTransitionBindings,
} from "@sillymaker/base/story/scene";
import type {
  AuthoringSceneRuntime,
  AuthoringSceneRuntimePlan,
  SceneStageTransitionBindings,
  StageAmbientCatalog,
} from "@sillymaker/base/story/scene";

import { sceneRuntimePlanV1 } from "#sillymaker/scene/rooftop-antenna";
import linBlinkMotionDocumentV1 from "../control-room/motions/lin-blink.motion.json" with {
  type: "json",
};
import cableSwayMotionDocumentV1 from "./motions/cable-sway.motion.json" with { type: "json" };

export const vnReferenceTourRooftopAntennaCueIdsV1 = {
  rooftop: "cue.vn-reference-tour.rooftop-antenna.rooftop",
  antenna: "cue.vn-reference-tour.rooftop-antenna.antenna",
  cable: "cue.vn-reference-tour.rooftop-antenna.cable",
  masterSwitch: "cue.vn-reference-tour.rooftop-antenna.master-switch",
  statusLight: "cue.vn-reference-tour.rooftop-antenna.status-light",
  linPresent: "cue.vn-reference-tour.rooftop-antenna.lin-present",
  zhouPresent: "cue.vn-reference-tour.rooftop-antenna.zhou-present",
  statusLightOff: "cue.vn-reference-tour.rooftop-antenna.status-light-off",
} as const;

export const vnReferenceTourRooftopAntennaSceneRuntimePlanV1: AuthoringSceneRuntimePlan =
  sceneRuntimePlanV1;

export const vnReferenceTourRooftopAntennaSceneV1: AuthoringSceneRuntime =
  sceneFromAuthoringRuntimePlan(vnReferenceTourRooftopAntennaSceneRuntimePlanV1);

export const vnReferenceTourRooftopAntennaTransitionBindingsV1: SceneStageTransitionBindings =
  sceneStageTransitionBindings(vnReferenceTourRooftopAntennaSceneV1, { motions: [] });

export const vnReferenceTourRooftopAntennaAmbientCatalogV1: StageAmbientCatalog =
  sceneAmbientCatalog(vnReferenceTourRooftopAntennaSceneV1, {
    motions: [linBlinkMotionDocumentV1, cableSwayMotionDocumentV1],
  });
