// SPDX-License-Identifier: MIT
import { Buffer } from "node:buffer";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
} from "@sillymaker/base";
import {
  createHostRecordStoreCorruptBackingNeighborV1,
  createHostRecordStoreRevisionOverflowSeedV1,
  hostRecordStoreConformanceExpectedV1,
  hostRecordStoreCorruptBackingKeyV1,
  hostRecordStoreCorruptBackingReadListConformanceExpectedV1,
  hostRecordStoreReopenExpectedV1,
  hostRecordStoreRevisionOverflowConformanceExpectedV1,
  hostRecordStoreRevisionOverflowEarlierKeyV1,
  runHostRecordStoreConformanceV1,
  runHostRecordStoreCorruptBackingReadListConformanceV1,
  runHostRecordStoreReopenConformanceV1,
  runHostRecordStoreRevisionOverflowConformanceV1,
} from "../../../../test-support/host-atomic-record-store-conformance.ts";

import {
  createRecordFileStoreV1,
  type StoredWireRecordV1,
  type WireMutationV1,
} from "./record-file-store.mts";

type HostAtomicCommitResultV1 = Awaited<ReturnType<HostAtomicRecordStoreV1["commit"]>>;
type HostRecordKeyV1 = HostStoredRecordV1["key"];
type HostRecordNamespaceV1 = Parameters<HostAtomicRecordStoreV1["read"]>[0];

const cleanupDirsV1 = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...cleanupDirsV1].map((directory) => rm(directory, { recursive: true, force: true })),
  );
  cleanupDirsV1.clear();
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
  cleanupDirsV1.add(root);
  const createStore = () => adaptFileStoreV1(createRecordFileStoreV1(root));
  return Object.freeze({ root, createStore, store: createStore() });
}

async function seedRevisionOverflowV1(
  root: string,
  seed: ReturnType<typeof createHostRecordStoreRevisionOverflowSeedV1>,
): Promise<void> {
  const directory = join(root, seed.namespace);
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, `${encodeURIComponent(seed.key as string)}.json`),
    JSON.stringify({
      revision: seed.revision,
      bytesBase64: Buffer.from(seed.bytes).toString("base64"),
    }),
    "utf8",
  );
}

async function createCorruptBackingStoreV1(rawCorruptRecord: string) {
  const { root, store } = await fixtureV1();
  const neighbor = createHostRecordStoreCorruptBackingNeighborV1();
  const directory = join(root, neighbor.namespace);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(
      join(directory, `${encodeURIComponent(neighbor.key as string)}.json`),
      JSON.stringify({
        revision: neighbor.revision,
        bytesBase64: Buffer.from(neighbor.bytes).toString("base64"),
      }),
      "utf8",
    ),
    writeFile(
      join(directory, `${encodeURIComponent(hostRecordStoreCorruptBackingKeyV1 as string)}.json`),
      rawCorruptRecord,
      "utf8",
    ),
  ]);
  return store;
}

const corruptRecordCasesV1 = Object.freeze([
  ["missing revision", JSON.stringify({ bytesBase64: "AQ==" })],
  ["negative-zero revision", '{"revision":-0,"bytesBase64":"AQ=="}'],
  ["missing bytes", JSON.stringify({ revision: 1 })],
  ["invalid base64 bytes", JSON.stringify({ revision: 1, bytesBase64: "not-base64" })],
  ["truncated JSON", '{"revision":1'],
] as const);

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

  it("rejects matched revision exhaustion atomically and preserves it across a fresh handle", async () => {
    const { root, createStore, store } = await fixtureV1();
    const seed = createHostRecordStoreRevisionOverflowSeedV1();
    await seedRevisionOverflowV1(root, seed);

    expect(await runHostRecordStoreRevisionOverflowConformanceV1(store)).toEqual(
      hostRecordStoreRevisionOverflowConformanceExpectedV1,
    );
    const freshStore = createStore();
    expect(await freshStore.read(seed.namespace, seed.key)).toEqual(seed);
    expect(
      await freshStore.read(seed.namespace, hostRecordStoreRevisionOverflowEarlierKeyV1),
    ).toBeNull();
  });

  it.each(corruptRecordCasesV1)(
    "fails closed for a persisted record with %s",
    async (_name, rawCorruptRecord) => {
      expect(
        await runHostRecordStoreCorruptBackingReadListConformanceV1(() =>
          createCorruptBackingStoreV1(rawCorruptRecord),
        ),
      ).toEqual(hostRecordStoreCorruptBackingReadListConformanceExpectedV1);
    },
  );
});
