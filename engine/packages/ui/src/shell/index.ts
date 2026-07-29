// SPDX-License-Identifier: MIT
export { GameShell } from "./game-shell.tsx";
export type { GameShellPropsV1, GameShellViewportOptionsV1 } from "./game-shell.tsx";
export {
  GameStageV1,
  stageLayerIdsV1,
  useStageInputIsolationV1,
  useStagePointerGestureFenceV1,
  useStageSystemFocusScopeRegistrationV1,
  useStageSystemFocusScopeTargetV1,
  useStageSystemPortalContainerV1,
} from "./game-stage.tsx";
export type {
  GameStageLayersV1,
  GameStagePropsV1,
  StageInputIsolationContextIdV1,
  StageLayerIdV1,
} from "./game-stage.tsx";
export {
  STAGE_POINTER_GESTURE_FENCE_TIMEOUT_MS_V1,
  armStagePointerGestureFenceV1,
} from "./pointer-gesture-fence.ts";
export type {
  ArmStagePointerGestureFenceOptionsV1,
  StagePointerGestureFenceHandleV1,
} from "./pointer-gesture-fence.ts";
export { computeStageFrameV1, stageLayoutConstantsV1 } from "./stage-layout.ts";
export type { StageFrameV1, StageViewportV1 } from "./stage-layout.ts";
export { TopCardHudV1 } from "./top-card-hud.tsx";
export type { StageHudSlotsV1, TopCardHudPropsV1 } from "./top-card-hud.tsx";
