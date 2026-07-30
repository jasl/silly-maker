// SPDX-License-Identifier: MIT
import type {
  LeaseHandoffRequestId,
  SaveSlotIdV1,
  SessionLeaseOwnerId,
} from "../contracts/application.ts";
import type { HostRecordRevisionV1, IsoUtcInstant } from "../contracts/host.ts";
import { createMemoryHostRecordStoreV1 } from "../contracts/host.ts";
import type { NonNegativeSafeInteger, PositiveSafeInteger } from "../contracts/values.ts";
import {
  createSnapshotWorkCounterV1,
  type SnapshotWorkCountsV1,
  type SnapshotWorkInstrumentationV1,
} from "../internal/snapshot-work-instrumentation.ts";
import {
  createInstrumentedPersistenceServiceV1,
  createPersistenceServiceV1,
} from "../runtime/persistence/persistence-service.ts";
import { createSaveSlotRecordKeyV1 } from "../runtime/persistence/slot-keys.ts";
import type { SnapshotSessionWorkCountsV1 } from "./snapshot-commit-workload.ts";
import {
  createSnapshotTransactionWorkloadV1,
  snapshotTransactionProvenanceV1,
  snapshotTransactionSnapshotSchemaV1,
} from "./snapshot-transaction-workload.ts";

export interface SnapshotPersistenceWorkCountsV1 extends SnapshotSessionWorkCountsV1 {
  readonly saveCanonicalSerializations: number;
  readonly strictJsonParses: number;
  readonly strictJsonPreflights: number;
}

export interface SnapshotPersistenceWorkloadDescriptorV1 {
  readonly workloadId: "snapshot-persistence-v1/100/every_commit_auto_rotation";
  readonly entityCount: 100;
  readonly autosaveClass: "every_commit_auto_rotation";
  readonly commandCount: 2;
}

export interface SnapshotPersistenceWorkloadStepV1 {
  readonly counts: SnapshotPersistenceWorkCountsV1;
  readonly currentCommandSequence: NonNegativeSafeInteger;
  readonly currentRecordRevision: PositiveSafeInteger;
  readonly previousCommandSequence: NonNegativeSafeInteger | null;
  readonly previousRecordRevision: PositiveSafeInteger | null;
}

export interface SnapshotPersistenceWorkloadRunV1 {
  readonly firstAutoSave: SnapshotPersistenceWorkloadStepV1;
  readonly rotation: SnapshotPersistenceWorkloadStepV1;
  readonly aggregateCounts: SnapshotPersistenceWorkCountsV1;
}

export interface PreparedSnapshotPersistenceWorkloadV1 {
  readonly descriptor: SnapshotPersistenceWorkloadDescriptorV1;
  readonly setupCounts: SnapshotPersistenceWorkCountsV1;
  runOnce(): Promise<SnapshotPersistenceWorkloadRunV1>;
}

interface StoredSlotRecordV1 {
  readonly revision: HostRecordRevisionV1;
  readonly bytes: Uint8Array;
}

const persistenceOwnerIdV1 =
  "owner.sillymaker.snapshot-persistence-workload" as SessionLeaseOwnerId;
const persistenceHandoffRequestIdV1 =
  "handoff.sillymaker.snapshot-persistence-workload" as LeaseHandoffRequestId;
const persistenceInstantV1 = "2026-07-30T00:00:00.000Z" as IsoUtcInstant;

function persistenceCountsV1(counts: SnapshotWorkCountsV1): SnapshotPersistenceWorkCountsV1 {
  return Object.freeze({
    canonicalTraversals: counts.canonicalTraversals,
    canonicalDigests: counts.canonicalDigests,
    deepFreezeTraversals: counts.deepFreezeTraversals,
    commandLogContinuityVerifications: counts.commandLogContinuityVerifications,
    saveCanonicalSerializations: counts.saveCanonicalSerializations,
    strictJsonParses: counts.strictJsonParses,
    strictJsonPreflights: counts.strictJsonPreflights,
  });
}

function addCountsV1(
  left: SnapshotPersistenceWorkCountsV1,
  right: SnapshotPersistenceWorkCountsV1,
): SnapshotPersistenceWorkCountsV1 {
  return Object.freeze({
    canonicalTraversals: left.canonicalTraversals + right.canonicalTraversals,
    canonicalDigests: left.canonicalDigests + right.canonicalDigests,
    deepFreezeTraversals: left.deepFreezeTraversals + right.deepFreezeTraversals,
    commandLogContinuityVerifications:
      left.commandLogContinuityVerifications + right.commandLogContinuityVerifications,
    saveCanonicalSerializations:
      left.saveCanonicalSerializations + right.saveCanonicalSerializations,
    strictJsonParses: left.strictJsonParses + right.strictJsonParses,
    strictJsonPreflights: left.strictJsonPreflights + right.strictJsonPreflights,
  });
}

/**
 * @internal Direct-file-only real Session/Persistence composition used by
 * deterministic equivalence tests.
 */
export async function createSnapshotPersistenceWorkloadV1(input: {
  readonly entityCount: 100;
  readonly instrumentation?: SnapshotWorkInstrumentationV1;
}) {
  const session = createSnapshotTransactionWorkloadV1({
    entityCount: input.entityCount,
    ...(input.instrumentation === undefined ? {} : { instrumentation: input.instrumentation }),
  });
  const records = createMemoryHostRecordStoreV1();
  const persistenceOptions = {
    runtimeControl: session.runtimeControl,
    records,
    snapshotSchema: snapshotTransactionSnapshotSchemaV1,
    provenance: snapshotTransactionProvenanceV1,
    adoptionDeclaration: null,
    ownerId: persistenceOwnerIdV1,
    nextHandoffRequestId: () => persistenceHandoffRequestIdV1,
    validateReferences: () => Object.freeze([]),
    validateInvariants: () => Object.freeze([]),
    initialSimulationLineage: Object.freeze([]),
    metadataClock: Object.freeze({ now: () => persistenceInstantV1 }),
    exportFilename: "snapshot-persistence-workload.json",
    manualSaveSlotCount: 0,
    autoSaveCapture: "committed_snapshots" as const,
  };
  const persistence =
    input.instrumentation === undefined
      ? await createPersistenceServiceV1(persistenceOptions)
      : await createInstrumentedPersistenceServiceV1(persistenceOptions, input.instrumentation);

  return Object.freeze({
    snapshot: session.snapshot,
    commandLog: session.commandLog,
    async commitAndDrain() {
      const result = await session.dispatch("cross_owner_atomic_committed");
      await persistence.autoSaveIdle();
      return result;
    },
    async slotRecord(slotId: Extract<SaveSlotIdV1, "auto.current" | "auto.previous">) {
      const stored = await records.read(
        "save",
        createSaveSlotRecordKeyV1(snapshotTransactionProvenanceV1.story.id, slotId),
      );
      return stored === null
        ? null
        : Object.freeze({
            revision: stored.revision,
            bytes: Uint8Array.from(stored.bytes),
          } satisfies StoredSlotRecordV1);
    },
    slotSummaries: () => persistence.port.listSlots(),
    dispose: () => persistence.disposeForRebootstrap(),
  });
}

async function readStepV1(
  workload: Awaited<ReturnType<typeof createSnapshotPersistenceWorkloadV1>>,
  counts: SnapshotPersistenceWorkCountsV1,
): Promise<SnapshotPersistenceWorkloadStepV1> {
  const summaries = await workload.slotSummaries();
  const current = summaries.find(({ slotId }) => slotId === "auto.current");
  const previous = summaries.find(({ slotId }) => slotId === "auto.previous");
  if (
    current?.capturedCommandSequence === null ||
    current?.capturedCommandSequence === undefined ||
    current.recordRevision === null
  ) {
    throw new TypeError("Snapshot persistence workload did not write auto.current");
  }
  return Object.freeze({
    counts,
    currentCommandSequence: current.capturedCommandSequence,
    currentRecordRevision: current.recordRevision,
    previousCommandSequence: previous?.capturedCommandSequence ?? null,
    previousRecordRevision: previous?.recordRevision ?? null,
  });
}

function descriptorV1(): SnapshotPersistenceWorkloadDescriptorV1 {
  return Object.freeze({
    workloadId: "snapshot-persistence-v1/100/every_commit_auto_rotation",
    entityCount: 100,
    autosaveClass: "every_commit_auto_rotation",
    commandCount: 2,
  });
}

async function preparePersistenceCoreV1() {
  const counter = createSnapshotWorkCounterV1();
  const workload = await createSnapshotPersistenceWorkloadV1({
    entityCount: 100,
    instrumentation: counter.instrumentation,
  });
  const setupCounts = persistenceCountsV1(counter.snapshot());
  counter.reset();
  let ran = false;

  const runV1 = async () => {
    if (ran) throw new TypeError("Snapshot persistence workload can only run once");
    ran = true;
    try {
      let dispatchDurationMs = 0;
      let startedAt = performance.now();
      const first = await workload.commitAndDrain();
      dispatchDurationMs += performance.now() - startedAt;
      if (first.kind !== "executed" || first.execution.kind !== "committed") {
        throw new TypeError("Snapshot persistence workload first command did not commit");
      }
      const firstCounts = persistenceCountsV1(counter.snapshot());
      const firstAutoSave = await readStepV1(workload, firstCounts);
      counter.reset();

      startedAt = performance.now();
      const second = await workload.commitAndDrain();
      dispatchDurationMs += performance.now() - startedAt;
      if (second.kind !== "executed" || second.execution.kind !== "committed") {
        throw new TypeError("Snapshot persistence workload second command did not commit");
      }
      const rotationCounts = persistenceCountsV1(counter.snapshot());
      const rotation = await readStepV1(workload, rotationCounts);
      return Object.freeze({
        result: Object.freeze({
          firstAutoSave,
          rotation,
          aggregateCounts: addCountsV1(firstCounts, rotationCounts),
        } satisfies SnapshotPersistenceWorkloadRunV1),
        dispatchDurationMs,
      });
    } finally {
      await workload.dispose();
    }
  };
  return Object.freeze({ counter, workload, setupCounts, runV1 });
}

export async function prepareSnapshotPersistenceWorkloadV1(input: {
  readonly entityCount: 100;
}): Promise<PreparedSnapshotPersistenceWorkloadV1> {
  if (input.entityCount !== 100) {
    throw new TypeError("Snapshot persistence workload requires 100 entities");
  }
  const core = await preparePersistenceCoreV1();
  return Object.freeze({
    descriptor: descriptorV1(),
    setupCounts: core.setupCounts,
    async runOnce() {
      return (await core.runV1()).result;
    },
  });
}

/** @internal Direct-file-only timing around two commits and two autosave drains. */
export async function prepareTimedSnapshotPersistenceWorkloadV1(input: {
  readonly entityCount: 100;
}) {
  if (input.entityCount !== 100) {
    throw new TypeError("Snapshot persistence workload requires 100 entities");
  }
  const core = await preparePersistenceCoreV1();
  return Object.freeze({
    descriptor: descriptorV1(),
    setupCounts: core.setupCounts,
    async runOnce() {
      const measured = await core.runV1();
      return Object.freeze({
        ...measured.result,
        dispatchDurationMs: measured.dispatchDurationMs,
      });
    },
  });
}
