// SPDX-License-Identifier: MIT
import type { SessionLeaseOwnerId } from "../contracts/application.ts";
import type { SemanticGamePortV1 } from "../contracts/application.ts";
import type { Digest } from "../contracts/values.ts";
import type { GamePackageV1 } from "../contracts/game-package.ts";
import type { GameSimulationTypeMapV1 } from "../contracts/gameplay-module.ts";
import type { HostAtomicRecordStoreV1, IsoUtcInstant } from "../contracts/host.ts";
import { createMemoryHostRecordStoreV1 } from "../contracts/host.ts";
import type { RuntimeSessionStatusV1 } from "../contracts/session-status.ts";
import type { DeepReadonly } from "../contracts/values.ts";
import { parseNonZeroUint32, parseRunId } from "../contracts/values.ts";
import type {
  AgentCapabilityHandleV1,
  AgentDiagnosticsCapabilityV1,
  AgentGamePortV1,
  AgentPersistenceCapabilityV1,
} from "../runtime/application/agent-game-port.ts";
import {
  createAgentDiagnosticsCapabilityV1,
  createAgentPersistenceCapabilityV1,
  createInProcessAgentGamePortV1,
} from "../runtime/application/agent-game-port.ts";
import type {
  CoreGameApplicationInstanceV1,
  CoreSemanticAdapterV1,
} from "../runtime/application/core-game-application.ts";
import {
  createCoreGameApplicationInstanceV1,
  defineCoreGameApplicationV1,
  resolveCoreGameApplicationV1,
} from "../runtime/application/core-game-application.ts";
import type { GameSessionCompositionV1 } from "../runtime/session/game-session.ts";
import type { PersistenceServiceV1 } from "../runtime/persistence/persistence-service.ts";
import type { ReplayComparisonV1 } from "../runtime/diagnostics/replay.ts";
import { createFixedBootstrapEntropyV1 } from "./fixed-bootstrap-entropy.ts";
import { deterministicBuildIdentityInputV1 } from "./resolver-fixtures.ts";

/**
 * The Story-provided semantic adaptation the harness cannot own. This is the
 * core composer's semantic adapter contract; the harness and real
 * applications share one lifecycle and adaptation surface.
 */
export type GameHarnessSemanticAdapterV1<
  TTypes extends GameSimulationTypeMapV1,
  TQueries,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult,
> = CoreSemanticAdapterV1<
  TTypes,
  TQueries,
  TGameView,
  TNarrativeView,
  TActionDescriptor,
  TInvocation,
  TPreview,
  TResult
>;

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

export interface GameHarnessDiagnosticsReportV1 {
  readonly storyId: string;
  readonly runtimeFailures: readonly unknown[];
  readonly trace: readonly GameHarnessTraceEntryV1[];
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
  readonly agent: AgentGamePortV1<
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult,
    RuntimeSessionStatusV1
  >;
  /** The core application instance the harness is composed on. */
  readonly application: CoreGameApplicationInstanceV1<
    TTypes,
    TGameView,
    TNarrativeView,
    TActionDescriptor,
    TInvocation,
    TPreview,
    TResult
  >;
  grantPersistenceCapability(): AgentCapabilityHandleV1<
    AgentPersistenceCapabilityV1<
      Awaited<ReturnType<PersistenceServiceV1<TTypes["snapshot"]>["port"]["save"]>>,
      Awaited<ReturnType<PersistenceServiceV1<TTypes["snapshot"]>["port"]["exportCurrentSave"]>>
    >
  >;
  grantDiagnosticsCapability(): AgentCapabilityHandleV1<
    AgentDiagnosticsCapabilityV1<GameHarnessDiagnosticsReportV1>
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

/**
 * A deterministic headless harness composed on the core application
 * composer: the harness and production applications share the same
 * session/persistence/diagnostics lifecycle contract.
 */
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
  const definition = defineCoreGameApplicationV1<
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
  >({
    entry: input.entry,
    semantic: input.semantic,
    ...(input.validateReferences === undefined
      ? {}
      : { validateReferences: input.validateReferences }),
    exportFilename: input.exportFilename ?? "sillymaker-harness-save.json",
    ...(input.normalizeUnexpectedDispatchFault === undefined
      ? {}
      : { normalizeUnexpectedDispatchFault: input.normalizeUnexpectedDispatchFault }),
  });
  const resolved = resolveCoreGameApplicationV1(definition, {
    buildIdentityInput: deterministicBuildIdentityInputV1,
  });
  if (resolved.kind === "failed") {
    throw new TypeError(
      `${resolved.failure.code}: ${
        String(resolved.failure.details.message ?? "Story resolution failed")
      }`,
    );
  }

  const now = input.now ?? (() => fixedHarnessInstantV1);
  const application = await createCoreGameApplicationInstanceV1(resolved.application, {
    host: {
      entropy: createFixedBootstrapEntropyV1({
        uuids: (input.uuids ?? [defaultHarnessUuidV1]).map((value) => String(parseRunId(value))),
        seeds: (input.seeds ?? [input.seed ?? defaultHarnessSeedV1]).map((value) =>
          parseNonZeroUint32(value)
        ),
      }),
      records: input.records ?? createMemoryHostRecordStoreV1(),
      now,
      ownerId: harnessOwnerIdV1,
      nextHandoffRequestId: () => "handoff.sillymaker.testkit.harness",
    },
    ...(input.capabilities === undefined ? {} : { capabilities: input.capabilities }),
  });

  const disposedResultV1: GameHarnessDisposedV1 = {
    kind: "harness_disposed" as const,
  };

  const trace = (): readonly GameHarnessTraceEntryV1[] =>
    (application.admin.commandLog().map((entry, index) => ({
      ordinal: index + 1,
      outcome: entry.outcome.kind,
      postStateDigest: entry.postStateDigest,
    }))) as readonly GameHarnessTraceEntryV1[];

  const admin: GameHarnessAdminV1<TTypes> = {
    commandLog: () => application.admin.commandLog(),
    replayAuthoritatively: () => application.admin.replayAuthoritatively(),
    inspectForTest: () => application.admin.inspectForTest(),
    ...(application.admin.debugControl === undefined
      ? {}
      : { debugControl: application.admin.debugControl }),
  };

  const agent = createInProcessAgentGamePortV1({
    identity: {
      storyId: application.storyId,
      storyRevision: application.storyRevision,
    },
    semantic: application.semantic,
  });

  return ({
    semantic: application.semantic,
    agent,
    application,
    grantPersistenceCapability: () =>
      createAgentPersistenceCapabilityV1({
        save: (slot) => application.persistence.save(slot),
        load: (slot) => application.persistence.load(slot as never),
        exportCurrentSave: () => application.persistence.exportCurrentSave(),
        importSave: (bytes) => application.persistence.importSave(bytes),
      }),
    grantDiagnosticsCapability: () =>
      createAgentDiagnosticsCapabilityV1<GameHarnessDiagnosticsReportV1>({
        exportDiagnostics: async () => ({
          storyId: application.storyId,
          runtimeFailures: application.diagnostics.runtimeFailures(),
          trace: trace(),
        }),
      }),
    observe: () => application.semantic.observe(),
    preview: async (invocation: DeepReadonly<TInvocation>) =>
      application.isDisposed() ? disposedResultV1 : application.semantic.preview(invocation),
    dispatch: async (invocation: DeepReadonly<TInvocation>) =>
      application.isDisposed() ? disposedResultV1 : application.semantic.dispatch(invocation),
    waitForIdle: async () =>
      application.isDisposed() ? disposedResultV1 : application.semantic.waitForIdle(),
    trace,
    stateDigest: () => application.admin.stateDigest(),
    saves: application.persistence,
    admin,
    isDisposed: () => application.isDisposed(),
    dispose: () => application.dispose(),
  });
}
