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
import { createSaveRecordEnvelopeSchemaV1, saveJsonLimitsV1 } from "../../contracts/persistence.ts";
import type {
  SaveCodecContextV1,
  SaveCompatibilityClassificationV1,
  SaveRecordEnvelopeV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.ts";
import type { DeepReadonly, Digest, RuntimeSchemaV1 } from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger } from "../../contracts/values.ts";
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
import { createPersistenceServiceV1 } from "./persistence-service.ts";
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
  const records: HostAtomicRecordStoreV1 = Object.freeze({
    read: memory.read,
    list: memory.list,
    async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
      if (mutations.some(({ namespace }) => namespace === "save")) saveCommitCount += 1;
      return await memory.commit(mutations);
    },
  });
  return Object.freeze({
    records,
    saveCommitCount: () => saveCommitCount,
    resetSaveCommitCount() {
      saveCommitCount = 0;
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

async function fixtureV1(input: {
  readonly slots?: readonly SeededSlotV1[];
  readonly provenance?: BuildProvenanceV1;
  readonly adoptionDeclaration?: PatchSetAdoptionDeclarationV1 | null;
  readonly referenceErrors?: readonly string[];
  readonly invariantErrors?: readonly string[];
  readonly onValidateReferences?: () => void;
  readonly onValidateInvariants?: () => void;
} = {}) {
  fixtureOrdinalV1 += 1;
  const store = observedStoreV1();
  await seedSlotsV1(store.records, input.slots ?? Object.freeze([]));
  const session = createSnapshotTransactionWorkloadV1({ entityCount: 100 });
  const service = await createPersistenceServiceV1<SnapshotTransactionStateV1, NeutralSnapshotV1>({
    runtimeControl: session.runtimeControl,
    records: store.records,
    snapshotSchema: snapshotTransactionSnapshotSchemaV1,
    provenance: input.provenance ?? snapshotTransactionProvenanceV1,
    adoptionDeclaration: input.adoptionDeclaration ?? null,
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
    metadataClock: Object.freeze({ now: () => fixedInstantV1 }),
    exportFilename: "current-load-baseline.json",
    manualSaveSlotCount: 0,
    autoSaveCapture: "external",
  });
  store.resetSaveCommitCount();
  return Object.freeze({ session, service, store });
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

function authorityEvidenceV1(fixture: Awaited<ReturnType<typeof fixtureV1>>) {
  const snapshot = fixture.session.snapshot();
  return Object.freeze({
    snapshot,
    rng: snapshot.rng,
    replayBase: fixture.session.replayBase(),
    replayBaseStateDigest: fixture.session.replayBaseStateDigest(),
    commandLog: fixture.session.commandLog(),
    lineage: fixture.service.getSimulationLineage(),
  });
}

async function expectRejectedImportV1(
  bytes: Uint8Array,
  expected: {
    readonly kind: "rejected";
    readonly code: "invalid_record" | "incompatible" | "lineage_limit";
  },
  options: Parameters<typeof fixtureV1>[0] = {},
) {
  const fixture = await fixtureV1(options);
  try {
    await fixture.session.dispatch("cross_owner_atomic_committed");
    const authorityBefore = authorityEvidenceV1(fixture);
    const recordsBefore = await rawSaveRecordsV1(fixture.store.records);

    await expect(fixture.service.port.importSave(bytes)).resolves.toEqual(expected);

    const authorityAfter = authorityEvidenceV1(fixture);
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
    readonly code: "invalid_record" | "incompatible" | "lineage_limit";
  },
) {
  await fixture.session.dispatch("cross_owner_atomic_committed");
  const authorityBefore = authorityEvidenceV1(fixture);
  const recordsBefore = await rawSaveRecordsV1(fixture.store.records);

  await expect(fixture.service.port.load(slot)).resolves.toEqual(expected);

  const authorityAfter = authorityEvidenceV1(fixture);
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
      code: "envelope.schema_invalid",
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
      code: "rng.invalid_state",
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
      code: "rng.invalid_state",
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
      code: "envelope.schema_invalid",
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
    const accepted = await fixtureV1({ provenance: current, adoptionDeclaration: declaration });
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
      adoptionDeclaration: declaration,
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
      { provenance: current, adoptionDeclaration: declaration },
    );

    await expectRejectedImportV1(
      fifteen,
      { kind: "rejected", code: "incompatible" },
      { provenance: current, adoptionDeclaration: null },
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
      adoptionDeclaration: declaration,
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
