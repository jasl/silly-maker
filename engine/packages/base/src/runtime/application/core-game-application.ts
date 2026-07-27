// SPDX-License-Identifier: MIT
import type { SessionLeaseOwnerId } from "../../contracts/application.js";
import type { TransientEffectRequestV1, TransientEffectV1 } from "../../contracts/asset-demand.js";
import type { SemanticGamePortSourceV1, SemanticGamePortV1 } from "../../contracts/application.js";
import type { BuildIdentityInputV1 } from "../../authoring/build-identity.js";
import { resolveGamePackageV1 } from "../../authoring/story-resolver.js";
import { digestBytes, digestCanonical } from "../../contracts/digest.js";
import type { GamePackageV1 } from "../../contracts/game-package.js";
import type {
  BootstrapEntropyV1,
  GameSimulationTypeMapV1,
  GameSimulationV1,
} from "../../contracts/gameplay-module.js";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "../../contracts/host.js";
import { createTransactionalRngV1, rngStateV1Schema } from "../../contracts/rng.js";
import type {
  RuntimeSessionStatusV1,
  SessionAnchorResultV1,
} from "../../contracts/session-status.js";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
} from "../../contracts/snapshot.js";
import type { DeepReadonly, Digest, NonNegativeSafeInteger } from "../../contracts/values.js";
import { parseNonNegativeSafeInteger } from "../../contracts/values.js";
import type { ReplayComparisonV1 } from "../diagnostics/replay.js";
import { replayAuthoritativelyV1 } from "../diagnostics/replay.js";
import type { RuntimeOperationFaultV1 } from "../../contracts/diagnostics.js";
import {
  createRuntimeFailureBufferV1,
  createRuntimeFailureReporterV1,
} from "../diagnostics/runtime-failures.js";
import type {
  GameSessionCompositionV1,
  GameSessionDebugInputV1,
  GameSessionV1,
} from "../session/game-session.js";
import { createGameSessionV1 } from "../session/game-session.js";
import type { PersistenceServiceV1 } from "../persistence/persistence-service.js";
import { createPersistenceServiceV1 } from "../persistence/persistence-service.js";
import { createSemanticGamePortV1 } from "./semantic-game-port.js";

type SessionDispatchResultOfV1<TTypes extends GameSimulationTypeMapV1> = Awaited<
  ReturnType<GameSessionV1<TTypes>["dispatch"]>
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
  validateReferences?(state: DeepReadonly<TTypes["state"]>): readonly string[];
  validateInvariants?(view: {
    readonly state: DeepReadonly<TTypes["state"]>;
    readonly commandSequence: NonNegativeSafeInteger;
  }): readonly string[];
  readonly exportFilename?: string;
  normalizeUnexpectedDispatchFault?(
    error: unknown,
    snapshot: DeepReadonly<TTypes["snapshot"]>,
  ): never;
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
  if (typeof definition.entry?.define !== "function") {
    throw new TypeError("core application definition requires a GamePackage entry");
  }
  if (typeof definition.semantic?.parseInvocation !== "function") {
    throw new TypeError("core application definition requires a semantic adapter");
  }
  return Object.freeze({ ...definition });
}

interface ResolvedGamePackageSliceV1 {
  readonly provenance: {
    readonly story: { readonly id: string; readonly revision: number; readonly digest: Digest };
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
      readonly failure: { readonly code: string; readonly details: Record<string, unknown> };
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
  const result = resolveGamePackageV1(
    definition.entry,
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
  return Object.freeze({
    kind: "resolved" as const,
    application: Object.freeze({
      definition,
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
 * `checkpointEveryCommands` commits). Explicit slot saves are always allowed.
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

export type CorePresentationAnchorOriginV1 =
  "bootstrap" | "load" | "import" | "restart" | "replay_anchor" | "replacement";

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
  { readonly kind: "current"; readonly value: TValue } | { readonly kind: "stale_epoch" };

export interface CreateCoreGameApplicationInstanceOptionsV1 {
  readonly host: CoreApplicationHostServicesV1;
  readonly capabilities?: { readonly debugTools?: boolean };
  readonly autosave?: CoreAutosavePolicyV1;
  readonly scheduler?: CoreSchedulerV1;
}

export interface CoreApplicationAdminV1<TTypes extends GameSimulationTypeMapV1> {
  commandLog(): ReturnType<GameSessionCompositionV1<TTypes>["commandLog"]["entries"]>;
  replayAuthoritatively(): Promise<ReplayComparisonV1>;
  inspectForTest(): {
    readonly snapshot: DeepReadonly<TTypes["snapshot"]>;
    readonly runtimeFailures: readonly unknown[];
  };
  stateDigest(): Digest;
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
  readonly diagnostics: {
    runtimeFailures(): readonly RuntimeOperationFaultV1[];
  };
  presentationAnchor(): CorePresentationAnchorV1;
  subscribePresentationAnchor(listener: (anchor: CorePresentationAnchorV1) => void): () => void;
  /**
   * Commit-only transient effect stream. Effects are emitted live as
   * commands commit — stamped with a monotonic per-instance sequence and
   * the presentation epoch at commit time. Load and bootstrap publications
   * carry no history, so new epochs never replay old effects.
   */
  subscribeTransientEffects(listener: (effect: TransientEffectV1) => void): () => void;
  bindToCurrentEpoch<TArgs extends readonly unknown[], TValue>(
    callback: (...args: TArgs) => TValue,
  ): (...args: TArgs) => CoreEpochBoundOutcomeV1<TValue>;
  readonly admin: CoreApplicationAdminV1<TTypes>;
  isDisposed(): boolean;
  dispose(): Promise<{ readonly kind: "disposed" }>;
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
  const autosave = options.autosave ?? Object.freeze({ mode: "every_commit" as const });
  if (autosave.mode === "debounced" && !(autosave.delayMs >= 0)) {
    throw new TypeError("debounced autosave policy requires a non-negative delayMs");
  }
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
  const createInitialSnapshotV1 = (): TTypes["snapshot"] => {
    const bootstrap = gameSimulation.createBootstrapInput(options.host.entropy);
    return snapshotSchema.parse({
      state: gameSimulation.createInitialState(bootstrap as DeepReadonly<TTypes["bootstrapInput"]>),
      rng: createTransactionalRngV1(readBootstrapRngSeedV1(bootstrap)).candidateState(),
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

  // Steps below acquire live resources; anything after session creation is
  // failure-guarded so a failed construction leaves no owner or listener.
  const created = createGameSessionV1<TTypes>({
    initialSnapshot: createInitialSnapshotV1(),
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined as TTypes["executionContext"],
    executeAttempt: (snapshot, command) =>
      gameSimulation.commandExecutor.executeAttempt(
        snapshot,
        command,
        undefined as TTypes["executionContext"],
      ),
    normalizeUnexpectedDispatchFault(error, snapshot) {
      if (definition.normalizeUnexpectedDispatchFault !== undefined) {
        return definition.normalizeUnexpectedDispatchFault(error, snapshot);
      }
      throw error;
    },
    debug: Object.freeze({
      validate: (snapshot, command) =>
        gameSimulation.debugCommandExecutor.validate(
          snapshot,
          command,
          undefined as TTypes["executionContext"],
        ),
      executeAttempt: (snapshot, command) =>
        gameSimulation.debugCommandExecutor.executeAttempt(
          snapshot,
          command,
          undefined as TTypes["executionContext"],
        ),
      normalizeUnexpectedFault(error: unknown): never {
        throw error;
      },
    } satisfies GameSessionDebugInputV1<TTypes>),
    onObserverFailure: reportObserverFailure,
  });

  let disposed = false;
  const cleanups: (() => void)[] = [];
  let persistenceService: PersistenceServiceV1<TTypes["snapshot"]> | undefined;

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
            reader(stateOfSnapshotV1(snapshot)),
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
        const result = await created.session.dispatch(
          definition.semantic.commandForInvocation(
            invocation as DeepReadonly<TInvocation>,
          ) as DeepReadonly<TTypes["command"]>,
        );
        emitTransientEffectsV1(result);
        return definition.semantic.projectDispatchResult(result);
      },
    });

    persistenceService = await createPersistenceServiceV1<TTypes["state"], TTypes["snapshot"]>({
      runtimeControl: created.runtimeControl,
      records: options.host.records,
      snapshotSchema: snapshotSchema as never,
      provenance: application.provenance as never,
      adoptionDeclaration: null,
      ownerId: options.host.ownerId,
      nextHandoffRequestId: () => options.host.nextHandoffRequestId() as never,
      validateReferences: (state) => definition.validateReferences?.(state as never) ?? [],
      validateInvariants: (view) =>
        definition.validateInvariants?.(
          view as {
            readonly state: DeepReadonly<TTypes["state"]>;
            readonly commandSequence: NonNegativeSafeInteger;
          },
        ) ?? [],
      initialSimulationLineage: [],
      metadataClock: Object.freeze({ now: () => options.host.now() }),
      exportFilename: definition.exportFilename ?? "sillymaker-application-save.json",
      autoSaveCapture: autosave.mode === "every_commit" ? "committed_snapshots" : "external",
    });
    const persistence = persistenceService;

    // Presentation anchor/epoch: advance whenever the authoritative replay
    // base is replaced. Instance-local only.
    let epoch = parseNonNegativeSafeInteger(0);
    let origin: CorePresentationAnchorOriginV1 = "bootstrap";
    let pendingOrigin: CorePresentationAnchorOriginV1 | undefined;
    let lastReplayBase: unknown = created.commandLog.replayBase();
    const anchorListeners = new Set<(anchor: CorePresentationAnchorV1) => void>();
    const currentAnchorV1 = (): CorePresentationAnchorV1 => Object.freeze({ epoch, origin });
    cleanups.push(
      created.session.subscribe(() => {
        const replayBase = created.commandLog.replayBase();
        if (replayBase === lastReplayBase) return;
        lastReplayBase = replayBase;
        epoch = parseNonNegativeSafeInteger(epoch + 1);
        origin = pendingOrigin ?? "replacement";
        pendingOrigin = undefined;
        const anchor = currentAnchorV1();
        for (const listener of [...anchorListeners]) {
          try {
            listener(anchor);
          } catch (error) {
            reportObserverFailure(error);
          }
        }
      }),
    );
    cleanups.push(() => anchorListeners.clear());

    // Commit-only transient effect stream: effects derive from committed
    // command facts, stamped with a monotonic sequence and the epoch at
    // commit time. Nothing is stored, so re-projection and load/bootstrap
    // publications can never replay history.
    const effectListeners = new Set<(effect: TransientEffectV1) => void>();
    let effectSequence = 0;
    cleanups.push(() => effectListeners.clear());
    function emitTransientEffectsV1(result: SessionDispatchResultOfV1<TTypes>): void {
      const project = definition.semantic.projectTransientEffects;
      if (project === undefined || disposed) return;
      if (result.kind !== "executed" || result.execution.kind !== "committed") return;
      let requests: readonly TransientEffectRequestV1[];
      try {
        requests = project(result.execution.facts as readonly DeepReadonly<TTypes["fact"]>[]);
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

    // Autosave policy wiring.
    let cancelFlushTimer: (() => void) | undefined;
    let pendingAutoSnapshot: DeepReadonly<TTypes["snapshot"]> | undefined;
    let commandsSinceCapture = 0;
    const captureNowV1 = (): void => {
      cancelFlushTimer?.();
      cancelFlushTimer = undefined;
      const snapshot = pendingAutoSnapshot;
      pendingAutoSnapshot = undefined;
      commandsSinceCapture = 0;
      if (snapshot !== undefined) persistence.captureAutoSave(snapshot);
    };
    if (autosave.mode === "debounced") {
      cleanups.push(
        created.runtimeControl.subscribeCommittedSnapshots((snapshot) => {
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
      cleanups.push(() => {
        cancelFlushTimer?.();
        cancelFlushTimer = undefined;
      });
    }

    const withOriginV1 = async <TOperationResult>(
      nextOrigin: CorePresentationAnchorOriginV1,
      operation: () => Promise<TOperationResult>,
    ): Promise<TOperationResult> => {
      pendingOrigin = nextOrigin;
      try {
        return await operation();
      } finally {
        if (pendingOrigin === nextOrigin) pendingOrigin = undefined;
      }
    };

    const persistencePort = Object.freeze({
      ...persistence.port,
      load: (slot: Parameters<typeof persistence.port.load>[0]) =>
        withOriginV1("load", () => persistence.port.load(slot)),
      importSave: (bytes: Uint8Array) =>
        withOriginV1("import", () => persistence.port.importSave(bytes)),
    });

    const restartV1 = (): Promise<SessionAnchorResultV1> =>
      withOriginV1("restart", () =>
        created.runtimeControl.enqueueAuthoritative<SessionAnchorResultV1>(
          async () => {
            const snapshot = createInitialSnapshotV1();
            return Object.freeze({
              kind: "replace" as const,
              snapshot,
              result: Object.freeze({
                kind: "anchored" as const,
                commandSequence: parseNonNegativeSafeInteger(0),
              }),
              anchor: "replace_replay_base" as const,
            });
          },
          () => Object.freeze({ kind: "faulted" as const, code: "runtime.anchor_failed" as const }),
          (snapshot) => persistence.establishAnchor(snapshot, []),
          () => Object.freeze({ kind: "rejected" as const, code: "hmr_invalidated" as const }),
        ),
      );

    const admin: CoreApplicationAdminV1<TTypes> = Object.freeze({
      commandLog: () => created.commandLog.entries(),
      replayAuthoritatively: async () => {
        const identity = Object.freeze({ provenance: application.provenance });
        const currentSnapshot = created.session.getCurrentSnapshot();
        return replayAuthoritativelyV1({
          recordedIdentity: identity,
          runtimeIdentity: identity,
          replayBase: created.commandLog.replayBase(),
          replayBaseStateDigest: created.commandLog.replayBaseStateDigest(),
          commandLog: created.commandLog.entries() as never,
          currentSnapshot: currentSnapshot as never,
          currentStateDigest: digestCanonical("sillymaker:state:v1", currentSnapshot),
          projectStableRejection: (rejection: unknown) => rejection,
          projectStableFault: (fault: unknown) => fault,
          createDriver: (replayBase: DeepReadonly<TTypes["snapshot"]>) => {
            let replaySnapshot = replayBase;
            return Object.freeze({
              getCurrentSnapshot: () => replaySnapshot,
              submit(logged: { readonly command: DeepReadonly<TTypes["command"]> }) {
                const preSnapshot = replaySnapshot;
                const attempt = gameSimulation.commandExecutor.executeAttempt(
                  preSnapshot as never,
                  logged.command,
                  undefined as TTypes["executionContext"],
                ) as {
                  readonly result: { readonly kind: string; readonly snapshot: never };
                };
                if (attempt.result.kind === "committed") {
                  replaySnapshot = attempt.result.snapshot;
                }
                return Object.freeze({
                  ...attempt,
                  preSnapshot,
                  preStateDigest: digestCanonical("sillymaker:state:v1", preSnapshot),
                  postStateDigest: digestCanonical("sillymaker:state:v1", attempt.result.snapshot),
                }) as never;
              },
            });
          },
        } as never);
      },
      inspectForTest: () =>
        Object.freeze({
          snapshot: created.session.getCurrentSnapshot(),
          runtimeFailures: runtimeFailures.entries(),
        }),
      stateDigest: () =>
        digestCanonical("sillymaker:state:v1", created.session.getCurrentSnapshot()),
      ...(options.capabilities?.debugTools === true ? { debugControl: created.debugControl } : {}),
    });

    return Object.freeze({
      storyId: application.storyId,
      storyRevision: application.storyRevision,
      semantic,
      persistence: persistencePort,
      flushAutoSave: async () => {
        captureNowV1();
        await persistence.autoSaveIdle();
      },
      autoSaveIdle: () => persistence.autoSaveIdle(),
      lifecycle: Object.freeze({ restart: restartV1 }),
      diagnostics: Object.freeze({
        runtimeFailures: () => runtimeFailures.entries(),
      }),
      presentationAnchor: currentAnchorV1,
      subscribePresentationAnchor: (listener: (anchor: CorePresentationAnchorV1) => void) => {
        anchorListeners.add(listener);
        return () => anchorListeners.delete(listener);
      },
      subscribeTransientEffects: (listener: (effect: TransientEffectV1) => void) => {
        effectListeners.add(listener);
        return () => effectListeners.delete(listener);
      },
      bindToCurrentEpoch: <TArgs extends readonly unknown[], TValue>(
        callback: (...args: TArgs) => TValue,
      ) => {
        const boundEpoch = epoch;
        return (...args: TArgs): CoreEpochBoundOutcomeV1<TValue> => {
          if (disposed || epoch !== boundEpoch) {
            return Object.freeze({ kind: "stale_epoch" as const });
          }
          return Object.freeze({ kind: "current" as const, value: callback(...args) });
        };
      },
      admin,
      isDisposed: () => disposed,
      dispose: async () => {
        if (!disposed) {
          disposed = true;
          for (const cleanup of cleanups.splice(0)) cleanup();
          created.invalidationController.invalidateForHmr();
          await persistence.disposeForRebootstrap();
        }
        return Object.freeze({ kind: "disposed" as const });
      },
    });
  } catch (error) {
    disposed = true;
    for (const cleanup of cleanups.splice(0)) cleanup();
    created.invalidationController.invalidateForHmr();
    if (persistenceService !== undefined) {
      await persistenceService.disposeForRebootstrap();
    }
    throw error;
  }
}
