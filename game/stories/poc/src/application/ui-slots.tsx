// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { createElement, useEffect, useMemo } from "react";
import type { ComponentType, ReactElement } from "react";

import type { AssetId, DeepReadonly, HitMapDescriptorV1, TextId } from "@sillymaker/base";
import {
  Button,
  CharacterHostV1,
  StageSceneHostV1,
  createInteractionControllerV1,
  interactionTargetControlIdV1,
  usePresentationAssetV1,
  validateRuntimeInteractionSurfaceV1,
} from "@sillymaker/ui";
import type {
  DefaultGameRootSlotContextV1,
  DefaultGameRootSlotsV1,
  InteractionSessionStoreV1,
  OverlayRendererResolverV1,
  RuntimeInteractionSurfaceV1,
  UiContributionRegistryV1,
  UiRendererNamespaceV1,
} from "@sillymaker/ui";
import { createHashRouterV1 } from "@sillymaker/web";

import { pocNoContentFilterOptionsTextIdV1, pocTextIdsV1 } from "../content/text-ids.js";
import type {
  PocOverlayIdV1,
  PocPresentationUiStateV1,
  PocRuntimePresentationPublicationV1,
} from "../presentation/runtime/contracts.js";
import type {
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1,
} from "../presentation/semantic-actions.js";
import { pocGameSymbolRegistryV1 } from "../presentation/symbols/poc-game-symbols.js";
import {
  pocFixedRendererIdsV1,
  type PocInteractionRendererViewV1,
  type PocUiPresentationReadPortV1,
  type PocUiRendererContextsV1,
} from "../presentation/ui-contributions.js";
import type { PocResolvedGameV1 } from "../story-definition.js";
import type { PocSemanticGamePortV1 } from "./semantic-adapter.js";

/**
 * The Tavern PoC contributions for the default GameRoot: stage, characters,
 * spatial interaction, HUD, narrative, overlays, and system-menu actions —
 * all Story slots over the composer's composition. The resident player DOM
 * carries no debug vocabulary; diagnostics export and capability tooling
 * live in the DevDock behind the debug_tools capability.
 */

type PocRuntimeSurfaceV1 = RuntimeInteractionSurfaceV1<
  PocSemanticActionDescriptorV1,
  PocSemanticInvocationV1
>;

export type PocSlotContextV1 = DefaultGameRootSlotContextV1<
  PocRuntimePresentationPublicationV1,
  PocSemanticGamePortV1
>;

export interface PocUiSlotServicesV1 {
  readonly resolvedGame: PocResolvedGameV1;
  readonly contributions: UiContributionRegistryV1<PocUiRendererContextsV1>;
  readonly presentationRead: PocUiPresentationReadPortV1;
  preloadAssets(assetIds: readonly AssetId[]): void;
}

function requireRendererV1<TNamespace extends UiRendererNamespaceV1>(
  services: PocUiSlotServicesV1,
  namespace: TNamespace,
  rendererId: string,
): ComponentType<PocUiRendererContextsV1[TNamespace]> {
  const resolution = services.contributions.resolve(namespace, rendererId);
  if (resolution.kind !== "found") {
    throw new TypeError(`ui.poc.renderer_not_found:${namespace}:${rendererId}`);
  }
  return resolution.component;
}

function overlayTitleTextIdV1(overlayId: PocStoryOverlayIdV1): TextId {
  switch (overlayId) {
    case "overlay.poc.policy":
      return pocTextIdsV1.overlayPolicyTitle;
    case "overlay.poc.inventory":
      return pocTextIdsV1.overlayInventoryTitle;
    case "overlay.poc.purchase":
      return pocTextIdsV1.overlayPurchaseTitle;
    case "overlay.poc.tavern_plan":
      return pocTextIdsV1.overlayTavernPlanTitle;
    case "overlay.poc.facility":
      return pocTextIdsV1.overlayFacilityTitle;
    case "overlay.poc.world_action":
      return pocTextIdsV1.overlayWorldActionTitle;
    case "overlay.poc.ledger":
      return pocTextIdsV1.overlayLedgerTitle;
    case "overlay.poc.relationship":
      return pocTextIdsV1.overlayRelationshipTitle;
    case "overlay.poc.run_summary":
      return pocTextIdsV1.overlayRunSummaryTitle;
  }
  const unsupportedOverlayId: never = overlayId;
  throw new TypeError(`ui.poc.overlay_unknown:${String(unsupportedOverlayId)}`);
}

/** The Story overlay ids: the save surface belongs to the default root. */
export type PocStoryOverlayIdV1 = Exclude<PocOverlayIdV1, "overlay.poc.save">;

export const pocStoryOverlayIdsV1 = Object.freeze([
  "overlay.poc.policy",
  "overlay.poc.inventory",
  "overlay.poc.purchase",
  "overlay.poc.tavern_plan",
  "overlay.poc.facility",
  "overlay.poc.world_action",
  "overlay.poc.ledger",
  "overlay.poc.relationship",
  "overlay.poc.run_summary",
] as const satisfies readonly PocStoryOverlayIdV1[]);

type PocChoicesDescriptorV1 = Extract<
  PocSemanticActionDescriptorV1,
  { readonly delivery: "choices" }
>;

type PocPurchaseDescriptorV1 = Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: "action.purchase" }
>;
type PocRunStartDescriptorV1 = Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: "action.run_start" }
>;
type PocLifePolicyDescriptorV1 = Extract<
  PocSemanticActionDescriptorV1,
  { readonly actionId: "action.choose_life_policy" }
>;

function uniqueEnabledPurchaseDescriptorV1(
  actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[],
): DeepReadonly<PocPurchaseDescriptorV1> | null {
  const matches = actions.filter(
    (candidate): candidate is DeepReadonly<PocPurchaseDescriptorV1> =>
      candidate.actionId === "action.purchase" &&
      candidate.delivery === "form" &&
      candidate.form.kind === "purchase" &&
      candidate.enabled,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function uniqueEnabledRunStartDescriptorV1(
  actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[],
): DeepReadonly<PocRunStartDescriptorV1> | null {
  const matches = actions.filter(
    (candidate): candidate is DeepReadonly<PocRunStartDescriptorV1> =>
      candidate.actionId === "action.run_start" &&
      candidate.delivery === "direct" &&
      candidate.directInvocation.actionId === "action.run_start" &&
      candidate.enabled,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function uniqueEnabledLifePolicyDescriptorV1(
  actions: readonly DeepReadonly<PocSemanticActionDescriptorV1>[],
): DeepReadonly<PocLifePolicyDescriptorV1> | null {
  const matches = actions.filter(
    (candidate): candidate is DeepReadonly<PocLifePolicyDescriptorV1> =>
      candidate.actionId === "action.choose_life_policy" &&
      candidate.delivery === "choices" &&
      candidate.options.length > 0 &&
      candidate.enabled,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function pocChoiceOverlayIdV1(
  descriptor: DeepReadonly<PocChoicesDescriptorV1>,
): PocStoryOverlayIdV1 | null {
  switch (descriptor.actionId) {
    case "action.choose_life_policy":
      return "overlay.poc.policy";
    case "action.facility_window":
      return "overlay.poc.facility";
    case "action.old_trade_road":
      return "overlay.poc.world_action";
    case "action.narrative_choose":
      return null;
  }
  const unsupportedDescriptor: never = descriptor;
  throw new TypeError(`PoC choice action is unsupported: ${String(unsupportedDescriptor)}`);
}

function PocCanonicalSemanticControlsV1(props: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
}): ReactElement {
  const { context, services } = props;
  const presentation = services.presentationRead;
  return (
    <div role="group" aria-label="语义操作" data-semantic-action-catalog="true">
      {context.publication.semantic.actions.flatMap((descriptor) => {
        const disabledReasons = descriptor.reasons.map((reason) => reason.code).join(",");
        const label = presentation.text(descriptor.textId).text;
        const commonProps = Object.freeze({
          disabled: !descriptor.enabled,
          "data-semantic-action-id": descriptor.actionId,
          "data-semantic-disabled-reasons": disabledReasons,
        });
        if (descriptor.delivery === "direct") {
          return [
            <Button
              key={descriptor.actionId}
              {...commonProps}
              aria-label={`语义目录：${label}`}
              onClick={() => void context.semantic.dispatch(descriptor.directInvocation)}
            >
              {label}
            </Button>,
          ];
        }
        if (descriptor.delivery === "form") {
          const overlayId =
            descriptor.form.kind === "purchase"
              ? ("overlay.poc.purchase" as const)
              : ("overlay.poc.tavern_plan" as const);
          return [
            <Button
              key={descriptor.actionId}
              {...commonProps}
              aria-label={`语义目录：${label}`}
              onClick={() =>
                context.intents.execute(Object.freeze({ kind: "overlay.open" as const, overlayId }))
              }
            >
              {label}
            </Button>,
          ];
        }
        const overlayId = pocChoiceOverlayIdV1(descriptor);
        if (overlayId !== null) {
          return [
            <Button
              key={descriptor.actionId}
              {...commonProps}
              aria-label={`语义目录：${label}`}
              onClick={() =>
                context.intents.execute(Object.freeze({ kind: "overlay.open" as const, overlayId }))
              }
            >
              {label}
            </Button>,
          ];
        }
        return descriptor.options.map((option) => {
          const optionLabel = presentation.text(option.textId).text;
          return (
            <Button
              key={`${descriptor.actionId}:${option.optionId}`}
              {...commonProps}
              aria-label={`语义目录：${optionLabel}`}
              onClick={() => void context.semantic.dispatch(option.invocation)}
            >
              {optionLabel}
            </Button>
          );
        });
      })}
    </div>
  );
}

interface PocInteractionSurfaceResolutionV1 {
  readonly surface: DeepReadonly<PocRuntimeSurfaceV1>;
  readonly spatialState: "enabled" | "disabled";
}

function findOnlyRuntimeSurfaceV1(
  publication: DeepReadonly<PocRuntimePresentationPublicationV1>,
  surfaceId: string,
): DeepReadonly<PocRuntimeSurfaceV1> | null {
  const matches = publication.view.interactionSurfaces.filter(
    (surface) => surface.surfaceId === surfaceId,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function resolveInteractionSurfaceV1(
  services: PocUiSlotServicesV1,
  publication: DeepReadonly<PocRuntimePresentationPublicationV1>,
  surfaceId: string,
): PocInteractionSurfaceResolutionV1 | null {
  const surface = findOnlyRuntimeSurfaceV1(publication, surfaceId);
  if (surface === null) return null;
  const validation = validateRuntimeInteractionSurfaceV1(surface, {
    revision: publication.revision,
    resolvedSurfaces: services.resolvedGame.sceneGraph.interactionSurfaces,
    runtimeSurfaces: publication.view.interactionSurfaces,
  });
  return Object.freeze({ surface: validation.surface, spatialState: validation.spatialState });
}

function findHitMapV1(
  services: PocUiSlotServicesV1,
  hitMapId: PocInteractionRendererViewV1["surface"]["hitMapId"],
): DeepReadonly<HitMapDescriptorV1> | null {
  if (hitMapId === null) return null;
  const matches = services.resolvedGame.sceneGraph.hitMaps.filter(
    (candidate) => candidate.hitMapId === hitMapId,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function PocResolvedInteractionRendererV1(props: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
  readonly session: InteractionSessionStoreV1;
  readonly controller: ReturnType<typeof createInteractionControllerV1>;
  readonly resolution: PocInteractionSurfaceResolutionV1;
  readonly hitMap: DeepReadonly<HitMapDescriptorV1> | null;
}): ReactElement {
  const InteractionRenderer = requireRendererV1(
    props.services,
    "scene_interaction",
    pocFixedRendererIdsV1.sceneInteraction,
  );
  return createElement(InteractionRenderer, {
    viewSlice: Object.freeze({
      surface: props.resolution.surface,
      hitMap: props.hitMap,
      spatialState: props.hitMap === null ? ("disabled" as const) : props.resolution.spatialState,
    }) satisfies DeepReadonly<PocInteractionRendererViewV1>,
    semantic: props.context.semantic,
    presentation: props.services.presentationRead,
    controller: props.controller,
    session: props.session,
    inputRouter: props.context.input,
  });
}

function PocAssetGatedInteractionRendererV1(props: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
  readonly session: InteractionSessionStoreV1;
  readonly controller: ReturnType<typeof createInteractionControllerV1>;
  readonly resolution: PocInteractionSurfaceResolutionV1;
  readonly hitMap: DeepReadonly<HitMapDescriptorV1>;
  readonly criticalLayerAssetId: AssetId;
  readonly staticFallbackAssetId: AssetId;
  readonly fallbackHitMapCompatibility: "compatible" | "incompatible";
}): ReactElement {
  const criticalLayer = usePresentationAssetV1(
    props.services.presentationRead,
    props.criticalLayerAssetId,
    "character_pose",
  );
  const staticFallback = usePresentationAssetV1(
    props.services.presentationRead,
    props.staticFallbackAssetId,
    "character_pose",
  );
  const compatibleVisual =
    criticalLayer.delivery === "runtime_image" ||
    (props.fallbackHitMapCompatibility === "compatible" &&
      staticFallback.delivery === "runtime_image");
  return (
    <PocResolvedInteractionRendererV1
      services={props.services}
      context={props.context}
      session={props.session}
      controller={props.controller}
      resolution={props.resolution}
      hitMap={compatibleVisual ? props.hitMap : null}
    />
  );
}

function PocInteractionLayerV1(props: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
  readonly session: InteractionSessionStoreV1;
  readonly controller: ReturnType<typeof createInteractionControllerV1>;
}): ReactElement | null {
  const publication = props.context.publication;
  const nodes = publication.view.interactionSurfaces.map((surface) => {
    const resolution = resolveInteractionSurfaceV1(props.services, publication, surface.surfaceId);
    if (resolution === null) return null;
    const hitMapId = resolution.surface.hitMapId;
    const hitMap = findHitMapV1(props.services, hitMapId);
    if (hitMapId === null || hitMap === null) {
      return (
        <PocResolvedInteractionRendererV1
          key={surface.surfaceId}
          services={props.services}
          context={props.context}
          session={props.session}
          controller={props.controller}
          resolution={resolution}
          hitMap={null}
        />
      );
    }
    const characters = publication.view.characters.filter(
      (character) => character.hitMapId === hitMapId,
    );
    const character = characters.length === 1 ? characters[0] : undefined;
    const criticalLayers = character?.appearance.filter(
      (layer) => layer.fallbackPolicy === "character_fallback",
    );
    const criticalLayer = criticalLayers?.length === 1 ? criticalLayers[0] : undefined;
    if (
      character === undefined ||
      criticalLayer === undefined ||
      character.staticFallbackAssetId === null
    ) {
      return (
        <PocResolvedInteractionRendererV1
          key={surface.surfaceId}
          services={props.services}
          context={props.context}
          session={props.session}
          controller={props.controller}
          resolution={resolution}
          hitMap={null}
        />
      );
    }
    return (
      <PocAssetGatedInteractionRendererV1
        key={surface.surfaceId}
        services={props.services}
        context={props.context}
        session={props.session}
        controller={props.controller}
        resolution={resolution}
        hitMap={hitMap}
        criticalLayerAssetId={criticalLayer.assetId}
        staticFallbackAssetId={character.staticFallbackAssetId}
        fallbackHitMapCompatibility={character.fallbackHitMapCompatibility}
      />
    );
  });
  return nodes.every((node) => node === null) ? null : <>{nodes}</>;
}

/**
 * Presentation lifecycle: the hash route and the composition overlay state
 * mirror into the Story UI state (the projector selects stage variants from
 * them), and the settled asset demand preloads through the registry. All
 * subscriptions release on unmount.
 */
function PocPresentationLifecycleV1(props: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
}): null {
  const { context, services } = props;
  // The composition surfaces are stable across renders; effects subscribe
  // once per composition lifetime, never per publication.
  const { overlays, updateStoryUiState } = context;
  useEffect(() => {
    if (typeof location === "undefined") return () => {};
    const router = createHashRouterV1({ location });
    const applyRoute = (): void => {
      const route = router.observe().route;
      updateStoryUiState((current) => {
        const state = current as PocPresentationUiStateV1;
        return state.route === route ? state : Object.freeze({ ...state, route });
      });
    };
    applyRoute();
    const unsubscribe = router.subscribe(applyRoute);
    return () => {
      unsubscribe();
      router.dispose();
    };
  }, [updateStoryUiState]);

  useEffect(() => {
    const applyOverlay = (): void => {
      const primaryId = overlays.getSnapshot().primaryId as PocOverlayIdV1 | null;
      updateStoryUiState((current) => {
        const state = current as PocPresentationUiStateV1;
        return state.primaryOverlayId === primaryId
          ? state
          : Object.freeze({ ...state, primaryOverlayId: primaryId });
      });
    };
    applyOverlay();
    return overlays.subscribe(applyOverlay);
  }, [overlays, updateStoryUiState]);

  useEffect(() => {
    services.preloadAssets(context.publication.requiredAssetIds);
  }, [services, context.publication.requiredAssetIds]);

  return null;
}

function createOverlayResolverV1(input: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
}): OverlayRendererResolverV1<PocStoryOverlayIdV1> {
  const { context, services } = input;
  const renderer = requireRendererV1(
    services,
    "workspace_overlay",
    pocFixedRendererIdsV1.workspaceOverlay,
  );
  return Object.freeze({
    resolve(overlayId: DeepReadonly<PocStoryOverlayIdV1>) {
      return Object.freeze({
        accessibleName: services.presentationRead.text(overlayTitleTextIdV1(overlayId)).text,
        content: createElement(renderer, {
          viewSlice: Object.freeze({
            overlayId,
            game: context.publication.view.game,
            actions: context.publication.semantic.actions,
          }),
          semantic: context.semantic,
          presentation: services.presentationRead,
          gameSymbols: pocGameSymbolRegistryV1,
        }),
      });
    },
  });
}

/** One interaction session/controller pair per composition lifetime. */
export function createPocUiSlotsV1(
  services: PocUiSlotServicesV1,
): DefaultGameRootSlotsV1<
  PocRuntimePresentationPublicationV1,
  PocSemanticGamePortV1,
  PocStoryOverlayIdV1
> {
  return {
    background: (context) => (
      <PocBackgroundSlotV1 services={services} context={context as PocSlotContextV1} />
    ),
    character: (context) => (
      <>
        {(context as PocSlotContextV1).publication.view.characters.map((character) => (
          <CharacterHostV1
            key={character.characterId}
            character={character}
            contributions={services.contributions as never}
            semantic={(context as PocSlotContextV1).semantic as never}
            presentation={services.presentationRead as never}
          />
        ))}
      </>
    ),
    sceneInteraction: (context) => (
      <PocSceneInteractionSlotV1 services={services} context={context as PocSlotContextV1} />
    ),
    hud: (context) => <PocHudSlotV1 services={services} context={context as PocSlotContextV1} />,
    narrative: (context) => (
      <PocNarrativeSlotV1 services={services} context={context as PocSlotContextV1} />
    ),
    systemMenuExtras: (context) => (
      <PocSystemMenuExtrasV1 services={services} context={context as PocSlotContextV1} />
    ),
    overlayResolver: (context) =>
      createOverlayResolverV1({ services, context: context as PocSlotContextV1 }),
  };
}

function PocBackgroundSlotV1(props: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
}): ReactElement {
  return (
    <>
      <PocPresentationLifecycleV1 services={props.services} context={props.context} />
      <StageSceneHostV1
        stage={props.context.publication.view.stage}
        contributions={props.services.contributions as never}
        semantic={props.context.semantic as never}
        presentation={props.services.presentationRead as never}
      />
    </>
  );
}

function PocSceneInteractionSlotV1(props: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
}): ReactElement | null {
  const { context, services } = props;
  const controller = useMemo(
    () =>
      createInteractionControllerV1({
        presentation: context.presentation,
        resolveSurface(publication, surfaceId) {
          return (
            resolveInteractionSurfaceV1(
              services,
              publication as DeepReadonly<PocRuntimePresentationPublicationV1>,
              surfaceId as string,
            )?.surface ?? null
          );
        },
        semantic: context.semantic,
        intents: context.intents,
        session: context.interactionSession,
        getReturnFocusId: (activation) =>
          interactionTargetControlIdV1(activation.surfaceId, activation.targetId),
      }),
    [context.presentation, context.semantic, context.intents, context.interactionSession, services],
  );

  // Stage-scene replacement dismisses any active spatial session.
  useEffect(() => {
    let previousStageSceneId = context.presentation.getSnapshot().view.stage.stageSceneId;
    return context.presentation.subscribe(() => {
      const nextStageSceneId = context.presentation.getSnapshot().view.stage.stageSceneId;
      if (nextStageSceneId === previousStageSceneId) return;
      previousStageSceneId = nextStageSceneId;
      if (context.interactionSession.getSnapshot().activeSurfaceId !== null) {
        context.interactionSession.cleanup("stage_scene_replaced");
      }
    });
  }, [context.presentation, context.interactionSession]);

  return (
    <PocInteractionLayerV1
      services={services}
      context={context}
      session={context.interactionSession}
      controller={controller}
    />
  );
}

function PocHudSlotV1(props: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
}): ReactElement {
  const HudRenderer = requireRendererV1(props.services, "hud", pocFixedRendererIdsV1.hud);
  return (
    <>
      <PocCanonicalSemanticControlsV1 services={props.services} context={props.context} />
      {createElement(HudRenderer, {
        viewSlice: props.context.publication.view.game.hud,
        semantic: props.context.semantic,
        presentation: props.services.presentationRead,
        gameSymbols: pocGameSymbolRegistryV1,
      })}
    </>
  );
}

function PocNarrativeSlotV1(props: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
}): ReactElement {
  const NarrativeRenderer = requireRendererV1(
    props.services,
    "narrative",
    pocFixedRendererIdsV1.narrative,
  );
  return createElement(NarrativeRenderer, {
    viewSlice: Object.freeze({
      narrative: props.context.publication.view.narrative,
      actions: props.context.publication.semantic.actions,
    }),
    semantic: props.context.semantic,
    presentation: props.services.presentationRead,
  });
}

function PocSystemMenuExtrasV1(props: {
  readonly services: PocUiSlotServicesV1;
  readonly context: PocSlotContextV1;
}): ReactElement {
  const { context, services } = props;
  const SystemRenderer = requireRendererV1(services, "system", pocFixedRendererIdsV1.system);
  const presentation = services.presentationRead;
  const actions = context.publication.semantic.actions;
  const runStartDescriptor = uniqueEnabledRunStartDescriptorV1(actions);
  const lifePolicyDescriptor = uniqueEnabledLifePolicyDescriptorV1(actions);
  const purchaseDescriptor = uniqueEnabledPurchaseDescriptorV1(actions);
  return (
    <>
      {createElement(SystemRenderer, {
        viewSlice: null,
        semantic: context.semantic,
        presentation,
      })}
      {runStartDescriptor === null ? null : (
        <Button onClick={() => void context.semantic.dispatch(runStartDescriptor.directInvocation)}>
          {presentation.text(runStartDescriptor.textId).text}
        </Button>
      )}
      {lifePolicyDescriptor === null ? null : (
        <Button
          onClick={() =>
            context.intents.execute(
              Object.freeze({
                kind: "overlay.open" as const,
                overlayId: "overlay.poc.policy" as const,
              }),
            )
          }
        >
          {presentation.text(lifePolicyDescriptor.textId).text}
        </Button>
      )}
      {purchaseDescriptor === null ? null : (
        <Button
          onClick={() =>
            context.intents.execute(
              Object.freeze({
                kind: "overlay.open" as const,
                overlayId: "overlay.poc.purchase" as const,
              }),
            )
          }
        >
          {presentation.text(purchaseDescriptor.textId).text}
        </Button>
      )}
    </>
  );
}

export const pocSettingsTextsV1 = Object.freeze({
  settingsTitle: "设置",
  settingsEmpty: (services: PocUiSlotServicesV1): string =>
    services.presentationRead.text(pocNoContentFilterOptionsTextIdV1).text,
  closeLabel: (services: PocUiSlotServicesV1): string =>
    services.presentationRead.text(pocTextIdsV1.controlCloseLabel).text,
});
