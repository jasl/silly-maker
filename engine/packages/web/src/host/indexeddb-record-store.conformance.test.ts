// SPDX-License-Identifier: MIT
import { IDBFactory as FakeIDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  createHostRecordStoreCorruptBackingNeighborV1,
  createHostRecordStoreRevisionOverflowSeedV1,
  hostRecordStoreConformanceExpectedV1,
  hostRecordStoreCorruptBackingCommitConformanceExpectedV1,
  hostRecordStoreCorruptBackingKeyV1,
  hostRecordStoreCorruptBackingReadListConformanceExpectedV1,
  hostRecordStoreMalformedConformanceExpectedV1,
  hostRecordStoreReopenExpectedV1,
  hostRecordStoreRevisionOverflowConformanceExpectedV1,
  hostRecordStoreRevisionOverflowEarlierKeyV1,
  runHostRecordStoreConformanceV1,
  runHostRecordStoreCorruptBackingCommitConformanceV1,
  runHostRecordStoreCorruptBackingReadListConformanceV1,
  runHostRecordStoreMalformedConformanceV1,
  runHostRecordStoreReopenConformanceV1,
  runHostRecordStoreRevisionOverflowConformanceV1,
  type HostRecordStoreCorruptBackingCommitFixtureV1,
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
  await seedRawRowsV1(indexedDB, [
    {
      namespace: seed.namespace,
      key: seed.key,
      revision: seed.revision,
      bytes: Uint8Array.from(seed.bytes).buffer,
    },
  ]);
}

async function seedRawRowsV1(indexedDB: IDBFactory, rows: readonly unknown[]): Promise<void> {
  const database = await requestResultV1(indexedDB.open(databaseNameV1, 1));
  const transaction = database.transaction(SILLYMAKER_RECORD_STORE_NAME_V1, "readwrite");
  const completion = transactionCompletionV1(transaction);
  const objectStore = transaction.objectStore(SILLYMAKER_RECORD_STORE_NAME_V1);
  await Promise.all(rows.map((row) => requestResultV1(objectStore.put(row))));
  await completion;
  database.close();
}

function describeRawValueV1(value: unknown): string {
  if (value instanceof ArrayBuffer) {
    return `ArrayBuffer:${Array.from(new Uint8Array(value)).join(",")}`;
  }
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return `${Object.prototype.toString.call(value)}:${Array.from(bytes).join(",")}`;
  }
  if (typeof value === "number" && Object.is(value, -0)) return "number:-0";
  return `${typeof value}:${JSON.stringify(value)}`;
}

async function snapshotRawRowsV1(
  indexedDB: IDBFactory,
): Promise<readonly (readonly (readonly [string, string])[])[]> {
  const database = await requestResultV1(indexedDB.open(databaseNameV1, 1));
  const transaction = database.transaction(SILLYMAKER_RECORD_STORE_NAME_V1, "readonly");
  const completion = transactionCompletionV1(transaction);
  const rows = await requestResultV1<unknown[]>(
    transaction.objectStore(SILLYMAKER_RECORD_STORE_NAME_V1).getAll(),
  );
  await completion;
  database.close();
  return Object.freeze(
    rows.map((row) => {
      if (typeof row !== "object" || row === null || Array.isArray(row)) {
        return Object.freeze([Object.freeze(["<root>", describeRawValueV1(row)] as const)]);
      }
      return Object.freeze(
        Object.keys(row)
          .toSorted()
          .map((key) => Object.freeze([key, describeRawValueV1(Reflect.get(row, key))] as const)),
      );
    }),
  );
}

type CorruptRowFactoryV1 = () => Readonly<Record<string, unknown>>;

async function createCorruptBackingStoreV1(
  createCorruptRow: CorruptRowFactoryV1,
): Promise<ReturnType<typeof createIndexedDbRecordStoreV1>> {
  const indexedDB = new FakeIDBFactory();
  const store = createIndexedDbRecordStoreV1({ indexedDB, databaseName: databaseNameV1 });
  const neighbor = createHostRecordStoreCorruptBackingNeighborV1();
  await store.list(neighbor.namespace);
  await seedRawRowsV1(indexedDB, [
    {
      namespace: neighbor.namespace,
      key: neighbor.key,
      revision: neighbor.revision,
      bytes: Uint8Array.from(neighbor.bytes).buffer,
    },
    createCorruptRow(),
  ]);
  return store;
}

async function createCorruptCommitFixtureV1(
  createCorruptRow: CorruptRowFactoryV1,
): Promise<
  HostRecordStoreCorruptBackingCommitFixtureV1<readonly (readonly (readonly [string, string])[])[]>
> {
  const indexedDB = new FakeIDBFactory();
  const createStore = () =>
    createIndexedDbRecordStoreV1({ indexedDB, databaseName: databaseNameV1 });
  const store = createStore();
  const neighbor = createHostRecordStoreCorruptBackingNeighborV1();
  await store.list(neighbor.namespace);
  await seedRawRowsV1(indexedDB, [
    {
      namespace: neighbor.namespace,
      key: neighbor.key,
      revision: neighbor.revision,
      bytes: Uint8Array.from(neighbor.bytes).buffer,
    },
    createCorruptRow(),
  ]);
  return Object.freeze({
    store,
    createFreshStore: createStore,
    snapshotRecordBacking: () => snapshotRawRowsV1(indexedDB),
    recordBackingSnapshotsEqual: (
      left: readonly (readonly (readonly [string, string])[])[],
      right: readonly (readonly (readonly [string, string])[])[],
    ) => JSON.stringify(left) === JSON.stringify(right),
  });
}

const corruptRowCasesV1 = Object.freeze([
  [
    "missing revision",
    () => ({
      namespace: "settings",
      key: hostRecordStoreCorruptBackingKeyV1,
      bytes: Uint8Array.of(1).buffer,
    }),
  ],
  [
    "negative-zero revision",
    () => ({
      namespace: "settings",
      key: hostRecordStoreCorruptBackingKeyV1,
      revision: -0,
      bytes: Uint8Array.of(1).buffer,
    }),
  ],
  [
    "missing bytes",
    () => ({
      namespace: "settings",
      key: hostRecordStoreCorruptBackingKeyV1,
      revision: 1,
    }),
  ],
  [
    "non-ArrayBuffer bytes",
    () => ({
      namespace: "settings",
      key: hostRecordStoreCorruptBackingKeyV1,
      revision: 1,
      bytes: "AQ==",
    }),
  ],
] as const satisfies readonly (readonly [string, CorruptRowFactoryV1])[]);

const corruptCommitRowCasesV1 = Object.freeze([
  [
    "missing bytes",
    () => ({
      namespace: "settings",
      key: hostRecordStoreCorruptBackingKeyV1,
      revision: 1,
    }),
  ],
  [
    "non-ArrayBuffer bytes",
    () => ({
      namespace: "settings",
      key: hostRecordStoreCorruptBackingKeyV1,
      revision: 1,
      bytes: "AQ==",
    }),
  ],
] as const satisfies readonly (readonly [string, CorruptRowFactoryV1])[]);

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

  it.each(corruptRowCasesV1)(
    "fails closed for a persisted row with %s",
    async (_name, createCorruptRow) => {
      expect(
        await runHostRecordStoreCorruptBackingReadListConformanceV1(() =>
          createCorruptBackingStoreV1(createCorruptRow),
        ),
      ).toEqual(hostRecordStoreCorruptBackingReadListConformanceExpectedV1);
    },
  );

  it.each(corruptCommitRowCasesV1)(
    "rejects an atomic batch before mutating a persisted row with %s",
    async (_name, createCorruptRow) => {
      expect(
        await runHostRecordStoreCorruptBackingCommitConformanceV1(() =>
          createCorruptCommitFixtureV1(createCorruptRow),
        ),
      ).toEqual(hostRecordStoreCorruptBackingCommitConformanceExpectedV1);
    },
  );
});
