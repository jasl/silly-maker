// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import type { IndexedDbProgramPersistenceFacetV1 } from "../../../src/application/persistence/program-persistence-facet.ts";
import { translationPersistenceFacetIdV1 } from "./translation-persistence-contract.ts";

const storeNamesV1 = [
  "translation_batch_candidates",
  "translation_glossary_entries",
  "translation_workset_heads",
  "translation_workset_operations",
  "translation_workset_units",
] as const;

function exactNamesV1(actual: DOMStringList, expected: readonly string[]): boolean {
  return Array.from({ length: actual.length }, (_, index) => actual.item(index) ?? "")
    .join("\0") === expected.toSorted().join("\0");
}

function keyPathEqualV1(value: string | string[] | null, expected: string | string[]): boolean {
  return JSON.stringify(value) === JSON.stringify(expected);
}

function exactStoreV1(
  store: IDBObjectStore,
  keyPath: string | string[],
  indexes: readonly {
    readonly name: string;
    readonly keyPath: string | string[];
    readonly unique: boolean;
  }[] = [],
): boolean {
  if (!keyPathEqualV1(store.keyPath, keyPath) || store.autoIncrement) return false;
  if (!exactNamesV1(store.indexNames, indexes.map((entry) => entry.name))) return false;
  return indexes.every((expected) => {
    const index = store.index(expected.name);
    return keyPathEqualV1(index.keyPath, expected.keyPath) &&
      index.unique === expected.unique && !index.multiEntry;
  });
}

function createStoresV1(database: IDBDatabase): void {
  database.createObjectStore("translation_workset_heads", { keyPath: "processId" });
  const units = database.createObjectStore("translation_workset_units", {
    keyPath: ["processId", "order"],
  });
  units.createIndex("by_process_unit_id", ["processId", "unitId"], { unique: true });
  const glossary = database.createObjectStore("translation_glossary_entries", {
    keyPath: ["processId", "order"],
  });
  glossary.createIndex("by_process_entry_id", ["processId", "entryId"], { unique: true });
  database.createObjectStore("translation_workset_operations", {
    keyPath: ["processId", "operationId"],
  });
  database.createObjectStore("translation_batch_candidates", {
    keyPath: ["processId", "candidateId"],
  });
}

function hasExactSchemaV1(transaction: IDBTransaction): boolean {
  return exactStoreV1(transaction.objectStore("translation_workset_heads"), "processId") &&
    exactStoreV1(transaction.objectStore("translation_workset_units"), ["processId", "order"], [{
      name: "by_process_unit_id",
      keyPath: ["processId", "unitId"],
      unique: true,
    }]) &&
    exactStoreV1(transaction.objectStore("translation_glossary_entries"), [
      "processId",
      "order",
    ], [{
      name: "by_process_entry_id",
      keyPath: ["processId", "entryId"],
      unique: true,
    }]) &&
    exactStoreV1(transaction.objectStore("translation_workset_operations"), [
      "processId",
      "operationId",
    ]) &&
    exactStoreV1(transaction.objectStore("translation_batch_candidates"), [
      "processId",
      "candidateId",
    ]);
}

export const indexedDbTranslationPersistenceFacetV1: IndexedDbProgramPersistenceFacetV1 = {
  facetId: translationPersistenceFacetIdV1,
  storeNames: storeNamesV1,
  createStores: createStoresV1,
  hasExactSchema: hasExactSchemaV1,
  async loadOperations() {
    const module = await import("./indexeddb-translation-persistence-facet.ts");
    return module.indexedDbTranslationPersistenceFacetOperationsV1;
  },
};
