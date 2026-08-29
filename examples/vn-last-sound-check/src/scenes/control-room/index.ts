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
export const vnLastSoundCheckLayersV1 = {
  background: "layer.vn-last-sound-check.background",
  props: "layer.vn-last-sound-check.props",
  characters: "layer.vn-last-sound-check.characters",
  foreground: "layer.vn-last-sound-check.foreground",
} as const;

export const vnLastSoundCheckTagsV1 = {
  lin: "tag.vn-last-sound-check.character.lin",
  zhou: "tag.vn-last-sound-check.character.zhou",
} as const;

export const vnLastSoundCheckControlRoomCueIdsV1 = {
  room: "cue.vn-last-sound-check.control-room.room",
  windowFirstLight: "cue.vn-last-sound-check.control-room.window-first-light",
  mixingConsole: "cue.vn-last-sound-check.control-room.mixing-console",
  tapeMachine: "cue.vn-last-sound-check.control-room.tape-machine",
  wallClock: "cue.vn-last-sound-check.control-room.wall-clock",
  microphone: "cue.vn-last-sound-check.control-room.microphone",
  signalLight: "cue.vn-last-sound-check.control-room.signal-light",
  linEnters: "cue.vn-last-sound-check.control-room.lin-enters",
  zhouPresent: "cue.vn-last-sound-check.control-room.zhou-present",
  signalLightOff: "cue.vn-last-sound-check.control-room.signal-light-off",
} as const;

export const vnLastSoundCheckControlRoomSceneRuntimePlanV1: AuthoringSceneRuntimePlan =
  sceneRuntimePlanV1;

export const vnLastSoundCheckControlRoomSceneV1: AuthoringSceneRuntime =
  sceneFromAuthoringRuntimePlan(vnLastSoundCheckControlRoomSceneRuntimePlanV1);

export const vnLastSoundCheckControlRoomTransitionBindingsV1: SceneStageTransitionBindings =
  sceneStageTransitionBindings(vnLastSoundCheckControlRoomSceneV1, {
    motions: [linEntranceMotionDocumentV1],
  });

export const vnLastSoundCheckControlRoomAmbientCatalogV1: StageAmbientCatalog = sceneAmbientCatalog(
  vnLastSoundCheckControlRoomSceneV1,
  { motions: [linBlinkMotionDocumentV1] },
);
