// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import { canonicalJsonBytes } from "../contracts/canonical-json.ts";
import { digestBytes, digestCanonical } from "../contracts/digest.ts";
import type { HostAtomicRecordStoreV1 } from "../contracts/host.ts";
import { createMemoryHostRecordStoreV1 } from "../contracts/host.ts";
import {
  createPurposeTaggedSnapshotWorkCounterV1,
  createSnapshotWorkCounterV1,
} from "../internal/snapshot-work-instrumentation.ts";
import { createSaveSlotRecordKeyV1 } from "../runtime/persistence/slot-keys.ts";
import {
  createSnapshotPersistenceWorkloadV1,
  prepareSnapshotPersistenceWorkloadV1,
} from "./snapshot-persistence-workload.ts";
import { snapshotTransactionProvenanceV1 } from "./snapshot-transaction-workload.ts";

const firstAutoSaveCountsV1 = {
  canonicalTraversals: 7,
  canonicalDigests: 4,
  commandLogContinuityVerifications: 1,
  saveCanonicalSerializations: 1,
  strictJsonParses: 1,
  strictJsonPreflights: 0,
};

const rotationCountsV1 = {
  canonicalTraversals: 11,
  canonicalDigests: 7,
  commandLogContinuityVerifications: 1,
  saveCanonicalSerializations: 2,
  strictJsonParses: 2,
  strictJsonPreflights: 0,
};

const digestFallbackFirstAutoSaveCountsV1 = {
  ...firstAutoSaveCountsV1,
  canonicalTraversals: 8,
  canonicalDigests: 5,
};

const digestFallbackRotationCountsV1 = {
  ...rotationCountsV1,
  canonicalTraversals: 12,
  canonicalDigests: 8,
};

const writeReceiptFallbackFirstAutoSaveCountsV1 = {
  ...firstAutoSaveCountsV1,
  canonicalTraversals: 9,
  canonicalDigests: 5,
  saveCanonicalSerializations: 2,
  strictJsonPreflights: 0,
};

const writeReceiptFallbackRotationCountsV1 = {
  ...rotationCountsV1,
  canonicalTraversals: 13,
  canonicalDigests: 8,
  saveCanonicalSerializations: 3,
  strictJsonPreflights: 0,
};

async function persistenceEquivalenceEvidenceV1(
  workload: Awaited<ReturnType<typeof createSnapshotPersistenceWorkloadV1>>,
) {
  const snapshot = workload.snapshot();
  return ({
    snapshotBytes: canonicalJsonBytes(snapshot),
    snapshotDigest: digestCanonical("sillymaker:state:v1", snapshot),
    commandLogBytes: canonicalJsonBytes(workload.commandLog()),
    replayBaseBytes: canonicalJsonBytes(workload.replayBase()),
    replayBaseStateDigest: workload.replayBaseStateDigest(),
    rawSaveRecords: await workload.rawSaveRecords(),
  });
}

async function expectPersistenceEquivalentV1(
  optimized: Awaited<ReturnType<typeof createSnapshotPersistenceWorkloadV1>>,
  fallback: Awaited<ReturnType<typeof createSnapshotPersistenceWorkloadV1>>,
) {
  expect(await persistenceEquivalenceEvidenceV1(optimized)).toEqual(
    await persistenceEquivalenceEvidenceV1(fallback),
  );
}

async function createPersistenceEquivalencePairV1(
  records?: Readonly<{
    optimized: HostAtomicRecordStoreV1;
    fallback: HostAtomicRecordStoreV1;
  }>,
) {
  const optimizedCounter = createSnapshotWorkCounterV1();
  const fallbackCounter = createSnapshotWorkCounterV1();
  const optimized = await createSnapshotPersistenceWorkloadV1({
    entityCount: 100,
    instrumentation: optimizedCounter.instrumentation,
    ...(records === undefined ? {} : { records: records.optimized }),
  });
  try {
    const fallback = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      instrumentation: fallbackCounter.instrumentation,
      ...(records === undefined ? {} : { records: records.fallback }),
      wrapRuntimeControlForFallback: true,
      wrapRepositoryForWriteReceiptFallback: true,
    });
    return ({ optimized, fallback });
  } catch (error) {
    await optimized.dispose();
    throw error;
  }
}

function createDelayedSaveStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  let blocking = false;
  let releaseWrite: (() => void) | undefined;
  let markWriteStarted: (() => void) | undefined;
  let writeStarted = Promise.resolve();
  let writeGate = Promise.resolve();
  const records: HostAtomicRecordStoreV1 = {
    read: memory.read,
    list: memory.list,
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      if (blocking && mutations.some(({ namespace }) => namespace === "save")) {
        markWriteStarted?.();
        await writeGate;
      }
      return await memory.commit(mutations);
    },
  };
  return ({
    records,
    blockNextSaveWrite() {
      if (blocking) throw new TypeError("delayed Save store is already blocking");
      blocking = true;
      writeStarted = new Promise<void>((resolve) => {
        markWriteStarted = resolve;
      });
      writeGate = new Promise<void>((resolve) => {
        releaseWrite = resolve;
      });
    },
    waitUntilWriteStarts: () => writeStarted,
    releaseWrites() {
      blocking = false;
      releaseWrite?.();
    },
  });
}

function createSemanticallyTamperingStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  const textEncoder = new TextEncoder();
  let tamperSaveReads = false;
  const records: HostAtomicRecordStoreV1 = {
    async read(...args: Parameters<HostAtomicRecordStoreV1["read"]>) {
      const stored = await memory.read(...args);
      if (!tamperSaveReads || args[0] !== "save" || stored === null) return stored;
      return ({
        ...stored,
        bytes: textEncoder.encode(
          JSON.stringify(JSON.parse(new TextDecoder().decode(stored.bytes)), null, 2),
        ),
      });
    },
    list: memory.list,
    async commit(...args: Parameters<HostAtomicRecordStoreV1["commit"]>) {
      const result = await memory.commit(...args);
      if (result.kind === "committed" && args[0].some(({ namespace }) => namespace === "save")) {
        tamperSaveReads = true;
      }
      return result;
    },
  };
  return records;
}

async function corruptQuickSaveV1(records: HostAtomicRecordStoreV1): Promise<void> {
  const key = createSaveSlotRecordKeyV1(snapshotTransactionProvenanceV1.story.id, "quick");
  const stored = await records.read("save", key);
  if (stored === null) throw new TypeError("expected a stored Quick Save");
  const result = await records.commit([
    {
      kind: "put",
      namespace: "save",
      key,
      expectedRevision: stored.revision,
      bytes: new TextEncoder().encode("corrupt"),
    },
  ]);
  if (result.kind !== "committed") throw new TypeError("failed to corrupt the Quick Save");
}

describe("Snapshot persistence workload", () => {
  it("rejects over-limit adoption configuration before any workload Host activity", async () => {
    const digest = digestBytes(Uint8Array.of(0x61));
    const declaration = {
      storyId: snapshotTransactionProvenanceV1.story.id,
      storyRevision: snapshotTransactionProvenanceV1.story.revision,
      stateContractRevision: snapshotTransactionProvenanceV1.resolved.stateContractRevision,
      stateContractDigest: snapshotTransactionProvenanceV1.resolved.stateContractDigest,
      fromSimulationDigest: digest,
      toSimulationDigest: snapshotTransactionProvenanceV1.resolved.simulationDigest,
      simulationPatchSetDigest: snapshotTransactionProvenanceV1.resolved.patchSet.simulationDigest,
    };
    const delegate = createMemoryHostRecordStoreV1();
    let hostOperations = 0;
    const records: HostAtomicRecordStoreV1 = {
      read(
        namespace: Parameters<HostAtomicRecordStoreV1["read"]>[0],
        key: Parameters<HostAtomicRecordStoreV1["read"]>[1],
      ) {
        hostOperations += 1;
        return delegate.read(namespace, key);
      },
      list(namespace: Parameters<HostAtomicRecordStoreV1["list"]>[0]) {
        hostOperations += 1;
        return delegate.list(namespace);
      },
      commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
        hostOperations += 1;
        return delegate.commit(mutations);
      },
    };
    await expect(createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      records,
      adoptionDeclarations: Array.from({ length: 257 }, () => declaration),
    })).rejects.toThrow(TypeError);
    expect(hostOperations).toBe(0);
  });

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
        canonicalTraversals: 18,
        canonicalDigests: 11,
        commandLogContinuityVerifications: 2,
        saveCanonicalSerializations: 3,
        strictJsonParses: 3,
        strictJsonPreflights: 0,
      },
    });
    await expect(prepared.runOnce()).rejects.toThrow(
      "Snapshot persistence workload can only run once",
    );
  });

  it("keeps instrumented Session, CommandLog, and Save bytes production-equivalent", async () => {
    const counter = createSnapshotWorkCounterV1();
    const purposes = createPurposeTaggedSnapshotWorkCounterV1();
    const measured = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      instrumentation: {
        record(event, purpose) {
          counter.instrumentation.record(event, purpose);
          purposes.instrumentation.record(event, purpose);
        },
      },
    });
    const reference = await createSnapshotPersistenceWorkloadV1({ entityCount: 100 });
    counter.reset();
    purposes.reset();

    const measuredFirst = await measured.commitAndDrain();
    const referenceFirst = await reference.commitAndDrain();

    expect(canonicalJsonBytes(measuredFirst)).toEqual(canonicalJsonBytes(referenceFirst));
    expect(counter.snapshot()).toEqual(firstAutoSaveCountsV1);
    expect(purposes.snapshot().evidenceAdmissionCanonicalTraversals).toBe(1);
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
    purposes.reset();
    const measuredSecond = await measured.commitAndDrain();
    const referenceSecond = await reference.commitAndDrain();

    expect(canonicalJsonBytes(measuredSecond)).toEqual(canonicalJsonBytes(referenceSecond));
    expect(counter.snapshot()).toEqual(rotationCountsV1);
    expect(purposes.snapshot().evidenceAdmissionCanonicalTraversals).toBe(1);
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

  it("keeps raw Save bytes identical when an opaque runtime-control wrapper forces fallback", async () => {
    const optimizedCounter = createSnapshotWorkCounterV1();
    const fallbackCounter = createSnapshotWorkCounterV1();
    const optimized = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      instrumentation: optimizedCounter.instrumentation,
    });
    const fallback = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      instrumentation: fallbackCounter.instrumentation,
      wrapRuntimeControlForFallback: true,
    });
    optimizedCounter.reset();
    fallbackCounter.reset();

    try {
      await optimized.commitAndDrain();
      await fallback.commitAndDrain();
      expect(optimizedCounter.snapshot()).toEqual(firstAutoSaveCountsV1);
      expect(fallbackCounter.snapshot()).toEqual(digestFallbackFirstAutoSaveCountsV1);
      expect(await optimized.slotRecord("auto.current")).toEqual(
        await fallback.slotRecord("auto.current"),
      );

      optimizedCounter.reset();
      fallbackCounter.reset();
      await optimized.commitAndDrain();
      await fallback.commitAndDrain();
      expect(optimizedCounter.snapshot()).toEqual(rotationCountsV1);
      expect(fallbackCounter.snapshot()).toEqual(digestFallbackRotationCountsV1);
      expect(await optimized.slotRecord("auto.current")).toEqual(
        await fallback.slotRecord("auto.current"),
      );
      expect(await optimized.slotRecord("auto.previous")).toEqual(
        await fallback.slotRecord("auto.previous"),
      );
    } finally {
      await optimized.dispose();
      await fallback.dispose();
    }
  });

  it("falls back to expected re-encoding for an opaque Save repository wrapper", async () => {
    const optimizedCounter = createSnapshotWorkCounterV1();
    const fallbackCounter = createSnapshotWorkCounterV1();
    const optimized = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      instrumentation: optimizedCounter.instrumentation,
    });
    const fallback = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      instrumentation: fallbackCounter.instrumentation,
      wrapRepositoryForWriteReceiptFallback: true,
    });
    optimizedCounter.reset();
    fallbackCounter.reset();

    try {
      await optimized.commitAndDrain();
      await fallback.commitAndDrain();
      expect(optimizedCounter.snapshot()).toEqual(firstAutoSaveCountsV1);
      expect(fallbackCounter.snapshot()).toEqual(writeReceiptFallbackFirstAutoSaveCountsV1);
      expect(await optimized.slotRecord("auto.current")).toEqual(
        await fallback.slotRecord("auto.current"),
      );

      optimizedCounter.reset();
      fallbackCounter.reset();
      await optimized.commitAndDrain();
      await fallback.commitAndDrain();
      expect(optimizedCounter.snapshot()).toEqual(rotationCountsV1);
      expect(fallbackCounter.snapshot()).toEqual(writeReceiptFallbackRotationCountsV1);
      expect(await optimized.slotRecord("auto.current")).toEqual(
        await fallback.slotRecord("auto.current"),
      );
      expect(await optimized.slotRecord("auto.previous")).toEqual(
        await fallback.slotRecord("auto.previous"),
      );
    } finally {
      await optimized.dispose();
      await fallback.dispose();
    }
  });

  it("keeps the normal save, load, export, import, and rotation transcript byte-identical", async () => {
    const { optimized, fallback } = await createPersistenceEquivalencePairV1();

    try {
      await expectPersistenceEquivalentV1(optimized, fallback);

      expect(canonicalJsonBytes(await optimized.commitAndDrain())).toEqual(
        canonicalJsonBytes(await fallback.commitAndDrain()),
      );
      await expectPersistenceEquivalentV1(optimized, fallback);

      const [optimizedSaved, fallbackSaved] = await Promise.all([
        optimized.saves.save("quick"),
        fallback.saves.save("quick"),
      ]);
      expect(optimizedSaved).toEqual({ kind: "saved", slotId: "quick" });
      expect(fallbackSaved).toEqual(optimizedSaved);
      const optimizedStoredExport = await optimized.saves.exportSave("quick");
      const fallbackStoredExport = await fallback.saves.exportSave("quick");
      expect(optimizedStoredExport).toEqual(fallbackStoredExport);
      expect(optimizedStoredExport).toMatchObject({
        kind: "exported",
        slotId: "quick",
      });
      if (optimizedStoredExport.kind !== "exported") {
        throw new TypeError("expected the optimized Quick Save export");
      }
      expect(optimizedStoredExport.file.digest).toBe(digestBytes(optimizedStoredExport.file.bytes));
      expect(optimizedStoredExport.file.bytes).toEqual(
        (await optimized.slotRecord("quick"))?.bytes,
      );
      await expectPersistenceEquivalentV1(optimized, fallback);

      expect(canonicalJsonBytes(await optimized.commitAndDrain())).toEqual(
        canonicalJsonBytes(await fallback.commitAndDrain()),
      );
      await expectPersistenceEquivalentV1(optimized, fallback);

      const optimizedCurrentExport = await optimized.saves.exportCurrentSave();
      const fallbackCurrentExport = await fallback.saves.exportCurrentSave();
      expect(optimizedCurrentExport).toEqual(fallbackCurrentExport);
      expect(optimizedCurrentExport.digest).toBe(digestBytes(optimizedCurrentExport.bytes));
      await expectPersistenceEquivalentV1(optimized, fallback);

      const [optimizedLoad, fallbackLoad] = await Promise.all([
        optimized.saves.load("quick"),
        fallback.saves.load("quick"),
      ]);
      expect(optimizedLoad).toEqual({
        kind: "loaded",
        compatibility: "exact",
        commandSequence: 1,
      });
      expect(fallbackLoad).toEqual(optimizedLoad);
      await Promise.all([optimized.drain(), fallback.drain()]);
      expect(optimized.snapshot().commandSequence).toBe(1);
      await expectPersistenceEquivalentV1(optimized, fallback);

      const [optimizedImport, fallbackImport] = await Promise.all([
        optimized.saves.importSave(optimizedCurrentExport.bytes),
        fallback.saves.importSave(fallbackCurrentExport.bytes),
      ]);
      expect(optimizedImport).toEqual({
        kind: "imported",
        compatibility: "exact",
        commandSequence: 2,
      });
      expect(fallbackImport).toEqual(optimizedImport);
      await Promise.all([optimized.drain(), fallback.drain()]);
      expect(optimized.snapshot().commandSequence).toBe(2);
      await expectPersistenceEquivalentV1(optimized, fallback);
    } finally {
      await Promise.all([optimized.dispose(), fallback.dispose()]);
    }
  });

  it("keeps a lease-conflicted Quick Save and its retry byte-identical", async () => {
    const optimizedStore = createDelayedSaveStoreV1();
    const fallbackStore = createDelayedSaveStoreV1();
    const { optimized, fallback } = await createPersistenceEquivalencePairV1({
      optimized: optimizedStore.records,
      fallback: fallbackStore.records,
    });

    try {
      optimizedStore.blockNextSaveWrite();
      fallbackStore.blockNextSaveWrite();
      const optimizedFirstSave = optimized.saves.save("quick");
      const fallbackFirstSave = fallback.saves.save("quick");
      await Promise.all([
        optimizedStore.waitUntilWriteStarts(),
        fallbackStore.waitUntilWriteStarts(),
      ]);

      const [optimizedRelease, fallbackRelease] = await Promise.all([
        optimized.saves.lease.release(),
        fallback.saves.lease.release(),
      ]);
      expect(optimizedRelease).toEqual(fallbackRelease);
      const [optimizedTakeover, fallbackTakeover] = await Promise.all([
        optimized.saves.lease.takeOver(),
        fallback.saves.lease.takeOver(),
      ]);
      expect(optimizedTakeover).toEqual(fallbackTakeover);

      optimizedStore.releaseWrites();
      fallbackStore.releaseWrites();
      await expect(optimizedFirstSave).resolves.toEqual({
        kind: "rejected",
        code: "conflict",
      });
      await expect(fallbackFirstSave).resolves.toEqual({
        kind: "rejected",
        code: "conflict",
      });
      await expectPersistenceEquivalentV1(optimized, fallback);

      const [optimizedRetry, fallbackRetry] = await Promise.all([
        optimized.saves.save("quick"),
        fallback.saves.save("quick"),
      ]);
      expect(optimizedRetry).toEqual({ kind: "saved", slotId: "quick" });
      expect(fallbackRetry).toEqual(optimizedRetry);
      expect(await optimized.slotRecord("quick")).toEqual(await fallback.slotRecord("quick"));
      await expectPersistenceEquivalentV1(optimized, fallback);
    } finally {
      optimizedStore.releaseWrites();
      fallbackStore.releaseWrites();
      await Promise.all([optimized.dispose(), fallback.dispose()]);
    }
  });

  it("rejects semantic physical-byte tampering identically with and without write receipts", async () => {
    const { optimized, fallback } = await createPersistenceEquivalencePairV1({
      optimized: createSemanticallyTamperingStoreV1(),
      fallback: createSemanticallyTamperingStoreV1(),
    });

    try {
      await expect(optimized.saves.save("quick")).resolves.toEqual({
        kind: "rejected",
        code: "conflict",
      });
      await expect(fallback.saves.save("quick")).resolves.toEqual({
        kind: "rejected",
        code: "conflict",
      });
      await expect(optimized.saves.getStatus()).resolves.toMatchObject({
        safelySavedCommandSequence: null,
        lastFailureCode: "conflict",
      });
      await expect(fallback.saves.getStatus()).resolves.toMatchObject({
        safelySavedCommandSequence: null,
        lastFailureCode: "conflict",
      });

      const optimizedStoredExport = await optimized.saves.exportSave("quick");
      const fallbackStoredExport = await fallback.saves.exportSave("quick");
      expect(optimizedStoredExport).toEqual(fallbackStoredExport);
      expect(optimizedStoredExport).toMatchObject({
        kind: "exported",
        slotId: "quick",
      });
      const optimizedObserved = await optimized.slotRecord("quick");
      const optimizedRaw = (await optimized.rawSaveRecords())[0];
      expect(optimizedObserved?.bytes).not.toEqual(optimizedRaw?.bytes);
      await expectPersistenceEquivalentV1(optimized, fallback);
    } finally {
      await Promise.all([optimized.dispose(), fallback.dispose()]);
    }
  });

  it("preserves both authoritative sessions after the same corrupt Quick Save", async () => {
    const optimizedRecords = createMemoryHostRecordStoreV1();
    const fallbackRecords = createMemoryHostRecordStoreV1();
    const { optimized, fallback } = await createPersistenceEquivalencePairV1({
      optimized: optimizedRecords,
      fallback: fallbackRecords,
    });

    try {
      const [optimizedSaved, fallbackSaved] = await Promise.all([
        optimized.saves.save("quick"),
        fallback.saves.save("quick"),
      ]);
      expect(optimizedSaved).toEqual({ kind: "saved", slotId: "quick" });
      expect(fallbackSaved).toEqual(optimizedSaved);
      const optimizedSnapshot = optimized.snapshot();
      const fallbackSnapshot = fallback.snapshot();
      const optimizedCommandLog = optimized.commandLog();
      const fallbackCommandLog = fallback.commandLog();
      const optimizedReplayBase = optimized.replayBase();
      const fallbackReplayBase = fallback.replayBase();

      await Promise.all([
        corruptQuickSaveV1(optimizedRecords),
        corruptQuickSaveV1(fallbackRecords),
      ]);
      await expectPersistenceEquivalentV1(optimized, fallback);
      const corruptedRecords = await optimized.rawSaveRecords();
      await expect(optimized.saves.load("quick")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_record",
      });
      await expect(fallback.saves.load("quick")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_record",
      });

      expect(optimized.snapshot()).toBe(optimizedSnapshot);
      expect(fallback.snapshot()).toBe(fallbackSnapshot);
      expect(optimized.commandLog()).toBe(optimizedCommandLog);
      expect(fallback.commandLog()).toBe(fallbackCommandLog);
      expect(optimized.replayBase()).toBe(optimizedReplayBase);
      expect(fallback.replayBase()).toBe(fallbackReplayBase);
      expect(await optimized.rawSaveRecords()).toEqual(corruptedRecords);
      await expectPersistenceEquivalentV1(optimized, fallback);
    } finally {
      await Promise.all([optimized.dispose(), fallback.dispose()]);
    }
  });
});
