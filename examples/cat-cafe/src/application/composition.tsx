import type { AssetId, DeepReadonly, AudioIntentV1 } from "@sillymaker/base";
import { projectStageRenderTarget } from "@sillymaker/base/story";
import type {
  DefaultGameRootSlotsV1,
  DefineNarrativeSurfaceInputV1,
  DefineWholeCanvasSurfaceInputV1,
  GameUiProjectorV1,
  KeyboardActionMapV1,
  NarrativeSurfaceSelectionV1,
  AudioHostV1,
  RuntimeAssetLoaderV1,
  PointerActionMapV1,
  WholeCanvasSurfaceActionDispatchRequestV1,
  WholeCanvasSurfaceRendererPropsV1,
  WholeCanvasSurfaceResolveTargetRequestV1,
  WholeCanvasSurfaceSelectionV1,
} from "@sillymaker/ui";
import {
  createAssetRegistryV1,
  defineNarrativeSurfaceV1,
  defineWholeCanvasSurfaceV1,
  defineWorkspaceOverlayV1,
  GameAudioV1,
  systemInputActionIdsV1,
} from "@sillymaker/ui";
import type { PlayerProfileStoreV1 } from "@sillymaker/base/runtime";
import type { StartedWebGameApplicationV1, WebGameApplicationV1 } from "@sillymaker/web";
import { createWebAudioHostV1 } from "@sillymaker/web";
import { applicationBuildIdentityInputInternalV1 } from "@sillymaker/web/internal/application-build-identity";
import type { InstalledResolvedGameHmrV1 } from "@sillymaker/web/internal/application-hmr";
import {
  createWebGameApplicationRebootstrapStartOptionsInternalV1,
  createWebGameApplicationViteHotAdapterInternalV1,
  installWebGameApplicationHmrV1,
  resolveWebGameApplicationHmrProvenanceInternalV1,
  startWebGameApplicationForRebootstrapInternalV1,
} from "@sillymaker/web/internal/application-hmr";

import type {
  CatcafeActionDescriptorV1,
  CatcafeActionResultV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
} from "./semantic.ts";
import type { CatcafeApplicationInstanceV1, CatcafeExtensionsV1 } from "./core-definition.ts";
import { catcafeCoreApplicationDefinitionV1 } from "./core-definition.ts";
import type {
  CatcafeAssetRegistryV1,
  CatcafeSemanticPortV1,
  CatcafeSemanticPublicationV1,
} from "./ui-kit.ts";
export type {
  CatcafePresentationViewV1,
  CatcafeUiOverlayIdV1,
  CatcafeUiPublicationV1,
} from "./ui-kit.ts";
import type {
  CatcafePresentationViewV1,
  CatcafeUiOverlayIdV1,
  CatcafeUiPublicationV1,
} from "./ui-kit.ts";
import { CatcafeAlbumViewV1 } from "../game/features/album/index.tsx";
import { createCatcafeStageRenderersV1 } from "../game/features/stage/renderers.tsx";
import { CatcafeStageV1 } from "../game/features/stage/stage-view.tsx";
import { catcafeChromeForLocaleV1, catcafeSaveGuardForLocaleV1 } from "./labels.ts";
export {
  catcafeChromeForLocaleV1,
  catcafeRootLabelsV1,
  catcafeSaveGuardForLocaleV1,
  catcafeSaveOverlayLabelsV1,
} from "./labels.ts";
import type {
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeQueriesV1,
  CatcafeSimulationTypesV1,
} from "../game/simulation.ts";
import {
  catcafeAudioManifestV1,
  resolveCatcafeEffectAssetV1,
} from "../game/features/audio/index.ts";
import { catcafeStageContentCatalogV1, catcafeTextForLocaleV1 } from "../content/presentation.ts";
import { CatcafeHudV1, CatcafeNarrativeRendererV1, CatcafeSettingsV1 } from "./ui.tsx";
import { CatcafeEndingScreenV1 } from "../game/features/endings/ending-screen.tsx";

export const catcafeViewportCanvasV1 = Object.freeze({ width: 1280, height: 720 });

const projectorDefinitionV1: GameUiProjectorV1<
  CatcafeSemanticPublicationV1,
  null,
  Record<never, never>,
  CatcafePresentationViewV1,
  AssetId
> = {
  resolvedCatalog: null,
  initialUiState: Object.freeze({}),
  project: (input) => {
    const projection = projectStageRenderTarget(
      input.semantic.game.stage,
      catcafeStageContentCatalogV1,
    );
    return Object.freeze({
      view: Object.freeze({
        anchorEpoch: input.uiState.anchor.epoch,
        stageTarget: projection.target,
      }),
      requiredAssetIds: projection.target.requiredAssetIds,
    });
  },
};

export const catcafeUiProjectorV1 = Object.freeze(projectorDefinitionV1);

const noNarrativeChoiceReasonsV1: readonly string[] = Object.freeze([]);

type CatcafeWholeCanvasTargetIdV1 = "catcafe.ending";
type CatcafeWholeCanvasActionIdV1 = "cc.enter_postgame" | "cc.restart";

const catcafeWholeCanvasTargetIdV1: CatcafeWholeCanvasTargetIdV1 = "catcafe.ending";
const noWholeCanvasActionReasonsV1: readonly string[] = Object.freeze([]);
const emptyWholeCanvasActionPayloadV1 = Object.freeze({});
const catcafeWholeCanvasCatalogV1 = Object.freeze([
  Object.freeze({
    targetId: catcafeWholeCanvasTargetIdV1,
    contractRevision: 1 as const,
    placements: Object.freeze(["primary" as const]),
    actionIds: Object.freeze([
      "cc.enter_postgame" as const,
      "cc.restart" as const,
    ]),
    defaultActionId: "cc.enter_postgame" as const,
  }),
]);

function catcafeEndingFromParametersV1(parameters: unknown): string {
  if (
    parameters === null ||
    typeof parameters !== "object" ||
    Array.isArray(parameters) ||
    Object.keys(parameters).join("\u0000") !== "ending"
  ) {
    throw new TypeError("catcafe.whole_canvas_ending_invalid");
  }
  const ending = (parameters as { readonly ending?: unknown }).ending;
  if (
    ending !== "champion" &&
    ending !== "signboard" &&
    ending !== "adopted" &&
    ending !== "ordinary"
  ) {
    throw new TypeError("catcafe.whole_canvas_ending_invalid");
  }
  return ending;
}

/** Pure semantic selection for Cat Cafe's sole whole-canvas primary. */
export function projectCatcafeWholeCanvasSurfaceSelectionV1(
  publication: DeepReadonly<CatcafeSemanticPublicationV1>,
): WholeCanvasSurfaceSelectionV1<CatcafeWholeCanvasTargetIdV1> {
  const ending = publication.game.ending;
  if (ending === null) return Object.freeze({ primary: null });
  const admittedEnding = catcafeEndingFromParametersV1(Object.freeze({ ending }));
  return Object.freeze({
    primary: Object.freeze({
      targetId: catcafeWholeCanvasTargetIdV1,
      parameters: Object.freeze({ ending: admittedEnding }),
    }),
  });
}

const catcafeWholeCanvasSourceV1 = Object.freeze({
  kind: "publication" as const,
  selectPrimary: projectCatcafeWholeCanvasSurfaceSelectionV1,
});

function resolveCatcafeWholeCanvasTargetV1(
  request: WholeCanvasSurfaceResolveTargetRequestV1<
    CatcafeSemanticPublicationV1,
    CatcafeWholeCanvasTargetIdV1
  >,
) {
  if (
    request.placement !== "primary" ||
    request.target.targetId !== catcafeWholeCanvasTargetIdV1
  ) {
    throw new TypeError("catcafe.whole_canvas_target_invalid");
  }
  const ending = catcafeEndingFromParametersV1(request.target.parameters);
  if (request.publication.game.ending !== ending) {
    throw new TypeError("catcafe.whole_canvas_target_stale");
  }
  return Object.freeze({
    accessibleNameTextId: `text.cc.ending.${ending}`,
    view: Object.freeze({ ending }),
    actions: Object.freeze([
      Object.freeze({
        actionId: "cc.enter_postgame" as const,
        status: "enabled" as const,
        reasonTextIds: noWholeCanvasActionReasonsV1,
        intent: Object.freeze({
          kind: "owner" as const,
          payload: emptyWholeCanvasActionPayloadV1,
        }),
      }),
      Object.freeze({
        actionId: "cc.restart" as const,
        status: "enabled" as const,
        reasonTextIds: noWholeCanvasActionReasonsV1,
        intent: Object.freeze({
          kind: "owner" as const,
          payload: emptyWholeCanvasActionPayloadV1,
        }),
      }),
    ]),
  });
}

function createCatcafeWholeCanvasActionDispatcherV1(
  instance: CatcafeApplicationInstanceV1,
): (
  request: WholeCanvasSurfaceActionDispatchRequestV1<
    CatcafeWholeCanvasTargetIdV1,
    CatcafeWholeCanvasActionIdV1
  >,
) => Promise<unknown> {
  return async (request) => {
    if (
      request.placement !== "primary" ||
      request.primary.targetId !== catcafeWholeCanvasTargetIdV1 ||
      request.detail !== null
    ) {
      throw new TypeError("catcafe.whole_canvas_action_invalid");
    }
    catcafeEndingFromParametersV1(request.primary.parameters);
    switch (request.actionId) {
      case "cc.enter_postgame":
        return await instance.semantic.dispatch(
          Object.freeze({ kind: "invoke" as const, actionId: "cc.enter_postgame" }) as never,
        );
      case "cc.restart":
        return await instance.lifecycle.restart();
      default: {
        const exhaustive: never = request.actionId;
        throw new TypeError(`catcafe.whole_canvas_action_unknown:${String(exhaustive)}`);
      }
    }
  };
}

/** Pure Story projection consumed by the public Narrative definition. */
export function projectCatcafeNarrativeSurfaceSelectionV1(
  publication: DeepReadonly<CatcafeSemanticPublicationV1>,
): NarrativeSurfaceSelectionV1 {
  const narrative = publication.narrative;
  const choiceAvailability = narrative.choiceOptions === null ? null : Object.freeze(
    narrative.choiceOptions.map((option) => {
      if (!option.enabled || option.blockedBy !== null) {
        throw new TypeError("catcafe.narrative_choice_availability_inconsistent");
      }
      return Object.freeze({
        choiceId: option.choiceId,
        status: "enabled" as const,
        reasonTextIds: noNarrativeChoiceReasonsV1,
      });
    }),
  );
  return Object.freeze({
    pending: narrative.pending,
    history: narrative.history,
    choiceAvailability,
  });
}

/** The continuous audio intent comes from the game view; the host is created lazily (first user gesture unlocks playback). */
const selectCatcafeAudioIntentV1 = (publication: unknown): AudioIntentV1 =>
  (publication as { readonly game: { readonly audio: AudioIntentV1 } }).game.audio;

const createCatcafeAudioHostV1 = (): AudioHostV1 =>
  createWebAudioHostV1({
    manifest: catcafeAudioManifestV1,
    resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
  });

export function createCatcafeUiSlotsV1(input: {
  readonly instance: CatcafeApplicationInstanceV1;
  readonly playerProfile: PlayerProfileStoreV1;
  readonly registry: CatcafeAssetRegistryV1 | null;
}): DefaultGameRootSlotsV1<CatcafeUiPublicationV1, CatcafeSemanticPortV1, CatcafeUiOverlayIdV1> {
  const renderers = createCatcafeStageRenderersV1(input.registry);
  const slots: DefaultGameRootSlotsV1<
    CatcafeUiPublicationV1,
    CatcafeSemanticPortV1,
    CatcafeUiOverlayIdV1
  > = {
    background: (context) => (
      <CatcafeStageV1
        context={context}
        instance={input.instance}
        playerProfile={input.playerProfile}
        registry={input.registry}
        renderers={renderers}
      />
    ),
    hud: (context) => (
      <>
        <GameAudioV1
          ports={input.instance}
          createHost={createCatcafeAudioHostV1}
          selectIntent={selectCatcafeAudioIntentV1}
          resolveEffectAsset={resolveCatcafeEffectAssetV1}
          playerProfile={input.playerProfile}
        />
        <CatcafeHudV1
          publication={context.publication}
          semantic={context.semantic}
          playerProfile={input.playerProfile}
          instance={input.instance}
          registry={input.registry}
          openAlbum={() =>
            context.intents.execute(
              Object.freeze({ kind: "overlay.open" as const, overlayId: "overlay.catcafe.album" }),
            )}
        />
      </>
    ),
    settingsSections: () => [
      <CatcafeSettingsV1 key="catcafe-settings" playerProfile={input.playerProfile} />,
    ],
    overlayResolver: () =>
      Object.freeze({
        resolve: (overlayId: DeepReadonly<CatcafeUiOverlayIdV1>) =>
          overlayId === "overlay.catcafe.album"
            ? Object.freeze({
              accessibleName: catcafeTextForLocaleV1(
                input.playerProfile.current().preferences.locale,
                "text.cc.album.title",
              ),
              content: (
                <CatcafeAlbumViewV1
                  playerProfile={input.playerProfile}
                  registry={input.registry}
                />
              ),
            })
            : null,
      }),
  };
  return Object.freeze(slots);
}

export const catcafeKeyboardMapV1: KeyboardActionMapV1 = Object.freeze({
  Enter: systemInputActionIdsV1.narrativeAdvance,
  Space: systemInputActionIdsV1.narrativeAdvance,
});

/** VN convention: right-click = back/close (overlays, system panels); suppress the system menu on the stage. */
export const catcafePointerMapV1: PointerActionMapV1 = Object.freeze({
  secondary: systemInputActionIdsV1.cancel,
});

export const catcafeGameApplicationV1: WebGameApplicationV1<
  unknown,
  unknown,
  CatcafeSimulationTypesV1,
  CatcafeQueriesV1,
  CatcafeGameViewV1,
  CatcafeNarrativeViewV1,
  CatcafeActionDescriptorV1,
  CatcafeInvocationV1,
  CatcafePreviewV1,
  CatcafeActionResultV1,
  null,
  Record<never, never>,
  CatcafePresentationViewV1,
  AssetId,
  CatcafeUiOverlayIdV1
> = Object.freeze({
  applicationId: "example-cat-cafe",
  accessibleName: "雨巷猫舍",
  viewport: Object.freeze({
    canvas: catcafeViewportCanvasV1,
    fallbackSize: Object.freeze({ width: 1280, height: 720 }),
    // Scale up proportionally to fill the window (fit scaling keeps the aspect ratio, letterboxing as needed).
    maxScale: 4,
  }),
  core: catcafeCoreApplicationDefinitionV1,
  ...(applicationBuildIdentityInputInternalV1 === undefined
    ? {}
    : { buildIdentityInput: applicationBuildIdentityInputInternalV1 }),
  ui: ({
    instance,
    playerProfile,
    assetLoader,
    reportFailure,
  }: {
    readonly instance: CatcafeApplicationInstanceV1;
    readonly playerProfile: PlayerProfileStoreV1;
    readonly assetLoader?: RuntimeAssetLoaderV1;
    reportFailure?(code: string, error: unknown): void;
  }) => {
    // Asset registry: the resolved manifest arrives through the extensions facet (observe, never take over).
    const manifest = (instance.extensions as CatcafeExtensionsV1 | undefined)?.assets;
    const registry: CatcafeAssetRegistryV1 | null =
      manifest !== undefined && assetLoader !== undefined
        ? (createAssetRegistryV1(manifest, assetLoader, (diagnostic) => {
          reportFailure?.("catcafe.asset_fault", diagnostic);
        }) as CatcafeAssetRegistryV1)
        : null;
    const endingRendererV1 = (
      frame: WholeCanvasSurfaceRendererPropsV1<
        CatcafeWholeCanvasTargetIdV1,
        CatcafeWholeCanvasActionIdV1
      >,
    ) => <CatcafeEndingScreenV1 frame={frame} registry={registry} />;
    const wholeCanvas = defineWholeCanvasSurfaceV1<
      CatcafeSemanticPublicationV1,
      CatcafeWholeCanvasTargetIdV1,
      CatcafeWholeCanvasActionIdV1
    >(
      Object.freeze(
        {
          catalog: catcafeWholeCanvasCatalogV1,
          source: catcafeWholeCanvasSourceV1,
          resolveTarget: resolveCatcafeWholeCanvasTargetV1,
          dispatchAction: createCatcafeWholeCanvasActionDispatcherV1(instance),
          renderer: endingRendererV1,
          prepareTarget: null,
          resolveText: catcafeTextForLocaleV1,
        } satisfies DefineWholeCanvasSurfaceInputV1<
          CatcafeSemanticPublicationV1,
          CatcafeWholeCanvasTargetIdV1,
          CatcafeWholeCanvasActionIdV1
        >,
      ),
    );
    return Object.freeze({
      dispose: () => registry?.dispose(),
      titleScreen: Object.freeze({
        title: catcafeTextForLocaleV1(
          playerProfile.current().preferences.locale,
          "text.cc.app.name",
        ),
        backgroundUrl: "assets/cc-bg-title.webp",
        splash: Object.freeze({
          lines: playerProfile.current().preferences.locale === "en"
            ? Object.freeze([
              "Rainy Alley Cat Cafe",
              "A SillyMaker game",
            ])
            : Object.freeze([
              "雨巷猫舍",
              "一款由 SillyMaker 驱动的游戏",
            ]),
        }),
      }),
      projector: catcafeUiProjectorV1,
      narrative: defineNarrativeSurfaceV1<CatcafeSemanticPublicationV1>(
        Object.freeze(
          {
            selectNarrative: projectCatcafeNarrativeSurfaceSelectionV1,
            dispatchResolution: (request) =>
              instance.semantic.dispatch(
                Object.freeze({
                  kind: "resolve" as const,
                  expectedOccurrenceId: request.expectedOccurrenceId,
                  resolution: request.resolution,
                }) as never,
              ),
            renderer: CatcafeNarrativeRendererV1,
            resolveText: catcafeTextForLocaleV1,
            replayCurrentVoice: null,
            // The cat-cafe narrative declares no hold, so it binds no time
            // dispatcher.
            dispatchTime: null,
          } satisfies DefineNarrativeSurfaceInputV1<CatcafeSemanticPublicationV1>,
        ),
      ),
      wholeCanvas,
      overlayDefinitions: Object.freeze([
        defineWorkspaceOverlayV1({ id: "overlay.catcafe.album", contractRevision: 1 }),
      ]),
      slots: createCatcafeUiSlotsV1({ instance, playerProfile, registry }),
      ...(() => {
        const locale = playerProfile.current().preferences.locale;
        const chrome = catcafeChromeForLocaleV1(locale);
        return {
          labels: chrome.labels,
          saveLabels: chrome.saveLabels,
          saveGuard: catcafeSaveGuardForLocaleV1(locale),
        };
      })(),
      input: Object.freeze({ keyboard: catcafeKeyboardMapV1, pointer: catcafePointerMapV1 }),
      loadDevDockContributions: () =>
        import("./dev-dock.tsx").then((module) =>
          module.createCatcafeDevDockContributionsV1({ instance, playerProfile, registry })
        ),
    });
  },
});

export interface CatcafeApplicationHmrModuleV1 {
  readonly catcafeGameApplicationV1: typeof catcafeGameApplicationV1;
  installCatcafeGameApplicationHmrV1(
    started: StartedWebGameApplicationV1,
    options?: InstallCatcafeGameApplicationHmrOptionsV1,
  ): InstalledResolvedGameHmrV1 | undefined;
}

export interface InstallCatcafeGameApplicationHmrOptionsV1 {
  /** The maintained Browser entry supplies its existing root to every successor. */
  readonly rootElement?: HTMLElement;
}

function resolveCatcafeApplicationV1(
  module: CatcafeApplicationHmrModuleV1,
): typeof catcafeGameApplicationV1 {
  return module.catcafeGameApplicationV1;
}

/** Install Cat Cafe's thin Story-owned literal Vite boundary over the neutral Web coordinator. */
export function installCatcafeGameApplicationHmrV1(
  started: StartedWebGameApplicationV1,
  options: InstallCatcafeGameApplicationHmrOptionsV1 = {},
): InstalledResolvedGameHmrV1 | undefined {
  if (import.meta.hot === undefined) return undefined;
  const rootElement = options.rootElement ?? document.querySelector("#root");
  if (!(rootElement instanceof HTMLElement)) {
    throw new TypeError("catcafe.hmr_application_root_missing");
  }
  const hot = createWebGameApplicationViteHotAdapterInternalV1({
    currentApplication: catcafeGameApplicationV1,
    currentProvenance: started.provenance,
    applicationFromModule: resolveCatcafeApplicationV1,
    resolveApplicationProvenance: resolveWebGameApplicationHmrProvenanceInternalV1,
    registration: Object.freeze({
      accept(handler: (module: CatcafeApplicationHmrModuleV1 | undefined) => void): void {
        if (import.meta.hot === undefined) {
          throw new TypeError("catcafe.hmr_hot_context_unavailable");
        }
        import.meta.hot.accept((module) => {
          handler(module as CatcafeApplicationHmrModuleV1 | undefined);
        });
      },
      invalidate(message?: string): void {
        if (import.meta.hot === undefined) {
          throw new TypeError("catcafe.hmr_hot_context_unavailable");
        }
        import.meta.hot.invalidate(message);
      },
    }),
    r3InvalidationMessage: "catcafe.hmr_application_identity_changed",
  });

  return installWebGameApplicationHmrV1<CatcafeApplicationHmrModuleV1>({
    started,
    hot,
    resolveAcceptedProvenance: (module) =>
      resolveWebGameApplicationHmrProvenanceInternalV1(module.catcafeGameApplicationV1),
    startSuccessor: ({
      module,
      started: predecessor,
      handoff,
      onRebootstrapStartFailureInternal,
    }) =>
      startWebGameApplicationForRebootstrapInternalV1(
        module.catcafeGameApplicationV1,
        createWebGameApplicationRebootstrapStartOptionsInternalV1({
          predecessor,
          rootElement,
          handoff,
          onRebootstrapStartFailureInternal,
        }),
      ),
    installNextBoundary: ({ module, started: successor }) => {
      const nextBoundary = module.installCatcafeGameApplicationHmrV1(successor, { rootElement });
      if (nextBoundary === undefined) {
        throw new TypeError("catcafe.hmr_next_boundary_unavailable");
      }
      return nextBoundary;
    },
  });
}
