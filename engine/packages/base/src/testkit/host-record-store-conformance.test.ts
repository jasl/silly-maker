// SPDX-License-Identifier: MIT
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

import type {
  HostAtomicRecordStoreV1,
  HostRecordKeyV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
} from "../contracts/host.ts";
import { createSeededMemoryHostRecordStoreInternalV1 } from "../contracts/host.ts";
import { parseNonNegativeSafeInteger } from "../contracts/values.ts";
import {
  hostRecordStoreConformanceExpectedV1,
  hostRecordStoreMalformedConformanceExpectedV1,
  runHostRecordStoreConformanceV1,
  runHostRecordStoreMalformedConformanceV1,
} from "../../../../test-support/host-atomic-record-store-conformance.ts";

const keyV1 = (value: string) => value as HostRecordKeyV1;

function mapMutationsV1(
  mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
  transform: (mutation: HostRecordMutationV1) => HostRecordMutationV1,
): [HostRecordMutationV1, ...HostRecordMutationV1[]] {
  return mutations.map(transform) as [HostRecordMutationV1, ...HostRecordMutationV1[]];
}

describe("Host record store conformance workload", () => {
  it("holds the in-memory Host store to the backend-independent core contract", async () => {
    const store = createSeededMemoryHostRecordStoreInternalV1([]);

    expect(await runHostRecordStoreConformanceV1(store)).toEqual(
      hostRecordStoreConformanceExpectedV1,
    );
  });

  it("rejects the shared malformed mutation corpus without changing state", async () => {
    const store = createSeededMemoryHostRecordStoreInternalV1([]);

    expect(await runHostRecordStoreMalformedConformanceV1(store)).toEqual(
      hostRecordStoreMalformedConformanceExpectedV1,
    );
  });

  it("attributes malformed state drift only to the case that caused it", async () => {
    const delegate = createSeededMemoryHostRecordStoreInternalV1([]);
    const driftingStore = Object.freeze({
      read: delegate.read,
      list: delegate.list,
      async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
        const first = (mutations as readonly unknown[])[0];
        if (
          typeof first === "object" &&
          first !== null &&
          Reflect.get(first, "kind") === "replace"
        ) {
          await delegate.commit([
            {
              kind: "delete",
              namespace: "settings",
              key: keyV1("conformance.malformed.victim"),
              expectedRevision: parseNonNegativeSafeInteger(1),
            },
          ]);
          throw new TypeError("injected post-write failure");
        }
        return await delegate.commit(mutations);
      },
    }) satisfies HostAtomicRecordStoreV1;

    const report = await runHostRecordStoreMalformedConformanceV1(driftingStore);
    const unknownKind = report.cases.find((testCase) => testCase.id === "unknown_kind");
    const followingCase = report.cases.find((testCase) => testCase.id === "unknown_namespace");

    expect(unknownKind).toMatchObject({
      rejectedWithTypeError: true,
      statePreserved: false,
    });
    expect(followingCase).toMatchObject({
      rejectedWithTypeError: true,
      statePreserved: true,
    });
  });

  it("exposes byte drift instead of normalizing arbitrary records as text", async () => {
    const delegate = createSeededMemoryHostRecordStoreInternalV1([]);
    const byteDriftingStore = Object.freeze({
      read: delegate.read,
      list: delegate.list,
      commit: (mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) =>
        delegate.commit(
          mapMutationsV1(mutations, (mutation) =>
            mutation.kind === "put"
              ? Object.freeze({
                  ...mutation,
                  bytes: Uint8Array.of(0xef, 0xbb, 0xbf, ...mutation.bytes),
                })
              : mutation,
          ),
        ),
    }) satisfies HostAtomicRecordStoreV1;

    const report = await runHostRecordStoreConformanceV1(byteDriftingStore);

    expect(report.multiKey.valuesAfterCommit[0]).toEqual([
      0xef,
      0xbb,
      0xbf,
      ...hostRecordStoreConformanceExpectedV1.multiKey.valuesAfterCommit[0]!,
    ]);
    expect(report).not.toEqual(hostRecordStoreConformanceExpectedV1);
  });

  it("exposes a list implementation that omits a readable record", async () => {
    const delegate = createSeededMemoryHostRecordStoreInternalV1([]);
    const incompleteListingStore = Object.freeze({
      read: delegate.read,
      async list(namespace: Parameters<HostAtomicRecordStoreV1["list"]>[0]) {
        return Object.freeze(
          (await delegate.list(namespace)).filter(
            (record) => record.key !== keyV1("conformance.concurrent"),
          ),
        );
      },
      commit: delegate.commit,
    }) satisfies HostAtomicRecordStoreV1;

    const report = await runHostRecordStoreConformanceV1(incompleteListingStore);

    expect(report.immutableListing.keys).not.toContain("conformance.concurrent");
    expect(report).not.toEqual(hostRecordStoreConformanceExpectedV1);
  });

  it("accepts Uint8Array bytes created in another JavaScript realm", async () => {
    const store = createSeededMemoryHostRecordStoreInternalV1([]);
    const key = keyV1("conformance.cross-realm");
    const bytes = runInNewContext("Uint8Array.of(0, 255, 16)") as Uint8Array;

    expect(bytes).not.toBeInstanceOf(Uint8Array);
    await expect(
      store.commit([
        {
          kind: "put",
          namespace: "settings",
          key,
          expectedRevision: null,
          bytes,
        },
      ]),
    ).resolves.toMatchObject({ kind: "committed" });
    expect(Array.from((await store.read("settings", key))!.bytes)).toEqual([0, 255, 16]);
  });

  it("rejects a later revision overflow without committing an earlier mutation", async () => {
    const maximumRevision = parseNonNegativeSafeInteger(Number.MAX_SAFE_INTEGER);
    const maximum = Object.freeze({
      namespace: "settings",
      key: keyV1("conformance.overflow.maximum"),
      revision: maximumRevision,
      bytes: Uint8Array.of(1),
    }) satisfies HostStoredRecordV1;
    const store = createSeededMemoryHostRecordStoreInternalV1([maximum]);

    await expect(
      store.commit([
        {
          kind: "put",
          namespace: "settings",
          key: keyV1("conformance.overflow.earlier"),
          expectedRevision: null,
          bytes: Uint8Array.of(2),
        },
        {
          kind: "put",
          namespace: "settings",
          key: maximum.key,
          expectedRevision: maximumRevision,
          bytes: Uint8Array.of(3),
        },
      ]),
    ).rejects.toThrow(TypeError);

    expect(await store.read("settings", keyV1("conformance.overflow.earlier"))).toBeNull();
    expect(await store.read("settings", maximum.key)).toEqual(maximum);
  });
});
