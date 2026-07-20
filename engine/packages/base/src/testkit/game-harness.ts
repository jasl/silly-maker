// SPDX-License-Identifier: MIT
import type { SessionLeaseOwnerId } from "../contracts/application.js";
import type { SemanticGamePortSourceV1, SemanticGamePortV1 } from "../contracts/application.js";
import { digestCanonical } from "../contracts/digest.js";
import type { Digest } from "../contracts/values.js";
import type { GamePackageV1 } from "../contracts/game-package.js";
import type { GameSimulationTypeMapV1, GameSimulationV1 } from "../contracts/gameplay-module.js";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "../contracts/host.js";
import { createMemoryHostRecordStoreV1 } from "../contracts/host.js";
import { createTransactionalRngV1, rngStateV1Schema } from "../contracts/rng.js";
import type { RuntimeSessionStatusV1 } from "../contracts/session-status.js";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
} from "../contracts/snapshot.js";
import type { DeepReadonly, NonZeroUint32 } from "../contracts/values.js";
import {
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parseRunId,
} from "../contracts/values.js";
import type {
  GameSessionCompositionV1,
  GameSessionDebugInputV1,
  GameSessionV1,
} from "../runtime/session/game-session.js";
import { createGameSessionV1 } from "../runtime/session/game-session.js";
import { createSemanticGamePortV1 } from "../runtime/application/semantic-game-port.js";
import type { PersistenceServiceV1 } from "../runtime/persistence/persistence-service.js";
import { createPersistenceServiceV1 } from "../runtime/persistence/persistence-service.js";
import type { ReplayComparisonV1 } from "../runtime/diagnostics/replay.js";
import { replayAuthoritativelyV1 } from "../runtime/diagnostics/replay.js";
import {
  createRuntimeFailureBufferV1,
  createRuntimeFailureReporterV1,
} from "../runtime/diagnostics/runtime-failures.js";
import { createFixedBootstrapEntropyV1 } from "./fixed-bootstrap-entropy.js";
import { resolveStoryForTestV1 } from "./story-contracts.js";

type SessionDispatchResultOfV1<TTypes extends GameSimulationTypeMapV1> = Awaited<
  ReturnType<GameSessionV1<TTypes>["dispatch"]>
>;

/**
 * The Story-provided semantic adaptation the harness cannot own: queries,
 * projections, the action catalog, previews, and the invocation-to-command
 * mapping. Everything else (session, semantic port wiring, persistence,
 * diagnostics, entropy, disposal) is generic harness machinery.
 */
export interface GameHarnessSemanticAdapterV1<
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
}

export interface CreateGameHarnessInputV1<
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
  readonly semantic: GameHarnessSemanticAdapterV1<
    TTypes,
    TQueries,
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult
  >;
  /** Deterministic bootstrap seed; two harnesses with the same seed match. */
  readonly seed?: number;
  readonly seeds?: readonly number[];
  readonly uuids?: readonly string[];
  readonly records?: HostAtomicRecordStoreV1;
  readonly exportFilename?: string;
  readonly capabilities?: { readonly debugTools?: boolean };
  validateReferences?(state: DeepReadonly<TTypes["state"]>): readonly string[];
  readonly now?: () => IsoUtcInstant;
  normalizeUnexpectedDispatchFault?(
    error: unknown,
    snapshot: DeepReadonly<TTypes["snapshot"]>,
  ): never;
}

export interface GameHarnessTraceEntryV1 {
  readonly ordinal: number;
  readonly outcome: "committed" | "rejected" | "faulted";
  readonly postStateDigest: Digest;
}

export type GameHarnessDisposedV1 = { readonly kind: "harness_disposed" };

export interface GameHarnessAdminV1<TTypes extends GameSimulationTypeMapV1> {
  commandLog(): ReturnType<GameSessionCompositionV1<TTypes>["commandLog"]["entries"]>;
  replayAuthoritatively(): Promise<ReplayComparisonV1>;
  inspectForTest(): {
    readonly snapshot: DeepReadonly<TTypes["snapshot"]>;
    readonly runtimeFailures: readonly unknown[];
  };
  readonly debugControl?: GameSessionCompositionV1<TTypes>["debugControl"];
}

export interface GameHarnessV1<
  TTypes extends GameSimulationTypeMapV1,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
> {
  readonly semantic: SemanticGamePortV1<
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult,
    RuntimeSessionStatusV1
  >;
  observe(): ReturnType<
    SemanticGamePortV1<
      TGameView,
      TNarrativeView,
      TActionDescriptor,
      TInvocation,
      TPreview,
      TResult,
      RuntimeSessionStatusV1
    >["observe"]
  >;
  preview(invocation: DeepReadonly<TInvocation>): Promise<TPreview | GameHarnessDisposedV1>;
  dispatch(invocation: DeepReadonly<TInvocation>): Promise<TResult | GameHarnessDisposedV1>;
  waitForIdle(): Promise<
    | ReturnType<
        SemanticGamePortV1<
          TGameView,
          TNarrativeView,
          TActionDescriptor,
          TInvocation,
          TPreview,
          TResult,
          RuntimeSessionStatusV1
        >["observe"]
      >
    | GameHarnessDisposedV1
  >;
  trace(): readonly GameHarnessTraceEntryV1[];
  stateDigest(): Digest;
  readonly saves: PersistenceServiceV1<TTypes["snapshot"]>["port"];
  readonly admin: GameHarnessAdminV1<TTypes>;
  isDisposed(): boolean;
  dispose(): Promise<{ readonly kind: "disposed" }>;
}

const defaultHarnessSeedV1 = 23049;
const defaultHarnessUuidV1 = "9e2f1a34-6d2b-4c33-8a41-5a3f6c1b2d4e";
const harnessOwnerIdV1 = "owner.sillymaker.testkit.harness" as SessionLeaseOwnerId;
const fixedHarnessInstantV1 = "2026-07-20T00:00:00.000Z" as IsoUtcInstant;

function readBootstrapRngSeedV1(bootstrap: unknown): NonZeroUint32 {
  if (bootstrap === null || typeof bootstrap !== "object") {
    throw new TypeError(
      "GameHarness requires a bootstrap input object carrying rngSeed; provide a Story bootstrap with an rngSeed field",
    );
  }
  const descriptor = Object.getOwnPropertyDescriptor(bootstrap, "rngSeed");
  if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined) {
    throw new TypeError(
      "GameHarness requires a bootstrap input object carrying rngSeed; provide a Story bootstrap with an rngSeed field",
    );
  }
  return parseNonZeroUint32(descriptor.value);
}

export async function createGameHarnessV1<
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
  input: CreateGameHarnessInputV1<
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
): Promise<
  GameHarnessV1<
    TTypes,
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult
  >
> {
  const resolved = resolveStoryForTestV1(input.entry);
  const gameSimulation = resolved.gameSimulation as GameSimulationV1<
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

  const entropy = createFixedBootstrapEntropyV1({
    uuids: (input.uuids ?? [defaultHarnessUuidV1]).map((value) => String(parseRunId(value))),
    seeds: (input.seeds ?? [input.seed ?? defaultHarnessSeedV1]).map((value) =>
      parseNonZeroUint32(value),
    ),
  });
  const bootstrap = gameSimulation.createBootstrapInput(entropy);
  const snapshotSchema = createGameSnapshotEnvelopeSchemaV1(
    gameSimulation.stateSchema,
    rngStateV1Schema,
  );
  const initialSnapshot = snapshotSchema.parse({
    state: gameSimulation.createInitialState(bootstrap as DeepReadonly<TTypes["bootstrapInput"]>),
    rng: createTransactionalRngV1(readBootstrapRngSeedV1(bootstrap)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  }) as TTypes["snapshot"];

  const now = input.now ?? (() => fixedHarnessInstantV1);
  const runtimeFailures = createRuntimeFailureBufferV1();
  const reportObserverFailure = createRuntimeFailureReporterV1({
    failures: runtimeFailures,
    now,
    operation: "runtime.observer_notification_failed",
    category: "runtime",
    code: "runtime.async_operation_failed",
  });

  const created = createGameSessionV1<TTypes>({
    initialSnapshot,
    commandSchema: gameSimulation.commandSchema,
    executionContext: undefined as TTypes["executionContext"],
    executeAttempt: (snapshot, command) =>
      gameSimulation.commandExecutor.executeAttempt(
        snapshot,
        command,
        undefined as TTypes["executionContext"],
      ),
    normalizeUnexpectedDispatchFault(error, snapshot) {
      if (input.normalizeUnexpectedDispatchFault !== undefined) {
        return input.normalizeUnexpectedDispatchFault(error, snapshot);
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

  const stateOfSnapshotV1 = (
    snapshot: DeepReadonly<TTypes["snapshot"]>,
  ): DeepReadonly<TTypes["state"]> =>
    (snapshot as { readonly state: DeepReadonly<TTypes["state"]> }).state;

  const source: SemanticGamePortSourceV1<TTypes["state"], RuntimeSessionStatusV1> = Object.freeze({
    getCurrentState: () => stateOfSnapshotV1(created.session.getCurrentSnapshot()),
    getAuthoritativeRevisionToken: () => created.session.getCurrentSnapshot(),
    getStatus: () => created.session.getStatus(),
    subscribe: (listener: () => void) => created.session.subscribe(listener),
    reportSubscriberFailure: reportObserverFailure,
    readStateAtQueueFront: <TReadResult>(
      reader: (state: DeepReadonly<TTypes["state"]>) => TReadResult,
    ) => created.runtimeControl.readAtQueueFront((snapshot) => reader(stateOfSnapshotV1(snapshot))),
  });

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
    createQueries: (state) => input.semantic.createQueries(state),
    projectGameView: (queries) => input.semantic.projectGameView(queries),
    projectNarrativeView: (queries) => input.semantic.projectNarrativeView(queries),
    actions: (queries) => input.semantic.actions(queries),
    preview: (queries, invocation) => input.semantic.preview(queries, invocation),
    dispatch: async (invocationValue) => {
      let invocation: TInvocation;
      try {
        invocation = input.semantic.parseInvocation(invocationValue);
      } catch {
        return input.semantic.invalidInvocationResult();
      }
      const result = await created.session.dispatch(
        input.semantic.commandForInvocation(
          invocation as DeepReadonly<TInvocation>,
        ) as DeepReadonly<TTypes["command"]>,
      );
      return input.semantic.projectDispatchResult(result);
    },
  });

  const persistenceService = await createPersistenceServiceV1<TTypes["state"], TTypes["snapshot"]>({
    runtimeControl: created.runtimeControl,
    records: input.records ?? createMemoryHostRecordStoreV1(),
    snapshotSchema: snapshotSchema as never,
    provenance: resolved.provenance,
    adoptionDeclaration: null,
    ownerId: harnessOwnerIdV1,
    nextHandoffRequestId: () => "handoff.sillymaker.testkit.harness" as never,
    validateReferences: (state) => input.validateReferences?.(state as never) ?? [],
    validateInvariants: () => [],
    initialSimulationLineage: [],
    metadataClock: Object.freeze({ now }),
    exportFilename: input.exportFilename ?? "sillymaker-harness-save.json",
  });

  let disposed = false;
  const disposedResultV1: GameHarnessDisposedV1 = Object.freeze({
    kind: "harness_disposed" as const,
  });

  const trace = (): readonly GameHarnessTraceEntryV1[] =>
    Object.freeze(
      created.commandLog.entries().map((entry, index) =>
        Object.freeze({
          ordinal: index + 1,
          outcome: entry.outcome.kind,
          postStateDigest: entry.postStateDigest,
        }),
      ),
    ) as readonly GameHarnessTraceEntryV1[];

  const admin: GameHarnessAdminV1<TTypes> = Object.freeze({
    commandLog: () => created.commandLog.entries(),
    replayAuthoritatively: async () => {
      const identity = Object.freeze({ provenance: resolved.provenance });
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
    ...(input.capabilities?.debugTools === true ? { debugControl: created.debugControl } : {}),
  });

  return Object.freeze({
    semantic,
    observe: () => semantic.observe(),
    preview: async (invocation: DeepReadonly<TInvocation>) =>
      disposed ? disposedResultV1 : semantic.preview(invocation),
    dispatch: async (invocation: DeepReadonly<TInvocation>) =>
      disposed ? disposedResultV1 : semantic.dispatch(invocation),
    waitForIdle: async () => (disposed ? disposedResultV1 : semantic.waitForIdle()),
    trace,
    stateDigest: () => digestCanonical("sillymaker:state:v1", created.session.getCurrentSnapshot()),
    saves: persistenceService.port,
    admin,
    isDisposed: () => disposed,
    async dispose() {
      if (!disposed) {
        disposed = true;
        created.invalidationController.invalidateForHmr();
        await persistenceService.disposeForRebootstrap();
      }
      return Object.freeze({ kind: "disposed" as const });
    },
  });
}
