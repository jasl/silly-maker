// SPDX-License-Identifier: MIT
import { Buffer } from "node:buffer";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
} from "@sillymaker/base";
import {
  hostRecordStoreConformanceExpectedV1,
  hostRecordStoreReopenExpectedV1,
  runHostRecordStoreConformanceV1,
  runHostRecordStoreReopenConformanceV1,
} from "../../../../test-support/host-atomic-record-store-conformance.ts";

import {
  createRecordFileStoreV1,
  type StoredWireRecordV1,
  type WireMutationV1,
} from "./record-file-store.mts";

type HostAtomicCommitResultV1 = Awaited<ReturnType<HostAtomicRecordStoreV1["commit"]>>;
type HostRecordKeyV1 = HostStoredRecordV1["key"];
type HostRecordNamespaceV1 = Parameters<HostAtomicRecordStoreV1["read"]>[0];

let cleanupDirV1: string | null = null;

afterEach(async () => {
  if (cleanupDirV1 !== null) {
    await rm(cleanupDirV1, { recursive: true, force: true });
  }
  cleanupDirV1 = null;
});

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

function adaptFileStoreV1(
  wire: ReturnType<typeof createRecordFileStoreV1>,
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

async function fixtureV1() {
  const root = await mkdtemp(join(tmpdir(), "sillymaker-record-conformance-"));
  cleanupDirV1 = root;
  const createStore = () => adaptFileStoreV1(createRecordFileStoreV1(root));
  return Object.freeze({ createStore, store: createStore() });
}

describe("desktop file-preview Host record store conformance", () => {
  it("matches the shared core workload under one process-local handle", async () => {
    const { store } = await fixtureV1();

    expect(await runHostRecordStoreConformanceV1(store)).toEqual(
      hostRecordStoreConformanceExpectedV1,
    );
  });

  it("retains revisions and bytes across a fresh adapter handle", async () => {
    const { createStore, store } = await fixtureV1();

    expect(await runHostRecordStoreReopenConformanceV1(store, createStore)).toEqual(
      hostRecordStoreReopenExpectedV1,
    );
  });
});
