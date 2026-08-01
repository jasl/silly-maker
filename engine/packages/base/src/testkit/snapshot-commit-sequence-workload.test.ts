// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import {
  createPurposeTaggedSnapshotWorkCounterV1,
  createSnapshotWorkCounterV1,
  type SnapshotWorkEventV1,
  type SnapshotWorkPurposeV1,
} from "../internal/snapshot-work-instrumentation.ts";
import { snapshotCommitEntityCountsV1 } from "./snapshot-commit-workload.ts";
import {
  createSnapshotTransactionInitialSnapshotV1,
  createSnapshotTransactionWorkloadV1,
  prepareSnapshotCommitSequenceWorkloadV1,
  prepareSnapshotReplayWorkloadV1,
  snapshotCommitMixedLongSequenceV1,
} from "./snapshot-transaction-workload.ts";

describe("Snapshot sequence and replay workloads", () => {
  it.each(snapshotCommitEntityCountsV1)(
    "generates the neutral %i-entity transaction Snapshot",
    (entityCount) => {
      const snapshot = createSnapshotTransactionInitialSnapshotV1(entityCount);

      expect(
        snapshot.state.simulation.entities.chunks.reduce((total, chunk) => total + chunk.length, 0),
      ).toBe(entityCount);
    },
  );

  it("runs through two real transaction owners without changing instrumented behavior", async () => {
    const counter = createSnapshotWorkCounterV1();
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    let evidenceAdmissionFreezeTraversals = 0;
    const instrumentation = Object.freeze({
      record(event: SnapshotWorkEventV1, purpose?: SnapshotWorkPurposeV1) {
        counter.instrumentation.record(event, purpose);
        purposes.instrumentation.record(event, purpose);
        if (event === "deep_freeze_traversal" && purpose === "evidence_admission") {
          evidenceAdmissionFreezeTraversals += 1;
        }
      },
    });
    const measured = createSnapshotTransactionWorkloadV1({
      entityCount: 100,
      instrumentation,
    });
    const reference = createSnapshotTransactionWorkloadV1({ entityCount: 100 });
    counter.reset();
    purposes.reset();
    evidenceAdmissionFreezeTraversals = 0;

    const measuredResult = await measured.dispatch("cross_owner_atomic_committed");
    const referenceResult = await reference.dispatch("cross_owner_atomic_committed");

    expect(measuredResult).toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(canonicalJsonBytes(measuredResult)).toEqual(canonicalJsonBytes(referenceResult));
    expect(canonicalJsonBytes(measured.snapshot())).toEqual(
      canonicalJsonBytes(reference.snapshot()),
    );
    expect(canonicalJsonBytes(measured.commandLog())).toEqual(
      canonicalJsonBytes(reference.commandLog()),
    );
    expect(measured.snapshot().commandSequence).toBe(1);
    expect(measured.snapshot().state.simulation.audit.crossOwnerCommitCount).toBe(1);
    expect(measured.commandLog()).toHaveLength(1);
    expect(measured.commandLog().at(-1)?.outcome).toEqual({
      kind: "committed",
      facts: [
        { kind: "snapshot_workload.audit_recorded", count: 1 },
        { kind: "snapshot_workload.entity_updated", entityId: 50, value: 51 },
      ],
    });
    expect(counter.snapshot()).toEqual({
      canonicalTraversals: 3,
      canonicalDigests: 1,
      deepFreezeTraversals: 3,
      commandLogContinuityVerifications: 1,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    expect(purposes.snapshot()).toEqual({
      snapshotDigestTraversals: 1,
      snapshotFreezeTraversals: 1,
      bootstrapAdmissionCanonicalTraversals: 0,
      bootstrapHandoffFreezeTraversals: 0,
      commandAdmissionCanonicalTraversals: 1,
      commandHandoffFreezeTraversals: 1,
      commandLogMetadataAdmissionCanonicalTraversals: 0,
      commandLogMetadataFreezeTraversals: 0,
      evidenceAdmissionCanonicalTraversals: 1,
      replayComparisonTraversals: 0,
      totalPhysicalCanonicalTraversals: 3,
    });
    expect(evidenceAdmissionFreezeTraversals).toBe(1);
  });

  it("locks the current mixed 256-command Session baseline", async () => {
    const prepared = prepareSnapshotCommitSequenceWorkloadV1({
      entityCount: 100,
      sequenceClass: "mixed_long",
    });

    expect(prepared.descriptor).toMatchObject({
      workloadId: "snapshot-commit-sequence-v1/100/mixed_long",
      entityCount: 100,
      sequenceClass: "mixed_long",
      commandCount: 256,
    });
    expect(prepared.setupCounts).toEqual({
      canonicalTraversals: 1,
      canonicalDigests: 1,
      deepFreezeTraversals: 1,
      commandLogContinuityVerifications: 0,
    });
    await expect(prepared.runOnce()).resolves.toMatchObject({
      outcomes: [
        ...Array.from({ length: 85 }, () => ["committed", "committed", "rejected"]).flat(),
        "faulted",
      ],
      counts: {
        canonicalTraversals: 682,
        canonicalDigests: 170,
        deepFreezeTraversals: 682,
        commandLogContinuityVerifications: 256,
      },
      retainedCommandCount: 200,
      replayBaseCommandSequence: 38,
      currentCommandSequence: 170,
    });
    await expect(prepared.runOnce()).rejects.toThrow(
      "Snapshot commit sequence workload can only run once",
    );
  });

  it("moves the replay base deterministically and keeps the final fault atomic", async () => {
    const first = createSnapshotTransactionWorkloadV1({ entityCount: 100 });
    const second = createSnapshotTransactionWorkloadV1({ entityCount: 100 });
    let beforeFault = first.snapshot();

    for (const commandClass of snapshotCommitMixedLongSequenceV1) {
      if (commandClass === "faulted") beforeFault = first.snapshot();
      await first.dispatch(commandClass);
      await second.dispatch(commandClass);
    }

    expect(first.status()).toBe("fault_paused");
    expect(first.snapshot()).toBe(beforeFault);
    expect(first.commandLog()).toHaveLength(200);
    expect(first.commandLog().at(0)?.logOrdinal).toBe(57);
    expect(first.commandLog().at(-1)?.logOrdinal).toBe(256);
    expect(first.commandLog().at(0)?.preStateDigest).toBe(first.replayBaseStateDigest());
    expect(first.commandLog().filter(({ outcome }) => outcome.kind === "committed")).toHaveLength(
      132,
    );
    expect(first.commandLog().filter(({ outcome }) => outcome.kind === "rejected")).toHaveLength(
      67,
    );
    expect(first.commandLog().filter(({ outcome }) => outcome.kind === "faulted")).toHaveLength(1);
    expect(canonicalJsonBytes(first.replayBase())).toEqual(canonicalJsonBytes(second.replayBase()));
    expect(canonicalJsonBytes(first.snapshot())).toEqual(canonicalJsonBytes(second.snapshot()));
    expect(canonicalJsonBytes(first.commandLog())).toEqual(canonicalJsonBytes(second.commandLog()));
  });

  it("locks the successful authoritative replay baseline", async () => {
    const prepared = await prepareSnapshotReplayWorkloadV1({ entityCount: 100 });

    expect(prepared.descriptor).toMatchObject({
      workloadId: "snapshot-replay-v1/100/mixed_outcomes",
      entityCount: 100,
      sequenceClass: "mixed_long_retained",
      commandCount: 200,
    });
    expect(prepared.setupCounts).toEqual({
      canonicalTraversals: 1,
      canonicalDigests: 1,
      deepFreezeTraversals: 1,
      commandLogContinuityVerifications: 0,
    });
    expect(prepared.recordingCounts).toEqual({
      canonicalTraversals: 682,
      canonicalDigests: 170,
      deepFreezeTraversals: 682,
      commandLogContinuityVerifications: 256,
    });
    await expect(prepared.runOnce()).resolves.toEqual({
      comparison: {
        authoritative: true,
        identityMatch: true,
        visualMatch: false,
        matches: true,
        executedEntries: 200,
        mismatches: [],
      },
      counts: {
        canonicalTraversals: 3609,
        canonicalDigests: 1405,
        deepFreezeTraversals: 200,
        commandLogContinuityVerifications: 0,
      },
    });
    await expect(prepared.runOnce()).rejects.toThrow("Snapshot replay workload can only run once");
  });
});
