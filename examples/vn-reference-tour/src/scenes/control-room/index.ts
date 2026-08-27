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

import { sceneRuntimePlanV1 } from "#sillymaker/scene/control-room";
import linBlinkMotionDocumentV1 from "./motions/lin-blink.motion.json" with { type: "json" };
import linEntranceMotionDocumentV1 from "./motions/lin-entrance.motion.json" with {
  type: "json",
};

/** Stable Scene references used by Story-authored appearance changes. */
export const vnReferenceTourLayersV1 = {
  background: "layer.vn-reference-tour.background",
  props: "layer.vn-reference-tour.props",
  characters: "layer.vn-reference-tour.characters",
  foreground: "layer.vn-reference-tour.foreground",
} as const;

export const vnReferenceTourTagsV1 = {
  lin: "tag.vn-reference-tour.character.lin",
  zhou: "tag.vn-reference-tour.character.zhou",
} as const;

export const vnReferenceTourControlRoomCueIdsV1 = {
  room: "cue.vn-reference-tour.control-room.room",
  windowFirstLight: "cue.vn-reference-tour.control-room.window-first-light",
  mixingConsole: "cue.vn-reference-tour.control-room.mixing-console",
  tapeMachine: "cue.vn-reference-tour.control-room.tape-machine",
  wallClock: "cue.vn-reference-tour.control-room.wall-clock",
  microphone: "cue.vn-reference-tour.control-room.microphone",
  signalLight: "cue.vn-reference-tour.control-room.signal-light",
  linEnters: "cue.vn-reference-tour.control-room.lin-enters",
  zhouPresent: "cue.vn-reference-tour.control-room.zhou-present",
  signalLightOff: "cue.vn-reference-tour.control-room.signal-light-off",
} as const;

export const vnReferenceTourControlRoomSceneRuntimePlanV1: AuthoringSceneRuntimePlan =
  sceneRuntimePlanV1;

export const vnReferenceTourControlRoomSceneV1: AuthoringSceneRuntime =
  sceneFromAuthoringRuntimePlan(vnReferenceTourControlRoomSceneRuntimePlanV1);

export const vnReferenceTourControlRoomTransitionBindingsV1: SceneStageTransitionBindings =
  sceneStageTransitionBindings(vnReferenceTourControlRoomSceneV1, {
    motions: [linEntranceMotionDocumentV1],
  });

export const vnReferenceTourControlRoomAmbientCatalogV1: StageAmbientCatalog = sceneAmbientCatalog(
  vnReferenceTourControlRoomSceneV1,
  { motions: [linBlinkMotionDocumentV1] },
);
