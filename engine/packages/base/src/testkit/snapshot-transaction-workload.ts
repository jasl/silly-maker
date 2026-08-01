// SPDX-License-Identifier: MIT
import type { BuildProvenanceV1 } from "../contracts/provenance.ts";
import { digestBytes } from "../contracts/digest.ts";
import {
  commitAttemptV1,
  faultAttemptV1,
  rejectAttemptV1,
  type CommandExecutionAttemptEnvelopeV1,
} from "../contracts/execution.ts";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../contracts/gameplay-module.ts";
import {
  createTransactionalRngV1,
  rngStateV1Schema,
  type RngDrawTraceV1,
  type RngStateV1,
} from "../contracts/rng.ts";
import type { GameSnapshotEnvelopeV1 } from "../contracts/snapshot.ts";
import {
  createGameSnapshotEnvelopeSchemaV1,
  createPristineRunIntegrityV1,
} from "../contracts/snapshot.ts";
import type { DeepReadonly, Digest, RuntimeSchemaV1 } from "../contracts/values.ts";
import {
  parseNonNegativeSafeInteger,
  parseNonZeroUint32,
  parsePositiveSafeInteger,
} from "../contracts/values.ts";
import { createGameAuthoringKitV1 } from "../authoring/game-authoring-kit.ts";
import {
  createSnapshotWorkCounterV1,
  type SnapshotWorkCountsV1,
  type SnapshotWorkInstrumentationV1,
} from "../internal/snapshot-work-instrumentation.ts";
import {
  replayAuthoritativelyFromAttemptsInternalV1,
  type ReplayComparisonV1,
} from "../runtime/diagnostics/replay.ts";
import {
  createGameSessionV1,
  createInstrumentedGameSessionV1,
} from "../runtime/session/game-session.ts";
import type {
  SnapshotCommitEntityCountV1,
  SnapshotSessionWorkCountsV1,
} from "./snapshot-commit-workload.ts";
import { snapshotCommitEntityCountsV1 } from "./snapshot-commit-workload.ts";

export const snapshotTransactionCommandClassesV1 = Object.freeze(
  [
    "cross_owner_atomic_committed",
  ] as const,
);
export type SnapshotTransactionCommandClassV1 =
  (typeof snapshotTransactionCommandClassesV1)[number];

export const snapshotCommitSequenceClassesV1 = Object.freeze(["mixed_long"] as const);
export type SnapshotCommitSequenceClassV1 = (typeof snapshotCommitSequenceClassesV1)[number];

type SnapshotTransactionSequenceCommandClassV1 =
  | SnapshotTransactionCommandClassV1
  | "single_field_committed"
  | "rejected"
  | "faulted";

export interface SnapshotTransactionWorkloadDescriptorV1 {
  readonly workloadId: string;
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly commandClass: SnapshotTransactionCommandClassV1;
}

export interface PreparedSnapshotTransactionWorkloadV1 {
  readonly descriptor: SnapshotTransactionWorkloadDescriptorV1;
  readonly setupCounts: SnapshotSessionWorkCountsV1;
  runOnce(): Promise<{
    readonly outcome: "committed";
    readonly counts: SnapshotSessionWorkCountsV1;
    readonly preStateDigest: Digest;
    readonly postStateDigest: Digest;
  }>;
}

export interface SnapshotCommitSequenceWorkloadDescriptorV1 {
  readonly workloadId: string;
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly sequenceClass: SnapshotCommitSequenceClassV1;
  readonly commandCount: number;
}

export interface SnapshotCommitSequenceWorkloadRunV1 {
  readonly outcomes: readonly ("committed" | "rejected" | "faulted")[];
  readonly counts: SnapshotSessionWorkCountsV1;
  readonly retainedCommandCount: number;
  readonly replayBaseCommandSequence: number;
  readonly currentCommandSequence: number;
}

export interface PreparedSnapshotCommitSequenceWorkloadV1 {
  readonly descriptor: SnapshotCommitSequenceWorkloadDescriptorV1;
  readonly setupCounts: SnapshotSessionWorkCountsV1;
  runOnce(): Promise<SnapshotCommitSequenceWorkloadRunV1>;
}

export interface SnapshotReplayWorkloadDescriptorV1 {
  readonly workloadId: string;
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly sequenceClass: "mixed_long_retained";
  readonly commandCount: number;
}

export interface SnapshotReplayWorkloadRunV1 {
  readonly comparison: ReplayComparisonV1;
  readonly counts: SnapshotSessionWorkCountsV1;
}

export interface PreparedSnapshotReplayWorkloadV1 {
  readonly descriptor: SnapshotReplayWorkloadDescriptorV1;
  readonly setupCounts: SnapshotSessionWorkCountsV1;
  readonly recordingCounts: SnapshotSessionWorkCountsV1;
  runOnce(): Promise<SnapshotReplayWorkloadRunV1>;
}

interface SnapshotTransactionEntityV1 {
  readonly entityId: number;
  readonly value: number;
}

interface SnapshotTransactionEntitySliceV1 {
  readonly chunks: readonly (readonly SnapshotTransactionEntityV1[])[];
}

interface SnapshotTransactionAuditSliceV1 {
  readonly crossOwnerCommitCount: number;
}

/** @internal State shape shared only by neutral Base workloads. */
export interface SnapshotTransactionStateV1 {
  readonly simulation: {
    readonly entities: SnapshotTransactionEntitySliceV1;
    readonly audit: SnapshotTransactionAuditSliceV1;
  };
}

type SnapshotTransactionSnapshotV1 = GameSnapshotEnvelopeV1<SnapshotTransactionStateV1, RngStateV1>;

interface SnapshotTransactionCommandV1 {
  readonly kind: SnapshotTransactionSequenceCommandClassV1;
}

type SnapshotTransactionFactV1 =
  | {
    readonly kind: "snapshot_workload.audit_recorded";
    readonly count: number;
  }
  | {
    readonly kind: "snapshot_workload.entity_updated";
    readonly entityId: number;
    readonly value: number;
  };

interface SnapshotTransactionRejectionV1 {
  readonly code: "snapshot_workload.rejected";
}

interface SnapshotTransactionFaultV1 {
  readonly code: "snapshot_workload.faulted";
}

interface SnapshotTransactionTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    SnapshotTransactionStateV1,
    RngStateV1
  > {
  readonly snapshot: SnapshotTransactionSnapshotV1;
  readonly command: SnapshotTransactionCommandV1;
  readonly fact: SnapshotTransactionFactV1;
  readonly rejection: SnapshotTransactionRejectionV1;
  readonly fault: SnapshotTransactionFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: never;
  readonly rngState: RngStateV1;
  readonly rngDrawTrace: RngDrawTraceV1;
  readonly executionContext: undefined;
}

type SnapshotTransactionAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  SnapshotTransactionSnapshotV1,
  SnapshotTransactionFactV1,
  SnapshotTransactionRejectionV1,
  SnapshotTransactionFaultV1,
  RngStateV1,
  RngDrawTraceV1
>;

function isPlainRecordV1(value: unknown): value is Readonly<Record<string, unknown>> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function parseEntitySliceV1(value: unknown): SnapshotTransactionEntitySliceV1 {
  if (!isPlainRecordV1(value) || Object.keys(value).join("\0") !== "chunks") {
    throw new TypeError("invalid Snapshot transaction entity slice");
  }
  const chunks = value.chunks;
  if (!Array.isArray(chunks)) {
    throw new TypeError("invalid Snapshot transaction entity chunks");
  }
  for (const chunk of chunks) {
    if (!Array.isArray(chunk)) {
      throw new TypeError("invalid Snapshot transaction entity chunk");
    }
    for (const entity of chunk) {
      if (!isPlainRecordV1(entity) || Object.keys(entity).sort().join("\0") !== "entityId\0value") {
        throw new TypeError("invalid Snapshot transaction entity");
      }
      parseNonNegativeSafeInteger(entity.entityId);
      parseNonNegativeSafeInteger(entity.value);
    }
  }
  return value as unknown as SnapshotTransactionEntitySliceV1;
}

function parseAuditSliceV1(value: unknown): SnapshotTransactionAuditSliceV1 {
  if (!isPlainRecordV1(value) || Object.keys(value).join("\0") !== "crossOwnerCommitCount") {
    throw new TypeError("invalid Snapshot transaction audit slice");
  }
  parseNonNegativeSafeInteger(value.crossOwnerCommitCount);
  return value as unknown as SnapshotTransactionAuditSliceV1;
}

const entitySliceSchemaV1: RuntimeSchemaV1<SnapshotTransactionEntitySliceV1> = Object.freeze({
  parse: parseEntitySliceV1,
});

const auditSliceSchemaV1: RuntimeSchemaV1<SnapshotTransactionAuditSliceV1> = Object.freeze({
  parse: parseAuditSliceV1,
});

const stateSchemaV1: RuntimeSchemaV1<SnapshotTransactionStateV1> = Object.freeze({
  parse(value: unknown): SnapshotTransactionStateV1 {
    if (!isPlainRecordV1(value) || Object.keys(value).join("\0") !== "simulation") {
      throw new TypeError("invalid Snapshot transaction State");
    }
    const simulation = value.simulation;
    if (
      !isPlainRecordV1(simulation) ||
      Object.keys(simulation).sort().join("\0") !== "audit\0entities"
    ) {
      throw new TypeError("invalid Snapshot transaction simulation State");
    }
    parseEntitySliceV1(simulation.entities);
    parseAuditSliceV1(simulation.audit);
    return value as unknown as SnapshotTransactionStateV1;
  },
});

/** @internal Direct-file-only schema reused by the persistence workload. */
export const snapshotTransactionSnapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(
  stateSchemaV1,
  rngStateV1Schema,
);

const commandSchemaV1: RuntimeSchemaV1<SnapshotTransactionCommandV1> = Object.freeze({
  parse(value: unknown): SnapshotTransactionCommandV1 {
    const kind = isPlainRecordV1(value) ? value.kind : undefined;
    if (
      kind !== "cross_owner_atomic_committed" &&
      kind !== "single_field_committed" &&
      kind !== "rejected" &&
      kind !== "faulted"
    ) {
      throw new TypeError("invalid Snapshot transaction workload command");
    }
    return Object.freeze({ kind });
  },
});

function totalEntityCountV1(slice: DeepReadonly<SnapshotTransactionEntitySliceV1>): number {
  return slice.chunks.reduce((total, chunk) => total + chunk.length, 0);
}

function targetEntityV1(
  slice: DeepReadonly<SnapshotTransactionEntitySliceV1>,
): DeepReadonly<SnapshotTransactionEntityV1> {
  const entityId = Math.floor(totalEntityCountV1(slice) / 2);
  const entity = slice.chunks[Math.floor(entityId / 1_000)]?.[entityId % 1_000];
  if (entity === undefined) throw new TypeError("Snapshot transaction target entity is missing");
  return entity;
}

function updateEntityV1(
  slice: DeepReadonly<SnapshotTransactionEntitySliceV1>,
  entityId: number,
): SnapshotTransactionEntitySliceV1 {
  const chunkIndex = Math.floor(entityId / 1_000);
  const entityIndex = entityId % 1_000;
  const sourceChunk = slice.chunks[chunkIndex];
  const sourceEntity = sourceChunk?.[entityIndex];
  if (sourceChunk === undefined || sourceEntity === undefined) {
    throw new TypeError("Snapshot transaction target entity is missing");
  }
  const nextChunk = [...sourceChunk];
  nextChunk[entityIndex] = Object.freeze({
    entityId: sourceEntity.entityId,
    value: parseNonNegativeSafeInteger(sourceEntity.value + 1),
  });
  const chunks = [...slice.chunks];
  chunks[chunkIndex] = Object.freeze(nextChunk);
  return Object.freeze({ chunks: Object.freeze(chunks) });
}

const kitV1 = createGameAuthoringKitV1<SnapshotTransactionTypesV1>();

const auditModuleV1 = kitV1.defineStatefulModule({
  id: "workload.audit",
  contractRevision: 1,
  state: {
    slot: "simulation.audit",
    schema: auditSliceSchemaV1,
    initial: () => Object.freeze({ crossOwnerCommitCount: 0 }),
  },
  owner: {
    operationSchema: Object.freeze({
      parse(value: unknown) {
        if (!isPlainRecordV1(value) || value.kind !== "record") {
          throw new TypeError("invalid Snapshot transaction audit operation");
        }
        return Object.freeze({ kind: "record" as const });
      },
    }),
    propose(state) {
      const count = parseNonNegativeSafeInteger(state.crossOwnerCommitCount + 1);
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: Object.freeze({ kind: "record" as const }),
          facts: Object.freeze([
            Object.freeze({
              kind: "snapshot_workload.audit_recorded" as const,
              count,
            }),
          ]),
        }),
      });
    },
    apply(state) {
      return Object.freeze({
        crossOwnerCommitCount: parseNonNegativeSafeInteger(state.crossOwnerCommitCount + 1),
      });
    },
  },
});

const entitiesModuleV1 = kitV1.defineStatefulModule({
  id: "workload.entities",
  contractRevision: 1,
  state: {
    slot: "simulation.entities",
    schema: entitySliceSchemaV1,
    initial: () => Object.freeze({ chunks: Object.freeze([]) }),
  },
  owner: {
    operationSchema: Object.freeze({
      parse(value: unknown) {
        if (!isPlainRecordV1(value)) {
          throw new TypeError("invalid Snapshot transaction entity operation");
        }
        return Object.freeze({
          entityId: parseNonNegativeSafeInteger(value.entityId),
        });
      },
    }),
    propose(state, operation) {
      const entity = state.chunks[Math.floor(operation.entityId / 1_000)]
        ?.[operation.entityId % 1_000];
      if (entity === undefined) throw new TypeError("Snapshot transaction entity is missing");
      const value = parseNonNegativeSafeInteger(entity.value + 1);
      return Object.freeze({
        kind: "proposed" as const,
        proposal: Object.freeze({
          payload: operation,
          facts: Object.freeze([
            Object.freeze({
              kind: "snapshot_workload.entity_updated" as const,
              entityId: entity.entityId,
              value,
            }),
          ]),
        }),
      });
    },
    apply(state, proposal) {
      return updateEntityV1(state, proposal.payload.entityId);
    },
  },
});

const transactionCompositionV1 = kitV1.composeModules([entitiesModuleV1, auditModuleV1]);
const transactionRunnerV1 = transactionCompositionV1.createTransactionRunner({
  stateSchema: stateSchemaV1,
  createFault: () => Object.freeze({ code: "snapshot_workload.faulted" as const }),
});

function createEntityChunksV1(
  entityCount: SnapshotCommitEntityCountV1,
): readonly (readonly SnapshotTransactionEntityV1[])[] {
  const chunks: (readonly SnapshotTransactionEntityV1[])[] = [];
  for (let start = 0; start < entityCount; start += 1_000) {
    const length = Math.min(1_000, entityCount - start);
    chunks.push(
      Object.freeze(
        Array.from({ length }, (_, offset) =>
          Object.freeze({
            entityId: start + offset,
            value: (start + offset) % 97,
          })),
      ),
    );
  }
  return Object.freeze(chunks);
}

/** @internal Direct-file-only generator used by scale coverage. */
export function createSnapshotTransactionInitialSnapshotV1(
  entityCount: SnapshotCommitEntityCountV1,
): SnapshotTransactionSnapshotV1 {
  return {
    state: {
      simulation: {
        entities: { chunks: createEntityChunksV1(entityCount) },
        audit: { crossOwnerCommitCount: 0 },
      },
    },
    rng: createTransactionalRngV1(parseNonZeroUint32(97)).candidateState(),
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  };
}

function singleFieldAttemptV1(
  current: DeepReadonly<SnapshotTransactionSnapshotV1>,
): SnapshotTransactionAttemptV1 {
  const rng = createTransactionalRngV1(current.rng);
  const target = targetEntityV1(current.state.simulation.entities);
  const entities = updateEntityV1(current.state.simulation.entities, target.entityId);
  const value = entities.chunks[Math.floor(target.entityId / 1_000)]?.[target.entityId % 1_000]
    ?.value;
  if (value === undefined) throw new TypeError("Snapshot transaction update disappeared");
  const snapshot: SnapshotTransactionSnapshotV1 = {
    state: {
      simulation: {
        entities,
        audit: current.state.simulation.audit,
      },
    },
    rng: rng.candidateState(),
    commandSequence: parseNonNegativeSafeInteger(current.commandSequence + 1),
    integrity: current.integrity,
  };
  return commitAttemptV1(current, snapshot, rng, [
    Object.freeze({
      kind: "snapshot_workload.entity_updated" as const,
      entityId: target.entityId,
      value,
    }),
  ]);
}

function attemptV1(
  current: DeepReadonly<SnapshotTransactionSnapshotV1>,
  command: DeepReadonly<SnapshotTransactionCommandV1>,
): SnapshotTransactionAttemptV1 {
  if (command.kind === "single_field_committed") return singleFieldAttemptV1(current);
  const rng = createTransactionalRngV1(current.rng);
  if (command.kind === "rejected") {
    return rejectAttemptV1(current, rng, [
      Object.freeze({ code: "snapshot_workload.rejected" as const }),
    ]);
  }
  if (command.kind === "faulted") {
    return faultAttemptV1(
      current,
      rng,
      Object.freeze({ code: "snapshot_workload.faulted" as const }),
    );
  }
  const target = targetEntityV1(current.state.simulation.entities);
  return transactionRunnerV1.execute(current, rng, (transaction) => {
    transaction.propose(entitiesModuleV1, {
      entityId: parseNonNegativeSafeInteger(target.entityId),
    });
    transaction.propose(auditModuleV1, { kind: "record" });
    return transaction.complete();
  }) as SnapshotTransactionAttemptV1;
}

function sessionCountsV1(counts: SnapshotWorkCountsV1): SnapshotSessionWorkCountsV1 {
  return Object.freeze({
    canonicalTraversals: counts.canonicalTraversals,
    canonicalDigests: counts.canonicalDigests,
    deepFreezeTraversals: counts.deepFreezeTraversals,
    commandLogContinuityVerifications: counts.commandLogContinuityVerifications,
  });
}

export function createSnapshotTransactionWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly instrumentation?: SnapshotWorkInstrumentationV1;
}) {
  if (!snapshotCommitEntityCountsV1.includes(input.entityCount)) {
    throw new TypeError("unsupported Snapshot transaction entity count");
  }
  const sessionInput = {
    initialSnapshot: createSnapshotTransactionInitialSnapshotV1(input.entityCount),
    commandSchema: commandSchemaV1,
    executionContext: undefined,
    executeAttempt(
      snapshot: DeepReadonly<SnapshotTransactionSnapshotV1>,
      command: DeepReadonly<SnapshotTransactionCommandV1>,
    ): SnapshotTransactionAttemptV1 {
      return attemptV1(snapshot, command);
    },
    normalizeUnexpectedDispatchFault(
      _error: unknown,
      snapshot: DeepReadonly<SnapshotTransactionSnapshotV1>,
    ): SnapshotTransactionAttemptV1 {
      return faultAttemptV1(
        snapshot,
        createTransactionalRngV1(snapshot.rng),
        Object.freeze({ code: "snapshot_workload.faulted" as const }),
      );
    },
  };
  const created = input.instrumentation === undefined
    ? createGameSessionV1<SnapshotTransactionTypesV1>(sessionInput)
    : createInstrumentedGameSessionV1<SnapshotTransactionTypesV1>(
      sessionInput,
      input.instrumentation,
    );
  return Object.freeze({
    snapshot: () => created.session.getCurrentSnapshot(),
    status: () => created.session.getStatus(),
    runtimeControl: created.runtimeControl,
    commandLog: () => created.commandLog.entries(),
    replayBase: () => created.commandLog.replayBase(),
    replayBaseStateDigest: () => created.commandLog.replayBaseStateDigest(),
    dispatch(commandClass: SnapshotTransactionSequenceCommandClassV1) {
      return created.session.dispatch(Object.freeze({ kind: commandClass }));
    },
  });
}

function createPreparedTransactionCoreV1(entityCount: SnapshotCommitEntityCountV1) {
  const counter = createSnapshotWorkCounterV1();
  const workload = createSnapshotTransactionWorkloadV1({
    entityCount,
    instrumentation: counter.instrumentation,
  });
  const setupCounts = sessionCountsV1(counter.snapshot());
  counter.reset();
  return Object.freeze({ counter, workload, setupCounts });
}

export function prepareSnapshotTransactionWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
}): PreparedSnapshotTransactionWorkloadV1 {
  const core = createPreparedTransactionCoreV1(input.entityCount);
  let dispatched = false;
  return Object.freeze({
    descriptor: Object.freeze({
      workloadId: `snapshot-commit-v1/${String(input.entityCount)}/cross_owner_atomic_committed`,
      entityCount: input.entityCount,
      commandClass: "cross_owner_atomic_committed" as const,
    }),
    setupCounts: core.setupCounts,
    async runOnce() {
      if (dispatched) {
        throw new TypeError("Snapshot transaction workload can only run once");
      }
      dispatched = true;
      const result = await core.workload.dispatch("cross_owner_atomic_committed");
      if (result.kind !== "executed" || result.execution.kind !== "committed") {
        throw new TypeError("Snapshot transaction workload did not commit");
      }
      const entry = core.workload.commandLog().at(-1);
      if (entry === undefined) throw new TypeError("Snapshot transaction workload did not log");
      return Object.freeze({
        outcome: "committed" as const,
        counts: sessionCountsV1(core.counter.snapshot()),
        preStateDigest: entry.preStateDigest,
        postStateDigest: entry.postStateDigest,
      });
    },
  });
}

/** @internal Direct-file-only benchmark timing around one Session dispatch. */
export function prepareTimedSnapshotTransactionWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
}) {
  const core = createPreparedTransactionCoreV1(input.entityCount);
  let dispatched = false;
  const descriptor = Object.freeze({
    workloadId: `snapshot-commit-v1/${String(input.entityCount)}/cross_owner_atomic_committed`,
    entityCount: input.entityCount,
    commandClass: "cross_owner_atomic_committed" as const,
  });
  return Object.freeze({
    descriptor,
    setupCounts: core.setupCounts,
    async runOnce() {
      if (dispatched) {
        throw new TypeError("Snapshot transaction workload can only run once");
      }
      dispatched = true;
      const startedAt = performance.now();
      const result = await core.workload.dispatch("cross_owner_atomic_committed");
      const dispatchDurationMs = performance.now() - startedAt;
      if (result.kind !== "executed" || result.execution.kind !== "committed") {
        throw new TypeError("Snapshot transaction workload did not commit");
      }
      return Object.freeze({
        outcome: "committed" as const,
        counts: sessionCountsV1(core.counter.snapshot()),
        dispatchDurationMs,
      });
    },
  });
}

/** @internal Direct-file-only transcript definition used by deterministic tests. */
export const snapshotCommitMixedLongSequenceV1:
  readonly SnapshotTransactionSequenceCommandClassV1[] = Object.freeze([
    ...Array.from({ length: 85 }, () => [
      "cross_owner_atomic_committed" as const,
      "single_field_committed" as const,
      "rejected" as const,
    ]).flat(),
    "faulted",
  ]);

async function recordMixedLongSequenceV1(
  workload: ReturnType<typeof createSnapshotTransactionWorkloadV1>,
): Promise<readonly ("committed" | "rejected" | "faulted")[]> {
  const outcomes: ("committed" | "rejected" | "faulted")[] = [];
  for (const commandClass of snapshotCommitMixedLongSequenceV1) {
    const result = await workload.dispatch(commandClass);
    if (result.kind !== "executed") {
      throw new TypeError(`Snapshot transaction sequence was not executed: ${result.code}`);
    }
    outcomes.push(result.execution.kind);
  }
  return Object.freeze(outcomes);
}

export function prepareSnapshotCommitSequenceWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly sequenceClass: SnapshotCommitSequenceClassV1;
}): PreparedSnapshotCommitSequenceWorkloadV1 {
  if (!snapshotCommitSequenceClassesV1.includes(input.sequenceClass)) {
    throw new TypeError("unsupported Snapshot commit sequence class");
  }
  const core = createPreparedTransactionCoreV1(input.entityCount);
  let dispatched = false;
  return Object.freeze({
    descriptor: Object.freeze({
      workloadId: `snapshot-commit-sequence-v1/${String(input.entityCount)}/${input.sequenceClass}`,
      entityCount: input.entityCount,
      sequenceClass: input.sequenceClass,
      commandCount: snapshotCommitMixedLongSequenceV1.length,
    }),
    setupCounts: core.setupCounts,
    async runOnce(): Promise<SnapshotCommitSequenceWorkloadRunV1> {
      if (dispatched) {
        throw new TypeError("Snapshot commit sequence workload can only run once");
      }
      dispatched = true;
      const outcomes = await recordMixedLongSequenceV1(core.workload);
      return Object.freeze({
        outcomes,
        counts: sessionCountsV1(core.counter.snapshot()),
        retainedCommandCount: core.workload.commandLog().length,
        replayBaseCommandSequence: core.workload.replayBase().commandSequence,
        currentCommandSequence: core.workload.snapshot().commandSequence,
      });
    },
  });
}

/** @internal Direct-file-only timing around the admitted 256-command sequence. */
export function prepareTimedSnapshotCommitSequenceWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly sequenceClass: SnapshotCommitSequenceClassV1;
}) {
  if (!snapshotCommitSequenceClassesV1.includes(input.sequenceClass)) {
    throw new TypeError("unsupported Snapshot commit sequence class");
  }
  const core = createPreparedTransactionCoreV1(input.entityCount);
  let dispatched = false;
  const descriptor = Object.freeze({
    workloadId: `snapshot-commit-sequence-v1/${String(input.entityCount)}/${input.sequenceClass}`,
    entityCount: input.entityCount,
    sequenceClass: input.sequenceClass,
    commandCount: snapshotCommitMixedLongSequenceV1.length,
  });
  return Object.freeze({
    descriptor,
    setupCounts: core.setupCounts,
    async runOnce() {
      if (dispatched) {
        throw new TypeError("Snapshot commit sequence workload can only run once");
      }
      dispatched = true;
      const startedAt = performance.now();
      const outcomes = await recordMixedLongSequenceV1(core.workload);
      const dispatchDurationMs = performance.now() - startedAt;
      return Object.freeze({
        outcomes,
        counts: sessionCountsV1(core.counter.snapshot()),
        dispatchDurationMs,
      });
    },
  });
}

const identityDigestV1 = (label: string): Digest =>
  digestBytes(new TextEncoder().encode(`snapshot-transaction-workload:${label}`));

/** @internal Direct-file-only deterministic identity reused by neutral workloads. */
export const snapshotTransactionProvenanceV1: BuildProvenanceV1 = Object.freeze({
  story: Object.freeze({
    id: "snapshot-transaction-workload",
    revision: parsePositiveSafeInteger(1),
    digest: identityDigestV1("story"),
  }),
  engine: Object.freeze({
    version: "snapshot-workload-v1",
    digest: identityDigestV1("engine"),
  }),
  resolved: Object.freeze({
    stateContractRevision: parsePositiveSafeInteger(1),
    stateContractDigest: identityDigestV1("state-contract"),
    simulationDigest: identityDigestV1("simulation"),
    presentationDigest: identityDigestV1("presentation"),
    patchSet: Object.freeze({
      digest: identityDigestV1("patch-set"),
      simulationDigest: identityDigestV1("patch-set-simulation"),
      presentationDigest: identityDigestV1("patch-set-presentation"),
      appliedHotfixes: Object.freeze([]),
    }),
  }),
});

async function prepareSnapshotReplayCoreV1(entityCount: SnapshotCommitEntityCountV1) {
  const core = createPreparedTransactionCoreV1(entityCount);
  await recordMixedLongSequenceV1(core.workload);
  const recordingCounts = sessionCountsV1(core.counter.snapshot());
  core.counter.reset();
  let replayed = false;
  const commandLog = core.workload.commandLog();
  const currentSnapshot = core.workload.snapshot();
  const descriptor = Object.freeze({
    workloadId: `snapshot-replay-v1/${String(entityCount)}/mixed_outcomes`,
    entityCount,
    sequenceClass: "mixed_long_retained" as const,
    commandCount: commandLog.length,
  });

  return Object.freeze({
    descriptor,
    setupCounts: core.setupCounts,
    recordingCounts,
    async replayOnce(): Promise<ReplayComparisonV1> {
      if (replayed) throw new TypeError("Snapshot replay workload can only run once");
      replayed = true;
      const identity = Object.freeze({ provenance: snapshotTransactionProvenanceV1 });
      return await replayAuthoritativelyFromAttemptsInternalV1(
        {
          identity,
          replayBase: core.workload.replayBase(),
          replayBaseStateDigest: core.workload.replayBaseStateDigest(),
          commandLog,
          currentSnapshot,
          projectStableRejection: (rejection: SnapshotTransactionRejectionV1) => rejection,
          projectStableFault: (fault: SnapshotTransactionFaultV1) => fault,
          executeAttempt(
            snapshot: DeepReadonly<SnapshotTransactionSnapshotV1>,
            logged: {
              readonly source: "game" | "debug";
              readonly command: DeepReadonly<SnapshotTransactionCommandV1>;
            },
          ) {
            if (logged.source !== "game") {
              throw new TypeError("Snapshot transaction workload has no DebugCommand");
            }
            return attemptV1(snapshot, logged.command);
          },
        },
        core.counter.instrumentation,
      );
    },
    counts: () => sessionCountsV1(core.counter.snapshot()),
  });
}

export async function prepareSnapshotReplayWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
}): Promise<PreparedSnapshotReplayWorkloadV1> {
  const core = await prepareSnapshotReplayCoreV1(input.entityCount);
  return Object.freeze({
    descriptor: core.descriptor,
    setupCounts: core.setupCounts,
    recordingCounts: core.recordingCounts,
    async runOnce(): Promise<SnapshotReplayWorkloadRunV1> {
      const comparison = await core.replayOnce();
      return Object.freeze({ comparison, counts: core.counts() });
    },
  });
}

/** @internal Direct-file-only timing around authoritative replay, not transcript recording. */
export async function prepareTimedSnapshotReplayWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
}) {
  const core = await prepareSnapshotReplayCoreV1(input.entityCount);
  return Object.freeze({
    descriptor: core.descriptor,
    setupCounts: core.setupCounts,
    recordingCounts: core.recordingCounts,
    async runOnce() {
      const startedAt = performance.now();
      const comparison = await core.replayOnce();
      const dispatchDurationMs = performance.now() - startedAt;
      return Object.freeze({
        comparison,
        counts: core.counts(),
        dispatchDurationMs,
      });
    },
  });
}
