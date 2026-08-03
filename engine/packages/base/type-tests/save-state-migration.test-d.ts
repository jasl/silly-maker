// SPDX-License-Identifier: MIT
import {
  defineSaveStateMigrationRegistryV1,
  parseDigest,
  parsePositiveSafeInteger,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
  parseSaveStateMigrationReasonCodeV1,
} from "@sillymaker/base";
import type {
  DeepReadonly,
  GameSimulationTypeMapV1,
  SaveStateMigrationIdV1,
  SaveStateMigrationAttemptV1,
  SaveStateMigrationFailurePhaseV1,
  SaveStateMigrationReasonCodeV1,
  SaveStateMigrationReceiptV1,
  SaveStateMigrationRegistryV1,
  SaveStateMigrationStepResultV1,
  StrictJsonValueV1,
} from "@sillymaker/base";
import { defineSaveStateMigrationRegistryV1 as defineAuthoringRegistryV1 } from "@sillymaker/base/authoring";
import type { CoreGameApplicationDefinitionV1 } from "@sillymaker/base/runtime";
import { defineSaveStateMigrationRegistry } from "@sillymaker/base/story";

const namespace = parseSaveStateMigrationNamespaceV1("state.synthetic.aggregate");
const migrationId = parseSaveStateMigrationIdV1("migration.synthetic.1-to-2");
const reasonCode = parseSaveStateMigrationReasonCodeV1("migration.synthetic.rejected");
const first = {
  stateContractRevision: parsePositiveSafeInteger(1),
  stateContractDigest: parseDigest(`sha256:${"1".repeat(64)}`),
};
const second = {
  stateContractRevision: parsePositiveSafeInteger(2),
  stateContractDigest: parseDigest(`sha256:${"2".repeat(64)}`),
};
const sourceSnapshotDigest = parseDigest(`sha256:${"3".repeat(64)}`);
const migratedSnapshotDigest = parseDigest(`sha256:${"4".repeat(64)}`);

const migrate = (
  state: DeepReadonly<StrictJsonValueV1>,
): SaveStateMigrationStepResultV1 => {
  // @ts-expect-error migration input is deeply readonly
  state.value = 2;
  return { kind: "migrated", state };
};

export const registry: SaveStateMigrationRegistryV1 = defineSaveStateMigrationRegistryV1({
  namespace,
  minimumSupported: first,
  current: second,
  steps: [
    {
      migrationId,
      namespace,
      from: first,
      to: second,
      references: {
        renames: [],
        deletions: [
          {
            referenceSetId: "references.synthetic.scene",
            id: "scene.synthetic.deleted",
            resolution: { kind: "reject", reasonCode },
          },
        ],
      },
      migrate,
    },
  ],
});

export const storyRegistryAlias: SaveStateMigrationRegistryV1 = defineSaveStateMigrationRegistry({
  namespace,
  minimumSupported: first,
  current: first,
  steps: [],
});
export const authoringRegistry: SaveStateMigrationRegistryV1 = defineAuthoringRegistryV1({
  namespace,
  minimumSupported: first,
  current: first,
  steps: [],
});

type NeutralCoreDefinitionV1 = CoreGameApplicationDefinitionV1<
  unknown,
  unknown,
  GameSimulationTypeMapV1,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;
export const coreRegistry: NonNullable<NeutralCoreDefinitionV1["saveStateMigrations"]> = registry;

export const migrationFailurePhase: SaveStateMigrationFailurePhaseV1 = "output_admission";
export const migrationReceipt: SaveStateMigrationReceiptV1 = {
  namespace,
  source: first,
  target: second,
  steps: [{ migrationId, from: first, to: second }],
  sourceStateDigest: sourceSnapshotDigest,
  migratedStateDigest: migratedSnapshotDigest,
};
export const invalidEmptyMigrationReceipt: SaveStateMigrationReceiptV1 = {
  namespace,
  source: first,
  target: second,
  // @ts-expect-error successful migration receipts require a non-empty path
  steps: [],
  sourceStateDigest: sourceSnapshotDigest,
  migratedStateDigest: migratedSnapshotDigest,
};
export const migrationAttempt: SaveStateMigrationAttemptV1 = {
  namespace,
  source: first,
  target: second,
  sourceStateDigest: sourceSnapshotDigest,
  completedSteps: [],
  failingStep: { migrationId, from: first, to: second },
  failingPhase: migrationFailurePhase,
  migratedStateDigest: null,
};

// @ts-expect-error branded migration IDs require package admission
const invalidMigrationId: SaveStateMigrationIdV1 = "migration.synthetic.1-to-2";
// @ts-expect-error branded reason codes require package admission
const invalidReasonCode: SaveStateMigrationReasonCodeV1 = "migration.synthetic.rejected";
// @ts-expect-error official registries cannot be structurally forged
const invalidRegistry: SaveStateMigrationRegistryV1 = {};

const asynchronous = async (
  state: DeepReadonly<StrictJsonValueV1>,
): Promise<SaveStateMigrationStepResultV1> => ({ kind: "migrated", state });
defineSaveStateMigrationRegistryV1({
  namespace,
  minimumSupported: first,
  current: second,
  steps: [
    {
      migrationId,
      namespace,
      from: first,
      to: second,
      references: { renames: [], deletions: [] },
      // @ts-expect-error migration callbacks must return synchronously
      migrate: asynchronous,
    },
  ],
});

const narrowerStateCallback = (
  state: { readonly count: number },
): SaveStateMigrationStepResultV1 => ({ kind: "migrated", state });
defineSaveStateMigrationRegistryV1({
  namespace,
  minimumSupported: first,
  current: second,
  steps: [
    {
      migrationId,
      namespace,
      from: first,
      to: second,
      references: { renames: [], deletions: [] },
      // @ts-expect-error migration callbacks must accept every StrictJsonValue
      migrate: narrowerStateCallback,
    },
  ],
});

const declaredStep = registry as unknown as {
  readonly step: import("@sillymaker/base").SaveStateMigrationStepV1;
};
// @ts-expect-error normalized migration callback identity is readonly
declaredStep.step.migrate = migrate;

void invalidMigrationId;
void invalidReasonCode;
void invalidRegistry;
