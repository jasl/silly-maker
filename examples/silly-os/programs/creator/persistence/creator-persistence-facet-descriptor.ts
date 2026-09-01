// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import type { IndexedDbProgramPersistenceFacetV1 } from "../../../src/application/persistence/program-persistence-facet.ts";
import { creatorPersistenceFacetIdV1 } from "./creator-persistence-contract.ts";

const storeNamesV1 = [
  "creator_catalog_commits",
  "creator_program_decisions",
  "creator_program_heads",
  "creator_program_revisions",
] as const;

function keyPathEqualV1(value: string | string[] | null, expected: string | string[]): boolean {
  return JSON.stringify(value) === JSON.stringify(expected);
}

function exactNamesV1(actual: DOMStringList, expected: readonly string[]): boolean {
  return Array.from({ length: actual.length }, (_, index) => actual.item(index) ?? "")
    .join("\0") === expected.toSorted().join("\0");
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
  const heads = database.createObjectStore("creator_program_heads", { keyPath: "programId" });
  heads.createIndex("by_updated_at", ["updatedAt", "programId"]);
  database.createObjectStore("creator_program_revisions", {
    keyPath: ["programId", "revision"],
  });
  const decisions = database.createObjectStore("creator_program_decisions", {
    keyPath: ["programId", "proposalId", "programRevision"],
  });
  decisions.createIndex("by_program_revision", ["programId", "programRevision"], {
    unique: true,
  });
  database.createObjectStore("creator_catalog_commits", {
    keyPath: ["programId", "commitId"],
  });
}

function hasExactSchemaV1(transaction: IDBTransaction): boolean {
  return exactStoreV1(transaction.objectStore("creator_program_heads"), "programId", [{
    name: "by_updated_at",
    keyPath: ["updatedAt", "programId"],
    unique: false,
  }]) && exactStoreV1(transaction.objectStore("creator_program_revisions"), [
    "programId",
    "revision",
  ]) && exactStoreV1(transaction.objectStore("creator_program_decisions"), [
    "programId",
    "proposalId",
    "programRevision",
  ], [{
    name: "by_program_revision",
    keyPath: ["programId", "programRevision"],
    unique: true,
  }]) && exactStoreV1(transaction.objectStore("creator_catalog_commits"), [
    "programId",
    "commitId",
  ]);
}

export const indexedDbCreatorPersistenceFacetV1: IndexedDbProgramPersistenceFacetV1 = {
  facetId: creatorPersistenceFacetIdV1,
  storeNames: storeNamesV1,
  createStores: createStoresV1,
  hasExactSchema: hasExactSchemaV1,
  async loadOperations() {
    const module = await import("./indexeddb-creator-persistence-facet.ts");
    return module.indexedDbCreatorPersistenceFacetOperationsV1;
  },
};
