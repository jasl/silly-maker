// SPDX-License-Identifier: MIT
import { IDBFactory as FakeIDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import {
  hostRecordStoreConformanceExpectedV1,
  hostRecordStoreReopenExpectedV1,
  runHostRecordStoreConformanceV1,
  runHostRecordStoreReopenConformanceV1,
} from "../../../../test-support/host-atomic-record-store-conformance.ts";

import { createIndexedDbRecordStoreV1 } from "./indexeddb-record-store.ts";

const databaseNameV1 = "silly-maker.test.host-record-conformance";

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
});
