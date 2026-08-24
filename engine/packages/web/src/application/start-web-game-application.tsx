// SPDX-License-Identifier: MIT
import { useLayoutEffect } from "react";
import type { ReactElement, ReactNode } from "react";

import type {
  ApplicationHostCapabilitiesV1,
  BootstrapEntropyV1,
  BuildProvenanceV1,
  DeepReadonly,
  HostFilePortV1,
  SessionFaultCauseV1,
  TextCatalogSetV1,
  TextContentManifestV1,
  TextContentPackDescriptorV1,
  TextContentPackIdV1,
  TextContentSessionV1,
} from "@sillymaker/base";
import { createTextContentSessionV1, digestCanonical } from "@sillymaker/base";
import type {
  CoreAutosavePolicyV1,
  CoreGameApplicationDefinitionV1,
  CoreGameApplicationInstanceV1,
  PlayerProfileStoreV1,
} from "@sillymaker/base/runtime";
import type { GameSimulationTypeMapV1 } from "@sillymaker/base";
import {
  createCoreGameApplicationInstanceV1,
  createPlayerProfileStoreV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import {
  bindCoreApplicationReadinessOptionsInternalV1,
  clearAllCoreApplicationSavesForMaintenanceInternalV1,
  createCoreGameApplicationInstanceForRebootstrapInternalV1,
  disposeCoreGameApplicationForRebootstrapInternalV1,
  invalidateCoreGameApplicationForHmrInternalV1,
  prepareCoreApplicationRestartInternalV1,
  subscribeCoreApplicationPresentationAnchorEventsInternalV1,
} from "@sillymaker/base/runtime/internal";
import type {
  CoreRebootstrapHandoffInternalV1,
  CoreRebootstrapStartFailureInternalV1,
} from "@sillymaker/base/runtime/internal";
import type {
  DefaultGameRootLabelsV1,
  DefaultGameRootSlotsV1,
  GamepadActionMapV1,
  GameShellViewportOptionsV1,
  GameUiProjectorV1,
  HeldInputPortV1,
  HeldKeyMapV1,
  InputRouterV1,
  KeyboardActionMapV1,
  NativeBehaviorResetConfigV1,
  NarrativeSurfaceDefinitionV1,
  PointerActionMapV1,
  RuntimeAssetLoaderV1,
  RuntimePresentationPublicationV1,
  SaveOverlayLabelsV1,
  SaveOverlayPortV1,
  SystemDialogCustomSavesV1,
  WholeCanvasSurfaceDefinitionV1,
  WorkspaceOverlayDefinitionV1,
  WorkspaceOverlayPortBindingV1,
} from "@sillymaker/ui";
import {
  createHeldKeyInputV1,
  createPresentationFreezePortV1,
  createPresentationRatePortV1,
  DefaultGameRootV1,
  defaultGameRootLabelsV1,
  installNativeBehaviorResetV1,
} from "@sillymaker/ui";
import type { PresentationFreezePortV1, PresentationRatePortV1 } from "@sillymaker/ui";
import {
  createHostedGameUiCompositionInternalV1,
  resolveGameUiManagedSurfaceCompositionInternalV1,
  sealHostedGameUiCompositionTerminalInternalV1,
} from "@sillymaker/ui/internal";
import type { GameUiPresentationAnchorEventInternalV1 } from "@sillymaker/ui/internal";
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
import { createBrowserFilePortV1 } from "../host/browser-file-port.ts";
import { createDesktopShellFetchInternalV1 } from "../host/desktop-shell-capability.ts";
import { createShellFilePortV1 } from "../host/shell-file-port.ts";
import { createWebHostV1 } from "../host/create-web-host.ts";
import { createHttpHostRecordStoreV1 } from "../host/http-record-store.ts";
import { mountGameApplicationWithStartupDiagnosticsInternalV1 } from "./mount-game-application.tsx";
import type { MountedGameApplicationV1 } from "./mount-game-application.tsx";
import { createWebInstanceLeaseCoordinatorV1 } from "./instance-lease.ts";
import type { WebInstanceLeasePortV1, WebInstancePolicyV1 } from "./instance-lease.ts";
import { createPlayerSaveSurfacesV1 } from "./create-player-save-surfaces.ts";
import { createWebApplicationTerminalSupervisorInternalV1 } from "./application-terminal-supervisor.ts";
import { createCompositionBoundRestartLifecycleInternalV1 } from "./composition-bound-restart-lifecycle.ts";
import { createWebGameBootstrapEntropyInternalV1 } from "./create-web-game-bootstrap-entropy.ts";
import { installDesktopCloseFlushV1 } from "./install-desktop-close-flush.ts";
import { createManagedSurfaceApplicationEpochAllocatorInternalV1 } from "./managed-surface-application-epoch.ts";
import { installPresentationPacingInternalV1 } from "./presentation-pacing.ts";
import { loadWebTextContentPackBytesInternalV1 } from "./load-web-text-content-pack.ts";
import {
  createPresentationSuccessorAcknowledgmentBrokerInternalV1,
  type PresentationSuccessorAcknowledgmentBrokerInternalV1,
} from "./presentation-successor-acknowledgment.ts";
import { resolveLocalRecordsHostModeV1 } from "./resolve-local-records-host-mode.ts";
import {
  createWebApplicationStartupDiagnosticsControllerInternalV1,
  type ApplicationStartupFailureReasonInternalV1,
  type WebApplicationStartupDiagnosticsControllerInternalV1,
} from "./application-startup-diagnostics.ts";
import { readApplicationBootstrapConfigFromDocumentInternalV1 } from "./read-application-bootstrap-config.ts";

type WebSemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor> = SemanticPublicationV1<
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  RuntimeSessionStatusV1
>;

function ApplicationFirstProductCommitInternalV1(props: {
  readonly children: ReactNode;
  commit(): void;
}): ReactElement {
  const { commit } = props;
  useLayoutEffect(() => {
    let mounted = true;
    // Let an uncaught sibling layout failure win before publishing the first
    // usable product commit. React runs this cleanup when that commit aborts.
    queueMicrotask(() => {
      if (mounted) commit();
    });
    return () => {
      mounted = false;
    };
  }, [commit]);
  return <>{props.children}</>;
}

function retryCurrentApplicationEntryInternalV1(): void {
  if (typeof location === "undefined" || typeof location.reload !== "function") {
    throw new TypeError("web.application_startup.retry_unavailable");
  }
  location.reload();
}

/**
 * Host ports exposed only to an explicitly selected outer GUI composition.
 * The default Player path never imports an outer implementation.
 */
export interface WebGameOuterUiHostInputV1 {
  readonly inputRouter: InputRouterV1;
  readonly savePort: SaveOverlayPortV1;
  readonly clearAllSaves: () => Promise<void>;
  readonly reloadCurrentState: () => Promise<void>;
  readonly faultCause: {
    getCurrent(): SessionFaultCauseV1 | null;
    subscribe(listener: () => void): () => void;
  };
  /** Prepare all declared text packs before a generic state mutation. */
  readonly prepareStateMutation: () => Promise<void>;
  signalOptionalCapabilityReady(): void;
  observeOpenState(open: boolean): void;
}

export interface BoundWebGameOuterUiV1 {
  /** Concrete preset sections inserted before Story-owned Settings sections. */
  readonly settingsSections?: readonly ReactNode[];
  /** Render into the neutral auxiliary shell surface. */
  renderAuxiliarySurface(input: {
    readonly returnToTitle: () => Promise<void>;
  }): ReactNode;
}

/** Build-known outer GUI selection; reference implementations live on focused subpaths. */
export interface WebGameOuterUiV1 {
  bindHost(input: WebGameOuterUiHostInputV1): BoundWebGameOuterUiV1;
}

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
  /** The composition-owned production Narrative surface, when this Story has one. */
  readonly narrative?: NarrativeSurfaceDefinitionV1<TSemanticPublication>;
  /** A Story-owned whole-canvas surface resolved by the production composition. */
  readonly wholeCanvas?: WholeCanvasSurfaceDefinitionV1<TSemanticPublication>;
  readonly overlayDefinitions?: readonly WorkspaceOverlayDefinitionV1<TOverlayId>[];
  readonly overlayPorts?: readonly WorkspaceOverlayPortBindingV1[];
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
  /** Optional, build-known outer GUI support selected by this product. */
  readonly outerUi?: WebGameOuterUiV1;
  /** Story safepoint over the live publication (see SaveOverlayGuardV1). */
  readonly saveGuard?: (publication: unknown) => {
    allowed: boolean;
    reasonText?: string;
  };
  /**
   * Story Save component hosted by the managed System lifecycle authority.
   * Mutually exclusive with `saveLabels` / `saveGuard`.
   */
  readonly customSaves?: SystemDialogCustomSavesV1;
  /** Shows the engine title screen (New game / Continue|Load / Settings). */
  readonly titleScreen?: {
    readonly title: string;
    readonly backgroundUrl?: string;
    readonly splash?: {
      readonly lines: readonly string[];
      readonly durationMs?: number;
    };
    /** After the composition-anchored New-game restart, run Story-specific boot. */
    beginNewGame?(semantic: unknown): void | Promise<unknown>;
  };
  /**
   * The unified input surface: discrete keyboard/pointer/gamepad action
   * maps (installed by the root, routed through the InputRouter with
   * context priority), held-key bindings (modifier chords published as
   * state through the ui-context `heldInput` port — never routed, never
   * logged), and the game-shell native-behavior reset (suppress the
   * browser context menu, text selection, and hover-cursor changes
   * document-wide; editable controls and `data-native-menu` /
   * `data-native-text` subtrees keep native behavior). The reset installs
   * by default — a Player is a game shell, not a document; pass
   * `nativeBehavior: false` for a browser-native page.
   */
  readonly input?: {
    readonly keyboard?: KeyboardActionMapV1;
    readonly held?: HeldKeyMapV1;
    readonly pointer?: PointerActionMapV1;
    readonly gamepad?: GamepadActionMapV1;
    readonly nativeBehavior?: NativeBehaviorResetConfigV1 | false;
  };
  /** Install the pointer adapter on the application root element. */
  readonly pointer?: boolean;
  /** Spatial interaction surface IDs the intent router accepts. */
  readonly interactionSurfaceIds?: readonly string[];
  /**
   * The Host metronome for unfenced session time: while `enabledWhen`
   * holds over the live presentation publication, the host batches scaled
   * presentation-clock elapsed into `quantumMs` reports and delivers each
   * through `dispatch` (the Story's session time command, an unfenced
   * `TimeTickV1`). Declare it when the Story runs authoritative monitors
   * that must accumulate outside holds. The host closes the gate on its
   * own while a hold is pending (hold time arrives through the narrative
   * surface's fenced ticks — one elapsed span never enters authority
   * twice) and while the document is hidden.
   */
  readonly timeReporting?: {
    readonly quantumMs: number;
    readonly enabledWhen: (publication: unknown) => boolean;
    readonly dispatch: (elapsedMs: number) => Promise<unknown>;
  };
  /**
   * Story-declared realtime reaction window over the live publication:
   * while true, the host pins the presentation rate to exactly 1x so the
   * presented duration matches wall time (`pace: "realtime"` monitors
   * projected into the view — see `anyRealtimeMonitorActive`). Realtime
   * holds pin automatically from the engine-typed pending; declare this
   * only for Story-shaped windows the engine cannot see.
   */
  readonly realtimeWindow?: (publication: unknown) => boolean;
  /** Optional live stage label (current scene name) for the shell main region. */
  resolveStageAccessibleName?(publication: unknown): string;
  /**
   * Optional DebugBundle UI-context reader factory. The composer binds the
   * returned reader to the instance after the UI composition exists,
   * handing over the live composition read surfaces and optional outer UI state.
   */
  readonly debugUiContext?: (input: {
    readonly auxiliarySurfaceOpen: () => boolean;
    readonly presentation: { getSnapshot(): unknown };
    readonly overlaySession: {
      getSnapshot(): {
        readonly primaryId: string | null;
        readonly detailIds: readonly string[];
      };
    };
    readonly systemDialogSession: {
      getSnapshot(): { readonly active: "settings" | "saves" | null };
    };
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
  readonly buildIdentityInput?: Parameters<
    typeof resolveCoreGameApplicationV1
  >[1] extends { readonly buildIdentityInput?: infer TIdentity } | undefined ? TIdentity
    : never;
  /** Build-known read-only text loaded before the Core and UI boundaries that need it. */
  readonly textContent?: {
    readonly manifest: TextContentManifestV1;
    readonly bootstrapCatalogs: TextCatalogSetV1;
    readonly initialPackIds: readonly TextContentPackIdV1[];
    /** Admitted semantic invocation → packs that must be ready before dispatch. */
    requiredPackIdsForInvocation?(
      invocation: DeepReadonly<TInvocation>,
    ): readonly TextContentPackIdV1[];
    /** Admitted replacement Snapshot → packs that must be ready before install. */
    requiredPackIdsForSnapshot?(
      snapshot: DeepReadonly<TTypes["snapshot"]>,
    ): readonly TextContentPackIdV1[];
  };
  /**
   * The application's autosave/checkpoint policy. Defaults to a debounced
   * policy so long dialogues never write IndexedDB on every line; explicit
   * slot saves are always allowed regardless.
   */
  readonly autosave?: CoreAutosavePolicyV1;
  /**
   * Behavior when another live instance (tab/window/process) of this
   * application already holds the single-writer save lease. Defaults to
   * `"take_over"` (the newest instance wins; the seized one reports
   * `lost` through the `instanceLease` port and stops writing).
   */
  readonly instancePolicy?: WebInstancePolicyV1;
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
    /** The application-scoped read-only text resolver, or null when undeclared. */
    readonly textContent: TextContentSessionV1 | null;
    readonly assetLoader: RuntimeAssetLoaderV1;
    /** The player profile (Seen registry, playback preferences): Host data
     * outside every Game Save. */
    readonly playerProfile: PlayerProfileStoreV1;
    /** Host file/download port for Story-facing export surfaces. */
    readonly files: HostFilePortV1;
    /** The live capability session (persisted overlay + page request). */
    readonly capabilities: RuntimeCapabilitySessionOverlayV1;
    /** Multi-instance lease role for banners and manual takeover. */
    readonly instanceLease: WebInstanceLeasePortV1;
    /**
     * Presentation freeze (developer pause): `pause()`/`resume()` hold the
     * shared presentation clock and swallow gameplay input while dev
     * surfaces stay interactive. Pass `presentationFreeze.clock` to the
     * Story's mounted `SemanticStageV1` so stage motion freezes too.
     */
    readonly presentationFreeze: PresentationFreezePortV1;
    /**
     * Presentation playback rate (time scaling): `setRate()` multiplies the
     * shared presentation clock from this instant on. Presentation-only —
     * the authoritative core consumes already-scaled reported milliseconds,
     * so Saves, digests, and replay are untouched. Stories bind fast-forward
     * (e.g. hold Ctrl → pin 2×) to this port; the engine debug dock renders
     * a preset row from the same port.
     */
    readonly presentationRate: PresentationRatePortV1;
    /**
     * Held-key input: the current set of held input actions declared
     * through `input.held` (modifier chords such as hold-Ctrl). Pure
     * presentation-side state — a Story subscribes and owns the policy
     * (for example pin the presentation rate and enable auto while
     * `player.fast_forward` is held); physical keys never enter the
     * CommandLog.
     */
    readonly heldInput: HeldInputPortV1;
    /**
     * Core wipe: drain pending Auto Save, then clear every slot. A Story
     * debug dock must use this instead of looping `savePort.clear`.
     */
    readonly clearAllSaves: () => Promise<void>;
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
  readonly host?: ApplicationHostCapabilitiesV1;
  /** Game Domain bootstrap entropy; defaults to the Web crypto adapter. */
  readonly gameBootstrapEntropy?: BootstrapEntropyV1;
  /** Injectable for tests; defaults to the browser image loader. */
  readonly assetLoader?: RuntimeAssetLoaderV1;
  /** Injectable pack transport; defaults to a same-origin runtime-path fetch. */
  readonly loadTextContentPackBytes?: (
    descriptor: TextContentPackDescriptorV1,
  ) => Promise<Uint8Array>;
  readonly databaseName?: string;
  readonly capabilitySearch?: string;
  /** Register the pagehide teardown listener; disable in tests. */
  readonly registerPageLifecycle?: boolean;
  /** Host-level autosave override; wins over the application's policy. */
  readonly autosave?: CoreAutosavePolicyV1;
}

export interface StartWebGameApplicationForRebootstrapOptionsInternalV1
  extends StartWebGameApplicationOptionsV1 {
  /** Exact predecessor Save + lease pair. @internal */
  readonly handoff: DeepReadonly<CoreRebootstrapHandoffInternalV1>;
  /** Definitive recovery outcome reported before startup rejects. @internal */
  readonly onRebootstrapStartFailureInternal: (
    outcome: DeepReadonly<CoreRebootstrapStartFailureInternalV1>,
  ) => void;
}

interface WebGameApplicationRebootstrapStartInputInternalV1 {
  readonly handoff: DeepReadonly<CoreRebootstrapHandoffInternalV1>;
  readonly onFailure: (
    outcome: DeepReadonly<CoreRebootstrapStartFailureInternalV1>,
  ) => void;
}

const webGameApplicationRebootstrapStartInputsInternalV1 = new WeakMap<
  StartWebGameApplicationOptionsV1,
  WebGameApplicationRebootstrapStartInputInternalV1
>();

/**
 * The browser default: committed Snapshots stay saveable at any time, but
 * persistence flushes after a short quiet period (or every N commands as a
 * backstop), and the pagehide teardown flushes whatever is still pending.
 */
export const defaultWebAutosavePolicyV1: CoreAutosavePolicyV1 = {
  mode: "debounced",
  delayMs: 800,
  checkpointEveryCommands: 20,
};

export interface StartedWebGameApplicationV1 {
  readonly applicationId: string;
  /** The Host this application runs on; HMR successors reuse it. */
  readonly host: ApplicationHostCapabilitiesV1;
  /** Full build provenance for HMR identity comparison. */
  readonly provenance: DeepReadonly<BuildProvenanceV1>;
  readonly capabilitySearch: string;
  /** Multi-instance lease role (owner/waiting/read_only/lost) + takeover. */
  readonly instanceLease: WebInstanceLeasePortV1;
  isDisposed(): boolean;
  dispose(): Promise<void>;
}

interface StartedWebGameApplicationHmrControlInternalV1 {
  invalidate(): void;
  dispose(): Promise<DeepReadonly<CoreRebootstrapHandoffInternalV1>>;
  readonly loadTextContentPackBytes?: NonNullable<
    StartWebGameApplicationOptionsV1["loadTextContentPackBytes"]
  >;
}

const startedWebGameApplicationHmrControlsInternalV1 = new WeakMap<
  StartedWebGameApplicationV1,
  StartedWebGameApplicationHmrControlInternalV1
>();

function requireStartedWebGameApplicationHmrControlInternalV1(
  started: StartedWebGameApplicationV1,
): StartedWebGameApplicationHmrControlInternalV1 {
  const control = startedWebGameApplicationHmrControlsInternalV1.get(started);
  if (control === undefined) throw new TypeError("web.hmr_started_application_unavailable");
  return control;
}

/** Reads the injected pack transport so an HMR successor keeps the same Host seam. @internal */
export function readStartedWebTextContentPackLoaderInternalV1(
  started: StartedWebGameApplicationV1,
): StartWebGameApplicationOptionsV1["loadTextContentPackBytes"] {
  return requireStartedWebGameApplicationHmrControlInternalV1(started)
    .loadTextContentPackBytes;
}

/** @internal Fences one live Web application before its HMR handoff. */
export function invalidateStartedWebGameApplicationForHmrInternalV1(
  started: StartedWebGameApplicationV1,
): void {
  requireStartedWebGameApplicationHmrControlInternalV1(started).invalidate();
}

/** @internal Retires one live Web application and captures its exact handoff. */
export function disposeStartedWebGameApplicationForRebootstrapInternalV1(
  started: StartedWebGameApplicationV1,
): Promise<DeepReadonly<CoreRebootstrapHandoffInternalV1>> {
  return requireStartedWebGameApplicationHmrControlInternalV1(started).dispose();
}

function appBuildIdV1(
  buildIdentityInput: unknown,
): ReturnType<typeof digestCanonical> | null {
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
  const rebootstrapStart = webGameApplicationRebootstrapStartInputsInternalV1.get(options);
  const usesDocumentEntry = options.rootElement === undefined && typeof document !== "undefined";
  let startupDiagnostics: WebApplicationStartupDiagnosticsControllerInternalV1 | null = null;
  let bootstrapTarget: "browser" | "deno_desktop" | null = null;
  let startupFailureReason: ApplicationStartupFailureReasonInternalV1 = "bootstrap_config";
  let startupAccepted = false;
  let productCommitted = false;

  const signalStartupFailure = (reason: ApplicationStartupFailureReasonInternalV1): void => {
    if (startupDiagnostics === null) return;
    try {
      startupDiagnostics.signalTerminalStartupFailure({
        reason,
        retry: retryCurrentApplicationEntryInternalV1,
      });
    } catch {
      // Preserve the construction/runtime failure when the Host-owned shell
      // was externally removed after its initial admission.
    }
  };

  if (usesDocumentEntry) {
    try {
      startupDiagnostics = createWebApplicationStartupDiagnosticsControllerInternalV1(document);
      bootstrapTarget = readApplicationBootstrapConfigFromDocumentInternalV1(
        document,
        "runtime",
      ).target;
    } catch (error) {
      signalStartupFailure("bootstrap_config");
      throw error;
    }
  }
  startupFailureReason = "unavailable";

  let rootElement: HTMLElement;
  try {
    const candidate = options.rootElement ??
      (typeof document === "undefined" ? null : document.querySelector("#root"));
    if (!(candidate instanceof HTMLElement)) {
      throw new TypeError("web.application_root_missing");
    }
    rootElement = candidate;
  } catch (error) {
    signalStartupFailure("unavailable");
    throw error;
  }

  // The default composer owns the engine theme baseline. Loading it here
  // (not at module scope) keeps custom Roots on their own style composition.
  try {
    await import("@sillymaker/ui/styles.css");
  } catch (error) {
    signalStartupFailure("unavailable");
    throw error;
  }

  // Both local channels persist through the HTTP record store. Only the
  // injected marker identifies the Desktop shell, whose private file-download
  // endpoint is unavailable to the query-only browser save server.
  let localRecordsHostMode: ReturnType<typeof resolveLocalRecordsHostModeV1>;
  try {
    localRecordsHostMode = resolveLocalRecordsHostModeV1(
      typeof location === "undefined" ? "" : location.search,
      Reflect.get(globalThis, "__SILLYMAKER_RECORDS__"),
      Reflect.get(globalThis, "__SILLYMAKER_DESKTOP_CAPABILITY__"),
    );
  } catch (error) {
    signalStartupFailure("unavailable");
    throw error;
  }
  const { desktopShellCapability, usesDesktopShell, wantsLocalRecords } = localRecordsHostMode;
  if (
    bootstrapTarget !== null &&
    (bootstrapTarget === "deno_desktop") !== usesDesktopShell
  ) {
    signalStartupFailure("bootstrap_config");
    throw new TypeError("web.application_bootstrap.target_mismatch");
  }
  startupFailureReason = "required_domain";
  const desktopShellFetch = desktopShellCapability === null
    ? null
    : createDesktopShellFetchInternalV1(desktopShellCapability);
  const host = options.host ??
    (wantsLocalRecords
      ? createWebHostV1({
        records: createHttpHostRecordStoreV1({
          baseUrl: "/sillymaker/records",
          ...(desktopShellFetch === null ? {} : { fetchImpl: desktopShellFetch }),
        }),
        ...(usesDesktopShell
          ? {
            // The shell webview ignores `<a download>`; route downloads to
            // the shell endpoint so exports reach platform Downloads.
            files: createShellFilePortV1({
              baseUrl: "/sillymaker/files",
              picker: createBrowserFilePortV1(),
              ...(desktopShellFetch === null ? {} : { fetchImpl: desktopShellFetch }),
            }),
          }
          : {}),
      })
      : createWebHostV1({
        databaseName: options.databaseName ?? `sillymaker.${application.applicationId}`,
      }));
  const gameBootstrapEntropy = options.gameBootstrapEntropy ??
    createWebGameBootstrapEntropyInternalV1();
  const nextApplicationUuidV4 = (): string => globalThis.crypto.randomUUID();
  const reportFailure = (code: string, error: unknown): void => {
    try {
      host.log.write("warn", code, {
        message: error instanceof Error ? error.message : String(error),
      });
    } catch {
      // Host diagnostics are best-effort and never participate in runtime precedence.
    }
  };
  const notifyRebootstrapStartFailure = rebootstrapStart === undefined
    ? undefined
    : (outcome: DeepReadonly<CoreRebootstrapStartFailureInternalV1>): void => {
      try {
        rebootstrapStart.onFailure(outcome);
      } catch {
        // The startup failure remains authoritative over observer failure.
      }
    };

  const capabilitySearch = options.capabilitySearch ??
    (typeof location === "undefined" ? "" : location.search);
  const capabilityRequest = parseCapabilityRequestV1(capabilitySearch);
  const persistedCapabilities = await createWebCapabilityPreferencesV1(host).catch(
    (error: unknown) => {
      signalStartupFailure("required_domain");
      throw error;
    },
  );
  // The live capability session: page-local requests overlay the persisted
  // preferences (an explicitly selected outer GUI may persist changes here).
  const capabilities = createRuntimeCapabilitySessionOverlayV1(
    persistedCapabilities,
    capabilityRequest.kind === "accepted" ? capabilityRequest.requested : [],
  );

  const resolved = resolveCoreGameApplicationV1(
    application.core,
    application.buildIdentityInput === undefined
      ? {}
      : { buildIdentityInput: application.buildIdentityInput },
  );
  if (resolved.kind === "failed") {
    signalStartupFailure("required_domain");
    throw new TypeError(
      `web.application_resolution_failed:${resolved.failure.code}`,
    );
  }

  const textContentDeclaration = application.textContent;
  let textContent: TextContentSessionV1 | null = null;
  if (textContentDeclaration !== undefined) {
    try {
      const resolvedManifest = (resolved.application.resolved as {
        readonly presentation: {
          readonly textContentManifest?: TextContentManifestV1 | null;
        };
      }).presentation.textContentManifest;
      if (
        resolvedManifest === undefined ||
        resolvedManifest === null ||
        resolvedManifest.revision !== textContentDeclaration.manifest.revision ||
        resolvedManifest.digest !== textContentDeclaration.manifest.digest
      ) {
        throw new TypeError("web.text_content_manifest_identity_mismatch");
      }
      const loadTextContentPackBytes = options.loadTextContentPackBytes ??
        loadWebTextContentPackBytesInternalV1;
      textContent = createTextContentSessionV1({
        manifest: textContentDeclaration.manifest,
        bootstrapCatalogs: textContentDeclaration.bootstrapCatalogs,
        loadPackBytes: loadTextContentPackBytes,
      });
      for (const packId of textContentDeclaration.initialPackIds) {
        await textContent.ensure(packId);
      }
    } catch (error) {
      capabilities.dispose();
      signalStartupFailure("required_domain");
      throw error;
    }
  }
  const textContentSession = textContent;
  const ensureRequiredTextContentPacksV1 = async (
    packIds: readonly TextContentPackIdV1[],
  ): Promise<void> => {
    if (textContentSession === null) return;
    try {
      for (const packId of packIds) await textContentSession.ensure(packId);
    } catch (error) {
      reportFailure("web.text_content_required", error);
      throw error;
    }
  };
  const textContentReadinessHooks = textContentSession === null ||
      textContentDeclaration === undefined ||
      (
        textContentDeclaration.requiredPackIdsForInvocation === undefined &&
        textContentDeclaration.requiredPackIdsForSnapshot === undefined
      )
    ? null
    : ({
      ...(textContentDeclaration.requiredPackIdsForInvocation === undefined ? {} : {
        prepareSemanticInvocation: (invocation: DeepReadonly<TInvocation>) =>
          ensureRequiredTextContentPacksV1(
            textContentDeclaration.requiredPackIdsForInvocation!(invocation),
          ),
      }),
      ...(textContentDeclaration.requiredPackIdsForSnapshot === undefined ? {} : {
        prepareReplacement: (snapshot: DeepReadonly<TTypes["snapshot"]>) =>
          ensureRequiredTextContentPacksV1(
            textContentDeclaration.requiredPackIdsForSnapshot!(snapshot),
          ),
      }),
    });

  const applicationBuildId = appBuildIdV1(application.buildIdentityInput);
  // One lease identity per started instance: multi-tab/-window mutual
  // exclusion (and the instancePolicy roles) requires distinct owners.
  const leaseOwnerId =
    `owner.sillymaker.web.${application.applicationId}.${nextApplicationUuidV4()}`;
  const coreStartOptions = {
    host: {
      entropy: gameBootstrapEntropy,
      records: host.records,
      now: () => host.metadataClock.now(),
      ownerId: leaseOwnerId as never,
      nextHandoffRequestId: () => `handoff.${application.applicationId}.${nextApplicationUuidV4()}`,
    },
    capabilities: { debugTools: capabilities.state.getCurrent().debugTools },
    capabilityState: capabilities.state,
    autosave: options.autosave ?? application.autosave ?? defaultWebAutosavePolicyV1,
    ...(applicationBuildId === null ? {} : { appBuildId: applicationBuildId }),
  };
  const instance = await (async () => {
    if (rebootstrapStart === undefined) {
      if (textContentReadinessHooks !== null) {
        bindCoreApplicationReadinessOptionsInternalV1<
          TInvocation,
          TTypes["snapshot"]
        >(coreStartOptions, textContentReadinessHooks);
      }
      return await createCoreGameApplicationInstanceV1(
        resolved.application,
        coreStartOptions,
      );
    }
    const rebootstrapOptions = {
      ...coreStartOptions,
      handoff: rebootstrapStart.handoff,
      onRebootstrapStartFailureInternal: notifyRebootstrapStartFailure!,
    };
    if (textContentReadinessHooks !== null) {
      bindCoreApplicationReadinessOptionsInternalV1<
        TInvocation,
        TTypes["snapshot"]
      >(rebootstrapOptions, textContentReadinessHooks);
    }
    return await createCoreGameApplicationInstanceForRebootstrapInternalV1(
      resolved.application,
      rebootstrapOptions,
    );
  })().catch((error: unknown) => {
    signalStartupFailure("required_domain");
    throw error;
  });

  let automation: InstalledBrowserAutomationBridgeV1 | undefined;
  let mounted: MountedGameApplicationV1 | undefined;
  let pointer: { dispose(): void } | undefined;
  let nativeBehaviorReset: { dispose(): void } | undefined;
  let heldKeyUninstall: (() => void) | undefined;
  let unbindUiContext: (() => void) | undefined;
  let uiDisposer: (() => void) | undefined;
  let successorAcknowledgments: PresentationSuccessorAcknowledgmentBrokerInternalV1 | undefined;
  let composition:
    | ReturnType<
      typeof createHostedGameUiCompositionInternalV1<
        WebSemanticPublicationV1<
          TGameView,
          TNarrativeView,
          TActionDescriptor
        >,
        TResolvedCatalog,
        TStoryUiState,
        TView,
        TAssetId,
        TOverlayId
      >
    >
    | undefined;
  let removePageLifecycle: (() => void) | undefined;
  let removeDesktopCloseFlush: (() => void) | undefined;
  let instanceLease: WebInstanceLeasePortV1 | undefined;
  let unbindPresentationFreeze: (() => void) | undefined;
  let presentationPacing: { dispose(): void } | undefined;

  const terminalSupervisor = createWebApplicationTerminalSupervisorInternalV1({
    fenceSteps: [
      { name: "automation", run: () => automation?.dispose() },
      { name: "pointer", run: () => pointer?.dispose() },
      {
        name: "presentation",
        run: () => {
          if (composition !== undefined) {
            sealHostedGameUiCompositionTerminalInternalV1(composition);
          }
        },
      },
      // Core invalidation can synchronously notify cancellation observers. It
      // runs only after every held Host/UI ingress has become inert.
      {
        name: "core",
        run: () => invalidateCoreGameApplicationForHmrInternalV1(instance),
      },
    ],
    cleanupSteps: [
      {
        name: "page_lifecycle",
        run: () => removePageLifecycle?.(),
      },
      {
        name: "desktop_close_flush",
        run: () => removeDesktopCloseFlush?.(),
      },
      { name: "root", run: () => mounted?.unmount() },
      {
        name: "debug_ui_context",
        run: () => unbindUiContext?.(),
      },
      {
        name: "native_behavior",
        run: () => nativeBehaviorReset?.dispose(),
      },
      {
        name: "held_input",
        run: () => heldKeyUninstall?.(),
      },
      {
        name: "presentation_pacing",
        run: () => presentationPacing?.dispose(),
      },
      {
        name: "presentation_freeze",
        run: () => unbindPresentationFreeze?.(),
      },
      { name: "composition", run: () => composition?.dispose() },
      {
        name: "successor_acknowledgments",
        run: () => successorAcknowledgments?.dispose(),
      },
      { name: "story_ui", run: () => uiDisposer?.() },
      {
        name: "instance_lease",
        run: () => instanceLease?.dispose(),
      },
      {
        name: "capabilities",
        run: () => capabilities.dispose(),
      },
    ],
    releaseCorePersistence: async (mode) => {
      if (mode === "rebootstrap") {
        return await disposeCoreGameApplicationForRebootstrapInternalV1(instance);
      }
      await instance.dispose();
      return undefined;
    },
    terminalReleaseMode: () =>
      rebootstrapStart !== undefined && !startupAccepted ? "rebootstrap" : "ordinary",
    reportFailure: (step, error) =>
      reportFailure(
        "web.application_disposal_step_failed",
        new Error(step, { cause: error }),
      ),
  });
  const signalTerminal = (error: Error): void => {
    const first = terminalSupervisor.getTerminalError() === null;
    if (first) signalStartupFailure("presentation");
    terminalSupervisor.signalTerminal(error);
    if (first) reportFailure(error.message, error);
  };
  successorAcknowledgments = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
    signalTerminal,
  });
  const composedLifecycle = createCompositionBoundRestartLifecycleInternalV1({
    prepareRestart: () => prepareCoreApplicationRestartInternalV1(instance),
    acknowledgments: successorAcknowledgments,
    terminal: {
      getTerminalError: terminalSupervisor.getTerminalError,
      terminate(error: Error): Promise<never> {
        signalTerminal(error);
        return terminalSupervisor.terminate(error);
      },
    },
  });
  const disposeForRebootstrap = async (): Promise<
    DeepReadonly<CoreRebootstrapHandoffInternalV1>
  > => {
    try {
      const handoff = await terminalSupervisor.disposeForRebootstrap();
      if (handoff === undefined) {
        throw new TypeError("web.rebootstrap_handoff_unavailable");
      }
      return handoff;
    } finally {
      if (startupAccepted) startupDiagnostics?.dispose();
    }
  };
  const dispose = async (): Promise<void> => {
    await terminalSupervisor.disposeOrdinarily();
    if (startupAccepted) startupDiagnostics?.dispose();
  };

  try {
    removeDesktopCloseFlush = installDesktopCloseFlushV1({
      enabled: usesDesktopShell,
      fence: () => invalidateCoreGameApplicationForHmrInternalV1(instance),
      flush: () => instance.flushAutoSave(),
      reportFailure: (error) => reportFailure("web.desktop_close_flush_failed", error),
    });
    const playerProfile = await createPlayerProfileStoreV1({
      records: host.records,
      storyId: instance.storyId as string,
      reportFailure,
    });
    // Multi-instance role: applies the declared policy against a live
    // holder and keeps the published role fresh (poll + cross-tab nudge).
    // HMR successors skip the boot seizure — the rebootstrap handoff owns
    // the lease transfer.
    const instanceLeaseCoordinator = await createWebInstanceLeaseCoordinatorV1({
      lease: instance.persistence.lease,
      policy: application.instancePolicy ?? "take_over",
      selfOwnerId: leaseOwnerId,
      channelScope: instance.storyId as string,
      claimOnStart: rebootstrapStart === undefined,
    });
    instanceLease = instanceLeaseCoordinator;
    // One shared pausable, rate-scalable presentation clock: the rate port
    // wraps the raw host clock (debug 倍速 / Story fast-forward), the freeze
    // port wraps the rate port, and narrative reveal plus hosted surfaces
    // consume the result directly; Stories pass `presentationFreeze.clock`
    // to their mounted stages so 冻结画面 and 倍速 hold every plane together.
    const presentationRate = createPresentationRatePortV1();
    const presentationFreeze = createPresentationFreezePortV1({
      inner: presentationRate.clock,
    });
    // Held-key (modifier) input: the port exists before `ui()` so Story
    // surfaces can subscribe; the adapter installs after mount when the
    // definition declares `input.held`.
    const heldKeyInput = createHeldKeyInputV1();
    const clearAllSaves = (): Promise<void> =>
      clearAllCoreApplicationSavesForMaintenanceInternalV1(instance);
    const reloadCurrentState = async (): Promise<void> => {
      const exported = await instance.persistence.exportCurrentSave();
      const result = await instance.persistence.importSave(exported.bytes);
      switch (result.kind) {
        case "imported":
        case "loaded":
          return;
        case "rejected":
        case "faulted":
          throw new Error(result.code);
        case "saved":
        case "cleared":
          throw new Error(`unexpected persistence result ${result.kind}`);
        default: {
          const exhaustive: never = result;
          throw exhaustive;
        }
      }
    };
    const uiDefinition = application.ui({
      instance,
      textContent,
      instanceLease: instanceLeaseCoordinator,
      assetLoader: options.assetLoader ??
        createBrowserImageLoaderV1({
          resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
          createImage: () => new Image(),
        }),
      playerProfile,
      files: host.files,
      capabilities,
      presentationFreeze,
      presentationRate,
      heldInput: heldKeyInput.port,
      clearAllSaves,
      reportFailure,
    });
    uiDisposer = uiDefinition.dispose?.bind(uiDefinition);
    const saveSurfaces = createPlayerSaveSurfacesV1({
      files: host.files,
      persistence: instance.persistence,
      clearAllSaves,
      ...(uiDefinition.saveLabels === undefined ? {} : { saveLabels: uiDefinition.saveLabels }),
      ...(uiDefinition.saveGuard === undefined ? {} : { saveGuard: uiDefinition.saveGuard }),
      ...(uiDefinition.customSaves === undefined ? {} : { customSaves: uiDefinition.customSaves }),
    });

    const narrativeDefinition = uiDefinition.narrative ?? null;
    const wholeCanvasDefinition = uiDefinition.wholeCanvas ?? null;
    const titleScreenInput = uiDefinition.titleScreen ?? null;
    const normalizedTitleScreen = titleScreenInput === null ? null : (() => {
      const beginNewGame = titleScreenInput.beginNewGame;
      return ({
        title: titleScreenInput.title,
        backgroundUrl: titleScreenInput.backgroundUrl ?? null,
        splash: titleScreenInput.splash === undefined ? null : ({
          lines: [...titleScreenInput.splash.lines],
          durationMs: titleScreenInput.splash.durationMs ?? null,
        }),
        beginNewGame: beginNewGame === undefined
          ? null
          : () => titleScreenInput.beginNewGame!(instance.semantic),
      });
    })();
    const wholeCanvas = wholeCanvasDefinition === null && normalizedTitleScreen === null
      ? null
      : (() => {
        const labels = {
          ...defaultGameRootLabelsV1,
          ...uiDefinition.labels,
        };
        return ({
          definition: wholeCanvasDefinition,
          titleScreen: normalizedTitleScreen,
          lifecycle: composedLifecycle,
          savePort: saveSurfaces.saveUi?.port ??
            (saveSurfaces.customSaves === undefined ? null : saveSurfaces.maintenance.savePort),
          customSavesConfigured: saveSurfaces.customSaves !== undefined,
          labels: {
            newGame: labels.titleNewGameLabel,
            newGameFailed: labels.titleNewGameFailedText,
            continue: labels.titleContinueLabel,
            load: labels.titleLoadGameLabel,
            settings: labels.titleSettingsLabel ?? labels.settingsLabel,
          },
        });
      })();
    const hostedSurfaceDefinitions = narrativeDefinition === null && wholeCanvas === null
      ? null
      : ({
        narrative: narrativeDefinition,
        wholeCanvas,
        environment: {
          playerProfile,
          presentationClock: presentationFreeze.clock,
          prefersReducedMotion: () =>
            typeof globalThis.window.matchMedia === "function" &&
            globalThis.window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches,
        },
      });

    composition = createHostedGameUiCompositionInternalV1<
      WebSemanticPublicationV1<TGameView, TNarrativeView, TActionDescriptor>,
      TResolvedCatalog,
      TStoryUiState,
      TView,
      TAssetId,
      TOverlayId
    >(
      {
        semantic: instance.semantic,
        projector: uiDefinition.projector,
        ...(uiDefinition.contentPreference === undefined
          ? {}
          : { contentPreference: uiDefinition.contentPreference }),
        ...(uiDefinition.overlayDefinitions === undefined
          ? {}
          : { overlayDefinitions: uiDefinition.overlayDefinitions }),
        ...(uiDefinition.overlayPorts === undefined
          ? {}
          : { overlayPorts: uiDefinition.overlayPorts }),
        ...(uiDefinition.cueIds === undefined ? {} : { cueIds: uiDefinition.cueIds }),
        ...(uiDefinition.interactionSurfaceIds === undefined
          ? {}
          : { interactionSurfaceIds: uiDefinition.interactionSurfaceIds }),
        reportFailure: (failure) => reportFailure(failure.code, new Error(failure.summary)),
      },
      {
        managedSurfaceEpochAllocator: createManagedSurfaceApplicationEpochAllocatorInternalV1({
          applicationId: application.applicationId,
        }),
        anchorEvents: {
          current: () => instance.presentationAnchor(),
          subscribe: (
            listener: (event: GameUiPresentationAnchorEventInternalV1) => void,
          ) =>
            subscribeCoreApplicationPresentationAnchorEventsInternalV1(
              instance,
              (event) => {
                if (event.publicationContext !== null) {
                  successorAcknowledgments.bindExpected(
                    event.publicationContext,
                    event.anchor,
                  );
                }
                listener(
                  {
                    anchor: event.anchor,
                    token: event.publicationContext,
                  },
                );
              },
            ),
        },
        successorProducer: successorAcknowledgments.producer,
        reportFailure,
      },
      hostedSurfaceDefinitions,
    );
    unbindPresentationFreeze = presentationFreeze.bindInputRouterInternalV1(composition.input);
    // The hosted Narrative runtime may expose an engine-typed `pace:
    // "realtime"` hold even when the Story declares no extra pacing member.
    const pacingNarrative = resolveGameUiManagedSurfaceCompositionInternalV1(
      composition,
    ).narrative;
    presentationPacing = installPresentationPacingInternalV1({
      presentation: composition.presentation,
      narrative: pacingNarrative,
      rate: presentationRate,
      // The freeze-wrapped clock: frozen presentation stops session time
      // with everything else, and realtime pins reshape hold ticks too.
      clock: presentationFreeze.clock,
      timeReporting: uiDefinition.timeReporting ?? null,
      realtimeWindow: uiDefinition.realtimeWindow ?? null,
      visibility: {
        isHidden: () => document.visibilityState === "hidden",
        subscribe: (listener: () => void) => {
          document.addEventListener("visibilitychange", listener);
          return () => document.removeEventListener("visibilitychange", listener);
        },
      },
      reportFailure,
    });

    automation = installBrowserAutomationBridgeV1({
      semantic: instance.semantic,
      capabilities,
    });

    // An explicitly selected outer composition can report its observable open
    // state to DebugBundle without adding implementation vocabulary to core.
    let auxiliarySurfaceOpen = false;
    const boundOuterUi = uiDefinition.outerUi?.bindHost({
      inputRouter: composition.input,
      savePort: saveSurfaces.maintenance.savePort,
      clearAllSaves: saveSurfaces.maintenance.clearAllSaves,
      reloadCurrentState,
      faultCause: {
        getCurrent: () => instance.admin.lastFaultCause(),
        subscribe: (listener: () => void) => instance.semantic.subscribe(listener),
      },
      prepareStateMutation: () =>
        ensureRequiredTextContentPacksV1(
          textContentSession?.manifest.packs.map((pack) => pack.packId) ?? [],
        ),
      signalOptionalCapabilityReady: () =>
        startupDiagnostics?.signalOptionalCapabilityReady("ui.outer-tools"),
      observeOpenState: (open: boolean) => {
        auxiliarySurfaceOpen = open;
      },
    });
    const storySlots = uiDefinition.slots;
    type RootSlotContextV1 = Parameters<
      NonNullable<NonNullable<typeof storySlots>["background"]>
    >[0];
    const rootSlots: typeof uiDefinition.slots = boundOuterUi === undefined ? storySlots : ({
      ...storySlots,
      settingsSections: (context: RootSlotContextV1) => [
        ...(boundOuterUi.settingsSections ?? []),
        ...(storySlots?.settingsSections?.(context) ?? []),
      ],
      auxiliarySurface: (context: RootSlotContextV1) => (
        <>
          {boundOuterUi.renderAuxiliarySurface({
            returnToTitle: context.systemDialogs.returnToTitle,
          })}
          {storySlots?.auxiliarySurface?.(context) ?? null}
        </>
      ),
    });
    // The root installs only the router-coupled discrete adapters; held
    // bindings and the native-behavior reset install below, composer-side.
    const rootInputMaps = ((): {
      readonly keyboard?: KeyboardActionMapV1;
      readonly pointer?: PointerActionMapV1;
      readonly gamepad?: GamepadActionMapV1;
    } | undefined => {
      const input = uiDefinition.input;
      if (input === undefined) return undefined;
      const maps = {
        ...(input.keyboard === undefined ? {} : { keyboard: input.keyboard }),
        ...(input.pointer === undefined ? {} : { pointer: input.pointer }),
        ...(input.gamepad === undefined ? {} : { gamepad: input.gamepad }),
      };
      return Object.keys(maps).length === 0 ? undefined : maps;
    })();
    const commitFirstProduct = (): void => {
      if (productCommitted) return;
      startupDiagnostics?.signalFirstProductCommit("presentation");
      productCommitted = true;
    };
    const rootNode: ReactElement = (
      <ApplicationFirstProductCommitInternalV1 commit={commitFirstProduct}>
        <DefaultGameRootV1
          composition={composition}
          semantic={instance.semantic}
          accessibleName={application.accessibleName}
          applicationId={application.applicationId}
          viewport={application.viewport}
          playerProfile={playerProfile}
          {...(uiDefinition.resolveStageAccessibleName === undefined ? {} : {
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
          {...(uiDefinition.labels === undefined ? {} : { labels: uiDefinition.labels })}
          {...(rootSlots === undefined ? {} : { slots: rootSlots })}
          {...(rootInputMaps === undefined ? {} : { inputMaps: rootInputMaps })}
        />
      </ApplicationFirstProductCommitInternalV1>
    );
    startupFailureReason = "presentation";
    mounted = mountGameApplicationWithStartupDiagnosticsInternalV1(
      rootElement,
      rootNode,
      (error) => {
        // React reports this from inside its own work loop. Teardown in the
        // next microtask so Root unmount never re-enters the failing commit.
        queueMicrotask(() =>
          signalTerminal(
            error instanceof Error
              ? error
              : new Error("web.application_presentation_failed", { cause: error }),
          )
        );
      },
    );
    startupFailureReason = "required_domain";

    if (uiDefinition.pointer === true) {
      pointer = installPointerAdapterV1({
        target: rootElement,
        route: composition.input.route,
        window: globalThis.window,
        document,
      });
    }
    if (uiDefinition.input?.held !== undefined) {
      heldKeyUninstall = heldKeyInput.install({ map: uiDefinition.input.held });
    }
    if (uiDefinition.input?.nativeBehavior !== false) {
      nativeBehaviorReset = installNativeBehaviorResetV1(
        uiDefinition.input?.nativeBehavior ?? {},
      );
    }
    if (uiDefinition.debugUiContext !== undefined) {
      const systemDialogSession = composition.systemDialogSession;
      const systemDialogReadView = {
        getSnapshot: () => systemDialogSession.getSnapshot(),
      };
      unbindUiContext = instance.bindDebugUiContext(
        uiDefinition.debugUiContext({
          auxiliarySurfaceOpen: () => auxiliarySurfaceOpen,
          presentation: composition.presentation,
          overlaySession: composition.overlaySession as never,
          systemDialogSession: systemDialogReadView,
        }),
      );
    }

    if (
      options.registerPageLifecycle !== false &&
      typeof globalThis.addEventListener === "function"
    ) {
      const onPageHide = (): void => {
        // Stop new authoritative and persistence mutations synchronously, then
        // best-effort register the exact current Snapshot before teardown
        // releases the persistence lease.
        void terminalSupervisor
          .disposeForPageHide(() => instance.flushAutoSave())
          .catch(() => undefined);
      };
      globalThis.addEventListener("pagehide", onPageHide, { once: true });
      removePageLifecycle = () => globalThis.removeEventListener("pagehide", onPageHide);
    }
  } catch (error) {
    try {
      if (rebootstrapStart === undefined) {
        await dispose();
      } else {
        const failureHandoff = await disposeForRebootstrap();
        notifyRebootstrapStartFailure?.(
          { kind: "ready" as const, handoff: failureHandoff },
        );
      }
    } catch {
      if (rebootstrapStart !== undefined) {
        notifyRebootstrapStartFailure?.({ kind: "terminal" as const });
      }
      // The construction failure remains primary over release noise.
    }
    signalStartupFailure(startupFailureReason);
    throw error;
  }

  if (instanceLease === undefined) {
    signalStartupFailure("required_domain");
    throw new TypeError("web.instance_lease_missing");
  }
  startupDiagnostics?.signalRequiredDomainReady();
  startupAccepted = true;
  const started: StartedWebGameApplicationV1 = {
    applicationId: application.applicationId,
    host,
    provenance: resolved.application
      .provenance as DeepReadonly<BuildProvenanceV1>,
    capabilitySearch,
    instanceLease,
    isDisposed: terminalSupervisor.isDisposalStarted,
    dispose,
  };
  startedWebGameApplicationHmrControlsInternalV1.set(
    started,
    {
      invalidate: () => invalidateCoreGameApplicationForHmrInternalV1(instance),
      dispose: disposeForRebootstrap,
      ...(options.loadTextContentPackBytes === undefined
        ? {}
        : { loadTextContentPackBytes: options.loadTextContentPackBytes }),
    },
  );
  return started;
}

/**
 * Starts an HMR successor through the same Web composer while keeping its
 * exact handoff and recovery observer outside the public startup options.
 *
 * @internal
 */
export function startWebGameApplicationForRebootstrapInternalV1<
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
  options: StartWebGameApplicationForRebootstrapOptionsInternalV1,
): Promise<StartedWebGameApplicationV1> {
  const { handoff, onRebootstrapStartFailureInternal, ...ordinaryOptions } = options;
  const publicOptions: StartWebGameApplicationOptionsV1 = ordinaryOptions;
  webGameApplicationRebootstrapStartInputsInternalV1.set(
    publicOptions,
    {
      handoff,
      onFailure: onRebootstrapStartFailureInternal,
    },
  );
  return startWebGameApplicationV1(application, publicOptions);
}
