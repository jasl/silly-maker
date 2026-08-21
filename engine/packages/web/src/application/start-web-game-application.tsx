// SPDX-License-Identifier: MIT
import type { ReactElement } from "react";

import type {
  ApplicationHostCapabilitiesV1,
  BootstrapEntropyV1,
  BuildProvenanceV1,
  DeepReadonly,
  HostFilePortV1,
  RuntimeCapabilityPortV1,
} from "@sillymaker/base";
import { digestCanonical, engineDebugPatchStateKindV1 } from "@sillymaker/base";
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
import {
  clearAllCoreApplicationSavesForMaintenanceInternalV1,
  prepareCoreApplicationRestartInternalV1,
  subscribeCoreApplicationPresentationAnchorEventsInternalV1,
} from "@sillymaker/base/runtime/internal";
import type {
  DefaultGameRootLabelsV1,
  DefaultGameRootSlotsV1,
  GamepadActionMapV1,
  GameShellViewportOptionsV1,
  GameUiProjectorV1,
  HeldInputPortV1,
  HeldKeyMapV1,
  KeyboardActionMapV1,
  NativeBehaviorResetConfigV1,
  NarrativeSurfaceDefinitionV1,
  PointerActionMapV1,
  RuntimeAssetLoaderV1,
  RuntimePresentationPublicationV1,
  SaveOverlayLabelsV1,
  SystemDialogCustomSavesV1,
  WholeCanvasSurfaceDefinitionV1,
  WorkspaceOverlayDefinitionV1,
  WorkspaceOverlayPortBindingV1,
} from "@sillymaker/ui";
import type {
  DevDockContributionSetV1,
  DevDockControlV1,
  DevDockOpenStateV1,
  DevDockPositionV1,
  StateTunerPortV1,
} from "@sillymaker/ui/debug";
import {
  createDevDockControlV1,
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
  resolveOptionalGameUiManagedSurfaceCompositionInternalV1,
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
import { mountGameApplicationV1 } from "./mount-game-application.tsx";
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
import {
  createPresentationSuccessorAcknowledgmentBrokerInternalV1,
  type PresentationSuccessorAcknowledgmentBrokerInternalV1,
} from "./presentation-successor-acknowledgment.ts";
import { resolveLocalRecordsHostModeV1 } from "./resolve-local-records-host-mode.ts";

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
  /** Removes the developer-tools switch from Settings (URL opt-in remains). */
  readonly hideDeveloperToolsToggle?: boolean;
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
  /** Typed Story tooling panels with read-only / cheat authority. */
  readonly devDockContributions?: DevDockContributionSetV1;
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
   * Capability-gated lazy DevDock contributions: tooling UI loads on
   * demand and never enters the player bundle.
   */
  readonly loadDevDockContributions?: () => Promise<DevDockContributionSetV1>;
  /**
   * DevDock chip/menu corner and window cascade origin (default
   * `top_right`). Reposition when the default corner occludes application
   * chrome; bottom corners expand upward.
   */
  readonly devDockPosition?: DevDockPositionV1;
  /**
   * Render the built-in debug launcher (`StoryDebugDockV1`; default true).
   * A Story that mounts its own dock (always-on, live `info`) and opens
   * tool windows through `devDockControl` sets false.
   */
  readonly devDockChip?: boolean;
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
   * handing over the live composition read surfaces and DevDock state.
   */
  readonly debugUiContext?: (input: {
    readonly devDockOpenState: () => DevDockOpenStateV1;
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
     * Shared DevDock window control: a Story debug dock opens/closes the
     * engine tool windows (Motion Workbench, provenance, maintenance)
     * through this port instead of relying on the built-in chip.
     */
    readonly devDockControl: DevDockControlV1;
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
  readonly host: ApplicationHostCapabilitiesV1;
  /** Full build provenance for HMR identity comparison. */
  readonly provenance: DeepReadonly<BuildProvenanceV1>;
  readonly capabilitySearch: string;
  /** Multi-instance lease role (owner/waiting/read_only/lost) + takeover. */
  readonly instanceLease: WebInstanceLeasePortV1;
  isDisposed(): boolean;
  dispose(): Promise<void>;
  /**
   * Fences authoritative session and player-persistence mutation ingress for a
   * dev rebootstrap without releasing the persistence lease.
   */
  invalidateForHmr(): void;
  /**
   * Tears the application down for a dev rebootstrap and returns the
   * persistence handoff disposition for the successor.
   */
  disposeForRebootstrap(): Promise<
    DeepReadonly<PersistenceRebootstrapDisposalV1>
  >;
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

function formatDebugValidationErrorsV1(errors: readonly unknown[]): string {
  return errors.map((error) => {
    if (error !== null && typeof error === "object" && "code" in error) {
      const code = String((error as { readonly code: unknown }).code);
      const detail =
        "detail" in error && typeof (error as { readonly detail?: unknown }).detail === "string"
          ? (error as { readonly detail: string }).detail
          : undefined;
      return detail === undefined || detail.length === 0 ? code : `${code}: ${detail}`;
    }
    return String(error);
  }).join("; ");
}

function createEngineStateTunerPortV1(input: {
  readonly instance: {
    readonly admin: {
      inspectForTest(): { readonly snapshot: { readonly state: unknown } };
      readonly debugControl?: {
        execute(
          command: never,
          isCapabilityEnabled: () => boolean,
        ): Promise<
          | {
            readonly kind: "executed";
            readonly attempt: { readonly result: { readonly kind: string } };
          }
          | { readonly kind: "validation_failed"; readonly errors: readonly unknown[] }
          | { readonly kind: "capability_disabled" }
          | { readonly kind: "not_executed"; readonly code: string }
        >;
      };
    };
    readonly semantic: { subscribe(listener: () => void): () => void };
  };
  readonly capabilities: RuntimeCapabilityPortV1;
}): StateTunerPortV1 {
  const { instance, capabilities } = input;
  return Object.freeze({
    read: () => instance.admin.inspectForTest().snapshot.state,
    subscribe: (listener: () => void) => instance.semantic.subscribe(listener),
    async patch(path: readonly string[], value: string | number | boolean | null) {
      const debugControl = instance.admin.debugControl;
      if (debugControl === undefined) {
        return Object.freeze({
          kind: "rejected" as const,
          message: "需要重新加载后才能写入（启动时未开启开发者工具）",
        });
      }
      const result = await debugControl.execute(
        Object.freeze({
          kind: engineDebugPatchStateKindV1,
          path: Object.freeze([...path]),
          value,
        }) as never,
        () => {
          const state = capabilities.state.getCurrent();
          return state.debugTools && state.cheats;
        },
      );
      switch (result.kind) {
        case "executed":
          return result.attempt.result.kind === "committed"
            ? Object.freeze({ kind: "committed" as const })
            : Object.freeze({
              kind: "rejected" as const,
              message: result.attempt.result.kind,
            });
        case "validation_failed":
          return Object.freeze({
            kind: "validation_failed" as const,
            message: formatDebugValidationErrorsV1(result.errors),
          });
        case "capability_disabled":
          return Object.freeze({ kind: "capability_disabled" as const });
        case "not_executed":
          return Object.freeze({ kind: "rejected" as const, message: result.code });
        default: {
          const exhaustive: never = result;
          throw new TypeError(`unknown debug result ${String(exhaustive)}`);
        }
      }
    },
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
  const rootElement = options.rootElement ??
    (typeof document === "undefined" ? null : document.querySelector("#root"));
  if (!(rootElement instanceof HTMLElement)) {
    throw new TypeError("web.application_root_missing");
  }

  // The default composer owns the engine theme baseline. Loading it here
  // (not at module scope) keeps custom Roots on their own style composition.
  await import("@sillymaker/ui/styles.css");

  // Both local channels persist through the HTTP record store. Only the
  // injected marker identifies the Desktop shell, whose private file-download
  // endpoint is unavailable to the query-only browser save server.
  const { desktopShellCapability, usesDesktopShell, wantsLocalRecords } =
    resolveLocalRecordsHostModeV1(
      typeof location === "undefined" ? "" : location.search,
      Reflect.get(globalThis, "__SILLYMAKER_RECORDS__"),
      Reflect.get(globalThis, "__SILLYMAKER_DESKTOP_CAPABILITY__"),
    );
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

  const capabilitySearch = options.capabilitySearch ??
    (typeof location === "undefined" ? "" : location.search);
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
    throw new TypeError(
      `web.application_resolution_failed:${resolved.failure.code}`,
    );
  }

  const applicationBuildId = appBuildIdV1(application.buildIdentityInput);
  // One lease identity per started instance: multi-tab/-window mutual
  // exclusion (and the instancePolicy roles) requires distinct owners.
  const leaseOwnerId =
    `owner.sillymaker.web.${application.applicationId}.${nextApplicationUuidV4()}`;
  const instance = await createCoreGameApplicationInstanceV1(
    resolved.application,
    {
      host: Object.freeze({
        entropy: gameBootstrapEntropy,
        records: host.records,
        now: () => host.metadataClock.now(),
        ownerId: leaseOwnerId as never,
        nextHandoffRequestId: () =>
          `handoff.${application.applicationId}.${nextApplicationUuidV4()}`,
      }),
      capabilities: { debugTools: capabilities.state.getCurrent().debugTools },
      capabilityState: capabilities.state,
      autosave: options.autosave ?? application.autosave ?? defaultWebAutosavePolicyV1,
      ...(applicationBuildId === null ? {} : { appBuildId: applicationBuildId }),
      ...(options.rebootstrapDisposition === undefined
        ? {}
        : { rebootstrapDisposition: options.rebootstrapDisposition }),
    },
  );

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
    fenceSteps: Object.freeze([
      Object.freeze({ name: "automation", run: () => automation?.dispose() }),
      Object.freeze({ name: "pointer", run: () => pointer?.dispose() }),
      Object.freeze({
        name: "presentation",
        run: () => {
          if (composition !== undefined) {
            sealHostedGameUiCompositionTerminalInternalV1(composition);
          }
        },
      }),
      // Core invalidation can synchronously notify cancellation observers. It
      // runs only after every held Host/UI ingress has become inert.
      Object.freeze({ name: "core", run: () => instance.invalidateForHmr() }),
    ]),
    cleanupSteps: Object.freeze([
      Object.freeze({
        name: "page_lifecycle",
        run: () => removePageLifecycle?.(),
      }),
      Object.freeze({
        name: "desktop_close_flush",
        run: () => removeDesktopCloseFlush?.(),
      }),
      Object.freeze({ name: "root", run: () => mounted?.unmount() }),
      Object.freeze({
        name: "debug_ui_context",
        run: () => unbindUiContext?.(),
      }),
      Object.freeze({
        name: "native_behavior",
        run: () => nativeBehaviorReset?.dispose(),
      }),
      Object.freeze({
        name: "held_input",
        run: () => heldKeyUninstall?.(),
      }),
      Object.freeze({
        name: "presentation_pacing",
        run: () => presentationPacing?.dispose(),
      }),
      Object.freeze({
        name: "presentation_freeze",
        run: () => unbindPresentationFreeze?.(),
      }),
      Object.freeze({ name: "composition", run: () => composition?.dispose() }),
      Object.freeze({
        name: "successor_acknowledgments",
        run: () => successorAcknowledgments?.dispose(),
      }),
      Object.freeze({ name: "story_ui", run: () => uiDisposer?.() }),
      Object.freeze({
        name: "instance_lease",
        run: () => instanceLease?.dispose(),
      }),
      Object.freeze({
        name: "capabilities",
        run: () => capabilities.dispose(),
      }),
    ]),
    releaseCorePersistence: () => instance.disposeForRebootstrap(),
    reportFailure: (step, error) =>
      reportFailure(
        "web.application_disposal_step_failed",
        new Error(step, { cause: error }),
      ),
  });
  const signalTerminal = (error: Error): void => {
    const first = terminalSupervisor.getTerminalError() === null;
    terminalSupervisor.signalTerminal(error);
    if (first) reportFailure(error.message, error);
  };
  successorAcknowledgments = createPresentationSuccessorAcknowledgmentBrokerInternalV1({
    signalTerminal,
  });
  const composedLifecycle = createCompositionBoundRestartLifecycleInternalV1({
    prepareRestart: () => prepareCoreApplicationRestartInternalV1(instance),
    acknowledgments: successorAcknowledgments,
    terminal: Object.freeze({
      getTerminalError: terminalSupervisor.getTerminalError,
      terminate(error: Error): Promise<never> {
        signalTerminal(error);
        return terminalSupervisor.terminate(error);
      },
    }),
  });
  const disposeForRebootstrap = (): Promise<
    DeepReadonly<PersistenceRebootstrapDisposalV1>
  > => {
    return terminalSupervisor.disposeForRebootstrap();
  };
  const dispose = async (): Promise<void> => {
    await disposeForRebootstrap();
  };

  try {
    removeDesktopCloseFlush = installDesktopCloseFlushV1({
      enabled: usesDesktopShell,
      fence: () => instance.invalidateForHmr(),
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
      claimOnStart: options.rebootstrapDisposition === undefined,
    });
    instanceLease = instanceLeaseCoordinator;
    const devDockControl = createDevDockControlV1();
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
      instanceLease: instanceLeaseCoordinator,
      assetLoader: options.assetLoader ??
        createBrowserImageLoaderV1({
          resolveRuntimeUrl: (runtimePath) => new URL(runtimePath, document.baseURI).href,
          createImage: () => new Image(),
        }),
      playerProfile,
      files: host.files,
      capabilities,
      devDockControl,
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
      return Object.freeze({
        title: titleScreenInput.title,
        backgroundUrl: titleScreenInput.backgroundUrl ?? null,
        splash: titleScreenInput.splash === undefined ? null : Object.freeze({
          lines: Object.freeze([...titleScreenInput.splash.lines]),
          durationMs: titleScreenInput.splash.durationMs ?? null,
        }),
        beginNewGame: beginNewGame === undefined
          ? null
          : () =>
            Reflect.apply(beginNewGame, titleScreenInput, [
              instance.semantic,
            ]),
      });
    })();
    const wholeCanvas = wholeCanvasDefinition === null && normalizedTitleScreen === null
      ? null
      : (() => {
        const labels = Object.freeze({
          ...defaultGameRootLabelsV1,
          ...uiDefinition.labels,
        });
        return Object.freeze({
          definition: wholeCanvasDefinition,
          titleScreen: normalizedTitleScreen,
          lifecycle: composedLifecycle,
          savePort: saveSurfaces.saveUi?.port ??
            (saveSurfaces.customSaves === undefined ? null : saveSurfaces.maintenance.savePort),
          customSavesConfigured: saveSurfaces.customSaves !== undefined,
          labels: Object.freeze({
            newGame: labels.titleNewGameLabel,
            newGameFailed: labels.titleNewGameFailedText,
            continue: labels.titleContinueLabel,
            load: labels.titleLoadGameLabel,
            settings: labels.titleSettingsLabel ?? labels.settingsLabel,
          }),
        });
      })();
    const hostedSurfaceDefinitions = narrativeDefinition === null && wholeCanvas === null
      ? null
      : Object.freeze({
        narrative: narrativeDefinition,
        wholeCanvas,
        environment: Object.freeze({
          playerProfile,
          presentationClock: presentationFreeze.clock,
          prefersReducedMotion: () =>
            typeof globalThis.window.matchMedia === "function" &&
            globalThis.window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches,
        }),
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
        anchorEvents: Object.freeze({
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
                  Object.freeze({
                    anchor: event.anchor,
                    token: event.publicationContext,
                  }),
                );
              },
            ),
        }),
        successorProducer: successorAcknowledgments.producer,
        reportFailure,
      },
      hostedSurfaceDefinitions,
    );
    unbindPresentationFreeze = presentationFreeze.bindInputRouterInternalV1(composition.input);
    // Pacing installs whenever any of its duties can arise: declared time
    // reporting, a declared realtime span, or a narrative runtime whose
    // engine-typed `pace: "realtime"` holds must pin the rate even when the
    // Story declares neither composer member.
    const pacingNarrative =
      resolveOptionalGameUiManagedSurfaceCompositionInternalV1(composition)?.narrative ?? null;
    if (
      uiDefinition.timeReporting !== undefined || uiDefinition.realtimeWindow !== undefined ||
      pacingNarrative !== null
    ) {
      presentationPacing = installPresentationPacingInternalV1({
        presentation: composition.presentation,
        narrative: pacingNarrative,
        rate: presentationRate,
        // The freeze-wrapped clock: frozen presentation stops session time
        // with everything else, and realtime pins reshape hold ticks too.
        clock: presentationFreeze.clock,
        timeReporting: uiDefinition.timeReporting ?? null,
        realtimeWindow: uiDefinition.realtimeWindow ?? null,
        visibility: Object.freeze({
          isHidden: () => document.visibilityState === "hidden",
          subscribe: (listener: () => void) => {
            document.addEventListener("visibilitychange", listener);
            return () => document.removeEventListener("visibilitychange", listener);
          },
        }),
        reportFailure,
      });
    }

    automation = installBrowserAutomationBridgeV1({
      semantic: instance.semantic,
      capabilities,
    });

    // DevDock open state feeds the diagnostics UI context without giving
    // the resident player DOM any debug vocabulary.
    let devDockOpenState: DevDockOpenStateV1 = Object.freeze({ open: false });
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
    const rootNode: ReactElement = (
      <DefaultGameRootV1
        composition={composition}
        semantic={instance.semantic}
        accessibleName={application.accessibleName}
        applicationId={application.applicationId}
        viewport={application.viewport}
        capabilities={capabilities}
        playerProfile={playerProfile}
        lifecycle={composedLifecycle}
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
        {...(uiDefinition.hideDeveloperToolsToggle === undefined
          ? {}
          : { hideDeveloperToolsToggle: uiDefinition.hideDeveloperToolsToggle })}
        sessionMaintenance={Object.freeze({
          savePort: saveSurfaces.maintenance.savePort,
          clearAllSaves: saveSurfaces.maintenance.clearAllSaves,
          reloadCurrentState,
          faultCause: Object.freeze({
            getCurrent: () => instance.admin.lastFaultCause(),
            // Faults flip the session status, and the semantic port's
            // subscribe passes session publishes through.
            subscribe: (listener: () => void) => instance.semantic.subscribe(listener),
          }),
        })}
        stateTuner={createEngineStateTunerPortV1({ instance, capabilities })}
        {...(uiDefinition.labels === undefined ? {} : { labels: uiDefinition.labels })}
        {...(uiDefinition.slots === undefined ? {} : { slots: uiDefinition.slots })}
        {...(uiDefinition.devDockContributions === undefined
          ? {}
          : { devDockContributions: uiDefinition.devDockContributions })}
        devDock={Object.freeze({
          ...(uiDefinition.loadDevDockContributions === undefined
            ? {}
            : { load: uiDefinition.loadDevDockContributions }),
          ...(uiDefinition.devDockPosition === undefined
            ? {}
            : { position: uiDefinition.devDockPosition }),
          ...(uiDefinition.devDockChip === undefined ? {} : { chip: uiDefinition.devDockChip }),
          control: devDockControl,
          freeze: presentationFreeze,
          rate: presentationRate,
          observeOpenState: (state: DevDockOpenStateV1) => {
            devDockOpenState = state;
          },
        })}
        {...(rootInputMaps === undefined ? {} : { inputMaps: rootInputMaps })}
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
      const systemDialogReadView = Object.freeze({
        getSnapshot: () => systemDialogSession.getSnapshot(),
      });
      unbindUiContext = instance.bindDebugUiContext(
        uiDefinition.debugUiContext({
          devDockOpenState: () => devDockOpenState,
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
      await dispose();
    } catch {
      // The construction failure remains primary over release noise.
    }
    throw error;
  }

  if (instanceLease === undefined) {
    throw new TypeError("web.instance_lease_missing");
  }
  return Object.freeze({
    applicationId: application.applicationId,
    host,
    provenance: resolved.application
      .provenance as DeepReadonly<BuildProvenanceV1>,
    capabilitySearch,
    instanceLease,
    isDisposed: terminalSupervisor.isDisposalStarted,
    dispose,
    invalidateForHmr: () => instance.invalidateForHmr(),
    disposeForRebootstrap,
  });
}
