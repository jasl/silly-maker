// SPDX-License-Identifier: MIT
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
  createHostRecordStoreRevisionOverflowSeedV1,
  hostRecordStoreConformanceExpectedV1,
  hostRecordStoreKeyCorpusExpectedV1,
  hostRecordStoreMalformedConformanceExpectedV1,
  hostRecordStoreRevisionOverflowConformanceExpectedV1,
  runHostRecordStoreConformanceV1,
  runHostRecordStoreKeyCorpusV1,
  runHostRecordStoreMalformedConformanceV1,
  runHostRecordStoreRevisionOverflowConformanceV1,
} from "../../../../test-support/host-atomic-record-store-conformance.ts";

const keyV1 = (value: string) => value as HostRecordKeyV1;

function mapMutationsV1(
  mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]],
  transform: (mutation: HostRecordMutationV1) => HostRecordMutationV1,
): [HostRecordMutationV1, ...HostRecordMutationV1[]] {
  return mutations.map(transform) as [HostRecordMutationV1, ...HostRecordMutationV1[]];
}

function cloneMutableRecordV1(record: HostStoredRecordV1): HostStoredRecordV1 {
  return {
    namespace: record.namespace,
    key: record.key,
    revision: record.revision,
    bytes: Uint8Array.from(record.bytes),
  };
}

function createAliasingObservationStoreV1(): HostAtomicRecordStoreV1 {
  const delegate = createSeededMemoryHostRecordStoreInternalV1([]);
  let committedRecords: HostStoredRecordV1[] | undefined;
  let firstListedRecords: HostStoredRecordV1[] | undefined;
  let listCallCount = 0;

  return ({
    async read(namespace: Parameters<HostAtomicRecordStoreV1["read"]>[0], key: HostRecordKeyV1) {
      committedRecords?.pop();
      return await delegate.read(namespace, key);
    },
    async list(namespace: Parameters<HostAtomicRecordStoreV1["list"]>[0]) {
      const correctRecords = (await delegate.list(namespace)).map(cloneMutableRecordV1);
      if (listCallCount++ === 0) {
        firstListedRecords = correctRecords.map((record, index) => ({
          ...record,
          key: keyV1(`aliased.${index}`),
        }));
        return firstListedRecords;
      }
      if (firstListedRecords !== undefined) {
        firstListedRecords.splice(0, firstListedRecords.length, ...correctRecords);
        return firstListedRecords;
      }
      return correctRecords;
    },
    async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
      const result = await delegate.commit(mutations);
      if (result.kind !== "committed") return result;
      committedRecords = result.records.map(cloneMutableRecordV1);
      committedRecords.push({
        ...cloneMutableRecordV1(result.records[0]!),
        key: keyV1(`${result.records[0]!.key as string}.extra`),
      });
      return { kind: "committed" as const, records: committedRecords };
    },
  });
}

describe("Host record store conformance workload", () => {
  it("holds the in-memory Host store to the backend-independent core contract", async () => {
    const store = createSeededMemoryHostRecordStoreInternalV1([]);

    expect(await runHostRecordStoreConformanceV1(store)).toEqual(
      hostRecordStoreConformanceExpectedV1,
    );
  });

  it("round-trips the shared logical key corpus without collisions", async () => {
    const report = await runHostRecordStoreKeyCorpusV1(() =>
      createSeededMemoryHostRecordStoreInternalV1([])
    );

    expect(report).toEqual(hostRecordStoreKeyCorpusExpectedV1);
  });

  it("snapshots adapter-owned key-corpus observations before later calls", async () => {
    const report = await runHostRecordStoreKeyCorpusV1(createAliasingObservationStoreV1);

    expect(report).not.toEqual(hostRecordStoreKeyCorpusExpectedV1);
    expect(
      report.cases.every((testCase) => testCase.committedRecordCount === testCase.keyCount + 1),
    ).toBe(true);
    expect(report.cases.every((testCase) => testCase.listedExactCount === 0)).toBe(true);
    expect(report.cases.every((testCase) => !testCase.listStable)).toBe(true);
  });

  it("rejects the shared malformed mutation corpus without changing state", async () => {
    const store = createSeededMemoryHostRecordStoreInternalV1([]);

    expect(await runHostRecordStoreMalformedConformanceV1(store)).toEqual(
      hostRecordStoreMalformedConformanceExpectedV1,
    );
  });

  it("attributes malformed state drift only to the case that caused it", async () => {
    const delegate = createSeededMemoryHostRecordStoreInternalV1([]);
    const driftingStore = ({
      read: delegate.read,
      list: delegate.list,
      async commit(mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) {
        const first = (mutations as readonly unknown[])[0];
        if (
          typeof first === "object" &&
          first !== null &&
          (first as { readonly kind?: unknown }).kind === "replace"
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
    const byteDriftingStore = ({
      read: delegate.read,
      list: delegate.list,
      commit: (mutations: readonly [HostRecordMutationV1, ...HostRecordMutationV1[]]) =>
        delegate.commit(
          mapMutationsV1(mutations, (mutation) =>
            mutation.kind === "put"
              ? ({
                ...mutation,
                bytes: Uint8Array.of(0xef, 0xbb, 0xbf, ...mutation.bytes),
              })
              : mutation),
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
    const incompleteListingStore = ({
      read: delegate.read,
      async list(namespace: Parameters<HostAtomicRecordStoreV1["list"]>[0]) {
        return ((await delegate.list(namespace)).filter(
          (record) => record.key !== keyV1("conformance.concurrent"),
        ));
      },
      commit: delegate.commit,
    }) satisfies HostAtomicRecordStoreV1;

    const report = await runHostRecordStoreConformanceV1(incompleteListingStore);

    expect(report.immutableListing.keys).not.toContain("conformance.concurrent");
    expect(report).not.toEqual(hostRecordStoreConformanceExpectedV1);
  });

  it("rejects a later revision overflow without committing an earlier mutation", async () => {
    const store = createSeededMemoryHostRecordStoreInternalV1([
      createHostRecordStoreRevisionOverflowSeedV1(),
    ]);

    expect(await runHostRecordStoreRevisionOverflowConformanceV1(store)).toEqual(
      hostRecordStoreRevisionOverflowConformanceExpectedV1,
    );
  });
});
