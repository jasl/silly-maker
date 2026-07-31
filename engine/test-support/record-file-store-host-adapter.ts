// SPDX-License-Identifier: MIT
import { Buffer } from "node:buffer";

import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
} from "@sillymaker/base";

interface StoredWireRecordV1 {
  readonly namespace: string;
  readonly key: string;
  readonly revision: number;
  readonly bytesBase64: string;
}

type WireMutationV1 =
  | {
    readonly kind: "put";
    readonly namespace: string;
    readonly key: string;
    readonly expectedRevision: number | null;
    readonly bytesBase64: string;
  }
  | {
    readonly kind: "delete";
    readonly namespace: string;
    readonly key: string;
    readonly expectedRevision: number;
  };

type WireCommitResultV1 =
  | { readonly kind: "committed"; readonly records: readonly StoredWireRecordV1[] }
  | {
    readonly kind: "conflict";
    readonly namespace: string;
    readonly key: string;
    readonly actualRevision: number | null;
  };

interface RecordFileStoreWireV1 {
  read(namespace: string, key: string): Promise<StoredWireRecordV1 | null>;
  list(namespace: string): Promise<readonly StoredWireRecordV1[]>;
  commit(mutations: readonly [WireMutationV1, ...WireMutationV1[]]): Promise<WireCommitResultV1>;
}

type HostAtomicCommitResultV1 = Awaited<ReturnType<HostAtomicRecordStoreV1["commit"]>>;
type HostRecordKeyV1 = HostStoredRecordV1["key"];
type HostRecordNamespaceV1 = Parameters<HostAtomicRecordStoreV1["read"]>[0];

function fromWireRecordV1(record: StoredWireRecordV1): HostStoredRecordV1 {
  return Object.freeze({
    namespace: record.namespace as HostStoredRecordV1["namespace"],
    key: record.key as HostRecordKeyV1,
    revision: record.revision as HostStoredRecordV1["revision"],
    bytes: Uint8Array.from(Buffer.from(record.bytesBase64, "base64")),
  });
}

function toWireMutationV1(mutation: HostRecordMutationV1): WireMutationV1 {
  return mutation.kind === "put"
    ? Object.freeze({
      kind: "put",
      namespace: mutation.namespace,
      key: mutation.key,
      expectedRevision: mutation.expectedRevision,
      bytesBase64: Buffer.from(mutation.bytes).toString("base64"),
    })
    : Object.freeze({
      kind: "delete",
      namespace: mutation.namespace,
      key: mutation.key,
      expectedRevision: mutation.expectedRevision,
    });
}

/** Test-only bridge from the Desktop preview wire store to the Host contract. */
export function adaptRecordFileStoreForHostTestsV1(
  wire: RecordFileStoreWireV1,
): HostAtomicRecordStoreV1 {
  return Object.freeze({
    async read(namespace: HostRecordNamespaceV1, key: HostRecordKeyV1) {
      const record = await wire.read(namespace, key);
      return record === null ? null : fromWireRecordV1(record);
    },
    async list(namespace: HostRecordNamespaceV1) {
      return Object.freeze((await wire.list(namespace)).map(fromWireRecordV1));
    },
    async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
      const wireMutations = mutations.map(toWireMutationV1) as [
        WireMutationV1,
        ...WireMutationV1[],
      ];
      const result = await wire.commit(wireMutations);
      return (
        result.kind === "conflict"
          ? Object.freeze({
            kind: "conflict",
            namespace: result.namespace as HostStoredRecordV1["namespace"],
            key: result.key as HostRecordKeyV1,
            actualRevision: result.actualRevision as HostStoredRecordV1["revision"] | null,
          })
          : Object.freeze({
            kind: "committed",
            records: Object.freeze(result.records.map(fromWireRecordV1)),
          })
      ) satisfies HostAtomicCommitResultV1;
    },
  });
}
