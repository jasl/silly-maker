// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type { GameHostV1, RuntimeCapabilitiesV1, RuntimeCapabilityPortV1 } from "@sillymaker/base";
import type {
  CoreGameApplicationDefinitionV1,
  CoreGameApplicationInstanceV1,
} from "@sillymaker/base/runtime";
import type { GameSimulationTypeMapV1 } from "@sillymaker/base";
import { createRuntimeCapabilityPortV1 } from "@sillymaker/base/runtime";
import {
  createCoreGameApplicationInstanceV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import type {
  DefaultGameRootSlotsV1,
  DefaultGameRootLabelsV1,
  GameShellViewportOptionsV1,
  GameUiProjectorV1,
  RuntimePresentationPublicationV1,
  RuntimeAssetLoaderV1,
  SaveOverlayLabelsV1,
} from "@sillymaker/ui";
import type { DevDockContributionSetV1 } from "@sillymaker/ui/debug";
import { DefaultGameRootV1, createGameUiCompositionV1 } from "@sillymaker/ui";
import type { ContentPreferencePortV1, SemanticPublicationV1 } from "@sillymaker/base";
import type { RuntimeSessionStatusV1 } from "@sillymaker/base";

import { createBrowserImageLoaderV1 } from "../assets/create-browser-image-loader.js";
import { installBrowserAutomationBridgeV1 } from "../automation/browser-automation-bridge.js";
import type { InstalledBrowserAutomationBridgeV1 } from "../automation/browser-automation-bridge.js";
import { parseCapabilityRequestV1 } from "../capabilities/parse-capability-request.js";
import { createWebHostV1 } from "../host/create-web-host.js";
import { mountGameApplicationV1 } from "./mount-game-application.js";
import type { MountedGameApplicationV1 } from "./mount-game-application.js";
import { createPlayerSaveUiPortV1 } from "./create-player-ui-ports.js";

type WebSemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor> = SemanticPublicationV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  RuntimeSessionStatusV1
>;

/**
 * The per-instance UI wiring a Story returns from `ui()`: projector,
 * overlays, labels, and optional slot contributions. No React Root, no
 * Session/Persistence/Diagnostics wiring.
 */
export interface WebGameUiDefinitionV1<
  TSemanticPublication,
  TResolvedCatalog,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
  TSemantic,
> {
  readonly projector: GameUiProjectorV1<
    TSemanticPublication,
    TResolvedCatalog,
    TStoryUiState,
    TView,
    TAssetId
  >;
  readonly overlayIds?: readonly TOverlayId[];
  readonly contentPreference?: ContentPreferencePortV1;
  readonly slots?: DefaultGameRootSlotsV1<
    RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>,
    TSemantic,
    TOverlayId
  >;
  readonly labels?: Partial<DefaultGameRootLabelsV1>;
  readonly saveLabels?: SaveOverlayLabelsV1;
  readonly devDockContributions?: DevDockContributionSetV1;
}

export interface WebGameApplicationV1<
  TSimulationFacet,
  TPresentationFacet,
  TTypes extends GameSimulationTypeMapV1,
  TQueries,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TResolvedCatalog,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
> {
  readonly applicationId: string;
  readonly accessibleName: string;
  readonly viewport: GameShellViewportOptionsV1;
  readonly core: CoreGameApplicationDefinitionV1<
    TSimulationFacet,
    TPresentationFacet,
    TTypes,
    TQueries,
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult
  >;
  readonly buildIdentityInput?: Parameters<typeof resolveCoreGameApplicationV1>[1] extends
    { readonly buildIdentityInput?: infer TIdentity } | undefined
    ? TIdentity
    : never;
  ui(input: {
    readonly instance: CoreGameApplicationInstanceV1<
      TTypes,
      TGameView,
      TNarrativeView,
      TActionDescriptor,
      TInvocation,
      TPreview,
      TResult
    >;
    readonly assetLoader: RuntimeAssetLoaderV1;
    reportFailure(code: string, error: unknown): void;
  }): WebGameUiDefinitionV1<
    WebSemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor>,
    TResolvedCatalog,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId,
    CoreGameApplicationInstanceV1<
      TTypes,
      TGameView,
      TNarrativeView,
      TActionDescriptor,
      TInvocation,
      TPreview,
      TResult
    >["semantic"]
  >;
}

export interface StartWebGameApplicationOptionsV1 {
  readonly rootElement?: HTMLElement;
  readonly host?: GameHostV1;
  readonly databaseName?: string;
  readonly capabilitySearch?: string;
  /** Register the pagehide teardown listener; disable in tests. */
  readonly registerPageLifecycle?: boolean;
}

export interface StartedWebGameApplicationV1 {
  readonly applicationId: string;
  isDisposed(): boolean;
  dispose(): Promise<void>;
}

function sessionCapabilityStateV1(search: string): RuntimeCapabilitiesV1 {
  const parsed = parseCapabilityRequestV1(search);
  const requested = new Set(parsed.kind === "accepted" ? parsed.requested : []);
  return Object.freeze({
    debugTools: requested.has("debug_tools"),
    cheats: requested.has("cheats"),
    automationBridge: requested.has("automation_bridge"),
  });
}

/**
 * Boots a complete browser application from one Story application
 * declaration: web Host, core application instance, UI composition, default
 * GameRoot, capability parsing, automation bridge, mount, and page-lifecycle
 * teardown. Disposal revokes listeners, portals, automation generations, and
 * the persistence lease.
 */
export async function startWebGameApplicationV1<
  TSimulationFacet,
  TPresentationFacet,
  TTypes extends GameSimulationTypeMapV1,
  TQueries,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
  TResolvedCatalog,
  TStoryUiState,
  TView,
  TAssetId,
  TOverlayId extends string,
>(
  application: WebGameApplicationV1<
    TSimulationFacet,
    TPresentationFacet,
    TTypes,
    TQueries,
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult,
    TResolvedCatalog,
    TStoryUiState,
    TView,
    TAssetId,
    TOverlayId
  >,
  options: StartWebGameApplicationOptionsV1 = {},
): Promise<StartedWebGameApplicationV1> {
  const rootElement =
    options.rootElement ??
    (typeof document === "undefined" ? null : document.querySelector("#root"));
  if (!(rootElement instanceof HTMLElement)) {
    throw new TypeError("web.application_root_missing");
  }

  const host =
    options.host ??
    createWebHostV1({
      databaseName: options.databaseName ?? `sillymaker.${application.applicationId}`,
    });
  const reportFailure = (code: string, error: unknown): void => {
    host.log.write("warn", code, {
      message: error instanceof Error ? error.message : String(error),
    });
  };

  const capabilitySearch =
    options.capabilitySearch ?? (typeof location === "undefined" ? "" : location.search);
  const capabilities: RuntimeCapabilityPortV1 = createRuntimeCapabilityPortV1({
    initialState: sessionCapabilityStateV1(capabilitySearch),
    persist: async () => Object.freeze({ kind: "committed" as const }),
  });

  const resolved = resolveCoreGameApplicationV1(
    application.core,
    application.buildIdentityInput === undefined
      ? {}
      : { buildIdentityInput: application.buildIdentityInput },
  );
  if (resolved.kind === "failed") {
    throw new TypeError(`web.application_resolution_failed:${resolved.failure.code}`);
  }

  const instance = await createCoreGameApplicationInstanceV1(resolved.application, {
    host: Object.freeze({
      entropy: host.bootstrapEntropy,
      records: host.records,
      now: () => host.metadataClock.now(),
      ownerId: `owner.sillymaker.web.${application.applicationId}` as never,
      nextHandoffRequestId: () =>
        `handoff.${application.applicationId}.${host.bootstrapEntropy.nextUuidV4()}`,
    }),
    capabilities: { debugTools: capabilities.state.getCurrent().debugTools },
  });

  let automation: InstalledBrowserAutomationBridgeV1 | undefined;
  let mounted: MountedGameApplicationV1 | undefined;
  let composition:
    | ReturnType<
        typeof createGameUiCompositionV1<
          WebSemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor>,
          TResolvedCatalog,
          TStoryUiState,
          TView,
          TAssetId,
          TOverlayId
        >
      >
    | undefined;
  let disposed = false;
  let removePageLifecycle: (() => void) | undefined;

  const dispose = async (): Promise<void> => {
    if (disposed) return;
    disposed = true;
    removePageLifecycle?.();
    try {
      mounted?.unmount();
    } finally {
      composition?.dispose();
      automation?.dispose();
      await instance.dispose();
    }
  };

  try {
    const uiDefinition = application.ui({
      instance,
      assetLoader: createBrowserImageLoaderV1({
        resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
        createImage: () => new Image(),
      }),
      reportFailure,
    });

    composition = createGameUiCompositionV1({
      semantic: instance.semantic,
      projector: uiDefinition.projector,
      anchor: Object.freeze({
        current: () => instance.presentationAnchor(),
        subscribe: (listener: () => void) => instance.subscribePresentationAnchor(() => listener()),
      }),
      ...(uiDefinition.contentPreference === undefined
        ? {}
        : { contentPreference: uiDefinition.contentPreference }),
      ...(uiDefinition.overlayIds === undefined ? {} : { overlayIds: uiDefinition.overlayIds }),
      reportFailure: (failure) => reportFailure(failure.code, new Error(failure.summary)),
    });

    automation = installBrowserAutomationBridgeV1({
      semantic: instance.semantic,
      capabilities,
    });

    const saveUi =
      uiDefinition.saveLabels === undefined
        ? undefined
        : Object.freeze({
            port: createPlayerSaveUiPortV1({
              files: host.files,
              persistence: instance.persistence,
            }),
            labels: uiDefinition.saveLabels,
          });

    const rootNode: ReactElement = (
      <DefaultGameRootV1
        composition={composition}
        semantic={instance.semantic}
        accessibleName={application.accessibleName}
        applicationId={application.applicationId}
        viewport={application.viewport}
        capabilities={capabilities}
        {...(saveUi === undefined ? {} : { saveUi })}
        {...(uiDefinition.labels === undefined ? {} : { labels: uiDefinition.labels })}
        {...(uiDefinition.slots === undefined ? {} : { slots: uiDefinition.slots })}
        {...(uiDefinition.devDockContributions === undefined
          ? {}
          : { devDockContributions: uiDefinition.devDockContributions })}
      />
    );
    mounted = mountGameApplicationV1(rootElement, rootNode);

    if (
      options.registerPageLifecycle !== false &&
      typeof globalThis.addEventListener === "function"
    ) {
      const onPageHide = (): void => {
        void dispose();
      };
      globalThis.addEventListener("pagehide", onPageHide, { once: true });
      removePageLifecycle = () => globalThis.removeEventListener("pagehide", onPageHide);
    }
  } catch (error) {
    await dispose();
    throw error;
  }

  return Object.freeze({
    applicationId: application.applicationId,
    isDisposed: () => disposed,
    dispose,
  });
}
