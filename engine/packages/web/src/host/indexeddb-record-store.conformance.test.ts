// SPDX-License-Identifier: MIT
import { IDBFactory as FakeIDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  createHostRecordStoreRevisionOverflowSeedV1,
  hostRecordStoreConformanceExpectedV1,
  hostRecordStoreMalformedConformanceExpectedV1,
  hostRecordStoreReopenExpectedV1,
  hostRecordStoreRevisionOverflowConformanceExpectedV1,
  hostRecordStoreRevisionOverflowEarlierKeyV1,
  runHostRecordStoreConformanceV1,
  runHostRecordStoreMalformedConformanceV1,
  runHostRecordStoreReopenConformanceV1,
  runHostRecordStoreRevisionOverflowConformanceV1,
} from "../../../../test-support/host-atomic-record-store-conformance.ts";

import {
  SILLYMAKER_RECORD_STORE_NAME_V1,
  createIndexedDbRecordStoreV1,
} from "./indexeddb-record-store.ts";

const databaseNameV1 = "silly-maker.test.host-record-conformance";

function requestResultV1<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new DOMException("request failed", "UnknownError")),
      { once: true },
    );
  });
}

function transactionCompletionV1(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new DOMException("transaction aborted", "AbortError")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new DOMException("transaction failed", "UnknownError")),
      { once: true },
    );
  });
}

async function seedRevisionOverflowV1(
  indexedDB: IDBFactory,
  seed: ReturnType<typeof createHostRecordStoreRevisionOverflowSeedV1>,
): Promise<void> {
  const database = await requestResultV1(indexedDB.open(databaseNameV1, 1));
  const transaction = database.transaction(SILLYMAKER_RECORD_STORE_NAME_V1, "readwrite");
  const completion = transactionCompletionV1(transaction);
  await requestResultV1(
    transaction.objectStore(SILLYMAKER_RECORD_STORE_NAME_V1).put({
      namespace: seed.namespace,
      key: seed.key,
      revision: seed.revision,
      bytes: Uint8Array.from(seed.bytes).buffer,
    }),
  );
  await completion;
  database.close();
}

describe("IndexedDB Host record store conformance", () => {
  it("matches the shared core workload", async () => {
    const indexedDB = new FakeIDBFactory();
    const store = createIndexedDbRecordStoreV1({ indexedDB, databaseName: databaseNameV1 });

    expect(await runHostRecordStoreConformanceV1(store)).toEqual(
      hostRecordStoreConformanceExpectedV1,
    );
  });

  it("retains revisions and bytes across a fresh adapter handle", async () => {
    const indexedDB = new FakeIDBFactory();
    const createStore = () =>
      createIndexedDbRecordStoreV1({ indexedDB, databaseName: databaseNameV1 });

    expect(await runHostRecordStoreReopenConformanceV1(createStore(), createStore)).toEqual(
      hostRecordStoreReopenExpectedV1,
    );
  });

  it("rejects the shared malformed mutation corpus without changing state", async () => {
    const indexedDB = new FakeIDBFactory();
    const store = createIndexedDbRecordStoreV1({ indexedDB, databaseName: databaseNameV1 });

    expect(await runHostRecordStoreMalformedConformanceV1(store)).toEqual(
      hostRecordStoreMalformedConformanceExpectedV1,
    );
  });

  it("rejects matched revision exhaustion atomically and preserves it across a fresh handle", async () => {
    const indexedDB = new FakeIDBFactory();
    const createStore = () =>
      createIndexedDbRecordStoreV1({ indexedDB, databaseName: databaseNameV1 });
    const store = createStore();
    const seed = createHostRecordStoreRevisionOverflowSeedV1();
    await store.list(seed.namespace);
    await seedRevisionOverflowV1(indexedDB, seed);

    expect(await runHostRecordStoreRevisionOverflowConformanceV1(store)).toEqual(
      hostRecordStoreRevisionOverflowConformanceExpectedV1,
    );
    const freshStore = createStore();
    expect(await freshStore.read(seed.namespace, seed.key)).toEqual(seed);
    expect(
      await freshStore.read(seed.namespace, hostRecordStoreRevisionOverflowEarlierKeyV1),
    ).toBeNull();
  });
});
