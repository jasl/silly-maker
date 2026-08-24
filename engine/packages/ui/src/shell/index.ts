// SPDX-License-Identifier: MIT
export { GameShell } from "./game-shell.tsx";
export type { GameShellPropsV1, GameShellViewportOptionsV1 } from "./game-shell.tsx";
export {
  AuxiliarySurfacePortalCoordinatorV1,
  useAuxiliarySurfacePortalTargetRegistrationV1,
  useAuxiliarySurfacePortalTargetV1,
} from "./auxiliary-surface-portal.tsx";
export type {
  AuxiliarySurfacePortalCoordinatorPropsV1,
  AuxiliarySurfacePortalSurfaceV1,
  AuxiliarySurfacePortalTargetSelectionV1,
} from "./auxiliary-surface-portal.tsx";
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
export { computeStageFrameV1, stageLayoutConstantsV1 } from "./stage-layout.ts";
export type { StageFrameV1, StageViewportV1 } from "./stage-layout.ts";
export {
  installNativeBehaviorResetV1,
  nativeBehaviorAllowMenuAttributeV1,
  nativeBehaviorAllowTextAttributeV1,
  nativeBehaviorEditableSelectorV1,
} from "./native-behavior-reset.ts";
export type {
  NativeBehaviorResetConfigV1,
  NativeBehaviorResetHandleV1,
} from "./native-behavior-reset.ts";
export { TopCardHudV1 } from "./top-card-hud.tsx";
export type { StageHudSlotsV1, TopCardHudPropsV1 } from "./top-card-hud.tsx";
