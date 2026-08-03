// SPDX-License-Identifier: MIT
import {
  canonicalJsonBytes,
  classifySaveCompatibilityV1,
  createGameSnapshotEnvelopeSchemaV1,
  createSaveRecordEnvelopeSchemaV1,
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
  labStateContractIdentityRevision3V1,
  labStateContractIdentityRevision4V1,
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

export interface SaveStateMigrationDeterminismVectorV1 {
  readonly schemaVersion: 1;
  readonly cases: readonly SaveStateMigrationDeterminismCaseV1[];
}

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

const historicalStateRevision3V1 = Object.freeze({
  simulation: Object.freeze({
    samples: Object.freeze({ collected: 0 }),
    procedure: Object.freeze({ phase: "idle", stepsTaken: 0 }),
    stage: historicalStageRevision2V1,
    narrative: historicalNarrativeRevision3V1,
  }),
}) as StrictJsonValueV1;

const historicalStateRevision4V1 = Object.freeze({
  simulation: Object.freeze({
    samples: Object.freeze({ collected: 0 }),
    procedure: Object.freeze({ phase: "idle", stepsTaken: 0 }),
    stage: historicalStageRevision2V1,
    narrative: historicalNarrativeRevision4V1,
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
  adoptionDeclaration: PatchSetAdoptionDeclarationV1 | null,
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
        adoptionDeclaration,
        candidateCommandSequence: record.snapshot.commandSequence,
      });
    },
    validateReferences: () => Object.freeze([]),
    validateInvariants: () => Object.freeze([]),
  });
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
  const declaration = input.adoption ? adoptionDeclarationV1(record.provenance) : null;
  const result = validateSaveImportCandidateV1(
    sourceBytes,
    contextV1(instrumented.registry, declaration),
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
    minimumSupported: labStateContractIdentityRevision4V1,
    current: labCurrentStateContractIdentityV1,
    steps: Object.freeze([
      Object.freeze({
        migrationId: parseSaveStateMigrationIdV1(migrationId),
        namespace: conformanceNamespaceV1,
        from: labStateContractIdentityRevision4V1,
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
  (() =>
    Object.freeze({
      kind: "migrated",
      state: historicalStateRevision4V1,
      extra: true,
    })) as SaveStateMigrationStepV1["migrate"],
);

/** Executes all M2e cases through the real migration integration path. */
export function collectSaveStateMigrationVectorV1(): SaveStateMigrationDeterminismVectorV1 {
  return Object.freeze({
    schemaVersion: 1,
    cases: Object.freeze([
      runCaseV1({
        caseId: "one_step",
        identity: labStateContractIdentityRevision4V1,
        state: historicalStateRevision4V1,
        registry: labSaveStateMigrationRegistryV1,
        adoption: false,
      }),
      runCaseV1({
        caseId: "two_step",
        identity: labStateContractIdentityRevision3V1,
        state: historicalStateRevision3V1,
        registry: labSaveStateMigrationRegistryV1,
        adoption: false,
      }),
      runCaseV1({
        caseId: "explicit_reject",
        identity: labStateContractIdentityRevision4V1,
        state: historicalStateRevision4V1,
        registry: rejectedRegistryV1,
        adoption: false,
      }),
      runCaseV1({
        caseId: "callback_throw",
        identity: labStateContractIdentityRevision4V1,
        state: historicalStateRevision4V1,
        registry: throwingRegistryV1,
        adoption: false,
      }),
      runCaseV1({
        caseId: "invalid_output",
        identity: labStateContractIdentityRevision4V1,
        state: historicalStateRevision4V1,
        registry: invalidOutputRegistryV1,
        adoption: false,
      }),
      runCaseV1({
        caseId: "migration_plus_adoption",
        identity: labStateContractIdentityRevision3V1,
        state: historicalStateRevision3V1,
        registry: labSaveStateMigrationRegistryV1,
        adoption: true,
      }),
    ]),
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
const expectedRevision4SourceDigestV1 = parseDigest(
  "sha256:b3ed32df507c0cb29f22da0260a0bd67a4bdcc8ba38a8df4bb061f27304c6258",
);
const expectedRevision3SourceDigestV1 = parseDigest(
  "sha256:f01859baf1688d2ea613ec3e72de6e817f8202cbf4dcbabef73ef26f13ecc1a2",
);
const expectedMigratedDigestV1 = parseDigest(
  "sha256:b26574952975aaa002cb03990f439d6594e46f1435fd7a025c7ef86ba1576d58",
);
const expectedStep3To4V1 = Object.freeze({
  migrationId: parseSaveStateMigrationIdV1("migration.engine-lab.revision-3-to-4"),
  from: expectedRevision3V1,
  to: expectedRevision4V1,
});
const expectedStep4To5V1 = Object.freeze({
  migrationId: parseSaveStateMigrationIdV1("migration.engine-lab.revision-4-to-5"),
  from: expectedRevision4V1,
  to: expectedRevision5V1,
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
    target: expectedRevision5V1,
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
    source: expectedRevision4V1,
    target: expectedRevision5V1,
    sourceStateDigest: expectedRevision4SourceDigestV1,
    completedSteps: Object.freeze([]),
    failingStep: Object.freeze({
      migrationId: parseSaveStateMigrationIdV1(input.migrationId),
      from: expectedRevision4V1,
      to: expectedRevision5V1,
    }),
    failingPhase: input.failingPhase,
    migratedStateDigest: null,
  });
}

const expectedOneStepReceiptV1 = expectedReceiptV1({
  source: expectedRevision4V1,
  steps: Object.freeze([expectedStep4To5V1]),
  sourceStateDigest: expectedRevision4SourceDigestV1,
});
const expectedTwoStepReceiptV1 = expectedReceiptV1({
  source: expectedRevision3V1,
  steps: Object.freeze([expectedStep3To4V1, expectedStep4To5V1]),
  sourceStateDigest: expectedRevision3SourceDigestV1,
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
        sourceStateDigest: expectedRevision4SourceDigestV1,
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
        sourceStateDigest: expectedRevision3SourceDigestV1,
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
        sourceStateDigest: expectedRevision4SourceDigestV1,
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
        sourceStateDigest: expectedRevision4SourceDigestV1,
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
        sourceStateDigest: expectedRevision4SourceDigestV1,
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
        sourceStateDigest: expectedRevision3SourceDigestV1,
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
  });
