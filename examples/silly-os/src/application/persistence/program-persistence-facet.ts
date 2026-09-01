// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import { isProgramPlatformIdentifierV1 } from "../../program-platform/identifier.ts";
import type { IndexedDbProcessExecutionTransactionKernelV1 } from "./indexeddb-process-execution-transaction-kernel.ts";

/** Opaque page/Worker envelope. The selected build-known facet owns payload admission. */
export interface ProgramPersistenceFacetInvocationV1 {
  readonly revision: 1;
  readonly facetId: string;
  readonly operation: string;
  readonly input: unknown;
}

export function normalizeProgramPersistenceFacetInvocationV1(
  value: ProgramPersistenceFacetInvocationV1,
): ProgramPersistenceFacetInvocationV1 {
  if (
    value === null || typeof value !== "object" || Array.isArray(value) ||
    Reflect.ownKeys(value).length !== 4 ||
    !Reflect.ownKeys(value).every((key) =>
      typeof key === "string" && ["revision", "facetId", "operation", "input"].includes(key)
    ) || value.revision !== 1 || !isProgramPlatformIdentifierV1(value.facetId) ||
    !isProgramPlatformIdentifierV1(value.operation)
  ) throw new TypeError("invalid Program persistence facet invocation");
  return {
    revision: 1,
    facetId: value.facetId,
    operation: value.operation,
    input: value.input,
  };
}

export interface PreparedIndexedDbProgramPersistenceFacetOperationV1 {
  /** Complete facet and Core store set required by this one atomic operation. */
  readonly storeNames: readonly string[];
  readonly mode: IDBTransactionMode;
  invoke(input: {
    readonly transaction: IDBTransaction;
    readonly keyRange: typeof IDBKeyRange;
    /** Bound to the same transaction; it owns the only Process/lease/receipt writes. */
    readonly processExecution: IndexedDbProcessExecutionTransactionKernelV1;
  }): Promise<unknown>;
}

/** Lazily loaded business operations for one build-known persistence facet. */
export interface IndexedDbProgramPersistenceFacetOperationsV1 {
  prepare(
    operation: string,
    input: unknown,
  ): Promise<PreparedIndexedDbProgramPersistenceFacetOperationV1>;
}

/**
 * Build-known IndexedDB facet. This is deliberately a schema callback plus one
 * prepared-operation hook, not an ORM, service locator, or second repository.
 */
export interface IndexedDbProgramPersistenceFacetV1 {
  readonly facetId: string;
  readonly storeNames: readonly string[];
  createStores(database: IDBDatabase): void;
  hasExactSchema(transaction: IDBTransaction): boolean;
  /** Schema remains eager; business admission and operations stay out of the initial graph. */
  loadOperations(): Promise<IndexedDbProgramPersistenceFacetOperationsV1>;
}

export function createIndexedDbProgramPersistenceFacetRegistryV1(
  facets: readonly IndexedDbProgramPersistenceFacetV1[],
): ReadonlyMap<string, IndexedDbProgramPersistenceFacetV1> {
  const registry = new Map<string, IndexedDbProgramPersistenceFacetV1>();
  const storeOwners = new Map<string, string>();
  for (const facet of facets) {
    if (!isProgramPlatformIdentifierV1(facet.facetId) || registry.has(facet.facetId)) {
      throw new TypeError("invalid or duplicate Program persistence facet id");
    }
    if (facet.storeNames.length === 0) {
      throw new TypeError("Program persistence facet must own at least one store");
    }
    for (const storeName of facet.storeNames) {
      if (!isProgramPlatformIdentifierV1(storeName) || storeOwners.has(storeName)) {
        throw new TypeError("invalid or duplicate Program persistence facet store");
      }
      storeOwners.set(storeName, facet.facetId);
    }
    registry.set(facet.facetId, facet);
  }
  return registry;
}
