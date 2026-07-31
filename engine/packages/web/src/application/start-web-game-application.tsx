// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type { BuildProvenanceV1, DeepReadonly, GameHostV1 } from "@sillymaker/base";
import { digestCanonical } from "@sillymaker/base";
import type {
  CoreAutosavePolicyV1,
  CoreGameApplicationDefinitionV1,
  CoreGameApplicationInstanceV1,
} from "@sillymaker/base/runtime";
import type { GameSimulationTypeMapV1 } from "@sillymaker/base";
import type {
  PersistenceRebootstrapDisposalV1,
  PlayerProfileStoreV1,
} from "@sillymaker/base/runtime";
import {
  createCoreGameApplicationInstanceV1,
  createPlayerProfileStoreV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import type {
  DefaultGameRootSlotsV1,
  DefaultGameRootLabelsV1,
  GamepadActionMapV1,
  GameShellViewportOptionsV1,
  GameUiProjectorV1,
  KeyboardActionMapV1,
  NativeBehaviorResetConfigV1,
  RuntimePresentationPublicationV1,
  RuntimeAssetLoaderV1,
  SaveOverlayLabelsV1,
  SystemDialogCustomSavesV1,
} from "@sillymaker/ui";
import type { DevDockContributionSetV1, DevDockOpenStateV1 } from "@sillymaker/ui/debug";
import {
  DefaultGameRootV1,
  createGameUiCompositionV1,
  installNativeBehaviorResetV1,
} from "@sillymaker/ui";
import type { ContentPreferencePortV1, SemanticPublicationV1 } from "@sillymaker/base";
import type { RuntimeSessionStatusV1 } from "@sillymaker/base";

import { createBrowserImageLoaderV1 } from "../assets/create-browser-image-loader.ts";
import { createRuntimeCapabilitySessionOverlayV1 } from "../capabilities/runtime-capability-session-overlay.ts";
import type { RuntimeCapabilitySessionOverlayV1 } from "../capabilities/runtime-capability-session-overlay.ts";
import { createWebCapabilityPreferencesV1 } from "../capabilities/web-capability-preferences.ts";
import { installPointerAdapterV1 } from "../input/install-pointer-adapter.ts";
import { installBrowserAutomationBridgeV1 } from "../automation/browser-automation-bridge.ts";
import type { InstalledBrowserAutomationBridgeV1 } from "../automation/browser-automation-bridge.ts";
import { parseCapabilityRequestV1 } from "../capabilities/parse-capability-request.ts";
import { createWebHostV1 } from "../host/create-web-host.ts";
import { createHttpHostRecordStoreV1 } from "../host/http-record-store.ts";
import { mountGameApplicationV1 } from "./mount-game-application.tsx";
import type { MountedGameApplicationV1 } from "./mount-game-application.tsx";
import { createPlayerSaveSurfacesV1 } from "./create-player-save-surfaces.ts";

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
  /** Cue IDs the presentation intent router accepts for play_cue. */
  readonly cueIds?: readonly string[];
  readonly contentPreference?: ContentPreferencePortV1;
  readonly slots?: DefaultGameRootSlotsV1<
    RuntimePresentationPublicationV1<TSemanticPublication, TView, TAssetId>,
    TSemantic,
    TOverlayId
  >;
  readonly labels?: Partial<DefaultGameRootLabelsV1>;
  readonly saveLabels?: SaveOverlayLabelsV1;
  /** Hides the default floating system menu (custom shells own the entries). */
  readonly hideSystemMenu?: boolean;
  /** Story safepoint over the live publication (see SaveOverlayGuardV1). */
  readonly saveGuard?: (publication: unknown) => { allowed: boolean; reasonText?: string };
  /**
   * Story Save renderer hosted by the existing System modal authority.
   * Mutually exclusive with `saveLabels` / `saveGuard`.
   */
  readonly customSaves?: SystemDialogCustomSavesV1;
  /** Typed Story tooling panels with read-only / cheat authority. */
  readonly devDockContributions?: DevDockContributionSetV1;
  /** Shows the engine title screen (New game / Continue|Load / Settings). */
  readonly titleScreen?: {
    readonly title: string;
    readonly backgroundUrl?: string;
    readonly splash?: { readonly lines: readonly string[]; readonly durationMs?: number };
    /** After restart on New game — Story-specific boot (see DefaultGameRoot). */
    beginNewGame?(semantic: unknown): void | Promise<unknown>;
  };
  /**
   * Capability-gated lazy DevDock contributions: tooling UI loads on
   * demand and never enters the player bundle.
   */
  readonly loadDevDockContributions?: () => Promise<DevDockContributionSetV1>;
  /** Optional keyboard/gamepad action maps installed by the root. */
  readonly inputMaps?: {
    readonly keyboard?: KeyboardActionMapV1;
    readonly gamepad?: GamepadActionMapV1;
  };
  /** Install the pointer adapter on the application root element. */
  readonly pointer?: boolean;
  /**
   * Game-shell native-behavior reset: suppress the browser context menu and
   * text selection document-wide (editable controls and `data-native-menu` /
   * `data-native-text` subtrees keep native behavior). Semantic right-click
   * actions remain exclusively routed through the InputRouter.
   */
  readonly nativeBehaviorReset?: NativeBehaviorResetConfigV1;
  /** Spatial interaction surface IDs the intent router accepts. */
  readonly interactionSurfaceIds?: readonly string[];
  /** Optional live stage label (current scene name) for the shell main region. */
  resolveStageAccessibleName?(publication: unknown): string;
  /**
   * Optional DebugBundle UI-context reader factory. The composer binds the
   * returned reader to the instance after the UI composition exists,
   * handing over the live composition read surfaces and DevDock state.
   */
  readonly debugUiContext?: (input: {
    readonly devDockOpenState: () => DevDockOpenStateV1;
    readonly presentation: { getSnapshot(): unknown };
    readonly overlaySession: {
      getSnapshot(): { readonly primaryId: string | null; readonly detailIds: readonly string[] };
    };
    readonly systemDialogSession: { getSnapshot(): { readonly active: string | null } };
  }) => () => unknown;
  /** Releases Story-owned UI resources (asset registries, caches). */
  dispose?(): void;
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
  /**
   * The application's autosave/checkpoint policy. Defaults to a debounced
   * policy so long dialogues never write IndexedDB on every line; explicit
   * slot saves are always allowed regardless.
   */
  readonly autosave?: CoreAutosavePolicyV1;
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
    /** The player profile (Seen registry, playback preferences): Host data
     * outside every Game Save. */
    readonly playerProfile: PlayerProfileStoreV1;
    /** Host file/download port for Story-facing export surfaces. */
    readonly files: GameHostV1["files"];
    /** The live capability session (persisted overlay + page request). */
    readonly capabilities: RuntimeCapabilitySessionOverlayV1;
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
  /** Injectable for tests; defaults to the browser image loader. */
  readonly assetLoader?: RuntimeAssetLoaderV1;
  readonly databaseName?: string;
  readonly capabilitySearch?: string;
  /** Register the pagehide teardown listener; disable in tests. */
  readonly registerPageLifecycle?: boolean;
  /** Host-level autosave override; wins over the application's policy. */
  readonly autosave?: CoreAutosavePolicyV1;
  /** Dev rebootstrap: adopt a predecessor's persistence handoff. */
  readonly rebootstrapDisposition?: DeepReadonly<PersistenceRebootstrapDisposalV1>;
}

/**
 * The browser default: committed Snapshots stay saveable at any time, but
 * persistence flushes after a short quiet period (or every N commands as a
 * backstop), and the pagehide teardown flushes whatever is still pending.
 */
export const defaultWebAutosavePolicyV1: CoreAutosavePolicyV1 = Object.freeze({
  mode: "debounced",
  delayMs: 800,
  checkpointEveryCommands: 20,
});

export interface StartedWebGameApplicationV1 {
  readonly applicationId: string;
  /** The Host this application runs on; HMR successors reuse it. */
  readonly host: GameHostV1;
  /** Full build provenance for HMR identity comparison. */
  readonly provenance: DeepReadonly<BuildProvenanceV1>;
  readonly capabilitySearch: string;
  isDisposed(): boolean;
  dispose(): Promise<void>;
  /** Fences the session for a dev rebootstrap without releasing anything. */
  invalidateForHmr(): void;
  /**
   * Tears the application down for a dev rebootstrap and returns the
   * persistence handoff disposition for the successor.
   */
  disposeForRebootstrap(): Promise<DeepReadonly<PersistenceRebootstrapDisposalV1>>;
}

function appBuildIdV1(buildIdentityInput: unknown): ReturnType<typeof digestCanonical> | null {
  if (
    buildIdentityInput === null ||
    typeof buildIdentityInput !== "object" ||
    !Object.hasOwn(buildIdentityInput, "application")
  ) {
    return null;
  }
  return digestCanonical(
    "sillymaker:application:v1",
    (buildIdentityInput as { readonly application: unknown }).application,
  );
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

  // The default composer owns the engine theme baseline. Loading it here
  // (not at module scope) keeps custom Roots on their own style composition.
  await import("@sillymaker/ui/styles.css");

  // Desktop channel: a trusted local save server marks pages it serves with
  // `?records=local` (browser flows) or an injected global (the desktop
  // webview shell); persistence then goes through the HTTP record store to
  // a real save directory instead of per-origin IndexedDB.
  const wantsLocalRecords =
    (typeof location !== "undefined" &&
      new URLSearchParams(location.search).get("records") === "local") ||
    Reflect.get(globalThis, "__SILLYMAKER_RECORDS__") === "local";
  const host =
    options.host ??
    (wantsLocalRecords
      ? createWebHostV1({
          records: createHttpHostRecordStoreV1({ baseUrl: "/sillymaker/records" }),
        })
      : createWebHostV1({
          databaseName: options.databaseName ?? `sillymaker.${application.applicationId}`,
        }));
  const reportFailure = (code: string, error: unknown): void => {
    host.log.write("warn", code, {
      message: error instanceof Error ? error.message : String(error),
    });
  };

  const capabilitySearch =
    options.capabilitySearch ?? (typeof location === "undefined" ? "" : location.search);
  const capabilityRequest = parseCapabilityRequestV1(capabilitySearch);
  const persistedCapabilities = await createWebCapabilityPreferencesV1(host);
  // The live capability session: page-local requests overlay the persisted
  // preferences (DevDock persists changes through the Host records).
  const capabilities = createRuntimeCapabilitySessionOverlayV1(
    persistedCapabilities,
    capabilityRequest.kind === "accepted" ? capabilityRequest.requested : Object.freeze([]),
  );

  const resolved = resolveCoreGameApplicationV1(
    application.core,
    application.buildIdentityInput === undefined
      ? {}
      : { buildIdentityInput: application.buildIdentityInput },
  );
  if (resolved.kind === "failed") {
    throw new TypeError(`web.application_resolution_failed:${resolved.failure.code}`);
  }

  const applicationBuildId = appBuildIdV1(application.buildIdentityInput);
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
    capabilityState: capabilities.state,
    autosave: options.autosave ?? application.autosave ?? defaultWebAutosavePolicyV1,
    ...(applicationBuildId === null ? {} : { appBuildId: applicationBuildId }),
    ...(options.rebootstrapDisposition === undefined
      ? {}
      : { rebootstrapDisposition: options.rebootstrapDisposition }),
  });

  let automation: InstalledBrowserAutomationBridgeV1 | undefined;
  let mounted: MountedGameApplicationV1 | undefined;
  let pointer: { dispose(): void } | undefined;
  let nativeBehaviorReset: { dispose(): void } | undefined;
  let unbindUiContext: (() => void) | undefined;
  let uiDisposer: (() => void) | undefined;
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

  let disposalPromise: Promise<DeepReadonly<PersistenceRebootstrapDisposalV1>> | undefined;
  const disposeForRebootstrap = (): Promise<DeepReadonly<PersistenceRebootstrapDisposalV1>> => {
    if (disposalPromise !== undefined) return disposalPromise;
    disposed = true;
    removePageLifecycle?.();
    disposalPromise = (async () => {
      try {
        mounted?.unmount();
      } finally {
        unbindUiContext?.();
        pointer?.dispose();
        nativeBehaviorReset?.dispose();
        composition?.dispose();
        automation?.dispose();
        try {
          uiDisposer?.();
        } catch {
          // Story UI disposal failures never block the persistence release.
        }
        capabilities.dispose();
      }
      return await instance.disposeForRebootstrap();
    })();
    return disposalPromise;
  };
  const dispose = async (): Promise<void> => {
    await disposeForRebootstrap();
  };

  try {
    const playerProfile = await createPlayerProfileStoreV1({
      records: host.records,
      storyId: instance.storyId as string,
      reportFailure,
    });
    const uiDefinition = application.ui({
      instance,
      assetLoader:
        options.assetLoader ??
        createBrowserImageLoaderV1({
          resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
          createImage: () => new Image(),
        }),
      playerProfile,
      files: host.files,
      capabilities,
      reportFailure,
    });
    uiDisposer = uiDefinition.dispose?.bind(uiDefinition);
    const saveSurfaces = createPlayerSaveSurfacesV1({
      files: host.files,
      persistence: instance.persistence,
      ...(uiDefinition.saveLabels === undefined ? {} : { saveLabels: uiDefinition.saveLabels }),
      ...(uiDefinition.saveGuard === undefined ? {} : { saveGuard: uiDefinition.saveGuard }),
      ...(uiDefinition.customSaves === undefined ? {} : { customSaves: uiDefinition.customSaves }),
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
      ...(uiDefinition.cueIds === undefined ? {} : { cueIds: uiDefinition.cueIds }),
      ...(uiDefinition.interactionSurfaceIds === undefined
        ? {}
        : { interactionSurfaceIds: uiDefinition.interactionSurfaceIds }),
      reportFailure: (failure) => reportFailure(failure.code, new Error(failure.summary)),
    });

    automation = installBrowserAutomationBridgeV1({
      semantic: instance.semantic,
      capabilities,
    });

    // DevDock open state feeds the diagnostics UI context without giving
    // the resident player DOM any debug vocabulary.
    let devDockOpenState: DevDockOpenStateV1 = Object.freeze({
      leftOpen: false,
      rightOpen: false,
    });
    const rootNode: ReactElement = (
      <DefaultGameRootV1
        composition={composition}
        semantic={instance.semantic}
        accessibleName={application.accessibleName}
        applicationId={application.applicationId}
        viewport={application.viewport}
        capabilities={capabilities}
        playerProfile={playerProfile}
        lifecycle={Object.freeze({ restart: () => instance.lifecycle.restart() })}
        {...(uiDefinition.titleScreen === undefined
          ? {}
          : { titleScreen: uiDefinition.titleScreen })}
        {...(uiDefinition.resolveStageAccessibleName === undefined
          ? {}
          : {
              resolveStageAccessibleName: uiDefinition.resolveStageAccessibleName as (
                publication: never,
              ) => string,
            })}
        {...(saveSurfaces.saveUi === undefined ? {} : { saveUi: saveSurfaces.saveUi })}
        {...(saveSurfaces.customSaves === undefined
          ? {}
          : { customSaves: saveSurfaces.customSaves })}
        {...(uiDefinition.hideSystemMenu === undefined
          ? {}
          : { hideSystemMenu: uiDefinition.hideSystemMenu })}
        sessionMaintenance={Object.freeze({
          savePort: saveSurfaces.maintenanceSavePort,
        })}
        {...(uiDefinition.labels === undefined ? {} : { labels: uiDefinition.labels })}
        {...(uiDefinition.slots === undefined ? {} : { slots: uiDefinition.slots })}
        {...(uiDefinition.devDockContributions === undefined
          ? {}
          : { devDockContributions: uiDefinition.devDockContributions })}
        devDock={Object.freeze({
          ...(uiDefinition.loadDevDockContributions === undefined
            ? {}
            : { load: uiDefinition.loadDevDockContributions }),
          observeOpenState: (state: DevDockOpenStateV1) => {
            devDockOpenState = state;
          },
        })}
        {...(uiDefinition.inputMaps === undefined ? {} : { inputMaps: uiDefinition.inputMaps })}
      />
    );
    mounted = mountGameApplicationV1(rootElement, rootNode);

    if (uiDefinition.pointer === true) {
      pointer = installPointerAdapterV1({
        target: rootElement,
        route: composition.input.route,
        window: globalThis.window,
        document,
      });
    }
    if (uiDefinition.nativeBehaviorReset !== undefined) {
      nativeBehaviorReset = installNativeBehaviorResetV1(uiDefinition.nativeBehaviorReset);
    }
    if (uiDefinition.debugUiContext !== undefined) {
      unbindUiContext = instance.bindDebugUiContext(
        uiDefinition.debugUiContext({
          devDockOpenState: () => devDockOpenState,
          presentation: composition.presentation,
          overlaySession: composition.overlaySession as never,
          systemDialogSession: composition.systemDialogSession,
        }),
      );
    }

    if (
      options.registerPageLifecycle !== false &&
      typeof globalThis.addEventListener === "function"
    ) {
      const onPageHide = (): void => {
        // Best-effort: capture any pending debounced autosave synchronously
        // and queue the write before the teardown releases the lease.
        void instance
          .flushAutoSave()
          .catch(() => undefined)
          .finally(() => {
            void dispose();
          });
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
    host,
    provenance: resolved.application.provenance as DeepReadonly<BuildProvenanceV1>,
    capabilitySearch,
    isDisposed: () => disposed,
    dispose,
    invalidateForHmr: () => instance.invalidateForHmr(),
    disposeForRebootstrap,
  });
}
