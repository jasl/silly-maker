// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { createSnapshotWorkCounterV1 } from "../internal/snapshot-work-instrumentation.ts";
import {
  createSnapshotPersistenceWorkloadV1,
  prepareSnapshotPersistenceWorkloadV1,
} from "./snapshot-persistence-workload.ts";

const firstAutoSaveCountsV1 = Object.freeze({
  canonicalTraversals: 8,
  canonicalDigests: 6,
  deepFreezeTraversals: 1,
  commandLogContinuityVerifications: 1,
  saveCanonicalSerializations: 2,
  strictJsonParses: 1,
  strictJsonPreflights: 2,
});

const rotationCountsV1 = Object.freeze({
  canonicalTraversals: 11,
  canonicalDigests: 8,
  deepFreezeTraversals: 1,
  commandLogContinuityVerifications: 1,
  saveCanonicalSerializations: 3,
  strictJsonParses: 2,
  strictJsonPreflights: 3,
});

describe("Snapshot persistence workload", () => {
  it("locks the current every-commit and auto.previous rotation baseline", async () => {
    const prepared = await prepareSnapshotPersistenceWorkloadV1({ entityCount: 100 });

    expect(prepared.descriptor).toEqual({
      workloadId: "snapshot-persistence-v1/100/every_commit_auto_rotation",
      entityCount: 100,
      autosaveClass: "every_commit_auto_rotation",
      commandCount: 2,
    });
    expect(prepared.setupCounts).toEqual({
      canonicalTraversals: 1,
      canonicalDigests: 1,
      deepFreezeTraversals: 1,
      commandLogContinuityVerifications: 0,
      saveCanonicalSerializations: 0,
      strictJsonParses: 0,
      strictJsonPreflights: 0,
    });
    await expect(prepared.runOnce()).resolves.toEqual({
      firstAutoSave: {
        counts: firstAutoSaveCountsV1,
        currentCommandSequence: 1,
        currentRecordRevision: 1,
        previousCommandSequence: null,
        previousRecordRevision: null,
      },
      rotation: {
        counts: rotationCountsV1,
        currentCommandSequence: 2,
        currentRecordRevision: 2,
        previousCommandSequence: 1,
        previousRecordRevision: 1,
      },
      aggregateCounts: {
        canonicalTraversals: 19,
        canonicalDigests: 14,
        deepFreezeTraversals: 2,
        commandLogContinuityVerifications: 2,
        saveCanonicalSerializations: 5,
        strictJsonParses: 3,
        strictJsonPreflights: 5,
      },
    });
    await expect(prepared.runOnce()).rejects.toThrow(
      "Snapshot persistence workload can only run once",
    );
  });

  it("keeps instrumented Session, CommandLog, and Save bytes production-equivalent", async () => {
    const counter = createSnapshotWorkCounterV1();
    const measured = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      instrumentation: counter.instrumentation,
    });
    const reference = await createSnapshotPersistenceWorkloadV1({ entityCount: 100 });
    counter.reset();

    const measuredFirst = await measured.commitAndDrain();
    const referenceFirst = await reference.commitAndDrain();

    expect(canonicalJsonBytes(measuredFirst)).toEqual(canonicalJsonBytes(referenceFirst));
    expect(counter.snapshot()).toEqual(firstAutoSaveCountsV1);
    expect(canonicalJsonBytes(measured.snapshot())).toEqual(
      canonicalJsonBytes(reference.snapshot()),
    );
    expect(canonicalJsonBytes(measured.commandLog())).toEqual(
      canonicalJsonBytes(reference.commandLog()),
    );
    expect(await measured.slotRecord("auto.current")).toEqual(
      await reference.slotRecord("auto.current"),
    );
    expect(await measured.slotRecord("auto.previous")).toBeNull();
    expect(await reference.slotRecord("auto.previous")).toBeNull();

    counter.reset();
    const measuredSecond = await measured.commitAndDrain();
    const referenceSecond = await reference.commitAndDrain();

    expect(canonicalJsonBytes(measuredSecond)).toEqual(canonicalJsonBytes(referenceSecond));
    expect(counter.snapshot()).toEqual(rotationCountsV1);
    expect(canonicalJsonBytes(measured.snapshot())).toEqual(
      canonicalJsonBytes(reference.snapshot()),
    );
    expect(canonicalJsonBytes(measured.commandLog())).toEqual(
      canonicalJsonBytes(reference.commandLog()),
    );
    expect(await measured.slotRecord("auto.current")).toEqual(
      await reference.slotRecord("auto.current"),
    );
    expect(await measured.slotRecord("auto.previous")).toEqual(
      await reference.slotRecord("auto.previous"),
    );

    await measured.dispose();
    await reference.dispose();
  });
});
