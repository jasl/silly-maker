// SPDX-License-Identifier: MIT
import {
  defineSaveStateMigrationRegistryV1,
  readSaveStateMigrationRegistryInternalV1,
} from "../contracts/save-state-migration.ts";
import type {
  SaveStateContractIdentityV1,
  SaveStateMigrationIdV1,
  SaveStateMigrationNamespaceV1,
  SaveStateMigrationRegistryV1,
  SaveStateMigrationStepV1,
} from "../contracts/save-state-migration.ts";

export { canonicalJsonBytes } from "../contracts/canonical-json.ts";
export { digestBytes, digestCanonical } from "../contracts/digest.ts";
export type { PatchSetAdoptionDeclarationV1 } from "../contracts/hotfix.ts";
export type {
  SaveCodecContextV1,
  SaveImportValidationContextV1,
  SaveRecordEnvelopeV1,
  SimulationAdoptionV1,
} from "../contracts/persistence.ts";
export type { BuildProvenanceV1 } from "../contracts/provenance.ts";
export { rngStateV1Schema } from "../contracts/rng.ts";
export type { RngStateV1 } from "../contracts/rng.ts";
export {
  defineSaveStateMigrationRegistryV1,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
  parseSaveStateMigrationReasonCodeV1,
} from "../contracts/save-state-migration.ts";
export type {
  SaveStateContractIdentityV1,
  SaveStateMigrationAttemptV1,
  SaveStateMigrationReceiptV1,
  SaveStateMigrationRegistryV1,
  SaveStateMigrationStepV1,
} from "../contracts/save-state-migration.ts";
export { createGameSnapshotEnvelopeSchemaV1 } from "../contracts/snapshot.ts";
export type { GameSnapshotEnvelopeV1 } from "../contracts/snapshot.ts";
export type { StrictJsonValueV1 } from "../contracts/strict-json.ts";
export {
  parseDigest,
  parseNonNegativeSafeInteger,
  parsePositiveSafeInteger,
} from "../contracts/values.ts";
export type { DeepReadonly, Digest, RuntimeSchemaV1 } from "../contracts/values.ts";
export { createSaveRecordEnvelopeSchemaV1 } from "../contracts/persistence.ts";
export {
  admitSaveMigrationReleaseFixtureV1,
  saveMigrationReleaseCorpusV1,
} from "./save-migration-release-corpus.ts";
export type { SaveMigrationReleaseFixtureDescriptorV1 } from "./save-migration-release-corpus.ts";

export {
  classifySaveCompatibilityV1,
  validateSaveImportCandidateV1,
} from "../runtime/persistence/compatibility.ts";

export interface DeterminismSaveStateMigrationRegistryStepV1 {
  readonly migrationId: SaveStateMigrationIdV1;
  readonly from: SaveStateContractIdentityV1;
  readonly to: SaveStateContractIdentityV1;
  readonly migrate: SaveStateMigrationStepV1["migrate"];
}

export interface DeterminismSaveStateMigrationRegistryInspectionV1 {
  readonly namespace: SaveStateMigrationNamespaceV1;
  readonly minimumSupported: SaveStateContractIdentityV1;
  readonly current: SaveStateContractIdentityV1;
  readonly steps: readonly DeterminismSaveStateMigrationRegistryStepV1[];
}

/** @internal Test/tooling-only exact registry view; production APIs remain opaque. */
export function inspectDeterminismSaveStateMigrationRegistryV1(
  registry: SaveStateMigrationRegistryV1,
): DeterminismSaveStateMigrationRegistryInspectionV1 {
  const declaration = readSaveStateMigrationRegistryInternalV1(registry);
  return Object.freeze({
    namespace: declaration.namespace,
    minimumSupported: declaration.minimumSupported,
    current: declaration.current,
    steps: Object.freeze(
      declaration.steps.map((step) =>
        Object.freeze({
          migrationId: step.migrationId,
          from: step.from,
          to: step.to,
          migrate: step.migrate,
        })
      ),
    ),
  });
}

export interface InstrumentedDeterminismSaveStateMigrationRegistryV1 {
  readonly registry: SaveStateMigrationRegistryV1;
  readonly readCallbackCount: () => number;
}

/** @internal Test-only wrapper that counts actual callback entries without production mutation. */
export function instrumentDeterminismSaveStateMigrationRegistryV1(
  registry: SaveStateMigrationRegistryV1,
): InstrumentedDeterminismSaveStateMigrationRegistryV1 {
  const declaration = readSaveStateMigrationRegistryInternalV1(registry);
  let callbackCount = 0;
  const instrumented = defineSaveStateMigrationRegistryV1({
    namespace: declaration.namespace,
    minimumSupported: declaration.minimumSupported,
    current: declaration.current,
    steps: Object.freeze(
      declaration.steps.map((step) =>
        Object.freeze({
          ...step,
          migrate: ((state) => {
            callbackCount += 1;
            return step.migrate(state);
          }) satisfies SaveStateMigrationStepV1["migrate"],
        })
      ),
    ),
  });
  return Object.freeze({
    registry: instrumented,
    readCallbackCount: () => callbackCount,
  });
}
