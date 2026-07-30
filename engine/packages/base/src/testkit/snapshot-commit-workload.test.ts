// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { createSnapshotWorkCounterV1 } from "../internal/snapshot-work-instrumentation.ts";
import {
  createSnapshotCommitInitialSnapshotV1,
  createSnapshotCommitWorkloadV1,
  prepareSnapshotCommitWorkloadV1,
  type SnapshotCommitCommandClassV1,
  snapshotCommitEntityCountsV1,
} from "./snapshot-commit-workload.ts";

const commandClassesV1 = Object.freeze([
  "single_field_committed",
  "multi_slice_committed",
  "rejected",
  "faulted",
] as const satisfies readonly SnapshotCommitCommandClassV1[]);

describe("Snapshot commit workload", () => {
  it.each(snapshotCommitEntityCountsV1)("generates a neutral %i-entity Snapshot", (entityCount) => {
    const snapshot = createSnapshotCommitInitialSnapshotV1(entityCount);

    expect(
      snapshot.state.entitySlice.chunks.reduce((total, chunk) => total + chunk.length, 0),
    ).toBe(entityCount);
  });

  it("generates deterministic entity and Snapshot data", () => {
    const first = createSnapshotCommitWorkloadV1({ entityCount: 100 });
    const second = createSnapshotCommitWorkloadV1({ entityCount: 100 });

    expect(canonicalJsonBytes(first.snapshot())).toEqual(canonicalJsonBytes(second.snapshot()));
  });

  it("models single-field and multi-slice commits as distinct candidates", async () => {
    const single = createSnapshotCommitWorkloadV1({ entityCount: 100 });
    const singleBefore = single.snapshot();
    const singleTargetBefore = singleBefore.state.entitySlice.chunks[0]?.[50]?.value;

    await expect(single.dispatch("single_field_committed")).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(single.snapshot().state.entitySlice.chunks[0]?.[50]?.value).toBe(
      (singleTargetBefore ?? 0) + 1,
    );
    expect(single.snapshot().state.auditSlice).toBe(singleBefore.state.auditSlice);

    const multiSlice = createSnapshotCommitWorkloadV1({ entityCount: 100 });
    const multiSliceBefore = multiSlice.snapshot();
    const multiSliceTargetBefore = multiSliceBefore.state.entitySlice.chunks[0]?.[50]?.value;

    await expect(multiSlice.dispatch("multi_slice_committed")).resolves.toMatchObject({
      kind: "executed",
      execution: { kind: "committed" },
    });
    expect(multiSlice.snapshot().state.entitySlice.chunks[0]?.[50]?.value).toBe(
      (multiSliceTargetBefore ?? 0) + 1,
    );
    expect(multiSlice.snapshot().state.auditSlice.multiSliceCommitCount).toBe(
      multiSliceBefore.state.auditSlice.multiSliceCommitCount + 1,
    );
  });

  it.each(["rejected", "faulted"] as const)(
    "keeps the authoritative Snapshot identical for %s",
    async (commandClass) => {
      const workload = createSnapshotCommitWorkloadV1({ entityCount: 100 });
      const before = workload.snapshot();

      await expect(workload.dispatch(commandClass)).resolves.toMatchObject({
        kind: "executed",
        execution: { kind: commandClass },
      });
      expect(workload.snapshot()).toBe(before);
    },
  );

  it("separates setup work from the reusable dispatch baseline", async () => {
    const prepared = prepareSnapshotCommitWorkloadV1({
      entityCount: 100,
      commandClass: "single_field_committed",
    });

    expect(prepared.setupCounts).toEqual({
      canonicalTraversals: 1,
      canonicalDigests: 1,
      deepFreezeTraversals: 1,
      commandLogContinuityVerifications: 0,
    });
    await expect(prepared.runOnce()).resolves.toMatchObject({
      outcome: "committed",
      counts: {
        canonicalTraversals: 1,
        canonicalDigests: 1,
        deepFreezeTraversals: 1,
        commandLogContinuityVerifications: 1,
      },
    });
    await expect(prepared.runOnce()).rejects.toThrow("Snapshot commit workload can only run once");
  });

  it.each(commandClassesV1)(
    "counts the current %s Session hot path without changing its result",
    async (commandClass) => {
      const counter = createSnapshotWorkCounterV1();
      const measured = createSnapshotCommitWorkloadV1({
        entityCount: 100,
        instrumentation: counter.instrumentation,
      });
      const reference = createSnapshotCommitWorkloadV1({ entityCount: 100 });
      counter.reset();

      const measuredResult = await measured.dispatch(commandClass);
      const counts = counter.snapshot();
      const referenceResult = await reference.dispatch(commandClass);

      expect(canonicalJsonBytes(measuredResult)).toEqual(canonicalJsonBytes(referenceResult));
      expect(canonicalJsonBytes(measured.snapshot())).toEqual(
        canonicalJsonBytes(reference.snapshot()),
      );
      expect(canonicalJsonBytes(measured.commandLog())).toEqual(
        canonicalJsonBytes(reference.commandLog()),
      );
      expect(counts).toEqual({
        canonicalTraversals:
          commandClass === "single_field_committed" || commandClass === "multi_slice_committed"
            ? 1
            : 0,
        canonicalDigests:
          commandClass === "single_field_committed" || commandClass === "multi_slice_committed"
            ? 1
            : 0,
        deepFreezeTraversals:
          commandClass === "single_field_committed" || commandClass === "multi_slice_committed"
            ? 1
            : 0,
        commandLogContinuityVerifications: 1,
        saveCanonicalSerializations: 0,
        strictJsonParses: 0,
        strictJsonPreflights: 0,
      });
    },
  );
});
