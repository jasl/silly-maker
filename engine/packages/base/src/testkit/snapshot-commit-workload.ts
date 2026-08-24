// SPDX-License-Identifier: MIT
import type { CommandExecutionAttemptEnvelopeV1 } from "../contracts/execution.ts";
import type {
  GameBootstrapInputV1,
  GameSimulationTypeMapV1,
} from "../contracts/gameplay-module.ts";
import type { GameSnapshotEnvelopeV1 } from "../contracts/snapshot.ts";
import { createPristineRunIntegrityV1 } from "../contracts/snapshot.ts";
import type { DeepReadonly, Digest, RuntimeSchemaV1 } from "../contracts/values.ts";
import { parseNonNegativeSafeInteger } from "../contracts/values.ts";
import {
  createSnapshotWorkCounterV1,
  type SnapshotWorkCountsV1,
  type SnapshotWorkInstrumentationV1,
} from "../internal/snapshot-work-instrumentation.ts";
import {
  createGameSessionV1,
  createInstrumentedGameSessionV1,
} from "../runtime/session/game-session.ts";

export const snapshotCommitEntityCountsV1 = [100, 1_000, 10_000, 100_000] as const;
export type SnapshotCommitEntityCountV1 = (typeof snapshotCommitEntityCountsV1)[number];

export const snapshotCommitCommandClassesV1 = [
  "single_field_committed",
  "multi_slice_committed",
  "rejected",
  "faulted",
] as const;
export type SnapshotCommitCommandClassV1 = (typeof snapshotCommitCommandClassesV1)[number];

export interface SnapshotSessionWorkCountsV1 {
  readonly canonicalTraversals: number;
  readonly canonicalDigests: number;
  readonly commandLogContinuityVerifications: number;
}

export interface SnapshotCommitWorkloadDescriptorV1 {
  readonly workloadId: string;
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly commandClass: SnapshotCommitCommandClassV1;
}

export interface SnapshotCommitWorkloadRunV1 {
  readonly outcome: "committed" | "rejected" | "faulted";
  readonly counts: SnapshotSessionWorkCountsV1;
  readonly preStateDigest: Digest;
  readonly postStateDigest: Digest;
}

export interface PreparedSnapshotCommitWorkloadV1 {
  readonly descriptor: SnapshotCommitWorkloadDescriptorV1;
  readonly setupCounts: SnapshotSessionWorkCountsV1;
  runOnce(): Promise<SnapshotCommitWorkloadRunV1>;
}

interface TimedSnapshotCommitWorkloadRunV1 extends SnapshotCommitWorkloadRunV1 {
  readonly dispatchDurationMs: number;
}

interface TimedPreparedSnapshotCommitWorkloadV1 {
  readonly descriptor: SnapshotCommitWorkloadDescriptorV1;
  readonly setupCounts: SnapshotSessionWorkCountsV1;
  runOnce(): Promise<TimedSnapshotCommitWorkloadRunV1>;
}

interface SnapshotWorkloadEntityV1 {
  readonly entityId: number;
  readonly value: number;
}

interface SnapshotWorkloadStateV1 {
  readonly entitySlice: {
    readonly chunks: readonly (readonly SnapshotWorkloadEntityV1[])[];
  };
  readonly auditSlice: {
    readonly multiSliceCommitCount: number;
  };
}

interface SnapshotWorkloadRngStateV1 {
  readonly cursor: number;
}

type SnapshotWorkloadSnapshotV1 = GameSnapshotEnvelopeV1<
  SnapshotWorkloadStateV1,
  SnapshotWorkloadRngStateV1
>;

interface SnapshotWorkloadCommandV1 {
  readonly kind: SnapshotCommitCommandClassV1;
}

interface SnapshotWorkloadEventV1 {
  readonly kind: "snapshot_workload.committed";
  readonly commandClass: "single_field_committed" | "multi_slice_committed";
}

interface SnapshotWorkloadRejectionV1 {
  readonly code: "snapshot_workload.rejected";
}

interface SnapshotWorkloadFaultV1 {
  readonly code: "snapshot_workload.faulted";
}

interface SnapshotWorkloadTypesV1 extends
  GameSimulationTypeMapV1<
    GameBootstrapInputV1,
    SnapshotWorkloadStateV1,
    SnapshotWorkloadRngStateV1
  > {
  readonly snapshot: SnapshotWorkloadSnapshotV1;
  readonly command: SnapshotWorkloadCommandV1;
  readonly event: SnapshotWorkloadEventV1;
  readonly rejection: SnapshotWorkloadRejectionV1;
  readonly fault: SnapshotWorkloadFaultV1;
  readonly debugCommand: never;
  readonly debugValidationError: never;
  readonly rngState: SnapshotWorkloadRngStateV1;
  readonly rngDrawTrace: never;
  readonly executionContext: undefined;
}

type SnapshotWorkloadAttemptV1 = CommandExecutionAttemptEnvelopeV1<
  SnapshotWorkloadSnapshotV1,
  SnapshotWorkloadEventV1,
  SnapshotWorkloadRejectionV1,
  SnapshotWorkloadFaultV1,
  SnapshotWorkloadRngStateV1,
  never
>;

const commandSchemaV1: RuntimeSchemaV1<SnapshotWorkloadCommandV1> = {
  parse(value: unknown): SnapshotWorkloadCommandV1 {
    const kind = value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as { readonly kind?: unknown }).kind
      : undefined;
    if (
      !snapshotCommitCommandClassesV1.some(
        (candidate: SnapshotCommitCommandClassV1) => candidate === kind,
      )
    ) {
      throw new TypeError("invalid Snapshot workload command");
    }
    return ({ kind: kind as SnapshotCommitCommandClassV1 });
  },
};

function createEntityChunksV1(
  entityCount: SnapshotCommitEntityCountV1,
): readonly (readonly SnapshotWorkloadEntityV1[])[] {
  const chunkSize = 1_000;
  const chunks: SnapshotWorkloadEntityV1[][] = [];
  for (let start = 0; start < entityCount; start += chunkSize) {
    const length = Math.min(chunkSize, entityCount - start);
    chunks.push(
      Array.from({ length }, (_, offset) => ({
        entityId: start + offset,
        value: (start + offset) % 97,
      })),
    );
  }
  return chunks;
}

/** @internal Direct-file-only generator used by scale coverage. */
export function createSnapshotCommitInitialSnapshotV1(
  entityCount: SnapshotCommitEntityCountV1,
): SnapshotWorkloadSnapshotV1 {
  return {
    state: {
      entitySlice: { chunks: createEntityChunksV1(entityCount) },
      auditSlice: { multiSliceCommitCount: 0 },
    },
    rng: { cursor: 0 },
    commandSequence: parseNonNegativeSafeInteger(0),
    integrity: createPristineRunIntegrityV1(),
  };
}

function committedSnapshotV1(
  current: DeepReadonly<SnapshotWorkloadSnapshotV1>,
  commandClass: "single_field_committed" | "multi_slice_committed",
): SnapshotWorkloadSnapshotV1 {
  const chunks = [...current.state.entitySlice.chunks];
  const targetEntityId = Math.floor(chunks.reduce((total, chunk) => total + chunk.length, 0) / 2);
  const chunkIndex = Math.floor(targetEntityId / 1_000);
  const entityIndex = targetEntityId % 1_000;
  const sourceChunk = current.state.entitySlice.chunks[chunkIndex];
  const target = sourceChunk?.[entityIndex];
  if (sourceChunk === undefined || target === undefined) {
    throw new TypeError("Snapshot workload target entity is missing");
  }
  const targetChunk = [...sourceChunk];
  targetChunk[entityIndex] = {
    entityId: target.entityId,
    value: target.value + 1,
  };
  chunks[chunkIndex] = targetChunk;
  return {
    state: {
      entitySlice: { chunks },
      auditSlice: commandClass === "multi_slice_committed"
        ? {
          multiSliceCommitCount: current.state.auditSlice.multiSliceCommitCount + 1,
        }
        : current.state.auditSlice,
    },
    rng: current.rng,
    commandSequence: parseNonNegativeSafeInteger(current.commandSequence + 1),
    integrity: current.integrity,
  };
}

function attemptV1(
  current: DeepReadonly<SnapshotWorkloadSnapshotV1>,
  command: SnapshotWorkloadCommandV1,
): SnapshotWorkloadAttemptV1 {
  const diagnostics = {
    committedRngBefore: current.rng,
    attemptedDraws: [] as readonly never[],
    committedRngAfter: current.rng,
  };
  if (command.kind === "rejected") {
    return ({
      result: {
        kind: "rejected" as const,
        snapshot: current,
        reasons: [{ code: "snapshot_workload.rejected" as const }],
      },
      diagnostics,
    });
  }
  if (command.kind === "faulted") {
    return ({
      result: {
        kind: "faulted" as const,
        snapshot: current,
        fault: { code: "snapshot_workload.faulted" as const },
      },
      diagnostics,
    });
  }
  const snapshot = committedSnapshotV1(current, command.kind);
  return ({
    result: {
      kind: "committed" as const,
      snapshot,
      events: [
        {
          kind: "snapshot_workload.committed" as const,
          commandClass: command.kind,
        },
      ],
    },
    diagnostics,
  });
}

function sessionCountsV1(counts: SnapshotWorkCountsV1): SnapshotSessionWorkCountsV1 {
  return ({
    canonicalTraversals: counts.canonicalTraversals,
    canonicalDigests: counts.canonicalDigests,
    commandLogContinuityVerifications: counts.commandLogContinuityVerifications,
  });
}

/**
 * Low-level same-package fixture used to prove that instrumentation is
 * observational. The instrumentation type is intentionally not re-exported by
 * `@sillymaker/base/testkit`.
 *
 * @internal
 */
export function createSnapshotCommitWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly instrumentation?: SnapshotWorkInstrumentationV1;
}) {
  if (!snapshotCommitEntityCountsV1.includes(input.entityCount)) {
    throw new TypeError("unsupported Snapshot workload entity count");
  }
  const sessionInput = {
    initialSnapshot: createSnapshotCommitInitialSnapshotV1(input.entityCount),
    commandSchema: commandSchemaV1,
    executionContext: undefined,
    executeAttempt(
      snapshot: DeepReadonly<SnapshotWorkloadSnapshotV1>,
      command: DeepReadonly<SnapshotWorkloadCommandV1>,
    ): SnapshotWorkloadAttemptV1 {
      return attemptV1(snapshot, command);
    },
    normalizeUnexpectedDispatchFault(
      _error: unknown,
      snapshot: DeepReadonly<SnapshotWorkloadSnapshotV1>,
    ): SnapshotWorkloadAttemptV1 {
      return attemptV1(snapshot, { kind: "faulted" });
    },
  };
  const created = input.instrumentation === undefined
    ? createGameSessionV1<SnapshotWorkloadTypesV1>(sessionInput)
    : createInstrumentedGameSessionV1<SnapshotWorkloadTypesV1>(
      sessionInput,
      input.instrumentation,
    );
  return ({
    snapshot: () => created.session.getCurrentSnapshot(),
    commandLog: () => created.commandLog.entries(),
    dispatch(commandClass: SnapshotCommitCommandClassV1) {
      return created.session.dispatch({ kind: commandClass });
    },
  });
}

function prepareSnapshotCommitWorkloadCoreV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly commandClass: SnapshotCommitCommandClassV1;
}) {
  if (!snapshotCommitCommandClassesV1.includes(input.commandClass)) {
    throw new TypeError("unsupported Snapshot workload command class");
  }
  const counter = createSnapshotWorkCounterV1();
  const workload = createSnapshotCommitWorkloadV1({
    entityCount: input.entityCount,
    instrumentation: counter.instrumentation,
  });
  const setupCounts = sessionCountsV1(counter.snapshot());
  counter.reset();
  let dispatched = false;
  const descriptor = {
    workloadId: `snapshot-commit-v1/${input.entityCount}/${input.commandClass}`,
    entityCount: input.entityCount,
    commandClass: input.commandClass,
  };
  return ({
    descriptor,
    setupCounts,
    async dispatchOnce() {
      if (dispatched) {
        throw new TypeError("Snapshot commit workload can only run once");
      }
      dispatched = true;
      return await workload.dispatch(input.commandClass);
    },
    complete(result: Awaited<ReturnType<typeof workload.dispatch>>): SnapshotCommitWorkloadRunV1 {
      const counts = sessionCountsV1(counter.snapshot());
      if (result.kind !== "executed") {
        throw new TypeError(`Snapshot commit workload was not executed: ${result.code}`);
      }
      const entry = workload.commandLog().at(-1);
      if (entry === undefined) {
        throw new TypeError("Snapshot commit workload did not append a log");
      }
      return ({
        outcome: result.execution.kind,
        counts,
        preStateDigest: entry.preStateDigest,
        postStateDigest: entry.postStateDigest,
      });
    },
  });
}

/**
 * Prepares one neutral, generated Session hot-path workload. Setup is complete
 * before `runOnce`; the ordinary testkit API reports deterministic results and
 * work counts rather than wall-clock timings.
 */
export function prepareSnapshotCommitWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly commandClass: SnapshotCommitCommandClassV1;
}): PreparedSnapshotCommitWorkloadV1 {
  const core = prepareSnapshotCommitWorkloadCoreV1(input);
  return ({
    descriptor: core.descriptor,
    setupCounts: core.setupCounts,
    async runOnce(): Promise<SnapshotCommitWorkloadRunV1> {
      return core.complete(await core.dispatchOnce());
    },
  });
}

/**
 * Direct-file-only benchmark injection whose clock boundary is exactly the
 * asynchronous Session dispatch. Result extraction and count validation happen
 * after the clock stops.
 *
 * @internal
 */
export function prepareTimedSnapshotCommitWorkloadV1(input: {
  readonly entityCount: SnapshotCommitEntityCountV1;
  readonly commandClass: SnapshotCommitCommandClassV1;
}): TimedPreparedSnapshotCommitWorkloadV1 {
  const core = prepareSnapshotCommitWorkloadCoreV1(input);
  return ({
    descriptor: core.descriptor,
    setupCounts: core.setupCounts,
    async runOnce(): Promise<TimedSnapshotCommitWorkloadRunV1> {
      const startedAt = performance.now();
      const result = await core.dispatchOnce();
      const dispatchDurationMs = performance.now() - startedAt;
      return ({
        ...core.complete(result),
        dispatchDurationMs,
      });
    },
  });
}
