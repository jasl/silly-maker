// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  classifySaveCompatibilityV1,
  createGameSnapshotEnvelopeSchemaV1,
  createSaveRecordEnvelopeSchemaV1,
  admitSaveMigrationReleaseFixtureV1,
  defineSaveStateMigrationRegistryV1,
  digestBytes,
  digestCanonical,
  instrumentDeterminismSaveStateMigrationRegistryV1,
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
  parseSaveStateMigrationReasonCodeV1,
  rngStateV1Schema,
  saveMigrationReleaseCorpusV1,
  validateSaveImportCandidateV1,
} from "@sillymaker/base/testkit/save-state-migration-determinism";
import type {
  BuildProvenanceV1,
  DeepReadonly,
  Digest,
  GameSnapshotEnvelopeV1,
  PatchSetAdoptionDeclarationV1,
  RngStateV1,
  RuntimeSchemaV1,
  SaveCodecContextV1,
  SaveImportValidationContextV1,
  SaveMigrationReleaseFixtureDescriptorV1,
  SaveRecordEnvelopeV1,
  SaveStateContractIdentityV1,
  SaveStateMigrationAttemptV1,
  SaveStateMigrationReceiptV1,
  SaveStateMigrationRegistryV1,
  SaveStateMigrationStepV1,
  SimulationAdoptionV1,
  StrictJsonValueV1,
} from "@sillymaker/base/testkit/save-state-migration-determinism";

import type { LabGameStateV1 } from "../gameplay/state.ts";
import { labGameStateSchemaV1 } from "../gameplay/state.ts";
import {
  labCurrentStateContractIdentityV1,
  labSaveStateMigrationRegistryV1,
  labStateContractIdentityRevision4V1,
  labStateContractIdentityRevision5V1,
} from "../save-state-migrations.ts";

type MigrationCaseIdV1 =
  | "one_step"
  | "two_step"
  | "explicit_reject"
  | "callback_throw"
  | "invalid_output"
  | "migration_plus_adoption";

type PatchSetIdentityV1 = BuildProvenanceV1["resolved"]["patchSet"];

interface CompactMigratedLabStateV1 {
  readonly samplesCollected: number;
  readonly procedurePhase: string;
  readonly stageContractRevision: number;
  readonly stageEntryCount: number;
  readonly stageOpacityPermille: readonly number[];
  readonly narrativeHistoryCount: number;
  readonly narrativeRapport: number;
  readonly walletCredits: number;
}

export interface SaveStateMigrationDeterminismCaseV1 {
  readonly caseId: MigrationCaseIdV1;
  readonly outcome: "exact" | "adopted" | "rejected" | "faulted";
  readonly code: string | null;
  readonly phase: string | null;
  readonly callbackCount: number;
  readonly normalizedOutput: CompactMigratedLabStateV1 | null;
  readonly sourceStateDigest: Digest;
  readonly migratedStateDigest: Digest | null;
  readonly receipt: SaveStateMigrationReceiptV1 | null;
  readonly attempt: SaveStateMigrationAttemptV1 | null;
  readonly adoption: SimulationAdoptionV1 | null;
  readonly sourceBytesPreserved: true;
}

export interface SaveMigrationReleaseCorpusParityCaseV1 {
  readonly fixtureId:
    | "engine-lab-state-3"
    | "engine-lab-state-4"
    | "engine-lab-state-5"
    | "engine-lab-state-6"
    | "cat-cafe-state-1";
  readonly productId: "engine-lab" | "cat-cafe";
  readonly source: {
    readonly stateContractRevision: number;
    readonly stateContractDigest: Digest;
    readonly bytesDigest: Digest;
    readonly stateDigest: Digest;
  };
  readonly target: {
    readonly stateContractRevision: number;
    readonly stateContractDigest: Digest;
    readonly stateDigest: Digest;
  };
  readonly outcome: "exact";
  readonly diagnostic: null;
  readonly migrationSteps: readonly string[];
  readonly callbackCount: number;
  readonly sourceBytesPreserved: true;
}

interface ReleaseSlotMetadataV1 {
  readonly storyId: string;
  readonly slotId: string;
  readonly writeReason: string;
  readonly capturedCommandSequence: number;
}

type ReleaseSnapshotV1 = GameSnapshotEnvelopeV1<LabGameStateV1, RngStateV1>;
type ReleaseRecordV1 = SaveRecordEnvelopeV1<
  ReleaseSnapshotV1,
  BuildProvenanceV1,
  ReleaseSlotMetadataV1,
  readonly SimulationAdoptionV1[]
>;

export interface SaveStateMigrationDeterminismVectorV1 {
  readonly schemaVersion: 1;
  readonly cases: readonly SaveStateMigrationDeterminismCaseV1[];
  readonly releaseCorpus: readonly SaveMigrationReleaseCorpusParityCaseV1[];
}

const releaseFixtureUrlsV1 = Object.freeze(
  {
    "engine-lab-state-3": new URL(
      "../../fixtures/saves/engine-lab-state-3.save.json?no-inline",
      import.meta.url,
    ),
    "engine-lab-state-4": new URL(
      "../../fixtures/saves/engine-lab-state-4.save.json?no-inline",
      import.meta.url,
    ),
    "engine-lab-state-5": new URL(
      "../../fixtures/saves/engine-lab-state-5.save.json?no-inline",
      import.meta.url,
    ),
    "engine-lab-state-6": new URL(
      "../../fixtures/saves/engine-lab-state-6.save.json?no-inline",
      import.meta.url,
    ),
    "cat-cafe-state-1": new URL(
      "../../../examples/cat-cafe/fixtures/saves/cat-cafe-state-1.save.json?no-inline",
      import.meta.url,
    ),
  } as const,
);

interface DenoReadFileV1 {
  readFile(path: unknown): Promise<Uint8Array>;
}

function denoReadFileV1(): DenoReadFileV1 | null {
  const candidate = Reflect.get(globalThis, "Deno");
  if (candidate === null || typeof candidate !== "object") return null;
  const readFile = Reflect.get(candidate, "readFile");
  if (typeof readFile !== "function") return null;
  return Object.freeze({
    async readFile(path: unknown): Promise<Uint8Array> {
      return await Reflect.apply(readFile, candidate, [path]) as Uint8Array;
    },
  });
}

async function readReleaseFixtureBytesV1(
  descriptor: SaveMigrationReleaseFixtureDescriptorV1,
): Promise<Uint8Array> {
  const url = releaseFixtureUrlsV1[descriptor.id];
  const deno = denoReadFileV1();
  if (deno !== null) return await deno.readFile(url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new TypeError(`release fixture fetch failed: ${String(response.status)}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function exactObjectFieldsV1(
  value: unknown,
  fields: readonly string[],
  label: string,
): Readonly<Record<string, unknown>> {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new TypeError(`invalid ${label}`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some(({ get, set }) => get !== undefined || set !== undefined)) {
    throw new TypeError(`${label} accessors are forbidden`);
  }
  const keys = Object.keys(descriptors).sort();
  if (keys.join("\0") !== [...fields].sort().join("\0")) {
    throw new TypeError(`invalid ${label} fields`);
  }
  return Object.freeze(
    Object.fromEntries(keys.map((key) => [key, descriptors[key]?.value])),
  );
}

const releaseProvenanceSchemaV1: RuntimeSchemaV1<BuildProvenanceV1> = Object.freeze({
  parse(value: unknown): BuildProvenanceV1 {
    const root = exactObjectFieldsV1(value, ["story", "engine", "resolved"], "provenance");
    const story = exactObjectFieldsV1(root.story, ["id", "revision", "digest"], "story");
    const engine = exactObjectFieldsV1(root.engine, ["version", "digest"], "engine");
    const resolved = exactObjectFieldsV1(
      root.resolved,
      [
        "stateContractRevision",
        "stateContractDigest",
        "simulationDigest",
        "presentationDigest",
        "patchSet",
      ],
      "resolved",
    );
    const patchSet = exactObjectFieldsV1(
      resolved.patchSet,
      ["digest", "simulationDigest", "presentationDigest", "appliedHotfixes"],
      "patchSet",
    );
    if (
      typeof story.id !== "string" || story.id.length === 0 ||
      typeof engine.version !== "string" || engine.version.length === 0 ||
      !Array.isArray(patchSet.appliedHotfixes) || patchSet.appliedHotfixes.length !== 0
    ) throw new TypeError("invalid fixture provenance identity");
    return Object.freeze({
      story: Object.freeze({
        id: story.id,
        revision: parsePositiveSafeInteger(story.revision),
        digest: parseDigest(story.digest),
      }),
      engine: Object.freeze({ version: engine.version, digest: parseDigest(engine.digest) }),
      resolved: Object.freeze({
        stateContractRevision: parsePositiveSafeInteger(resolved.stateContractRevision),
        stateContractDigest: parseDigest(resolved.stateContractDigest),
        simulationDigest: parseDigest(resolved.simulationDigest),
        presentationDigest: parseDigest(resolved.presentationDigest),
        patchSet: Object.freeze({
          digest: parseDigest(patchSet.digest),
          simulationDigest: parseDigest(patchSet.simulationDigest),
          presentationDigest: parseDigest(patchSet.presentationDigest),
          appliedHotfixes: Object.freeze([]),
        }),
      }),
    });
  },
});

const releaseSlotSchemaV1: RuntimeSchemaV1<ReleaseSlotMetadataV1> = Object.freeze({
  parse(value: unknown): ReleaseSlotMetadataV1 {
    const fields = exactObjectFieldsV1(
      value,
      ["storyId", "slotId", "writeReason", "capturedCommandSequence"],
      "slot metadata",
    );
    if (
      typeof fields.storyId !== "string" || fields.storyId.length === 0 ||
      fields.slotId !== "quick" || fields.writeReason !== "quick"
    ) throw new TypeError("invalid fixture slot identity");
    return Object.freeze({
      storyId: fields.storyId,
      slotId: "quick",
      writeReason: "quick",
      capturedCommandSequence: parseNonNegativeSafeInteger(fields.capturedCommandSequence),
    });
  },
});

const releaseLineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown): readonly SimulationAdoptionV1[] {
    if (!Array.isArray(value) || value.length !== 0) {
      throw new TypeError("invalid fixture lineage");
    }
    return Object.freeze([]);
  },
});

const releaseSnapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(
  labGameStateSchemaV1,
  rngStateV1Schema,
);
const releaseRecordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  releaseSnapshotSchemaV1,
  releaseProvenanceSchemaV1,
  releaseSlotSchemaV1,
  releaseLineageSchemaV1,
);
const releaseCodecV1: SaveCodecContextV1<ReleaseSnapshotV1, ReleaseRecordV1> = Object.freeze({
  recordSchema: releaseRecordSchemaV1,
  validateEnvelope(record: DeepReadonly<ReleaseRecordV1>) {
    if (
      record.slot.storyId !== record.provenance.story.id ||
      record.slot.capturedCommandSequence !== record.snapshot.commandSequence
    ) throw new TypeError("fixture envelope cross-field mismatch");
  },
});

const textEncoderV1 = new TextEncoder();
const digestV1 = (label: string): Digest =>
  digestBytes(textEncoderV1.encode(`m2e-save-state-migration:${label}`));

const patchSetV1: PatchSetIdentityV1 = Object.freeze({
  digest: digestV1("patch-set"),
  simulationDigest: digestV1("patch-set-simulation"),
  presentationDigest: digestV1("patch-set-presentation"),
  appliedHotfixes: Object.freeze([]),
});
const currentSimulationDigestV1 = digestV1("simulation-current");
const historicalSimulationDigestV1 = digestV1("simulation-historical");

function provenanceV1(
  stateIdentity: SaveStateContractIdentityV1,
  simulationDigest: Digest,
): BuildProvenanceV1 {
  return Object.freeze({
    story: Object.freeze({
      id: "story.e2e.engine-lab",
      revision: parsePositiveSafeInteger(8),
      digest: digestV1("story"),
    }),
    engine: Object.freeze({ version: "m2e", digest: digestV1("engine") }),
    resolved: Object.freeze({
      stateContractRevision: stateIdentity.stateContractRevision,
      stateContractDigest: stateIdentity.stateContractDigest,
      simulationDigest,
      presentationDigest: digestV1("presentation"),
      patchSet: patchSetV1,
    }),
  });
}

const currentProvenanceV1 = provenanceV1(
  labCurrentStateContractIdentityV1,
  currentSimulationDigestV1,
);

interface MigrationSlotV1 {
  readonly id: "slot.m2e.neutral";
}

type MigrationSnapshotV1 = GameSnapshotEnvelopeV1<LabGameStateV1, RngStateV1>;
type MigrationRecordV1 = SaveRecordEnvelopeV1<
  MigrationSnapshotV1,
  BuildProvenanceV1,
  MigrationSlotV1,
  readonly SimulationAdoptionV1[]
>;

const snapshotSchemaV1 = createGameSnapshotEnvelopeSchemaV1(
  labGameStateSchemaV1,
  rngStateV1Schema,
);
const provenanceSchemaV1: RuntimeSchemaV1<BuildProvenanceV1> = Object.freeze({
  parse(value: unknown): BuildProvenanceV1 {
    return value as BuildProvenanceV1;
  },
});
const slotSchemaV1: RuntimeSchemaV1<MigrationSlotV1> = Object.freeze({
  parse(value: unknown): MigrationSlotV1 {
    if (
      value === null || typeof value !== "object" || Array.isArray(value) ||
      Reflect.get(value, "id") !== "slot.m2e.neutral"
    ) throw new TypeError("invalid M2e migration slot");
    return Object.freeze({ id: "slot.m2e.neutral" });
  },
});
const lineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown): readonly SimulationAdoptionV1[] {
    if (!Array.isArray(value)) throw new TypeError("invalid M2e migration lineage");
    return Object.freeze([...value]) as readonly SimulationAdoptionV1[];
  },
});
const recordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  snapshotSchemaV1,
  provenanceSchemaV1,
  slotSchemaV1,
  lineageSchemaV1,
);
const codecV1: SaveCodecContextV1<MigrationSnapshotV1, MigrationRecordV1> = Object.freeze({
  recordSchema: recordSchemaV1,
  validateEnvelope() {},
});

const historicalStageRevision2V1 = Object.freeze({
  contractRevision: 2,
  stageId: "stage.e2e.lab",
  layers: Object.freeze([
    Object.freeze({
      layerId: "layer.e2e.background",
      transform: Object.freeze({ x: 0, y: 0, scalePermille: 1000, visible: true }),
      entries: Object.freeze([
        Object.freeze({
          tag: "tag.e2e.bg",
          contentId: "content.e2e.bg.lab",
          zOrder: 0,
          placement: Object.freeze({
            x: 0,
            y: 0,
            scalePermille: 1000,
            mirrored: false,
          }),
          appearance: Object.freeze({}),
        }),
      ]),
    }),
    Object.freeze({
      layerId: "layer.e2e.characters",
      transform: Object.freeze({ x: 0, y: 0, scalePermille: 1000, visible: true }),
      entries: Object.freeze([]),
    }),
    Object.freeze({
      layerId: "layer.e2e.props",
      transform: Object.freeze({ x: 0, y: 0, scalePermille: 1000, visible: true }),
      entries: Object.freeze([]),
    }),
  ]),
  camera: Object.freeze({ x: 0, y: 0, zoomPermille: 1000 }),
});

const historicalNarrativeRevision3V1 = Object.freeze({
  phase: "idle",
  cursor: null,
  pending: null,
  sequence: 0,
  calibration: null,
});

const historicalNarrativeRevision4V1 = Object.freeze({
  ...historicalNarrativeRevision3V1,
  history: Object.freeze({ entries: Object.freeze([]) }),
});

const historicalStateRevision4V1 = Object.freeze({
  simulation: Object.freeze({
    samples: Object.freeze({ collected: 0 }),
    procedure: Object.freeze({ phase: "idle", stepsTaken: 0 }),
    stage: historicalStageRevision2V1,
    narrative: historicalNarrativeRevision4V1,
  }),
}) as StrictJsonValueV1;

/** The revision-5 shape: exactly what `migration.engine-lab.revision-4-to-5`
 * produces from the revision-4 state above, so single-step and multi-step
 * chains converge on one migrated terminal digest. */
const historicalStageRevision3V1 = Object.freeze({
  ...historicalStageRevision2V1,
  contractRevision: 3,
  layers: Object.freeze(
    historicalStageRevision2V1.layers.map((layer) =>
      Object.freeze({
        ...layer,
        entries: Object.freeze(
          layer.entries.map((entry) =>
            Object.freeze({
              ...entry,
              placement: Object.freeze({ ...entry.placement, opacityPermille: 1000 }),
            })
          ),
        ),
      })
    ),
  ),
});

const historicalStateRevision5V1 = Object.freeze({
  simulation: Object.freeze({
    samples: Object.freeze({ collected: 0 }),
    procedure: Object.freeze({ phase: "idle", stepsTaken: 0 }),
    stage: historicalStageRevision3V1,
    narrative: Object.freeze({ ...historicalNarrativeRevision4V1, rapport: 0 }),
    wallet: Object.freeze({ credits: 0 }),
  }),
}) as StrictJsonValueV1;

function snapshotV1(state: StrictJsonValueV1) {
  return Object.freeze({
    state,
    rng: Object.freeze({
      algorithm: "xorshift32-v1" as const,
      cursor: 97,
      rawDrawCount: 0,
    }),
    commandSequence: 7,
    integrity: Object.freeze({
      mode: "normal" as const,
      mutationCount: 0,
      firstMutationSequence: null,
      reasons: Object.freeze([]),
    }),
  });
}

function recordV1(input: {
  readonly identity: SaveStateContractIdentityV1;
  readonly state: StrictJsonValueV1;
  readonly simulationDigest: Digest;
}): MigrationRecordV1 {
  const snapshot = snapshotV1(input.state);
  return Object.freeze({
    formatRevision: 1,
    recordRevision: parsePositiveSafeInteger(1),
    provenance: provenanceV1(input.identity, input.simulationDigest),
    slot: Object.freeze({ id: "slot.m2e.neutral" as const }),
    savedAt: "2026-08-03T00:00:00.000Z" as MigrationRecordV1["savedAt"],
    stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
    snapshot: snapshot as unknown as MigrationSnapshotV1,
    simulationLineage: Object.freeze([]),
  });
}

function adoptionDeclarationV1(
  stored: DeepReadonly<BuildProvenanceV1>,
): PatchSetAdoptionDeclarationV1 {
  return Object.freeze({
    storyId: currentProvenanceV1.story.id,
    storyRevision: currentProvenanceV1.story.revision,
    stateContractRevision: currentProvenanceV1.resolved.stateContractRevision,
    stateContractDigest: currentProvenanceV1.resolved.stateContractDigest,
    fromSimulationDigest: stored.resolved.simulationDigest,
    toSimulationDigest: currentProvenanceV1.resolved.simulationDigest,
    simulationPatchSetDigest: currentProvenanceV1.resolved.patchSet.simulationDigest,
  });
}

function contextV1(
  registry: SaveStateMigrationRegistryV1,
  adoptionDeclarations: readonly PatchSetAdoptionDeclarationV1[],
): SaveImportValidationContextV1<LabGameStateV1, MigrationSnapshotV1, MigrationRecordV1> {
  return Object.freeze({
    codec: codecV1,
    currentStateContractRevision: labCurrentStateContractIdentityV1.stateContractRevision,
    saveStateMigrations: registry,
    classifyCompatibility(record: DeepReadonly<MigrationRecordV1>) {
      return classifySaveCompatibilityV1({
        stored: record.provenance,
        current: currentProvenanceV1,
        simulationLineage: record.simulationLineage,
        adoptionDeclarations,
        candidateCommandSequence: record.snapshot.commandSequence,
      });
    },
    validateReferences: () => Object.freeze([]),
    validateInvariants: () => Object.freeze([]),
  });
}

function releaseContextV1(
  registry: SaveStateMigrationRegistryV1 | null,
  current: DeepReadonly<BuildProvenanceV1>,
): SaveImportValidationContextV1<LabGameStateV1, ReleaseSnapshotV1, ReleaseRecordV1> {
  return Object.freeze({
    codec: releaseCodecV1,
    currentStateContractRevision: current.resolved.stateContractRevision,
    saveStateMigrations: registry,
    classifyCompatibility(record: DeepReadonly<ReleaseRecordV1>) {
      return classifySaveCompatibilityV1({
        stored: record.provenance,
        current,
        simulationLineage: record.simulationLineage,
        adoptionDeclarations: Object.freeze([]),
        candidateCommandSequence: record.snapshot.commandSequence,
      });
    },
    validateReferences: () => Object.freeze([]),
    validateInvariants: () => Object.freeze([]),
  });
}

function recordFromAdmittedBytesV1(bytes: Uint8Array): ReleaseRecordV1 {
  const decoded = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  return decoded as ReleaseRecordV1;
}

function collectGenericCurrentReleaseCaseV1(
  descriptor: SaveMigrationReleaseFixtureDescriptorV1,
  sourceBytesBefore: Uint8Array,
  sourceBytesAfter: Uint8Array,
  sourceRecord: ReleaseRecordV1,
): SaveMigrationReleaseCorpusParityCaseV1 {
  if (
    sourceRecord.formatRevision !== 1 ||
    sourceRecord.provenance.story.id !== descriptor.storyId ||
    sourceRecord.provenance.resolved.stateContractRevision !==
      descriptor.stateContractRevision ||
    sourceRecord.provenance.resolved.stateContractDigest !== descriptor.stateContractDigest ||
    sourceRecord.stateDigest !== digestCanonical("sillymaker:state:v1", sourceRecord.snapshot)
  ) throw new TypeError(`release fixture current identity mismatch: ${descriptor.id}`);
  if (!sameBytesV1(sourceBytesBefore, sourceBytesAfter)) {
    throw new TypeError(`release fixture validation mutated source bytes: ${descriptor.id}`);
  }
  return Object.freeze({
    fixtureId: descriptor.id,
    productId: descriptor.productId,
    source: Object.freeze({
      stateContractRevision: descriptor.stateContractRevision,
      stateContractDigest: descriptor.stateContractDigest,
      bytesDigest: descriptor.bytesDigest,
      stateDigest: sourceRecord.stateDigest,
    }),
    target: Object.freeze({
      stateContractRevision: descriptor.stateContractRevision,
      stateContractDigest: descriptor.stateContractDigest,
      stateDigest: sourceRecord.stateDigest,
    }),
    outcome: "exact",
    diagnostic: null,
    migrationSteps: Object.freeze([]),
    callbackCount: 0,
    sourceBytesPreserved: true,
  });
}

interface LoadedReleaseFixtureV1 {
  descriptor: SaveMigrationReleaseFixtureDescriptorV1;
  readonly bytes: Uint8Array;
  readonly bytesBeforeValidation: Uint8Array;
}

async function loadReleaseFixtureV1(
  descriptor: SaveMigrationReleaseFixtureDescriptorV1,
): Promise<LoadedReleaseFixtureV1> {
  const physicalBytes = await readReleaseFixtureBytesV1(descriptor);
  const physicalBytesBeforeAdmission = Uint8Array.from(physicalBytes);
  const admitted = admitSaveMigrationReleaseFixtureV1(
    descriptor,
    physicalBytes,
  );
  if (!sameBytesV1(physicalBytesBeforeAdmission, physicalBytes)) {
    throw new TypeError(`release fixture admission mutated physical bytes: ${descriptor.id}`);
  }
  return Object.freeze({
    descriptor,
    bytes: admitted.bytes,
    bytesBeforeValidation: Uint8Array.from(admitted.bytes),
  });
}

function collectReleaseCorpusCaseV1(
  loaded: LoadedReleaseFixtureV1,
  engineCurrentProvenance: DeepReadonly<BuildProvenanceV1>,
): SaveMigrationReleaseCorpusParityCaseV1 {
  const { descriptor } = loaded;
  const sourceRecord = recordFromAdmittedBytesV1(loaded.bytes);
  const engineLab = descriptor.productId === "engine-lab";
  if (!engineLab) {
    return collectGenericCurrentReleaseCaseV1(
      descriptor,
      loaded.bytesBeforeValidation,
      loaded.bytes,
      sourceRecord,
    );
  }
  const instrumented = instrumentDeterminismSaveStateMigrationRegistryV1(
    labSaveStateMigrationRegistryV1,
  );
  const result = validateSaveImportCandidateV1(
    loaded.bytes,
    releaseContextV1(instrumented.registry, engineCurrentProvenance),
  );
  if (result.kind !== "exact") {
    const code = "code" in result ? result.code : result.kind;
    throw new TypeError(`release fixture validation failed: ${descriptor.id}:${code}`);
  }
  const callbackCount = instrumented.readCallbackCount();
  const migrationSteps = result.migration?.steps.map(({ migrationId }) => migrationId) ?? [];
  if (!sameBytesV1(loaded.bytesBeforeValidation, loaded.bytes)) {
    throw new TypeError(`release fixture validation mutated source bytes: ${descriptor.id}`);
  }
  return Object.freeze({
    fixtureId: descriptor.id,
    productId: descriptor.productId,
    source: Object.freeze({
      stateContractRevision: descriptor.stateContractRevision,
      stateContractDigest: descriptor.stateContractDigest,
      bytesDigest: descriptor.bytesDigest,
      stateDigest: sourceRecord.stateDigest,
    }),
    target: Object.freeze({
      stateContractRevision: result.candidate.provenance.resolved.stateContractRevision,
      stateContractDigest: result.candidate.provenance.resolved.stateContractDigest,
      stateDigest: result.candidate.stateDigest,
    }),
    outcome: "exact",
    diagnostic: null,
    migrationSteps: Object.freeze(migrationSteps),
    callbackCount,
    sourceBytesPreserved: true,
  });
}

async function collectReleaseCorpusV1(): Promise<
  readonly SaveMigrationReleaseCorpusParityCaseV1[]
> {
  const loaded = await Promise.all(saveMigrationReleaseCorpusV1.map(loadReleaseFixtureV1));
  const engineCurrent = loaded.find(({ descriptor }) => descriptor.id === "engine-lab-state-6");
  if (engineCurrent === undefined) {
    throw new TypeError("Engine Lab current release fixture missing");
  }
  const engineCurrentProvenance = recordFromAdmittedBytesV1(
    engineCurrent.bytes,
  ).provenance;
  return Object.freeze(
    loaded.map((fixture) => collectReleaseCorpusCaseV1(fixture, engineCurrentProvenance)),
  );
}

function compactStateV1(state: DeepReadonly<LabGameStateV1>): CompactMigratedLabStateV1 {
  const opacity = state.simulation.stage.layers.flatMap((layer) =>
    layer.entries.map(({ placement }) => placement.opacityPermille)
  );
  return Object.freeze({
    samplesCollected: state.simulation.samples.collected,
    procedurePhase: state.simulation.procedure.phase,
    stageContractRevision: state.simulation.stage.contractRevision,
    stageEntryCount: opacity.length,
    stageOpacityPermille: Object.freeze(opacity),
    narrativeHistoryCount: state.simulation.narrative.history.entries.length,
    narrativeRapport: state.simulation.narrative.rapport,
    walletCredits: state.simulation.wallet.credits,
  });
}

function sameBytesV1(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function runCaseV1(input: {
  readonly caseId: MigrationCaseIdV1;
  readonly identity: SaveStateContractIdentityV1;
  readonly state: StrictJsonValueV1;
  readonly registry: SaveStateMigrationRegistryV1;
  readonly adoption: boolean;
}): SaveStateMigrationDeterminismCaseV1 {
  const simulationDigest = input.adoption
    ? historicalSimulationDigestV1
    : currentSimulationDigestV1;
  const record = recordV1({ identity: input.identity, state: input.state, simulationDigest });
  const sourceBytes = canonicalJsonBytes(record);
  const sourceBytesBefore = new Uint8Array(sourceBytes);
  const instrumented = instrumentDeterminismSaveStateMigrationRegistryV1(input.registry);
  const declarations = input.adoption
    ? Object.freeze([adoptionDeclarationV1(record.provenance)])
    : Object.freeze([]);
  const result = validateSaveImportCandidateV1(
    sourceBytes,
    contextV1(instrumented.registry, declarations),
  );
  const sourceBytesPreserved = sameBytesV1(sourceBytesBefore, sourceBytes);
  if (!sourceBytesPreserved) throw new TypeError("migration validation mutated source bytes");
  const callbackCount = instrumented.readCallbackCount();

  if (result.kind === "exact" || result.kind === "adopted") {
    if (result.migration === null) throw new TypeError("migration receipt missing");
    return Object.freeze({
      caseId: input.caseId,
      outcome: result.kind,
      code: null,
      phase: null,
      callbackCount,
      normalizedOutput: compactStateV1(result.candidate.snapshot.state),
      sourceStateDigest: record.stateDigest,
      migratedStateDigest: result.migration.migratedStateDigest,
      receipt: result.migration,
      attempt: null,
      adoption: result.kind === "adopted" ? result.adoption : null,
      sourceBytesPreserved: true,
    });
  }
  if (result.kind === "rejected" || result.kind === "faulted") {
    const attempt = "migrationAttempt" in result ? result.migrationAttempt : null;
    return Object.freeze({
      caseId: input.caseId,
      outcome: result.kind,
      code: result.code,
      phase: attempt?.failingPhase ?? null,
      callbackCount,
      normalizedOutput: null,
      sourceStateDigest: record.stateDigest,
      migratedStateDigest: attempt?.migratedStateDigest ?? null,
      receipt: null,
      attempt,
      adoption: null,
      sourceBytesPreserved: true,
    });
  }
  throw new TypeError(`unexpected migration vector outcome: ${result.kind}`);
}

const conformanceNamespaceV1 = parseSaveStateMigrationNamespaceV1(
  "state.e2e.engine-lab.conformance",
);

function conformanceRegistryV1(
  migrationId: string,
  migrate: SaveStateMigrationStepV1["migrate"],
): SaveStateMigrationRegistryV1 {
  return defineSaveStateMigrationRegistryV1({
    namespace: conformanceNamespaceV1,
    minimumSupported: labStateContractIdentityRevision5V1,
    current: labCurrentStateContractIdentityV1,
    steps: Object.freeze([
      Object.freeze({
        migrationId: parseSaveStateMigrationIdV1(migrationId),
        namespace: conformanceNamespaceV1,
        from: labStateContractIdentityRevision5V1,
        to: labCurrentStateContractIdentityV1,
        references: Object.freeze({ renames: Object.freeze([]), deletions: Object.freeze([]) }),
        migrate,
      }),
    ]),
  });
}

const rejectedRegistryV1 = conformanceRegistryV1(
  "migration.engine-lab.conformance.reject",
  () =>
    Object.freeze({
      kind: "rejected" as const,
      reasonCode: parseSaveStateMigrationReasonCodeV1("migration.engine-lab.conformance.rejected"),
    }),
);
const throwingRegistryV1 = conformanceRegistryV1(
  "migration.engine-lab.conformance.throw",
  () => {
    throw new TypeError("private conformance failure");
  },
);
const invalidOutputRegistryV1 = conformanceRegistryV1(
  "migration.engine-lab.conformance.invalid-output",
  (() => ({ kind: "migrated" })) as unknown as SaveStateMigrationStepV1["migrate"],
);

/** Executes all M2e cases through the real migration integration path. */
export async function collectSaveStateMigrationVectorV1(): Promise<
  SaveStateMigrationDeterminismVectorV1
> {
  return Object.freeze({
    schemaVersion: 1,
    cases: Object.freeze([
      runCaseV1({
        caseId: "one_step",
        identity: labStateContractIdentityRevision5V1,
        state: historicalStateRevision5V1,
        registry: labSaveStateMigrationRegistryV1,
        adoption: false,
      }),
      runCaseV1({
        caseId: "two_step",
        identity: labStateContractIdentityRevision4V1,
        state: historicalStateRevision4V1,
        registry: labSaveStateMigrationRegistryV1,
        adoption: false,
      }),
      runCaseV1({
        caseId: "explicit_reject",
        identity: labStateContractIdentityRevision5V1,
        state: historicalStateRevision5V1,
        registry: rejectedRegistryV1,
        adoption: false,
      }),
      runCaseV1({
        caseId: "callback_throw",
        identity: labStateContractIdentityRevision5V1,
        state: historicalStateRevision5V1,
        registry: throwingRegistryV1,
        adoption: false,
      }),
      runCaseV1({
        caseId: "invalid_output",
        identity: labStateContractIdentityRevision5V1,
        state: historicalStateRevision5V1,
        registry: invalidOutputRegistryV1,
        adoption: false,
      }),
      runCaseV1({
        caseId: "migration_plus_adoption",
        identity: labStateContractIdentityRevision4V1,
        state: historicalStateRevision4V1,
        registry: labSaveStateMigrationRegistryV1,
        adoption: true,
      }),
    ]),
    releaseCorpus: await collectReleaseCorpusV1(),
  });
}

const expectedRevision3V1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(3),
  stateContractDigest: parseDigest(
    "sha256:15b2ba494428229ab0354ed2e3668b56046a6c3f340569872d07f78db7193f64",
  ),
});
const expectedRevision4V1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(4),
  stateContractDigest: parseDigest(
    "sha256:42d426e6fb95566cf38787ee1de8c32f853b1e3eb4a16003c05fbfb109408667",
  ),
});
const expectedRevision5V1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(5),
  stateContractDigest: parseDigest(
    "sha256:c6407d9e0b5bd4d93fbe6e54d61fc62f59d209892d71a663a70190a4970735e3",
  ),
});
const expectedRevision6V1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(6),
  stateContractDigest: parseDigest(
    "sha256:2919caedc31ba996a3c48091b70d78d7ae002e2049f2dd3ddd1ccb8b5f16628a",
  ),
});
const expectedRevision4SourceDigestV1 = parseDigest(
  "sha256:b3ed32df507c0cb29f22da0260a0bd67a4bdcc8ba38a8df4bb061f27304c6258",
);
const expectedRevision5SourceDigestV1 = parseDigest(
  "sha256:b26574952975aaa002cb03990f439d6594e46f1435fd7a025c7ef86ba1576d58",
);
const expectedMigratedDigestV1 = parseDigest(
  "sha256:6c33dbf47034d46c05c279be204f58c24ec74348c79743a4277abe759059a551",
);
const expectedStep4To5V1 = Object.freeze({
  migrationId: parseSaveStateMigrationIdV1("migration.engine-lab.revision-4-to-5"),
  from: expectedRevision4V1,
  to: expectedRevision5V1,
});
const expectedStep5To6V1 = Object.freeze({
  migrationId: parseSaveStateMigrationIdV1("migration.engine-lab.revision-5-to-6"),
  from: expectedRevision5V1,
  to: expectedRevision6V1,
});
const expectedOutputV1: CompactMigratedLabStateV1 = Object.freeze({
  samplesCollected: 0,
  procedurePhase: "idle",
  stageContractRevision: 3,
  stageEntryCount: 1,
  stageOpacityPermille: Object.freeze([1000]),
  narrativeHistoryCount: 0,
  narrativeRapport: 0,
  walletCredits: 0,
});

function expectedReceiptV1(input: {
  readonly source: SaveStateContractIdentityV1;
  readonly steps: SaveStateMigrationReceiptV1["steps"];
  readonly sourceStateDigest: Digest;
}): SaveStateMigrationReceiptV1 {
  return Object.freeze({
    namespace: parseSaveStateMigrationNamespaceV1("state.e2e.engine-lab"),
    source: input.source,
    target: expectedRevision6V1,
    steps: input.steps,
    sourceStateDigest: input.sourceStateDigest,
    migratedStateDigest: expectedMigratedDigestV1,
  });
}

function expectedAttemptV1(input: {
  readonly migrationId: string;
  readonly failingPhase: SaveStateMigrationAttemptV1["failingPhase"];
}): SaveStateMigrationAttemptV1 {
  return Object.freeze({
    namespace: parseSaveStateMigrationNamespaceV1("state.e2e.engine-lab.conformance"),
    source: expectedRevision5V1,
    target: expectedRevision6V1,
    sourceStateDigest: expectedRevision5SourceDigestV1,
    completedSteps: Object.freeze([]),
    failingStep: Object.freeze({
      migrationId: parseSaveStateMigrationIdV1(input.migrationId),
      from: expectedRevision5V1,
      to: expectedRevision6V1,
    }),
    failingPhase: input.failingPhase,
    migratedStateDigest: null,
  });
}

const expectedOneStepReceiptV1 = expectedReceiptV1({
  source: expectedRevision5V1,
  steps: Object.freeze([expectedStep5To6V1]),
  sourceStateDigest: expectedRevision5SourceDigestV1,
});
const expectedTwoStepReceiptV1 = expectedReceiptV1({
  source: expectedRevision4V1,
  steps: Object.freeze([expectedStep4To5V1, expectedStep5To6V1]),
  sourceStateDigest: expectedRevision4SourceDigestV1,
});

/** Hand-maintained exact JSON oracle for Deno and all three browser engines. */
export const saveStateMigrationVectorExpectedV1: SaveStateMigrationDeterminismVectorV1 = Object
  .freeze({
    schemaVersion: 1,
    cases: Object.freeze([
      Object.freeze({
        caseId: "one_step",
        outcome: "exact",
        code: null,
        phase: null,
        callbackCount: 1,
        normalizedOutput: expectedOutputV1,
        sourceStateDigest: expectedRevision5SourceDigestV1,
        migratedStateDigest: expectedMigratedDigestV1,
        receipt: expectedOneStepReceiptV1,
        attempt: null,
        adoption: null,
        sourceBytesPreserved: true,
      }),
      Object.freeze({
        caseId: "two_step",
        outcome: "exact",
        code: null,
        phase: null,
        callbackCount: 2,
        normalizedOutput: expectedOutputV1,
        sourceStateDigest: expectedRevision4SourceDigestV1,
        migratedStateDigest: expectedMigratedDigestV1,
        receipt: expectedTwoStepReceiptV1,
        attempt: null,
        adoption: null,
        sourceBytesPreserved: true,
      }),
      Object.freeze({
        caseId: "explicit_reject",
        outcome: "rejected",
        code: "migration.rejected",
        phase: "callback_rejected",
        callbackCount: 1,
        normalizedOutput: null,
        sourceStateDigest: expectedRevision5SourceDigestV1,
        migratedStateDigest: null,
        receipt: null,
        attempt: expectedAttemptV1({
          migrationId: "migration.engine-lab.conformance.reject",
          failingPhase: "callback_rejected",
        }),
        adoption: null,
        sourceBytesPreserved: true,
      }),
      Object.freeze({
        caseId: "callback_throw",
        outcome: "faulted",
        code: "migration.callback_threw",
        phase: "callback",
        callbackCount: 1,
        normalizedOutput: null,
        sourceStateDigest: expectedRevision5SourceDigestV1,
        migratedStateDigest: null,
        receipt: null,
        attempt: expectedAttemptV1({
          migrationId: "migration.engine-lab.conformance.throw",
          failingPhase: "callback",
        }),
        adoption: null,
        sourceBytesPreserved: true,
      }),
      Object.freeze({
        caseId: "invalid_output",
        outcome: "rejected",
        code: "migration.output_invalid",
        phase: "result_envelope",
        callbackCount: 1,
        normalizedOutput: null,
        sourceStateDigest: expectedRevision5SourceDigestV1,
        migratedStateDigest: null,
        receipt: null,
        attempt: expectedAttemptV1({
          migrationId: "migration.engine-lab.conformance.invalid-output",
          failingPhase: "result_envelope",
        }),
        adoption: null,
        sourceBytesPreserved: true,
      }),
      Object.freeze({
        caseId: "migration_plus_adoption",
        outcome: "adopted",
        code: null,
        phase: null,
        callbackCount: 2,
        normalizedOutput: expectedOutputV1,
        sourceStateDigest: expectedRevision4SourceDigestV1,
        migratedStateDigest: expectedMigratedDigestV1,
        receipt: expectedTwoStepReceiptV1,
        attempt: null,
        adoption: Object.freeze({
          fromSimulationDigest: parseDigest(
            "sha256:4a5e02240be6846f67c4b2ff3b7aaed306af122795174a149745d7d376bf6944",
          ),
          toSimulationDigest: parseDigest(
            "sha256:1c3915e64d5e0e563b863673ffe61a82ade9496ca14b9059eba3c71202f575bd",
          ),
          viaSimulationPatchSetDigest: parseDigest(
            "sha256:305a698eec1013cb873388f49c31f9487b189da863795982ec489d0674f1da79",
          ),
          adoptedAtCommandSequence: parseNonNegativeSafeInteger(7),
        }),
        sourceBytesPreserved: true,
      }),
    ]),
    releaseCorpus: Object.freeze([
      Object.freeze({
        fixtureId: "engine-lab-state-3",
        productId: "engine-lab",
        source: Object.freeze({
          stateContractRevision: 3,
          stateContractDigest: expectedRevision3V1.stateContractDigest,
          bytesDigest: parseDigest(
            "sha256:e0eb1e44ab26d9f14730c47e6f950b954bf71292cdb8cb93054f59b9dc5154b4",
          ),
          stateDigest: parseDigest(
            "sha256:1679d8854ae96eb70009a1de3c8ff7106e67a1e93a29b7278beb4c3e034bca0b",
          ),
        }),
        target: Object.freeze({
          stateContractRevision: 6,
          stateContractDigest: expectedRevision6V1.stateContractDigest,
          stateDigest: parseDigest(
            "sha256:d6e5383e9fd7e024dcce4bc87570ffac0a661e5cf880f69fe2877192fe5b8ed9",
          ),
        }),
        outcome: "exact",
        diagnostic: null,
        migrationSteps: Object.freeze([
          "migration.engine-lab.revision-3-to-4",
          "migration.engine-lab.revision-4-to-5",
          "migration.engine-lab.revision-5-to-6",
        ]),
        callbackCount: 3,
        sourceBytesPreserved: true,
      }),
      Object.freeze({
        fixtureId: "engine-lab-state-4",
        productId: "engine-lab",
        source: Object.freeze({
          stateContractRevision: 4,
          stateContractDigest: expectedRevision4V1.stateContractDigest,
          bytesDigest: parseDigest(
            "sha256:84c463a6544fbf95cdc864b5cbc1b0685ccabd874433a82aa9faf9871baab5d3",
          ),
          stateDigest: parseDigest(
            "sha256:6639e7ea42cb4aede04e423a7db75e5a95fc3fc113be005e3dd14a0284bc46a4",
          ),
        }),
        target: Object.freeze({
          stateContractRevision: 6,
          stateContractDigest: expectedRevision6V1.stateContractDigest,
          stateDigest: parseDigest(
            "sha256:d6e5383e9fd7e024dcce4bc87570ffac0a661e5cf880f69fe2877192fe5b8ed9",
          ),
        }),
        outcome: "exact",
        diagnostic: null,
        migrationSteps: Object.freeze([
          "migration.engine-lab.revision-4-to-5",
          "migration.engine-lab.revision-5-to-6",
        ]),
        callbackCount: 2,
        sourceBytesPreserved: true,
      }),
      Object.freeze({
        fixtureId: "engine-lab-state-5",
        productId: "engine-lab",
        source: Object.freeze({
          stateContractRevision: 5,
          stateContractDigest: expectedRevision5V1.stateContractDigest,
          bytesDigest: parseDigest(
            "sha256:64455b23ea779f6749d98c9a3915e10dfad1bf36049e33b4743cbd38c268d6b6",
          ),
          stateDigest: parseDigest(
            "sha256:db57e8ec50a820ac5edd2461b7867bbc175ca0d71ba6a8d92cc00da1e2b9b01e",
          ),
        }),
        target: Object.freeze({
          stateContractRevision: 6,
          stateContractDigest: expectedRevision6V1.stateContractDigest,
          stateDigest: parseDigest(
            "sha256:d6e5383e9fd7e024dcce4bc87570ffac0a661e5cf880f69fe2877192fe5b8ed9",
          ),
        }),
        outcome: "exact",
        diagnostic: null,
        migrationSteps: Object.freeze(["migration.engine-lab.revision-5-to-6"]),
        callbackCount: 1,
        sourceBytesPreserved: true,
      }),
      Object.freeze({
        fixtureId: "engine-lab-state-6",
        productId: "engine-lab",
        source: Object.freeze({
          stateContractRevision: 6,
          stateContractDigest: expectedRevision6V1.stateContractDigest,
          bytesDigest: parseDigest(
            "sha256:909b28a2c75197df7bad1358a1067baceee1361ba8d40355452b4ebeda745238",
          ),
          stateDigest: parseDigest(
            "sha256:d6e5383e9fd7e024dcce4bc87570ffac0a661e5cf880f69fe2877192fe5b8ed9",
          ),
        }),
        target: Object.freeze({
          stateContractRevision: 6,
          stateContractDigest: expectedRevision6V1.stateContractDigest,
          stateDigest: parseDigest(
            "sha256:d6e5383e9fd7e024dcce4bc87570ffac0a661e5cf880f69fe2877192fe5b8ed9",
          ),
        }),
        outcome: "exact",
        diagnostic: null,
        migrationSteps: Object.freeze([]),
        callbackCount: 0,
        sourceBytesPreserved: true,
      }),
      Object.freeze({
        fixtureId: "cat-cafe-state-1",
        productId: "cat-cafe",
        source: Object.freeze({
          stateContractRevision: 1,
          stateContractDigest: parseDigest(
            "sha256:a0f26c983c47fa89b599141ae3d2b8e7653a8cd32533152d17e440bcafc8dd26",
          ),
          bytesDigest: parseDigest(
            "sha256:5c5eb77ae42a964cb4a8925450e174399d2d70db761e17b865e9c03bcaa3e479",
          ),
          stateDigest: parseDigest(
            "sha256:d0a093896429c55e88c447ff90116af9d0362932d23710aace06c541faec41a3",
          ),
        }),
        target: Object.freeze({
          stateContractRevision: 1,
          stateContractDigest: parseDigest(
            "sha256:a0f26c983c47fa89b599141ae3d2b8e7653a8cd32533152d17e440bcafc8dd26",
          ),
          stateDigest: parseDigest(
            "sha256:d0a093896429c55e88c447ff90116af9d0362932d23710aace06c541faec41a3",
          ),
        }),
        outcome: "exact",
        diagnostic: null,
        migrationSteps: Object.freeze([]),
        callbackCount: 0,
        sourceBytesPreserved: true,
      }),
    ]),
  });
