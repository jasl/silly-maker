// SPDX-License-Identifier: MIT
import { describe, expect, expectTypeOf, it } from "vitest";

import * as internalUiV1 from "./internal.ts";
import * as publicUiV1 from "./index.ts";
import type {
  CreateStageReconcilerOptionsV1,
  DefaultGameRootPropsV1,
  DefaultGameRootSlotsV1,
  DefineNarrativeSurfaceInputV1,
  DefineWholeCanvasSurfaceInputV1,
  GameStageLayersV1,
  GameUiCompositionV1,
  InputContextIdV1,
  NarrativeChoiceAvailabilityV1,
  NarrativeSurfaceDefinitionV1,
  NarrativeSurfaceDialogueRendererPropsV1,
  NarrativeSurfaceHistoryRendererPropsV1,
  NarrativeSurfacePlayerViewV1,
  NarrativeSurfaceRendererPropsV1,
  NarrativeSurfaceResolutionRequestV1,
  NarrativeSurfaceSelectionV1,
  SaveOverlayGuardV1,
  SaveOverlayLabelsV1,
  SaveOverlayPortV1,
  SaveOverlaySlotNamesV1,
  SaveUiBackupExportResultV1,
  SavesLauncherPropsV1,
  SemanticStagePropsV1,
  SettingsLauncherPropsV1,
  StageInputIsolationContextIdV1,
  SystemDialogControllerV1,
  SystemDialogCustomSavesComponentV1,
  SystemDialogCustomSavesRenderIntentsV1,
  SystemDialogCustomSavesV1,
  SystemDialogHostPropsV1,
  SystemDialogOpenResultV1,
  SystemDialogSaveGuardProjectionV1,
  SystemDialogSavesV1,
  SystemDialogSessionSnapshotV1,
  SystemDialogSessionV1,
  SystemDialogSettingsV1,
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
} from "./index.ts";

type EqualPublicTypeV1<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends
  <T>() => T extends TRight ? 1 : 2 ? true : false;
type ExpectPublicTypeV1<TValue extends true> = TValue;
type OptionalPublicKeysV1<TValue> = {
  [TKey in keyof TValue]-?: Record<never, never> extends Pick<TValue, TKey> ? TKey : never;
}[keyof TValue];

describe("@sillymaker/ui public managed System surface", () => {
  it("keeps Code Surface on its focused package entry", () => {
    expect(publicUiV1).not.toHaveProperty("defineCodeSurfaceV1");
    expect(publicUiV1).not.toHaveProperty("CodeSurfaceCompositionHostV1");
  });

  it("exports the high-level Narrative definition and renderer contract", () => {
    expectTypeOf<InputContextIdV1>().toEqualTypeOf<
      | "debug"
      | "gameplay"
      | "interaction"
      | "narrative"
      | "whole_canvas"
      | "overlay"
      | "system"
    >();
    expect(publicUiV1.defineNarrativeSurfaceV1).toBeTypeOf("function");
    expectTypeOf<NarrativeSurfaceDefinitionV1<unknown>>()
      .toMatchTypeOf<object>();
    expectTypeOf<Extract<keyof NarrativeSurfaceDefinitionV1<unknown>, string>>()
      .toEqualTypeOf<never>();
    expectTypeOf<keyof NarrativeSurfaceSelectionV1>().toEqualTypeOf<
      "pending" | "history" | "choiceAvailability" | "voiceReplayAvailable"
    >();
    expectTypeOf<keyof NarrativeChoiceAvailabilityV1>().toEqualTypeOf<
      "choiceId" | "status" | "reasonTextIds"
    >();
    expectTypeOf<keyof NarrativeSurfaceResolutionRequestV1>().toEqualTypeOf<
      "expectedOccurrenceId" | "resolution"
    >();
    expectTypeOf<NarrativeSurfaceRendererPropsV1>().toEqualTypeOf<
      NarrativeSurfaceDialogueRendererPropsV1 | NarrativeSurfaceHistoryRendererPropsV1
    >();
    expectTypeOf<NarrativeSurfacePlayerViewV1>().not.toBeNever();
    expectTypeOf<keyof DefineNarrativeSurfaceInputV1<unknown>>().toEqualTypeOf<
      | "selectNarrative"
      | "dispatchResolution"
      | "dispatchTime"
      | "renderer"
      | "resolveText"
      | "replayCurrentVoice"
      | "isCurrentVoicePlaying"
    >();
    expectTypeOf<Extract<keyof DefaultGameRootSlotsV1<unknown, unknown, string>, "narrative">>()
      .toEqualTypeOf<never>();
    expectTypeOf<Extract<keyof SemanticStagePropsV1, "onAcknowledgment">>()
      .toEqualTypeOf<never>();
    expectTypeOf<Extract<keyof CreateStageReconcilerOptionsV1, "onAcknowledgment">>()
      .toEqualTypeOf<never>();
    for (
      const removedExport of [
        "AdvanceSurfaceV1",
        "DialoguePanelV1",
        "VnLayerV1",
        "createTextRevealV1",
        "createPlaybackControllerV1",
      ] as const
    ) expect(publicUiV1).not.toHaveProperty(removedExport);
  });

  it("exports the exact high-level whole-canvas authoring contract only from root", () => {
    expect(publicUiV1.createWholeCanvasApplicationSourceV1).toBeTypeOf("function");
    expect(publicUiV1.defineWholeCanvasSurfaceV1).toBeTypeOf("function");
    expect(internalUiV1).not.toHaveProperty("createWholeCanvasApplicationSourceV1");
    expect(internalUiV1).not.toHaveProperty("defineWholeCanvasSurfaceV1");

    expectTypeOf<WholeCanvasSurfacePlacementV1>().toEqualTypeOf<"primary" | "detail">();
    expectTypeOf<keyof WholeCanvasSurfaceCatalogEntryV1<string, string>>().toEqualTypeOf<
      "targetId" | "contractRevision" | "placements" | "actionIds" | "defaultActionId"
    >();
    expectTypeOf<keyof WholeCanvasSurfaceTargetV1<string>>().toEqualTypeOf<
      "targetId" | "parameters"
    >();
    expectTypeOf<keyof WholeCanvasSurfaceSelectionV1<string>>().toEqualTypeOf<"primary">();
    expectTypeOf<keyof WholeCanvasSurfacePublicationSourceV1<unknown, string>>().toEqualTypeOf<
      "kind" | "selectPrimary"
    >();
    expectTypeOf<Extract<keyof WholeCanvasApplicationSourceV1<string>, string>>().toEqualTypeOf<
      "replacePrimary" | "closePrimary"
    >();
    expectTypeOf<WholeCanvasSurfaceSourceV1<unknown, string>>().toEqualTypeOf<
      | WholeCanvasSurfacePublicationSourceV1<unknown, string>
      | WholeCanvasApplicationSourceV1<string>
    >();
    expectTypeOf<WholeCanvasSurfaceActionIntentV1<string>["kind"]>().toEqualTypeOf<
      "replace_primary" | "open_detail" | "back" | "close_primary" | "owner"
    >();
    expectTypeOf<keyof WholeCanvasSurfaceActionAvailabilityV1<string, string>>().toEqualTypeOf<
      "actionId" | "status" | "reasonTextIds" | "intent"
    >();
    expectTypeOf<keyof WholeCanvasSurfaceRendererActionV1<string>>().toEqualTypeOf<
      "actionId" | "status" | "reasonTextIds"
    >();
    expectTypeOf<keyof WholeCanvasSurfaceResolvedTargetV1<string, string>>().toEqualTypeOf<
      "accessibleNameTextId" | "view" | "actions"
    >();
    expectTypeOf<keyof WholeCanvasSurfaceResolveTargetRequestV1<unknown, string>>().toEqualTypeOf<
      "publication" | "placement" | "target"
    >();
    expectTypeOf<WholeCanvasSurfacePreparationTargetV1<string>["kind"]>().toEqualTypeOf<
      "primary" | "detail"
    >();
    expectTypeOf<keyof WholeCanvasSurfaceActionDispatchRequestV1<string, string>>()
      .toEqualTypeOf<"placement" | "primary" | "detail" | "actionId" | "payload">();
    expectTypeOf<keyof WholeCanvasSurfacePrimaryRendererPropsV1<string, string>>()
      .toEqualTypeOf<
        "kind" | "target" | "view" | "actions" | "resolveText" | "onAction" | "onBack"
      >();
    expectTypeOf<keyof WholeCanvasSurfaceDetailRendererPropsV1<string, string>>()
      .toEqualTypeOf<
        | "kind"
        | "primary"
        | "target"
        | "view"
        | "actions"
        | "resolveText"
        | "onAction"
        | "onBack"
      >();
    expectTypeOf<WholeCanvasSurfaceRendererPropsV1<string, string>>().toEqualTypeOf<
      | WholeCanvasSurfacePrimaryRendererPropsV1<string, string>
      | WholeCanvasSurfaceDetailRendererPropsV1<string, string>
    >();
    expectTypeOf<keyof DefineWholeCanvasSurfaceInputV1<unknown, string, string>>()
      .toEqualTypeOf<
        | "catalog"
        | "source"
        | "resolveTarget"
        | "dispatchAction"
        | "renderer"
        | "prepareTarget"
        | "resolveText"
      >();
    expectTypeOf<Extract<keyof WholeCanvasSurfaceDefinitionV1<unknown>, string>>()
      .toEqualTypeOf<never>();
  });

  it("exports the exact eight-layer Stage ABI and five isolation contexts", () => {
    expectTypeOf<
      ExpectPublicTypeV1<
        EqualPublicTypeV1<
          keyof GameStageLayersV1,
          | "background"
          | "character"
          | "sceneInteraction"
          | "hud"
          | "narrative"
          | "wholeCanvas"
          | "workspaceOverlay"
          | "system"
        >
      >
    >().toEqualTypeOf<true>();
    expectTypeOf<
      ExpectPublicTypeV1<EqualPublicTypeV1<OptionalPublicKeysV1<GameStageLayersV1>, never>>
    >().toEqualTypeOf<true>();
    expectTypeOf<
      ExpectPublicTypeV1<
        EqualPublicTypeV1<
          StageInputIsolationContextIdV1,
          "interaction" | "narrative" | "whole_canvas" | "overlay" | "system"
        >
      >
    >().toEqualTypeOf<true>();
  });

  it("keeps the composition-backed Host and launchers without standalone lifecycle hosts", () => {
    type WholeCanvasPublicIngressSpellingV1 =
      | "wholeCanvas"
      | "wholeCanvasDefinition"
      | "wholeCanvasDefinitionInternalV1"
      | "wholeCanvasComposition"
      | "wholeCanvasCompositionInternalV1"
      | "wholeCanvasRuntime"
      | "wholeCanvasRuntimeInternalV1"
      | "wholeCanvasHostBinding"
      | "wholeCanvasHostBindingInternalV1"
      | "getCurrentHostBindingInternalV1"
      | "isFrontDoorExclusiveInternalV1";

    expectTypeOf<
      Extract<
        keyof SemanticStagePropsV1,
        | "claimant"
        | "driver"
        | "onBindInternalV1"
        | "bindSemanticStageCompositionRetargetDelegateInternalV1"
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<
        keyof GameUiCompositionV1<unknown, unknown, unknown, unknown, string>,
        | "narrative"
        | "narrativeComposition"
        | "runtimeKernel"
        | "stageClaimant"
        | "barrierStageClaimant"
        | "detachRuntimeInternalV1"
        | "prepareRuntimeAttachmentInternalV1"
        | "activateRuntimeAttachmentInternalV1"
        | "abortRuntimeAttachmentInternalV1"
        | "getCurrentSessionInternalV1"
        | "getCurrentSelectionInternalV1"
        | "getStageClaimantInternalV1"
        | "isHostEnabledInternalV1"
        | "isFrontDoorExclusiveInternalV1"
        | "isGestureCurrentInternalV1"
        | "registerHostPhysicalIngressInternalV1"
        | "captureBoundHostActionInternalV1"
        | "provideHostActionContextInternalV1"
        | "subscribeInternalV1"
        | "bindStageReconcilerInternalV1"
        | "isCurrentRuntimeAttachmentInternalV1"
        | "disposeInternalV1"
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<
        keyof DefaultGameRootPropsV1<unknown, unknown, unknown, unknown, string, unknown>,
        | "narrativeDefinitionInternalV1"
        | "narrativeComposition"
        | "barrierStageClaimant"
        | "detachRuntimeInternalV1"
        | "prepareRuntimeAttachmentInternalV1"
        | "activateRuntimeAttachmentInternalV1"
        | "abortRuntimeAttachmentInternalV1"
        | "getCurrentSessionInternalV1"
        | "getCurrentSelectionInternalV1"
        | "getStageClaimantInternalV1"
        | "isHostEnabledInternalV1"
        | "isFrontDoorExclusiveInternalV1"
        | "isGestureCurrentInternalV1"
        | "registerHostPhysicalIngressInternalV1"
        | "captureBoundHostActionInternalV1"
        | "provideHostActionContextInternalV1"
        | "subscribeInternalV1"
        | "bindStageReconcilerInternalV1"
        | "isCurrentRuntimeAttachmentInternalV1"
        | "disposeInternalV1"
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<
        keyof DefaultGameRootPropsV1<unknown, unknown, unknown, unknown, string, unknown>,
        "titleScreen"
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<
      ExpectPublicTypeV1<
        EqualPublicTypeV1<
          Extract<
            keyof GameUiCompositionV1<unknown, unknown, unknown, unknown, string>,
            WholeCanvasPublicIngressSpellingV1
          >,
          never
        >
      >
    >().toEqualTypeOf<true>();
    expectTypeOf<
      ExpectPublicTypeV1<
        EqualPublicTypeV1<
          Extract<
            keyof DefaultGameRootPropsV1<unknown, unknown, unknown, unknown, string, unknown>,
            WholeCanvasPublicIngressSpellingV1
          >,
          never
        >
      >
    >().toEqualTypeOf<true>();
    expectTypeOf<
      ExpectPublicTypeV1<
        EqualPublicTypeV1<
          Extract<
            keyof DefaultGameRootSlotsV1<unknown, unknown, string>,
            WholeCanvasPublicIngressSpellingV1
          >,
          never
        >
      >
    >().toEqualTypeOf<true>();

    expect(publicUiV1.SystemDialogHostV1).toBeTypeOf("function");
    expect(publicUiV1.SettingsLauncherV1).toBeTypeOf("function");
    expect(publicUiV1.SavesLauncherV1).toBeTypeOf("function");
    expect(publicUiV1.InstanceLeaseBannerV1).toBeTypeOf("function");
    expect(publicUiV1.useSystemDialogControllerV1).toBeTypeOf("function");

    for (
      const removedExport of [
        "createSystemDialogSessionStoreV1",
        "SettingsDialogV1",
        "ActionConfirmationDialogV1",
        "SaveOverlayV1",
      ] as const
    ) {
      expect(publicUiV1).not.toHaveProperty(removedExport);
    }
    expect(publicUiV1).not.toHaveProperty(
      "createManagedSurfaceStableAdmissionAuthorityInternalV1",
    );
    expect(internalUiV1).not.toHaveProperty(
      "createManagedSurfaceStableAdmissionAuthorityInternalV1",
    );
    // Managed-composition authority is a Host-only seam.
    expect(publicUiV1).not.toHaveProperty(
      "resolveGameUiManagedSurfaceCompositionInternalV1",
    );
    expect(internalUiV1.resolveGameUiManagedSurfaceCompositionInternalV1)
      .toBeTypeOf("function");
  });

  it("exports the opaque facade, structured intents, and content configuration types", () => {
    type SessionKeysV1 = Extract<keyof SystemDialogSessionV1, string>;
    type CustomSavesHasRenderCallbackV1 = "render" extends keyof SystemDialogCustomSavesV1 ? true
      : false;
    type SaveRecoveryPortKeysV1 = keyof NonNullable<SaveOverlayPortV1["recovery"]>;
    type SaveRecoveryLabelKeysV1 = keyof NonNullable<SaveOverlayLabelsV1["recovery"]>;
    type SavePortHasFlatInspectionV1 = "inspectSave" extends keyof SaveOverlayPortV1 ? true : false;

    expectTypeOf<SessionKeysV1>().toEqualTypeOf<
      "getSnapshot" | "openSettings" | "openSaves"
    >();
    expectTypeOf<SystemDialogSessionV1["getSnapshot"]>()
      .returns.toEqualTypeOf<SystemDialogSessionSnapshotV1>();
    expectTypeOf<SystemDialogControllerV1["openSettings"]>()
      .returns.toEqualTypeOf<SystemDialogOpenResultV1>();
    expectTypeOf<SystemDialogControllerV1["openSaves"]>()
      .returns.toEqualTypeOf<SystemDialogOpenResultV1>();
    expectTypeOf<SystemDialogHostPropsV1["session"]>().toEqualTypeOf<
      SystemDialogSessionV1
    >();
    expectTypeOf<SystemDialogCustomSavesV1["component"]>().toEqualTypeOf<
      SystemDialogCustomSavesComponentV1
    >();
    expectTypeOf<CustomSavesHasRenderCallbackV1>().toEqualTypeOf<false>();
    expectTypeOf<SaveRecoveryPortKeysV1>().toEqualTypeOf<
      | "inspectSave"
      | "inspectBackup"
      | "upgradeSave"
      | "reanchorSave"
      | "restoreBackup"
      | "exportBackup"
      | "discardBackup"
    >();
    expectTypeOf<SaveRecoveryLabelKeysV1>().toEqualTypeOf<
      "checking" | "disposition" | "backup" | "action" | "confirmation" | "operation"
    >();
    expectTypeOf<SavePortHasFlatInspectionV1>().toEqualTypeOf<false>();

    // These aliases are intentionally referenced as one package-root consumer
    // so declaration regressions fail the ordinary aggregate typecheck.
    expectTypeOf<
      | SaveOverlayGuardV1
      | SaveOverlayLabelsV1
      | SaveOverlayPortV1
      | SaveOverlaySlotNamesV1
      | SaveUiBackupExportResultV1
      | SavesLauncherPropsV1
      | SettingsLauncherPropsV1
      | SystemDialogCustomSavesRenderIntentsV1
      | SystemDialogSaveGuardProjectionV1
      | SystemDialogSavesV1
      | SystemDialogSettingsV1
    >().not.toBeNever();
  });
});
