// SPDX-License-Identifier: MIT
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type {
  HostAtomicRecordStoreV1,
  IsoUtcInstant,
  PatchSetAdoptionDeclarationV1,
  SessionLeaseOwnerId,
  SimulationAdoptionV1,
} from "@sillymaker/base";
import {
  canonicalJsonBytes,
  digestBytes,
  digestCanonical,
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  versionStampGlobalKeyV1,
} from "@sillymaker/base";
import {
  createCoreGameApplicationInstanceV1,
  defineCoreGameApplicationV1,
  resolveCoreGameApplicationV1,
} from "@sillymaker/base/runtime";
import {
  admitSaveMigrationReleaseFixtureV1,
  createFixedBootstrapEntropyV1,
  createMemoryHostRecordStoreV1,
  saveMetadataCompactExpectedV1,
  saveMigrationReleaseCorpusV1,
  type SaveMigrationReleaseFixtureIdV1,
} from "@sillymaker/base/testkit";

import type { LabApplicationInstanceV1 } from "../application/core-definition.ts";
import { labCoreApplicationDefinitionV1 } from "../application/core-definition.ts";

const fixtureRootV1 = resolve(import.meta.dirname, "..", "..", "fixtures", "saves");
const saveKeyV1 = "save-record.v1:story.e2e.engine-lab:quick" as Parameters<
  HostAtomicRecordStoreV1["read"]
>[1];
const ownerIdV1 = "owner.sillymaker.e2e.release-corpus" as SessionLeaseOwnerId;
const nowV1 = "2026-08-12T00:00:00.000Z" as IsoUtcInstant;

interface JsonRecordV1 {
  [key: string]: unknown;
}

function recordV1(bytes: Uint8Array): JsonRecordV1 {
  return JSON.parse(new TextDecoder().decode(bytes)) as JsonRecordV1;
}

function provenanceV1(record: JsonRecordV1): JsonRecordV1 {
  return record.provenance as JsonRecordV1;
}

function resolvedV1(record: JsonRecordV1): JsonRecordV1 {
  return provenanceV1(record).resolved as JsonRecordV1;
}

function snapshotV1(record: JsonRecordV1): JsonRecordV1 {
  return record.snapshot as JsonRecordV1;
}

function metadataV1(record: JsonRecordV1) {
  return Object.freeze({
    annotation: record.annotation ?? null,
    versionStamp: record.versionStamp ?? null,
  });
}

function reencodeV1(record: JsonRecordV1): Uint8Array {
  record.stateDigest = digestCanonical("sillymaker:state:v1", snapshotV1(record));
  return canonicalJsonBytes(record as never);
}

async function readFixtureBytesV1(id: SaveMigrationReleaseFixtureIdV1): Promise<Uint8Array> {
  return Uint8Array.from(await readFile(resolve(fixtureRootV1, `${id}.save.json`)));
}

async function readAdmittedFixtureV1(
  id: SaveMigrationReleaseFixtureIdV1,
): Promise<Uint8Array> {
  const descriptor = saveMigrationReleaseCorpusV1.find((candidate) => candidate.id === id);
  if (descriptor === undefined) throw new TypeError(`unknown release fixture: ${id}`);
  return admitSaveMigrationReleaseFixtureV1(
    descriptor,
    await readFixtureBytesV1(id),
  ).bytes;
}

async function seedQuickV1(
  bytes: Uint8Array,
  records: HostAtomicRecordStoreV1 = createMemoryHostRecordStoreV1(),
): Promise<HostAtomicRecordStoreV1> {
  const committed = await records.commit([{
    kind: "put",
    namespace: "save",
    key: saveKeyV1,
    expectedRevision: null,
    bytes,
  }]);
  if (committed.kind !== "committed") throw new TypeError("failed to seed release fixture");
  return records;
}

function adoptionDeclarationV1(record: JsonRecordV1): PatchSetAdoptionDeclarationV1 {
  const current = resolveCoreGameApplicationV1(labCoreApplicationDefinitionV1);
  if (current.kind !== "resolved") throw new TypeError("Engine Lab resolution failed");
  const currentProvenance = current.application.provenance as unknown as JsonRecordV1;
  const currentResolved = currentProvenance.resolved as JsonRecordV1;
  const currentPatchSet = currentResolved.patchSet as JsonRecordV1;
  const story = currentProvenance.story as JsonRecordV1;
  return Object.freeze({
    storyId: story.id as string,
    storyRevision: parsePositiveSafeInteger(story.revision),
    stateContractRevision: parsePositiveSafeInteger(currentResolved.stateContractRevision),
    stateContractDigest: parseDigest(currentResolved.stateContractDigest),
    fromSimulationDigest: parseDigest(resolvedV1(record).simulationDigest),
    toSimulationDigest: parseDigest(currentResolved.simulationDigest),
    simulationPatchSetDigest: parseDigest(currentPatchSet.simulationDigest),
  });
}

function definitionWithAdoptionsV1(
  declarations: readonly PatchSetAdoptionDeclarationV1[],
): typeof labCoreApplicationDefinitionV1 {
  return defineCoreGameApplicationV1({
    ...labCoreApplicationDefinitionV1,
    adoptionDeclarations: declarations,
  }) as typeof labCoreApplicationDefinitionV1;
}

async function applicationV1(
  records: HostAtomicRecordStoreV1,
  definition = labCoreApplicationDefinitionV1,
): Promise<LabApplicationInstanceV1> {
  const resolved = resolveCoreGameApplicationV1(definition);
  if (resolved.kind !== "resolved") throw new TypeError("Engine Lab resolution failed");
  return await createCoreGameApplicationInstanceV1(resolved.application, {
    host: Object.freeze({
      entropy: createFixedBootstrapEntropyV1({
        uuids: ["3f5a1c22-9d47-4b7e-8a10-6c2e4d9b1f30"],
        seeds: [20260720],
      }),
      records,
      now: () => nowV1,
      ownerId: ownerIdV1,
      nextHandoffRequestId: () => "handoff.sillymaker.e2e.release-corpus",
    }),
  }) as LabApplicationInstanceV1;
}

async function exportedQuickBytesV1(
  application: LabApplicationInstanceV1,
): Promise<Uint8Array> {
  const result = await application.persistence.exportSave("quick");
  if (result.kind !== "exported") throw new TypeError(`Save export failed: ${result.kind}`);
  return Uint8Array.from(result.file.bytes);
}

function lineageV1(length: number, finalDigest: string): readonly SimulationAdoptionV1[] {
  const boundaries = Array.from(
    { length: length + 1 },
    (_, index) => digestBytes(new TextEncoder().encode(`engine-lab-release-lineage:${index}`)),
  );
  return Object.freeze(
    boundaries.slice(0, length).map((fromSimulationDigest, index) =>
      Object.freeze({
        fromSimulationDigest,
        toSimulationDigest: index === length - 1
          ? parseDigest(finalDigest)
          : (boundaries[index + 1] ?? parseDigest(finalDigest)),
        viaSimulationPatchSetDigest: digestBytes(
          new TextEncoder().encode(`engine-lab-release-lineage-patch:${index}`),
        ),
        adoptedAtCommandSequence: parseNonNegativeSafeInteger(0),
      })
    ),
  );
}

function m0aRecordV1(
  id: keyof typeof saveMetadataCompactExpectedV1.records,
): JsonRecordV1 {
  const binary = atob(saveMetadataCompactExpectedV1.records[id].bytesBase64);
  return recordV1(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

const summaryOnlyAnnotationV1 = m0aRecordV1("summaryOnly").annotation as JsonRecordV1;
const noteOnlyAnnotationV1 = m0aRecordV1("noteOnly").annotation as JsonRecordV1;
const summaryAndNoteAnnotationV1 = m0aRecordV1("summaryAndNote").annotation as JsonRecordV1;

const metadataOriginCasesV1 = Object.freeze(
  [
    Object.freeze({
      id: "annotation absent + versionStamp absent",
      annotation: null,
      stamp: saveMetadataCompactExpectedV1.versionStamps.absent,
      clearNote: false,
    }),
    Object.freeze({
      id: "annotation summary-only + versionStamp all-null",
      annotation: summaryOnlyAnnotationV1,
      stamp: saveMetadataCompactExpectedV1.versionStamps.allNull,
      clearNote: false,
    }),
    Object.freeze({
      id: "annotation note-only + versionStamp partial",
      annotation: noteOnlyAnnotationV1,
      stamp: saveMetadataCompactExpectedV1.versionStamps.partial,
      clearNote: false,
    }),
    Object.freeze({
      id: "annotation summary-and-note + versionStamp full-clean",
      annotation: summaryAndNoteAnnotationV1,
      stamp: saveMetadataCompactExpectedV1.versionStamps.fullClean,
      clearNote: false,
    }),
    Object.freeze({
      id: "annotation cleared-note + versionStamp full-dirty",
      annotation: noteOnlyAnnotationV1,
      stamp: saveMetadataCompactExpectedV1.versionStamps.fullDirty,
      clearNote: true,
    }),
    Object.freeze({
      id: "annotation absent + versionStamp status-unavailable",
      annotation: null,
      stamp: saveMetadataCompactExpectedV1.versionStamps.statusUnavailable,
      clearNote: false,
    }),
    Object.freeze({
      id: "annotation summary-only + malformed versionStamp normalized absent",
      annotation: summaryOnlyAnnotationV1,
      // M0a owns malformed collector normalization; persisted output is absence.
      stamp: saveMetadataCompactExpectedV1.versionStamps.malformed,
      clearNote: false,
    }),
    Object.freeze({
      id: "annotation note-only + throwing versionStamp collector normalized absent",
      annotation: noteOnlyAnnotationV1,
      // M0a owns throwing collector fallback; persisted output is absence.
      stamp: saveMetadataCompactExpectedV1.versionStamps.absent,
      clearNote: false,
    }),
  ] as const,
);

const currentServiceStampV1 = Object.freeze({
  applicationVersion: "9.0.0",
  applicationCommit: "current-app",
  engineVersion: "9.1.0",
  engineCommit: "current-engine",
});

async function exerciseMetadataOriginV1(input: {
  readonly annotation: JsonRecordV1 | null;
  readonly clearNote: boolean;
  readonly stamp: unknown;
}): Promise<void> {
  const source = recordV1(await readAdmittedFixtureV1("engine-lab-state-3"));
  if (input.annotation === null) {
    Reflect.deleteProperty(source, "annotation");
  } else {
    source.annotation = structuredClone(input.annotation);
  }
  if (input.stamp === null) {
    Reflect.deleteProperty(source, "versionStamp");
  } else {
    source.versionStamp = structuredClone(input.stamp);
  }
  const sourceBytes = reencodeV1(source);
  Reflect.set(globalThis, versionStampGlobalKeyV1, currentServiceStampV1);
  const records = await seedQuickV1(sourceBytes);
  const application = await applicationV1(records);
  try {
    const expectedMetadata = {
      annotation: input.annotation,
      versionStamp: input.stamp,
    };
    await expect(application.persistence.inspectSave("quick")).resolves.toMatchObject({
      kind: "migration_required",
    });
    await expect(application.persistence.upgradeSave("quick")).resolves.toMatchObject({
      kind: "upgraded",
    });
    expect(metadataV1(recordV1(await exportedQuickBytesV1(application)))).toEqual(
      expectedMetadata,
    );
    const backup = await application.persistence.exportBackup("quick");
    if (backup.kind !== "exported") throw new TypeError("metadata backup missing");
    expect([...backup.file.bytes]).toEqual([...sourceBytes]);

    if (input.clearNote) {
      await expect(application.persistence.annotateSave("quick", "")).resolves.toEqual({
        kind: "saved",
        slotId: "quick",
      });
      expect(metadataV1(recordV1(await exportedQuickBytesV1(application)))).toEqual({
        annotation: null,
        versionStamp: input.stamp,
      });
    }

    await expect(application.persistence.restoreBackup("quick")).resolves.toMatchObject({
      kind: "restored",
    });
    expect(metadataV1(recordV1(await exportedQuickBytesV1(application)))).toEqual(
      expectedMetadata,
    );
    await expect(application.persistence.load("quick")).resolves.toMatchObject({
      kind: "loaded",
    });
    expect(application.admin.inspectForTest().snapshot.state.simulation).toMatchObject({
      narrative: { rapport: 0, history: { entries: [] } },
      stage: { contractRevision: 3 },
      wallet: { credits: 0 },
    });
    await expect(application.persistence.save("quick")).resolves.toMatchObject({ kind: "saved" });
    expect(metadataV1(recordV1(await exportedQuickBytesV1(application)))).toEqual({
      annotation: null,
      versionStamp: currentServiceStampV1,
    });
  } finally {
    await application.dispose();
  }
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, versionStampGlobalKeyV1);
});

describe("Engine Lab maintained Save migration release corpus", () => {
  it("admits exactly the supported revision 3, 4, and 5 fixture inventory", async () => {
    const descriptors = saveMigrationReleaseCorpusV1.filter(({ productId }) =>
      productId === "engine-lab"
    );
    expect(descriptors.map(({ id, storyId, stateContractRevision }) => ({
      id,
      storyId,
      stateContractRevision,
    }))).toEqual([
      { id: "engine-lab-state-3", storyId: "story.e2e.engine-lab", stateContractRevision: 3 },
      { id: "engine-lab-state-4", storyId: "story.e2e.engine-lab", stateContractRevision: 4 },
      { id: "engine-lab-state-5", storyId: "story.e2e.engine-lab", stateContractRevision: 5 },
    ]);
    expect((await readdir(fixtureRootV1)).sort()).toEqual([
      "engine-lab-state-3.save.json",
      "engine-lab-state-4.save.json",
      "engine-lab-state-5.save.json",
    ]);

    for (const descriptor of descriptors) {
      const bytes = await readFixtureBytesV1(descriptor.id);
      const admitted = admitSaveMigrationReleaseFixtureV1(descriptor, bytes);
      expect(admitted.descriptor).toBe(descriptor);
      expect([...admitted.bytes]).toEqual([...bytes]);
    }
  });

  it.each(
    [
      ["engine-lab-state-3", "migration_required", 2],
      ["engine-lab-state-4", "migration_required", 1],
      ["engine-lab-state-5", "direct", 0],
    ] as const,
  )(
    "%s completes inspect, upgrade when required, current load, and fresh-save round-trip",
    async (id, disposition, migrationSteps) => {
      const source = await readAdmittedFixtureV1(id);
      const records = await seedQuickV1(source);
      const application = await applicationV1(records);
      try {
        const inspection = await application.persistence.inspectSave("quick");
        expect(inspection.kind).toBe(disposition);
        if (inspection.kind === "migration_required") {
          expect(inspection.migration.steps).toHaveLength(migrationSteps);
          await expect(application.persistence.upgradeSave("quick")).resolves.toEqual({
            kind: "upgraded",
            slotId: "quick",
            compatibility: "exact",
          });
          await expect(application.persistence.inspectBackup("quick")).resolves.toEqual({
            kind: "available",
            slotId: "quick",
          });
          const backup = await application.persistence.exportBackup("quick");
          expect(backup.kind).toBe("exported");
          if (backup.kind === "exported") expect([...backup.file.bytes]).toEqual([...source]);
          await expect(application.persistence.inspectSave("quick")).resolves.toMatchObject({
            kind: "direct",
          });
        }
        await expect(application.persistence.load("quick")).resolves.toMatchObject({
          kind: "loaded",
          compatibility: "exact",
        });
        expect(application.admin.inspectForTest().snapshot.state.simulation).toMatchObject({
          narrative: { rapport: 0, history: { entries: [] } },
          stage: { contractRevision: 3 },
          wallet: { credits: 0 },
        });
        await expect(application.persistence.save("quick")).resolves.toEqual({
          kind: "saved",
          slotId: "quick",
        });
        const fresh = recordV1(await exportedQuickBytesV1(application));
        expect(resolvedV1(fresh)).toMatchObject({
          stateContractRevision: 5,
          stateContractDigest:
            "sha256:c6407d9e0b5bd4d93fbe6e54d61fc62f59d209892d71a663a70190a4970735e3",
        });
        expect(fresh.stateDigest).toBe(digestCanonical("sillymaker:state:v1", fresh.snapshot));
      } finally {
        await application.dispose();
      }
    },
  );

  it("preserves the exact source through failed upgrade and explicit backup restore", async () => {
    const source = await readAdmittedFixtureV1("engine-lab-state-3");
    const failureRecords = await seedQuickV1(source);
    const failureApplication = await applicationV1(failureRecords);
    try {
      const invalid = recordV1(source);
      const state = snapshotV1(invalid).state as JsonRecordV1;
      const simulation = state.simulation as JsonRecordV1;
      const narrative = simulation.narrative as JsonRecordV1;
      narrative.history = { entries: [] };
      const invalidBytes = reencodeV1(invalid);
      const stored = await failureRecords.read("save", saveKeyV1);
      if (stored === null) throw new TypeError("seeded Save disappeared");
      await failureRecords.commit([{
        kind: "put",
        namespace: "save",
        key: saveKeyV1,
        expectedRevision: stored.revision,
        bytes: invalidBytes,
      }]);
      await expect(failureApplication.persistence.upgradeSave("quick")).resolves.toEqual({
        kind: "rejected",
        code: "invalid_record",
      });
      await expect(failureApplication.persistence.inspectBackup("quick")).resolves.toEqual({
        kind: "rejected",
        slotId: "quick",
        code: "empty_backup",
      });
      expect([...(await failureRecords.read("save", saveKeyV1))!.bytes]).toEqual([
        ...invalidBytes,
      ]);
    } finally {
      await failureApplication.dispose();
    }

    const records = await seedQuickV1(source);
    const application = await applicationV1(records);
    try {
      await expect(application.persistence.upgradeSave("quick")).resolves.toMatchObject({
        kind: "upgraded",
      });
      expect([...(await exportedQuickBytesV1(application))]).not.toEqual([...source]);
      await expect(application.persistence.restoreBackup("quick")).resolves.toEqual({
        kind: "restored",
        slotId: "quick",
      });
      const restored = recordV1(await exportedQuickBytesV1(application));
      const original = recordV1(source);
      expect(snapshotV1(restored)).toEqual(snapshotV1(original));
      expect(restored.stateDigest).toBe(original.stateDigest);
      expect(resolvedV1(restored)).toEqual(resolvedV1(original));
      await expect(application.persistence.inspectBackup("quick")).resolves.toMatchObject({
        kind: "rejected",
        code: "empty_backup",
      });
    } finally {
      await application.dispose();
    }
  });

  it("distinguishes adoption and lineage 15/16, then rejects duplicate declarations before Host I/O", async () => {
    const source = recordV1(await readAdmittedFixtureV1("engine-lab-state-5"));
    const declaration = adoptionDeclarationV1(source);
    resolvedV1(source).simulationDigest = digestBytes(
      new TextEncoder().encode("engine-lab-release-adoption-source"),
    );
    const currentDigest = declaration.toSimulationDigest;

    for (const length of [15, 16] as const) {
      const candidate = structuredClone(source) as JsonRecordV1;
      candidate.simulationLineage = lineageV1(
        length,
        resolvedV1(candidate).simulationDigest as string,
      );
      const records = await seedQuickV1(reencodeV1(candidate));
      const application = await applicationV1(
        records,
        definitionWithAdoptionsV1([{
          ...declaration,
          fromSimulationDigest: parseDigest(resolvedV1(candidate).simulationDigest),
        }]),
      );
      try {
        const inspection = await application.persistence.inspectSave("quick");
        if (length === 15) {
          expect(inspection.kind).toBe("adoption_required");
          await expect(application.persistence.upgradeSave("quick")).resolves.toMatchObject({
            kind: "upgraded",
            compatibility: "adopted",
          });
          await expect(application.persistence.load("quick")).resolves.toMatchObject({
            kind: "loaded",
            compatibility: "exact",
          });
          expect(recordV1(await exportedQuickBytesV1(application)).simulationLineage).toHaveLength(
            16,
          );
        } else {
          expect(inspection).toMatchObject({
            kind: "inspect_only",
            code: "reanchor_required",
          });
          await expect(application.persistence.load("quick")).resolves.toEqual({
            kind: "rejected",
            code: "lineage_limit",
          });
          await expect(application.persistence.reanchorSave("quick")).resolves.toEqual({
            kind: "reanchored",
            slotId: "quick",
          });
          const reanchored = recordV1(await exportedQuickBytesV1(application));
          expect(reanchored.simulationLineage).toEqual([]);
          expect(resolvedV1(reanchored).simulationDigest).toBe(currentDigest);
        }
      } finally {
        await application.dispose();
      }
    }

    const fromDigest = parseDigest(resolvedV1(source).simulationDigest);
    const duplicateShape = Object.freeze({ ...declaration, fromSimulationDigest: fromDigest });
    const ambiguousDefinition = {
      ...labCoreApplicationDefinitionV1,
      adoptionDeclarations: Object.freeze([duplicateShape, duplicateShape]),
    };
    expect(resolveCoreGameApplicationV1(ambiguousDefinition)).toMatchObject({
      kind: "failed",
      failure: { code: "save_adoption_declarations.invalid" },
    });
    const backing = createMemoryHostRecordStoreV1();
    let hostOperations = 0;
    const observedRecords: HostAtomicRecordStoreV1 = Object.freeze({
      read(
        namespace: Parameters<HostAtomicRecordStoreV1["read"]>[0],
        key: Parameters<HostAtomicRecordStoreV1["read"]>[1],
      ) {
        hostOperations += 1;
        return backing.read(namespace, key);
      },
      list(namespace: Parameters<HostAtomicRecordStoreV1["list"]>[0]) {
        hostOperations += 1;
        return backing.list(namespace);
      },
      commit(mutations: Parameters<HostAtomicRecordStoreV1["commit"]>[0]) {
        hostOperations += 1;
        return backing.commit(mutations);
      },
    });
    await expect(applicationV1(observedRecords, ambiguousDefinition)).rejects.toThrow(
      "Engine Lab resolution failed",
    );
    expect(hostOperations).toBe(0);
  });

  it.each(metadataOriginCasesV1)(
    "preserves M0a capture origin for $id through upgrade/backup/restore and uses fresh origin",
    exerciseMetadataOriginV1,
  );
});
