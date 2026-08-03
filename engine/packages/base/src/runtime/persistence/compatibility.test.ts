// SPDX-License-Identifier: MIT
import { describe, expect, it, vi } from "vitest";

import { canonicalJsonBytes } from "../../contracts/canonical-json.ts";
import { digestBytes, digestCanonical } from "../../contracts/digest.ts";
import type { PatchSetAdoptionDeclarationV1, PatchSetIdentityV1 } from "../../contracts/hotfix.ts";
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
import type {
  SaveCodecContextV1,
  SaveCompatibilityClassificationV1,
  SaveImportInvariantViewV1,
  SaveImportValidationContextV1,
  SaveRecordEnvelopeV1,
  SimulationAdoptionV1,
} from "../../contracts/persistence.ts";
import { createSaveRecordEnvelopeSchemaV1 } from "../../contracts/persistence.ts";
import type {
  DeepReadonly,
  Digest,
  NonNegativeSafeInteger,
  RuntimeSchemaV1,
} from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger, parsePositiveSafeInteger } from "../../contracts/values.ts";
import { classifySaveCompatibilityV1, validateSaveImportCandidateV1 } from "./compatibility.ts";

const digestV1 = (label: string): Digest =>
  digestBytes(new TextEncoder().encode(`compatibility:${label}`));

function makePatchSetV1(label = "same", simulationLabel = label): PatchSetIdentityV1 {
  return Object.freeze({
    digest: digestV1(`patch-set:${label}`),
    simulationDigest: digestV1(`simulation-patch-set:${simulationLabel}`),
    presentationDigest: digestV1(`presentation-patch-set:${label}`),
    appliedHotfixes: Object.freeze([]),
  });
}

interface ProvenanceOptionsV1 {
  readonly storyId?: string;
  readonly storyRevision?: number;
  readonly storyDigest?: Digest;
  readonly engineVersion?: string;
  readonly engineDigest?: Digest;
  readonly stateContractRevision?: number;
  readonly stateContractDigest?: Digest;
  readonly simulationDigest?: Digest;
  readonly presentationDigest?: Digest;
  readonly patchSet?: PatchSetIdentityV1;
}

function makeProvenanceV1(options: ProvenanceOptionsV1 = {}): BuildProvenanceV1 {
  return Object.freeze({
    story: Object.freeze({
      id: options.storyId ?? "story.synthetic",
      revision: parsePositiveSafeInteger(options.storyRevision ?? 1),
      digest: options.storyDigest ?? digestV1("story"),
    }),
    engine: Object.freeze({
      version: options.engineVersion ?? "1.0.0",
      digest: options.engineDigest ?? digestV1("engine"),
    }),
    resolved: Object.freeze({
      stateContractRevision: parsePositiveSafeInteger(options.stateContractRevision ?? 1),
      stateContractDigest: options.stateContractDigest ?? digestV1("state-contract"),
      simulationDigest: options.simulationDigest ?? digestV1("simulation"),
      presentationDigest: options.presentationDigest ?? digestV1("presentation"),
      patchSet: options.patchSet ?? makePatchSetV1(),
    }),
  });
}

function makeLineageV1(
  length: number,
  finalSimulationDigest: Digest,
): readonly SimulationAdoptionV1[] {
  const boundaries = Array.from({ length }, (_, index) => digestV1(`lineage:${index}`));
  return Object.freeze(
    boundaries.map((fromSimulationDigest, index) =>
      Object.freeze({
        fromSimulationDigest,
        toSimulationDigest: boundaries[index + 1] ?? finalSimulationDigest,
        viaSimulationPatchSetDigest: digestV1(`lineage-patch:${index}`),
        adoptedAtCommandSequence: parseNonNegativeSafeInteger(index),
      })
    ),
  );
}

function declarationV1(
  stored: BuildProvenanceV1,
  current: BuildProvenanceV1,
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

function classifyV1(input: {
  readonly stored?: BuildProvenanceV1;
  readonly current?: BuildProvenanceV1;
  readonly lineage?: readonly SimulationAdoptionV1[];
  readonly declaration?: PatchSetAdoptionDeclarationV1 | null;
}) {
  const stored = input.stored ?? makeProvenanceV1();
  const current = input.current ?? makeProvenanceV1();
  return classifySaveCompatibilityV1({
    stored,
    current,
    simulationLineage: input.lineage ?? Object.freeze([]),
    adoptionDeclaration: input.declaration ?? null,
    candidateCommandSequence: parseNonNegativeSafeInteger(7),
  });
}

describe("Save compatibility classification", () => {
  it("returns exact for every equal blocker, including 16 lineage entries", () => {
    const provenance = makeProvenanceV1();
    expect(
      classifyV1({
        stored: provenance,
        current: makeProvenanceV1({ engineVersion: "display-only-change" }),
        lineage: makeLineageV1(16, provenance.resolved.simulationDigest),
      }),
    ).toEqual({ kind: "exact", mismatches: [], warnings: [] });
  });

  it("reports every blocking mismatch once in the fixed order", () => {
    const stored = makeProvenanceV1();
    const current = makeProvenanceV1({
      storyId: "story.other",
      storyRevision: 2,
      stateContractRevision: 2,
      stateContractDigest: digestV1("state-contract.other"),
      engineDigest: digestV1("engine.other"),
      simulationDigest: digestV1("simulation.other"),
    });

    const result = classifyV1({ stored, current });
    expect(result.kind).toBe("inspect_only");
    if (result.kind !== "inspect_only") throw new TypeError("expected inspect-only");
    expect(result.mismatches.map(({ field }) => field)).toEqual([
      "story_id",
      "story_revision",
      "state_contract_revision",
      "state_contract_digest",
      "engine_digest",
      "simulation_digest",
    ]);
    expect(result.mismatches.map(({ code }) => code)).toEqual([
      "identity.story_id_mismatch",
      "identity.story_revision_mismatch",
      "identity.state_contract_revision_mismatch",
      "identity.state_contract_digest_mismatch",
      "identity.engine_digest_mismatch",
      "identity.simulation_digest_mismatch",
    ]);
  });

  it("keeps the three nonblocking warnings in their fixed order", () => {
    const stored = makeProvenanceV1();
    const current = makeProvenanceV1({
      storyDigest: digestV1("story.other"),
      presentationDigest: digestV1("presentation.other"),
      patchSet: makePatchSetV1("other"),
    });

    const result = classifyV1({ stored, current });
    expect(result).toMatchObject({ kind: "exact", mismatches: [] });
    if (result.kind !== "exact") throw new TypeError("expected exact compatibility");
    expect(result.warnings.map(({ field }) => field)).toEqual([
      "story_digest",
      "presentation_digest",
      "hotfix_set",
    ]);
  });

  it("creates an identity-eligible adoption candidate with the exact receipt", () => {
    const stored = makeProvenanceV1({ simulationDigest: digestV1("simulation.old") });
    const current = makeProvenanceV1({ simulationDigest: digestV1("simulation.new") });
    const result = classifyV1({
      stored,
      current,
      lineage: makeLineageV1(15, stored.resolved.simulationDigest),
      declaration: declarationV1(stored, current),
    });

    expect(result).toEqual({
      kind: "adoption_candidate",
      mismatches: [],
      warnings: [],
      adoption: {
        fromSimulationDigest: stored.resolved.simulationDigest,
        toSimulationDigest: current.resolved.simulationDigest,
        viaSimulationPatchSetDigest: current.resolved.patchSet.simulationDigest,
        adoptedAtCommandSequence: 7,
      },
    });
  });

  it.each(
    [
      "storyId",
      "storyRevision",
      "stateContractRevision",
      "stateContractDigest",
      "fromSimulationDigest",
      "toSimulationDigest",
      "simulationPatchSetDigest",
    ] as const,
  )("does not adopt when declaration.%s differs", (field) => {
    const stored = makeProvenanceV1({ simulationDigest: digestV1("simulation.old") });
    const current = makeProvenanceV1({ simulationDigest: digestV1("simulation.new") });
    const declaration = declarationV1(stored, current);
    const wrongValue = field === "storyRevision" || field === "stateContractRevision"
      ? parsePositiveSafeInteger(99)
      : field === "storyId"
      ? "story.wrong"
      : digestV1(`wrong:${field}`);

    expect(
      classifyV1({ stored, current, declaration: { ...declaration, [field]: wrongValue } }),
    ).toMatchObject({
      kind: "inspect_only",
      mismatches: [{ field: "simulation_digest", code: "identity.simulation_digest_mismatch" }],
    });
  });

  it("requires simulation to be the sole mismatch and enforces the lineage limit only for adoption", () => {
    const stored = makeProvenanceV1({ simulationDigest: digestV1("simulation.old") });
    const current = makeProvenanceV1({
      engineDigest: digestV1("engine.new"),
      simulationDigest: digestV1("simulation.new"),
    });
    expect(
      classifyV1({ stored, current, declaration: declarationV1(stored, current) }),
    ).toMatchObject({
      kind: "inspect_only",
      mismatches: [{ field: "engine_digest" }, { field: "simulation_digest" }],
    });

    const adoptableCurrent = makeProvenanceV1({ simulationDigest: digestV1("simulation.new") });
    expect(
      classifyV1({
        stored,
        current: adoptableCurrent,
        lineage: makeLineageV1(16, stored.resolved.simulationDigest),
        declaration: declarationV1(stored, adoptableCurrent),
      }),
    ).toEqual({ kind: "rejected", code: "compatibility.lineage_limit" });
  });

  it("allows a presentation-only PatchSet difference while preserving its warning", () => {
    const simulationPatch = "same-simulation-patch";
    const stored = makeProvenanceV1({
      simulationDigest: digestV1("simulation.old"),
      patchSet: makePatchSetV1("presentation.old", simulationPatch),
    });
    const current = makeProvenanceV1({
      simulationDigest: digestV1("simulation.new"),
      patchSet: makePatchSetV1("presentation.new", simulationPatch),
    });
    const result = classifyV1({ stored, current, declaration: declarationV1(stored, current) });

    expect(result).toMatchObject({ kind: "adoption_candidate" });
    if (result.kind !== "adoption_candidate") throw new TypeError("expected adoption candidate");
    expect(result.warnings.map(({ field }) => field)).toEqual(["hotfix_set"]);
  });
});

interface ValidationStateV1 {
  readonly referenceId: string;
}

interface ValidationSnapshotV1 {
  readonly state: ValidationStateV1;
  readonly rng: { readonly cursor: NonNegativeSafeInteger };
  readonly commandSequence: NonNegativeSafeInteger;
  readonly integrity: { readonly mode: "normal" };
}

interface ValidationSlotV1 {
  readonly storyId: string;
}

type ValidationRecordV1 = SaveRecordEnvelopeV1<
  ValidationSnapshotV1,
  BuildProvenanceV1,
  ValidationSlotV1,
  readonly SimulationAdoptionV1[]
>;

const validationSnapshotSchemaV1: RuntimeSchemaV1<ValidationSnapshotV1> = Object.freeze({
  parse(value: unknown) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("invalid validation Snapshot");
    }
    const snapshot = value as ValidationSnapshotV1;
    return Object.freeze({
      state: Object.freeze({ referenceId: snapshot.state.referenceId }),
      rng: Object.freeze({ cursor: parseNonNegativeSafeInteger(snapshot.rng.cursor) }),
      commandSequence: parseNonNegativeSafeInteger(snapshot.commandSequence),
      integrity: Object.freeze({ mode: snapshot.integrity.mode }),
    });
  },
});
const validationProvenanceSchemaV1: RuntimeSchemaV1<BuildProvenanceV1> = Object.freeze({
  parse(value: unknown) {
    const provenance = value as BuildProvenanceV1;
    return makeProvenanceV1({
      storyId: provenance.story.id,
      storyRevision: provenance.story.revision,
      storyDigest: provenance.story.digest,
      engineVersion: provenance.engine.version,
      engineDigest: provenance.engine.digest,
      stateContractRevision: provenance.resolved.stateContractRevision,
      stateContractDigest: provenance.resolved.stateContractDigest,
      simulationDigest: provenance.resolved.simulationDigest,
      presentationDigest: provenance.resolved.presentationDigest,
      patchSet: provenance.resolved.patchSet,
    });
  },
});
const validationSlotSchemaV1: RuntimeSchemaV1<ValidationSlotV1> = Object.freeze({
  parse(value: unknown) {
    return Object.freeze({ storyId: (value as ValidationSlotV1).storyId });
  },
});
const validationLineageSchemaV1: RuntimeSchemaV1<readonly SimulationAdoptionV1[]> = Object.freeze({
  parse(value: unknown) {
    return Object.freeze([...(value as readonly SimulationAdoptionV1[])]);
  },
});
const validationRecordSchemaV1 = createSaveRecordEnvelopeSchemaV1(
  validationSnapshotSchemaV1,
  validationProvenanceSchemaV1,
  validationSlotSchemaV1,
  validationLineageSchemaV1,
);

const validationCodecV1: SaveCodecContextV1<ValidationSnapshotV1, ValidationRecordV1> = Object
  .freeze({
    recordSchema: validationRecordSchemaV1,
    validateEnvelope() {},
  });

function makeValidationRecordV1(provenance = makeProvenanceV1()): ValidationRecordV1 {
  const snapshot = Object.freeze({
    state: Object.freeze({ referenceId: "reference.synthetic" }),
    rng: Object.freeze({ cursor: parseNonNegativeSafeInteger(11) }),
    commandSequence: parseNonNegativeSafeInteger(7),
    integrity: Object.freeze({ mode: "normal" as const }),
  });
  return Object.freeze({
    formatRevision: 1,
    recordRevision: parsePositiveSafeInteger(1),
    provenance,
    slot: Object.freeze({ storyId: provenance.story.id }),
    savedAt: "2026-07-14T00:00:00.000Z" as ValidationRecordV1["savedAt"],
    stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
    snapshot,
    simulationLineage: Object.freeze([]),
  });
}

function validationBytesV1(record = makeValidationRecordV1()): Uint8Array {
  return canonicalJsonBytes(record);
}

function validationContextV1(input: {
  readonly classification: SaveCompatibilityClassificationV1;
  readonly referenceErrors?: readonly string[];
  readonly invariantErrors?: readonly string[];
  readonly referenceThrows?: boolean;
  readonly saveStateMigrations?: SaveStateMigrationRegistryV1 | null;
  readonly currentStateContractRevision?: number;
}) {
  const classifyCompatibility = vi.fn(
    (_record: Readonly<ValidationRecordV1>) => input.classification,
  );
  const validateReferences = vi.fn((_state: Readonly<ValidationStateV1>) => {
    if (input.referenceThrows) throw new Error("validator bug");
    return input.referenceErrors ?? Object.freeze([]);
  });
  const validateInvariants = vi.fn(
    (_view: Readonly<SaveImportInvariantViewV1<ValidationStateV1>>) =>
      input.invariantErrors ?? Object.freeze([]),
  );
  const context: SaveImportValidationContextV1<
    ValidationStateV1,
    ValidationSnapshotV1,
    ValidationRecordV1
  > = Object.freeze({
    codec: validationCodecV1,
    currentStateContractRevision: parsePositiveSafeInteger(
      input.currentStateContractRevision ?? makeProvenanceV1().resolved.stateContractRevision,
    ),
    saveStateMigrations: input.saveStateMigrations ?? null,
    classifyCompatibility,
    validateReferences,
    validateInvariants,
  });
  return Object.freeze({ context, classifyCompatibility, validateReferences, validateInvariants });
}

function uncheckedClassificationV1(value: unknown): SaveCompatibilityClassificationV1 {
  return value as SaveCompatibilityClassificationV1;
}

const exactV1: Extract<SaveCompatibilityClassificationV1, { readonly kind: "exact" }> = Object
  .freeze({
    kind: "exact" as const,
    mismatches: Object.freeze([] as const),
    warnings: Object.freeze([]),
  });

const validationMigrationNamespaceV1 = parseSaveStateMigrationNamespaceV1(
  "state.validation.aggregate",
);

function validationMigrationIdentityV1(
  revision: number,
  label: string,
): SaveStateContractIdentityV1 {
  return Object.freeze({
    stateContractRevision: parsePositiveSafeInteger(revision),
    stateContractDigest: digestV1(`state-contract.${label}`),
  });
}

function validationMigrationRegistryV1(
  identities: readonly [SaveStateContractIdentityV1, ...SaveStateContractIdentityV1[]],
  migrations: readonly SaveStateMigrationStepV1["migrate"][],
): SaveStateMigrationRegistryV1 {
  if (identities.length !== migrations.length + 1) {
    throw new TypeError("invalid validation migration fixture");
  }
  const steps = migrations.map((migrate, index) => {
    const from = identities[index];
    const to = identities[index + 1];
    if (from === undefined || to === undefined) {
      throw new TypeError("incomplete validation migration fixture");
    }
    return Object.freeze({
      migrationId: parseSaveStateMigrationIdV1(`migration.validation.${String(index + 1)}`),
      namespace: validationMigrationNamespaceV1,
      from,
      to,
      references: Object.freeze({ renames: Object.freeze([]), deletions: Object.freeze([]) }),
      migrate,
    });
  });
  const minimumSupported = identities[0];
  const current = identities.at(-1);
  if (minimumSupported === undefined || current === undefined) {
    throw new TypeError("empty validation migration fixture");
  }
  return defineSaveStateMigrationRegistryV1({
    namespace: validationMigrationNamespaceV1,
    minimumSupported,
    current,
    steps,
  });
}

function validationHistoricalRecordV1(
  source: SaveStateContractIdentityV1,
  snapshot: unknown = Object.freeze({
    state: Object.freeze({ legacyReferenceId: "reference.legacy" }),
    rng: Object.freeze({ cursor: 11 }),
    commandSequence: 7,
    integrity: Object.freeze({ mode: "normal" }),
  }),
) {
  const provenance = makeProvenanceV1({
    stateContractRevision: source.stateContractRevision,
    stateContractDigest: source.stateContractDigest,
  });
  return Object.freeze({
    ...makeValidationRecordV1(provenance),
    stateDigest: digestCanonical("sillymaker:state:v1", snapshot),
    snapshot,
  });
}

describe("Save import candidate validation", () => {
  it("passes State to references and an exact frozen sequence view to invariants", () => {
    const fixture = validationContextV1({ classification: exactV1 });
    const result = validateSaveImportCandidateV1(validationBytesV1(), fixture.context);

    expect(result).toMatchObject({ kind: "exact", mismatches: [], warnings: [], migration: null });
    expect(result).toHaveProperty("candidate");
    expect(fixture.validateReferences).toHaveBeenCalledOnce();
    expect(fixture.validateInvariants).toHaveBeenCalledOnce();
    expect(fixture.validateReferences.mock.calls[0]?.[0]).toEqual({
      referenceId: "reference.synthetic",
    });
    expect(fixture.validateReferences.mock.calls[0]?.[0]).not.toHaveProperty("commandSequence");
    const invariantView = fixture.validateInvariants.mock.calls[0]?.[0];
    expect(invariantView).toEqual({
      state: { referenceId: "reference.synthetic" },
      commandSequence: 7,
    });
    expect(Object.keys(invariantView ?? {})).toEqual(["state", "commandSequence"]);
    expect(Object.isFrozen(invariantView)).toBe(true);
    expect(invariantView).not.toHaveProperty("rng");
    expect(invariantView).not.toHaveProperty("integrity");
  });

  it("keeps a current-revision candidate callback-free when a registry is configured", () => {
    const source = validationMigrationIdentityV1(1, "current-branch.source");
    const target = validationMigrationIdentityV1(2, "current-branch.target");
    const migrate = vi.fn((_state: unknown) =>
      Object.freeze({
        kind: "migrated" as const,
        state: Object.freeze({ referenceId: "reference.must-not-run" }),
      })
    ) as SaveStateMigrationStepV1["migrate"];
    const registry = validationMigrationRegistryV1([source, target], [migrate]);
    const provenance = makeProvenanceV1({
      stateContractRevision: target.stateContractRevision,
      stateContractDigest: target.stateContractDigest,
    });
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: target.stateContractRevision,
      saveStateMigrations: registry,
    });

    const result = validateSaveImportCandidateV1(
      validationBytesV1(makeValidationRecordV1(provenance)),
      fixture.context,
    );

    expect(result).toMatchObject({ kind: "exact", migration: null });
    expect(migrate).not.toHaveBeenCalled();
  });

  it("stops before invariants when stable references fail", () => {
    const fixture = validationContextV1({
      classification: exactV1,
      referenceErrors: ["reference.missing"],
    });

    expect(validateSaveImportCandidateV1(validationBytesV1(), fixture.context)).toEqual({
      kind: "rejected",
      code: "reference.unknown_id",
    });
    expect(fixture.validateInvariants).not.toHaveBeenCalled();
  });

  it("maps a returned invariant error without converting thrown bugs", () => {
    const fixture = validationContextV1({
      classification: exactV1,
      invariantErrors: ["invariant.synthetic"],
    });
    expect(validateSaveImportCandidateV1(validationBytesV1(), fixture.context)).toEqual({
      kind: "rejected",
      code: "invariant.failed",
    });

    const throwing = validationContextV1({ classification: exactV1, referenceThrows: true });
    expect(() => validateSaveImportCandidateV1(validationBytesV1(), throwing.context)).toThrow(
      "validator bug",
    );
  });

  it.each(["references", "invariants"] as const)(
    "throws for a sparse %s callback result",
    (stage) => {
      const sparse: string[] = [];
      sparse.length = 1;
      const fixture = validationContextV1({
        classification: exactV1,
        ...(stage === "references" ? { referenceErrors: sparse } : { invariantErrors: sparse }),
      });

      expect(() => validateSaveImportCandidateV1(validationBytesV1(), fixture.context)).toThrow(
        TypeError,
      );
      if (stage === "references") expect(fixture.validateInvariants).not.toHaveBeenCalled();
    },
  );

  it("promotes an adoption candidate only after both Story validators pass", () => {
    const adoption = Object.freeze({
      fromSimulationDigest: digestV1("simulation.old"),
      toSimulationDigest: digestV1("simulation.new"),
      viaSimulationPatchSetDigest: digestV1("patch.new"),
      adoptedAtCommandSequence: parseNonNegativeSafeInteger(7),
    });
    const fixture = validationContextV1({
      classification: Object.freeze({
        kind: "adoption_candidate",
        mismatches: Object.freeze([] as const),
        warnings: Object.freeze([]),
        adoption,
      }),
    });

    expect(validateSaveImportCandidateV1(validationBytesV1(), fixture.context)).toMatchObject({
      kind: "adopted",
      adoption,
      candidate: expect.any(Object),
      migration: null,
    });
  });

  it("migrates one historical State and derives receipt identity from normalized whole Snapshots", () => {
    const sourceProvenance = makeProvenanceV1({
      stateContractRevision: 1,
      stateContractDigest: digestV1("state-contract.old"),
    });
    const targetProvenance = makeProvenanceV1({
      stateContractRevision: 2,
      stateContractDigest: digestV1("state-contract.current"),
    });
    const sourceIdentity: SaveStateContractIdentityV1 = Object.freeze({
      stateContractRevision: sourceProvenance.resolved.stateContractRevision,
      stateContractDigest: sourceProvenance.resolved.stateContractDigest,
    });
    const targetIdentity: SaveStateContractIdentityV1 = Object.freeze({
      stateContractRevision: targetProvenance.resolved.stateContractRevision,
      stateContractDigest: targetProvenance.resolved.stateContractDigest,
    });
    const migrate = vi.fn((_state: unknown) =>
      Object.freeze({
        kind: "migrated" as const,
        state: Object.freeze({
          referenceId: "reference.migrated",
          discardedByCurrentSchema: "normalization evidence",
        }),
      })
    ) as SaveStateMigrationStepV1["migrate"];
    const registry = defineSaveStateMigrationRegistryV1({
      namespace: parseSaveStateMigrationNamespaceV1("state.validation.aggregate"),
      minimumSupported: sourceIdentity,
      current: targetIdentity,
      steps: [
        {
          migrationId: parseSaveStateMigrationIdV1("migration.validation.one"),
          namespace: parseSaveStateMigrationNamespaceV1("state.validation.aggregate"),
          from: sourceIdentity,
          to: targetIdentity,
          references: { renames: [], deletions: [] },
          migrate,
        },
      ],
    });
    const sourceSnapshot = Object.freeze({
      state: Object.freeze({ legacyReferenceId: "reference.legacy" }),
      rng: Object.freeze({ cursor: 11 }),
      commandSequence: 7,
      integrity: Object.freeze({ mode: "normal" as const }),
    });
    const sourceStateDigest = digestCanonical("sillymaker:state:v1", sourceSnapshot);
    const sourceLineage = makeLineageV1(1, sourceProvenance.resolved.simulationDigest);
    const annotation = Object.freeze({
      summary: Object.freeze(["Migration preservation"]),
      note: "Keep this note",
    });
    const versionStamp = Object.freeze({
      applicationVersion: "1.0.0",
      applicationCommit: "abc1234",
      engineVersion: "2.0.0",
      engineCommit: "def5678-dirty",
    });
    const sourceRecord = Object.freeze({
      ...makeValidationRecordV1(sourceProvenance),
      stateDigest: sourceStateDigest,
      snapshot: sourceSnapshot,
      simulationLineage: sourceLineage,
      annotation,
      versionStamp,
    });
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: 2,
      saveStateMigrations: registry,
    });

    const result = validateSaveImportCandidateV1(canonicalJsonBytes(sourceRecord), fixture.context);

    expect(result.kind).toBe("exact");
    if (result.kind !== "exact") throw new TypeError("expected migrated exact result");
    const expectedSnapshot = validationSnapshotSchemaV1.parse({
      ...sourceSnapshot,
      state: { referenceId: "reference.migrated" },
    });
    const migratedStateDigest = digestCanonical("sillymaker:state:v1", expectedSnapshot);
    expect(result.candidate).toMatchObject({
      provenance: {
        story: sourceProvenance.story,
        engine: sourceProvenance.engine,
        resolved: {
          ...sourceProvenance.resolved,
          stateContractRevision: targetIdentity.stateContractRevision,
          stateContractDigest: targetIdentity.stateContractDigest,
        },
      },
      stateDigest: migratedStateDigest,
      snapshot: expectedSnapshot,
    });
    expect(result.migration).toMatchObject({
      source: sourceIdentity,
      target: targetIdentity,
      sourceStateDigest,
      migratedStateDigest,
    });
    expect(result.migration?.migratedStateDigest).not.toBe(
      digestCanonical("sillymaker:state:v1", expectedSnapshot.state),
    );
    expect(result.candidate.snapshot.rng).toEqual(sourceSnapshot.rng);
    expect(result.candidate.snapshot.commandSequence).toBe(sourceSnapshot.commandSequence);
    expect(result.candidate.snapshot.integrity).toEqual(sourceSnapshot.integrity);
    expect(result.candidate.recordRevision).toBe(sourceRecord.recordRevision);
    expect(result.candidate.slot).toEqual(sourceRecord.slot);
    expect(result.candidate.savedAt).toBe(sourceRecord.savedAt);
    expect(result.candidate.simulationLineage).toEqual(sourceLineage);
    expect(result.candidate.annotation).toEqual(annotation);
    expect(result.candidate.versionStamp).toEqual(versionStamp);
    expect(migrate).toHaveBeenCalledOnce();
  });

  it("runs an exact two-step suffix before adoption and returns one aggregate receipt", () => {
    const source = validationMigrationIdentityV1(1, "two-step.source");
    const middle = validationMigrationIdentityV1(2, "two-step.middle");
    const target = validationMigrationIdentityV1(3, "two-step.target");
    const first = vi.fn((_state: unknown) =>
      Object.freeze({
        kind: "migrated" as const,
        state: Object.freeze({ referenceId: "reference.intermediate" }),
      })
    ) as SaveStateMigrationStepV1["migrate"];
    const second = vi.fn((state: unknown) => {
      expect(state).toEqual({ referenceId: "reference.intermediate" });
      return Object.freeze({
        kind: "migrated" as const,
        state: Object.freeze({ referenceId: "reference.final" }),
      });
    }) as SaveStateMigrationStepV1["migrate"];
    const registry = validationMigrationRegistryV1(
      [source, middle, target],
      [first, second],
    );
    const adoption = Object.freeze({
      fromSimulationDigest: digestV1("simulation.before-migration-adoption"),
      toSimulationDigest: digestV1("simulation.after-migration-adoption"),
      viaSimulationPatchSetDigest: digestV1("patch.migration-adoption"),
      adoptedAtCommandSequence: parseNonNegativeSafeInteger(7),
    });
    const fixture = validationContextV1({
      classification: Object.freeze({
        kind: "adoption_candidate",
        mismatches: Object.freeze([] as const),
        warnings: Object.freeze([]),
        adoption,
      }),
      currentStateContractRevision: 3,
      saveStateMigrations: registry,
    });

    const result = validateSaveImportCandidateV1(
      canonicalJsonBytes(validationHistoricalRecordV1(source)),
      fixture.context,
    );

    expect(result).toMatchObject({
      kind: "adopted",
      adoption,
      candidate: {
        provenance: {
          resolved: {
            stateContractRevision: target.stateContractRevision,
            stateContractDigest: target.stateContractDigest,
          },
        },
        snapshot: { state: { referenceId: "reference.final" } },
      },
      migration: {
        source,
        target,
        steps: [
          { from: source, to: middle },
          { from: middle, to: target },
        ],
      },
    });
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it("resolves the complete chain before interpreting a historical Snapshot shell", () => {
    const stored = validationMigrationIdentityV1(1, "below-minimum");
    const minimum = validationMigrationIdentityV1(2, "minimum");
    const target = validationMigrationIdentityV1(3, "target");
    const migrate = vi.fn((_state: unknown) =>
      Object.freeze({
        kind: "migrated" as const,
        state: Object.freeze({ referenceId: "reference.unreachable" }),
      })
    ) as SaveStateMigrationStepV1["migrate"];
    const registry = validationMigrationRegistryV1([minimum, target], [migrate]);
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: 3,
      saveStateMigrations: registry,
    });

    expect(
      validateSaveImportCandidateV1(
        canonicalJsonBytes(
          validationHistoricalRecordV1(stored, Object.freeze({ state: Object.freeze({}) })),
        ),
        fixture.context,
      ),
    ).toEqual({
      kind: "inspect_only",
      code: "migration.unavailable",
      storedStateContractRevision: stored.stateContractRevision,
      currentStateContractRevision: target.stateContractRevision,
    });
    expect(migrate).not.toHaveBeenCalled();
  });

  it("reports an exact snapshot-shell attempt before any migration callback", () => {
    const source = validationMigrationIdentityV1(1, "shell.source");
    const target = validationMigrationIdentityV1(2, "shell.target");
    const migrate = vi.fn((_state: unknown) =>
      Object.freeze({
        kind: "migrated" as const,
        state: Object.freeze({ referenceId: "reference.unreachable" }),
      })
    ) as SaveStateMigrationStepV1["migrate"];
    const registry = validationMigrationRegistryV1([source, target], [migrate]);
    const record = validationHistoricalRecordV1(
      source,
      Object.freeze({ state: Object.freeze({}) }),
    );
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: 2,
      saveStateMigrations: registry,
    });

    const result = validateSaveImportCandidateV1(canonicalJsonBytes(record), fixture.context);

    expect(result).toMatchObject({
      kind: "rejected",
      code: "envelope.schema_invalid",
      migrationAttempt: {
        source,
        target,
        sourceStateDigest: record.stateDigest,
        completedSteps: [],
        failingStep: null,
        failingPhase: "snapshot_shell",
        migratedStateDigest: null,
      },
    });
    expect(migrate).not.toHaveBeenCalled();
  });

  it.each(
    [
      ["explicit rejection", "migration.rejected", "callback_rejected"],
      ["invalid output", "migration.output_invalid", "output_admission"],
      ["throw", "migration.callback_threw", "callback"],
    ] as const,
  )("preserves the M2b attempt for %s", (_label, expectedCode, expectedPhase) => {
    const source = validationMigrationIdentityV1(1, `${expectedPhase}.source`);
    const target = validationMigrationIdentityV1(2, `${expectedPhase}.target`);
    let calls = 0;
    const migrate: SaveStateMigrationStepV1["migrate"] = (_state) => {
      calls += 1;
      if (expectedCode === "migration.rejected") {
        return Object.freeze({
          kind: "rejected",
          reasonCode: parseSaveStateMigrationReasonCodeV1("migration.validation.rejected"),
        });
      }
      if (expectedCode === "migration.output_invalid") {
        return Object.freeze({
          kind: "migrated",
          state: Object.freeze({ invalid: undefined }),
        }) as never;
      }
      throw new Error("private callback detail");
    };
    const registry = validationMigrationRegistryV1([source, target], [migrate]);
    const record = validationHistoricalRecordV1(source);
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: 2,
      saveStateMigrations: registry,
    });

    const result = validateSaveImportCandidateV1(canonicalJsonBytes(record), fixture.context);

    expect(result).toMatchObject({
      code: expectedCode,
      migrationAttempt: {
        source,
        target,
        sourceStateDigest: record.stateDigest,
        completedSteps: [],
        failingPhase: expectedPhase,
        migratedStateDigest: null,
      },
    });
    expect(calls).toBe(1);
    expect(fixture.classifyCompatibility).not.toHaveBeenCalled();
  });

  it("attaches post-chain phase evidence only after the final Snapshot digest exists", () => {
    const source = validationMigrationIdentityV1(1, "post-chain.source");
    const target = validationMigrationIdentityV1(2, "post-chain.target");
    const migrate: SaveStateMigrationStepV1["migrate"] = (_state) =>
      Object.freeze({
        kind: "migrated",
        state: Object.freeze({ referenceId: "reference.migrated" }),
      });
    const registry = validationMigrationRegistryV1([source, target], [migrate]);
    const record = validationHistoricalRecordV1(source);
    const bytes = canonicalJsonBytes(record);
    const inspectOnly: SaveCompatibilityClassificationV1 = Object.freeze({
      kind: "inspect_only",
      mismatches: Object.freeze(
        [
          Object.freeze({
            field: "story_id",
            code: "identity.story_id_mismatch",
            stored: "story.old",
            current: "story.current",
          }),
        ] as const,
      ),
      warnings: Object.freeze([]),
    });
    const cases = [
      {
        phase: "compatibility",
        fixture: validationContextV1({
          classification: inspectOnly,
          currentStateContractRevision: 2,
          saveStateMigrations: registry,
        }),
      },
      {
        phase: "references",
        fixture: validationContextV1({
          classification: exactV1,
          referenceErrors: ["reference.missing"],
          currentStateContractRevision: 2,
          saveStateMigrations: registry,
        }),
      },
      {
        phase: "invariants",
        fixture: validationContextV1({
          classification: exactV1,
          invariantErrors: ["invariant.failed"],
          currentStateContractRevision: 2,
          saveStateMigrations: registry,
        }),
      },
    ] as const;

    for (const entry of cases) {
      const result = validateSaveImportCandidateV1(bytes, entry.fixture.context);
      expect(result).toHaveProperty("migrationAttempt.failingPhase", entry.phase);
      expect(result).toHaveProperty("migrationAttempt.completedSteps", [
        expect.objectContaining({ from: source, to: target }),
      ]);
      expect(result).toHaveProperty(
        "migrationAttempt.sourceStateDigest",
        record.stateDigest,
      );
      expect(result).toHaveProperty(
        "migrationAttempt.migratedStateDigest",
        expect.stringMatching(/^sha256:/u),
      );
    }
  });

  it("attaches compatibility rejection evidence after the migrated digest exists", () => {
    const source = validationMigrationIdentityV1(1, "compatibility-reject.source");
    const target = validationMigrationIdentityV1(2, "compatibility-reject.target");
    const registry = validationMigrationRegistryV1([source, target], [
      (_state) =>
        Object.freeze({
          kind: "migrated" as const,
          state: Object.freeze({ referenceId: "reference.migrated" }),
        }),
    ]);
    const record = validationHistoricalRecordV1(source);
    const fixture = validationContextV1({
      classification: Object.freeze({
        kind: "rejected" as const,
        code: "compatibility.lineage_limit" as const,
      }),
      currentStateContractRevision: target.stateContractRevision,
      saveStateMigrations: registry,
    });

    expect(
      validateSaveImportCandidateV1(canonicalJsonBytes(record), fixture.context),
    ).toMatchObject({
      kind: "rejected",
      code: "compatibility.lineage_limit",
      migrationAttempt: {
        source,
        target,
        failingPhase: "compatibility",
        migratedStateDigest: expect.stringMatching(/^sha256:/u),
      },
    });
  });

  it("marks current Snapshot admission failure before a migrated digest exists", () => {
    const source = validationMigrationIdentityV1(1, "current-schema.source");
    const target = validationMigrationIdentityV1(2, "current-schema.target");
    const registry = validationMigrationRegistryV1([source, target], [
      (_state) =>
        Object.freeze({
          kind: "migrated" as const,
          state: Object.freeze({ referenceId: "reference.migrated" }),
        }),
    ]);
    const record = validationHistoricalRecordV1(
      source,
      Object.freeze({
        state: Object.freeze({ legacy: true }),
        rng: Object.freeze({ cursor: -1 }),
        commandSequence: 7,
        integrity: Object.freeze({ mode: "normal" }),
      }),
    );
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: 2,
      saveStateMigrations: registry,
    });

    const result = validateSaveImportCandidateV1(canonicalJsonBytes(record), fixture.context);

    expect(result).toMatchObject({
      kind: "rejected",
      code: "envelope.schema_invalid",
      migrationAttempt: {
        sourceStateDigest: record.stateDigest,
        completedSteps: [expect.objectContaining({ from: source, to: target })],
        failingStep: null,
        failingPhase: "current_snapshot_schema",
        migratedStateDigest: null,
      },
    });
    expect(fixture.classifyCompatibility).not.toHaveBeenCalled();
  });

  it("rejects accepted current-schema normalization of a non-State Snapshot axis", () => {
    const source = validationMigrationIdentityV1(1, "axis-preservation.source");
    const target = validationMigrationIdentityV1(2, "axis-preservation.target");
    const migrate = vi.fn((_state: unknown) =>
      Object.freeze({
        kind: "migrated" as const,
        state: Object.freeze({ referenceId: "reference.migrated" }),
      })
    ) as SaveStateMigrationStepV1["migrate"];
    const registry = validationMigrationRegistryV1([source, target], [migrate]);
    const normalizingSnapshotSchema: RuntimeSchemaV1<ValidationSnapshotV1> = Object.freeze({
      parse(value: unknown) {
        const parsed = validationSnapshotSchemaV1.parse(value);
        return Object.freeze({
          ...parsed,
          rng: Object.freeze({
            cursor: parseNonNegativeSafeInteger(Number(parsed.rng.cursor) + 1),
          }),
        });
      },
    });
    const codec: SaveCodecContextV1<ValidationSnapshotV1, ValidationRecordV1> = Object.freeze({
      recordSchema: createSaveRecordEnvelopeSchemaV1(
        normalizingSnapshotSchema,
        validationProvenanceSchemaV1,
        validationSlotSchemaV1,
        validationLineageSchemaV1,
      ),
      validateEnvelope() {},
    });
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: 2,
      saveStateMigrations: registry,
    });
    const context: typeof fixture.context = Object.freeze({ ...fixture.context, codec });

    const result = validateSaveImportCandidateV1(
      canonicalJsonBytes(validationHistoricalRecordV1(source)),
      context,
    );

    expect(result).toMatchObject({
      kind: "rejected",
      code: "envelope.schema_invalid",
      migrationAttempt: {
        failingPhase: "current_snapshot_schema",
        migratedStateDigest: null,
      },
    });
    expect(migrate).toHaveBeenCalledOnce();
    expect(fixture.classifyCompatibility).not.toHaveBeenCalled();
  });

  it("rejects a current schema that mutates a historical non-State axis in place", () => {
    const source = validationMigrationIdentityV1(1, "axis-alias.source");
    const target = validationMigrationIdentityV1(2, "axis-alias.target");
    const registry = validationMigrationRegistryV1([source, target], [
      (_state) =>
        Object.freeze({
          kind: "migrated" as const,
          state: Object.freeze({ referenceId: "reference.migrated" }),
        }),
    ]);
    const mutatingSnapshotSchema: RuntimeSchemaV1<ValidationSnapshotV1> = Object.freeze({
      parse(value: unknown) {
        const snapshot = value as {
          rng: { cursor: number };
        };
        snapshot.rng.cursor += 1;
        return validationSnapshotSchemaV1.parse(value);
      },
    });
    const codec: SaveCodecContextV1<ValidationSnapshotV1, ValidationRecordV1> = Object.freeze({
      recordSchema: createSaveRecordEnvelopeSchemaV1(
        mutatingSnapshotSchema,
        validationProvenanceSchemaV1,
        validationSlotSchemaV1,
        validationLineageSchemaV1,
      ),
      validateEnvelope() {},
    });
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: 2,
      saveStateMigrations: registry,
    });

    const result = validateSaveImportCandidateV1(
      canonicalJsonBytes(validationHistoricalRecordV1(source)),
      Object.freeze({ ...fixture.context, codec }),
    );

    expect(result).toMatchObject({
      kind: "rejected",
      code: "envelope.schema_invalid",
      migrationAttempt: {
        failingPhase: "current_snapshot_schema",
        migratedStateDigest: null,
      },
    });
    expect(fixture.classifyCompatibility).not.toHaveBeenCalled();
  });

  it("maps non-canonical current-schema output to current Snapshot admission failure", () => {
    const source = validationMigrationIdentityV1(1, "schema-output.source");
    const target = validationMigrationIdentityV1(2, "schema-output.target");
    const registry = validationMigrationRegistryV1([source, target], [
      (_state) =>
        Object.freeze({
          kind: "migrated" as const,
          state: Object.freeze({ referenceId: "reference.migrated" }),
        }),
    ]);
    const invalidOutputSchema: RuntimeSchemaV1<ValidationSnapshotV1> = Object.freeze({
      parse(value: unknown) {
        const parsed = validationSnapshotSchemaV1.parse(value);
        return {
          ...parsed,
          state: { referenceId: undefined },
        } as never;
      },
    });
    const codec: SaveCodecContextV1<ValidationSnapshotV1, ValidationRecordV1> = Object.freeze({
      recordSchema: createSaveRecordEnvelopeSchemaV1(
        invalidOutputSchema,
        validationProvenanceSchemaV1,
        validationSlotSchemaV1,
        validationLineageSchemaV1,
      ),
      validateEnvelope() {},
    });
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: 2,
      saveStateMigrations: registry,
    });

    expect(
      validateSaveImportCandidateV1(
        canonicalJsonBytes(validationHistoricalRecordV1(source)),
        Object.freeze({ ...fixture.context, codec }),
      ),
    ).toMatchObject({
      kind: "rejected",
      code: "envelope.schema_invalid",
      migrationAttempt: {
        failingPhase: "current_snapshot_schema",
        migratedStateDigest: null,
      },
    });
    expect(fixture.classifyCompatibility).not.toHaveBeenCalled();
  });

  it("runs cross-field admission against the final migrated whole-Snapshot digest", () => {
    const source = validationMigrationIdentityV1(1, "cross-field.source");
    const target = validationMigrationIdentityV1(2, "cross-field.target");
    const registry = validationMigrationRegistryV1([source, target], [
      (_state) =>
        Object.freeze({
          kind: "migrated" as const,
          state: Object.freeze({ referenceId: "reference.cross-field" }),
        }),
    ]);
    const validateEnvelope = vi.fn((record: DeepReadonly<ValidationRecordV1>) => {
      if (record.stateDigest !== digestCanonical("sillymaker:state:v1", record.snapshot)) {
        throw new TypeError("cross-field validator observed a stale digest");
      }
    });
    const codec: SaveCodecContextV1<ValidationSnapshotV1, ValidationRecordV1> = Object.freeze({
      recordSchema: validationRecordSchemaV1,
      validateEnvelope,
    });
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: 2,
      saveStateMigrations: registry,
    });
    const context: typeof fixture.context = Object.freeze({ ...fixture.context, codec });

    const result = validateSaveImportCandidateV1(
      canonicalJsonBytes(validationHistoricalRecordV1(source)),
      context,
    );

    expect(result).toMatchObject({
      kind: "exact",
      candidate: { snapshot: { state: { referenceId: "reference.cross-field" } } },
      migration: { source, target },
    });
    expect(validateEnvelope).toHaveBeenCalledOnce();
  });

  it("rejects cross-field mutation of the admitted migrated candidate", () => {
    const source = validationMigrationIdentityV1(1, "cross-field-alias.source");
    const target = validationMigrationIdentityV1(2, "cross-field-alias.target");
    const registry = validationMigrationRegistryV1([source, target], [
      (_state) =>
        Object.freeze({
          kind: "migrated" as const,
          state: Object.freeze({ referenceId: "reference.cross-field" }),
        }),
    ]);
    const mutableSnapshotSchema: RuntimeSchemaV1<ValidationSnapshotV1> = Object.freeze({
      parse(value: unknown) {
        const parsed = validationSnapshotSchemaV1.parse(value);
        return {
          state: { ...parsed.state },
          rng: { ...parsed.rng },
          commandSequence: parsed.commandSequence,
          integrity: { ...parsed.integrity },
        };
      },
    });
    const codec: SaveCodecContextV1<ValidationSnapshotV1, ValidationRecordV1> = Object.freeze({
      recordSchema: createSaveRecordEnvelopeSchemaV1(
        mutableSnapshotSchema,
        validationProvenanceSchemaV1,
        validationSlotSchemaV1,
        validationLineageSchemaV1,
      ),
      validateEnvelope(record: DeepReadonly<ValidationRecordV1>) {
        (record.snapshot.rng as { cursor: number }).cursor += 1;
      },
    });
    const fixture = validationContextV1({
      classification: exactV1,
      currentStateContractRevision: 2,
      saveStateMigrations: registry,
    });

    const result = validateSaveImportCandidateV1(
      canonicalJsonBytes(validationHistoricalRecordV1(source)),
      Object.freeze({ ...fixture.context, codec }),
    );

    expect(result).toMatchObject({
      kind: "rejected",
      code: "envelope.schema_invalid",
      migrationAttempt: {
        failingPhase: "current_snapshot_schema",
        migratedStateDigest: null,
      },
    });
    expect(fixture.classifyCompatibility).not.toHaveBeenCalled();
  });

  it("never validates or exposes a candidate for inspect-only input", () => {
    const fixture = validationContextV1({
      classification: Object.freeze({
        kind: "inspect_only",
        mismatches: Object.freeze(
          [
            Object.freeze({
              field: "story_id",
              code: "identity.story_id_mismatch",
              stored: "story.old",
              current: "story.current",
            }),
          ] as const,
        ),
        warnings: Object.freeze([]),
      }),
    });
    const result = validateSaveImportCandidateV1(validationBytesV1(), fixture.context);

    expect(result).toMatchObject({ kind: "inspect_only" });
    expect(result).not.toHaveProperty("candidate");
    expect(fixture.validateReferences).not.toHaveBeenCalled();
    expect(fixture.validateInvariants).not.toHaveBeenCalled();
  });

  it.each(
    [
      [
        "nonempty exact mismatches",
        {
          kind: "exact",
          mismatches: [
            {
              field: "story_id",
              code: "identity.story_id_mismatch",
              stored: "story.old",
              current: "story.current",
            },
          ],
          warnings: [],
        },
      ],
      ["malformed warning entries", { kind: "exact", mismatches: [], warnings: [{}] }],
      [
        "malformed inspect-only mismatches",
        { kind: "inspect_only", mismatches: [null], warnings: [] },
      ],
      [
        "an engine-owned migration-unavailable result",
        {
          kind: "inspect_only",
          code: "migration.unavailable",
          storedStateContractRevision: parsePositiveSafeInteger(1),
          currentStateContractRevision: parsePositiveSafeInteger(2),
        },
      ],
      [
        "missing adoption receipt",
        { kind: "adoption_candidate", mismatches: [], warnings: [], adoption: undefined },
      ],
      ["an extra branch field", { kind: "exact", mismatches: [], warnings: [], unexpected: true }],
      ["an invalid rejection code", { kind: "rejected", code: "identity.story_id_mismatch" }],
      [
        "unordered mismatches",
        {
          kind: "inspect_only",
          mismatches: [
            {
              field: "simulation_digest",
              code: "identity.simulation_digest_mismatch",
              stored: digestV1("simulation.old"),
              current: digestV1("simulation.current"),
            },
            {
              field: "story_id",
              code: "identity.story_id_mismatch",
              stored: "story.old",
              current: "story.current",
            },
          ],
          warnings: [],
        },
      ],
      [
        "unordered warnings",
        {
          kind: "exact",
          mismatches: [],
          warnings: [
            {
              field: "presentation_digest",
              code: "identity.presentation_digest_mismatch",
              stored: digestV1("presentation.old"),
              current: digestV1("presentation.current"),
            },
            {
              field: "story_digest",
              code: "identity.story_digest_mismatch",
              stored: digestV1("story.old"),
              current: digestV1("story.current"),
            },
          ],
        },
      ],
      [
        "a malformed nested PatchSet warning",
        {
          kind: "exact",
          mismatches: [],
          warnings: [
            {
              field: "hotfix_set",
              code: "identity.hotfix_set_mismatch",
              stored: { ...makePatchSetV1("old"), appliedHotfixes: [{}] },
              current: makePatchSetV1("current"),
            },
          ],
        },
      ],
      [
        "an invalid PatchSurface kind pairing",
        {
          kind: "exact",
          mismatches: [],
          warnings: [
            {
              field: "hotfix_set",
              code: "identity.hotfix_set_mismatch",
              stored: {
                ...makePatchSetV1("old"),
                appliedHotfixes: [
                  {
                    identity: {
                      id: "hotfix.invalid-pairing",
                      revision: parsePositiveSafeInteger(1),
                      digest: digestV1("hotfix.invalid-pairing"),
                    },
                    ordinal: parsePositiveSafeInteger(1),
                    replacements: [
                      {
                        surface: "simulation",
                        symbolId: "asset.invalid-pairing",
                        kind: "asset",
                        previousProviderDigest: digestV1("provider.before"),
                        nextProviderDigest: digestV1("provider.after"),
                      },
                    ],
                  },
                ],
              },
              current: makePatchSetV1("current"),
            },
          ],
        },
      ],
    ] as const,
  )("throws for a compatibility callback with %s", (_label, classification) => {
    const fixture = validationContextV1({
      classification: uncheckedClassificationV1(classification),
    });

    expect(() => validateSaveImportCandidateV1(validationBytesV1(), fixture.context)).toThrow(
      TypeError,
    );
    expect(fixture.validateReferences).not.toHaveBeenCalled();
    expect(fixture.validateInvariants).not.toHaveBeenCalled();
  });

  it("copies and deeply freezes a valid callback result before exposing it", () => {
    const warning = {
      field: "story_digest" as const,
      code: "identity.story_digest_mismatch" as const,
      stored: digestV1("story.old"),
      current: digestV1("story.current"),
    };
    const adoption = {
      fromSimulationDigest: digestV1("simulation.old"),
      toSimulationDigest: digestV1("simulation.new"),
      viaSimulationPatchSetDigest: digestV1("patch.new"),
      adoptedAtCommandSequence: parseNonNegativeSafeInteger(7),
    };
    const storedPatchSet = makePatchSetV1("old");
    const currentPatchSet = makePatchSetV1("current");
    const hotfixWarning = {
      field: "hotfix_set" as const,
      code: "identity.hotfix_set_mismatch" as const,
      stored: storedPatchSet,
      current: currentPatchSet,
    };
    const warnings = [warning, hotfixWarning];
    const fixture = validationContextV1({
      classification: uncheckedClassificationV1({
        kind: "adoption_candidate",
        mismatches: [],
        warnings,
        adoption,
      }),
    });

    const result = validateSaveImportCandidateV1(validationBytesV1(), fixture.context);

    expect(result).toMatchObject({ kind: "adopted", warnings, adoption });
    if (result.kind !== "adopted") throw new TypeError("expected adopted result");
    expect(result.warnings).not.toBe(warnings);
    expect(result.warnings[0]).not.toBe(warning);
    expect(result.adoption).not.toBe(adoption);
    expect(Object.isFrozen(result.warnings)).toBe(true);
    expect(Object.isFrozen(result.warnings[0])).toBe(true);
    expect(Object.isFrozen(result.adoption)).toBe(true);
    const normalizedHotfixWarning = result.warnings[1];
    if (normalizedHotfixWarning?.field !== "hotfix_set") {
      throw new TypeError("expected normalized Hotfix warning");
    }
    expect(normalizedHotfixWarning).not.toBe(hotfixWarning);
    expect(normalizedHotfixWarning.stored).not.toBe(storedPatchSet);
    expect(normalizedHotfixWarning.stored.appliedHotfixes).not.toBe(storedPatchSet.appliedHotfixes);
    expect(Object.isFrozen(normalizedHotfixWarning.stored)).toBe(true);
    expect(Object.isFrozen(normalizedHotfixWarning.stored.appliedHotfixes)).toBe(true);
  });

  it("preserves compatibility callback exceptions without running Story validators", () => {
    const fixture = validationContextV1({ classification: exactV1 });
    const callbackError = new Error("compatibility callback bug");
    const context: typeof fixture.context = Object.freeze({
      ...fixture.context,
      classifyCompatibility() {
        throw callbackError;
      },
    });

    expect(() => validateSaveImportCandidateV1(validationBytesV1(), context)).toThrow(
      callbackError,
    );
    expect(fixture.validateReferences).not.toHaveBeenCalled();
    expect(fixture.validateInvariants).not.toHaveBeenCalled();
  });

  it("stops before compatibility when state digest validation fails", () => {
    const fixture = validationContextV1({ classification: exactV1 });
    const record = makeValidationRecordV1();
    const bytes = canonicalJsonBytes({ ...record, stateDigest: digestV1("wrong") });

    expect(validateSaveImportCandidateV1(bytes, fixture.context)).toEqual({
      kind: "rejected",
      code: "digest.state_mismatch",
    });
    expect(fixture.classifyCompatibility).not.toHaveBeenCalled();
    expect(fixture.validateReferences).not.toHaveBeenCalled();
  });
});
