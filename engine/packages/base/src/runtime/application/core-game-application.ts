// SPDX-License-Identifier: MIT
import type { SessionLeaseOwnerId } from "../../contracts/application.ts";
import type { TransientEffectRequestV1, TransientEffectV1 } from "../../contracts/asset-demand.ts";
import type { NarrativeAsidePageV1, NarrativeAsideV1 } from "../../contracts/narrative-aside.ts";
import { parseNarrativeAsidePagesV1 } from "../../contracts/narrative-aside.ts";
import type { SemanticGamePortSourceV1, SemanticGamePortV1 } from "../../contracts/application.ts";
import type {
  StageCueDispatchBatchV1,
  StageCueDispatchV1,
} from "../../contracts/stage-transition.ts";
import { parseStageCueDispatchesV1 } from "../../contracts/stage-transition.ts";
import type { BuildIdentityInputV1 } from "../../authoring/build-identity.ts";
import { resolveGamePackageV1 } from "../../authoring/story-resolver.ts";
import { digestBytes, digestCanonical } from "../../contracts/digest.ts";
import type { GamePackageV1 } from "../../contracts/game-package.ts";
import type {
  BootstrapEntropyV1,
  GameSimulationTypeMapV1,
  GameSimulationV1,
} from "../../contracts/gameplay-module.ts";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "../../contracts/host.ts";
import type { PatchSetAdoptionDeclarationV1 } from "../../contracts/hotfix.ts";
import { parsePersistenceSafepointPolicyV1 } from "../../contracts/persistence-safepoint.ts";
import type {
  PersistenceSafepointClassificationV1,
  PersistenceSafepointPolicyV1,
} from "../../contracts/persistence-safepoint.ts";
import {
  createTransactionalRngV1,
  parseRngSeedInternalV1,
  RngStateSchemaFailureInternalV1,
  rngStateV1Schema,
} from "../../contracts/rng.ts";
import {
  acceptCoreTypedCommandAttemptInternalV1,
  type CoreTypedEvidencePolicyInternalV1,
  type FinalizedEvidenceResultConstraintInternalV1,
} from "../../internal/finalized-evidence-admission.ts";
import { admitCanonicalBootstrapInternalV1 } from "../../internal/canonical-bootstrap-admission.ts";
import type {
  RuntimeSessionStatusV1,
  SessionAnchorResultV1,
  SessionFaultCauseV1,
} from "../../contracts/session-status.ts";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
  parseRunIntegrityReasonV1,
} from "../../contracts/snapshot.ts";
import type { RunIntegrityV1 } from "../../contracts/snapshot.ts";
import type {
  SaveStateContractIdentityV1,
  SaveStateMigrationRegistryV1,
} from "../../contracts/save-state-migration.ts";
import {
  assertSaveStateMigrationRegistryCurrentIdentityInternalV1,
  readSaveStateMigrationRegistryInternalV1,
} from "../../contracts/save-state-migration.ts";
import { finalizeSnapshotIntegrityV1 } from "../session/run-integrity.ts";
import type { DeepReadonly, Digest, NonNegativeSafeInteger } from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.ts";
import type { SnapshotWorkInstrumentationV1 } from "../../internal/snapshot-work-instrumentation.ts";
import type { ReplayComparisonV1 } from "../diagnostics/replay.ts";
import { replayAuthoritativelyFromAttemptsInternalV1 } from "../diagnostics/replay.ts";
import {
  executeEngineStatePatchV1,
  isEngineDebugPatchStateKindV1,
  isEngineDebugPatchValidationErrorV1,
  validateEngineStatePatchV1,
} from "../diagnostics/state-patch.ts";
import type { RuntimeOperationFaultV1 } from "../../contracts/diagnostics.ts";
import {
  createRuntimeFailureBufferV1,
  createRuntimeFailureReporterV1,
} from "../diagnostics/runtime-failures.ts";
import type {
  AuthoritativeReplacementPublicationContextInternalV1,
  AuthoritativeOutcomeV1,
  GameSessionDebugAnchorV1,
  GameSessionCompositionV1,
  GameSessionDebugControlV1,
  GameSessionDebugInputV1,
  GameSessionInputV1,
  GameSessionRuntimeControlV1,
  GameSessionV1,
} from "../session/game-session.ts";
import {
  createAuthoritativeReplacementPublicationContextInternalV1,
  createCoreGameSessionInternalV1,
  readActiveAuthoritativeReplacementPublicationContextInternalV1,
} from "../session/game-session.ts";
import type {
  CreateStandardPersistenceServiceOptionsV1,
  PersistenceRebootstrapHandoffInternalV1,
  PersistenceServiceV1,
  SaveSummaryProjectionInstrumentationInternalV1,
} from "../persistence/persistence-service.ts";
import {
  adoptPersistenceRebootstrapHandoffInternalV1,
  admitAdoptionDeclarationsInternalV1,
  bindPersistenceAnchorReplacementInternalV1,
  captureAutoSaveWithReceiptInternalV1,
  createInstrumentedPersistenceServiceV1,
  createPersistenceServiceV1,
  disposePersistenceForRebootstrapInternalV1,
  fencePersistencePlayerMutationsInternalV1,
  importWithReplacementCommitInternalV1,
  loadWithReplacementCommitInternalV1,
} from "../persistence/persistence-service.ts";
import { createSemanticGamePortV1 } from "./semantic-game-port.ts";

type SessionDispatchResultOfV1<TTypes extends GameSimulationTypeMapV1> = Awaited<
  ReturnType<GameSessionV1<TTypes>["dispatch"]>
>;

type CoreSaveMaintenanceOperationV1 = () => Promise<void>;
type CoreSaveMaintenanceBarrierResultV1 = { readonly kind: "cleared" } | {
  readonly kind: "failed";
  readonly message: string;
};

const coreSaveMaintenanceOperationsV1 = new WeakMap<object, CoreSaveMaintenanceOperationV1>();

export interface PreparedCoreApplicationRestartInternalV1 {
  readonly publicationContext: AuthoritativeReplacementPublicationContextInternalV1;
  run(): Promise<SessionAnchorResultV1>;
}

export interface CorePresentationAnchorEventInternalV1 {
  readonly anchor: CorePresentationAnchorV1;
  readonly publicationContext: AuthoritativeReplacementPublicationContextInternalV1 | null;
}

interface CoreApplicationCompositionControlInternalV1 {
  prepareRestart(): PreparedCoreApplicationRestartInternalV1;
  subscribePresentationAnchorEvents(
    listener: (event: CorePresentationAnchorEventInternalV1) => void,
  ): () => void;
}

const coreApplicationCompositionControlsInternalV1 = new WeakMap<
  object,
  CoreApplicationCompositionControlInternalV1
>();

function coreApplicationCompositionControlInternalV1(
  instance: object,
): CoreApplicationCompositionControlInternalV1 {
  const control = coreApplicationCompositionControlsInternalV1.get(instance);
  if (control === undefined) {
    throw new TypeError("core.application_internal_unavailable");
  }
  return control;
}

/** @internal Allocates the exact replacement context before its one-shot restart begins. */
export function prepareCoreApplicationRestartInternalV1(
  instance: object,
): PreparedCoreApplicationRestartInternalV1 {
  return coreApplicationCompositionControlInternalV1(instance).prepareRestart();
}

/** @internal Observes committed anchors with their exact Session publication context. */
export function subscribeCoreApplicationPresentationAnchorEventsInternalV1(
  instance: object,
  listener: (event: CorePresentationAnchorEventInternalV1) => void,
): () => void {
  if (typeof listener !== "function") {
    throw new TypeError("core.presentation_anchor_event_listener_invalid");
  }
  return coreApplicationCompositionControlInternalV1(instance).subscribePresentationAnchorEvents(
    listener,
  );
}

function createDeferredV1<TValue>(): {
  readonly promise: Promise<TValue>;
  readonly resolve: (value: TValue | PromiseLike<TValue>) => void;
  readonly reject: (reason?: unknown) => void;
} {
  let resolve!: (value: TValue | PromiseLike<TValue>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

/**
 * Package-internal Web composition seam. The maintenance operation stays off
 * the ordinary Core instance and player persistence ports.
 *
 * @internal
 */
export function clearAllCoreApplicationSavesForMaintenanceInternalV1(
  instance: object,
): Promise<void> {
  const operation = coreSaveMaintenanceOperationsV1.get(instance);
  if (operation === undefined) {
    return Promise.reject(new TypeError("core.save_maintenance_unavailable"));
  }
  return operation();
}

export type CoreAttemptForV1<TTypes extends GameSimulationTypeMapV1> = ReturnType<
  GameSessionDebugInputV1<TTypes>["normalizeUnexpectedFault"]
>;

/**
 * The Story-provided semantic adaptation a core application cannot own:
 * queries, projections, the action catalog, previews, and the
 * invocation-to-command mapping. Everything else (session, semantic port,
 * persistence, diagnostics, lifecycle) is generic composer machinery.
 */
export interface CoreSemanticAdapterV1<
  TTypes extends GameSimulationTypeMapV1,
  TQueries,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
> {
  createQueries(state: DeepReadonly<TTypes["state"]>): TQueries;
  projectGameView(queries: TQueries): TGameView;
  projectNarrativeView(queries: TQueries): TNarrativeView;
  actions(queries: TQueries): readonly TActionDescriptor[];
  preview(queries: TQueries, invocation: DeepReadonly<TInvocation>): TPreview;
  parseInvocation(value: unknown): TInvocation;
  commandForInvocation(invocation: DeepReadonly<TInvocation>): TTypes["command"];
  projectDispatchResult(result: SessionDispatchResultOfV1<TTypes>): TResult;
  invalidInvocationResult(): TResult;
  /**
   * Optional commit-only transient effects (for example SFX occurrences)
   * derived from committed domain events. The instance stamps a monotonic
   * sequence and the current presentation epoch; effects never enter State,
   * Saves, publications, or Agent transcripts.
   */
  projectTransientEffects?(
    events: readonly DeepReadonly<TTypes["event"]>[],
  ): readonly TransientEffectRequestV1[];
  /**
   * Optional presentation edge context (cue-identity proposal, accepted
   * 2026-08-17): the scene cue dispatches (and whole-scene opens) this
   * commit performed, derived from its committed events. The instance admits
   * the list once (id patterns, bound), stamps it with the commit's
   * semantic revision and presentation epoch, and keeps only the latest
   * batch; the context never enters State, Saves, digests, replay, or
   * command identity.
   */
  projectStageCueDispatches?(
    events: readonly DeepReadonly<TTypes["event"]>[],
  ): readonly StageCueDispatchV1[];
  /**
   * Optional zero-authority aside dialogue (narrative-aside proposal,
   * opened 2026-08-27): a one-shot batch of dialogue pages this commit
   * presents alongside the current pending interaction (typically a
   * running hold). The instance admits the page list once, stamps it with
   * a monotonic per-instance sequence plus the presentation epoch at
   * commit time, and pushes it to `subscribeNarrativeAsides`. Asides never
   * enter State, Saves, digests, replay, publications, or command
   * identity; an empty list means "no aside this commit".
   */
  projectNarrativeAside?(
    events: readonly DeepReadonly<TTypes["event"]>[],
  ): readonly NarrativeAsidePageV1[];
}

/**
 * Author-authored core application definition: the GamePackage entry, the
 * semantic adapter, validators, and diagnostics extensions. No Host handle,
 * no React, no live resource; definitions are reusable declarations.
 */
export interface CoreGameApplicationDefinitionV1<
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
> {
  readonly entry: GamePackageV1<TSimulationFacet, TPresentationFacet>;
  /**
   * Optional factory-produced aggregate-State migration declaration.
   * Resolution validates its exact identity and current State target. Import
   * and load execute an available exact suffix through staged persistence;
   * inspection, stored export, and annotation never execute callbacks.
   */
  readonly saveStateMigrations?: SaveStateMigrationRegistryV1;
  /** Explicit finite Save compatibility declarations, admitted before composition. */
  readonly adoptionDeclarations?: readonly PatchSetAdoptionDeclarationV1[];
  readonly semantic: CoreSemanticAdapterV1<
    TTypes,
    TQueries,
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult
  >;
  validateReferences?(state: DeepReadonly<TTypes["state"]>, resolved: unknown): readonly string[];
  validateInvariants?(
    view: {
      readonly state: DeepReadonly<TTypes["state"]>;
      readonly commandSequence: NonNegativeSafeInteger;
    },
    resolved: unknown,
  ): readonly string[];
  readonly exportFilename?: string;
  /**
   * Numbered player-writable manual slots (`manual.1`..`manual.N`) this
   * application exposes beside `quick` and the two autosave slots.
   * Defaults to the engine's `defaultManualSaveSlotCountV1` (8); range 0..99.
   * Zero keeps only quick save and the two automatic slots.
   */
  readonly manualSaveSlotCount?: number;
  /**
   * Optional Save summary projector: display lines captured into every
   * written record's annotation (custom slot pickers may consume them; see
   * `SaveAnnotationV1`). Must be deterministic for a given state.
   */
  summarizeSave?(state: DeepReadonly<TTypes["state"]>): readonly string[] | null;
  /**
   * Optional authoritative reconciliation for an exact rebootstrap successor.
   * After the predecessor's exact Save and lease have been adopted, Core hands
   * this synchronous pure projector the adopted Snapshot, resolved game, and
   * the successor's already-prepared execution context.
   * `null` keeps that Snapshot unchanged; a command is dispatched once through
   * the ordinary Session queue and must commit before construction continues.
   * Rejection, fault, or a throwing projector fails construction and leaves the
   * existing latest-handoff recovery responsible for the retryable successor.
   * Ordinary boot, load, and import never invoke this projector.
   */
  projectRebootstrapCommand?(
    snapshot: DeepReadonly<TTypes["snapshot"]>,
    resolved: unknown,
    executionContext: TTypes["executionContext"],
  ): DeepReadonly<TTypes["command"]> | null;
  /**
   * Opt-in boot-time resume: after persistence is ready the instance
   * loads `auto.current` when it holds a runnable autosave, so a fresh
   * page (or headless host) continues the previous session instead of
   * bootstrapping a new one. An empty or incompatible slot silently
   * keeps the fresh bootstrap. This is what makes a title-screen
   * "Continue" button truthful.
   */
  readonly resumeFromAutosave?: boolean;
  /**
   * Opt-in persistence safepoint policy: a deterministic classifier over
   * committed authoritative state plus an admission-enforced bound on
   * consecutive in-flight commits. While the live state classifies
   * `in_flight`, the orchestrator defers autosave, close-time flushes fall
   * back to the most recent safepoint Snapshot, and player-slot saves
   * reject with `in_flight`. Absent means every commit is a safepoint
   * (the historical behavior). Resolution rejects an invalid or unbounded
   * declaration (`persistence_safepoint.invalid`).
   */
  readonly persistenceSafepoint?: PersistenceSafepointPolicyV1<DeepReadonly<TTypes["state"]>>;
  /** Opt-in player rollback policy; absent means the port reports unconfigured. */
  readonly rollback?: CoreRollbackPolicyV1<TTypes["command"]>;
  normalizeUnexpectedDispatchFault?(
    error: unknown,
    snapshot: DeepReadonly<TTypes["snapshot"]>,
  ): CoreAttemptForV1<TTypes>;
  /** Debug-command counterpart of the dispatch fault normalizer. */
  normalizeUnexpectedDebugFault?(
    error: unknown,
    snapshot: DeepReadonly<TTypes["snapshot"]>,
  ): CoreAttemptForV1<TTypes>;
  /**
   * Optional Story-owned application extensions (diagnostics services,
   * DebugBundle codecs, debug tooling facades). The composer constructs
   * them with a controlled context after the session and persistence
   * exist, owns their lifecycle, and disposes them with the instance —
   * Story entries never assemble engine services by hand.
   */
  createExtensions?(context: CoreApplicationExtensionContextV1<TTypes>): {
    readonly extensions: unknown;
    dispose?(): void;
  };
}

/**
 * The controlled internals handed to `createExtensions`: read surfaces and
 * queue-front evidence, never raw setters. Extensions observe; the session
 * and persistence remain the only authorities.
 */
export interface CoreApplicationExtensionContextV1<TTypes extends GameSimulationTypeMapV1> {
  readonly provenance: Record<string, unknown>;
  readonly appBuildId: Digest | null;
  /** The resolved game (reference sets, tooling, catalogs) for validators. */
  readonly resolved: unknown;
  readonly session: {
    getCurrentSnapshot(): DeepReadonly<TTypes["snapshot"]>;
    getStatus(): RuntimeSessionStatusV1;
    subscribe(listener: () => void): () => void;
  };
  readonly runtimeControl: GameSessionCompositionV1<TTypes>["runtimeControl"];
  readonly commandLog: GameSessionCompositionV1<TTypes>["commandLog"];
  readonly debugControl: GameSessionCompositionV1<TTypes>["debugControl"];
  readonly invalidationController: GameSessionCompositionV1<TTypes>["invalidationController"];
  readonly persistence: PersistenceServiceV1<TTypes["snapshot"]>;
  runtimeFailures(): readonly RuntimeOperationFaultV1[];
  /** The live capability view source (getCurrent + subscribe). */
  readonly capabilityState: {
    getCurrent(): {
      readonly debugTools: boolean;
      readonly cheats: boolean;
      readonly automationBridge: boolean;
    };
    subscribe(listener: () => void): () => void;
  };
  readonly metadataClock: { now(): IsoUtcInstant };
  reportFailure(error: unknown): void;
  createInitialSnapshot(): TTypes["snapshot"];
  /**
   * The latest faulted attempt with its triggering command, kept as
   * instance-local debug evidence. Story diagnostics scrub it before any
   * export; it never enters publications or Saves.
   */
  latestAttemptFailure():
    | {
      readonly source: "game" | "debug";
      readonly command: unknown;
      readonly attempt: unknown;
    }
    | undefined;
  /** Late-bound presentation context reader for DebugBundle exports. */
  readUiContext(): unknown;
}

export function defineCoreGameApplicationV1<
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
>(
  definition: CoreGameApplicationDefinitionV1<
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
  >,
): CoreGameApplicationDefinitionV1<
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
> {
  const adoptionDeclarations = captureCoreAdoptionDeclarationsV1(definition);
  const captured = { ...definition, adoptionDeclarations };
  if (typeof captured.entry?.define !== "function") {
    throw new TypeError("core application definition requires a GamePackage entry");
  }
  if (typeof captured.semantic?.parseInvocation !== "function") {
    throw new TypeError("core application definition requires a semantic adapter");
  }
  if (captured.saveStateMigrations !== undefined) {
    readSaveStateMigrationRegistryInternalV1(captured.saveStateMigrations);
  }
  return captured;
}

function captureCoreAdoptionDeclarationsV1(
  definition: object,
): readonly DeepReadonly<PatchSetAdoptionDeclarationV1>[] {
  const adoptionDeclarations = admitAdoptionDeclarationsInternalV1(
    (definition as { readonly adoptionDeclarations?: unknown }).adoptionDeclarations ??
      [],
  );
  return adoptionDeclarations;
}

interface ResolvedGamePackageSliceV1 {
  readonly provenance: {
    readonly story: {
      readonly id: string;
      readonly revision: number;
      readonly digest: Digest;
    };
    readonly resolved: SaveStateContractIdentityV1;
  };
}

/** Resolved typed definition: reusable across instances, no live resource. */
export interface ResolvedCoreGameApplicationV1<
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
> {
  readonly definition: CoreGameApplicationDefinitionV1<
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
  readonly resolved: unknown;
  readonly provenance: ResolvedGamePackageSliceV1["provenance"] & Record<string, unknown>;
  readonly storyId: string;
  readonly storyRevision: number;
}

export type ResolveCoreGameApplicationResultV1<TResolvedApplication> =
  | { readonly kind: "resolved"; readonly application: TResolvedApplication }
  | {
    readonly kind: "failed";
    readonly failure: {
      readonly code: string;
      readonly details: Record<string, unknown>;
    };
  };

const composerValidationDigestV1 = digestBytes(Uint8Array.of(0x63, 0x6f, 0x72));

/** Resolution needs a build identity; this synthetic one never leaves the composer. */
const defaultComposerBuildIdentityV1: BuildIdentityInputV1 = {
  engineVersion: "SillyMaker core composer",
  engine: [
    {
      path: "core-composer/engine.ts",
      sha256: composerValidationDigestV1,
      facet: "engine" as const,
    },
  ],
  storySimulation: [
    {
      path: "core-composer/simulation.ts",
      sha256: composerValidationDigestV1,
      facet: "story_simulation" as const,
    },
  ],
  storyPresentation: [
    {
      path: "core-composer/presentation.ts",
      sha256: composerValidationDigestV1,
      facet: "story_presentation" as const,
    },
  ],
  application: [],
};

export interface ResolveCoreGameApplicationOptionsV1 {
  readonly buildIdentityInput?: BuildIdentityInputV1;
}

/**
 * Resolves the definition's GamePackage into a reusable resolved
 * application, reporting resolution failures structurally instead of
 * throwing.
 */
export function resolveCoreGameApplicationV1<
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
>(
  definition: CoreGameApplicationDefinitionV1<
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
  >,
  options: ResolveCoreGameApplicationOptionsV1 = {},
): ResolveCoreGameApplicationResultV1<
  ResolvedCoreGameApplicationV1<
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
  >
> {
  let adoptionDeclarations: readonly DeepReadonly<PatchSetAdoptionDeclarationV1>[];
  try {
    adoptionDeclarations = captureCoreAdoptionDeclarationsV1(definition);
  } catch {
    return {
      kind: "failed" as const,
      failure: {
        code: "save_adoption_declarations.invalid",
        details: {},
      },
    };
  }
  let persistenceSafepoint:
    | PersistenceSafepointPolicyV1<DeepReadonly<TTypes["state"]>>
    | undefined;
  try {
    // An unbounded or malformed span declaration never resolves: the bound
    // is what keeps in-flight spans from starving the Save.
    persistenceSafepoint = definition.persistenceSafepoint === undefined
      ? undefined
      : parsePersistenceSafepointPolicyV1(definition.persistenceSafepoint);
  } catch {
    return {
      kind: "failed" as const,
      failure: {
        code: "persistence_safepoint.invalid",
        details: {},
      },
    };
  }
  const admittedDefinition = {
    ...definition,
    adoptionDeclarations,
    ...(persistenceSafepoint === undefined ? {} : { persistenceSafepoint }),
  };
  const result = resolveGamePackageV1(
    admittedDefinition.entry,
    [],
    options.buildIdentityInput ?? defaultComposerBuildIdentityV1,
  );
  if (result.kind === "failed") {
    return {
      kind: "failed" as const,
      failure: {
        code: result.failure.code,
        details: { ...result.failure.details },
      },
    };
  }
  const resolved = result.resolved as unknown as ResolvedGamePackageSliceV1;
  if (admittedDefinition.saveStateMigrations !== undefined) {
    try {
      assertSaveStateMigrationRegistryCurrentIdentityInternalV1(
        admittedDefinition.saveStateMigrations,
        {
          stateContractRevision: resolved.provenance.resolved.stateContractRevision,
          stateContractDigest: resolved.provenance.resolved.stateContractDigest,
        },
      );
    } catch {
      return {
        kind: "failed" as const,
        failure: {
          code: "save_state_migration.current_identity_mismatch",
          details: {},
        },
      };
    }
  }
  return {
    kind: "resolved" as const,
    application: {
      definition: admittedDefinition,
      resolved: result.resolved,
      provenance: resolved.provenance as ResolvedCoreGameApplicationV1<
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
      >["provenance"],
      storyId: resolved.provenance.story.id,
      storyRevision: resolved.provenance.story.revision,
    },
  };
}

/** Host services an instance needs; all injectable, none browser-specific. */
export interface CoreApplicationHostServicesV1 {
  readonly entropy: BootstrapEntropyV1;
  readonly records: HostAtomicRecordStoreV1;
  now(): IsoUtcInstant;
  readonly ownerId: SessionLeaseOwnerId;
  nextHandoffRequestId(): string;
}

/**
 * When to write committed Snapshots to the auto-save slot. `every_commit`
 * preserves the historical immediate-write behavior; `debounced` coalesces
 * commits and flushes after `delayMs` of quiet (or immediately every
 * `checkpointEveryCommands` commits). `delayMs` must be a non-negative safe
 * integer other than negative zero; `checkpointEveryCommands`, when present,
 * must be a positive safe integer. Invalid policies are rejected before the
 * instance creates a Session, persistence owner, or timer. Explicit slot saves
 * are always allowed.
 */
export type CoreAutosavePolicyV1 =
  | { readonly mode: "every_commit" }
  | {
    readonly mode: "debounced";
    readonly delayMs: number;
    readonly checkpointEveryCommands?: number;
  };

/** Injectable timer so autosave policies are testable with a manual clock. */
export interface CoreSchedulerV1 {
  schedule(callback: () => void, delayMs: number): () => void;
}

const defaultSchedulerV1: CoreSchedulerV1 = {
  schedule(callback: () => void, delayMs: number) {
    const handle = setTimeout(callback, delayMs);
    return () => clearTimeout(handle);
  },
};

export type CoreApplicationConstructionEventInternalV1 =
  | "session_factory"
  | "persistence_factory";

export interface CoreApplicationConstructionInstrumentationInternalV1 {
  record(event: CoreApplicationConstructionEventInternalV1): unknown;
}

const constructionInstrumentationV1 = new WeakMap<
  object,
  CoreApplicationConstructionInstrumentationInternalV1
>();
const snapshotWorkInstrumentationV1 = new WeakMap<object, SnapshotWorkInstrumentationV1>();
const saveProjectionInstrumentationV1 = new WeakMap<
  object,
  SaveSummaryProjectionInstrumentationInternalV1
>();
interface CoreApplicationReadinessHooksStoredInternalV1 {
  readonly prepareSemanticInvocation?: (invocation: unknown) => Promise<void>;
  readonly prepareReplacement?: (snapshot: unknown) => Promise<void>;
}
const coreApplicationReadinessHooksInternalV1 = new WeakMap<
  object,
  CoreApplicationReadinessHooksStoredInternalV1
>();
interface CoreGameApplicationRebootstrapStartInputInternalV1 {
  readonly handoff: DeepReadonly<CoreRebootstrapHandoffInternalV1>;
  readonly onFailure: (
    outcome: DeepReadonly<CoreRebootstrapStartFailureInternalV1>,
  ) => void;
}
const coreGameApplicationRebootstrapStartInputsInternalV1 = new WeakMap<
  object,
  CoreGameApplicationRebootstrapStartInputInternalV1
>();

/**
 * Attaches a one-shot, observational construction probe for same-package tests.
 * This seam is intentionally absent from every package barrel.
 *
 * @internal
 */
export function instrumentCoreApplicationConstructionOptionsInternalV1<
  TExecutionContext = undefined,
>(
  options: CreateCoreGameApplicationInstanceOptionsV1<TExecutionContext>,
  instrumentation: CoreApplicationConstructionInstrumentationInternalV1,
): CreateCoreGameApplicationInstanceOptionsV1<TExecutionContext> {
  constructionInstrumentationV1.set(options, instrumentation);
  return options;
}

/**
 * Attaches one observational Snapshot-work probe to a Core composition for
 * package tests. The attachment is consumed once and never enters a public
 * application option or Story contract.
 *
 * @internal Intentionally absent from package barrels.
 */
export function instrumentCoreApplicationSnapshotWorkOptionsInternalV1<
  TExecutionContext = undefined,
>(
  options: CreateCoreGameApplicationInstanceOptionsV1<TExecutionContext>,
  instrumentation: SnapshotWorkInstrumentationV1,
): CreateCoreGameApplicationInstanceOptionsV1<TExecutionContext> {
  snapshotWorkInstrumentationV1.set(options, instrumentation);
  return options;
}

/** @internal One-shot Base Save-projector observation for package tests. */
export function instrumentCoreApplicationSaveProjectionOptionsInternalV1<
  TExecutionContext = undefined,
>(
  options: CreateCoreGameApplicationInstanceOptionsV1<TExecutionContext>,
  instrumentation: SaveSummaryProjectionInstrumentationInternalV1,
): CreateCoreGameApplicationInstanceOptionsV1<TExecutionContext> {
  saveProjectionInstrumentationV1.set(options, instrumentation);
  return options;
}

/**
 * Attaches one package-private Host readiness boundary to a Core construction.
 * Hooks receive only admitted semantic invocations and replacement Snapshots,
 * are consumed once, and never enter the Story or public options ABI.
 *
 * @internal
 */
export function bindCoreApplicationReadinessOptionsInternalV1<
  TInvocation,
  TSnapshot,
  TExecutionContext = undefined,
>(
  options: CreateCoreGameApplicationInstanceOptionsV1<TExecutionContext>,
  hooks: {
    readonly prepareSemanticInvocation?: (
      invocation: DeepReadonly<TInvocation>,
    ) => Promise<void>;
    readonly prepareReplacement?: (snapshot: DeepReadonly<TSnapshot>) => Promise<void>;
  },
): CreateCoreGameApplicationInstanceOptionsV1<TExecutionContext> {
  coreApplicationReadinessHooksInternalV1.set(
    options,
    hooks as unknown as CoreApplicationReadinessHooksStoredInternalV1,
  );
  return options;
}

function recordCoreApplicationConstructionV1(
  instrumentation: CoreApplicationConstructionInstrumentationInternalV1 | undefined,
  event: CoreApplicationConstructionEventInternalV1,
): void {
  try {
    const result = instrumentation?.record(event);
    if (result !== undefined) {
      void Promise.resolve(result).catch(() => undefined);
    }
  } catch {
    // Test instrumentation is observational and cannot affect construction.
  }
}

function normalizeCoreAutosavePolicyV1(
  configured: CoreAutosavePolicyV1 | undefined,
): CoreAutosavePolicyV1 {
  if (configured === undefined) {
    return { mode: "every_commit" as const };
  }
  const mode: unknown = (configured as { readonly mode: unknown }).mode;
  if (mode === "every_commit") {
    return { mode };
  }
  if (mode !== "debounced") {
    // Tag admission is outside AUTO0; preserve the existing runtime behavior
    // for an untyped caller that violates the discriminated union.
    return configured;
  }
  const debounced = configured as Extract<CoreAutosavePolicyV1, { readonly mode: "debounced" }>;
  const delayMs = parseNonNegativeSafeInteger(debounced.delayMs);
  const checkpointEveryCommands = debounced.checkpointEveryCommands;
  return {
    mode,
    delayMs,
    ...(checkpointEveryCommands === undefined
      ? {}
      : { checkpointEveryCommands: parsePositiveSafeInteger(checkpointEveryCommands) }),
  };
}

export type CorePresentationAnchorOriginV1 =
  | "bootstrap"
  | "load"
  | "import"
  | "restart"
  | "replay_anchor"
  | "rollback"
  | "rollforward"
  | "replacement";

/**
 * Instance-local presentation continuity marker. The epoch advances whenever
 * the authoritative replay base is replaced (load, import, restart, debug
 * anchor, rollback, or rollforward); it never enters SemanticPublication,
 * semantic revisions, or Agent transcripts.
 */
export interface CorePresentationAnchorV1 {
  readonly epoch: NonNegativeSafeInteger;
  readonly origin: CorePresentationAnchorOriginV1;
}

export type CoreEpochBoundOutcomeV1<TValue> =
  | {
    readonly kind: "current";
    readonly value: TValue;
  }
  | { readonly kind: "stale_epoch" };

interface CreateCoreGameApplicationInstanceBaseOptionsV1 {
  readonly host: CoreApplicationHostServicesV1;
  readonly capabilities?: { readonly debugTools?: boolean };
  /** Live capability view source for extensions; falls back to static flags. */
  readonly capabilityState?: {
    getCurrent(): {
      readonly debugTools: boolean;
      readonly cheats: boolean;
      readonly automationBridge: boolean;
    };
    subscribe(listener: () => void): () => void;
  };
  readonly autosave?: CoreAutosavePolicyV1;
  readonly scheduler?: CoreSchedulerV1;
  /** Application build identity digest for diagnostics provenance. */
  readonly appBuildId?: Digest;
}

/**
 * Core construction requires the application-owned execution context whenever
 * the Story's declared context cannot be undefined. Optional-context Stories
 * retain the ordinary no-context call shape.
 */
export type CreateCoreGameApplicationInstanceOptionsV1<TExecutionContext = undefined> =
  & CreateCoreGameApplicationInstanceBaseOptionsV1
  & (undefined extends TExecutionContext ? {
      /** Optional only when the declared execution-context type permits undefined. */
      readonly executionContext?: TExecutionContext;
    }
    : {
      /**
       * The Host prepares this direct-plan owner before Core construction;
       * command, debug, replay, and exact rebootstrap paths receive the same
       * typed value without performing Host IO.
       */
      readonly executionContext: TExecutionContext;
    });

/** @internal Package-private construction input for one authoritative successor. */
export type CreateCoreGameApplicationInstanceForRebootstrapOptionsInternalV1<
  TExecutionContext = undefined,
> = CreateCoreGameApplicationInstanceOptionsV1<TExecutionContext> & {
  readonly handoff: DeepReadonly<CoreRebootstrapHandoffInternalV1>;
  readonly onRebootstrapStartFailureInternal: (
    outcome: DeepReadonly<CoreRebootstrapStartFailureInternalV1>,
  ) => void;
};

/** @internal Package-private authoritative state and writer-generation handoff. */
export type CoreRebootstrapHandoffInternalV1 = PersistenceRebootstrapHandoffInternalV1;

/** @internal Definitive recovery state for one failed rebootstrap construction. */
export type CoreRebootstrapStartFailureInternalV1 =
  | {
    readonly kind: "ready";
    readonly handoff: DeepReadonly<CoreRebootstrapHandoffInternalV1>;
  }
  | { readonly kind: "terminal" };

/**
 * The player-rollback policy (R7): an opt-in, bounded checkpoint timeline over
 * committed Snapshots. `checkpoint` adds an interaction-level stop,
 * `transparent` updates the current stop without exposing an intermediate
 * commit, and `barrier` begins a new timeline that rollback cannot cross. RNG
 * state travels inside every Snapshot, so a rolled-back retry of the same
 * command reproduces the same outcome (pinned by default; no save-scum
 * rerolls).
 */
export interface CoreRollbackPolicyV1<TCommand> {
  /** History capacity (checkpoints kept behind the current state), 1..256. */
  readonly capacity: number;
  classify(command: DeepReadonly<TCommand>): "checkpoint" | "transparent" | "barrier";
}

export type CoreRollbackResultV1 =
  | {
    readonly kind: "rolled_back";
    readonly commandSequence: NonNegativeSafeInteger;
  }
  | {
    readonly kind: "rejected";
    readonly code: "rollback_unavailable" | "rollback_unconfigured" | "hmr_invalidated";
  };

export type CoreRollForwardResultV1 =
  | {
    readonly kind: "rolled_forward";
    readonly commandSequence: NonNegativeSafeInteger;
  }
  | {
    readonly kind: "rejected";
    readonly code: "rollforward_unavailable" | "rollback_unconfigured" | "hmr_invalidated";
  };

export interface CoreRollbackPortV1 {
  /** Checkpoints currently reachable on either side of the live state. */
  available(): {
    readonly steps: NonNegativeSafeInteger;
    readonly forwardSteps: NonNegativeSafeInteger;
  };
  /** Restores the checkpoint `steps` behind the live state (default 1). */
  toPrevious(steps?: number): Promise<CoreRollbackResultV1>;
  /** Restores the checkpoint `steps` ahead of the live state (default 1). */
  toNext(steps?: number): Promise<CoreRollForwardResultV1>;
  /** Notifies after every timeline change (commit, navigation, reseed). */
  subscribe(listener: () => void): () => void;
}

export interface CoreApplicationAdminV1<TTypes extends GameSimulationTypeMapV1> {
  commandLog(): ReturnType<GameSessionCompositionV1<TTypes>["commandLog"]["entries"]>;
  replayAuthoritatively(): Promise<ReplayComparisonV1>;
  inspectForTest(): {
    readonly snapshot: DeepReadonly<TTypes["snapshot"]>;
    readonly runtimeFailures: readonly unknown[];
  };
  stateDigest(): Digest;
  /** Non-authoritative raw-error record behind the latest unexpected fault. */
  lastFaultCause(): SessionFaultCauseV1 | null;
  readonly debugControl?: GameSessionCompositionV1<TTypes>["debugControl"];
}

/**
 * A disposable application instance holding the live Session, persistence
 * lease, listeners, and autosave policy. Instances must not be reused across
 * HMR generations; dispose is idempotent and leaves no active owner.
 */
export interface CoreGameApplicationInstanceV1<
  TTypes extends GameSimulationTypeMapV1,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
> {
  readonly storyId: string;
  readonly storyRevision: number;
  readonly semantic: SemanticGamePortV1<
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult,
    RuntimeSessionStatusV1
  >;
  readonly persistence: PersistenceServiceV1<TTypes["snapshot"]>["port"];
  flushAutoSave(): Promise<void>;
  autoSaveIdle(): Promise<void>;
  readonly lifecycle: {
    restart(): Promise<SessionAnchorResultV1>;
  };
  /** Player navigation over the bounded checkpoint timeline (R7). */
  readonly rollback: CoreRollbackPortV1;
  readonly diagnostics: {
    runtimeFailures(): readonly RuntimeOperationFaultV1[];
  };
  /** Story extensions built by the definition's `createExtensions`. */
  readonly extensions: unknown;
  /** Binds the late presentation context reader for DebugBundle exports. */
  bindDebugUiContext(reader: () => unknown): () => void;
  presentationAnchor(): CorePresentationAnchorV1;
  subscribePresentationAnchor(listener: (anchor: CorePresentationAnchorV1) => void): () => void;
  /**
   * Commit-only transient effect stream. Effects are emitted live as
   * commands commit — stamped with a monotonic per-instance sequence and
   * the presentation epoch at commit time. Load and bootstrap publications
   * carry no history, so new epochs never replay old effects.
   */
  subscribeTransientEffects(listener: (effect: TransientEffectV1) => void): () => void;
  /**
   * Commit-only narrative aside push (narrative-aside proposal): a
   * zero-authority batch of dialogue pages stamped with a monotonic
   * per-instance sequence and the presentation epoch at commit time.
   * Nothing is stored and load/bootstrap publications carry no history, so
   * new epochs never replay old asides; consumers keep an epoch check plus
   * a sequence watermark exactly like transient effects.
   */
  subscribeNarrativeAsides(listener: (aside: NarrativeAsideV1) => void): () => void;
  /**
   * The latest commit's presentation edge context (cue-identity proposal,
   * accepted 2026-08-17): scene cue dispatches projected from that commit's
   * events, stamped with exactly its semantic publication revision and the
   * presentation epoch at commit time. Nothing is stored beyond the latest
   * batch, anchor replacement (load/import/restart/rollback/rollforward) clears it, and
   * consumers must drop a batch whose revision or epoch does not match the
   * publication they present — absence degrades to context-free resolution.
   */
  stageCueDispatches(): StageCueDispatchBatchV1 | null;
  bindToCurrentEpoch<TArgs extends readonly unknown[], TValue>(
    callback: (...args: TArgs) => TValue,
  ): (...args: TArgs) => CoreEpochBoundOutcomeV1<TValue>;
  readonly admin: CoreApplicationAdminV1<TTypes>;
  isDisposed(): boolean;
  dispose(): Promise<{ readonly kind: "disposed" }>;
}

interface CoreGameApplicationRebootstrapControlInternalV1 {
  invalidate(): void;
  dispose(): Promise<DeepReadonly<CoreRebootstrapHandoffInternalV1>>;
}

const coreGameApplicationRebootstrapControlsInternalV1 = new WeakMap<
  object,
  CoreGameApplicationRebootstrapControlInternalV1
>();

function requireCoreGameApplicationRebootstrapControlInternalV1(
  instance: object,
): CoreGameApplicationRebootstrapControlInternalV1 {
  const control = coreGameApplicationRebootstrapControlsInternalV1.get(instance);
  if (control === undefined) throw new TypeError("core.rebootstrap_instance_unavailable");
  return control;
}

/** @internal Fences one live Core application before authoritative handoff. */
export function invalidateCoreGameApplicationForHmrInternalV1(instance: object): void {
  requireCoreGameApplicationRebootstrapControlInternalV1(instance).invalidate();
}

/** @internal Retires one live Core application into its exact Save + lease handoff. */
export function disposeCoreGameApplicationForRebootstrapInternalV1(
  instance: object,
): Promise<DeepReadonly<CoreRebootstrapHandoffInternalV1>> {
  return requireCoreGameApplicationRebootstrapControlInternalV1(instance).dispose();
}

function readBootstrapRngSeedV1(
  bootstrap: unknown,
): Parameters<typeof createTransactionalRngV1>[0] {
  if (bootstrap === null || typeof bootstrap !== "object" || Array.isArray(bootstrap)) {
    throw new TypeError(
      "core application bootstrap input must be an object carrying an rngSeed field",
    );
  }
  if (!Object.hasOwn(bootstrap, "rngSeed")) {
    throw new TypeError(
      "core application bootstrap input must be an object carrying an rngSeed field",
    );
  }
  return (bootstrap as { readonly rngSeed: unknown }).rngSeed as Parameters<
    typeof createTransactionalRngV1
  >[0];
}

class CoreRngReplacementNormalizerFailureV1 {
  constructor(readonly error: unknown) {}
}

export async function createCoreGameApplicationInstanceV1<
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
>(
  application: ResolvedCoreGameApplicationV1<
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
  >,
  options: CreateCoreGameApplicationInstanceOptionsV1<TTypes["executionContext"]>,
): Promise<
  CoreGameApplicationInstanceV1<
    TTypes,
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult
  >
> {
  const rebootstrapStart = coreGameApplicationRebootstrapStartInputsInternalV1.get(options);
  coreGameApplicationRebootstrapStartInputsInternalV1.delete(options);
  const constructionInstrumentation = constructionInstrumentationV1.get(options);
  constructionInstrumentationV1.delete(options);
  const snapshotWorkInstrumentation = snapshotWorkInstrumentationV1.get(options);
  snapshotWorkInstrumentationV1.delete(options);
  const saveProjectionInstrumentation = saveProjectionInstrumentationV1.get(options);
  saveProjectionInstrumentationV1.delete(options);
  const readinessHooks = coreApplicationReadinessHooksInternalV1.get(options);
  coreApplicationReadinessHooksInternalV1.delete(options);
  const autosave = normalizeCoreAutosavePolicyV1(options.autosave);
  const scheduler = options.scheduler ?? defaultSchedulerV1;
  const executionContext = options.executionContext as TTypes["executionContext"];
  const definition = application.definition;
  const gameSimulation = (application.resolved as { readonly gameSimulation: unknown })
    .gameSimulation as GameSimulationV1<
      TTypes,
      readonly unknown[],
      {
        executeAttempt(
          snapshot: DeepReadonly<TTypes["snapshot"]>,
          command: DeepReadonly<TTypes["command"]>,
          context: TTypes["executionContext"],
        ): never;
      },
      {
        validate(
          snapshot: DeepReadonly<TTypes["snapshot"]>,
          command: DeepReadonly<TTypes["debugCommand"]>,
          context: TTypes["executionContext"],
        ): never;
        executeAttempt(
          snapshot: DeepReadonly<TTypes["snapshot"]>,
          command: DeepReadonly<TTypes["debugCommand"]>,
          context: TTypes["executionContext"],
        ): never;
      }
    >;

  const snapshotSchema = createGameSnapshotEnvelopeSchemaV1(
    gameSimulation.stateSchema,
    rngStateV1Schema,
  );
  const validateSnapshotRngV1 = (snapshot: DeepReadonly<TTypes["snapshot"]>): void => {
    if (
      snapshot === null ||
      typeof snapshot !== "object" ||
      !Object.hasOwn(snapshot, "rng")
    ) {
      throw new RngStateSchemaFailureInternalV1("invalid candidate Snapshot RNG");
    }
    rngStateV1Schema.parse((snapshot as { readonly rng: unknown }).rng);
  };
  const coreTypedEvidencePolicyV1: CoreTypedEvidencePolicyInternalV1<
    TTypes["rejection"],
    TTypes["debugValidationError"]
  > = {
    validateCandidateSnapshot: (value: unknown) =>
      validateSnapshotRngV1(value as DeepReadonly<TTypes["snapshot"]>),
    parseRejection: (value: unknown) => gameSimulation.rejectionSchema.parse(value),
    parseDebugValidationError: (value: unknown) => {
      if (isEngineDebugPatchValidationErrorV1(value)) {
        return value as TTypes["debugValidationError"];
      }
      return gameSimulation.debugValidationErrorSchema.parse(value);
    },
  };
  const createInitialSnapshotV1 = (): TTypes["snapshot"] => {
    const bootstrap = admitCanonicalBootstrapInternalV1(
      gameSimulation.createBootstrapInput(options.host.entropy),
      snapshotWorkInstrumentation,
    );
    const rngSeed = parseRngSeedInternalV1(readBootstrapRngSeedV1(bootstrap));
    return snapshotSchema.parse({
      state: gameSimulation.createInitialState(bootstrap),
      rng: createTransactionalRngV1(rngSeed).candidateState(),
      commandSequence: parseNonNegativeSafeInteger(0),
      integrity: createPristineRunIntegrityV1(),
    }) as TTypes["snapshot"];
  };

  const runtimeFailures = createRuntimeFailureBufferV1();
  const reportObserverFailure = createRuntimeFailureReporterV1({
    failures: runtimeFailures,
    now: () => options.host.now(),
    operation: "runtime.observer_notification_failed",
    category: "runtime",
    code: "runtime.async_operation_failed",
  });

  // Instance-local debug evidence: the latest faulted attempt with its
  // triggering command. Story diagnostics scrub it before any export.
  let latestAttemptFailure:
    | {
      readonly source: "game" | "debug";
      readonly command: unknown;
      readonly attempt: unknown;
    }
    | undefined;
  let readLatestLoggedAttemptCommand: () =>
    | {
      readonly source: "game" | "debug";
      readonly command: unknown;
    }
    | undefined = () => undefined;

  // Presentation edge context: a committed attempt's events are staged here
  // (the session calls `onAttempt` BEFORE it publishes) and stamped into
  // the dispatch batch by the instance's own first semantic-port
  // subscriber — so the batch already pairs with the publication when UI
  // subscribers render it. Stamping after the dispatch promise resolves is
  // too late: hosts that flush React synchronously inside the publication
  // notification would render (and retarget the stage) before the stamp.
  let pendingStageCueDispatchEventsV1:
    | readonly DeepReadonly<TTypes["event"]>[]
    | null = null;

  // Steps below acquire live resources; anything after session creation is
  // failure-guarded so a failed construction leaves no owner or listener.
  const sessionInput: GameSessionInputV1<TTypes> = {
    initialSnapshot: createInitialSnapshotV1(),
    commandSchema: gameSimulation.commandSchema,
    executionContext,
    executeAttempt: (snapshot, command) =>
      gameSimulation.commandExecutor.executeAttempt(
        snapshot,
        command,
        executionContext,
      ),
    normalizeUnexpectedDispatchFault(error, snapshot) {
      if (definition.normalizeUnexpectedDispatchFault !== undefined) {
        return definition.normalizeUnexpectedDispatchFault(error, snapshot);
      }
      throw error;
    },
    debug: {
      validate: (snapshot, command) =>
        isEngineDebugPatchStateKindV1(command)
          ? validateEngineStatePatchV1(
            snapshot as never,
            command,
            gameSimulation.stateSchema,
          ) as never
          : gameSimulation.debugCommandExecutor.validate(
            snapshot,
            command,
            executionContext,
          ),
      executeAttempt: (snapshot, command) =>
        isEngineDebugPatchStateKindV1(command)
          ? executeEngineStatePatchV1(
            snapshot as never,
            command,
            gameSimulation.stateSchema,
          )
          : gameSimulation.debugCommandExecutor.executeAttempt(
            snapshot,
            command,
            executionContext,
          ),
      normalizeUnexpectedFault(error, snapshot) {
        if (definition.normalizeUnexpectedDebugFault !== undefined) {
          return definition.normalizeUnexpectedDebugFault(error, snapshot);
        }
        throw error;
      },
    } satisfies GameSessionDebugInputV1<TTypes>,
    onAttempt(attempt) {
      const result = (attempt as {
        readonly result?: { readonly kind?: unknown; readonly events?: unknown };
      }).result;
      pendingStageCueDispatchEventsV1 = result?.kind === "committed"
        ? (result as { readonly events: readonly DeepReadonly<TTypes["event"]>[] }).events
        : null;
      const pending = readLatestLoggedAttemptCommand();
      if (pending === undefined || result?.kind !== "faulted") return;
      latestAttemptFailure = { ...pending, attempt };
    },
    onObserverFailure: reportObserverFailure,
  };
  recordCoreApplicationConstructionV1(constructionInstrumentation, "session_factory");
  const created = createCoreGameSessionInternalV1<TTypes>(
    sessionInput,
    coreTypedEvidencePolicyV1,
    snapshotWorkInstrumentation,
  );
  readLatestLoggedAttemptCommand = () => {
    const latest = created.commandLog.latestEntryInternalV1();
    return latest === undefined ? undefined : { source: latest.source, command: latest.command };
  };

  // The low-level Session controls stay generic. Standard Core wraps the
  // replacement seams it exposes so xorshift admission remains Core-owned and
  // invalid candidates never reach CommandLog preparation or install.
  const validatedRuntimeControl: GameSessionRuntimeControlV1<TTypes["snapshot"]> = {
    ...created.runtimeControl,
    enqueueAuthoritative<TAnchorResult>(
      operation: (
        current: DeepReadonly<TTypes["snapshot"]>,
      ) => Promise<AuthoritativeOutcomeV1<TTypes["snapshot"], TAnchorResult>>,
      normalizeUnexpectedFault: (error: unknown) => TAnchorResult,
      prepareReplacementCommit?: (
        snapshot: DeepReadonly<TTypes["snapshot"]>,
        anchor: "preserve_log" | "replace_replay_base",
      ) => void,
      whenHmrInvalidated?: () => TAnchorResult,
    ): Promise<TAnchorResult> {
      return created.runtimeControl.enqueueAuthoritative(
        async (current) => {
          const outcome = await operation(current);
          if (created.session.getStatus() === "hmr_invalidated") return outcome;
          if (outcome.kind !== "replace") return outcome;
          try {
            validateSnapshotRngV1(outcome.snapshot as DeepReadonly<TTypes["snapshot"]>);
            return outcome;
          } catch (error) {
            if (!(error instanceof RngStateSchemaFailureInternalV1)) throw error;
            // Preserve the Session's pre-existing invalidation precedence: an
            // operation invalidated during its await must not invoke a caller
            // normalizer before the underlying control observes the fence.
            if (created.session.getStatus() === "hmr_invalidated") throw error;
            try {
              return {
                kind: "preserve" as const,
                result: normalizeUnexpectedFault(error),
              };
            } catch (normalizerError) {
              throw new CoreRngReplacementNormalizerFailureV1(normalizerError);
            }
          }
        },
        (error) => {
          if (error instanceof CoreRngReplacementNormalizerFailureV1) throw error.error;
          return normalizeUnexpectedFault(error);
        },
        prepareReplacementCommit,
        whenHmrInvalidated,
      );
    },
  };
  let persistenceService: PersistenceServiceV1<TTypes["snapshot"]> | undefined;
  const validatedDebugControl: GameSessionDebugControlV1<TTypes> = {
    ...created.debugControl,
    anchorReplacement<TAnchorResult>(
      anchor: GameSessionDebugAnchorV1,
      operation: (
        current: DeepReadonly<TTypes["snapshot"]>,
      ) => Promise<
        | { readonly kind: "preserve"; readonly result: TAnchorResult }
        | {
          readonly kind: "replace";
          readonly snapshot: TTypes["snapshot"];
          readonly result: TAnchorResult;
        }
      >,
      isCapabilityEnabled: () => boolean,
      normalizeUnexpectedFault: (error: unknown) => TAnchorResult,
      prepareReplacementCommit?: (snapshot: DeepReadonly<TTypes["snapshot"]>) => void,
    ) {
      return created.debugControl.anchorReplacement(
        anchor,
        async (current) => {
          const outcome = await operation(current);
          if (created.session.getStatus() === "hmr_invalidated") return outcome;
          if (outcome.kind !== "replace") return outcome;
          try {
            validateSnapshotRngV1(outcome.snapshot as DeepReadonly<TTypes["snapshot"]>);
            if (prepareReplacementCommit !== undefined) return outcome;
            const persistence = persistenceService;
            if (persistence === undefined) {
              throw new TypeError("Core Persistence is unavailable for a debug replacement");
            }
            const replacement = {
              kind: outcome.kind,
              snapshot: outcome.snapshot,
              result: outcome.result,
            };
            bindPersistenceAnchorReplacementInternalV1(
              persistence,
              replacement,
              persistence.getSimulationLineage(),
              undefined,
              normalizeUnexpectedFault,
            );
            return replacement;
          } catch (error) {
            if (!(error instanceof RngStateSchemaFailureInternalV1)) throw error;
            if (created.session.getStatus() === "hmr_invalidated") throw error;
            try {
              return {
                kind: "preserve" as const,
                result: normalizeUnexpectedFault(error),
              };
            } catch (normalizerError) {
              throw new CoreRngReplacementNormalizerFailureV1(normalizerError);
            }
          }
        },
        isCapabilityEnabled,
        (error) => {
          if (error instanceof CoreRngReplacementNormalizerFailureV1) throw error.error;
          return normalizeUnexpectedFault(error);
        },
        prepareReplacementCommit,
      );
    },
  };

  let disposed = false;
  const cleanups: (() => void)[] = [];
  const presentationOriginsByPublicationContext = new WeakMap<
    object,
    CorePresentationAnchorOriginV1
  >();

  try {
    const stateOfSnapshotV1 = (
      snapshot: DeepReadonly<TTypes["snapshot"]>,
    ): DeepReadonly<TTypes["state"]> =>
      (snapshot as { readonly state: DeepReadonly<TTypes["state"]> }).state;

    const source: SemanticGamePortSourceV1<TTypes["state"], RuntimeSessionStatusV1> = {
      getCurrentState: () => stateOfSnapshotV1(created.session.getCurrentSnapshot()),
      getAuthoritativeRevisionToken: () => created.session.getCurrentSnapshot(),
      getStatus: () => created.session.getStatus(),
      subscribe: (listener: () => void) => created.session.subscribe(listener),
      reportSubscriberFailure: reportObserverFailure,
      readStateAtQueueFront: <TReadResult>(
        reader: (state: DeepReadonly<TTypes["state"]>) => TReadResult,
      ) =>
        created.runtimeControl.readAtQueueFront((snapshot) => reader(stateOfSnapshotV1(snapshot))),
    };

    const dispatchAdmittedSemanticInvocationV1 = async (
      invocation: TInvocation,
    ): Promise<TResult> => {
      const command = definition.semantic.commandForInvocation(
        invocation as DeepReadonly<TInvocation>,
      ) as DeepReadonly<TTypes["command"]>;
      const result = await created.session.dispatch(command);
      recordRollbackCheckpointV1(command, result);
      emitTransientEffectsV1(result);
      return definition.semantic.projectDispatchResult(result);
    };
    let semanticDispatchTail: Promise<void> = Promise.resolve();
    const dispatchSemanticInvocationInOrderV1 = (
      invocationValue: DeepReadonly<TInvocation>,
    ): Promise<TResult> => {
      let invocation: TInvocation;
      try {
        invocation = definition.semantic.parseInvocation(invocationValue);
      } catch {
        return Promise.resolve(definition.semantic.invalidInvocationResult());
      }
      const prepareSemanticInvocation = readinessHooks?.prepareSemanticInvocation;
      if (prepareSemanticInvocation === undefined) {
        return dispatchAdmittedSemanticInvocationV1(invocation);
      }
      const result = semanticDispatchTail.then(async () => {
        await prepareSemanticInvocation(invocation);
        return await dispatchAdmittedSemanticInvocationV1(invocation);
      });
      semanticDispatchTail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    };

    const semantic = createSemanticGamePortV1<
      TTypes["state"],
      RuntimeSessionStatusV1,
      TQueries,
      TGameView,
      TNarrativeView,
      TActionDescriptor,
      TInvocation,
      TPreview,
      TResult
    >({
      source,
      createQueries: (state) => definition.semantic.createQueries(state),
      projectGameView: (queries) => definition.semantic.projectGameView(queries),
      projectNarrativeView: (queries) => definition.semantic.projectNarrativeView(queries),
      actions: (queries) => definition.semantic.actions(queries),
      preview: (queries, invocation) => definition.semantic.preview(queries, invocation),
      dispatch: dispatchSemanticInvocationInOrderV1,
    });

    // The instance's own FIRST semantic-port subscriber (registration order
    // is the contract): stamp the staged commit events as the dispatch batch
    // before any later subscriber — including hosts that flush React
    // synchronously — observes the new publication.
    cleanups.push(
      semantic.subscribe(() => {
        const events = pendingStageCueDispatchEventsV1;
        if (events === null) return;
        pendingStageCueDispatchEventsV1 = null;
        recordStageCueDispatchesFromEventsV1(events);
      }),
    );

    recordCoreApplicationConstructionV1(constructionInstrumentation, "persistence_factory");
    // Persistence safepoint tracking (in-flight spans): instance-local
    // orchestration state — never authoritative, never serialized. The
    // most recent safepoint Snapshot backs mid-span flush fallbacks; the
    // run length enforces the declared bound; a forfeited inhibit means a
    // runaway span lost its deferral privilege until the next safepoint.
    const safepointPolicy = definition.persistenceSafepoint ?? null;
    let lastSafepointSnapshot: DeepReadonly<TTypes["snapshot"]> | undefined;
    let inFlightRunLength = 0;
    let inFlightInhibitForfeited = false;
    const classifyStateSafepointV1 = (
      state: DeepReadonly<TTypes["state"]>,
    ): PersistenceSafepointClassificationV1 => {
      if (safepointPolicy === null) return "safepoint";
      let classification: PersistenceSafepointClassificationV1;
      try {
        classification = safepointPolicy.classify(state);
      } catch (error) {
        // A malfunctioning declaration forfeits the inhibit, never the
        // autosave: treating the state as a safepoint cannot starve
        // persistence, and the diagnostic surfaces the Story bug.
        reportObserverFailure(
          new TypeError("persistence.safepoint_classify_failed", { cause: error }),
        );
        return "safepoint";
      }
      if (classification === "in_flight") return "in_flight";
      if (classification !== "safepoint") {
        reportObserverFailure(new TypeError("persistence.safepoint_classify_failed"));
      }
      return "safepoint";
    };
    /** Span accounting: called once per committed snapshot, nowhere else. */
    const observeCommittedSpanV1 = (
      snapshot: DeepReadonly<TTypes["snapshot"]>,
    ): PersistenceSafepointClassificationV1 => {
      if (safepointPolicy === null) return "safepoint";
      if (classifyStateSafepointV1(stateOfSnapshotV1(snapshot)) === "safepoint") {
        inFlightRunLength = 0;
        inFlightInhibitForfeited = false;
        lastSafepointSnapshot = snapshot;
        return "safepoint";
      }
      if (!inFlightInhibitForfeited) {
        inFlightRunLength += 1;
        if (inFlightRunLength <= safepointPolicy.maxInFlightCommits) {
          return "in_flight";
        }
        // The declared bound is the anti-starvation guarantee: a span that
        // outlives it forfeits the deferral (long-lived state can never use
        // a span to escape the Save) and the overrun becomes a diagnostic.
        inFlightInhibitForfeited = true;
        reportObserverFailure(new TypeError("persistence.safepoint_span_exceeded"));
      }
      return "safepoint";
    };
    const resetSafepointTrackingForAnchorV1 = (): void => {
      lastSafepointSnapshot = undefined;
      inFlightRunLength = 0;
      inFlightInhibitForfeited = false;
    };
    const persistenceOptions: CreateStandardPersistenceServiceOptionsV1<
      TTypes["state"],
      TTypes["snapshot"]
    > = {
      runtimeControl: created.runtimeControl,
      records: options.host.records,
      snapshotSchema: snapshotSchema as never,
      provenance: application.provenance as never,
      adoptionDeclarations: definition.adoptionDeclarations ?? [],
      saveStateMigrations: definition.saveStateMigrations ?? null,
      ownerId: options.host.ownerId,
      nextHandoffRequestId: () => options.host.nextHandoffRequestId() as never,
      validateReferences: (state) =>
        definition.validateReferences?.(state as never, application.resolved) ?? [],
      validateInvariants: (view) =>
        definition.validateInvariants?.(
          view as {
            readonly state: DeepReadonly<TTypes["state"]>;
            readonly commandSequence: NonNegativeSafeInteger;
          },
          application.resolved,
        ) ?? [],
      initialSimulationLineage: [],
      metadataClock: { now: () => options.host.now() },
      exportFilename: definition.exportFilename ?? "sillymaker-application-save.json",
      ...(definition.manualSaveSlotCount === undefined
        ? {}
        : { manualSaveSlotCount: definition.manualSaveSlotCount }),
      ...(definition.summarizeSave === undefined ? {} : {
        summarizeSave: (state: DeepReadonly<TTypes["state"]>) => definition.summarizeSave!(state),
      }),
      // With a safepoint policy the instance always feeds captures itself:
      // the service's own committed-snapshot subscription cannot classify.
      autoSaveCapture: autosave.mode === "every_commit" && safepointPolicy === null
        ? "committed_snapshots"
        : "external",
      ...(readinessHooks?.prepareReplacement === undefined ? {} : {
        prepareReplacement: (snapshot: DeepReadonly<TTypes["snapshot"]>) =>
          readinessHooks.prepareReplacement!(snapshot),
      }),
      ...(safepointPolicy === null ? {} : {
        classifyWriteCandidate: (state: DeepReadonly<TTypes["state"]>) =>
          inFlightInhibitForfeited ? "safepoint" as const : classifyStateSafepointV1(state),
      }),
      leaseAcquisition: rebootstrapStart === undefined ? "acquire_initial" : "deferred_rebootstrap",
    };
    persistenceService = snapshotWorkInstrumentation === undefined &&
        saveProjectionInstrumentation === undefined
      ? await createPersistenceServiceV1<TTypes["state"], TTypes["snapshot"]>(persistenceOptions)
      : await createInstrumentedPersistenceServiceV1<TTypes["state"], TTypes["snapshot"]>(
        persistenceOptions,
        snapshotWorkInstrumentation,
        saveProjectionInstrumentation === undefined
          ? undefined
          : { saveSummaryProjectionInstrumentation: saveProjectionInstrumentation },
      );
    const persistence = persistenceService;
    if (rebootstrapStart !== undefined) {
      // Dev rebootstrap: strict Save admission precedes the exact writable
      // lease takeover, and the existing atomic replacement participant
      // installs Session, Persistence, and replay-base authority together.
      await adoptPersistenceRebootstrapHandoffInternalV1(
        persistence,
        rebootstrapStart.handoff,
      );
    } else if (definition.resumeFromAutosave === true) {
      // Boot-time resume: adopt the previous session's autosave when one
      // is runnable; rejections (empty slot, incompatible record) keep
      // the fresh bootstrap without surfacing an error.
      await persistence.port.load("auto.current").catch(() => undefined);
    }

    // Presentation anchor/epoch: advance whenever the authoritative replay
    // base is replaced. Instance-local only.
    let epoch = parseNonNegativeSafeInteger(0);
    let origin: CorePresentationAnchorOriginV1 = "bootstrap";
    let lastReplayBase: unknown = created.commandLog.replayBase();
    let clearPendingAutoSaveForAnchorV1: () => void = () => {};
    // Presentation edge context: only the latest commit's batch is kept
    // (nothing accumulates), and anchor replacement clears it — a restored
    // replay base has no commit edge to annotate.
    let latestStageCueDispatchBatchV1: StageCueDispatchBatchV1 | null = null;
    const anchorListeners = new Set<(anchor: CorePresentationAnchorV1) => void>();
    const anchorEventListeners = new Set<
      (event: CorePresentationAnchorEventInternalV1) => void
    >();
    const currentAnchorV1 = (): CorePresentationAnchorV1 => ({ epoch, origin });
    cleanups.push(
      created.session.subscribe(() => {
        const replayBase = created.commandLog.replayBase();
        const publicationContext = readActiveAuthoritativeReplacementPublicationContextInternalV1(
          created.runtimeControl,
        );
        // Replacing the live Session with the existing replay-base Snapshot is
        // still an authoritative presentation discontinuity (for example,
        // Back to the bootstrap checkpoint). Ordinary commits have no active
        // replacement context and remain silent when the base is unchanged.
        if (replayBase === lastReplayBase && publicationContext === null) return;
        lastReplayBase = replayBase;
        epoch = parseNonNegativeSafeInteger(epoch + 1);
        latestStageCueDispatchBatchV1 = null;
        if (publicationContext === null) {
          origin = "replacement";
        } else {
          origin = presentationOriginsByPublicationContext.get(publicationContext) ?? "replacement";
          presentationOriginsByPublicationContext.delete(publicationContext);
        }
        // A debounce candidate belongs to the replay base that produced it.
        // Never let an old-base timer write back over a load/import/restart/
        // rollback replacement.
        clearPendingAutoSaveForAnchorV1();
        // Safepoint tracking belongs to the replaced base too: the new
        // anchor's classification starts fresh on its first commit.
        resetSafepointTrackingForAnchorV1();
        // External replay-base replacement starts a new rollback lineage.
        // Timeline navigation retains both sides and moves its cursor after
        // the authoritative replacement succeeds.
        if (origin !== "rollback" && origin !== "rollforward") {
          resetRollbackTimelineV1();
        }
        const anchor = currentAnchorV1();
        const event: CorePresentationAnchorEventInternalV1 = {
          anchor,
          publicationContext,
        };
        for (const listener of [...anchorEventListeners]) {
          try {
            listener(event);
          } catch (error) {
            reportObserverFailure(error);
          }
        }
        for (const listener of [...anchorListeners]) {
          try {
            listener(anchor);
          } catch (error) {
            reportObserverFailure(error);
          }
        }
      }),
    );
    cleanups.push(() => {
      anchorEventListeners.clear();
      anchorListeners.clear();
    });

    // Commit-only transient effect stream: effects derive from committed
    // command events, stamped with a monotonic sequence and the epoch at
    // commit time. Nothing is stored, so re-projection and load/bootstrap
    // publications can never replay history.
    const effectListeners = new Set<(effect: TransientEffectV1) => void>();
    let effectSequence = 0;
    cleanups.push(() => effectListeners.clear());
    function emitTransientEffectsFromEventsV1(
      events: readonly DeepReadonly<TTypes["event"]>[],
    ): void {
      const project = definition.semantic.projectTransientEffects;
      if (project === undefined || disposed) return;
      let requests: readonly TransientEffectRequestV1[];
      try {
        requests = project(events);
      } catch (error) {
        reportObserverFailure(error);
        return;
      }
      for (const request of requests) {
        effectSequence += 1;
        const effect: TransientEffectV1 = {
          effectSequence,
          epoch: epoch as number,
          effectId: request.effectId,
          payload: request.payload,
        };
        for (const listener of [...effectListeners]) {
          try {
            listener(effect);
          } catch (error) {
            reportObserverFailure(error);
          }
        }
      }
    }

    // Commit-only narrative aside push: zero-authority dialogue pages
    // derived from committed events (narrative-aside proposal). The Story
    // projection is public input, so it is admitted once here; a failed or
    // invalid projection drops the aside and the commit presents without
    // it — the authoritative result is unaffected either way.
    const asideListeners = new Set<(aside: NarrativeAsideV1) => void>();
    let asideSequence = 0;
    cleanups.push(() => asideListeners.clear());
    function emitNarrativeAsideFromEventsV1(
      events: readonly DeepReadonly<TTypes["event"]>[],
    ): void {
      const project = definition.semantic.projectNarrativeAside;
      if (project === undefined || disposed) return;
      let pages: readonly NarrativeAsidePageV1[];
      try {
        pages = parseNarrativeAsidePagesV1(project(events));
      } catch (error) {
        reportObserverFailure(error);
        return;
      }
      if (pages.length === 0) return;
      asideSequence += 1;
      const aside: NarrativeAsideV1 = Object.freeze({
        asideSequence,
        epoch: epoch as number,
        pages,
      });
      for (const listener of [...asideListeners]) {
        try {
          listener(aside);
        } catch (error) {
          reportObserverFailure(error);
        }
      }
    }

    function emitTransientEffectsV1(result: SessionDispatchResultOfV1<TTypes>): void {
      if (result.kind !== "executed" || result.execution.kind !== "committed") {
        return;
      }
      const events = result.execution.events as readonly DeepReadonly<TTypes["event"]>[];
      emitTransientEffectsFromEventsV1(events);
      emitNarrativeAsideFromEventsV1(events);
    }

    // Presentation edge context: the Story projection is public input, so
    // it is admitted once here (id patterns, dispatch bound); a failed or
    // invalid projection drops the context and the commit presents without
    // it. Called from the instance's first semantic-port subscriber, where
    // the port has already assigned this commit's publication revision but
    // no UI subscriber has rendered it yet — the stamp pairs exactly.
    function recordStageCueDispatchesFromEventsV1(
      events: readonly DeepReadonly<TTypes["event"]>[],
    ): void {
      const project = definition.semantic.projectStageCueDispatches;
      if (project === undefined || disposed) return;
      let dispatches: readonly StageCueDispatchV1[];
      try {
        dispatches = parseStageCueDispatchesV1(project(events));
      } catch (error) {
        reportObserverFailure(error);
        return;
      }
      if (dispatches.length === 0) return;
      latestStageCueDispatchBatchV1 = {
        revision: semantic.observe().revision as number,
        epoch: epoch as number,
        dispatches,
      };
    }

    // Autosave policy wiring.
    let cancelFlushTimer: (() => void) | undefined;
    let pendingAutoSnapshot: DeepReadonly<TTypes["snapshot"]> | undefined;
    let commandsSinceCapture = 0;
    const clearPendingAutoSaveV1 = (): void => {
      const cancel = cancelFlushTimer;
      cancelFlushTimer = undefined;
      pendingAutoSnapshot = undefined;
      commandsSinceCapture = 0;
      cancel?.();
    };
    clearPendingAutoSaveForAnchorV1 = clearPendingAutoSaveV1;
    const captureNowV1 = (): void => {
      cancelFlushTimer?.();
      cancelFlushTimer = undefined;
      const snapshot = pendingAutoSnapshot;
      pendingAutoSnapshot = undefined;
      commandsSinceCapture = 0;
      if (snapshot !== undefined) persistence.captureAutoSave(snapshot);
    };
    cleanups.push(
      created.runtimeControl.subscribeCommittedSnapshots((snapshot) => {
        // Deferred autosave: an in-flight commit is never a candidate. The
        // last safepoint candidate (and any timer already running for it)
        // stays in place, so the span neither refreshes nor cancels it.
        if (observeCommittedSpanV1(snapshot) === "in_flight") return;
        if (autosave.mode === "every_commit") {
          // With a safepoint policy the service's own subscription is off;
          // the instance forwards each safepoint commit itself.
          if (safepointPolicy !== null) persistence.captureAutoSave(snapshot);
          return;
        }
        pendingAutoSnapshot = snapshot;
        commandsSinceCapture += 1;
        if (
          autosave.checkpointEveryCommands !== undefined &&
          commandsSinceCapture >= autosave.checkpointEveryCommands
        ) {
          captureNowV1();
          return;
        }
        cancelFlushTimer?.();
        cancelFlushTimer = scheduler.schedule(captureNowV1, autosave.delayMs);
      }),
    );
    cleanups.push(clearPendingAutoSaveV1);

    // Exact rebootstrap reconciliation is one ordinary authoritative command,
    // never an out-of-band Snapshot rewrite. Run it only after handoff adoption
    // and committed-Snapshot autosave wiring, while construction still owns
    // failure recovery and before extensions or external consumers can observe
    // the successor. A non-commit fails closed into the latest-handoff path.
    if (
      rebootstrapStart !== undefined &&
      definition.projectRebootstrapCommand !== undefined
    ) {
      const command = definition.projectRebootstrapCommand(
        created.session.getCurrentSnapshot(),
        application.resolved,
        executionContext,
      );
      if (command !== null) {
        const result = await created.session.dispatch(command);
        if (result.kind !== "executed" || result.execution.kind !== "committed") {
          throw new TypeError("core.rebootstrap_reconcile_not_committed");
        }
      }
    }

    // Mid-span flushes fall back to the most recent safepoint Snapshot; with
    // none in this anchor era there is nothing safe to write and the stored
    // record (the pre-span safepoint by construction) already is the correct
    // crash-recovery target.
    const flushCandidateV1 = (
      snapshot: DeepReadonly<TTypes["snapshot"]>,
    ): DeepReadonly<TTypes["snapshot"]> | null => {
      if (safepointPolicy === null || inFlightInhibitForfeited) return snapshot;
      return classifyStateSafepointV1(stateOfSnapshotV1(snapshot)) === "safepoint"
        ? snapshot
        : lastSafepointSnapshot ?? null;
    };
    const flushAutoSaveV1 = async (): Promise<void> => {
      clearPendingAutoSaveV1();
      try {
        while (true) {
          // Enqueue inside the synchronous queue-front reader. Awaiting the
          // Snapshot first would let a replacement anchor rotate between the
          // read and capture, assigning an old Snapshot to the new epoch.
          const attempt = await created.runtimeControl.readAtQueueFront((snapshot) => {
            const candidate = flushCandidateV1(snapshot);
            return {
              snapshot,
              settled: candidate === null
                ? null
                : captureAutoSaveWithReceiptInternalV1(persistence, candidate),
            };
          });
          if (attempt.settled === null) return;
          const receipt = await attempt.settled;
          const current = await created.runtimeControl.readAtQueueFront((snapshot) => snapshot);
          if (receipt.kind === "superseded" || current !== attempt.snapshot) {
            continue;
          }
          if (receipt.kind !== "saved") {
            throw new TypeError("persistence.autosave_flush_failed");
          }
          return;
        }
      } catch (error) {
        if (error instanceof TypeError && error.message === "persistence.autosave_flush_failed") {
          throw error;
        }
        throw new TypeError("persistence.autosave_flush_failed", {
          cause: error,
        });
      }
    };

    const invalidateForHmrV1 = (): void => {
      const runInvalidationStepV1 = (step: () => void): void => {
        try {
          step();
        } catch (error) {
          reportObserverFailure(error);
        }
      };
      // Host cleanup (including an injected timer cancellation) is allowed to
      // throw, so close both mutation ingresses before touching it.
      runInvalidationStepV1(() => fencePersistencePlayerMutationsInternalV1(persistence));
      runInvalidationStepV1(() => created.invalidationController.invalidateForHmr());
      runInvalidationStepV1(clearPendingAutoSaveV1);
    };

    const runWithOriginV1 = async <TOperationResult>(
      nextOrigin: CorePresentationAnchorOriginV1,
      publicationContext: AuthoritativeReplacementPublicationContextInternalV1,
      operation: (
        publicationContext: AuthoritativeReplacementPublicationContextInternalV1,
      ) => Promise<TOperationResult>,
    ): Promise<TOperationResult> => {
      presentationOriginsByPublicationContext.set(publicationContext, nextOrigin);
      try {
        return await operation(publicationContext);
      } finally {
        presentationOriginsByPublicationContext.delete(publicationContext);
      }
    };
    const withOriginV1 = <TOperationResult>(
      nextOrigin: CorePresentationAnchorOriginV1,
      operation: (
        publicationContext: AuthoritativeReplacementPublicationContextInternalV1,
      ) => Promise<TOperationResult>,
    ): Promise<TOperationResult> =>
      runWithOriginV1(
        nextOrigin,
        createAuthoritativeReplacementPublicationContextInternalV1(created.runtimeControl),
        operation,
      );

    const persistencePort = {
      ...persistence.port,
      load: (slot: Parameters<typeof persistence.port.load>[0]) =>
        withOriginV1(
          "load",
          (publicationContext) =>
            loadWithReplacementCommitInternalV1(
              persistence,
              slot,
              undefined,
              publicationContext,
            ),
        ),
      importSave: (bytes: Uint8Array) =>
        withOriginV1(
          "import",
          (publicationContext) =>
            importWithReplacementCommitInternalV1(
              persistence,
              bytes,
              undefined,
              publicationContext,
            ),
        ),
    };

    const maintenanceFailureMessageV1 = (error: unknown): string =>
      error instanceof Error ? error.message : String(error);
    const clearAllSavesForMaintenanceV1 = async (): Promise<void> => {
      const outcome = await created.runtimeControl.enqueueAuthoritative<
        CoreSaveMaintenanceBarrierResultV1
      >(
        async () => {
          const failures = new Set<string>();
          try {
            // Once this preserve barrier reaches the queue front, no later
            // command can commit until the physical cleanup is complete.
            clearPendingAutoSaveV1();
            await persistence.autoSaveIdle();
            const slots = await persistencePort.listSlots();
            for (const slot of slots) {
              if (slot.health === "empty") continue;
              try {
                const result = await persistencePort.clear(slot.slotId);
                if (result.kind === "cleared") continue;
                if (result.kind === "rejected" && result.code === "empty_slot") {
                  continue;
                }
                failures.add(
                  result.kind === "rejected" || result.kind === "faulted"
                    ? result.code
                    : result.kind,
                );
              } catch (error) {
                failures.add(maintenanceFailureMessageV1(error));
              }
            }
          } catch (error) {
            failures.add(maintenanceFailureMessageV1(error));
          }
          return {
            kind: "preserve" as const,
            result: failures.size === 0 ? { kind: "cleared" as const } : {
              kind: "failed" as const,
              message: `Save cleanup incomplete: ${[...failures].join(", ")}`,
            },
          };
        },
        (error) => ({
          kind: "failed" as const,
          message: maintenanceFailureMessageV1(error),
        }),
        undefined,
        () => ({
          kind: "failed" as const,
          message: "core.save_maintenance_unavailable",
        }),
      );
      if (outcome.kind === "failed") throw new Error(outcome.message);
    };

    const runRestartWithPublicationContextV1 = (
      publicationContext: AuthoritativeReplacementPublicationContextInternalV1,
    ): Promise<SessionAnchorResultV1> =>
      runWithOriginV1(
        "restart",
        publicationContext,
        (operationPublicationContext) =>
          created.runtimeControl.enqueueAuthoritative<SessionAnchorResultV1>(
            async () => {
              const snapshot = createInitialSnapshotV1();
              const outcome = {
                kind: "replace" as const,
                snapshot,
                result: {
                  kind: "anchored" as const,
                  commandSequence: parseNonNegativeSafeInteger(0),
                },
                anchor: "replace_replay_base" as const,
              };
              bindPersistenceAnchorReplacementInternalV1(
                persistence,
                outcome,
                [],
                undefined,
                () => ({
                  kind: "faulted" as const,
                  code: "runtime.anchor_failed" as const,
                }),
                operationPublicationContext,
              );
              return outcome;
            },
            () => ({
              kind: "faulted" as const,
              code: "runtime.anchor_failed" as const,
            }),
            undefined,
            () => ({
              kind: "rejected" as const,
              code: "hmr_invalidated" as const,
            }),
          ),
      );
    const prepareRestartV1 = (): PreparedCoreApplicationRestartInternalV1 => {
      const publicationContext = createAuthoritativeReplacementPublicationContextInternalV1(
        created.runtimeControl,
      );
      let result: Promise<SessionAnchorResultV1> | undefined;
      const run = (): Promise<SessionAnchorResultV1> => {
        if (result !== undefined) return result;
        const deferred = createDeferredV1<SessionAnchorResultV1>();
        result = deferred.promise;
        try {
          void runRestartWithPublicationContextV1(publicationContext).then(
            deferred.resolve,
            deferred.reject,
          );
        } catch (error) {
          deferred.reject(error);
        }
        return result;
      };
      return { publicationContext, run };
    };
    const restartV1 = (): Promise<SessionAnchorResultV1> => prepareRestartV1().run();

    // Player rollback (R7): a bounded timeline of committed Snapshots. The
    // timeline is instance-local presentation-adjacent state — it never enters
    // Saves — and it reseeds from the live Snapshot whenever the replay base
    // is replaced (load, import, restart, debug anchor), so rollback can never
    // cross into a different lineage. A new commit after Back drops the future
    // branch before its policy is applied. Checkpoints retain engine-owned
    // Snapshot references; mutating them through casts or other unsupported
    // JavaScript tricks is outside the runtime contract.
    interface RollbackCheckpointV1 {
      readonly snapshot: DeepReadonly<TTypes["snapshot"]>;
      readonly commandSequence: NonNegativeSafeInteger;
    }
    const rollbackPolicy = definition.rollback ?? null;
    const rollbackCapacity = rollbackPolicy === null
      ? 0
      : Math.max(1, Math.min(256, Math.trunc(rollbackPolicy.capacity)));
    let rollbackTimeline: RollbackCheckpointV1[] = [];
    let rollbackCursor = 0;
    let rollbackTimelineGeneration = 0;
    let navigatingRollbackTimeline = false;
    const rollbackListeners = new Set<() => void>();
    cleanups.push(() => rollbackListeners.clear());
    const notifyRollbackV1 = (): void => {
      for (const listener of [...rollbackListeners]) {
        try {
          listener();
        } catch (error) {
          reportObserverFailure(error);
        }
      }
    };
    const publishRollbackTimelineChangeV1 = (): void => {
      rollbackTimelineGeneration += 1;
      notifyRollbackV1();
    };

    const currentCheckpointV1 = (): RollbackCheckpointV1 => {
      const snapshot = created.session.getCurrentSnapshot();
      const sequence = (snapshot as { readonly commandSequence?: unknown }).commandSequence;
      return {
        snapshot,
        commandSequence: parseNonNegativeSafeInteger(typeof sequence === "number" ? sequence : 0),
      };
    };

    const resetRollbackTimelineV1 = (): void => {
      if (rollbackCapacity === 0) return;
      rollbackTimeline = [currentCheckpointV1()];
      rollbackCursor = 0;
      publishRollbackTimelineChangeV1();
    };

    function recordRollbackCheckpointV1(
      command: DeepReadonly<TTypes["command"]>,
      result: SessionDispatchResultOfV1<TTypes>,
    ): void {
      if (rollbackPolicy === null || disposed) return;
      if (result.kind !== "executed" || result.execution.kind !== "committed") {
        return;
      }
      // Any new commit after Back chooses a new branch. Classification then
      // decides whether the post-commit Snapshot starts a new lineage, adds a
      // user-visible stop, or only advances the current stop.
      rollbackTimeline = rollbackTimeline.slice(0, rollbackCursor + 1);
      const classification = rollbackPolicy.classify(command);
      if (classification === "barrier") {
        rollbackTimeline = [currentCheckpointV1()];
        rollbackCursor = 0;
        publishRollbackTimelineChangeV1();
        return;
      }
      if (classification === "transparent") {
        rollbackTimeline[rollbackCursor] = currentCheckpointV1();
        publishRollbackTimelineChangeV1();
        return;
      }
      rollbackTimeline.push(currentCheckpointV1());
      rollbackCursor = rollbackTimeline.length - 1;
      const maximumEntries = rollbackCapacity + 1;
      if (rollbackTimeline.length > maximumEntries) {
        rollbackTimeline = rollbackTimeline.slice(rollbackTimeline.length - maximumEntries);
        rollbackCursor = rollbackTimeline.length - 1;
      }
      publishRollbackTimelineChangeV1();
    }

    const navigateRollbackTimelineV1 = async (
      targetIndex: number,
      navigationOrigin: "rollback" | "rollforward",
    ): Promise<
      | {
        readonly kind: "anchored";
        readonly commandSequence: NonNegativeSafeInteger;
      }
      | { readonly kind: "unavailable" }
      | { readonly kind: "hmr_invalidated" }
    > => {
      const sourceCursor = rollbackCursor;
      const sourceCheckpoint = rollbackTimeline[sourceCursor];
      const target = rollbackTimeline[targetIndex];
      const timelineGeneration = rollbackTimelineGeneration;
      if (sourceCheckpoint === undefined || target === undefined || navigatingRollbackTimeline) {
        return { kind: "unavailable" };
      }
      navigatingRollbackTimeline = true;
      try {
        const anchored = await withOriginV1(
          navigationOrigin,
          (publicationContext) =>
            created.runtimeControl.enqueueAuthoritative<
              SessionAnchorResultV1 | { readonly kind: "unavailable" }
            >(
              async (current) => {
                if (
                  rollbackTimelineGeneration !== timelineGeneration ||
                  rollbackCursor !== sourceCursor ||
                  rollbackTimeline[sourceCursor] !== sourceCheckpoint ||
                  rollbackTimeline[targetIndex] !== target ||
                  current !== sourceCheckpoint.snapshot
                ) {
                  return {
                    kind: "preserve" as const,
                    result: { kind: "unavailable" as const },
                  };
                }
                const outcome = {
                  kind: "replace" as const,
                  snapshot: target.snapshot as TTypes["snapshot"],
                  result: {
                    kind: "anchored" as const,
                    commandSequence: target.commandSequence,
                  },
                  anchor: "replace_replay_base" as const,
                };
                bindPersistenceAnchorReplacementInternalV1(
                  persistence,
                  outcome,
                  [],
                  () => {
                    rollbackCursor = targetIndex;
                    publishRollbackTimelineChangeV1();
                  },
                  () => ({
                    kind: "faulted" as const,
                    code: "runtime.anchor_failed" as const,
                  }),
                  publicationContext,
                );
                return outcome;
              },
              () => ({
                kind: "faulted" as const,
                code: "runtime.anchor_failed" as const,
              }),
              undefined,
              () => ({
                kind: "rejected" as const,
                code: "hmr_invalidated" as const,
              }),
            ),
        );
        if (anchored.kind !== "anchored") {
          return anchored.kind === "rejected" && anchored.code === "hmr_invalidated"
            ? { kind: "hmr_invalidated" }
            : { kind: "unavailable" };
        }
        return {
          kind: "anchored",
          commandSequence: target.commandSequence,
        };
      } finally {
        navigatingRollbackTimeline = false;
      }
    };

    const rollbackPortV1: CoreRollbackPortV1 = {
      subscribe(listener: () => void): () => void {
        rollbackListeners.add(listener);
        return () => rollbackListeners.delete(listener);
      },
      available: () => ({
        steps: parseNonNegativeSafeInteger(rollbackCursor),
        forwardSteps: parseNonNegativeSafeInteger(
          Math.max(0, rollbackTimeline.length - rollbackCursor - 1),
        ),
      }),
      toPrevious: async (steps = 1): Promise<CoreRollbackResultV1> => {
        if (rollbackPolicy === null) {
          return {
            kind: "rejected" as const,
            code: "rollback_unconfigured" as const,
          };
        }
        if (
          !Number.isSafeInteger(steps) ||
          steps < 1 ||
          steps > rollbackCursor ||
          navigatingRollbackTimeline
        ) {
          return {
            kind: "rejected" as const,
            code: "rollback_unavailable" as const,
          };
        }
        const navigated = await navigateRollbackTimelineV1(
          rollbackCursor - steps,
          "rollback",
        );
        if (navigated.kind === "anchored") {
          return {
            kind: "rolled_back" as const,
            commandSequence: navigated.commandSequence,
          };
        }
        return {
          kind: "rejected" as const,
          code: navigated.kind === "hmr_invalidated"
            ? "hmr_invalidated" as const
            : "rollback_unavailable" as const,
        };
      },
      toNext: async (steps = 1): Promise<CoreRollForwardResultV1> => {
        if (rollbackPolicy === null) {
          return {
            kind: "rejected" as const,
            code: "rollback_unconfigured" as const,
          };
        }
        if (
          !Number.isSafeInteger(steps) ||
          steps < 1 ||
          steps > rollbackTimeline.length - rollbackCursor - 1 ||
          navigatingRollbackTimeline
        ) {
          return {
            kind: "rejected" as const,
            code: "rollforward_unavailable" as const,
          };
        }
        const navigated = await navigateRollbackTimelineV1(
          rollbackCursor + steps,
          "rollforward",
        );
        if (navigated.kind === "anchored") {
          return {
            kind: "rolled_forward" as const,
            commandSequence: navigated.commandSequence,
          };
        }
        return {
          kind: "rejected" as const,
          code: navigated.kind === "hmr_invalidated"
            ? "hmr_invalidated" as const
            : "rollforward_unavailable" as const,
        };
      },
    };

    // Seed the rollback timeline with the bootstrap state so the first commit
    // already has a checkpoint behind it.
    if (rollbackCapacity > 0) rollbackTimeline = [currentCheckpointV1()];

    // Story extensions: composer-constructed, composer-disposed. The UI
    // context reader binds late (after the UI composition mounts).
    const applicationDebugControlV1: GameSessionDebugControlV1<TTypes> = {
      ...validatedDebugControl,
      execute: async (
        command: DeepReadonly<TTypes["debugCommand"]>,
        isCapabilityEnabled: () => boolean,
      ) => {
        const result = await validatedDebugControl.execute(command, isCapabilityEnabled);
        if (result.kind === "executed" && result.attempt.result.kind === "committed") {
          // Debug execution is an out-of-band mutation authority rather than
          // a player checkpoint. Start a fresh timeline at the committed
          // Snapshot so Back/Forward cannot restore stale pre-debug state.
          resetRollbackTimelineV1();
          // Dispatch batches for committed debug commands are staged by
          // `onAttempt` and stamped by the semantic-port subscriber, exactly
          // like gameplay commits.
          const committedEvents = result.attempt.result
            .events as readonly DeepReadonly<TTypes["event"]>[];
          emitTransientEffectsFromEventsV1(committedEvents);
          emitNarrativeAsideFromEventsV1(committedEvents);
        }
        return result;
      },
    };
    let uiContextReader: (() => unknown) | undefined;
    const capabilityStateV1 = options.capabilityState ?? {
      getCurrent: () => ({
        debugTools: options.capabilities?.debugTools === true,
        cheats: false,
        automationBridge: false,
      }),
      subscribe: () => () => {},
    };
    const extensionOwner = definition.createExtensions?.(
      {
        provenance: application.provenance as Record<string, unknown>,
        appBuildId: options.appBuildId ?? null,
        resolved: application.resolved,
        session: {
          getCurrentSnapshot: () => created.session.getCurrentSnapshot(),
          getStatus: () => created.session.getStatus(),
          subscribe: (listener: () => void) => created.session.subscribe(listener),
        },
        runtimeControl: validatedRuntimeControl,
        commandLog: created.commandLog,
        debugControl: applicationDebugControlV1,
        invalidationController: {
          invalidateForHmr: invalidateForHmrV1,
        },
        persistence,
        runtimeFailures: () => runtimeFailures.entries(),
        capabilityState: capabilityStateV1,
        metadataClock: { now: () => options.host.now() },
        reportFailure: reportObserverFailure,
        createInitialSnapshot: createInitialSnapshotV1,
        latestAttemptFailure: () => latestAttemptFailure,
        readUiContext: () => uiContextReader?.(),
      },
    ) ?? undefined;
    if (extensionOwner?.dispose !== undefined) {
      const disposeExtensions = extensionOwner.dispose.bind(extensionOwner);
      cleanups.push(() => disposeExtensions());
    }

    let disposalKind: "ordinary" | "rebootstrap" | null = null;
    let ordinaryDisposalPromise: Promise<void> | undefined;
    let rebootstrapDisposalPromise:
      | Promise<DeepReadonly<CoreRebootstrapHandoffInternalV1>>
      | undefined;
    const runDisposalStepV1 = (step: () => void): void => {
      try {
        step();
      } catch (error) {
        reportObserverFailure(error);
      }
    };
    const beginDisposalV1 = (): void => {
      disposed = true;
      // Fence both authoritative and persistence mutation ingress before any
      // owned cleanup can reenter disposal or throw.
      invalidateForHmrV1();
      for (const cleanup of cleanups.splice(0)) runDisposalStepV1(cleanup);
    };
    const disposeForRebootstrapV1 = (): Promise<
      DeepReadonly<CoreRebootstrapHandoffInternalV1>
    > => {
      if (rebootstrapDisposalPromise !== undefined) return rebootstrapDisposalPromise;
      if (disposalKind !== null) {
        return Promise.reject(new TypeError("core.rebootstrap_disposal_unavailable"));
      }
      disposalKind = "rebootstrap";
      const deferred = createDeferredV1<DeepReadonly<CoreRebootstrapHandoffInternalV1>>();
      rebootstrapDisposalPromise = deferred.promise;
      beginDisposalV1();
      try {
        void disposePersistenceForRebootstrapInternalV1(persistence).then(
          deferred.resolve,
          deferred.reject,
        );
      } catch (error) {
        deferred.reject(error);
      }
      return rebootstrapDisposalPromise;
    };
    const disposeOrdinarilyV1 = (): Promise<void> => {
      if (ordinaryDisposalPromise !== undefined) return ordinaryDisposalPromise;
      if (disposalKind === "rebootstrap") {
        ordinaryDisposalPromise = Promise.resolve(rebootstrapDisposalPromise).then(
          () => undefined,
          (error) => reportObserverFailure(error),
        );
        return ordinaryDisposalPromise;
      }
      disposalKind = "ordinary";
      beginDisposalV1();
      ordinaryDisposalPromise = (async () => {
        try {
          await flushAutoSaveV1();
        } catch (error) {
          reportObserverFailure(error);
        }
        await persistence.dispose();
      })();
      return ordinaryDisposalPromise;
    };

    const admin: CoreApplicationAdminV1<TTypes> = {
      commandLog: () => created.commandLog.entries(),
      replayAuthoritatively: async () => {
        const identity = { provenance: application.provenance };
        const replayBase = created.commandLog.replayBase();
        const currentSnapshot = created.session.getCurrentSnapshot();
        return replayAuthoritativelyFromAttemptsInternalV1({
          identity,
          replayBase,
          replayBaseStateDigest: created.commandLog.replayBaseStateDigest(),
          commandLog: created.commandLog.entries() as never,
          currentSnapshot: currentSnapshot as never,
          validateSnapshot: (snapshot: DeepReadonly<TTypes["snapshot"]>) =>
            validateSnapshotRngV1(snapshot),
          projectStableRejection: (rejection: unknown) => rejection,
          projectStableFault: (fault: unknown) => fault,
          executeAttempt(
            preSnapshot: DeepReadonly<TTypes["snapshot"]>,
            logged: {
              readonly source?: "game" | "debug";
              readonly command: DeepReadonly<TTypes["command"]>;
            },
          ) {
            const admitReplayAttemptV1 = (
              execute: () => unknown,
              normalize: (
                error: unknown,
                snapshot: DeepReadonly<TTypes["snapshot"]>,
              ) => unknown,
              initialConstraint?: FinalizedEvidenceResultConstraintInternalV1,
            ) => {
              let candidate: unknown;
              try {
                candidate = execute();
                return acceptCoreTypedCommandAttemptInternalV1(
                  preSnapshot,
                  candidate as never,
                  coreTypedEvidencePolicyV1.validateCandidateSnapshot,
                  coreTypedEvidencePolicyV1.parseRejection,
                  initialConstraint,
                );
              } catch (error) {
                candidate = normalize(error, preSnapshot);
                return acceptCoreTypedCommandAttemptInternalV1(
                  preSnapshot,
                  candidate as never,
                  coreTypedEvidencePolicyV1.validateCandidateSnapshot,
                  coreTypedEvidencePolicyV1.parseRejection,
                  {
                    kind: "require",
                    resultKind: "faulted",
                    message: "Replay fault normalizer must return a faulted attempt",
                  },
                );
              }
            };
            // Debug-sourced log entries replay through the debug executor
            // with the same mark_modified integrity stamp the live session
            // applies, so the log stays one linear history across sources.
            if (logged.source === "debug") {
              const raw = admitReplayAttemptV1(
                () =>
                  isEngineDebugPatchStateKindV1(logged.command)
                    ? executeEngineStatePatchV1(
                      preSnapshot as never,
                      logged.command,
                      gameSimulation.stateSchema,
                    )
                    : gameSimulation.debugCommandExecutor.executeAttempt(
                      preSnapshot as never,
                      logged.command as never,
                      executionContext,
                    ),
                (error, snapshot) => {
                  if (definition.normalizeUnexpectedDebugFault === undefined) throw error;
                  return definition.normalizeUnexpectedDebugFault(error, snapshot);
                },
                {
                  kind: "forbid",
                  resultKind: "rejected",
                  message: "An admitted DebugCommand cannot be rejected",
                },
              ) as unknown as {
                readonly result: {
                  readonly kind: string;
                  readonly snapshot: {
                    readonly integrity: RunIntegrityV1;
                    readonly commandSequence: number;
                  };
                };
              };
              return raw.result.kind === "committed"
                ? ({
                  ...raw,
                  result: {
                    ...raw.result,
                    snapshot: finalizeSnapshotIntegrityV1(
                      preSnapshot as never,
                      raw.result.snapshot as never,
                      {
                        kind: "mark_modified",
                        reason: parseRunIntegrityReasonV1({
                          kind: "debug_command",
                          commandKind: String(
                            (logged.command as { readonly kind?: unknown }).kind ?? "",
                          ),
                          sequence: raw.result.snapshot.commandSequence,
                        }),
                      },
                    ),
                  },
                } as never)
                : (raw as never);
            }
            return admitReplayAttemptV1(
              () =>
                gameSimulation.commandExecutor.executeAttempt(
                  preSnapshot as never,
                  logged.command,
                  executionContext,
                ),
              (error, snapshot) => {
                if (definition.normalizeUnexpectedDispatchFault === undefined) throw error;
                return definition.normalizeUnexpectedDispatchFault(error, snapshot);
              },
            ) as never;
          },
        } as never, snapshotWorkInstrumentation);
      },
      inspectForTest: () => ({
        snapshot: created.session.getCurrentSnapshot(),
        runtimeFailures: runtimeFailures.entries(),
      }),
      stateDigest: () =>
        digestCanonical("sillymaker:state:v1", created.session.getCurrentSnapshot()),
      lastFaultCause: () => created.session.getLastFaultCause(),
      ...(options.capabilities?.debugTools === true
        ? {
          debugControl: applicationDebugControlV1,
        }
        : {}),
    };

    let maintenanceInstance: object | undefined;
    const unregisterInstanceInternalsV1 = (): void => {
      if (maintenanceInstance !== undefined) {
        coreSaveMaintenanceOperationsV1.delete(maintenanceInstance);
        coreApplicationCompositionControlsInternalV1.delete(maintenanceInstance);
      }
    };
    const instance = {
      storyId: application.storyId,
      storyRevision: application.storyRevision,
      semantic,
      persistence: persistencePort,
      flushAutoSave: flushAutoSaveV1,
      autoSaveIdle: () => persistence.autoSaveIdle(),
      lifecycle: { restart: restartV1 },
      rollback: rollbackPortV1,
      diagnostics: {
        runtimeFailures: () => runtimeFailures.entries(),
      },
      extensions: extensionOwner?.extensions,
      bindDebugUiContext: (reader: () => unknown) => {
        if (uiContextReader !== undefined) {
          throw new TypeError("core application UI context reader is already bound");
        }
        uiContextReader = reader;
        return () => {
          if (uiContextReader === reader) uiContextReader = undefined;
        };
      },
      presentationAnchor: currentAnchorV1,
      subscribePresentationAnchor: (listener: (anchor: CorePresentationAnchorV1) => void) => {
        anchorListeners.add(listener);
        return () => anchorListeners.delete(listener);
      },
      subscribeTransientEffects: (listener: (effect: TransientEffectV1) => void) => {
        effectListeners.add(listener);
        return () => effectListeners.delete(listener);
      },
      subscribeNarrativeAsides: (listener: (aside: NarrativeAsideV1) => void) => {
        asideListeners.add(listener);
        return () => asideListeners.delete(listener);
      },
      stageCueDispatches: () => latestStageCueDispatchBatchV1,
      bindToCurrentEpoch: <TArgs extends readonly unknown[], TValue>(
        callback: (...args: TArgs) => TValue,
      ) => {
        const boundEpoch = epoch;
        return (...args: TArgs): CoreEpochBoundOutcomeV1<TValue> => {
          if (disposed || epoch !== boundEpoch) {
            return { kind: "stale_epoch" as const };
          }
          return {
            kind: "current" as const,
            value: callback(...args),
          };
        };
      },
      admin,
      isDisposed: () => disposed,
      dispose: async () => {
        unregisterInstanceInternalsV1();
        await disposeOrdinarilyV1();
        return { kind: "disposed" as const };
      },
    };
    maintenanceInstance = instance;
    coreGameApplicationRebootstrapControlsInternalV1.set(
      instance,
      {
        invalidate: () => {
          unregisterInstanceInternalsV1();
          invalidateForHmrV1();
        },
        dispose: () => {
          unregisterInstanceInternalsV1();
          return disposeForRebootstrapV1();
        },
      },
    );
    coreSaveMaintenanceOperationsV1.set(instance, clearAllSavesForMaintenanceV1);
    coreApplicationCompositionControlsInternalV1.set(
      instance,
      {
        prepareRestart: prepareRestartV1,
        subscribePresentationAnchorEvents(
          listener: (event: CorePresentationAnchorEventInternalV1) => void,
        ): () => void {
          anchorEventListeners.add(listener);
          return () => anchorEventListeners.delete(listener);
        },
      },
    );
    return instance;
  } catch (error) {
    disposed = true;
    for (const cleanup of cleanups.splice(0)) {
      try {
        cleanup();
      } catch (cleanupError) {
        reportObserverFailure(cleanupError);
      }
    }
    if (persistenceService !== undefined) {
      fencePersistencePlayerMutationsInternalV1(persistenceService);
    }
    created.invalidationController.invalidateForHmr();
    if (rebootstrapStart === undefined) {
      if (persistenceService !== undefined) await persistenceService.dispose();
    } else {
      let outcome: DeepReadonly<CoreRebootstrapStartFailureInternalV1>;
      if (persistenceService === undefined) {
        // The handoff never crossed into Persistence, so its Save and released
        // fence are still the exact ready pair supplied by the predecessor.
        outcome = {
          kind: "ready" as const,
          handoff: rebootstrapStart.handoff,
        };
      } else {
        try {
          const latest = await disposePersistenceForRebootstrapInternalV1(persistenceService);
          outcome = { kind: "ready" as const, handoff: latest };
        } catch (handoffError) {
          reportObserverFailure(handoffError);
          outcome = { kind: "terminal" as const };
        }
      }
      try {
        rebootstrapStart.onFailure(outcome);
      } catch (callbackError) {
        reportObserverFailure(callbackError);
      }
    }
    throw error;
  }
}

/**
 * Creates one authoritative successor while keeping its exact handoff outside
 * the ordinary Core construction options.
 *
 * @internal
 */
export function createCoreGameApplicationInstanceForRebootstrapInternalV1<
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
>(
  application: ResolvedCoreGameApplicationV1<
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
  >,
  options: CreateCoreGameApplicationInstanceForRebootstrapOptionsInternalV1<
    TTypes["executionContext"]
  >,
): Promise<
  CoreGameApplicationInstanceV1<
    TTypes,
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult
  >
> {
  const readinessHooks = coreApplicationReadinessHooksInternalV1.get(options);
  coreApplicationReadinessHooksInternalV1.delete(options);
  const publicOptions: CreateCoreGameApplicationInstanceOptionsV1<
    TTypes["executionContext"]
  > = {
    host: options.host,
    executionContext: options.executionContext,
    ...(options.capabilities === undefined ? {} : { capabilities: options.capabilities }),
    ...(options.capabilityState === undefined ? {} : { capabilityState: options.capabilityState }),
    ...(options.autosave === undefined ? {} : { autosave: options.autosave }),
    ...(options.scheduler === undefined ? {} : { scheduler: options.scheduler }),
    ...(options.appBuildId === undefined ? {} : { appBuildId: options.appBuildId }),
  };
  if (readinessHooks !== undefined) {
    coreApplicationReadinessHooksInternalV1.set(publicOptions, readinessHooks);
  }
  coreGameApplicationRebootstrapStartInputsInternalV1.set(
    publicOptions,
    {
      handoff: options.handoff,
      onFailure: options.onRebootstrapStartFailureInternal,
    },
  );
  return createCoreGameApplicationInstanceV1(application, publicOptions);
}
