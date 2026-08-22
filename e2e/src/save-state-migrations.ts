// SPDX-License-Identifier: MIT
import type {
  SaveStateContractIdentityV1,
  SaveStateMigrationStepV1,
  StrictJsonValueV1,
} from "@sillymaker/base/authoring/save-state-migration";
import {
  defineSaveStateMigrationRegistryV1,
  parseDigest,
  parsePositiveSafeInteger,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
  parseSaveStateMigrationReasonCodeV1,
} from "@sillymaker/base/authoring/save-state-migration";

type JsonObjectV1 = Readonly<Record<string, StrictJsonValueV1>>;

const namespaceV1 = parseSaveStateMigrationNamespaceV1("state.e2e.engine-lab");
const invalidRevision3StateV1 = parseSaveStateMigrationReasonCodeV1(
  "migration.engine-lab.invalid-revision-3-state",
);
const invalidRevision4StateV1 = parseSaveStateMigrationReasonCodeV1(
  "migration.engine-lab.invalid-revision-4-state",
);
const invalidRevision5StateV1 = parseSaveStateMigrationReasonCodeV1(
  "migration.engine-lab.invalid-revision-5-state",
);

export const labStateContractIdentityRevision3V1: SaveStateContractIdentityV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(3),
  stateContractDigest: parseDigest(
    "sha256:15b2ba494428229ab0354ed2e3668b56046a6c3f340569872d07f78db7193f64",
  ),
});

export const labStateContractIdentityRevision4V1: SaveStateContractIdentityV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(4),
  stateContractDigest: parseDigest(
    "sha256:42d426e6fb95566cf38787ee1de8c32f853b1e3eb4a16003c05fbfb109408667",
  ),
});

export const labStateContractIdentityRevision5V1: SaveStateContractIdentityV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(5),
  stateContractDigest: parseDigest(
    "sha256:c6407d9e0b5bd4d93fbe6e54d61fc62f59d209892d71a663a70190a4970735e3",
  ),
});

export const labCurrentStateContractIdentityV1: SaveStateContractIdentityV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(6),
  stateContractDigest: parseDigest(
    "sha256:2919caedc31ba996a3c48091b70d78d7ae002e2049f2dd3ddd1ccb8b5f16628a",
  ),
});

function jsonObjectV1(value: StrictJsonValueV1 | undefined): JsonObjectV1 | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObjectV1
    : null;
}

function rejectedV1(reasonCode: ReturnType<typeof parseSaveStateMigrationReasonCodeV1>) {
  return Object.freeze({ kind: "rejected" as const, reasonCode });
}

export const migrateLabStateRevision3To4V1: SaveStateMigrationStepV1["migrate"] = (state) => {
  const root = jsonObjectV1(state);
  const simulation = jsonObjectV1(root?.simulation);
  const narrative = jsonObjectV1(simulation?.narrative);
  if (
    root === null || simulation === null || narrative === null ||
    Object.hasOwn(narrative, "history")
  ) {
    return rejectedV1(invalidRevision3StateV1);
  }
  return Object.freeze({
    kind: "migrated" as const,
    state: Object.freeze({
      ...root,
      simulation: Object.freeze({
        ...simulation,
        narrative: Object.freeze({
          ...narrative,
          history: Object.freeze({ entries: Object.freeze([]) }),
        }),
      }),
    }),
  });
};

function migrateStageRevision2To3V1(
  value: StrictJsonValueV1 | undefined,
): StrictJsonValueV1 | null {
  const stage = jsonObjectV1(value);
  if (stage === null || stage.contractRevision !== 2 || !Array.isArray(stage.layers)) return null;
  const layers: StrictJsonValueV1[] = [];
  for (const layerValue of stage.layers) {
    const layer = jsonObjectV1(layerValue);
    if (layer === null || !Array.isArray(layer.entries)) return null;
    const entries: StrictJsonValueV1[] = [];
    for (const entryValue of layer.entries) {
      const entry = jsonObjectV1(entryValue);
      const placement = jsonObjectV1(entry?.placement);
      if (entry === null || placement === null || Object.hasOwn(placement, "opacityPermille")) {
        return null;
      }
      entries.push(Object.freeze({
        ...entry,
        placement: Object.freeze({ ...placement, opacityPermille: 1000 }),
      }));
    }
    layers.push(Object.freeze({ ...layer, entries: Object.freeze(entries) }));
  }
  return Object.freeze({ ...stage, contractRevision: 3, layers: Object.freeze(layers) });
}

export const migrateLabStateRevision4To5V1: SaveStateMigrationStepV1["migrate"] = (state) => {
  const root = jsonObjectV1(state);
  const simulation = jsonObjectV1(root?.simulation);
  const narrative = jsonObjectV1(simulation?.narrative);
  const stage = migrateStageRevision2To3V1(simulation?.stage);
  if (
    root === null || simulation === null || narrative === null || stage === null ||
    !Object.hasOwn(narrative, "history") || Object.hasOwn(narrative, "rapport") ||
    Object.hasOwn(simulation, "wallet")
  ) {
    return rejectedV1(invalidRevision4StateV1);
  }
  return Object.freeze({
    kind: "migrated" as const,
    state: Object.freeze({
      ...root,
      simulation: Object.freeze({
        ...simulation,
        stage,
        narrative: Object.freeze({ ...narrative, rapport: 0 }),
        wallet: Object.freeze({ credits: 0 }),
      }),
    }),
  });
};

export const migrateLabStateRevision5To6V1: SaveStateMigrationStepV1["migrate"] = (state) => {
  const root = jsonObjectV1(state);
  const simulation = jsonObjectV1(root?.simulation);
  if (
    root === null || simulation === null || !Object.hasOwn(simulation, "wallet") ||
    Object.hasOwn(simulation, "monitors")
  ) {
    return rejectedV1(invalidRevision5StateV1);
  }
  // Revision 6 adds the lab.monitors slice: no monitor had existed, so the
  // initial value (empty accumulator, zero counters, collector off) is the
  // only faithful backfill.
  return Object.freeze({
    kind: "migrated" as const,
    state: Object.freeze({
      ...root,
      simulation: Object.freeze({
        ...simulation,
        monitors: Object.freeze({
          accumulator: Object.freeze({}),
          gaugeLevel: 0,
          ambientIgnitions: 0,
          collectorEngaged: false,
          collectorUnits: 0,
        }),
      }),
    }),
  });
};

const emptyReferenceChangesV1 = Object.freeze({
  renames: Object.freeze([]),
  deletions: Object.freeze([]),
});

export const labSaveStateMigrationRegistryV1 = defineSaveStateMigrationRegistryV1({
  namespace: namespaceV1,
  minimumSupported: labStateContractIdentityRevision3V1,
  current: labCurrentStateContractIdentityV1,
  steps: Object.freeze([
    Object.freeze({
      migrationId: parseSaveStateMigrationIdV1("migration.engine-lab.revision-3-to-4"),
      namespace: namespaceV1,
      from: labStateContractIdentityRevision3V1,
      to: labStateContractIdentityRevision4V1,
      references: emptyReferenceChangesV1,
      migrate: migrateLabStateRevision3To4V1,
    }),
    Object.freeze({
      migrationId: parseSaveStateMigrationIdV1("migration.engine-lab.revision-4-to-5"),
      namespace: namespaceV1,
      from: labStateContractIdentityRevision4V1,
      to: labStateContractIdentityRevision5V1,
      references: emptyReferenceChangesV1,
      migrate: migrateLabStateRevision4To5V1,
    }),
    Object.freeze({
      migrationId: parseSaveStateMigrationIdV1("migration.engine-lab.revision-5-to-6"),
      namespace: namespaceV1,
      from: labStateContractIdentityRevision5V1,
      to: labCurrentStateContractIdentityV1,
      references: emptyReferenceChangesV1,
      migrate: migrateLabStateRevision5To6V1,
    }),
  ]),
});
