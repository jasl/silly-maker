// SPDX-License-Identifier: MIT
import type { SessionLeaseOwnerId } from "../../contracts/application.ts";
import type { TransientEffectRequestV1, TransientEffectV1 } from "../../contracts/asset-demand.ts";
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
import {
  createTransactionalRngV1,
  parseRngDrawTraceInternalV1,
  parseRngSeedInternalV1,
  RngStateSchemaFailureInternalV1,
  rngStateV1Schema,
} from "../../contracts/rng.ts";
import {
  admitCommandAttemptEvidenceInternalV1,
  type FinalizedEvidencePolicyInternalV1,
  type FinalizedEvidenceResultConstraintInternalV1,
  withDeferredSimulationEvidenceAdmissionInternalV1,
} from "../../internal/finalized-evidence-admission.ts";
import {
  admitCanonicalBootstrapInternalV1,
  type CanonicalBootstrapAdmissionHooksInternalV1,
} from "../../internal/canonical-bootstrap-admission.ts";
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
  PersistenceRebootstrapDisposalV1,
  PersistenceServiceV1,
  SaveSummaryProjectionInstrumentationInternalV1,
} from "../persistence/persistence-service.ts";
import {
  admitAdoptionDeclarationsInternalV1,
  bindPersistenceAnchorReplacementInternalV1,
  captureAutoSaveWithReceiptInternalV1,
  createInstrumentedPersistenceServiceV1,
  createPersistenceServiceV1,
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
  return Object.freeze({ promise, resolve, reject });
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
   * derived from committed command facts. The instance stamps a monotonic
   * sequence and the current presentation epoch; effects never enter State,
   * Saves, publications, or Agent transcripts.
   */
  projectTransientEffects?(
    facts: readonly DeepReadonly<TTypes["fact"]>[],
  ): readonly TransientEffectRequestV1[];
  /**
   * Optional presentation edge context (cue-identity proposal, accepted
   * 2026-08-17): the scene cue dispatches (and whole-scene opens) this
   * commit performed, derived from its committed facts. The instance admits
   * the list once (id patterns, bound), stamps it with the commit's
   * semantic revision and presentation epoch, and keeps only the latest
   * batch; the context never enters State, Saves, digests, replay, or
   * command identity.
   */
  projectStageCueDispatches?(
    facts: readonly DeepReadonly<TTypes["fact"]>[],
  ): readonly StageCueDispatchV1[];
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
   * Opt-in boot-time resume: after persistence is ready the instance
   * loads `auto.current` when it holds a runnable autosave, so a fresh
   * page (or headless host) continues the previous session instead of
   * bootstrapping a new one. An empty or incompatible slot silently
   * keeps the fresh bootstrap. This is what makes a title-screen
   * "Continue" button truthful.
   */
  readonly resumeFromAutosave?: boolean;
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
  return Object.freeze(captured);
}

function captureCoreAdoptionDeclarationsV1(
  definition: object,
): readonly DeepReadonly<PatchSetAdoptionDeclarationV1>[] {
  const descriptors = Object.getOwnPropertyDescriptors(definition);
  const adoptionDescriptor = descriptors.adoptionDeclarations;
  if (
    adoptionDescriptor !== undefined &&
    (adoptionDescriptor.get !== undefined || adoptionDescriptor.set !== undefined)
  ) {
    throw new TypeError("core application adoptionDeclarations accessors are forbidden");
  }
  const adoptionDeclarations = admitAdoptionDeclarationsInternalV1(
    adoptionDescriptor?.value ?? Object.freeze([]),
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

/** Immutable resolved definition: reusable across instances, no live resource. */
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
const defaultComposerBuildIdentityV1: BuildIdentityInputV1 = Object.freeze({
  engineVersion: "SillyMaker core composer",
  engine: Object.freeze([
    Object.freeze({
      path: "core-composer/engine.ts",
      sha256: composerValidationDigestV1,
      facet: "engine" as const,
    }),
  ]),
  storySimulation: Object.freeze([
    Object.freeze({
      path: "core-composer/simulation.ts",
      sha256: composerValidationDigestV1,
      facet: "story_simulation" as const,
    }),
  ]),
  storyPresentation: Object.freeze([
    Object.freeze({
      path: "core-composer/presentation.ts",
      sha256: composerValidationDigestV1,
      facet: "story_presentation" as const,
    }),
  ]),
  application: Object.freeze([]),
});

export interface ResolveCoreGameApplicationOptionsV1 {
  readonly buildIdentityInput?: BuildIdentityInputV1;
}

/**
 * Resolves the definition's GamePackage into an immutable resolved
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
    return Object.freeze({
      kind: "failed" as const,
      failure: Object.freeze({
        code: "save_adoption_declarations.invalid",
        details: Object.freeze({}),
      }),
    });
  }
  const admittedDefinition = Object.freeze({
    ...definition,
    adoptionDeclarations,
  });
  const result = resolveGamePackageV1(
    admittedDefinition.entry,
    [],
    options.buildIdentityInput ?? defaultComposerBuildIdentityV1,
  );
  if (result.kind === "failed") {
    return Object.freeze({
      kind: "failed" as const,
      failure: Object.freeze({
        code: result.failure.code,
        details: Object.freeze({ ...result.failure.details }),
      }),
    });
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
      return Object.freeze({
        kind: "failed" as const,
        failure: Object.freeze({
          code: "save_state_migration.current_identity_mismatch",
          details: Object.freeze({}),
        }),
      });
    }
  }
  return Object.freeze({
    kind: "resolved" as const,
    application: Object.freeze({
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
    }),
  });
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

const defaultSchedulerV1: CoreSchedulerV1 = Object.freeze({
  schedule(callback: () => void, delayMs: number) {
    const handle = setTimeout(callback, delayMs);
    return () => clearTimeout(handle);
  },
});

export type CoreApplicationConstructionEventInternalV1 =
  | "session_factory"
  | "persistence_factory";

export interface CoreApplicationConstructionInstrumentationInternalV1 {
  record(event: CoreApplicationConstructionEventInternalV1): unknown;
}

const constructionInstrumentationV1 = new WeakMap<
  CreateCoreGameApplicationInstanceOptionsV1,
  CoreApplicationConstructionInstrumentationInternalV1
>();
const snapshotWorkInstrumentationV1 = new WeakMap<
  CreateCoreGameApplicationInstanceOptionsV1,
  SnapshotWorkInstrumentationV1
>();
const saveProjectionInstrumentationV1 = new WeakMap<
  CreateCoreGameApplicationInstanceOptionsV1,
  SaveSummaryProjectionInstrumentationInternalV1
>();
const bootstrapAdmissionHooksV1 = new WeakMap<
  CreateCoreGameApplicationInstanceOptionsV1,
  CanonicalBootstrapAdmissionHooksInternalV1
>();

/**
 * Attaches a one-shot, observational construction probe for same-package tests.
 * This seam is intentionally absent from every package barrel.
 *
 * @internal
 */
export function instrumentCoreApplicationConstructionOptionsInternalV1(
  options: CreateCoreGameApplicationInstanceOptionsV1,
  instrumentation: CoreApplicationConstructionInstrumentationInternalV1,
): CreateCoreGameApplicationInstanceOptionsV1 {
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
export function instrumentCoreApplicationSnapshotWorkOptionsInternalV1(
  options: CreateCoreGameApplicationInstanceOptionsV1,
  instrumentation: SnapshotWorkInstrumentationV1,
): CreateCoreGameApplicationInstanceOptionsV1 {
  snapshotWorkInstrumentationV1.set(options, instrumentation);
  return options;
}

/** @internal One-shot Base Save-projector observation for package tests. */
export function instrumentCoreApplicationSaveProjectionOptionsInternalV1(
  options: CreateCoreGameApplicationInstanceOptionsV1,
  instrumentation: SaveSummaryProjectionInstrumentationInternalV1,
): CreateCoreGameApplicationInstanceOptionsV1 {
  saveProjectionInstrumentationV1.set(options, instrumentation);
  return options;
}

/** @internal One-shot bootstrap-admission failure seam for package tests. */
export function instrumentCoreApplicationBootstrapAdmissionOptionsInternalV1(
  options: CreateCoreGameApplicationInstanceOptionsV1,
  hooks: CanonicalBootstrapAdmissionHooksInternalV1,
): CreateCoreGameApplicationInstanceOptionsV1 {
  bootstrapAdmissionHooksV1.set(options, hooks);
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
    return Object.freeze({ mode: "every_commit" as const });
  }
  const mode: unknown = (configured as { readonly mode: unknown }).mode;
  if (mode === "every_commit") {
    return Object.freeze({ mode });
  }
  if (mode !== "debounced") {
    // Tag admission is outside AUTO0; preserve the existing runtime behavior
    // for an untyped caller that violates the discriminated union.
    return configured;
  }
  const debounced = configured as Extract<CoreAutosavePolicyV1, { readonly mode: "debounced" }>;
  const delayMs = parseNonNegativeSafeInteger(debounced.delayMs);
  const checkpointEveryCommands = debounced.checkpointEveryCommands;
  return Object.freeze({
    mode,
    delayMs,
    ...(checkpointEveryCommands === undefined
      ? {}
      : { checkpointEveryCommands: parsePositiveSafeInteger(checkpointEveryCommands) }),
  });
}

export type CorePresentationAnchorOriginV1 =
  | "bootstrap"
  | "load"
  | "import"
  | "restart"
  | "replay_anchor"
  | "rollback"
  | "replacement";

/**
 * Instance-local presentation continuity marker. The epoch advances whenever
 * the authoritative replay base is replaced (load, import, restart, debug
 * anchor); it never enters SemanticPublication, semantic revisions, or Agent
 * transcripts.
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

export interface CreateCoreGameApplicationInstanceOptionsV1 {
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
  /**
   * A persistence disposition handed over from a disposed predecessor
   * (dev rebootstrap): the successor defers lease acquisition to the
   * handoff instead of acquiring a fresh initial lease.
   */
  readonly rebootstrapDisposition?: DeepReadonly<PersistenceRebootstrapDisposalV1>;
}

/**
 * The player-rollback policy (R7): an opt-in, bounded checkpoint ring over
 * committed Snapshots. `classify` marks commands whose commit is a hard
 * barrier — settlements, day changes, irreversible story beats — that
 * rollback can never cross. RNG state travels inside every Snapshot, so a
 * rolled-back retry of the same command reproduces the same outcome
 * (pinned by default; no save-scum rerolls).
 */
export interface CoreRollbackPolicyV1<TCommand> {
  /** Ring capacity (checkpoints kept beyond the current state), 1..256. */
  readonly capacity: number;
  classify(command: DeepReadonly<TCommand>): "checkpoint" | "barrier";
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

export interface CoreRollbackPortV1 {
  /** Checkpoints currently reachable behind the live state. */
  available(): { readonly steps: NonNegativeSafeInteger };
  /** Restores the checkpoint `steps` behind the live state (default 1). */
  toPrevious(steps?: number): Promise<CoreRollbackResultV1>;
  /** Notifies after every ring change (commit, rollback, reseed). */
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
  /** Player rollback over the bounded checkpoint ring (R7). */
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
   * The latest commit's presentation edge context (cue-identity proposal,
   * accepted 2026-08-17): scene cue dispatches projected from that commit's
   * facts, stamped with exactly its semantic publication revision and the
   * presentation epoch at commit time. Nothing is stored beyond the latest
   * batch, anchor replacement (load/import/restart/rollback) clears it, and
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
  /**
   * Fences authoritative session and player-persistence mutation ingress for a
   * dev rebootstrap without releasing the persistence lease.
   */
  invalidateForHmr(): void;
  /**
   * Disposes the instance and returns the persistence handoff disposition a
   * successor passes back through `rebootstrapDisposition`.
   */
  disposeForRebootstrap(): Promise<DeepReadonly<PersistenceRebootstrapDisposalV1>>;
}

function readBootstrapRngSeedV1(
  bootstrap: unknown,
): Parameters<typeof createTransactionalRngV1>[0] {
  if (bootstrap === null || typeof bootstrap !== "object") {
    throw new TypeError(
      "core application bootstrap input must be an object carrying an rngSeed field",
    );
  }
  const descriptor = Object.getOwnPropertyDescriptor(bootstrap, "rngSeed");
  if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
    throw new TypeError(
      "core application bootstrap input must be an object carrying an rngSeed field",
    );
  }
  return descriptor.value as Parameters<typeof createTransactionalRngV1>[0];
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
  options: CreateCoreGameApplicationInstanceOptionsV1,
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
  const constructionInstrumentation = constructionInstrumentationV1.get(options);
  constructionInstrumentationV1.delete(options);
  const snapshotWorkInstrumentation = snapshotWorkInstrumentationV1.get(options);
  snapshotWorkInstrumentationV1.delete(options);
  const saveProjectionInstrumentation = saveProjectionInstrumentationV1.get(options);
  saveProjectionInstrumentationV1.delete(options);
  const bootstrapAdmissionHooks = bootstrapAdmissionHooksV1.get(options);
  bootstrapAdmissionHooksV1.delete(options);
  const autosave = normalizeCoreAutosavePolicyV1(options.autosave);
  const scheduler = options.scheduler ?? defaultSchedulerV1;
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
    if (snapshot === null || typeof snapshot !== "object") {
      throw new RngStateSchemaFailureInternalV1("invalid candidate Snapshot RNG");
    }
    const descriptor = Object.getOwnPropertyDescriptor(snapshot, "rng");
    if (
      descriptor === undefined ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      throw new RngStateSchemaFailureInternalV1("invalid candidate Snapshot RNG");
    }
    rngStateV1Schema.parse(descriptor.value);
  };
  const evidencePolicyV1: FinalizedEvidencePolicyInternalV1<
    TTypes["fact"],
    TTypes["rejection"],
    TTypes["rngState"],
    TTypes["rngDrawTrace"],
    TTypes["debugValidationError"]
  > = Object.freeze({
    validateCandidateSnapshot: (value: unknown) =>
      validateSnapshotRngV1(value as DeepReadonly<TTypes["snapshot"]>),
    parseFact: (value: unknown) => gameSimulation.factSchema.parse(value),
    parseRejection: (value: unknown) => gameSimulation.rejectionSchema.parse(value),
    parseRngState: (value: unknown) => rngStateV1Schema.parse(value) as TTypes["rngState"],
    parseRngDrawTrace: (value: unknown) =>
      parseRngDrawTraceInternalV1(value) as TTypes["rngDrawTrace"],
    parseDebugValidationError: (value: unknown) => {
      if (isEngineDebugPatchValidationErrorV1(value)) {
        return value as TTypes["debugValidationError"];
      }
      return gameSimulation.debugValidationErrorSchema.parse(value);
    },
  });
  const createInitialSnapshotV1 = (): TTypes["snapshot"] => {
    const bootstrap = admitCanonicalBootstrapInternalV1(
      gameSimulation.createBootstrapInput(options.host.entropy),
      snapshotWorkInstrumentation,
      bootstrapAdmissionHooks,
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

  // Presentation edge context: a committed attempt's facts are staged here
  // (the session calls `onAttempt` BEFORE it publishes) and stamped into
  // the dispatch batch by the instance's own first semantic-port
  // subscriber — so the batch already pairs with the publication when UI
  // subscribers render it. Stamping after the dispatch promise resolves is
  // too late: hosts that flush React synchronously inside the publication
  // notification would render (and retarget the stage) before the stamp.
  let pendingStageCueDispatchFactsV1:
    | readonly DeepReadonly<TTypes["fact"]>[]
    | null = null;

  // Steps below acquire live resources; anything after session creation is
  // failure-guarded so a failed construction leaves no owner or listener.
  const sessionInput: GameSessionInputV1<TTypes> = {
    initialSnapshot: createInitialSnapshotV1(),
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined as TTypes["executionContext"],
    executeAttempt: (snapshot, command) => {
      return withDeferredSimulationEvidenceAdmissionInternalV1(
        "simulation_game_execute",
        () =>
          gameSimulation.commandExecutor.executeAttempt(
            snapshot,
            command,
            undefined as TTypes["executionContext"],
          ),
      );
    },
    normalizeUnexpectedDispatchFault(error, snapshot) {
      if (definition.normalizeUnexpectedDispatchFault !== undefined) {
        return definition.normalizeUnexpectedDispatchFault(error, snapshot);
      }
      throw error;
    },
    debug: Object.freeze(
      {
        validate: (snapshot, command) =>
          withDeferredSimulationEvidenceAdmissionInternalV1(
            "simulation_debug_validate",
            () =>
              isEngineDebugPatchStateKindV1(command)
                ? validateEngineStatePatchV1(
                  snapshot as never,
                  command,
                  gameSimulation.stateSchema,
                ) as never
                : gameSimulation.debugCommandExecutor.validate(
                  snapshot,
                  command,
                  undefined as TTypes["executionContext"],
                ),
          ),
        executeAttempt: (snapshot, command) => {
          return withDeferredSimulationEvidenceAdmissionInternalV1(
            "simulation_debug_execute",
            () =>
              isEngineDebugPatchStateKindV1(command)
                ? executeEngineStatePatchV1(
                  snapshot as never,
                  command,
                  gameSimulation.stateSchema,
                )
                : gameSimulation.debugCommandExecutor.executeAttempt(
                  snapshot,
                  command,
                  undefined as TTypes["executionContext"],
                ),
          );
        },
        normalizeUnexpectedFault(error, snapshot) {
          if (definition.normalizeUnexpectedDebugFault !== undefined) {
            return definition.normalizeUnexpectedDebugFault(error, snapshot);
          }
          throw error;
        },
      } satisfies GameSessionDebugInputV1<TTypes>,
    ),
    onAttempt(attempt) {
      const result = (attempt as {
        readonly result?: { readonly kind?: unknown; readonly facts?: unknown };
      }).result;
      pendingStageCueDispatchFactsV1 = result?.kind === "committed"
        ? (result as { readonly facts: readonly DeepReadonly<TTypes["fact"]>[] }).facts
        : null;
      const pending = readLatestLoggedAttemptCommand();
      if (pending === undefined || result?.kind !== "faulted") return;
      latestAttemptFailure = Object.freeze({ ...pending, attempt });
    },
    onObserverFailure: reportObserverFailure,
  };
  recordCoreApplicationConstructionV1(constructionInstrumentation, "session_factory");
  const created = createCoreGameSessionInternalV1<TTypes>(
    sessionInput,
    evidencePolicyV1,
    snapshotWorkInstrumentation,
  );
  readLatestLoggedAttemptCommand = () => {
    const latest = created.commandLog.entries().at(-1);
    return latest === undefined
      ? undefined
      : Object.freeze({ source: latest.source, command: latest.command });
  };

  // The low-level Session controls stay generic. Standard Core wraps the
  // replacement seams it exposes so xorshift admission remains Core-owned and
  // invalid candidates never reach freeze, CommandLog preparation, or install.
  const validatedRuntimeControl: GameSessionRuntimeControlV1<TTypes["snapshot"]> = Object.freeze({
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
              return Object.freeze({
                kind: "preserve" as const,
                result: normalizeUnexpectedFault(error),
              });
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
  });
  let persistenceService: PersistenceServiceV1<TTypes["snapshot"]> | undefined;
  const validatedDebugControl: GameSessionDebugControlV1<TTypes> = Object.freeze({
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
            const replacement = Object.freeze({
              kind: outcome.kind,
              snapshot: outcome.snapshot,
              result: outcome.result,
            });
            bindPersistenceAnchorReplacementInternalV1(
              persistence,
              replacement,
              persistence.getSimulationLineage(),
              () => undefined,
              normalizeUnexpectedFault,
            );
            return replacement;
          } catch (error) {
            if (!(error instanceof RngStateSchemaFailureInternalV1)) throw error;
            if (created.session.getStatus() === "hmr_invalidated") throw error;
            try {
              return Object.freeze({
                kind: "preserve" as const,
                result: normalizeUnexpectedFault(error),
              });
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
  });

  let disposed = false;
  const cleanups: (() => void)[] = [];
  const presentationOriginsByPublicationContext = new WeakMap<
    object,
    CorePresentationAnchorOriginV1
  >();
  interface PendingLegacyPresentationOriginV1 {
    readonly origin: CorePresentationAnchorOriginV1;
  }
  let pendingLegacyPresentationOrigin: PendingLegacyPresentationOriginV1 | undefined;

  try {
    const stateOfSnapshotV1 = (
      snapshot: DeepReadonly<TTypes["snapshot"]>,
    ): DeepReadonly<TTypes["state"]> =>
      (snapshot as { readonly state: DeepReadonly<TTypes["state"]> }).state;

    const source: SemanticGamePortSourceV1<TTypes["state"], RuntimeSessionStatusV1> = Object.freeze(
      {
        getCurrentState: () => stateOfSnapshotV1(created.session.getCurrentSnapshot()),
        getAuthoritativeRevisionToken: () => created.session.getCurrentSnapshot(),
        getStatus: () => created.session.getStatus(),
        subscribe: (listener: () => void) => created.session.subscribe(listener),
        reportSubscriberFailure: reportObserverFailure,
        readStateAtQueueFront: <TReadResult>(
          reader: (state: DeepReadonly<TTypes["state"]>) => TReadResult,
        ) =>
          created.runtimeControl.readAtQueueFront((snapshot) =>
            reader(stateOfSnapshotV1(snapshot))
          ),
      },
    );

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
      dispatch: async (invocationValue) => {
        let invocation: TInvocation;
        try {
          invocation = definition.semantic.parseInvocation(invocationValue);
        } catch {
          return definition.semantic.invalidInvocationResult();
        }
        const command = definition.semantic.commandForInvocation(
          invocation as DeepReadonly<TInvocation>,
        ) as DeepReadonly<TTypes["command"]>;
        const result = await created.session.dispatch(command);
        recordRollbackCheckpointV1(command, result);
        emitTransientEffectsV1(result);
        return definition.semantic.projectDispatchResult(result);
      },
    });

    // The instance's own FIRST semantic-port subscriber (registration order
    // is the contract): stamp the staged commit facts as the dispatch batch
    // before any later subscriber — including hosts that flush React
    // synchronously — observes the new publication.
    cleanups.push(
      semantic.subscribe(() => {
        const facts = pendingStageCueDispatchFactsV1;
        if (facts === null) return;
        pendingStageCueDispatchFactsV1 = null;
        recordStageCueDispatchesFromFactsV1(facts);
      }),
    );

    recordCoreApplicationConstructionV1(constructionInstrumentation, "persistence_factory");
    const persistenceOptions: CreateStandardPersistenceServiceOptionsV1<
      TTypes["state"],
      TTypes["snapshot"]
    > = {
      runtimeControl: created.runtimeControl,
      records: options.host.records,
      snapshotSchema: snapshotSchema as never,
      provenance: application.provenance as never,
      adoptionDeclarations: definition.adoptionDeclarations ?? Object.freeze([]),
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
      metadataClock: Object.freeze({ now: () => options.host.now() }),
      exportFilename: definition.exportFilename ?? "sillymaker-application-save.json",
      ...(definition.manualSaveSlotCount === undefined
        ? {}
        : { manualSaveSlotCount: definition.manualSaveSlotCount }),
      ...(definition.summarizeSave === undefined ? {} : {
        summarizeSave: (state: DeepReadonly<TTypes["state"]>) => definition.summarizeSave!(state),
      }),
      autoSaveCapture: autosave.mode === "every_commit" ? "committed_snapshots" : "external",
      leaseAcquisition: options.rebootstrapDisposition === undefined
        ? "acquire_initial"
        : "deferred_rebootstrap",
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
    if (options.rebootstrapDisposition !== undefined) {
      // Dev rebootstrap: take over the predecessor's released lease through
      // its explicit handoff disposition instead of a fresh acquisition.
      await persistence.takeOverForRebootstrap(options.rebootstrapDisposition);
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
    const currentAnchorV1 = (): CorePresentationAnchorV1 => Object.freeze({ epoch, origin });
    cleanups.push(
      created.session.subscribe(() => {
        const replayBase = created.commandLog.replayBase();
        if (replayBase === lastReplayBase) return;
        lastReplayBase = replayBase;
        epoch = parseNonNegativeSafeInteger(epoch + 1);
        latestStageCueDispatchBatchV1 = null;
        const publicationContext = readActiveAuthoritativeReplacementPublicationContextInternalV1(
          created.runtimeControl,
        );
        if (publicationContext === null) {
          origin = pendingLegacyPresentationOrigin?.origin ?? "replacement";
        } else {
          origin = presentationOriginsByPublicationContext.get(publicationContext) ?? "replacement";
          presentationOriginsByPublicationContext.delete(publicationContext);
        }
        pendingLegacyPresentationOrigin = undefined;
        // A debounce candidate belongs to the replay base that produced it.
        // Never let an old-base timer write back over a load/import/restart/
        // rollback replacement.
        clearPendingAutoSaveForAnchorV1();
        // A replaced replay base invalidates the rollback lineage — except
        // for rollback itself, which already trimmed the surviving prefix.
        if (!rollingBack && rollbackCapacity > 0) {
          rollbackRing = [currentCheckpointV1()];
          notifyRollbackV1();
        }
        const anchor = currentAnchorV1();
        const event: CorePresentationAnchorEventInternalV1 = Object.freeze({
          anchor,
          publicationContext,
        });
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
    // command facts, stamped with a monotonic sequence and the epoch at
    // commit time. Nothing is stored, so re-projection and load/bootstrap
    // publications can never replay history.
    const effectListeners = new Set<(effect: TransientEffectV1) => void>();
    let effectSequence = 0;
    cleanups.push(() => effectListeners.clear());
    function emitTransientEffectsFromFactsV1(facts: readonly DeepReadonly<TTypes["fact"]>[]): void {
      const project = definition.semantic.projectTransientEffects;
      if (project === undefined || disposed) return;
      let requests: readonly TransientEffectRequestV1[];
      try {
        requests = project(facts);
      } catch (error) {
        reportObserverFailure(error);
        return;
      }
      for (const request of requests) {
        effectSequence += 1;
        const effect: TransientEffectV1 = Object.freeze({
          effectSequence,
          epoch: epoch as number,
          effectId: request.effectId,
          payload: request.payload,
        });
        for (const listener of [...effectListeners]) {
          try {
            listener(effect);
          } catch (error) {
            reportObserverFailure(error);
          }
        }
      }
    }

    function emitTransientEffectsV1(result: SessionDispatchResultOfV1<TTypes>): void {
      if (result.kind !== "executed" || result.execution.kind !== "committed") {
        return;
      }
      emitTransientEffectsFromFactsV1(
        result.execution.facts as readonly DeepReadonly<TTypes["fact"]>[],
      );
    }

    // Presentation edge context: the Story projection is public input, so
    // it is admitted once here (id patterns, dispatch bound); a failed or
    // invalid projection drops the context and the commit presents without
    // it. Called from the instance's first semantic-port subscriber, where
    // the port has already assigned this commit's publication revision but
    // no UI subscriber has rendered it yet — the stamp pairs exactly.
    function recordStageCueDispatchesFromFactsV1(
      facts: readonly DeepReadonly<TTypes["fact"]>[],
    ): void {
      const project = definition.semantic.projectStageCueDispatches;
      if (project === undefined || disposed) return;
      let dispatches: readonly StageCueDispatchV1[];
      try {
        dispatches = parseStageCueDispatchesV1(project(facts));
      } catch (error) {
        reportObserverFailure(error);
        return;
      }
      if (dispatches.length === 0) return;
      latestStageCueDispatchBatchV1 = Object.freeze({
        revision: semantic.observe().revision as number,
        epoch: epoch as number,
        dispatches,
      });
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
        if (autosave.mode === "debounced") {
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
        }
      }),
    );
    cleanups.push(clearPendingAutoSaveV1);

    const flushAutoSaveV1 = async (): Promise<void> => {
      clearPendingAutoSaveV1();
      try {
        while (true) {
          // Enqueue inside the synchronous queue-front reader. Awaiting the
          // Snapshot first would let a replacement anchor rotate between the
          // read and capture, assigning an old Snapshot to the new epoch.
          const attempt = await created.runtimeControl.readAtQueueFront((snapshot) =>
            Object.freeze({
              snapshot,
              settled: captureAutoSaveWithReceiptInternalV1(persistence, snapshot),
            })
          );
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
        onReplacementCommit: () => void,
        publicationContext: AuthoritativeReplacementPublicationContextInternalV1,
      ) => Promise<TOperationResult>,
    ): Promise<TOperationResult> => {
      const operationOrigin = Object.freeze({ origin: nextOrigin });
      presentationOriginsByPublicationContext.set(publicationContext, nextOrigin);
      try {
        return await operation(
          () => {
            if (presentationOriginsByPublicationContext.delete(publicationContext)) {
              pendingLegacyPresentationOrigin = operationOrigin;
            }
          },
          publicationContext,
        );
      } finally {
        presentationOriginsByPublicationContext.delete(publicationContext);
        if (pendingLegacyPresentationOrigin === operationOrigin) {
          pendingLegacyPresentationOrigin = undefined;
        }
      }
    };
    const withOriginV1 = <TOperationResult>(
      nextOrigin: CorePresentationAnchorOriginV1,
      operation: (
        onReplacementCommit: () => void,
        publicationContext: AuthoritativeReplacementPublicationContextInternalV1,
      ) => Promise<TOperationResult>,
    ): Promise<TOperationResult> =>
      runWithOriginV1(
        nextOrigin,
        createAuthoritativeReplacementPublicationContextInternalV1(created.runtimeControl),
        operation,
      );

    const persistencePort = Object.freeze({
      ...persistence.port,
      load: (slot: Parameters<typeof persistence.port.load>[0]) =>
        withOriginV1(
          "load",
          (onReplacementCommit, publicationContext) =>
            loadWithReplacementCommitInternalV1(
              persistence,
              slot,
              onReplacementCommit,
              publicationContext,
            ),
        ),
      importSave: (bytes: Uint8Array) =>
        withOriginV1(
          "import",
          (onReplacementCommit, publicationContext) =>
            importWithReplacementCommitInternalV1(
              persistence,
              bytes,
              onReplacementCommit,
              publicationContext,
            ),
        ),
    });

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
          return Object.freeze({
            kind: "preserve" as const,
            result: failures.size === 0
              ? Object.freeze({ kind: "cleared" as const })
              : Object.freeze({
                kind: "failed" as const,
                message: `Save cleanup incomplete: ${[...failures].join(", ")}`,
              }),
          });
        },
        (error) =>
          Object.freeze({
            kind: "failed" as const,
            message: maintenanceFailureMessageV1(error),
          }),
        undefined,
        () =>
          Object.freeze({
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
        (onReplacementCommit, operationPublicationContext) =>
          created.runtimeControl.enqueueAuthoritative<SessionAnchorResultV1>(
            async () => {
              const snapshot = createInitialSnapshotV1();
              const outcome = Object.freeze({
                kind: "replace" as const,
                snapshot,
                result: Object.freeze({
                  kind: "anchored" as const,
                  commandSequence: parseNonNegativeSafeInteger(0),
                }),
                anchor: "replace_replay_base" as const,
              });
              bindPersistenceAnchorReplacementInternalV1(
                persistence,
                outcome,
                [],
                onReplacementCommit,
                () =>
                  Object.freeze({
                    kind: "faulted" as const,
                    code: "runtime.anchor_failed" as const,
                  }),
                operationPublicationContext,
              );
              return outcome;
            },
            () =>
              Object.freeze({
                kind: "faulted" as const,
                code: "runtime.anchor_failed" as const,
              }),
            undefined,
            () =>
              Object.freeze({
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
      return Object.freeze({ publicationContext, run });
    };
    const restartV1 = (): Promise<SessionAnchorResultV1> => prepareRestartV1().run();

    // Player rollback (R7): a bounded ring of committed Snapshots. The ring
    // is instance-local presentation-adjacent state — it never enters Saves
    // — and it reseeds from the live Snapshot whenever the replay base is
    // replaced (load, import, restart, debug anchor), so rollback can never
    // cross into a different lineage. A barrier commit clears everything
    // behind it. Snapshots are immutable, so keeping references is cheap.
    interface RollbackCheckpointV1 {
      readonly snapshot: DeepReadonly<TTypes["snapshot"]>;
      readonly commandSequence: NonNegativeSafeInteger;
    }
    const rollbackPolicy = definition.rollback ?? null;
    const rollbackCapacity = rollbackPolicy === null
      ? 0
      : Math.max(1, Math.min(256, Math.trunc(rollbackPolicy.capacity)));
    let rollbackRing: RollbackCheckpointV1[] = [];
    let rollingBack = false;
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

    const currentCheckpointV1 = (): RollbackCheckpointV1 => {
      const snapshot = created.session.getCurrentSnapshot();
      const sequence = (snapshot as { readonly commandSequence?: unknown }).commandSequence;
      return Object.freeze({
        snapshot,
        commandSequence: parseNonNegativeSafeInteger(typeof sequence === "number" ? sequence : 0),
      });
    };

    function recordRollbackCheckpointV1(
      command: DeepReadonly<TTypes["command"]>,
      result: SessionDispatchResultOfV1<TTypes>,
    ): void {
      if (rollbackPolicy === null || disposed) return;
      if (result.kind !== "executed" || result.execution.kind !== "committed") {
        return;
      }
      // The pre-commit state is already in the ring (seeded at bootstrap and
      // after every commit). A barrier commit invalidates everything behind
      // itself: the post-barrier state becomes the new earliest checkpoint.
      if (rollbackPolicy.classify(command) === "barrier") {
        rollbackRing = [currentCheckpointV1()];
        notifyRollbackV1();
        return;
      }
      rollbackRing.push(currentCheckpointV1());
      if (rollbackRing.length > rollbackCapacity) {
        rollbackRing = rollbackRing.slice(rollbackRing.length - rollbackCapacity);
      }
      notifyRollbackV1();
    }

    const rollbackPortV1: CoreRollbackPortV1 = Object.freeze({
      subscribe(listener: () => void): () => void {
        rollbackListeners.add(listener);
        return () => rollbackListeners.delete(listener);
      },
      available: () =>
        Object.freeze({
          // The newest ring entry mirrors the live state; reachable
          // checkpoints are the ones strictly behind it.
          steps: parseNonNegativeSafeInteger(Math.max(0, rollbackRing.length - 1)),
        }),
      toPrevious: async (steps = 1): Promise<CoreRollbackResultV1> => {
        if (rollbackPolicy === null) {
          return Object.freeze({
            kind: "rejected" as const,
            code: "rollback_unconfigured" as const,
          });
        }
        if (
          !Number.isSafeInteger(steps) ||
          steps < 1 ||
          steps > Math.max(0, rollbackRing.length - 1) ||
          rollingBack
        ) {
          return Object.freeze({
            kind: "rejected" as const,
            code: "rollback_unavailable" as const,
          });
        }
        const targetIndex = rollbackRing.length - 1 - steps;
        const target = rollbackRing[targetIndex];
        if (target === undefined) {
          return Object.freeze({
            kind: "rejected" as const,
            code: "rollback_unavailable" as const,
          });
        }
        rollingBack = true;
        try {
          const anchored = await withOriginV1(
            "rollback",
            (onReplacementCommit, publicationContext) =>
              created.runtimeControl.enqueueAuthoritative<SessionAnchorResultV1>(
                async () => {
                  const outcome = Object.freeze({
                    kind: "replace" as const,
                    snapshot: target.snapshot as TTypes["snapshot"],
                    result: Object.freeze({
                      kind: "anchored" as const,
                      commandSequence: target.commandSequence,
                    }),
                    anchor: "replace_replay_base" as const,
                  });
                  bindPersistenceAnchorReplacementInternalV1(
                    persistence,
                    outcome,
                    [],
                    onReplacementCommit,
                    () =>
                      Object.freeze({
                        kind: "faulted" as const,
                        code: "runtime.anchor_failed" as const,
                      }),
                    publicationContext,
                  );
                  return outcome;
                },
                () =>
                  Object.freeze({
                    kind: "faulted" as const,
                    code: "runtime.anchor_failed" as const,
                  }),
                undefined,
                () =>
                  Object.freeze({
                    kind: "rejected" as const,
                    code: "hmr_invalidated" as const,
                  }),
              ),
          );
          if (anchored.kind !== "anchored") {
            return anchored.kind === "rejected" && anchored.code === "hmr_invalidated"
              ? Object.freeze({
                kind: "rejected" as const,
                code: "hmr_invalidated" as const,
              })
              : Object.freeze({
                kind: "rejected" as const,
                code: "rollback_unavailable" as const,
              });
          }
          // Keep the target and everything before it: the player may step
          // further back. (The anchor listener reseeds the ring on replay
          // base replacement; trim to the target here so the reseed appends
          // onto the surviving prefix.)
          rollbackRing = rollbackRing.slice(0, targetIndex + 1);
          notifyRollbackV1();
          return Object.freeze({
            kind: "rolled_back" as const,
            commandSequence: target.commandSequence,
          });
        } finally {
          rollingBack = false;
        }
      },
    });

    // Seed the rollback ring with the bootstrap state so the first commit
    // already has a checkpoint behind it.
    if (rollbackCapacity > 0) rollbackRing = [currentCheckpointV1()];

    // Story extensions: composer-constructed, composer-disposed. The UI
    // context reader binds late (after the UI composition mounts).
    let uiContextReader: (() => unknown) | undefined;
    const capabilityStateV1 = options.capabilityState ?? {
      getCurrent: () =>
        Object.freeze({
          debugTools: options.capabilities?.debugTools === true,
          cheats: false,
          automationBridge: false,
        }),
      subscribe: () => () => {},
    };
    const extensionOwner = definition.createExtensions?.(
      Object.freeze({
        provenance: application.provenance as Record<string, unknown>,
        appBuildId: options.appBuildId ?? null,
        resolved: application.resolved,
        session: Object.freeze({
          getCurrentSnapshot: () => created.session.getCurrentSnapshot(),
          getStatus: () => created.session.getStatus(),
          subscribe: (listener: () => void) => created.session.subscribe(listener),
        }),
        runtimeControl: validatedRuntimeControl,
        commandLog: created.commandLog,
        debugControl: validatedDebugControl,
        invalidationController: Object.freeze({
          invalidateForHmr: invalidateForHmrV1,
        }),
        persistence,
        runtimeFailures: () => runtimeFailures.entries(),
        capabilityState: capabilityStateV1,
        metadataClock: Object.freeze({ now: () => options.host.now() }),
        reportFailure: reportObserverFailure,
        createInitialSnapshot: createInitialSnapshotV1,
        latestAttemptFailure: () => latestAttemptFailure,
        readUiContext: () => uiContextReader?.(),
      }),
    ) ?? undefined;
    if (extensionOwner?.dispose !== undefined) {
      const disposeExtensions = extensionOwner.dispose.bind(extensionOwner);
      cleanups.push(() => disposeExtensions());
    }

    let disposalPromise: Promise<DeepReadonly<PersistenceRebootstrapDisposalV1>> | undefined;
    const disposeForRebootstrapV1 = (): Promise<DeepReadonly<PersistenceRebootstrapDisposalV1>> => {
      if (disposalPromise !== undefined) return disposalPromise;
      const deferred = createDeferredV1<DeepReadonly<PersistenceRebootstrapDisposalV1>>();
      disposalPromise = deferred.promise;
      disposed = true;
      const runDisposalStepV1 = (step: () => void): void => {
        try {
          step();
        } catch (error) {
          reportObserverFailure(error);
        }
      };
      // Fence both authoritative and persistence mutation ingress before any
      // owned cleanup can reenter disposal or throw.
      invalidateForHmrV1();
      for (const cleanup of cleanups.splice(0)) runDisposalStepV1(cleanup);
      try {
        void persistence.disposeForRebootstrap().then(deferred.resolve, deferred.reject);
      } catch (error) {
        deferred.reject(error);
      }
      return disposalPromise;
    };

    const admin: CoreApplicationAdminV1<TTypes> = Object.freeze({
      commandLog: () => created.commandLog.entries(),
      replayAuthoritatively: async () => {
        const identity = Object.freeze({ provenance: application.provenance });
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
                return admitCommandAttemptEvidenceInternalV1(
                  preSnapshot,
                  candidate as never,
                  evidencePolicyV1,
                  snapshotWorkInstrumentation,
                  initialConstraint,
                );
              } catch (error) {
                candidate = normalize(error, preSnapshot);
                return admitCommandAttemptEvidenceInternalV1(
                  preSnapshot,
                  candidate as never,
                  evidencePolicyV1,
                  snapshotWorkInstrumentation,
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
                  withDeferredSimulationEvidenceAdmissionInternalV1(
                    "simulation_debug_execute",
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
                          undefined as TTypes["executionContext"],
                        ),
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
                withDeferredSimulationEvidenceAdmissionInternalV1(
                  "simulation_game_execute",
                  () =>
                    gameSimulation.commandExecutor.executeAttempt(
                      preSnapshot as never,
                      logged.command,
                      undefined as TTypes["executionContext"],
                    ),
                ),
              (error, snapshot) => {
                if (definition.normalizeUnexpectedDispatchFault === undefined) throw error;
                return definition.normalizeUnexpectedDispatchFault(error, snapshot);
              },
            ) as never;
          },
        } as never, snapshotWorkInstrumentation);
      },
      inspectForTest: () =>
        Object.freeze({
          snapshot: created.session.getCurrentSnapshot(),
          runtimeFailures: runtimeFailures.entries(),
        }),
      stateDigest: () =>
        digestCanonical("sillymaker:state:v1", created.session.getCurrentSnapshot()),
      lastFaultCause: () => created.session.getLastFaultCause(),
      ...(options.capabilities?.debugTools === true
        ? {
          debugControl: Object.freeze({
            ...validatedDebugControl,
            // Committed debug commands raise the same commit-only
            // transient effects as gameplay: tuning previews (forced
            // encounters, SFX) render through one path.
            execute: async (
              command: DeepReadonly<TTypes["debugCommand"]>,
              isCapabilityEnabled: () => boolean,
            ) => {
              const result = await validatedDebugControl.execute(command, isCapabilityEnabled);
              if (result.kind === "executed" && result.attempt.result.kind === "committed") {
                // Dispatch batches for committed debug commands are staged
                // by `onAttempt` and stamped by the semantic-port
                // subscriber, exactly like gameplay commits.
                emitTransientEffectsFromFactsV1(
                  result.attempt.result.facts as readonly DeepReadonly<TTypes["fact"]>[],
                );
              }
              return result;
            },
          }),
        }
        : {}),
    });

    let maintenanceInstance: object | undefined;
    const unregisterInstanceInternalsV1 = (): void => {
      if (maintenanceInstance !== undefined) {
        coreSaveMaintenanceOperationsV1.delete(maintenanceInstance);
        coreApplicationCompositionControlsInternalV1.delete(maintenanceInstance);
      }
    };
    const instance = Object.freeze({
      storyId: application.storyId,
      storyRevision: application.storyRevision,
      semantic,
      persistence: persistencePort,
      flushAutoSave: flushAutoSaveV1,
      autoSaveIdle: () => persistence.autoSaveIdle(),
      lifecycle: Object.freeze({ restart: restartV1 }),
      rollback: rollbackPortV1,
      diagnostics: Object.freeze({
        runtimeFailures: () => runtimeFailures.entries(),
      }),
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
      stageCueDispatches: () => latestStageCueDispatchBatchV1,
      bindToCurrentEpoch: <TArgs extends readonly unknown[], TValue>(
        callback: (...args: TArgs) => TValue,
      ) => {
        const boundEpoch = epoch;
        return (...args: TArgs): CoreEpochBoundOutcomeV1<TValue> => {
          if (disposed || epoch !== boundEpoch) {
            return Object.freeze({ kind: "stale_epoch" as const });
          }
          return Object.freeze({
            kind: "current" as const,
            value: callback(...args),
          });
        };
      },
      admin,
      isDisposed: () => disposed,
      dispose: async () => {
        unregisterInstanceInternalsV1();
        await disposeForRebootstrapV1();
        return Object.freeze({ kind: "disposed" as const });
      },
      invalidateForHmr: () => {
        unregisterInstanceInternalsV1();
        invalidateForHmrV1();
      },
      disposeForRebootstrap: () => {
        unregisterInstanceInternalsV1();
        return disposeForRebootstrapV1();
      },
    });
    maintenanceInstance = instance;
    coreSaveMaintenanceOperationsV1.set(instance, clearAllSavesForMaintenanceV1);
    coreApplicationCompositionControlsInternalV1.set(
      instance,
      Object.freeze({
        prepareRestart: prepareRestartV1,
        subscribePresentationAnchorEvents(
          listener: (event: CorePresentationAnchorEventInternalV1) => void,
        ): () => void {
          anchorEventListeners.add(listener);
          return () => anchorEventListeners.delete(listener);
        },
      }),
    );
    return instance;
  } catch (error) {
    disposed = true;
    for (const cleanup of cleanups.splice(0)) cleanup();
    if (persistenceService !== undefined) {
      fencePersistencePlayerMutationsInternalV1(persistenceService);
    }
    created.invalidationController.invalidateForHmr();
    if (persistenceService !== undefined) {
      await persistenceService.disposeForRebootstrap();
    }
    throw error;
  }
}
