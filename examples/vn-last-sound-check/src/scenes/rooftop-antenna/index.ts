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

export const vnLastSoundCheckRooftopAntennaCueIdsV1 = {
  rooftop: "cue.vn-last-sound-check.rooftop-antenna.rooftop",
  antenna: "cue.vn-last-sound-check.rooftop-antenna.antenna",
  cable: "cue.vn-last-sound-check.rooftop-antenna.cable",
  masterSwitch: "cue.vn-last-sound-check.rooftop-antenna.master-switch",
  statusLight: "cue.vn-last-sound-check.rooftop-antenna.status-light",
  linPresent: "cue.vn-last-sound-check.rooftop-antenna.lin-present",
  zhouPresent: "cue.vn-last-sound-check.rooftop-antenna.zhou-present",
  statusLightOff: "cue.vn-last-sound-check.rooftop-antenna.status-light-off",
} as const;

export const vnLastSoundCheckRooftopAntennaSceneRuntimePlanV1: AuthoringSceneRuntimePlan =
  sceneRuntimePlanV1;

export const vnLastSoundCheckRooftopAntennaSceneV1: AuthoringSceneRuntime =
  sceneFromAuthoringRuntimePlan(vnLastSoundCheckRooftopAntennaSceneRuntimePlanV1);

export const vnLastSoundCheckRooftopAntennaTransitionBindingsV1: SceneStageTransitionBindings =
  sceneStageTransitionBindings(vnLastSoundCheckRooftopAntennaSceneV1, { motions: [] });

export const vnLastSoundCheckRooftopAntennaAmbientCatalogV1: StageAmbientCatalog =
  sceneAmbientCatalog(vnLastSoundCheckRooftopAntennaSceneV1, {
    motions: [linBlinkMotionDocumentV1, cableSwayMotionDocumentV1],
  });
