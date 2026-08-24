// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type { SaveSlotIdV1 } from "../contracts/application.ts";
import type {
  HostAtomicRecordStoreV1,
  HostRecordRevisionV1,
  IsoUtcInstant,
} from "../contracts/host.ts";
import { createMemoryHostRecordStoreV1 } from "../contracts/host.ts";
import type { VersionStampV1 } from "../contracts/version-stamp.ts";
import type { DeepReadonly } from "../contracts/values.ts";
import { createSaveSlotRecordKeyV1 } from "../runtime/persistence/slot-keys.ts";
import {
  evaluateSaveMetadataCompactVectorsV1,
  saveMetadataCompactExpectedV1,
} from "./save-metadata-corpus.ts";
import { createSnapshotPersistenceWorkloadV1 } from "./snapshot-persistence-workload.ts";
import type { SnapshotTransactionStateV1 } from "./snapshot-transaction-workload.ts";
import { snapshotTransactionProvenanceV1 } from "./snapshot-transaction-workload.ts";

const textDecoderV1 = new TextDecoder();
const fixedClockV1 = {
  now: () => "2026-07-20T00:00:00.000Z" as IsoUtcInstant,
};

interface StoredSaveV1 {
  readonly revision: HostRecordRevisionV1;
  readonly bytes: Uint8Array;
  readonly value: Record<string, unknown>;
}

async function storedSaveV1(
  records: HostAtomicRecordStoreV1,
  slotId: SaveSlotIdV1,
): Promise<StoredSaveV1> {
  const stored = await records.read(
    "save",
    createSaveSlotRecordKeyV1(snapshotTransactionProvenanceV1.story.id, slotId),
  );
  if (stored === null) throw new TypeError(`missing stored Save ${slotId}`);
  return ({
    revision: stored.revision,
    bytes: Uint8Array.from(stored.bytes),
    value: JSON.parse(textDecoderV1.decode(stored.bytes)) as Record<string, unknown>,
  });
}

function annotationV1(value: Record<string, unknown>): unknown {
  return value.annotation ?? null;
}

function versionStampV1(value: Record<string, unknown>): unknown {
  return value.versionStamp ?? null;
}

type SummaryInputV1 = "absent" | "null" | "empty" | "valid";
type NoteEditV1 = "none" | "set" | "set_then_clear";

interface MetadataLifecycleCaseV1 {
  readonly id: string;
  readonly summary: SummaryInputV1;
  readonly note: NoteEditV1;
  readonly stampInput?: VersionStampV1;
  readonly expectedStamp: VersionStampV1 | null;
}

const allNullStampV1 = ({
  applicationVersion: null,
  applicationCommit: null,
  engineVersion: null,
  engineCommit: null,
}) satisfies VersionStampV1;

const metadataLifecycleCasesV1: readonly MetadataLifecycleCaseV1[] = [
  {
    id: "absent",
    summary: "absent",
    note: "none",
    expectedStamp: null,
  },
  {
    id: "projector_null",
    summary: "null",
    note: "none",
    expectedStamp: null,
  },
  {
    id: "projector_empty",
    summary: "empty",
    note: "none",
    expectedStamp: null,
  },
  {
    id: "summary_only",
    summary: "valid",
    note: "none",
    expectedStamp: null,
  },
  {
    id: "note_only",
    summary: "absent",
    note: "set",
    expectedStamp: null,
  },
  {
    id: "summary_and_note",
    summary: "valid",
    note: "set",
    expectedStamp: null,
  },
  {
    id: "note_clear_removes_annotation",
    summary: "absent",
    note: "set_then_clear",
    expectedStamp: null,
  },
  {
    id: "note_clear_keeps_summary",
    summary: "valid",
    note: "set_then_clear",
    expectedStamp: null,
  },
  {
    id: "all_null_stamp",
    summary: "absent",
    note: "none",
    stampInput: allNullStampV1,
    expectedStamp: null,
  },
  {
    id: "partial_stamp",
    summary: "absent",
    note: "none",
    stampInput: saveMetadataCompactExpectedV1.versionStamps.partial,
    expectedStamp: saveMetadataCompactExpectedV1.versionStamps.partial,
  },
  {
    id: "full_clean_stamp",
    summary: "absent",
    note: "none",
    stampInput: saveMetadataCompactExpectedV1.versionStamps.fullClean,
    expectedStamp: saveMetadataCompactExpectedV1.versionStamps.fullClean,
  },
  {
    id: "full_dirty_stamp",
    summary: "absent",
    note: "none",
    stampInput: saveMetadataCompactExpectedV1.versionStamps.fullDirty,
    expectedStamp: saveMetadataCompactExpectedV1.versionStamps.fullDirty,
  },
  {
    id: "status_unavailable_stamp",
    summary: "absent",
    note: "none",
    stampInput: saveMetadataCompactExpectedV1.versionStamps.statusUnavailable,
    expectedStamp: saveMetadataCompactExpectedV1.versionStamps.statusUnavailable,
  },
  {
    id: "summary_note_full_dirty_stamp",
    summary: "valid",
    note: "set",
    stampInput: saveMetadataCompactExpectedV1.versionStamps.fullDirty,
    expectedStamp: saveMetadataCompactExpectedV1.versionStamps.fullDirty,
  },
];

function expectedAnnotationV1(testCase: MetadataLifecycleCaseV1): unknown {
  const summary = testCase.summary === "valid" ? ["Checkpoint 7", "Neutral scene"] : null;
  const note = testCase.note === "set" ? "player checkpoint" : null;
  return summary === null && note === null ? null : { summary, note };
}

function summaryProjectorV1(
  kind: SummaryInputV1,
  onCall: () => void,
): (() => readonly string[] | null) | undefined {
  if (kind === "absent") return undefined;
  return () => {
    onCall();
    if (kind === "null") return null;
    if (kind === "empty") return [];
    return ["Checkpoint 7", "Neutral scene"];
  };
}

function bytesArrayV1(bytes: Uint8Array): readonly number[] {
  return [...bytes];
}

function bytesFromBase64V1(encoded: string): Uint8Array {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function createCommitThenThrowStoreV1(
  failureKind: "unavailable" | "unexpected",
): {
  readonly records: HostAtomicRecordStoreV1;
  readonly memory: HostAtomicRecordStoreV1;
  armFailure(): void;
} {
  const memory = createMemoryHostRecordStoreV1();
  let failNextSaveCommit = false;
  const records: HostAtomicRecordStoreV1 = {
    read: memory.read,
    list: memory.list,
    async commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
      const result = await memory.commit(mutations);
      if (
        failNextSaveCommit &&
        result.kind === "committed" &&
        mutations.some(({ namespace }) => namespace === "save")
      ) {
        failNextSaveCommit = false;
        const error = new Error("synthetic post-commit failure");
        if (failureKind === "unavailable") {
          Object.assign(error, {
            name: "IndexedDbRecordStoreFailureV1",
            code: "indexeddb.request_failed",
            operation: "commit",
          });
        }
        throw error;
      }
      return result;
    },
  };
  return ({
    records,
    memory,
    armFailure() {
      if (failNextSaveCommit) throw new TypeError("post-commit failure is already armed");
      failNextSaveCommit = true;
    },
  });
}

describe("shared Save metadata lifecycle", () => {
  it("round-trips every valid metadata variant without recapturing metadata", async () => {
    const bytesByCase = new Map<string, readonly number[]>();
    const stateDigests = new Set<string>();

    for (const testCase of metadataLifecycleCasesV1) {
      const records = createMemoryHostRecordStoreV1();
      let summaryCalls = 0;
      let collectorCalls = 0;
      const summarizeSave = summaryProjectorV1(testCase.summary, () => {
        summaryCalls += 1;
      });
      const workload = await createSnapshotPersistenceWorkloadV1({
        entityCount: 100,
        records,
        metadataClock: fixedClockV1,
        ...(summarizeSave === undefined ? {} : { summarizeSave }),
        ...(testCase.stampInput === undefined ? {} : {
          collectVersionStamp: () => {
            collectorCalls += 1;
            return { ...testCase.stampInput! };
          },
        }),
      });

      try {
        await expect(workload.saves.save("quick"), testCase.id).resolves.toEqual({
          kind: "saved",
          slotId: "quick",
        });
        if (testCase.note !== "none") {
          await expect(
            workload.saves.annotateSave("quick", " player checkpoint "),
            testCase.id,
          ).resolves.toEqual({ kind: "saved", slotId: "quick" });
        }
        if (testCase.note === "set_then_clear") {
          await expect(workload.saves.annotateSave("quick", "  "), testCase.id).resolves.toEqual({
            kind: "saved",
            slotId: "quick",
          });
        }

        const stored = await storedSaveV1(records, "quick");
        bytesByCase.set(testCase.id, bytesArrayV1(stored.bytes));
        stateDigests.add(String(stored.value.stateDigest));
        expect(annotationV1(stored.value), testCase.id).toEqual(expectedAnnotationV1(testCase));
        expect(versionStampV1(stored.value), testCase.id).toEqual(testCase.expectedStamp);
        expect(stored.value.recordRevision, testCase.id).toBe(stored.revision);

        const summaries = await workload.saves.listSlots();
        const quickSummary = summaries.find(({ slotId }) => slotId === "quick");
        expect(quickSummary, testCase.id).toBeDefined();
        if (quickSummary === undefined) throw new TypeError("missing listed Quick Save");
        expect(quickSummary.annotation, testCase.id).toEqual(expectedAnnotationV1(testCase));
        const exported = await workload.saves.exportSave("quick");
        expect(exported.kind, testCase.id).toBe("exported");
        if (exported.kind !== "exported") throw new TypeError("expected stored export");
        expect(exported.file.bytes, testCase.id).toEqual(stored.bytes);
        expect(exported.file.filename, testCase.id).toBe(
          "snapshot-persistence-workload-20260720000000.json",
        );
        await expect(workload.saves.load("quick"), testCase.id).resolves.toMatchObject({
          kind: "loaded",
          compatibility: "exact",
        });
        await expect(workload.saves.lease.getStatus(), testCase.id).resolves.toMatchObject({
          kind: "owned",
        });

        const imported = await createSnapshotPersistenceWorkloadV1({
          entityCount: 100,
          metadataClock: fixedClockV1,
        });
        try {
          await expect(imported.saves.importSave(stored.bytes), testCase.id).resolves.toMatchObject(
            {
              kind: "imported",
              compatibility: "exact",
            },
          );
        } finally {
          await imported.dispose();
        }

        expect(summaryCalls, testCase.id).toBe(testCase.summary === "absent" ? 0 : 1);
        expect(collectorCalls, testCase.id).toBe(testCase.stampInput === undefined ? 0 : 1);
      } finally {
        await workload.dispose();
      }
    }

    expect(stateDigests.size).toBe(1);
    expect(bytesByCase.get("projector_null")).toEqual(bytesByCase.get("absent"));
    expect(bytesByCase.get("projector_empty")).toEqual(bytesByCase.get("absent"));
    expect(bytesByCase.get("all_null_stamp")).toEqual(bytesByCase.get("absent"));
    expect(bytesByCase.get("summary_only")).not.toEqual(bytesByCase.get("absent"));
    expect(bytesByCase.get("partial_stamp")).not.toEqual(bytesByCase.get("absent"));
  });

  it("keeps receipt and opaque fallback bytes equal across capture, rewrite, and rotation", async () => {
    const optimizedRecords = createMemoryHostRecordStoreV1();
    const fallbackRecords = createMemoryHostRecordStoreV1();
    const sourceStamp = { ...saveMetadataCompactExpectedV1.versionStamps.fullDirty };
    let optimizedSummaryCalls = 0;
    let fallbackSummaryCalls = 0;
    let optimizedCollectorCalls = 0;
    let fallbackCollectorCalls = 0;
    const summarize = (onCall: () => void) => (state: DeepReadonly<SnapshotTransactionStateV1>) => {
      onCall();
      return [`Commit ${String(state.simulation.audit.crossOwnerCommitCount)}`];
    };
    const optimized = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      records: optimizedRecords,
      metadataClock: fixedClockV1,
      summarizeSave: summarize(() => {
        optimizedSummaryCalls += 1;
      }),
      collectVersionStamp: () => {
        optimizedCollectorCalls += 1;
        return sourceStamp;
      },
    });
    const fallback = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      records: fallbackRecords,
      metadataClock: fixedClockV1,
      wrapRepositoryForWriteReceiptFallback: true,
      summarizeSave: summarize(() => {
        fallbackSummaryCalls += 1;
      }),
      collectVersionStamp: () => {
        fallbackCollectorCalls += 1;
        return sourceStamp;
      },
    });
    sourceStamp.applicationVersion = "mutated after service construction";

    try {
      for (const workload of [optimized, fallback]) {
        await expect(workload.saves.save("quick")).resolves.toEqual({
          kind: "saved",
          slotId: "quick",
        });
        await expect(workload.saves.annotateSave("quick", "player checkpoint")).resolves.toEqual({
          kind: "saved",
          slotId: "quick",
        });
        await workload.commitAndDrain();
        await workload.commitAndDrain();
      }

      expect(await optimized.rawSaveRecords()).toEqual(await fallback.rawSaveRecords());
      expect(optimizedSummaryCalls).toBe(3);
      expect(fallbackSummaryCalls).toBe(3);
      expect(optimizedCollectorCalls).toBe(1);
      expect(fallbackCollectorCalls).toBe(1);

      const quick = await storedSaveV1(optimizedRecords, "quick");
      const current = await storedSaveV1(optimizedRecords, "auto.current");
      const previous = await storedSaveV1(optimizedRecords, "auto.previous");
      expect(annotationV1(quick.value)).toEqual({
        summary: ["Commit 0"],
        note: "player checkpoint",
      });
      expect(annotationV1(current.value)).toEqual({ summary: ["Commit 2"], note: null });
      expect(annotationV1(previous.value)).toEqual({ summary: ["Commit 1"], note: null });
      for (const stored of [quick, current, previous]) {
        expect(versionStampV1(stored.value)).toEqual(
          saveMetadataCompactExpectedV1.versionStamps.fullDirty,
        );
      }

      await Promise.all([
        optimized.saves.listSlots(),
        fallback.saves.listSlots(),
        optimized.saves.exportSave("quick"),
        fallback.saves.exportSave("quick"),
      ]);
      expect(optimizedSummaryCalls).toBe(3);
      expect(fallbackSummaryCalls).toBe(3);
      expect(optimizedCollectorCalls).toBe(1);
      expect(fallbackCollectorCalls).toBe(1);
    } finally {
      await optimized.dispose();
      await fallback.dispose();
    }
  });

  it("rewrites only record revision and normalized annotation bytes", async () => {
    const records = createMemoryHostRecordStoreV1();
    const workload = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      records,
      metadataClock: fixedClockV1,
      summarizeSave: () => ["Checkpoint 7", "Neutral scene"],
      collectVersionStamp: () => saveMetadataCompactExpectedV1.versionStamps.fullDirty,
    });
    try {
      await workload.saves.save("quick");
      const captured = await storedSaveV1(records, "quick");
      await workload.saves.annotateSave("quick", " player checkpoint ");
      const annotated = await storedSaveV1(records, "quick");
      await workload.saves.annotateSave("quick", "  ");
      const cleared = await storedSaveV1(records, "quick");

      const stableFields = (value: Record<string, unknown>) => {
        const { annotation: _annotation, recordRevision: _recordRevision, ...stable } = value;
        return stable;
      };
      expect(stableFields(annotated.value)).toEqual(stableFields(captured.value));
      expect(stableFields(cleared.value)).toEqual(stableFields(captured.value));
      expect(captured.value.annotation).toEqual({
        summary: ["Checkpoint 7", "Neutral scene"],
        note: null,
      });
      expect(annotated.value.annotation).toEqual({
        summary: ["Checkpoint 7", "Neutral scene"],
        note: "player checkpoint",
      });
      expect(cleared.value.annotation).toEqual(captured.value.annotation);
      expect([captured.revision, annotated.revision, cleared.revision]).toEqual([1, 2, 3]);

      const independentClearedBytes = new TextEncoder().encode(
        JSON.stringify({ ...captured.value, recordRevision: 3 }),
      );
      expect(cleared.bytes).toEqual(independentClearedBytes);
    } finally {
      await workload.dispose();
    }
  });

  it("fails malformed or throwing stamp collectors closed once for the whole service", async () => {
    const baselineRecords = createMemoryHostRecordStoreV1();
    const baseline = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      records: baselineRecords,
      metadataClock: fixedClockV1,
    });
    await baseline.saves.save("quick");
    const baselineQuick = await storedSaveV1(baselineRecords, "quick");
    await baseline.dispose();

    const cases = [
      {
        id: "malformed",
        collect: () => ({
          applicationVersion: 1,
          applicationCommit: "x".repeat(129),
          engineVersion: "bad\u0007value",
          engineCommit: undefined,
        } as unknown as VersionStampV1),
      },
      {
        id: "throw",
        collect: (): VersionStampV1 => {
          throw new Error("synthetic collector failure");
        },
      },
    ] as const;

    for (const testCase of cases) {
      const records = createMemoryHostRecordStoreV1();
      let collectorCalls = 0;
      const workload = await createSnapshotPersistenceWorkloadV1({
        entityCount: 100,
        records,
        metadataClock: fixedClockV1,
        collectVersionStamp: () => {
          collectorCalls += 1;
          return testCase.collect();
        },
      });
      try {
        await expect(workload.saves.lease.getStatus(), testCase.id).resolves.toMatchObject({
          kind: "owned",
        });
        await expect(workload.saves.save("quick"), testCase.id).resolves.toMatchObject({
          kind: "saved",
        });
        const stored = await storedSaveV1(records, "quick");
        expect(stored.bytes, testCase.id).toEqual(baselineQuick.bytes);
        expect(versionStampV1(stored.value), testCase.id).toBeNull();

        await workload.saves.annotateSave("quick", "note");
        await workload.saves.annotateSave("quick", "");
        await workload.saves.exportSave("quick");
        await workload.saves.exportCurrentSave();
        await workload.commitAndDrain();
        await workload.commitAndDrain();
        expect(collectorCalls, testCase.id).toBe(1);
      } finally {
        await workload.dispose();
      }
    }
  });

  it("fails every summary capture surface before any physical Save write", async () => {
    const records = createMemoryHostRecordStoreV1();
    const projectedFailure = new Error("synthetic summary projection failure");
    let summaryCalls = 0;
    const workload = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      records,
      metadataClock: fixedClockV1,
      summarizeSave: () => {
        summaryCalls += 1;
        throw projectedFailure;
      },
    });
    try {
      await expect(workload.saves.save("quick")).resolves.toEqual({
        kind: "faulted",
        code: "persistence.capture_failed",
      });
      await expect(workload.saves.exportCurrentSave()).rejects.toThrow(
        "failed to export current Save",
      );
      const dispatch = await workload.commitAndDrain();
      expect(dispatch).toMatchObject({
        kind: "executed",
        execution: { kind: "committed" },
      });
      expect(await workload.rawSaveRecords()).toEqual([]);
      expect(summaryCalls).toBe(3);
    } finally {
      await workload.dispose();
    }
  });

  it.each(["load", "import"] as const)(
    "uses current-service metadata for the first fresh capture after %s",
    async (operation) => {
      const sourceRecords = createMemoryHostRecordStoreV1();
      const source = await createSnapshotPersistenceWorkloadV1({
        entityCount: 100,
        records: sourceRecords,
        metadataClock: fixedClockV1,
        summarizeSave: () => ["source summary"],
        collectVersionStamp: () => saveMetadataCompactExpectedV1.versionStamps.fullClean,
      });
      try {
        await source.saves.save("quick");
        await source.saves.annotateSave("quick", "source note");
        const storedSource = await storedSaveV1(sourceRecords, "quick");
        const targetRecords = createMemoryHostRecordStoreV1();
        if (operation === "load") {
          const key = createSaveSlotRecordKeyV1(
            snapshotTransactionProvenanceV1.story.id,
            "quick",
          );
          let expectedRevision: HostRecordRevisionV1 | null = null;
          for (let revision = 1; revision <= Number(storedSource.revision); revision += 1) {
            const seeded = await targetRecords.commit([
              {
                kind: "put" as const,
                namespace: "save",
                key,
                expectedRevision,
                bytes: storedSource.bytes,
              },
            ]);
            if (seeded.kind !== "committed") throw new TypeError("failed to seed load record");
            const written = seeded.records.find((record) => record.key === key);
            if (written === undefined) throw new TypeError("missing seeded load record");
            expectedRevision = written.revision;
          }
        }

        let summaryCalls = 0;
        let collectorCalls = 0;
        const target = await createSnapshotPersistenceWorkloadV1({
          entityCount: 100,
          records: targetRecords,
          metadataClock: fixedClockV1,
          summarizeSave: () => {
            summaryCalls += 1;
            return ["target summary"];
          },
          collectVersionStamp: () => {
            collectorCalls += 1;
            return saveMetadataCompactExpectedV1.versionStamps.fullDirty;
          },
        });
        try {
          const replacement = operation === "load"
            ? target.saves.load("quick")
            : target.saves.importSave(storedSource.bytes);
          await expect(replacement).resolves.toMatchObject({
            kind: operation === "load" ? "loaded" : "imported",
            compatibility: "exact",
          });
          expect(summaryCalls).toBe(0);
          expect(collectorCalls).toBe(1);

          const fresh = await target.saves.exportCurrentSave();
          const freshValue = JSON.parse(textDecoderV1.decode(fresh.bytes)) as Record<
            string,
            unknown
          >;
          expect(annotationV1(freshValue)).toEqual({ summary: ["target summary"], note: null });
          expect(versionStampV1(freshValue)).toEqual(
            saveMetadataCompactExpectedV1.versionStamps.fullDirty,
          );
          expect(summaryCalls).toBe(1);
          expect(collectorCalls).toBe(1);
        } finally {
          await target.dispose();
        }
      } finally {
        await source.dispose();
      }
    },
  );

  it("dates stored exports independently from their unchanged payload", async () => {
    const records = createMemoryHostRecordStoreV1();
    let now = "2026-07-20T00:00:00.000Z" as IsoUtcInstant;
    const workload = await createSnapshotPersistenceWorkloadV1({
      entityCount: 100,
      records,
      metadataClock: { now: () => now },
      exportFilename: "neutral-save.json",
      summarizeSave: () => ["Checkpoint 7", "Neutral scene"],
      collectVersionStamp: () => saveMetadataCompactExpectedV1.versionStamps.partial,
    });
    try {
      await workload.saves.save("quick");
      const stored = await storedSaveV1(records, "quick");
      now = "2026-08-01T09:10:11.999Z" as IsoUtcInstant;
      const first = await workload.saves.exportSave("quick");
      now = "2026-08-01T09:10:12.000Z" as IsoUtcInstant;
      const second = await workload.saves.exportSave("quick");
      if (first.kind !== "exported" || second.kind !== "exported") {
        throw new TypeError("expected stored Save exports");
      }
      expect(first.file.filename).toBe("neutral-save-20260801091011.json");
      expect(second.file.filename).toBe("neutral-save-20260801091012.json");
      expect(first.file.bytes).toEqual(stored.bytes);
      expect(second.file.bytes).toEqual(stored.bytes);
      expect(first.file.digest).toBe(second.file.digest);
    } finally {
      await workload.dispose();
    }
  });

  it.each(["unavailable", "unexpected"] as const)(
    "characterizes a %s Host failure after every valid metadata commit",
    async (failureKind) => {
      for (const testCase of metadataLifecycleCasesV1) {
        const optimizedStore = createCommitThenThrowStoreV1(failureKind);
        const fallbackStore = createCommitThenThrowStoreV1(failureKind);
        let optimizedSummaryCalls = 0;
        let fallbackSummaryCalls = 0;
        let optimizedCollectorCalls = 0;
        let fallbackCollectorCalls = 0;
        const make = (
          records: HostAtomicRecordStoreV1,
          fallback: boolean,
          onSummary: () => void,
          onCollect: () => void,
        ) => {
          const summarizeSave = summaryProjectorV1(testCase.summary, onSummary);
          return createSnapshotPersistenceWorkloadV1({
            entityCount: 100,
            records,
            metadataClock: fixedClockV1,
            wrapRepositoryForWriteReceiptFallback: fallback,
            ...(summarizeSave === undefined ? {} : { summarizeSave }),
            ...(testCase.stampInput === undefined ? {} : {
              collectVersionStamp: () => {
                onCollect();
                return { ...testCase.stampInput! };
              },
            }),
          });
        };
        const optimized = await make(
          optimizedStore.records,
          false,
          () => {
            optimizedSummaryCalls += 1;
          },
          () => {
            optimizedCollectorCalls += 1;
          },
        );
        const fallback = await make(
          fallbackStore.records,
          true,
          () => {
            fallbackSummaryCalls += 1;
          },
          () => {
            fallbackCollectorCalls += 1;
          },
        );
        const stageBeforeFailure = async (
          workload: Awaited<ReturnType<typeof createSnapshotPersistenceWorkloadV1>>,
        ): Promise<void> => {
          if (testCase.note === "none") return;
          await expect(workload.saves.save("quick"), testCase.id).resolves.toEqual({
            kind: "saved",
            slotId: "quick",
          });
          if (testCase.note === "set_then_clear") {
            await expect(
              workload.saves.annotateSave("quick", "player checkpoint"),
              testCase.id,
            ).resolves.toEqual({ kind: "saved", slotId: "quick" });
          }
        };
        const finalOperation = (
          workload: Awaited<ReturnType<typeof createSnapshotPersistenceWorkloadV1>>,
        ) => {
          if (testCase.note === "none") return workload.saves.save("quick");
          return workload.saves.annotateSave(
            "quick",
            testCase.note === "set" ? "player checkpoint" : "",
          );
        };

        try {
          await stageBeforeFailure(optimized);
          await stageBeforeFailure(fallback);
          optimizedStore.armFailure();
          fallbackStore.armFailure();

          const expectedFailure = failureKind === "unavailable"
            ? { kind: "rejected", code: "unavailable" }
            : { kind: "faulted", code: "persistence.unexpected" };
          await expect(finalOperation(optimized), testCase.id).resolves.toEqual(expectedFailure);
          await expect(finalOperation(fallback), testCase.id).resolves.toEqual(expectedFailure);
          expect(await optimized.rawSaveRecords()).toEqual(await fallback.rawSaveRecords());
          const committedAfterFailure = await storedSaveV1(optimizedStore.memory, "quick");
          const failedRevision = testCase.note === "none" ? 1 : testCase.note === "set" ? 2 : 3;
          expect(committedAfterFailure.revision, testCase.id).toBe(failedRevision);
          expect(committedAfterFailure.value.recordRevision, testCase.id).toBe(failedRevision);
          expect(annotationV1(committedAfterFailure.value), testCase.id).toEqual(
            expectedAnnotationV1(testCase),
          );
          expect(versionStampV1(committedAfterFailure.value), testCase.id).toEqual(
            testCase.expectedStamp,
          );
          await expect(optimized.saves.getStatus()).resolves.toMatchObject({
            safelySavedCommandSequence: testCase.note === "none" ? null : 0,
            lastFailureCode: failureKind === "unavailable"
              ? "unavailable"
              : "persistence.unexpected",
          });

          await expect(finalOperation(optimized), testCase.id).resolves.toEqual({
            kind: "saved",
            slotId: "quick",
          });
          await expect(finalOperation(fallback), testCase.id).resolves.toEqual({
            kind: "saved",
            slotId: "quick",
          });
          expect(await optimized.rawSaveRecords()).toEqual(await fallback.rawSaveRecords());
          const committedAfterRetry = await storedSaveV1(optimizedStore.memory, "quick");
          expect(committedAfterRetry.revision, testCase.id).toBe(failedRevision + 1);
          expect(committedAfterRetry.value.recordRevision, testCase.id).toBe(failedRevision + 1);
          const expectedSummaryCalls = testCase.summary === "absent"
            ? 0
            : testCase.note === "none"
            ? 2
            : 1;
          expect(optimizedSummaryCalls, testCase.id).toBe(expectedSummaryCalls);
          expect(fallbackSummaryCalls, testCase.id).toBe(expectedSummaryCalls);
          const expectedCollectorCalls = testCase.stampInput === undefined ? 0 : 1;
          expect(optimizedCollectorCalls, testCase.id).toBe(expectedCollectorCalls);
          expect(fallbackCollectorCalls, testCase.id).toBe(expectedCollectorCalls);
          await expect(optimized.saves.getStatus()).resolves.toMatchObject({
            safelySavedCommandSequence: 0,
            lastFailureCode: null,
          });
        } finally {
          await optimized.dispose();
          await fallback.dispose();
        }
      }
    },
  );

  it("keeps compact metadata outside Snapshot identity", () => {
    const corpus = evaluateSaveMetadataCompactVectorsV1();
    const recordStateDigests = Object.values(corpus.records).map(({ bytesBase64 }) => {
      const record = JSON.parse(textDecoderV1.decode(bytesFromBase64V1(bytesBase64))) as Record<
        string,
        unknown
      >;
      return record.stateDigest;
    });
    expect(new Set(recordStateDigests)).toEqual(
      new Set([saveMetadataCompactExpectedV1.stateDigest]),
    );
  });
});
