// SPDX-License-Identifier: MIT
export { createAssetRegistryV1 } from "./assets/asset-registry.ts";
export { resolveAssetUrlV1, useAssetUrlV1 } from "./assets/use-asset-url.ts";
export type {
  AssetLoadFaultCodeV1,
  AssetLoadResultV1,
  AssetRegistryDiagnosticV1,
  AssetRegistryPublicationV1,
  AssetRegistryV1,
  RuntimeAssetLoaderV1,
  RuntimeAssetLoadRequestV1,
} from "./assets/asset-registry.ts";
export { CodeNativeAssetFallbackV1 } from "./assets/code-native-asset-fallback.tsx";
export type { CodeNativeAssetFallbackPropsV1 } from "./assets/code-native-asset-fallback.tsx";
export { createPresentationReadPortV1 } from "./assets/presentation-read-port.ts";
export type {
  CreatePresentationReadPortInputV1,
  PresentationReadPortV1,
} from "./assets/presentation-read-port.ts";
export { Button, IconButton, PanelV1, ProgressMeter } from "./primitives/index.ts";
export { clampElementDragPositionV1, useClampedElementDragV1 } from "./primitives/index.ts";
export type {
  ButtonPropsV1,
  ClampElementDragPositionInputV1,
  ClampedElementDragPositionV1,
  ClampedElementDragV1,
  IconButtonPropsV1,
  PanelCloseControlV1,
  PanelPropsV1,
  ProgressMeterPropsV1,
} from "./primitives/index.ts";
export { createUiContributionRegistryV1 } from "./contributions/registry.ts";
export type {
  GameRendererContextV1,
  UiContributionSetV1,
  UiContributionRegistryV1,
  UiRendererContributionV1,
  UiRendererNamespaceV1,
} from "./contributions/types.ts";
export {
  DiagnosticExportButtonV1,
  diagnosticExportContentCategoryIdsV1,
} from "./diagnostics/index.ts";
export type {
  DebugUiSessionProjectionInputV1,
  DiagnosticExportButtonPropsV1,
  DiagnosticExportContentCategoryIdV1,
  DiagnosticExportPortV1,
  DiagnosticExportPreviewV1,
} from "./diagnostics/index.ts";
export { RootErrorBoundaryV1, RuntimeFailureDialogV1 } from "./errors/index.ts";
export type {
  RootErrorBoundaryFailureDialogV1,
  RootErrorBoundaryPropsV1,
  RootErrorBoundaryRecoveryActionsV1,
  RuntimeFailureDialogActionsV1,
  RuntimeFailureDialogPropsV1,
} from "./errors/index.ts";
export { createViewSourceV1, useReadonlyViewV1 } from "./runtime/create-view-bridge.ts";
export type { MutableViewSourceV1 } from "./runtime/create-view-bridge.ts";
export {
  InputContextProviderV1,
  createHeldKeyInputV1,
  createInputRouterV1,
  inputHandledV1,
  inputIgnoredV1,
  installGamepadAdapterV1,
  installKeyboardAdapterV1,
  parseInputActionIdV1,
  playerInputActionIdsV1,
  systemInputActionIdsV1,
  useInputRouterV1,
} from "./input/index.ts";
export type {
  GamepadActionMapV1,
  GamepadLikeV1,
  HeldInputPortV1,
  HeldInputStateV1,
  HeldKeyInputV1,
  HeldKeyMapV1,
  InputActionIdV1,
  InputContextIdV1,
  InputContextProviderPropsV1,
  InputEventV1,
  InputHandlerResultV1,
  InputRouteResultV1,
  InputRouterV1,
  InstallGamepadAdapterOptionsV1,
  InstalledGamepadAdapterV1,
  InstallHeldKeyAdapterOptionsV1,
  InstallKeyboardAdapterOptionsV1,
  KeyboardActionMapV1,
  PointerActionMapV1,
  ViewportPointV1,
} from "./input/index.ts";
export {
  createInteractionSessionStoreV1,
  createPresentationIntentRouterV1,
  initialInteractionSessionStateV1,
} from "./interaction/index.ts";
export type {
  InteractionSessionCleanupReasonV1,
  InteractionSessionStateLensV1,
  InteractionSessionStateReducerV1,
  InteractionSessionStateV1,
  InteractionSessionStoreV1,
  PresentationFaultV1,
  PresentationCueWriterV1,
  PresentationInteractionSessionWriterV1,
  PresentationIntentV1,
  PresentationIntentRouteContextV1,
  PresentationIntentRouteResultV1,
  PresentationIntentRouterOptionsV1,
  PresentationIntentRouterV1,
  PresentationOverlayWriterV1,
} from "./interaction/index.ts";
export { defineNarrativeSurfaceV1 } from "./narrative/narrative-surface-composition.tsx";
export type {
  DefineNarrativeSurfaceInputV1,
  NarrativeChoiceAvailabilityV1,
  NarrativeSurfaceDefinitionV1,
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryRendererPropsV1,
  NarrativeSurfacePlayerViewV1,
  NarrativeSurfaceRendererPropsV1,
  NarrativeSurfaceResolutionRequestV1,
  NarrativeSurfaceSelectionV1,
} from "./narrative/narrative-surface-composition.tsx";
export {
  createWholeCanvasApplicationSourceV1,
  defineWholeCanvasSurfaceV1,
} from "./whole-canvas/whole-canvas-surface-composition.tsx";
export type {
  DefineWholeCanvasSurfaceInputV1,
  WholeCanvasApplicationSourceV1,
  WholeCanvasSurfaceActionAvailabilityV1,
  WholeCanvasSurfaceActionDispatchRequestV1,
  WholeCanvasSurfaceActionIntentV1,
  WholeCanvasSurfaceCatalogEntryV1,
  WholeCanvasSurfaceDefinitionV1,
  WholeCanvasSurfaceDetailRendererPropsV1,
  WholeCanvasSurfacePlacementV1,
  WholeCanvasSurfacePreparationTargetV1,
  WholeCanvasSurfacePrimaryRendererPropsV1,
  WholeCanvasSurfacePublicationSourceV1,
  WholeCanvasSurfaceRendererActionV1,
  WholeCanvasSurfaceRendererPropsV1,
  WholeCanvasSurfaceResolvedTargetV1,
  WholeCanvasSurfaceResolveTargetRequestV1,
  WholeCanvasSurfaceSelectionV1,
  WholeCanvasSurfaceSourceV1,
  WholeCanvasSurfaceTargetV1,
} from "./whole-canvas/whole-canvas-surface-composition.tsx";
export { useLocaleTextV1 } from "./system/use-locale-text.ts";
export { useReducedMotionV1 } from "./system/use-reduced-motion.ts";
export { defineWorkspaceOverlayV1, maximumOverlayDetailDepthV1 } from "./overlays/index.ts";
export type {
  DefineWorkspaceOverlayInputV1,
  OverlayAdmissionRejectionV1,
  OverlayCloseTopResultV1,
  OverlayOpenResultV1,
  OverlayPushDetailResultV1,
  OverlayRendererResolutionV1,
  OverlayRendererResolverV1,
  OverlaySessionStateV1,
  OverlaySessionStoreV1,
  WorkspaceOverlayDefinitionV1,
  WorkspaceOverlayPortBindingV1,
} from "./overlays/index.ts";
export type {
  SaveOverlayGuardV1,
  SaveOverlayLabelsV1,
  SaveOverlayPortV1,
  SaveOverlaySlotNamesV1,
  SaveUiBackupExportResultV1,
  SaveUiImportFileRejectionCodeV1,
  SaveUiImportResultV1,
  SaveUiReadableSlotIdV1,
  SaveUiWritableSlotIdV1,
} from "./persistence/index.ts";
export { SemanticActionControlV1 } from "./runtime/semantic-action-control.tsx";
export type {
  SemanticActionControlDescriptorV1,
  SemanticActionControlPropsV1,
  SemanticActionDispatchPortV1,
} from "./runtime/semantic-action-control.tsx";
export { createSemanticPublicationBridgeV1 } from "./runtime/semantic-publication-bridge.ts";
export type {
  SemanticPublicationBridgeV1,
  SemanticPublicationSourceV1,
} from "./runtime/semantic-publication-bridge.ts";
export { useSemanticPublicationV1 } from "./runtime/use-semantic-publication.ts";
export {
  RuntimePresentationConstructionErrorV1,
  createRuntimePresentationStoreV1,
} from "./runtime/index.ts";
export type {
  CreateRuntimePresentationStoreInputV1,
  PresentationRuntimeFailureV1,
  RuntimePresentationProjectionInputV1,
  RuntimePresentationProjectionV1,
  RuntimePresentationPublicationV1,
  RuntimePresentationStoreV1,
} from "./runtime/index.ts";
export {
  GameShell,
  GameStageV1,
  TopCardHudV1,
  computeStageFrameV1,
  installNativeBehaviorResetV1,
  nativeBehaviorAllowMenuAttributeV1,
  nativeBehaviorAllowTextAttributeV1,
  nativeBehaviorEditableSelectorV1,
  stageLayerIdsV1,
  stageLayoutConstantsV1,
  useStageInputIsolationV1,
  useStagePointerGestureFenceV1,
  useStageSystemFocusScopeRegistrationV1,
  useStageSystemFocusScopeTargetV1,
  useStageSystemPortalContainerV1,
} from "./shell/index.ts";
export type {
  GameShellPropsV1,
  GameShellViewportOptionsV1,
  GameStageLayersV1,
  GameStagePropsV1,
  NativeBehaviorResetConfigV1,
  NativeBehaviorResetHandleV1,
  StageFrameV1,
  StageHudSlotsV1,
  StageInputIsolationContextIdV1,
  StageLayerIdV1,
  StageViewportV1,
  TopCardHudPropsV1,
} from "./shell/index.ts";
export {
  createStageReconcilerV1,
  createTimelinePlayerV1,
  SemanticStageHostV1,
  SemanticStageTargetHostV1,
  SemanticStageV1,
  settledStageFrameV1,
} from "./stage/index.ts";
export type {
  CreateStageReconcilerOptionsV1,
  TimelineCueRunV1,
  TimelinePlayerV1,
  SemanticStageEntryRendererInputV1,
  SemanticStageEntryRendererV1,
  SemanticStageHostDiagnosticV1,
  SemanticStageHostPropsV1,
  SemanticStagePropsV1,
  StageFrameEntryV1,
  StageFrameLayerV1,
  StageFramePhaseV1,
  StageInputGateV1,
  StageReconcilerV1,
  StageRenderFrameV1,
  StageRetargetInputV1,
} from "./stage/index.ts";
export {
  audioBusForChannelV1,
  createAudioPresenterV1,
  createFakeAudioHostV1,
  GameAudioV1,
  sameChannelPlaybackV1,
} from "./audio/index.ts";
export type {
  AudioBusV1,
  AudioHostChannelV1,
  AudioHostDiagnosticV1,
  AudioHostEffectInputV1,
  AudioHostPlayInputV1,
  AudioHostV1,
  AudioPresenterRetargetInputV1,
  AudioPresenterV1,
  CreateAudioPresenterOptionsV1,
  FakeAudioChannelStateV1,
  FakeAudioHostV1,
  GameAudioPortsV1,
  GameAudioPropsV1,
  ResolvedEffectAssetV1,
} from "./audio/index.ts";
export {
  createAnimationFramePresentationClockV1,
  createManualPresentationClockV1,
  createPresentationFreezePortV1,
  createPresentationRatePortV1,
  createPresentationRunV1,
  createSessionTimeReporterV1,
  easeInOutV1,
} from "./presentation-run/index.ts";
export type {
  CreatePresentationRunOptionsV1,
  ManualPresentationClockV1,
  PresentationClockV1,
  PresentationFreezePortV1,
  PresentationFreezeStateV1,
  PresentationRatePortV1,
  PresentationRateStateV1,
  PresentationRunOutcomeV1,
  PresentationRunStatusV1,
  PresentationRunV1,
  SessionTimeReporterV1,
} from "./presentation-run/index.ts";
export {
  InstanceLeaseBannerV1,
  defaultInstanceLeaseBannerLabelsV1,
  SavesLauncherV1,
  SettingsLauncherV1,
  SystemDialogHostV1,
  useSystemDialogControllerV1,
} from "./system/index.ts";
export type {
  InstanceLeaseBannerLabelsV1,
  InstanceLeaseBannerPortV1,
  InstanceLeaseBannerPropsV1,
  InstanceLeaseBannerRoleV1,
  InstanceLeaseBannerStateV1,
  SavesLauncherPropsV1,
  SettingsLauncherPropsV1,
  SystemDialogControllerV1,
  SystemDialogCustomSavesComponentV1,
  SystemDialogCustomSavesRenderIntentsV1,
  SystemDialogCustomSavesV1,
  SystemDialogHostPropsV1,
  SystemDialogOpenResultV1,
  SystemDialogSaveGuardProjectionV1,
  SystemDialogSavesV1,
  SystemDialogSessionActiveSurfaceV1,
  SystemDialogSessionSnapshotV1,
  SystemDialogSessionV1,
  SystemDialogSettingsV1,
} from "./system/index.ts";
export { GameSymbolV1, createGameSymbolRegistryV1, parseGameSymbolIdV1 } from "./symbols/index.ts";
export type {
  GameSymbolAccessibilityV1,
  GameSymbolIdV1,
  GameSymbolPropsV1,
  GameSymbolProviderV1,
  GameSymbolRegistryV1,
  GameSymbolRenderPropsV1,
  GameSymbolResolutionV1,
  GameSymbolSizeV1,
} from "./symbols/index.ts";
export { GameViewportV1, useGameViewportV1, useOptionalGameViewportV1 } from "./viewport/index.ts";
export type {
  GameViewportCanvasV1,
  GameViewportGeometryV1,
  GameViewportPropsV1,
  GameViewportSizeV1,
} from "./viewport/index.ts";
export {
  DefaultGameRootV1,
  createGameUiCompositionV1,
  defaultGameRootLabelsV1,
} from "./composer/index.ts";
// The DevDock window control is composer-level plumbing (a Story dock
// opens engine tool windows through it); the tooling UI itself stays on
// the dedicated debug subpath.
export { createDevDockControlV1 } from "./debug/dev-dock-control.ts";
export type { DevDockControlV1, DevDockPanelDescriptorV1 } from "./debug/dev-dock-control.ts";
export type {
  CreateGameUiCompositionInputV1,
  DefaultGameRootLabelsV1,
  DefaultGameRootPropsV1,
  DefaultGameRootSlotContextV1,
  DefaultGameRootSlotsV1,
  GameUiAnchorSourceV1,
  GameUiCompositionV1,
  GameUiOverlayIdV1,
  GameUiPresentationAnchorV1,
  GameUiProjectorV1,
  GameUiSemanticSourceV1,
  GameUiStateV1,
} from "./composer/index.ts";
