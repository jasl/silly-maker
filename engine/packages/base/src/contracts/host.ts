// SPDX-License-Identifier: MIT
import type { Brand, NonNegativeSafeInteger, PositiveSafeInteger } from "./values.ts";
import type { StrictJsonObjectV1 } from "./strict-json.ts";
import { parseNonNegativeSafeInteger } from "./values.ts";

export type IsoUtcInstant = Brand<string, "IsoUtcInstant">;
export type HostRecordNamespaceV1 = "save" | "lease" | "settings";
export type HostRecordKeyV1 = Brand<string, "HostRecordKeyV1">;
export type HostRecordRevisionV1 = NonNegativeSafeInteger;

export interface HostStoredRecordV1 {
  readonly namespace: HostRecordNamespaceV1;
  readonly key: HostRecordKeyV1;
  readonly revision: HostRecordRevisionV1;
  readonly bytes: Uint8Array;
}

export type HostRecordMutationV1 =
  | {
    readonly kind: "put";
    readonly namespace: HostRecordNamespaceV1;
    readonly key: HostRecordKeyV1;
    readonly expectedRevision: HostRecordRevisionV1 | null;
    readonly bytes: Uint8Array;
  }
  | {
    readonly kind: "delete";
    readonly namespace: HostRecordNamespaceV1;
    readonly key: HostRecordKeyV1;
    readonly expectedRevision: HostRecordRevisionV1;
  };

export type HostAtomicCommitResultV1 =
  | { readonly kind: "committed"; readonly records: readonly HostStoredRecordV1[] }
  | {
    readonly kind: "conflict";
    readonly namespace: HostRecordNamespaceV1;
    readonly key: HostRecordKeyV1;
    readonly actualRevision: HostRecordRevisionV1 | null;
  };

export interface HostAtomicRecordStoreV1 {
  read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1): Promise<HostStoredRecordV1 | null>;
  list(namespace: HostRecordNamespaceV1): Promise<readonly HostStoredRecordV1[]>;
  commit(
    mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
  ): Promise<HostAtomicCommitResultV1>;
}

export type HostFileSelectionResultV1 =
  | { readonly kind: "selected"; readonly name: string; readonly bytes: Uint8Array }
  | { readonly kind: "cancelled" }
  | { readonly kind: "rejected"; readonly code: "too_large" | "unsupported_type" };

export interface HostFilePortV1 {
  selectOne(request: {
    readonly acceptedMediaTypes: readonly string[];
    readonly maximumBytes: PositiveSafeInteger;
  }): Promise<HostFileSelectionResultV1>;
  download(request: {
    readonly filename: string;
    readonly mediaType: string;
    readonly bytes: Uint8Array;
  }): Promise<void>;
}

export interface ApplicationHostCapabilitiesV1 {
  readonly records: HostAtomicRecordStoreV1;
  readonly files: HostFilePortV1;
  readonly metadataClock: { now(): IsoUtcInstant };
  readonly log: {
    write(
      level: "debug" | "info" | "warn" | "error",
      code: string,
      details: StrictJsonObjectV1,
    ): void;
  };
}

function cloneRecord(record: HostStoredRecordV1): HostStoredRecordV1 {
  return { ...record, bytes: Uint8Array.from(record.bytes) };
}

type NormalizedMemoryMutationV1 =
  | {
    readonly kind: "put";
    readonly namespace: HostRecordNamespaceV1;
    readonly key: HostRecordKeyV1;
    readonly expectedRevision: HostRecordRevisionV1 | null;
    readonly nextRevision: HostRecordRevisionV1;
    readonly bytes: Uint8Array;
  }
  | {
    readonly kind: "delete";
    readonly namespace: HostRecordNamespaceV1;
    readonly key: HostRecordKeyV1;
    readonly expectedRevision: HostRecordRevisionV1;
  };

function isHostRecordNamespaceV1(value: unknown): value is HostRecordNamespaceV1 {
  return value === "save" || value === "lease" || value === "settings";
}

function isUint8ArrayV1(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === "[object Uint8Array]"
  );
}

function compositeRecordKeyV1(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1): string {
  return `${namespace}\0${key}`;
}

function normalizeMemoryMutationsV1(
  mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
): readonly [NormalizedMemoryMutationV1, ...NormalizedMemoryMutationV1[]] {
  if (!Array.isArray(mutations) || mutations.length === 0) {
    throw new TypeError("Host record commit requires mutations");
  }
  const normalized = mutations.map((mutation): NormalizedMemoryMutationV1 => {
    if (
      typeof mutation !== "object" ||
      mutation === null ||
      !isHostRecordNamespaceV1(Reflect.get(mutation, "namespace")) ||
      typeof Reflect.get(mutation, "key") !== "string"
    ) {
      throw new TypeError("invalid Host record mutation identity");
    }
    const namespace = mutation.namespace;
    const key = mutation.key;
    if (mutation.kind === "put") {
      if (!isUint8ArrayV1(mutation.bytes)) {
        throw new TypeError("invalid Host record mutation bytes");
      }
      const expectedRevision = mutation.expectedRevision === null
        ? null
        : parseNonNegativeSafeInteger(mutation.expectedRevision);
      return {
        kind: "put",
        namespace,
        key,
        expectedRevision,
        nextRevision: parseNonNegativeSafeInteger((expectedRevision ?? 0) + 1),
        bytes: Uint8Array.from(mutation.bytes),
      };
    }
    if (mutation.kind !== "delete") {
      throw new TypeError("invalid Host record mutation kind");
    }
    return {
      kind: "delete",
      namespace,
      key,
      expectedRevision: parseNonNegativeSafeInteger(mutation.expectedRevision),
    };
  });
  const identities = normalized.map((mutation) =>
    compositeRecordKeyV1(mutation.namespace, mutation.key)
  );
  if (new Set(identities).size !== identities.length) {
    throw new TypeError("duplicate Host record mutation");
  }
  return normalized as unknown as readonly [
    NormalizedMemoryMutationV1,
    ...NormalizedMemoryMutationV1[],
  ];
}

/**
 * Direct-file test seam for seeding otherwise unreachable revision boundaries.
 * It is intentionally absent from every package barrel.
 */
export function createSeededMemoryHostRecordStoreInternalV1(
  initialRecords: readonly HostStoredRecordV1[],
): HostAtomicRecordStoreV1 {
  let records = new Map<string, HostStoredRecordV1>();
  for (const record of initialRecords) {
    if (
      !isHostRecordNamespaceV1(record.namespace) ||
      typeof record.key !== "string" ||
      !isUint8ArrayV1(record.bytes)
    ) {
      throw new TypeError("invalid initial Host record");
    }
    const normalized = {
      namespace: record.namespace,
      key: record.key,
      revision: parseNonNegativeSafeInteger(record.revision),
      bytes: Uint8Array.from(record.bytes),
    };
    const identity = compositeRecordKeyV1(normalized.namespace, normalized.key);
    if (records.has(identity)) throw new TypeError("duplicate initial Host record");
    records.set(identity, normalized);
  }

  return {
    async read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1) {
      const record = records.get(compositeRecordKeyV1(namespace, key));
      return record ? cloneRecord(record) : null;
    },
    async list(namespace: HostRecordNamespaceV1) {
      return [...records.values()]
        .filter((record) => record.namespace === namespace)
        .sort((left, right) => left.key.localeCompare(right.key))
        .map(cloneRecord);
    },
    async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
      const normalized = normalizeMemoryMutationsV1(mutations);
      for (const mutation of normalized) {
        const current = records.get(compositeRecordKeyV1(mutation.namespace, mutation.key));
        const actualRevision = current?.revision ?? null;
        if (mutation.expectedRevision !== actualRevision) {
          return {
            kind: "conflict" as const,
            namespace: mutation.namespace,
            key: mutation.key,
            actualRevision,
          };
        }
      }
      const nextRecords = new Map(records);
      const changed: HostStoredRecordV1[] = [];
      for (const mutation of normalized) {
        const identity = compositeRecordKeyV1(mutation.namespace, mutation.key);
        if (mutation.kind === "delete") {
          nextRecords.delete(identity);
          continue;
        }
        const next = {
          namespace: mutation.namespace,
          key: mutation.key,
          revision: mutation.nextRevision,
          bytes: Uint8Array.from(mutation.bytes),
        };
        nextRecords.set(identity, next);
        changed.push(cloneRecord(next));
      }
      records = nextRecords;
      return {
        kind: "committed" as const,
        records: changed,
      };
    },
  };
}

export function createMemoryHostRecordStoreV1(): HostAtomicRecordStoreV1 {
  return createSeededMemoryHostRecordStoreInternalV1([]);
}
