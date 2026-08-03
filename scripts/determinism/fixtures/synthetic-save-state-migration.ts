// SPDX-License-Identifier: MIT
import {
  defineSaveStateMigrationRegistryV1,
  parseDigest,
  parsePositiveSafeInteger,
  parseSaveStateMigrationIdV1,
  parseSaveStateMigrationNamespaceV1,
} from "@sillymaker/base";

import { syntheticSaveStateMigrationCallbackV1 } from "./synthetic-save-state-migration-callback.ts";

const namespaceV1 = parseSaveStateMigrationNamespaceV1("state.synthetic.aggregate");
const sourceV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(1),
  stateContractDigest: parseDigest(
    "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  ),
});
const targetV1 = Object.freeze({
  stateContractRevision: parsePositiveSafeInteger(2),
  stateContractDigest: parseDigest(
    "sha256:2222222222222222222222222222222222222222222222222222222222222222",
  ),
});

function registryV1() {
  return defineSaveStateMigrationRegistryV1({
    namespace: namespaceV1,
    minimumSupported: sourceV1,
    current: targetV1,
    steps: Object.freeze([
      Object.freeze({
        migrationId: parseSaveStateMigrationIdV1("migration.synthetic.one"),
        namespace: namespaceV1,
        from: sourceV1,
        to: targetV1,
        references: Object.freeze({ renames: Object.freeze([]), deletions: Object.freeze([]) }),
        migrate: syntheticSaveStateMigrationCallbackV1,
      }),
    ]),
  });
}

export const syntheticSaveStateMigrationRegistryV1 = registryV1();
export const mismatchedSyntheticSaveStateMigrationRegistryV1 = registryV1();
export const syntheticSaveStateMigrationDefinitionV1 = Object.freeze({
  saveStateMigrations: syntheticSaveStateMigrationRegistryV1,
});
export const syntheticNoSaveStateMigrationDefinitionV1 = Object.freeze({});
