// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";

import type {
  LeaseHandoffRequestId,
  SaveSlotIdV1,
  SessionLeaseOwnerId,
} from "../../contracts/application.ts";
import { canonicalJsonBytes } from "../../contracts/canonical-json.ts";
import { digestBytes, digestCanonical } from "../../contracts/digest.ts";
import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  IsoUtcInstant,
} from "../../contracts/host.ts";
import { createMemoryHostRecordStoreV1 } from "../../contracts/host.ts";
import type { PatchSetAdoptionDeclarationV1 } from "../../contracts/hotfix.ts";
import type { BuildProvenanceV1 } from "../../contracts/provenance.ts";
import {
  defineSaveStateMigrationRegistryV1,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
  parseSaveStateMigrationReasonCodeV1,
} from "../../contracts/save-state-migration.ts";
import type {
  SaveStateContractIdentityV1,
  SaveStateMigrationRegistryV1,
  SaveStateMigrationStepV1,
} from "../../contracts/save-state-migration.ts";
import { createSaveRecordEnvelopeSchemaV1, saveJsonLimitsV1 } from "../../contracts/persistence.ts";
import type {
  SaveCodecContextV1,
  SaveCompatibilityClassificationV1,
  SaveImportValidationContextV1,
  SaveInspectionResultV1,
  SaveRecordEnvelopeV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.ts";
import type { DeepReadonly, Digest, RuntimeSchemaV1 } from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.ts";
import { createSaveMetadataHostPayloadV1 } from "../../testkit/save-metadata-corpus.ts";
import {
  persistenceUtcAcceptedCorpusV1,
  persistenceUtcRejectedCorpusV1,
} from "../../testkit/persistence-utc-vectors.ts";
import type { SnapshotTransactionStateV1 } from "../../testkit/snapshot-transaction-workload.ts";
import {
  createSnapshotTransactionInitialSnapshotV1,
  createSnapshotTransactionWorkloadV1,
  snapshotTransactionProvenanceV1,
  snapshotTransactionSnapshotSchemaV1,
} from "../../testkit/snapshot-transaction-workload.ts";
import { validateSaveImportCandidateV1 } from "./compatibility.ts";
import { decodeSaveRecordV1, encodeSaveRecordV1 } from "./save-codec.ts";
import {
  createInstrumentedPersistenceServiceV1,
  importWithReplacementCommitInternalV1,
  loadWithReplacementCommitInternalV1,
} from "./persistence-service.ts";
import { replayAuthoritativelyFromAttemptsInternalV1 } from "../diagnostics/replay.ts";
import type {
  AuthoritativeOutcomeV1,
  GameSessionRuntimeControlV1,
} from "../session/game-session.ts";
import { readInstalledSaveStateMigrationReceiptInternalV1 } from "../session/game-session.ts";
import type { SaveRepositorySlotMetadataV1 } from "./save-repository.ts";
import { createSaveSlotRecordKeyV1 } from "./slot-keys.ts";

type NeutralSnapshotV1 = ReturnType<typeof createSnapshotTransactionInitialSnapshotV1>;
type NeutralSaveRecordV1 = SaveRecordEnvelopeV1<
  NeutralSnapshotV1,
  BuildProvenanceV1,
  SaveRepositorySlotMetadataV1,
  readonly SimulationAdoptionV1[]
>;

const textEncoderV1 = new TextEncoder();
const textDecoderV1 = new TextDecoder();
const fixedInstantV1 = "2026-07-30T00:00:00.000Z" as IsoUtcInstant;

const passthroughProvenanceSchemaV1: RuntimeSchemaV1<BuildProvenanceV1> = Object.freeze({
  parse: (value: unknown) => value as BuildProvenanceV1,
});
const passthroughSlotSchemaV1: RuntimeSchemaV1<SaveRepositorySlotMetadataV1> = Object.freeze({
  parse: (value: unknown) => value as SaveRepositorySlotMetadataV1,
});
const passthroughLineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown) {
    if (!Array.isArray(value)) throw new TypeError("invalid neutral Save lineage");
    return value as readonly SimulationAdoptionV1[];
  },
});
const neutralRecordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  snapshotTransactionSnapshotSchemaV1,
  passthroughProvenanceSchemaV1,
  passthroughSlotSchemaV1,
  passthroughLineageSchemaV1,
);
const neutralCodecV1: SaveCodecContextV1<NeutralSnapshotV1, NeutralSaveRecordV1> = Object.freeze({
  recordSchema: neutralRecordSchemaV1,
  validateEnvelope(record: DeepReadonly<NeutralSaveRecordV1>) {
    if (record.slot.capturedCommandSequence !== record.snapshot.commandSequence) {
      throw new TypeError("captured sequence mismatch");
    }
  },
});

function digestV1(label: string): Digest {
  return digestBytes(textEncoderV1.encode(`current-load-baseline:${label}`));
}

function mutableObjectV1(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`invalid ${label}`);
  }
  return value as Record<string, unknown>;
}

function metadataRecordValueV1(
  recordId: Parameters<typeof createSaveMetadataHostPayloadV1>[0] = "unstamped",
): Record<string, unknown> {
  return mutableObjectV1(
    JSON.parse(textDecoderV1.decode(createSaveMetadataHostPayloadV1(recordId).bytes)),
    "metadata Save record",
  );
}

function currentRecordBytesV1(input: {
  readonly slotId?: SaveSlotIdV1;
  readonly commandSequence?: number;
  readonly recordRevision?: number;
  readonly provenance?: BuildProvenanceV1;
  readonly lineage?: readonly SimulationAdoptionV1[];
  readonly metadataRecordId?: Parameters<typeof createSaveMetadataHostPayloadV1>[0];
  readonly mutate?: (record: Record<string, unknown>) => void;
} = {}): Uint8Array {
  const slotId = input.slotId ?? "quick";
  const commandSequence = input.commandSequence ?? 0;
  const provenance = input.provenance ?? snapshotTransactionProvenanceV1;
  const initial = createSnapshotTransactionInitialSnapshotV1(100);
  const snapshot = {
    ...initial,
    commandSequence: parseNonNegativeSafeInteger(commandSequence),
  };
  const metadata = input.metadataRecordId === undefined
    ? null
    : metadataRecordValueV1(input.metadataRecordId);
  const record: Record<string, unknown> = {
    formatRevision: 1,
    recordRevision: input.recordRevision ?? 1,
    provenance,
    slot: {
      storyId: provenance.story.id,
      slotId,
      writeReason: slotId === "auto.current" || slotId === "auto.previous" ? "auto" : slotId,
      capturedCommandSequence: commandSequence,
    },
    savedAt: fixedInstantV1,
    stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
    snapshot,
    simulationLineage: input.lineage ?? Object.freeze([]),
    ...(metadata !== null && Object.hasOwn(metadata, "annotation")
      ? { annotation: metadata.annotation }
      : {}),
    ...(metadata !== null && Object.hasOwn(metadata, "versionStamp")
      ? { versionStamp: metadata.versionStamp }
      : {}),
  };
  input.mutate?.(record);
  return canonicalJsonBytes(record);
}

function currentProvenanceV1(): BuildProvenanceV1 {
  const stored = snapshotTransactionProvenanceV1;
  return Object.freeze({
    ...stored,
    resolved: Object.freeze({
      ...stored.resolved,
      simulationDigest: digestV1("simulation.current"),
      patchSet: Object.freeze({
        ...stored.resolved.patchSet,
        digest: digestV1("patch.current"),
        simulationDigest: digestV1("patch.simulation.current"),
        presentationDigest: digestV1("patch.presentation.current"),
      }),
    }),
  });
}

function migrationTargetProvenanceV1(): BuildProvenanceV1 {
  const source = snapshotTransactionProvenanceV1;
  return Object.freeze({
    ...source,
    resolved: Object.freeze({
      ...source.resolved,
      stateContractRevision: parsePositiveSafeInteger(
        Number(source.resolved.stateContractRevision) + 1,
      ),
      stateContractDigest: digestV1("state-contract.migrated-current"),
    }),
  });
}

function stateContractIdentityV1(
  provenance: DeepReadonly<BuildProvenanceV1>,
): SaveStateContractIdentityV1 {
  return Object.freeze({
    stateContractRevision: provenance.resolved.stateContractRevision,
    stateContractDigest: provenance.resolved.stateContractDigest,
  });
}

function migrationRegistryV1(
  target: DeepReadonly<BuildProvenanceV1>,
  migrate: SaveStateMigrationStepV1["migrate"],
): SaveStateMigrationRegistryV1 {
  const namespace = parseSaveStateMigrationNamespaceV1("state.current-load-baseline");
  const sourceIdentity = stateContractIdentityV1(snapshotTransactionProvenanceV1);
  const targetIdentity = stateContractIdentityV1(target);
  return defineSaveStateMigrationRegistryV1({
    namespace,
    minimumSupported: sourceIdentity,
    current: targetIdentity,
    steps: [
      {
        migrationId: parseSaveStateMigrationIdV1("migration.current-load-baseline.one"),
        namespace,
        from: sourceIdentity,
        to: targetIdentity,
        references: { renames: [], deletions: [] },
        migrate,
      },
    ],
  });
}

function twoStepMigrationRegistryV1(
  target: DeepReadonly<BuildProvenanceV1>,
  migrateFirst: SaveStateMigrationStepV1["migrate"],
  migrateSecond: SaveStateMigrationStepV1["migrate"],
): SaveStateMigrationRegistryV1 {
  const namespace = parseSaveStateMigrationNamespaceV1("state.current-load-baseline.two-step");
  const sourceIdentity = stateContractIdentityV1(snapshotTransactionProvenanceV1);
  const middleIdentity = Object.freeze({
    stateContractRevision: parsePositiveSafeInteger(
      Number(sourceIdentity.stateContractRevision) + 1,
    ),
    stateContractDigest: digestV1("state-contract.migration-middle"),
  });
  const targetIdentity = stateContractIdentityV1(target);
  return defineSaveStateMigrationRegistryV1({
    namespace,
    minimumSupported: sourceIdentity,
    current: targetIdentity,
    steps: [
      {
        migrationId: parseSaveStateMigrationIdV1("migration.current-load-baseline.first"),
        namespace,
        from: sourceIdentity,
        to: middleIdentity,
        references: { renames: [], deletions: [] },
        migrate: migrateFirst,
      },
      {
        migrationId: parseSaveStateMigrationIdV1("migration.current-load-baseline.second"),
        namespace,
        from: middleIdentity,
        to: targetIdentity,
        references: { renames: [], deletions: [] },
        migrate: migrateSecond,
      },
    ],
  });
}

function adoptionDeclarationV1(
  stored: DeepReadonly<BuildProvenanceV1>,
  current: DeepReadonly<BuildProvenanceV1>,
): PatchSetAdoptionDeclarationV1 {
  return Object.freeze({
    storyId: current.story.id,
    storyRevision: current.story.revision,
    stateContractRevision: current.resolved.stateContractRevision,
    stateContractDigest: current.resolved.stateContractDigest,
    fromSimulationDigest: stored.resolved.simulationDigest,
    toSimulationDigest: current.resolved.simulationDigest,
    simulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
  });
}

function lineageV1(length: number, finalDigest: Digest): readonly SimulationAdoptionV1[] {
  const boundaries = Array.from({ length }, (_, index) => digestV1(`lineage.${String(index)}`));
  return Object.freeze(
    boundaries.map((fromSimulationDigest, index) =>
      Object.freeze({
        fromSimulationDigest,
        toSimulationDigest: boundaries[index + 1] ?? finalDigest,
        viaSimulationPatchSetDigest: digestV1(`lineage.patch.${String(index)}`),
        adoptedAtCommandSequence: parseNonNegativeSafeInteger(0),
      })
    ),
  );
}

function bytesWithLineageV1(length: number): Uint8Array {
  return currentRecordBytesV1({
    lineage: lineageV1(
      length,
      snapshotTransactionProvenanceV1.resolved.simulationDigest,
    ),
  });
}

interface SeededSlotV1 {
  readonly slotId: SaveSlotIdV1;
  readonly bytes: Uint8Array;
}

function observedStoreV1() {
  const memory = createMemoryHostRecordStoreV1();
  let saveCommitCount = 0;
  let saveReadFailure: "none" | "unavailable" | "throw" = "none";
  const unavailable = (operation: "read" | "list") => {
    const error = new Error("synthetic Save read outage");
    Object.defineProperties(error, {
      name: { value: "IndexedDbRecordStoreFailureV1" },
      code: { value: "indexeddb.unavailable" },
      operation: { value: operation },
    });
    return error;
  };
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read(
      namespace: Parameters<HostAtomicRecordStoreV1["read"]>[0],
      key: Parameters<HostAtomicRecordStoreV1["read"]>[1],
    ) {
      if (namespace === "save" && saveReadFailure !== "none") {
        return Promise.reject(
          saveReadFailure === "unavailable"
            ? unavailable("read")
            : new Error("unclassified Save read failure"),
        );
      }
      return memory.read(namespace, key);
    },
    list(namespace: Parameters<HostAtomicRecordStoreV1["list"]>[0]) {
      if (namespace === "save" && saveReadFailure !== "none") {
        return Promise.reject(
          saveReadFailure === "unavailable"
            ? unavailable("list")
            : new Error("unclassified Save list failure"),
        );
      }
      return memory.list(namespace);
    },
    async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
      if (mutations.some(({ namespace }) => namespace === "save")) saveCommitCount += 1;
      return await memory.commit(mutations);
    },
  });
  return Object.freeze({
    records,
    evidenceRecords: memory,
    saveCommitCount: () => saveCommitCount,
    resetSaveCommitCount() {
      saveCommitCount = 0;
    },
    setSaveReadFailure(value: "none" | "unavailable" | "throw") {
      saveReadFailure = value;
    },
  });
}

async function seedSlotsV1(records: HostAtomicRecordStoreV1, slots: readonly SeededSlotV1[]) {
  if (slots.length === 0) return;
  const mutations = slots.map(({ slotId, bytes }) =>
    Object.freeze({
      kind: "put" as const,
      namespace: "save" as const,
      key: createSaveSlotRecordKeyV1(snapshotTransactionProvenanceV1.story.id, slotId),
      expectedRevision: null,
      bytes: Uint8Array.from(bytes),
    })
  ) as [HostRecordMutationV1, ...HostRecordMutationV1[]];
  const result = await records.commit(mutations);
  if (result.kind !== "committed") throw new TypeError("failed to seed current-load baseline");
}

let fixtureOrdinalV1 = 0;

function cloneWrappingRuntimeControlV1<TSnapshot>(
  delegate: GameSessionRuntimeControlV1<TSnapshot>,
  wrapPrepareCallback = false,
): GameSessionRuntimeControlV1<TSnapshot> {
  return Object.freeze({
    enqueueAuthoritative<TResult>(
      operation: (
        current: DeepReadonly<TSnapshot>,
      ) => Promise<AuthoritativeOutcomeV1<TSnapshot, TResult>>,
      normalizeUnexpectedFault: (error: unknown) => TResult,
      prepareReplacementCommit?: (
        snapshot: DeepReadonly<TSnapshot>,
        anchor: "preserve_log" | "replace_replay_base",
      ) => void,
      whenHmrInvalidated?: () => TResult,
    ) {
      return delegate.enqueueAuthoritative(
        async (current) => {
          const outcome = await operation(current);
          return outcome.kind === "replace"
            ? Object.freeze({
              ...outcome,
              result: typeof outcome.result === "object" && outcome.result !== null
                ? Object.freeze({ ...outcome.result })
                : outcome.result,
            })
            : outcome;
        },
        normalizeUnexpectedFault,
        wrapPrepareCallback && prepareReplacementCommit !== undefined
          ? (snapshot, anchor) => prepareReplacementCommit(snapshot, anchor)
          : prepareReplacementCommit,
        whenHmrInvalidated,
      );
    },
    readAtQueueFront<TResult>(reader: (snapshot: DeepReadonly<TSnapshot>) => TResult) {
      return delegate.readAtQueueFront(reader);
    },
    inspectForRuntime: () => delegate.inspectForRuntime(),
    subscribeCommittedSnapshots: (listener: (snapshot: DeepReadonly<TSnapshot>) => void) =>
      delegate.subscribeCommittedSnapshots(listener),
  });
}

async function fixtureV1(input: {
  readonly slots?: readonly SeededSlotV1[];
  readonly provenance?: BuildProvenanceV1;
  readonly snapshotSchema?: RuntimeSchemaV1<NeutralSnapshotV1>;
  readonly adoptionDeclarations?: readonly PatchSetAdoptionDeclarationV1[];
  readonly saveStateMigrations?: SaveStateMigrationRegistryV1 | null;
  readonly referenceErrors?: readonly string[];
  readonly invariantErrors?: readonly string[];
  readonly onValidateReferences?: () => void;
  readonly onValidateInvariants?: () => void;
  readonly autoSaveInitialAnchorEpoch?: number;
  readonly wrapRuntimeControlWithOutcomeClone?: boolean;
  readonly wrapReplacementPrepareCallback?: boolean;
  readonly unavailableSaveReads?: boolean;
  readonly throwSaveReads?: boolean;
  readonly observeRuntimeControl?: (event: "enqueue" | "prepare") => void;
} = {}) {
  fixtureOrdinalV1 += 1;
  const store = observedStoreV1();
  let metadataClockCalls = 0;
  await seedSlotsV1(store.records, input.slots ?? Object.freeze([]));
  const session = createSnapshotTransactionWorkloadV1({ entityCount: 100 });
  const service = await createInstrumentedPersistenceServiceV1<
    SnapshotTransactionStateV1,
    NeutralSnapshotV1
  >(
    {
      runtimeControl: input.observeRuntimeControl !== undefined
        ? Object.freeze({
          ...session.runtimeControl,
          enqueueAuthoritative<TResult>(
            operation: (
              current: DeepReadonly<NeutralSnapshotV1>,
            ) => Promise<AuthoritativeOutcomeV1<NeutralSnapshotV1, TResult>>,
            normalizeUnexpectedFault: (error: unknown) => TResult,
            prepareReplacementCommit?: (
              snapshot: DeepReadonly<NeutralSnapshotV1>,
              anchor: "preserve_log" | "replace_replay_base",
            ) => void,
            whenHmrInvalidated?: () => TResult,
          ) {
            input.observeRuntimeControl?.("enqueue");
            return session.runtimeControl.enqueueAuthoritative(
              operation,
              normalizeUnexpectedFault,
              prepareReplacementCommit === undefined ? undefined : (snapshot, anchor) => {
                input.observeRuntimeControl?.("prepare");
                prepareReplacementCommit(snapshot, anchor);
              },
              whenHmrInvalidated,
            );
          },
        })
        : input.wrapRuntimeControlWithOutcomeClone === true
        ? cloneWrappingRuntimeControlV1(
          session.runtimeControl,
          input.wrapReplacementPrepareCallback === true,
        )
        : session.runtimeControl,
      records: store.records,
      snapshotSchema: input.snapshotSchema ?? snapshotTransactionSnapshotSchemaV1,
      provenance: input.provenance ?? snapshotTransactionProvenanceV1,
      adoptionDeclarations: input.adoptionDeclarations ?? Object.freeze([]),
      saveStateMigrations: input.saveStateMigrations ?? null,
      ownerId: `owner.current-load-baseline.${String(fixtureOrdinalV1)}` as SessionLeaseOwnerId,
      nextHandoffRequestId: () =>
        `handoff.current-load-baseline.${String(fixtureOrdinalV1)}` as LeaseHandoffRequestId,
      validateReferences: () => {
        input.onValidateReferences?.();
        return input.referenceErrors ?? Object.freeze([]);
      },
      validateInvariants: () => {
        input.onValidateInvariants?.();
        return input.invariantErrors ?? Object.freeze([]);
      },
      initialSimulationLineage: Object.freeze([]),
      metadataClock: Object.freeze({
        now() {
          metadataClockCalls += 1;
          return fixedInstantV1;
        },
      }),
      exportFilename: "current-load-baseline.json",
      manualSaveSlotCount: 0,
      autoSaveCapture: "external",
    },
    undefined,
    input.autoSaveInitialAnchorEpoch === undefined ? undefined : {
      autoSaveInitialAnchorEpoch: parseNonNegativeSafeInteger(
        input.autoSaveInitialAnchorEpoch,
      ),
    },
  );
  store.setSaveReadFailure(
    input.throwSaveReads === true
      ? "throw"
      : input.unavailableSaveReads === true
      ? "unavailable"
      : "none",
  );
  store.resetSaveCommitCount();
  metadataClockCalls = 0;
  return Object.freeze({
    session,
    service,
    store,
    metadataClockCalls: () => metadataClockCalls,
  });
}

async function rawSaveRecordsV1(records: HostAtomicRecordStoreV1) {
  return Object.freeze(
    (await records.list("save")).map((record) =>
      Object.freeze({
        key: record.key,
        revision: record.revision,
        bytes: Uint8Array.from(record.bytes),
      })
    ),
  );
}

async function rawLeaseRecordsV1(records: HostAtomicRecordStoreV1) {
  return Object.freeze(
    (await records.list("lease")).map((record) =>
      Object.freeze({
        key: record.key,
        revision: record.revision,
        bytes: Uint8Array.from(record.bytes),
      })
    ),
  );
}

function expectDeeplyFrozenV1(value: unknown, visited = new Set<object>()): void {
  if (value === null || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) expectDeeplyFrozenV1(descriptor.value, visited);
  }
}

function authorityEvidenceV1(fixture: Awaited<ReturnType<typeof fixtureV1>>) {
  const snapshot = fixture.session.snapshot();
  return Object.freeze({
    snapshot,
    rng: snapshot.rng,
    replayBase: fixture.session.replayBase(),
    replayBaseStateDigest: fixture.session.replayBaseStateDigest(),
    commandLog: fixture.session.commandLog(),
    lineage: fixture.service.getSimulationLineage(),
    migrationReceipt: readInstalledSaveStateMigrationReceiptInternalV1(
      fixture.session.runtimeControl,
    ),
  });
}

async function inspectSaveWithoutMutationV1(
  fixture: Awaited<ReturnType<typeof fixtureV1>>,
  slot: SaveSlotIdV1,
): Promise<SaveInspectionResultV1> {
  const storedExportBefore = await fixture.service.port.exportSave(slot);
  const currentExportBefore = await fixture.service.port.exportCurrentSave();
  const statusBefore = await fixture.service.port.getStatus();
  const leaseBefore = await fixture.service.port.lease.getStatus();
  const portMethodIdentitiesBefore = Object.freeze({
    listSlots: fixture.service.port.listSlots,
    inspectSave: fixture.service.port.inspectSave,
    getStatus: fixture.service.port.getStatus,
    save: fixture.service.port.save,
    load: fixture.service.port.load,
    clear: fixture.service.port.clear,
    annotateSave: fixture.service.port.annotateSave,
    exportSave: fixture.service.port.exportSave,
    exportCurrentSave: fixture.service.port.exportCurrentSave,
    importSave: fixture.service.port.importSave,
  });
  const authorityBefore = authorityEvidenceV1(fixture);
  const recordsBefore = await rawSaveRecordsV1(fixture.store.evidenceRecords);
  const leaseRecordsBefore = await rawLeaseRecordsV1(fixture.store.evidenceRecords);
  const saveCommitsBefore = fixture.store.saveCommitCount();
  const metadataClockCallsBefore = fixture.metadataClockCalls();

  const result = await fixture.service.port.inspectSave(slot);

  expectDeeplyFrozenV1(result);
  const authorityAfter = authorityEvidenceV1(fixture);
  expect(authorityAfter.snapshot).toBe(authorityBefore.snapshot);
  expect(authorityAfter.rng).toBe(authorityBefore.rng);
  expect(authorityAfter.replayBase).toBe(authorityBefore.replayBase);
  expect(authorityAfter.replayBaseStateDigest).toBe(authorityBefore.replayBaseStateDigest);
  expect(authorityAfter.commandLog).toBe(authorityBefore.commandLog);
  expect(authorityAfter.lineage).toBe(authorityBefore.lineage);
  expect(authorityAfter.migrationReceipt).toBe(authorityBefore.migrationReceipt);
  expect(await rawSaveRecordsV1(fixture.store.evidenceRecords)).toEqual(recordsBefore);
  expect(await rawLeaseRecordsV1(fixture.store.evidenceRecords)).toEqual(leaseRecordsBefore);
  expect(fixture.store.saveCommitCount()).toBe(saveCommitsBefore);
  expect(fixture.metadataClockCalls()).toBe(metadataClockCallsBefore);
  expect(fixture.session.status()).toBe("ready");
  expect({
    listSlots: fixture.service.port.listSlots,
    inspectSave: fixture.service.port.inspectSave,
    getStatus: fixture.service.port.getStatus,
    save: fixture.service.port.save,
    load: fixture.service.port.load,
    clear: fixture.service.port.clear,
    annotateSave: fixture.service.port.annotateSave,
    exportSave: fixture.service.port.exportSave,
    exportCurrentSave: fixture.service.port.exportCurrentSave,
    importSave: fixture.service.port.importSave,
  }).toEqual(portMethodIdentitiesBefore);
  await expect(fixture.service.port.getStatus()).resolves.toEqual(statusBefore);
  await expect(fixture.service.port.lease.getStatus()).resolves.toEqual(leaseBefore);
  await expect(fixture.service.port.exportSave(slot)).resolves.toEqual(storedExportBefore);
  await expect(fixture.service.port.exportCurrentSave()).resolves.toEqual(currentExportBefore);
  return result;
}

async function expectRejectedImportV1(
  bytes: Uint8Array,
  expected: {
    readonly kind: "rejected";
    readonly code:
      | "invalid_record"
      | "incompatible"
      | "lineage_limit"
      | "migration_rejected"
      | "migration_unavailable";
  },
  options: Parameters<typeof fixtureV1>[0] = {},
) {
  const fixture = await fixtureV1(options);
  try {
    const sourceBefore = Uint8Array.from(bytes);
    let replacementCommits = 0;
    await fixture.session.dispatch("cross_owner_atomic_committed");
    const authorityBefore = authorityEvidenceV1(fixture);
    const recordsBefore = await rawSaveRecordsV1(fixture.store.records);

    await expect(
      importWithReplacementCommitInternalV1(fixture.service, bytes, () => {
        replacementCommits += 1;
      }),
    ).resolves.toEqual(expected);

    const authorityAfter = authorityEvidenceV1(fixture);
    expect(bytes).toEqual(sourceBefore);
    expect(replacementCommits).toBe(0);
    expect(authorityAfter.snapshot).toBe(authorityBefore.snapshot);
    expect(authorityAfter.rng).toBe(authorityBefore.rng);
    expect(authorityAfter.replayBase).toBe(authorityBefore.replayBase);
    expect(authorityAfter.replayBaseStateDigest).toBe(authorityBefore.replayBaseStateDigest);
    expect(authorityAfter.commandLog).toBe(authorityBefore.commandLog);
    expect(authorityAfter.lineage).toBe(authorityBefore.lineage);
    expect(await rawSaveRecordsV1(fixture.store.records)).toEqual(recordsBefore);
    expect(fixture.store.saveCommitCount()).toBe(0);
    expect(fixture.session.status()).toBe("ready");
    await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
      safelySavedCommandSequence: null,
    });
  } finally {
    await fixture.service.disposeForRebootstrap();
  }
}

async function expectRejectedLoadPreservesAuthorityV1(
  fixture: Awaited<ReturnType<typeof fixtureV1>>,
  slot: SaveSlotIdV1,
  expected: {
    readonly kind: "rejected";
    readonly code:
      | "invalid_record"
      | "incompatible"
      | "lineage_limit"
      | "migration_rejected"
      | "migration_unavailable";
  },
) {
  let replacementCommits = 0;
  await fixture.session.dispatch("cross_owner_atomic_committed");
  const authorityBefore = authorityEvidenceV1(fixture);
  const recordsBefore = await rawSaveRecordsV1(fixture.store.records);

  await expect(
    loadWithReplacementCommitInternalV1(fixture.service, slot, () => {
      replacementCommits += 1;
    }),
  ).resolves.toEqual(expected);

  const authorityAfter = authorityEvidenceV1(fixture);
  expect(replacementCommits).toBe(0);
  expect(authorityAfter.snapshot).toBe(authorityBefore.snapshot);
  expect(authorityAfter.rng).toBe(authorityBefore.rng);
  expect(authorityAfter.replayBase).toBe(authorityBefore.replayBase);
  expect(authorityAfter.replayBaseStateDigest).toBe(authorityBefore.replayBaseStateDigest);
  expect(authorityAfter.commandLog).toBe(authorityBefore.commandLog);
  expect(authorityAfter.lineage).toBe(authorityBefore.lineage);
  expect(await rawSaveRecordsV1(fixture.store.records)).toEqual(recordsBefore);
  expect(fixture.store.saveCommitCount()).toBe(0);
  expect(fixture.session.status()).toBe("ready");
  await expect(fixture.service.port.getStatus()).resolves.toMatchObject({
    safelySavedCommandSequence: null,
  });
}

describe("post-DET-A current Save load baseline", () => {
  it("preserves accepted B-prime timestamp spellings and every maintained Save byte", () => {
    for (const savedAt of persistenceUtcAcceptedCorpusV1) {
      const bytes = currentRecordBytesV1({
        recordRevision: 99,
        metadataRecordId: "summaryAndFullDirtyStamp",
        mutate(record) {
          record.savedAt = savedAt;
        },
      });
      const source = JSON.parse(textDecoderV1.decode(bytes)) as Record<string, unknown>;
      const decoded = decodeSaveRecordV1(bytes, neutralCodecV1);
      expect(decoded).toMatchObject({
        kind: "decoded",
        record: {
          formatRevision: 1,
          recordRevision: 99,
          savedAt,
          stateDigest: source.stateDigest,
          annotation: source.annotation,
          versionStamp: source.versionStamp,
          simulationLineage: source.simulationLineage,
        },
      });
      if (decoded.kind !== "decoded") throw new TypeError("expected accepted B-prime Save");
      const reencoded = encodeSaveRecordV1(decoded.record, neutralCodecV1);
      expect(reencoded).toEqual(bytes);
      expect(digestBytes(reencoded)).toBe(digestBytes(bytes));
    }
  });

  it("pins current codec and revision precedence without treating recordRevision as a format axis", () => {
    const m0a = createSaveMetadataHostPayloadV1("summaryAndFullDirtyStamp");
    expect(digestBytes(m0a.bytes)).toBe(m0a.digest);

    const futureFormat = currentRecordBytesV1({
      mutate(record) {
        record.formatRevision = 2;
      },
    });
    expect(decodeSaveRecordV1(futureFormat, neutralCodecV1)).toEqual({
      kind: "rejected",
      code: "envelope.unsupported_revision",
    });

    const malformedRecordRevision = currentRecordBytesV1({
      recordRevision: 0,
    });
    expect(decodeSaveRecordV1(malformedRecordRevision, neutralCodecV1)).toEqual({
      kind: "rejected",
      code: "envelope.schema_invalid",
    });

    const arbitraryRecordRevision = currentRecordBytesV1({ recordRevision: 99 });
    expect(decodeSaveRecordV1(arbitraryRecordRevision, neutralCodecV1)).toMatchObject({
      kind: "decoded",
      record: { recordRevision: 99 },
    });

    const unknownFieldAndFutureFormat = currentRecordBytesV1({
      mutate(record) {
        record.formatRevision = 2;
        record.unexpected = true;
      },
    });
    expect(decodeSaveRecordV1(unknownFieldAndFutureFormat, neutralCodecV1)).toEqual({
      kind: "rejected",
      code: "envelope.schema_invalid",
    });

    const futureFormatAndMalformedCurrentField = currentRecordBytesV1({
      mutate(record) {
        record.formatRevision = 2;
        record.recordRevision = 0;
      },
    });
    expect(decodeSaveRecordV1(futureFormatAndMalformedCurrentField, neutralCodecV1)).toEqual({
      kind: "rejected",
      code: "envelope.unsupported_revision",
    });

    const invalidSnapshotAndWrongDigest = currentRecordBytesV1({
      mutate(record) {
        const snapshot = mutableObjectV1(record.snapshot, "Snapshot");
        snapshot.state = Object.freeze({ invalid: true });
        record.stateDigest = digestV1("wrong.invalid-snapshot");
      },
    });
    expect(decodeSaveRecordV1(invalidSnapshotAndWrongDigest, neutralCodecV1)).toEqual({
      kind: "rejected",
      code: "digest.state_mismatch",
    });

    const zeroRngAndWrongDigest = currentRecordBytesV1({
      mutate(record) {
        const snapshot = mutableObjectV1(record.snapshot, "Snapshot");
        const rng = mutableObjectV1(snapshot.rng, "Snapshot RNG");
        snapshot.rng = Object.freeze({ ...rng, cursor: 0 });
        record.stateDigest = digestV1("wrong.zero-rng");
      },
    });
    expect(decodeSaveRecordV1(zeroRngAndWrongDigest, neutralCodecV1)).toEqual({
      kind: "rejected",
      code: "digest.state_mismatch",
    });

    const zeroRngAndInvalidLineage = currentRecordBytesV1({
      mutate(record) {
        const snapshot = mutableObjectV1(record.snapshot, "Snapshot");
        const rng = mutableObjectV1(snapshot.rng, "Snapshot RNG");
        snapshot.rng = Object.freeze({ ...rng, cursor: 0 });
        record.stateDigest = digestCanonical("sillymaker:state:v1", snapshot);
        record.simulationLineage = "invalid";
      },
    });
    expect(decodeSaveRecordV1(zeroRngAndInvalidLineage, neutralCodecV1)).toEqual({
      kind: "rejected",
      code: "envelope.schema_invalid",
    });

    const crossFieldAndWrongDigest = currentRecordBytesV1({
      mutate(record) {
        const slot = mutableObjectV1(record.slot, "slot");
        record.slot = Object.freeze({ ...slot, capturedCommandSequence: 1 });
        record.stateDigest = digestV1("wrong.cross-field");
      },
    });
    expect(decodeSaveRecordV1(crossFieldAndWrongDigest, neutralCodecV1)).toEqual({
      kind: "rejected",
      code: "digest.state_mismatch",
    });

    const validSnapshotAndWrongDigest = currentRecordBytesV1({
      mutate(record) {
        record.stateDigest = digestV1("wrong.valid-snapshot");
      },
    });
    expect(decodeSaveRecordV1(validSnapshotAndWrongDigest, neutralCodecV1)).toEqual({
      kind: "rejected",
      code: "digest.state_mismatch",
    });

    let compatibilityCalls = 0;
    const validation = Object.freeze({
      codec: neutralCodecV1,
      currentStateContractRevision: snapshotTransactionProvenanceV1.resolved.stateContractRevision,
      saveStateMigrations: null,
      classifyCompatibility(): SaveCompatibilityClassificationV1 {
        compatibilityCalls += 1;
        return Object.freeze({
          kind: "exact" as const,
          mismatches: Object.freeze([] as const),
          warnings: Object.freeze([]),
        });
      },
      validateReferences: () => Object.freeze([]),
      validateInvariants: () => Object.freeze([]),
    });
    expect(validateSaveImportCandidateV1(validSnapshotAndWrongDigest, validation)).toEqual({
      kind: "rejected",
      code: "digest.state_mismatch",
    });
    expect(compatibilityCalls).toBe(0);

    expect(decodeSaveRecordV1(textEncoderV1.encode("not-json"), neutralCodecV1)).toEqual({
      kind: "rejected",
      code: "syntax.invalid",
    });
    expect(
      decodeSaveRecordV1(
        new Uint8Array(Number(saveJsonLimitsV1.maxBytes) + 1),
        neutralCodecV1,
      ),
    ).toEqual({ kind: "rejected", code: "limit.bytes" });
  });

  it("separates raw and normalized-current digest admission before Story callbacks", async () => {
    let snapshotSchemaCalls = 0;
    const normalizingSnapshotSchemaV1: RuntimeSchemaV1<NeutralSnapshotV1> = Object.freeze({
      parse(value: unknown) {
        snapshotSchemaCalls += 1;
        const parsed = snapshotTransactionSnapshotSchemaV1.parse(value);
        return Object.freeze({
          ...parsed,
          state: Object.freeze({
            ...parsed.state,
            normalizedMarker: 1,
          }),
        }) as NeutralSnapshotV1;
      },
    });
    const normalizingRecordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
      normalizingSnapshotSchemaV1,
      passthroughProvenanceSchemaV1,
      passthroughSlotSchemaV1,
      passthroughLineageSchemaV1,
    );
    const normalizingCodecV1: SaveCodecContextV1<NeutralSnapshotV1, NeutralSaveRecordV1> = Object
      .freeze({
        recordSchema: normalizingRecordSchemaV1,
        validateEnvelope: neutralCodecV1.validateEnvelope,
      });
    let compatibilityCalls = 0;
    let referenceCalls = 0;
    let invariantCalls = 0;
    const bytes = currentRecordBytesV1();
    const validation = Object.freeze({
      codec: normalizingCodecV1,
      currentStateContractRevision: snapshotTransactionProvenanceV1.resolved.stateContractRevision,
      saveStateMigrations: null,
      classifyCompatibility(): SaveCompatibilityClassificationV1 {
        compatibilityCalls += 1;
        return Object.freeze({
          kind: "exact" as const,
          mismatches: Object.freeze([] as const),
          warnings: Object.freeze([]),
        });
      },
      validateReferences: () => {
        referenceCalls += 1;
        return Object.freeze([]);
      },
      validateInvariants: () => {
        invariantCalls += 1;
        return Object.freeze([]);
      },
    });

    expect(decodeSaveRecordV1(bytes, normalizingCodecV1)).toEqual({
      kind: "rejected",
      code: "digest.normalized_state_mismatch",
    });
    snapshotSchemaCalls = 0;
    expect(validateSaveImportCandidateV1(bytes, validation)).toEqual({
      kind: "rejected",
      code: "digest.normalized_state_mismatch",
    });
    expect(snapshotSchemaCalls).toBe(1);
    expect(compatibilityCalls).toBe(0);
    expect(referenceCalls).toBe(0);
    expect(invariantCalls).toBe(0);

    const wrongRawDigest = currentRecordBytesV1({
      mutate(record) {
        record.stateDigest = digestV1("wrong.before-normalization");
      },
    });
    snapshotSchemaCalls = 0;
    expect(validateSaveImportCandidateV1(wrongRawDigest, validation)).toEqual({
      kind: "rejected",
      code: "digest.state_mismatch",
    });
    expect(snapshotSchemaCalls).toBe(0);
    expect(compatibilityCalls).toBe(0);
    expect(referenceCalls).toBe(0);
    expect(invariantCalls).toBe(0);

    snapshotSchemaCalls = 0;
    await expectRejectedImportV1(
      bytes,
      { kind: "rejected", code: "invalid_record" },
      {
        snapshotSchema: normalizingSnapshotSchemaV1,
        onValidateReferences: () => {
          referenceCalls += 1;
        },
        onValidateInvariants: () => {
          invariantCalls += 1;
        },
      },
    );
    expect(snapshotSchemaCalls).toBe(1);

    snapshotSchemaCalls = 0;
    const stored = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes }]),
      snapshotSchema: normalizingSnapshotSchemaV1,
      onValidateReferences: () => {
        referenceCalls += 1;
      },
      onValidateInvariants: () => {
        invariantCalls += 1;
      },
    });
    try {
      const recordsBefore = await rawSaveRecordsV1(stored.store.records);
      const listed = await stored.service.port.listSlots();
      expect(listed.find(({ slotId }) => slotId === "quick")).toMatchObject({
        slotId: "quick",
        health: "invalid",
        warningCodes: ["digest.normalized_state_mismatch"],
      });
      expect(snapshotSchemaCalls).toBe(1);
      expect(referenceCalls).toBe(0);
      expect(invariantCalls).toBe(0);
      expect(referenceCalls).toBe(0);
      expect(invariantCalls).toBe(0);
      await expect(stored.service.port.exportSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_record",
      });
      expect(snapshotSchemaCalls).toBe(2);
      await expect(stored.service.port.annotateSave("quick", "must not rewrite")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_record",
      });
      expect(snapshotSchemaCalls).toBe(3);
      expect(await rawSaveRecordsV1(stored.store.records)).toEqual(recordsBefore);
      expect(stored.store.saveCommitCount()).toBe(0);

      snapshotSchemaCalls = 0;
      await expectRejectedLoadPreservesAuthorityV1(stored, "quick", {
        kind: "rejected",
        code: "invalid_record",
      });
      expect(snapshotSchemaCalls).toBe(1);
    } finally {
      await stored.service.disposeForRebootstrap();
    }
  });

  it("reports unavailable migration before current Snapshot or compatibility admission", async () => {
    const storedRevision = parsePositiveSafeInteger(
      Number(snapshotTransactionProvenanceV1.resolved.stateContractRevision) + 1,
    );
    const legacyProvenance = Object.freeze({
      ...snapshotTransactionProvenanceV1,
      story: Object.freeze({
        ...snapshotTransactionProvenanceV1.story,
        id: "story.m1.legacy",
      }),
      resolved: Object.freeze({
        ...snapshotTransactionProvenanceV1.resolved,
        stateContractRevision: storedRevision,
      }),
    });
    const bytes = currentRecordBytesV1({
      provenance: legacyProvenance,
      mutate(record) {
        const snapshot = mutableObjectV1(record.snapshot, "legacy Snapshot");
        snapshot.state = Object.freeze({ legacyOnly: true });
        record.stateDigest = digestCanonical("sillymaker:state:v1", snapshot);
        const slot = mutableObjectV1(record.slot, "legacy slot");
        record.slot = Object.freeze({
          ...slot,
          storyId: snapshotTransactionProvenanceV1.story.id,
        });
      },
    });
    let snapshotSchemaCalls = 0;
    const countingSnapshotSchemaV1: RuntimeSchemaV1<NeutralSnapshotV1> = Object.freeze({
      parse(value: unknown) {
        snapshotSchemaCalls += 1;
        return snapshotTransactionSnapshotSchemaV1.parse(value);
      },
    });
    const countingCodecV1: SaveCodecContextV1<NeutralSnapshotV1, NeutralSaveRecordV1> = Object
      .freeze({
        recordSchema: createSaveRecordEnvelopeSchemaV1(
          countingSnapshotSchemaV1,
          passthroughProvenanceSchemaV1,
          passthroughSlotSchemaV1,
          passthroughLineageSchemaV1,
        ),
        validateEnvelope: neutralCodecV1.validateEnvelope,
      });
    let compatibilityCalls = 0;
    let referenceCalls = 0;
    let invariantCalls = 0;
    const validation = Object.freeze({
      codec: countingCodecV1,
      currentStateContractRevision: snapshotTransactionProvenanceV1.resolved.stateContractRevision,
      saveStateMigrations: null,
      classifyCompatibility(): SaveCompatibilityClassificationV1 {
        compatibilityCalls += 1;
        throw new TypeError("compatibility must not run");
      },
      validateReferences: () => {
        referenceCalls += 1;
        return Object.freeze([]);
      },
      validateInvariants: () => {
        invariantCalls += 1;
        return Object.freeze([]);
      },
    });

    const unavailable = validateSaveImportCandidateV1(bytes, validation);
    expect(unavailable).toEqual({
      kind: "inspect_only",
      code: "migration.unavailable",
      storedStateContractRevision: storedRevision,
      currentStateContractRevision: snapshotTransactionProvenanceV1.resolved.stateContractRevision,
    });
    expect(Object.isFrozen(unavailable)).toBe(true);
    expect(snapshotSchemaCalls).toBe(0);
    expect(compatibilityCalls).toBe(0);
    expect(referenceCalls).toBe(0);
    expect(invariantCalls).toBe(0);

    const newerCurrentRevision = parsePositiveSafeInteger(Number(storedRevision) + 1);
    snapshotSchemaCalls = 0;
    expect(
      validateSaveImportCandidateV1(
        bytes,
        Object.freeze({
          ...validation,
          currentStateContractRevision: newerCurrentRevision,
          saveStateMigrations: null,
        }),
      ),
    ).toEqual({
      kind: "inspect_only",
      code: "migration.unavailable",
      storedStateContractRevision: storedRevision,
      currentStateContractRevision: newerCurrentRevision,
    });
    expect(snapshotSchemaCalls).toBe(0);
    expect(compatibilityCalls).toBe(0);
    expect(referenceCalls).toBe(0);
    expect(invariantCalls).toBe(0);

    snapshotSchemaCalls = 0;
    await expectRejectedImportV1(
      bytes,
      { kind: "rejected", code: "migration_unavailable" },
      {
        snapshotSchema: countingSnapshotSchemaV1,
        onValidateReferences: () => {
          referenceCalls += 1;
        },
        onValidateInvariants: () => {
          invariantCalls += 1;
        },
      },
    );
    expect(snapshotSchemaCalls).toBe(0);
    expect(referenceCalls).toBe(0);
    expect(invariantCalls).toBe(0);

    snapshotSchemaCalls = 0;
    const stored = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes }]),
      snapshotSchema: countingSnapshotSchemaV1,
      onValidateReferences: () => {
        referenceCalls += 1;
      },
      onValidateInvariants: () => {
        invariantCalls += 1;
      },
    });
    try {
      const recordsBefore = await rawSaveRecordsV1(stored.store.records);
      const listed = await stored.service.port.listSlots();
      expect(listed.find(({ slotId }) => slotId === "quick")).toEqual({
        slotId: "quick",
        health: "valid",
        recordRevision: 1,
        capturedCommandSequence: 0,
        savedAt: fixedInstantV1,
        annotation: null,
        warningCodes: Object.freeze(["migration.unavailable"]),
      });
      expect(snapshotSchemaCalls).toBe(0);
      expect(referenceCalls).toBe(0);
      expect(invariantCalls).toBe(0);
      expect(referenceCalls).toBe(0);
      expect(invariantCalls).toBe(0);

      const exported = await stored.service.port.exportSave("quick");
      expect(exported).toMatchObject({ kind: "exported", slotId: "quick" });
      if (exported.kind !== "exported") throw new TypeError("expected unavailable export");
      expect(exported.file.bytes).toEqual(bytes);
      expect(snapshotSchemaCalls).toBe(0);

      await expect(stored.service.port.annotateSave("quick", "must not rewrite")).resolves.toEqual({
        kind: "rejected",
        code: "migration_unavailable",
      });
      expect(snapshotSchemaCalls).toBe(0);
      expect(await rawSaveRecordsV1(stored.store.records)).toEqual(recordsBefore);
      expect(stored.store.saveCommitCount()).toBe(0);

      snapshotSchemaCalls = 0;
      await expectRejectedLoadPreservesAuthorityV1(stored, "quick", {
        kind: "rejected",
        code: "migration_unavailable",
      });
      expect(snapshotSchemaCalls).toBe(0);
    } finally {
      await stored.service.disposeForRebootstrap();
    }

    const currentShapeProvenance = Object.freeze({
      ...snapshotTransactionProvenanceV1,
      resolved: Object.freeze({
        ...snapshotTransactionProvenanceV1.resolved,
        stateContractRevision: storedRevision,
      }),
    });
    const currentShapeBytes = currentRecordBytesV1({ provenance: currentShapeProvenance });
    snapshotSchemaCalls = 0;
    const rewritable = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: currentShapeBytes }]),
      snapshotSchema: countingSnapshotSchemaV1,
      onValidateReferences: () => {
        referenceCalls += 1;
      },
      onValidateInvariants: () => {
        invariantCalls += 1;
      },
    });
    try {
      const recordsBefore = await rawSaveRecordsV1(rewritable.store.records);
      const listed = await rewritable.service.port.listSlots();
      expect(listed.find(({ slotId }) => slotId === "quick")).toMatchObject({
        slotId: "quick",
        health: "valid",
        warningCodes: ["migration.unavailable"],
      });
      const exported = await rewritable.service.port.exportSave("quick");
      expect(exported).toMatchObject({ kind: "exported", slotId: "quick" });
      if (exported.kind !== "exported") throw new TypeError("expected unavailable export");
      expect(exported.file.bytes).toEqual(currentShapeBytes);
      expect(snapshotSchemaCalls).toBe(0);
      expect(referenceCalls).toBe(0);
      expect(invariantCalls).toBe(0);

      await expect(
        rewritable.service.port.annotateSave("quick", "must not rewrite"),
      ).resolves.toEqual({
        kind: "rejected",
        code: "migration_unavailable",
      });
      expect(snapshotSchemaCalls).toBe(0);
      expect(referenceCalls).toBe(0);
      expect(invariantCalls).toBe(0);
      expect(await rawSaveRecordsV1(rewritable.store.records)).toEqual(recordsBefore);
      expect(rewritable.store.saveCommitCount()).toBe(0);
    } finally {
      await rewritable.service.disposeForRebootstrap();
    }
  });

  it("loads and imports current records, including M0a metadata, through one atomic replay-base install without writes", async () => {
    const loadBytes = currentRecordBytesV1();
    const loadFixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: loadBytes }]),
    });
    try {
      await loadFixture.session.dispatch("cross_owner_atomic_committed");
      const rawBefore = await rawSaveRecordsV1(loadFixture.store.records);
      expect(loadFixture.session.commandLog()).toHaveLength(1);

      await expect(loadFixture.service.port.load("quick")).resolves.toEqual({
        kind: "loaded",
        compatibility: "exact",
        commandSequence: 0,
      });

      const installed = loadFixture.session.snapshot();
      expect(installed.commandSequence).toBe(0);
      expect(Object.isFrozen(installed)).toBe(true);
      expect(loadFixture.session.replayBase()).toBe(installed);
      expect(loadFixture.session.replayBaseStateDigest()).toBe(
        digestCanonical("sillymaker:state:v1", installed),
      );
      expect(loadFixture.session.commandLog()).toEqual([]);
      expect(loadFixture.service.getSimulationLineage()).toEqual([]);
      expect(await rawSaveRecordsV1(loadFixture.store.records)).toEqual(rawBefore);
      expect(loadFixture.store.saveCommitCount()).toBe(0);
      await expect(loadFixture.service.port.getStatus()).resolves.toMatchObject({
        safelySavedCommandSequence: null,
        lastFailureCode: null,
      });
    } finally {
      await loadFixture.service.disposeForRebootstrap();
    }

    const importBytes = currentRecordBytesV1({ metadataRecordId: "summaryAndFullDirtyStamp" });
    const importFixture = await fixtureV1();
    try {
      await importFixture.session.dispatch("cross_owner_atomic_committed");
      const rawBefore = await rawSaveRecordsV1(importFixture.store.records);

      await expect(importFixture.service.port.importSave(importBytes)).resolves.toEqual({
        kind: "imported",
        compatibility: "exact",
        commandSequence: 0,
      });

      const installed = importFixture.session.snapshot();
      expect(importFixture.session.replayBase()).toBe(installed);
      expect(importFixture.session.commandLog()).toEqual([]);
      expect(await rawSaveRecordsV1(importFixture.store.records)).toEqual(rawBefore);
      expect(importFixture.store.saveCommitCount()).toBe(0);
      await expect(importFixture.service.port.getStatus()).resolves.toMatchObject({
        safelySavedCommandSequence: null,
        lastFailureCode: null,
      });
    } finally {
      await importFixture.service.disposeForRebootstrap();
    }
  });

  it("distinguishes stored Host revision mismatch from importable recordRevision", async () => {
    const bytes = currentRecordBytesV1({ recordRevision: 99 });
    const stored = await fixtureV1({ slots: Object.freeze([{ slotId: "quick", bytes }]) });
    try {
      await expectRejectedLoadPreservesAuthorityV1(stored, "quick", {
        kind: "rejected",
        code: "invalid_record",
      });
    } finally {
      await stored.service.disposeForRebootstrap();
    }

    const imported = await fixtureV1();
    try {
      await imported.session.dispatch("cross_owner_atomic_committed");
      await expect(imported.service.port.importSave(bytes)).resolves.toEqual({
        kind: "imported",
        compatibility: "exact",
        commandSequence: 0,
      });
      expect(imported.session.snapshot().commandSequence).toBe(0);
      expect(imported.store.saveCommitCount()).toBe(0);
    } finally {
      await imported.service.disposeForRebootstrap();
    }
  });

  it("maps current validation failures publicly while preserving authority and storage", async () => {
    const unknownField = currentRecordBytesV1({
      mutate(record) {
        record.unexpected = true;
      },
    });
    const invalidSnapshotAndDigest = currentRecordBytesV1({
      mutate(record) {
        const snapshot = mutableObjectV1(record.snapshot, "Snapshot");
        snapshot.state = Object.freeze({ invalid: true });
        record.stateDigest = digestV1("wrong.invalid-public");
      },
    });
    const wrongDigest = currentRecordBytesV1({
      mutate(record) {
        record.stateDigest = digestV1("wrong.public");
      },
    });
    const malformedTimestamps = persistenceUtcRejectedCorpusV1.map((savedAt) =>
      currentRecordBytesV1({
        mutate(record) {
          record.savedAt = savedAt;
        },
      })
    );
    const incompatible = currentRecordBytesV1({
      provenance: Object.freeze({
        ...snapshotTransactionProvenanceV1,
        engine: Object.freeze({
          ...snapshotTransactionProvenanceV1.engine,
          digest: digestV1("engine.inspect-only"),
        }),
      }),
    });

    await expectRejectedImportV1(textEncoderV1.encode("not-json"), {
      kind: "rejected",
      code: "invalid_record",
    });
    await expectRejectedImportV1(unknownField, {
      kind: "rejected",
      code: "invalid_record",
    });
    await expectRejectedImportV1(invalidSnapshotAndDigest, {
      kind: "rejected",
      code: "invalid_record",
    });
    await expectRejectedImportV1(wrongDigest, {
      kind: "rejected",
      code: "invalid_record",
    });
    for (const bytes of malformedTimestamps) {
      expect(decodeSaveRecordV1(bytes, neutralCodecV1)).toEqual({
        kind: "rejected",
        code: "envelope.schema_invalid",
      });
      await expectRejectedImportV1(bytes, {
        kind: "rejected",
        code: "invalid_record",
      });
    }
    const malformedStoredBytes = malformedTimestamps[0];
    if (malformedStoredBytes === undefined) throw new TypeError("missing malformed timestamp");
    const malformedStored = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: malformedStoredBytes }]),
    });
    try {
      await expectRejectedLoadPreservesAuthorityV1(malformedStored, "quick", {
        kind: "rejected",
        code: "invalid_record",
      });
    } finally {
      await malformedStored.service.disposeForRebootstrap();
    }
    let referenceCalls = 0;
    let invariantCalls = 0;
    await expectRejectedImportV1(
      currentRecordBytesV1(),
      { kind: "rejected", code: "invalid_record" },
      {
        referenceErrors: Object.freeze(["reference.missing"]),
        invariantErrors: Object.freeze(["invariant.must-not-run"]),
        onValidateReferences: () => {
          referenceCalls += 1;
        },
        onValidateInvariants: () => {
          invariantCalls += 1;
        },
      },
    );
    expect(referenceCalls).toBe(1);
    expect(invariantCalls).toBe(0);

    referenceCalls = 0;
    invariantCalls = 0;
    await expectRejectedImportV1(
      currentRecordBytesV1(),
      { kind: "rejected", code: "invalid_record" },
      {
        invariantErrors: Object.freeze(["invariant.failed"]),
        onValidateReferences: () => {
          referenceCalls += 1;
        },
        onValidateInvariants: () => {
          invariantCalls += 1;
        },
      },
    );
    expect(referenceCalls).toBe(1);
    expect(invariantCalls).toBe(1);
    await expectRejectedImportV1(incompatible, {
      kind: "rejected",
      code: "incompatible",
    });
  });

  it("admits a fifteenth-lineage adoption, rejects the sixteenth, and denies undeclared adoption", async () => {
    const current = currentProvenanceV1();
    const declaration = adoptionDeclarationV1(snapshotTransactionProvenanceV1, current);
    const fifteen = bytesWithLineageV1(15);
    const accepted = await fixtureV1({
      provenance: current,
      adoptionDeclarations: Object.freeze([declaration]),
    });
    try {
      await accepted.session.dispatch("cross_owner_atomic_committed");
      await expect(accepted.service.port.importSave(fifteen)).resolves.toEqual({
        kind: "imported",
        compatibility: "adopted",
        commandSequence: 0,
      });
      expect(accepted.session.snapshot().commandSequence).toBe(0);
      expect(accepted.session.replayBase()).toBe(accepted.session.snapshot());
      expect(accepted.session.commandLog()).toEqual([]);
      expect(accepted.service.getSimulationLineage()).toHaveLength(16);
      expect(accepted.store.saveCommitCount()).toBe(0);
      await expect(accepted.service.port.getStatus()).resolves.toMatchObject({
        safelySavedCommandSequence: null,
      });
    } finally {
      await accepted.service.disposeForRebootstrap();
    }

    const loaded = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: fifteen }]),
      provenance: current,
      adoptionDeclarations: Object.freeze([declaration]),
    });
    try {
      const rawBefore = await rawSaveRecordsV1(loaded.store.records);
      await expect(loaded.service.port.load("quick")).resolves.toEqual({
        kind: "loaded",
        compatibility: "adopted",
        commandSequence: 0,
      });
      expect(loaded.session.replayBase()).toBe(loaded.session.snapshot());
      expect(loaded.service.getSimulationLineage()).toHaveLength(16);
      expect(await rawSaveRecordsV1(loaded.store.records)).toEqual(rawBefore);
      expect(loaded.store.saveCommitCount()).toBe(0);
    } finally {
      await loaded.service.disposeForRebootstrap();
    }

    await expectRejectedImportV1(
      bytesWithLineageV1(16),
      { kind: "rejected", code: "lineage_limit" },
      { provenance: current, adoptionDeclarations: Object.freeze([declaration]) },
    );

    await expectRejectedImportV1(
      fifteen,
      { kind: "rejected", code: "incompatible" },
      { provenance: current, adoptionDeclarations: Object.freeze([]) },
    );
  });

  it("marks recovery without fallback and exports inspect-only and lineage-limited bytes unchanged", async () => {
    const previousBytes = currentRecordBytesV1({ slotId: "auto.previous", commandSequence: 1 });
    const recovery = await fixtureV1({
      slots: Object.freeze([
        { slotId: "auto.current", bytes: textEncoderV1.encode("corrupt") },
        { slotId: "auto.previous", bytes: previousBytes },
      ]),
    });
    try {
      const initial = recovery.session.snapshot();
      await expect(recovery.service.port.listSlots()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ slotId: "auto.current", health: "invalid" }),
          expect.objectContaining({ slotId: "auto.previous", health: "recovery_candidate" }),
        ]),
      );
      await expect(recovery.service.port.load("auto.current")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_record",
      });
      expect(recovery.session.snapshot()).toBe(initial);
      expect(recovery.session.snapshot().commandSequence).toBe(0);
      expect(recovery.store.saveCommitCount()).toBe(0);

      const rawBeforeRecovery = await rawSaveRecordsV1(recovery.store.records);
      await expect(recovery.service.port.load("auto.previous")).resolves.toEqual({
        kind: "loaded",
        compatibility: "exact",
        commandSequence: 1,
      });
      expect(recovery.session.snapshot().commandSequence).toBe(1);
      expect(recovery.session.replayBase()).toBe(recovery.session.snapshot());
      expect(await rawSaveRecordsV1(recovery.store.records)).toEqual(rawBeforeRecovery);
      expect(recovery.store.saveCommitCount()).toBe(0);
    } finally {
      await recovery.service.disposeForRebootstrap();
    }

    const inspectBytes = currentRecordBytesV1({
      provenance: Object.freeze({
        ...snapshotTransactionProvenanceV1,
        engine: Object.freeze({
          ...snapshotTransactionProvenanceV1.engine,
          digest: digestV1("engine.inspect-export"),
        }),
      }),
    });
    const inspect = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: inspectBytes }]),
    });
    try {
      await expectRejectedLoadPreservesAuthorityV1(inspect, "quick", {
        kind: "rejected",
        code: "incompatible",
      });
      const exported = await inspect.service.port.exportSave("quick");
      expect(exported).toMatchObject({ kind: "exported", slotId: "quick" });
      if (exported.kind !== "exported") throw new TypeError("expected inspect-only export");
      expect(exported.file.bytes).toEqual(inspectBytes);
      expect(inspect.store.saveCommitCount()).toBe(0);
    } finally {
      await inspect.service.disposeForRebootstrap();
    }

    const current = currentProvenanceV1();
    const declaration = adoptionDeclarationV1(snapshotTransactionProvenanceV1, current);
    const limitedBytes = bytesWithLineageV1(16);
    const limited = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: limitedBytes }]),
      provenance: current,
      adoptionDeclarations: Object.freeze([declaration]),
    });
    try {
      await expectRejectedLoadPreservesAuthorityV1(limited, "quick", {
        kind: "rejected",
        code: "lineage_limit",
      });
      const exported = await limited.service.port.exportSave("quick");
      expect(exported).toMatchObject({ kind: "exported", slotId: "quick" });
      if (exported.kind !== "exported") throw new TypeError("expected lineage-limited export");
      expect(exported.file.bytes).toEqual(limitedBytes);
      expect(limited.store.saveCommitCount()).toBe(0);
    } finally {
      await limited.service.disposeForRebootstrap();
    }
  });
});

describe("M2c staged Save State migration integration", () => {
  it("runs one exact callback for load/import, installs the migrated Snapshot, and never writes back", async () => {
    const target = migrationTargetProvenanceV1();
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (state) => {
      migrationCalls += 1;
      return Object.freeze({ kind: "migrated" as const, state });
    });
    const sourceBytes = currentRecordBytesV1();
    const sourceBefore = Uint8Array.from(sourceBytes);
    const loaded = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: sourceBytes }]),
      provenance: target,
      saveStateMigrations: registry,
    });
    try {
      await loaded.session.dispatch("cross_owner_atomic_committed");
      const recordsBefore = await rawSaveRecordsV1(loaded.store.records);

      await expect(loaded.service.port.load("quick")).resolves.toEqual({
        kind: "loaded",
        compatibility: "exact",
        commandSequence: 0,
      });

      expect(migrationCalls).toBe(1);
      expect(loaded.session.commandLog()).toEqual([]);
      expect(loaded.session.replayBase()).toBe(loaded.session.snapshot());
      expect(await rawSaveRecordsV1(loaded.store.records)).toEqual(recordsBefore);
      expect(loaded.store.saveCommitCount()).toBe(0);
      const fresh = await loaded.service.port.exportCurrentSave();
      const freshRecord = JSON.parse(textDecoderV1.decode(fresh.bytes)) as Record<string, unknown>;
      expect(freshRecord.provenance).toMatchObject({
        resolved: {
          stateContractRevision: target.resolved.stateContractRevision,
          stateContractDigest: target.resolved.stateContractDigest,
        },
      });
      expect(freshRecord.stateDigest).toBe(
        digestCanonical("sillymaker:state:v1", freshRecord.snapshot),
      );
    } finally {
      await loaded.service.disposeForRebootstrap();
    }

    const imported = await fixtureV1({
      provenance: target,
      saveStateMigrations: registry,
    });
    try {
      const recordsBefore = await rawSaveRecordsV1(imported.store.records);
      await expect(imported.service.port.importSave(sourceBytes)).resolves.toEqual({
        kind: "imported",
        compatibility: "exact",
        commandSequence: 0,
      });
      expect(migrationCalls).toBe(2);
      expect(sourceBytes).toEqual(sourceBefore);
      expect(await rawSaveRecordsV1(imported.store.records)).toEqual(recordsBefore);
      expect(imported.store.saveCommitCount()).toBe(0);
    } finally {
      await imported.service.disposeForRebootstrap();
    }
  });

  it("installs one Session-owned migration receipt and preserves or clears it by anchor lifecycle", async () => {
    const target = migrationTargetProvenanceV1();
    let rejectNext = false;
    const registry = migrationRegistryV1(target, (state) =>
      rejectNext
        ? Object.freeze({
          kind: "rejected" as const,
          reasonCode: parseSaveStateMigrationReasonCodeV1("migration.synthetic.rejected"),
        })
        : Object.freeze({ kind: "migrated" as const, state }));
    const fixture = await fixtureV1({ provenance: target, saveStateMigrations: registry });
    try {
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl))
        .toBeNull();

      let atomicObservation = false;
      await expect(
        importWithReplacementCommitInternalV1(
          fixture.service,
          currentRecordBytesV1(),
          () => {
            const installed = readInstalledSaveStateMigrationReceiptInternalV1(
              fixture.session.runtimeControl,
            );
            expect(installed).not.toBeNull();
            expect(fixture.session.replayBase()).toBe(fixture.session.snapshot());
            expect(fixture.session.replayBaseStateDigest()).toBe(installed?.migratedStateDigest);
            expect(fixture.session.commandLog()).toEqual([]);
            atomicObservation = true;
          },
        ),
      ).resolves.toMatchObject({ kind: "imported", compatibility: "exact" });
      expect(atomicObservation).toBe(true);
      const receipt = readInstalledSaveStateMigrationReceiptInternalV1(
        fixture.session.runtimeControl,
      );
      expect(receipt).not.toBeNull();
      expect(fixture.session.replayBase()).toBe(fixture.session.snapshot());
      expect(fixture.session.replayBaseStateDigest()).toBe(receipt?.migratedStateDigest);
      expect(fixture.session.commandLog()).toEqual([]);

      let replayCalls = 0;
      const replay = await replayAuthoritativelyFromAttemptsInternalV1<
        NeutralSnapshotV1,
        { readonly source: "game"; readonly command: string },
        never,
        never,
        never,
        NeutralSnapshotV1["rng"],
        never
      >({
        identity: Object.freeze({ provenance: target }),
        replayBase: fixture.session.replayBase(),
        replayBaseStateDigest: fixture.session.replayBaseStateDigest(),
        commandLog: fixture.session.commandLog() as never,
        currentSnapshot: fixture.session.snapshot(),
        projectStableRejection: (rejection) => rejection,
        projectStableFault: (fault) => fault,
        executeAttempt() {
          replayCalls += 1;
          throw new TypeError("empty migrated replay must not execute a command");
        },
      });
      expect(replay).toMatchObject({ matches: true, executedEntries: 0 });
      expect(replayCalls).toBe(0);

      await fixture.session.dispatch("cross_owner_atomic_committed");
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl)).toBe(
        receipt,
      );
      expect(fixture.session.commandLog()[0]).toMatchObject({
        logOrdinal: 1,
        preStateDigest: receipt?.migratedStateDigest,
      });

      await expect(fixture.service.port.importSave(currentRecordBytesV1())).resolves.toMatchObject({
        kind: "imported",
        compatibility: "exact",
      });
      const replacementReceipt = readInstalledSaveStateMigrationReceiptInternalV1(
        fixture.session.runtimeControl,
      );
      expect(replacementReceipt).not.toBe(receipt);
      expect(replacementReceipt).toEqual(receipt);
      for (let index = 0; index < 201; index += 1) {
        await fixture.session.dispatch("cross_owner_atomic_committed");
      }
      expect(fixture.session.commandLog()).toHaveLength(200);
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl)).toBe(
        replacementReceipt,
      );
      await expect(fixture.service.port.save("quick")).resolves.toMatchObject({ kind: "saved" });
      await fixture.service.port.exportCurrentSave();
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl)).toBe(
        replacementReceipt,
      );

      await expect(fixture.service.port.load("quick")).resolves.toMatchObject({
        kind: "loaded",
        compatibility: "exact",
      });
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl))
        .toBeNull();
      await expect(fixture.service.port.importSave(currentRecordBytesV1())).resolves.toMatchObject({
        kind: "imported",
        compatibility: "exact",
      });
      const receiptAfterCurrentLoad = readInstalledSaveStateMigrationReceiptInternalV1(
        fixture.session.runtimeControl,
      );
      expect(receiptAfterCurrentLoad).not.toBeNull();

      rejectNext = true;
      await expect(fixture.service.port.importSave(currentRecordBytesV1())).resolves.toEqual({
        kind: "rejected",
        code: "migration_rejected",
      });
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl)).toBe(
        receiptAfterCurrentLoad,
      );
      expect(fixture.session.status()).toBe("ready");

      await expect(
        fixture.service.port.importSave(currentRecordBytesV1({ provenance: target })),
      ).resolves.toMatchObject({ kind: "imported", compatibility: "exact" });
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl))
        .toBeNull();
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("atomically installs one migrated receipt with the same replacement's adoption lineage", async () => {
    const stateTarget = migrationTargetProvenanceV1();
    const simulationTarget = currentProvenanceV1();
    const target = Object.freeze({
      ...simulationTarget,
      resolved: Object.freeze({
        ...simulationTarget.resolved,
        stateContractRevision: stateTarget.resolved.stateContractRevision,
        stateContractDigest: stateTarget.resolved.stateContractDigest,
      }),
    });
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (state) => {
      migrationCalls += 1;
      return Object.freeze({ kind: "migrated" as const, state });
    });
    const declaration = adoptionDeclarationV1(snapshotTransactionProvenanceV1, target);
    const fixture = await fixtureV1({
      provenance: target,
      adoptionDeclarations: Object.freeze([declaration]),
      saveStateMigrations: registry,
    });
    try {
      let observedReceipt: ReturnType<
        typeof readInstalledSaveStateMigrationReceiptInternalV1
      > = null;
      let observedLineage: readonly DeepReadonly<SimulationAdoptionV1>[] = Object.freeze([]);
      await expect(
        importWithReplacementCommitInternalV1(
          fixture.service,
          currentRecordBytesV1(),
          () => {
            observedReceipt = readInstalledSaveStateMigrationReceiptInternalV1(
              fixture.session.runtimeControl,
            );
            observedLineage = fixture.service.getSimulationLineage();
            expect(observedReceipt).toMatchObject({
              source: stateContractIdentityV1(snapshotTransactionProvenanceV1),
              target: stateContractIdentityV1(target),
            });
            expect(observedLineage).toEqual([
              {
                fromSimulationDigest: snapshotTransactionProvenanceV1.resolved.simulationDigest,
                toSimulationDigest: target.resolved.simulationDigest,
                viaSimulationPatchSetDigest: target.resolved.patchSet.simulationDigest,
                adoptedAtCommandSequence: 0,
              },
            ]);
            expect(fixture.session.replayBase()).toBe(fixture.session.snapshot());
            expect(fixture.session.commandLog()).toEqual([]);
          },
        ),
      ).resolves.toEqual({
        kind: "imported",
        compatibility: "adopted",
        commandSequence: 0,
      });
      expect(migrationCalls).toBe(1);
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl)).toBe(
        observedReceipt,
      );
      expect(fixture.service.getSimulationLineage()).toBe(observedLineage);
      expect(fixture.store.saveCommitCount()).toBe(0);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("retains the exact migration participant through a structural outcome wrapper", async () => {
    const target = migrationTargetProvenanceV1();
    const registry = migrationRegistryV1(
      target,
      (state) => Object.freeze({ kind: "migrated" as const, state }),
    );
    const fixture = await fixtureV1({
      provenance: target,
      saveStateMigrations: registry,
      wrapRuntimeControlWithOutcomeClone: true,
    });
    try {
      await expect(fixture.service.port.importSave(currentRecordBytesV1())).resolves.toMatchObject({
        kind: "imported",
        compatibility: "exact",
      });
      const receipt = readInstalledSaveStateMigrationReceiptInternalV1(
        fixture.session.runtimeControl,
      );
      expect(receipt).not.toBeNull();
      expect(fixture.session.replayBase()).toBe(fixture.session.snapshot());
      expect(fixture.session.replayBaseStateDigest()).toBe(receipt?.migratedStateDigest);
      expect(fixture.session.commandLog()).toEqual([]);
      expect(fixture.session.status()).toBe("ready");
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("fails migrated replacement closed when an opaque wrapper strips every internal carrier", async () => {
    const target = migrationTargetProvenanceV1();
    const registry = migrationRegistryV1(
      target,
      (state) => Object.freeze({ kind: "migrated" as const, state }),
    );
    const sourceBytes = currentRecordBytesV1();
    const fixture = await fixtureV1({
      provenance: target,
      saveStateMigrations: registry,
      wrapRuntimeControlWithOutcomeClone: true,
      wrapReplacementPrepareCallback: true,
    });
    try {
      const authorityBefore = authorityEvidenceV1(fixture);
      const recordsBefore = await rawSaveRecordsV1(fixture.store.records);

      await expect(fixture.service.port.importSave(sourceBytes)).resolves.toEqual({
        kind: "faulted",
        code: "persistence.unexpected",
      });

      const authorityAfter = authorityEvidenceV1(fixture);
      expect(authorityAfter.snapshot).toBe(authorityBefore.snapshot);
      expect(authorityAfter.rng).toBe(authorityBefore.rng);
      expect(authorityAfter.replayBase).toBe(authorityBefore.replayBase);
      expect(authorityAfter.replayBaseStateDigest).toBe(authorityBefore.replayBaseStateDigest);
      expect(authorityAfter.commandLog).toBe(authorityBefore.commandLog);
      expect(authorityAfter.lineage).toBe(authorityBefore.lineage);
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl))
        .toBeNull();
      expect(await rawSaveRecordsV1(fixture.store.records)).toEqual(recordsBefore);
      expect(fixture.store.saveCommitCount()).toBe(0);
      expect(fixture.session.status()).toBe("fault_paused");
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("fails autosave epoch exhaustion in prepare with zero cross-owner mutation", async () => {
    const target = migrationTargetProvenanceV1();
    const registry = migrationRegistryV1(
      target,
      (state) => Object.freeze({ kind: "migrated" as const, state }),
    );
    const sourceBytes = currentRecordBytesV1();
    const fixture = await fixtureV1({
      provenance: target,
      saveStateMigrations: registry,
      autoSaveInitialAnchorEpoch: Number.MAX_SAFE_INTEGER - 1,
    });
    try {
      await expect(fixture.service.port.importSave(sourceBytes)).resolves.toMatchObject({
        kind: "imported",
        compatibility: "exact",
      });
      await fixture.session.dispatch("cross_owner_atomic_committed");
      const receiptBefore = readInstalledSaveStateMigrationReceiptInternalV1(
        fixture.session.runtimeControl,
      );
      const authorityBefore = authorityEvidenceV1(fixture);
      const recordsBefore = await rawSaveRecordsV1(fixture.store.records);
      const sourceBefore = Uint8Array.from(sourceBytes);
      let replacementCommits = 0;

      await expect(
        importWithReplacementCommitInternalV1(fixture.service, sourceBytes, () => {
          replacementCommits += 1;
        }),
      ).resolves.toEqual({ kind: "faulted", code: "persistence.unexpected" });

      const authorityAfter = authorityEvidenceV1(fixture);
      expect(replacementCommits).toBe(0);
      expect(sourceBytes).toEqual(sourceBefore);
      expect(authorityAfter.snapshot).toBe(authorityBefore.snapshot);
      expect(authorityAfter.rng).toBe(authorityBefore.rng);
      expect(authorityAfter.replayBase).toBe(authorityBefore.replayBase);
      expect(authorityAfter.replayBaseStateDigest).toBe(authorityBefore.replayBaseStateDigest);
      expect(authorityAfter.commandLog).toBe(authorityBefore.commandLog);
      expect(authorityAfter.lineage).toBe(authorityBefore.lineage);
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl)).toBe(
        receiptBefore,
      );
      expect(await rawSaveRecordsV1(fixture.store.records)).toEqual(recordsBefore);
      expect(fixture.store.saveCommitCount()).toBe(0);
      expect(fixture.session.status()).toBe("ready");
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("keeps list, stored export, and annotation callback-free over a migratable record", async () => {
    const target = migrationTargetProvenanceV1();
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (state) => {
      migrationCalls += 1;
      return Object.freeze({ kind: "migrated" as const, state });
    });
    const sourceBytes = currentRecordBytesV1();
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: sourceBytes }]),
      provenance: target,
      saveStateMigrations: registry,
    });
    try {
      const recordsBefore = await rawSaveRecordsV1(fixture.store.records);
      const listed = await fixture.service.port.listSlots();
      expect(listed.find(({ slotId }) => slotId === "quick")).toMatchObject({
        health: "valid",
        warningCodes: ["migration.unavailable"],
      });
      const exported = await fixture.service.port.exportSave("quick");
      expect(exported).toMatchObject({ kind: "exported", slotId: "quick" });
      if (exported.kind !== "exported") throw new TypeError("expected historical export");
      expect(exported.file.bytes).toEqual(sourceBytes);
      await expect(fixture.service.port.annotateSave("quick", "not a dry run")).resolves.toEqual({
        kind: "rejected",
        code: "migration_unavailable",
      });
      expect(migrationCalls).toBe(0);
      expect(await rawSaveRecordsV1(fixture.store.records)).toEqual(recordsBefore);
      expect(fixture.store.saveCommitCount()).toBe(0);

      await expect(fixture.service.port.load("quick")).resolves.toMatchObject({
        kind: "loaded",
        compatibility: "exact",
      });
      expect(migrationCalls).toBe(1);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it.each(
    [
      ["slot identity", currentRecordBytesV1({ slotId: "manual.1" })],
      ["Host revision", currentRecordBytesV1({ recordRevision: 2 })],
    ] as const,
  )("rejects stored %s mismatch before chain execution", async (_label, bytes) => {
    const target = migrationTargetProvenanceV1();
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (state) => {
      migrationCalls += 1;
      return Object.freeze({ kind: "migrated" as const, state });
    });
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes }]),
      provenance: target,
      saveStateMigrations: registry,
    });
    try {
      await expectRejectedLoadPreservesAuthorityV1(fixture, "quick", {
        kind: "rejected",
        code: "invalid_record",
      });
      expect(migrationCalls).toBe(0);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("maps migration reject and invalid output to one Player rejection without mutation", async () => {
    const target = migrationTargetProvenanceV1();
    const sourceBytes = currentRecordBytesV1();
    let rejectedCalls = 0;
    const rejectedRegistry = migrationRegistryV1(target, (_state) => {
      rejectedCalls += 1;
      return Object.freeze({
        kind: "rejected" as const,
        reasonCode: parseSaveStateMigrationReasonCodeV1("migration.synthetic.rejected"),
      });
    });
    await expectRejectedImportV1(
      sourceBytes,
      { kind: "rejected", code: "migration_rejected" },
      { provenance: target, saveStateMigrations: rejectedRegistry },
    );
    expect(rejectedCalls).toBe(1);

    let invalidCalls = 0;
    const invalidRegistry = migrationRegistryV1(target, (_state) => {
      invalidCalls += 1;
      return Object.freeze({
        kind: "migrated",
        state: Object.freeze({ invalid: undefined }),
      }) as never;
    });
    await expectRejectedImportV1(
      sourceBytes,
      { kind: "rejected", code: "migration_rejected" },
      { provenance: target, saveStateMigrations: invalidRegistry },
    );
    expect(invalidCalls).toBe(1);
  });

  it("preserves authority for migrated current-RNG, compatibility, reference, and invariant failures", async () => {
    const target = migrationTargetProvenanceV1();
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (state) => {
      migrationCalls += 1;
      return Object.freeze({ kind: "migrated" as const, state });
    });
    const invalidRngBytes = currentRecordBytesV1({
      mutate(record) {
        const snapshot = mutableObjectV1(record.snapshot, "migration RNG Snapshot");
        const rng = mutableObjectV1(snapshot.rng, "migration RNG");
        snapshot.rng = { ...rng, cursor: 0 };
        record.stateDigest = digestCanonical("sillymaker:state:v1", snapshot);
      },
    });
    const lowLevelContext: SaveImportValidationContextV1<
      SnapshotTransactionStateV1,
      NeutralSnapshotV1,
      NeutralSaveRecordV1
    > = Object.freeze({
      codec: neutralCodecV1,
      currentStateContractRevision: target.resolved.stateContractRevision,
      saveStateMigrations: registry,
      classifyCompatibility: () =>
        Object.freeze({
          kind: "exact" as const,
          mismatches: Object.freeze([] as const),
          warnings: Object.freeze([]),
        }),
      validateReferences: () => Object.freeze([]),
      validateInvariants: () => Object.freeze([]),
    });
    expect(validateSaveImportCandidateV1(invalidRngBytes, lowLevelContext)).toMatchObject({
      kind: "rejected",
      code: "rng.invalid_state",
      migrationAttempt: {
        failingPhase: "current_snapshot_schema",
        migratedStateDigest: null,
      },
    });
    await expectRejectedImportV1(
      invalidRngBytes,
      { kind: "rejected", code: "invalid_record" },
      { provenance: target, saveStateMigrations: registry },
    );

    const incompatibleProvenance = Object.freeze({
      ...snapshotTransactionProvenanceV1,
      engine: Object.freeze({
        ...snapshotTransactionProvenanceV1.engine,
        digest: digestV1("migration.engine-mismatch"),
      }),
    });
    await expectRejectedImportV1(
      currentRecordBytesV1({ provenance: incompatibleProvenance }),
      { kind: "rejected", code: "incompatible" },
      { provenance: target, saveStateMigrations: registry },
    );
    await expectRejectedImportV1(
      currentRecordBytesV1(),
      { kind: "rejected", code: "invalid_record" },
      {
        provenance: target,
        saveStateMigrations: registry,
        referenceErrors: Object.freeze(["reference.missing"]),
      },
    );
    await expectRejectedImportV1(
      currentRecordBytesV1(),
      { kind: "rejected", code: "invalid_record" },
      {
        provenance: target,
        saveStateMigrations: registry,
        invariantErrors: Object.freeze(["invariant.failed"]),
      },
    );
    expect(migrationCalls).toBe(5);
  });

  it("maps callback throws to the stable fault code and preserves every authority", async () => {
    const target = migrationTargetProvenanceV1();
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (_state) => {
      migrationCalls += 1;
      throw new Error("private migration failure");
    });
    const sourceBytes = currentRecordBytesV1();
    const fixture = await fixtureV1({ provenance: target, saveStateMigrations: registry });
    try {
      await fixture.session.dispatch("cross_owner_atomic_committed");
      const authorityBefore = authorityEvidenceV1(fixture);
      const recordsBefore = await rawSaveRecordsV1(fixture.store.records);
      let replacementCommits = 0;

      await expect(
        importWithReplacementCommitInternalV1(fixture.service, sourceBytes, () => {
          replacementCommits += 1;
        }),
      ).resolves.toEqual({ kind: "faulted", code: "migration.callback_threw" });

      const authorityAfter = authorityEvidenceV1(fixture);
      expect(migrationCalls).toBe(1);
      expect(replacementCommits).toBe(0);
      expect(authorityAfter.snapshot).toBe(authorityBefore.snapshot);
      expect(authorityAfter.rng).toBe(authorityBefore.rng);
      expect(authorityAfter.replayBase).toBe(authorityBefore.replayBase);
      expect(authorityAfter.replayBaseStateDigest).toBe(authorityBefore.replayBaseStateDigest);
      expect(authorityAfter.commandLog).toBe(authorityBefore.commandLog);
      expect(authorityAfter.lineage).toBe(authorityBefore.lineage);
      expect(await rawSaveRecordsV1(fixture.store.records)).toEqual(recordsBefore);
      expect(fixture.store.saveCommitCount()).toBe(0);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });
});

describe("PF5 single-slot Save inspection", () => {
  it("reports an exact Save directly without changing stored or Session authority", async () => {
    const sourceBytes = currentRecordBytesV1();
    const sourceBefore = Uint8Array.from(sourceBytes);
    const runtimeEvents: Array<"enqueue" | "prepare"> = [];
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: sourceBytes }]),
      observeRuntimeControl: (event) => runtimeEvents.push(event),
    });
    try {
      await fixture.session.dispatch("cross_owner_atomic_committed");

      await expect(inspectSaveWithoutMutationV1(fixture, "quick")).resolves.toEqual({
        kind: "direct",
        slotId: "quick",
        warnings: [],
        diagnostics: {
          codes: [],
          migrationAttempt: null,
          migrationReasonCode: null,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
        },
      });
      expect(sourceBytes).toEqual(sourceBefore);
      expect(runtimeEvents).toEqual([]);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("reports adoption without migration and preserves its compatibility warning", async () => {
    const target = currentProvenanceV1();
    const declaration = adoptionDeclarationV1(snapshotTransactionProvenanceV1, target);
    const sourceBytes = currentRecordBytesV1();
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: sourceBytes }]),
      provenance: target,
      adoptionDeclarations: Object.freeze([declaration]),
    });
    try {
      await fixture.session.dispatch("cross_owner_atomic_committed");

      await expect(inspectSaveWithoutMutationV1(fixture, "quick")).resolves.toMatchObject({
        kind: "adoption_required",
        slotId: "quick",
        adoption: {
          fromSimulationDigest: snapshotTransactionProvenanceV1.resolved.simulationDigest,
          toSimulationDigest: target.resolved.simulationDigest,
          viaSimulationPatchSetDigest: target.resolved.patchSet.simulationDigest,
          adoptedAtCommandSequence: 0,
        },
        warnings: [
          {
            code: "identity.hotfix_set_mismatch",
            field: "hotfix_set",
            stored: snapshotTransactionProvenanceV1.resolved.patchSet,
            current: target.resolved.patchSet,
          },
        ],
      });
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("reruns migration callbacks for every inspection and preserves an installed receipt", async () => {
    const target = migrationTargetProvenanceV1();
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (state) => {
      migrationCalls += 1;
      return Object.freeze({ kind: "migrated" as const, state });
    });
    const sourceBytes = currentRecordBytesV1();
    const sourceBefore = Uint8Array.from(sourceBytes);
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: sourceBytes }]),
      provenance: target,
      saveStateMigrations: registry,
    });
    try {
      await expect(fixture.service.port.importSave(sourceBytes)).resolves.toMatchObject({
        kind: "imported",
        compatibility: "exact",
      });
      const installedReceipt = readInstalledSaveStateMigrationReceiptInternalV1(
        fixture.session.runtimeControl,
      );
      expect(installedReceipt).not.toBeNull();
      await fixture.session.dispatch("cross_owner_atomic_committed");
      migrationCalls = 0;

      const first = await inspectSaveWithoutMutationV1(fixture, "quick");
      expect(first).toMatchObject({
        kind: "migration_required",
        slotId: "quick",
        migration: {
          source: stateContractIdentityV1(snapshotTransactionProvenanceV1),
          target: stateContractIdentityV1(target),
        },
        warnings: [],
      });
      expect(migrationCalls).toBe(1);
      expect(readInstalledSaveStateMigrationReceiptInternalV1(fixture.session.runtimeControl)).toBe(
        installedReceipt,
      );

      const second = await inspectSaveWithoutMutationV1(fixture, "quick");
      expect(second).toEqual(first);
      expect(migrationCalls).toBe(2);
      expect(sourceBytes).toEqual(sourceBefore);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("projects one aggregate two-step migration receipt", async () => {
    const baseline = migrationTargetProvenanceV1();
    const target = Object.freeze({
      ...baseline,
      resolved: Object.freeze({
        ...baseline.resolved,
        stateContractRevision: parsePositiveSafeInteger(
          Number(snapshotTransactionProvenanceV1.resolved.stateContractRevision) + 2,
        ),
        stateContractDigest: digestV1("state-contract.two-step-current"),
      }),
    });
    let firstCalls = 0;
    let secondCalls = 0;
    const registry = twoStepMigrationRegistryV1(
      target,
      (state) => {
        firstCalls += 1;
        return Object.freeze({ kind: "migrated" as const, state });
      },
      (state) => {
        secondCalls += 1;
        return Object.freeze({ kind: "migrated" as const, state });
      },
    );
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: currentRecordBytesV1() }]),
      provenance: target,
      saveStateMigrations: registry,
    });
    try {
      const result = await inspectSaveWithoutMutationV1(fixture, "quick");
      expect(result).toMatchObject({
        kind: "migration_required",
        slotId: "quick",
        migration: {
          source: stateContractIdentityV1(snapshotTransactionProvenanceV1),
          target: stateContractIdentityV1(target),
          steps: [
            { migrationId: "migration.current-load-baseline.first" },
            { migrationId: "migration.current-load-baseline.second" },
          ],
        },
        warnings: [],
        diagnostics: {
          codes: [],
          migrationAttempt: null,
          migrationReasonCode: null,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
        },
      });
      expect(firstCalls).toBe(1);
      expect(secondCalls).toBe(1);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("projects invalid migration output as a stable rejection", async () => {
    const target = migrationTargetProvenanceV1();
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (_state) => {
      migrationCalls += 1;
      return Object.freeze({
        kind: "migrated",
        state: Object.freeze({ invalid: undefined }),
      }) as never;
    });
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: currentRecordBytesV1() }]),
      provenance: target,
      saveStateMigrations: registry,
    });
    try {
      await expect(inspectSaveWithoutMutationV1(fixture, "quick")).resolves.toMatchObject({
        kind: "rejected",
        slotId: "quick",
        code: "migration_rejected",
        diagnostics: {
          codes: ["migration.output_invalid"],
          migrationAttempt: {
            failingPhase: "output_admission",
            completedSteps: [],
            migratedStateDigest: null,
          },
          migrationReasonCode: null,
        },
      });
      expect(migrationCalls).toBe(1);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("observes a physical overwrite instead of reusing prior inspection bytes", async () => {
    const firstBytes = currentRecordBytesV1();
    const secondBytes = currentRecordBytesV1({
      commandSequence: 1,
      recordRevision: 2,
    });
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: firstBytes }]),
    });
    try {
      const first = await inspectSaveWithoutMutationV1(fixture, "quick");
      expect(first).toMatchObject({ kind: "direct", slotId: "quick" });
      const firstStored = await fixture.service.port.exportSave("quick");
      expect(firstStored).toMatchObject({ kind: "exported", slotId: "quick" });
      if (firstStored.kind !== "exported") throw new TypeError("expected initial Save export");
      expect(firstStored.file.bytes).toEqual(firstBytes);

      const overwrite = await fixture.store.records.commit([
        Object.freeze({
          kind: "put" as const,
          namespace: "save" as const,
          key: createSaveSlotRecordKeyV1(snapshotTransactionProvenanceV1.story.id, "quick"),
          expectedRevision: parseNonNegativeSafeInteger(1),
          bytes: Uint8Array.from(secondBytes),
        }),
      ]);
      expect(overwrite).toMatchObject({
        kind: "committed",
        records: [{ namespace: "save", revision: 2, bytes: secondBytes }],
      });
      fixture.store.resetSaveCommitCount();

      const second = await inspectSaveWithoutMutationV1(fixture, "quick");
      expect(second).toMatchObject({ kind: "direct", slotId: "quick" });
      expect(second).not.toBe(first);
      const stored = await fixture.service.port.exportSave("quick");
      expect(stored).toMatchObject({ kind: "exported", slotId: "quick" });
      if (stored.kind !== "exported") throw new TypeError("expected overwritten Save export");
      expect(stored.file.bytes).toEqual(secondBytes);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("does not consume the next autosave anchor epoch", async () => {
    const bytes = currentRecordBytesV1();
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes }]),
      autoSaveInitialAnchorEpoch: Number.MAX_SAFE_INTEGER - 1,
    });
    try {
      await expect(inspectSaveWithoutMutationV1(fixture, "quick")).resolves.toMatchObject({
        kind: "direct",
        slotId: "quick",
      });
      await expect(fixture.service.port.importSave(bytes)).resolves.toMatchObject({
        kind: "imported",
        compatibility: "exact",
      });
      expect(fixture.session.status()).toBe("ready");
      expect(fixture.store.saveCommitCount()).toBe(0);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("reports migration plus adoption without installing either candidate", async () => {
    const stateTarget = migrationTargetProvenanceV1();
    const simulationTarget = currentProvenanceV1();
    const target = Object.freeze({
      ...simulationTarget,
      resolved: Object.freeze({
        ...simulationTarget.resolved,
        stateContractRevision: stateTarget.resolved.stateContractRevision,
        stateContractDigest: stateTarget.resolved.stateContractDigest,
      }),
    });
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (state) => {
      migrationCalls += 1;
      return Object.freeze({ kind: "migrated" as const, state });
    });
    const declaration = adoptionDeclarationV1(snapshotTransactionProvenanceV1, target);
    const sourceBytes = currentRecordBytesV1();
    const sourceBefore = Uint8Array.from(sourceBytes);
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: sourceBytes }]),
      provenance: target,
      adoptionDeclarations: Object.freeze([declaration]),
      saveStateMigrations: registry,
    });
    try {
      await fixture.session.dispatch("cross_owner_atomic_committed");

      const result = await inspectSaveWithoutMutationV1(fixture, "quick");
      expect(result).toMatchObject({
        kind: "migration_and_adoption_required",
        slotId: "quick",
        migration: {
          source: stateContractIdentityV1(snapshotTransactionProvenanceV1),
          target: stateContractIdentityV1(target),
        },
        adoption: {
          fromSimulationDigest: snapshotTransactionProvenanceV1.resolved.simulationDigest,
          toSimulationDigest: target.resolved.simulationDigest,
          viaSimulationPatchSetDigest: target.resolved.patchSet.simulationDigest,
          adoptedAtCommandSequence: 0,
        },
        warnings: [
          {
            code: "identity.hotfix_set_mismatch",
            field: "hotfix_set",
            stored: snapshotTransactionProvenanceV1.resolved.patchSet,
            current: target.resolved.patchSet,
          },
        ],
      });
      expect(migrationCalls).toBe(1);
      expect(sourceBytes).toEqual(sourceBefore);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("keeps unavailable migrations inspect-only and reports the exact revision boundary", async () => {
    const target = migrationTargetProvenanceV1();
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: currentRecordBytesV1() }]),
      provenance: target,
    });
    try {
      await fixture.session.dispatch("cross_owner_atomic_committed");

      await expect(inspectSaveWithoutMutationV1(fixture, "quick")).resolves.toEqual({
        kind: "inspect_only",
        slotId: "quick",
        code: "migration_unavailable",
        diagnostics: {
          codes: ["migration.unavailable"],
          migrationAttempt: null,
          migrationReasonCode: null,
          storedStateContractRevision:
            snapshotTransactionProvenanceV1.resolved.stateContractRevision,
          currentStateContractRevision: target.resolved.stateContractRevision,
        },
      });
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("keeps incompatible identity changes inspect-only", async () => {
    const incompatible = Object.freeze({
      ...snapshotTransactionProvenanceV1,
      engine: Object.freeze({
        ...snapshotTransactionProvenanceV1.engine,
        digest: digestV1("inspection.engine-mismatch"),
      }),
    });
    const fixture = await fixtureV1({
      slots: Object.freeze([
        { slotId: "quick", bytes: currentRecordBytesV1({ provenance: incompatible }) },
      ]),
    });
    try {
      await fixture.session.dispatch("cross_owner_atomic_committed");

      await expect(inspectSaveWithoutMutationV1(fixture, "quick")).resolves.toEqual({
        kind: "inspect_only",
        slotId: "quick",
        code: "incompatible",
        diagnostics: {
          codes: ["identity.engine_digest_mismatch"],
          migrationAttempt: null,
          migrationReasonCode: null,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
        },
      });
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("reports a full lineage as an inspect-only reanchor requirement", async () => {
    const target = currentProvenanceV1();
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: bytesWithLineageV1(16) }]),
      provenance: target,
      adoptionDeclarations: Object.freeze([
        adoptionDeclarationV1(snapshotTransactionProvenanceV1, target),
      ]),
    });
    try {
      await fixture.session.dispatch("cross_owner_atomic_committed");

      await expect(inspectSaveWithoutMutationV1(fixture, "quick")).resolves.toEqual({
        kind: "inspect_only",
        slotId: "quick",
        code: "reanchor_required",
        diagnostics: {
          codes: ["compatibility.lineage_limit"],
          migrationAttempt: null,
          migrationReasonCode: null,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
        },
      });
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("surfaces an explicit migration rejection with its stable attempt evidence", async () => {
    const target = migrationTargetProvenanceV1();
    const reasonCode = parseSaveStateMigrationReasonCodeV1("migration.synthetic.rejected");
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (_state) => {
      migrationCalls += 1;
      return Object.freeze({ kind: "rejected" as const, reasonCode });
    });
    const sourceBytes = currentRecordBytesV1();
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: sourceBytes }]),
      provenance: target,
      saveStateMigrations: registry,
    });
    try {
      await fixture.session.dispatch("cross_owner_atomic_committed");

      const result = await inspectSaveWithoutMutationV1(fixture, "quick");
      expect(result).toMatchObject({
        kind: "rejected",
        slotId: "quick",
        code: "migration_rejected",
        diagnostics: {
          codes: ["migration.rejected"],
          migrationReasonCode: reasonCode,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
          migrationAttempt: {
            source: stateContractIdentityV1(snapshotTransactionProvenanceV1),
            target: stateContractIdentityV1(target),
            completedSteps: [],
            failingPhase: "callback_rejected",
            migratedStateDigest: null,
          },
        },
      });
      expect(migrationCalls).toBe(1);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("surfaces a thrown migration callback as a stable fault without leaking the throw", async () => {
    const target = migrationTargetProvenanceV1();
    let migrationCalls = 0;
    const registry = migrationRegistryV1(target, (_state) => {
      migrationCalls += 1;
      throw new Error("private inspection migration failure");
    });
    const sourceBytes = currentRecordBytesV1();
    const fixture = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: sourceBytes }]),
      provenance: target,
      saveStateMigrations: registry,
    });
    try {
      await fixture.session.dispatch("cross_owner_atomic_committed");

      const result = await inspectSaveWithoutMutationV1(fixture, "quick");
      expect(result).toMatchObject({
        kind: "faulted",
        slotId: "quick",
        code: "migration.callback_threw",
        diagnostics: {
          codes: ["migration.callback_threw"],
          migrationReasonCode: null,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
          migrationAttempt: {
            source: stateContractIdentityV1(snapshotTransactionProvenanceV1),
            target: stateContractIdentityV1(target),
            completedSteps: [],
            failingPhase: "callback",
            migratedStateDigest: null,
          },
        },
      });
      expect(migrationCalls).toBe(1);
    } finally {
      await fixture.service.disposeForRebootstrap();
    }
  });

  it("executes Story reference and invariant validation and projects stable rejections", async () => {
    let referenceCalls = 0;
    let invariantCalls = 0;
    const referenceFailure = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: currentRecordBytesV1() }]),
      referenceErrors: Object.freeze(["reference.missing"]),
      onValidateReferences: () => {
        referenceCalls += 1;
      },
      onValidateInvariants: () => {
        invariantCalls += 1;
      },
    });
    try {
      await expect(inspectSaveWithoutMutationV1(referenceFailure, "quick")).resolves.toMatchObject({
        kind: "rejected",
        slotId: "quick",
        code: "invalid_record",
        diagnostics: { codes: ["reference.unknown_id"] },
      });
      expect(referenceCalls).toBeGreaterThan(0);
      expect(invariantCalls).toBe(0);
    } finally {
      await referenceFailure.service.disposeForRebootstrap();
    }

    referenceCalls = 0;
    invariantCalls = 0;
    const invariantFailure = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: currentRecordBytesV1() }]),
      invariantErrors: Object.freeze(["invariant.synthetic"]),
      onValidateReferences: () => {
        referenceCalls += 1;
      },
      onValidateInvariants: () => {
        invariantCalls += 1;
      },
    });
    try {
      await expect(inspectSaveWithoutMutationV1(invariantFailure, "quick")).resolves.toMatchObject({
        kind: "rejected",
        slotId: "quick",
        code: "invalid_record",
        diagnostics: { codes: ["invariant.failed"] },
      });
      expect(referenceCalls).toBeGreaterThan(0);
      expect(invariantCalls).toBeGreaterThan(0);
    } finally {
      await invariantFailure.service.disposeForRebootstrap();
    }
  });

  it("distinguishes empty and invalid stored slots without mutation", async () => {
    const empty = await fixtureV1();
    try {
      await empty.session.dispatch("cross_owner_atomic_committed");
      await expect(inspectSaveWithoutMutationV1(empty, "quick")).resolves.toEqual({
        kind: "rejected",
        slotId: "quick",
        code: "empty_slot",
        diagnostics: {
          codes: ["empty_slot"],
          migrationAttempt: null,
          migrationReasonCode: null,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
        },
      });
    } finally {
      await empty.service.disposeForRebootstrap();
    }

    const invalidBytes = textEncoderV1.encode("not-json");
    const invalidBefore = Uint8Array.from(invalidBytes);
    const invalid = await fixtureV1({
      slots: Object.freeze([{ slotId: "quick", bytes: invalidBytes }]),
    });
    try {
      await invalid.session.dispatch("cross_owner_atomic_committed");
      await expect(inspectSaveWithoutMutationV1(invalid, "quick")).resolves.toEqual({
        kind: "rejected",
        slotId: "quick",
        code: "invalid_record",
        diagnostics: {
          codes: ["syntax.invalid"],
          migrationAttempt: null,
          migrationReasonCode: null,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
        },
      });
      expect(invalidBytes).toEqual(invalidBefore);
    } finally {
      await invalid.service.disposeForRebootstrap();
    }
  });

  it("returns stable unavailable, invalid-slot, and disposed fault evidence", async () => {
    const unavailable = await fixtureV1({ unavailableSaveReads: true });
    try {
      const recordsBefore = await rawSaveRecordsV1(unavailable.store.evidenceRecords);
      const leaseRecordsBefore = await rawLeaseRecordsV1(unavailable.store.evidenceRecords);
      const authorityBefore = authorityEvidenceV1(unavailable);
      const statusBefore = await unavailable.service.port.getStatus();
      const leaseBefore = await unavailable.service.port.lease.getStatus();
      const result = await unavailable.service.port.inspectSave("quick");
      expectDeeplyFrozenV1(result);
      expect(result).toEqual({
        kind: "rejected",
        slotId: "quick",
        code: "unavailable",
        diagnostics: {
          codes: ["indexeddb.unavailable"],
          migrationAttempt: null,
          migrationReasonCode: null,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
        },
      });
      const authorityAfter = authorityEvidenceV1(unavailable);
      expect(authorityAfter).toEqual(authorityBefore);
      expect(await rawSaveRecordsV1(unavailable.store.evidenceRecords)).toEqual(recordsBefore);
      expect(await rawLeaseRecordsV1(unavailable.store.evidenceRecords)).toEqual(
        leaseRecordsBefore,
      );
      expect(unavailable.store.saveCommitCount()).toBe(0);
      expect(unavailable.metadataClockCalls()).toBe(0);
      await expect(unavailable.service.port.getStatus()).resolves.toEqual(statusBefore);
      await expect(unavailable.service.port.lease.getStatus()).resolves.toEqual(leaseBefore);
    } finally {
      await unavailable.service.disposeForRebootstrap();
    }

    const throwing = await fixtureV1({ throwSaveReads: true });
    try {
      const result = await throwing.service.port.inspectSave("quick");
      expectDeeplyFrozenV1(result);
      expect(result).toEqual({
        kind: "faulted",
        slotId: "quick",
        code: "persistence.unexpected",
        diagnostics: {
          codes: ["persistence.unexpected"],
          migrationAttempt: null,
          migrationReasonCode: null,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
        },
      });
      expect(throwing.store.saveCommitCount()).toBe(0);
      expect(throwing.metadataClockCalls()).toBe(0);
    } finally {
      await throwing.service.disposeForRebootstrap();
    }

    const invalidSlot = await fixtureV1();
    try {
      const result = await invalidSlot.service.port.inspectSave("manual.1");
      expectDeeplyFrozenV1(result);
      expect(result).toEqual({
        kind: "faulted",
        slotId: null,
        code: "persistence.invalid_slot",
        diagnostics: {
          codes: ["persistence.invalid_slot"],
          migrationAttempt: null,
          migrationReasonCode: null,
          storedStateContractRevision: null,
          currentStateContractRevision: null,
        },
      });
      expect(invalidSlot.store.saveCommitCount()).toBe(0);
      expect(invalidSlot.metadataClockCalls()).toBe(0);
    } finally {
      await invalidSlot.service.disposeForRebootstrap();
    }

    const disposed = await fixtureV1();
    await disposed.service.disposeForRebootstrap();
    const disposedResult = await disposed.service.port.inspectSave("quick");
    expectDeeplyFrozenV1(disposedResult);
    expect(disposedResult).toEqual({
      kind: "faulted",
      slotId: "quick",
      code: "runtime_disposed",
      diagnostics: {
        codes: ["runtime_disposed"],
        migrationAttempt: null,
        migrationReasonCode: null,
        storedStateContractRevision: null,
        currentStateContractRevision: null,
      },
    });
    expect(disposed.store.saveCommitCount()).toBe(0);
    expect(disposed.metadataClockCalls()).toBe(0);
  });

  it(
    "reruns a bounded 10k migration workload while listSlots stays callback-free",
    async () => {
      const target = migrationTargetProvenanceV1();
      let migrationCalls = 0;
      const registry = migrationRegistryV1(target, (state) => {
        migrationCalls += 1;
        return Object.freeze({ kind: "migrated" as const, state });
      });
      const fixture = await fixtureV1({
        slots: Object.freeze([{ slotId: "quick", bytes: currentRecordBytesV1() }]),
        provenance: target,
        saveStateMigrations: registry,
      });
      try {
        const authorityBefore = authorityEvidenceV1(fixture);
        const recordsBefore = await rawSaveRecordsV1(fixture.store.evidenceRecords);
        const leaseRecordsBefore = await rawLeaseRecordsV1(fixture.store.evidenceRecords);
        const statusBefore = await fixture.service.port.getStatus();
        const leaseBefore = await fixture.service.port.lease.getStatus();

        await fixture.service.port.listSlots();
        expect(migrationCalls).toBe(0);
        for (let index = 0; index < 10_000; index += 1) {
          const result = await fixture.service.port.inspectSave("quick");
          expect(result.kind).toBe("migration_required");
          expectDeeplyFrozenV1(result);
        }
        expect(migrationCalls).toBe(10_000);

        await fixture.service.port.listSlots();
        expect(migrationCalls).toBe(10_000);
        const authorityAfter = authorityEvidenceV1(fixture);
        expect(authorityAfter.snapshot).toBe(authorityBefore.snapshot);
        expect(authorityAfter.rng).toBe(authorityBefore.rng);
        expect(authorityAfter.replayBase).toBe(authorityBefore.replayBase);
        expect(authorityAfter.replayBaseStateDigest).toBe(
          authorityBefore.replayBaseStateDigest,
        );
        expect(authorityAfter.commandLog).toBe(authorityBefore.commandLog);
        expect(authorityAfter.lineage).toBe(authorityBefore.lineage);
        expect(authorityAfter.migrationReceipt).toBe(authorityBefore.migrationReceipt);
        expect(await rawSaveRecordsV1(fixture.store.evidenceRecords)).toEqual(recordsBefore);
        expect(await rawLeaseRecordsV1(fixture.store.evidenceRecords)).toEqual(
          leaseRecordsBefore,
        );
        expect(fixture.store.saveCommitCount()).toBe(0);
        expect(fixture.metadataClockCalls()).toBe(0);
        await expect(fixture.service.port.getStatus()).resolves.toEqual(statusBefore);
        await expect(fixture.service.port.lease.getStatus()).resolves.toEqual(leaseBefore);
      } finally {
        await fixture.service.disposeForRebootstrap();
      }
    },
    120_000,
  );
});
