// SPDX-License-Identifier: MIT
import type {
  DeepReadonly,
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
} from "@sillymaker/base";

type HostAtomicCommitResultV1 = Awaited<ReturnType<HostAtomicRecordStoreV1["commit"]>>;
type HostRecordKeyV1 = HostStoredRecordV1["key"];

const keyV1 = (value: string) => value as HostRecordKeyV1;
const bytesV1 = (...values: number[]) => Uint8Array.from(values);
const byteReportV1 = (value: Uint8Array) => Object.freeze(Array.from(value));

function byteReportsEqualV1(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

export interface HostRecordStoreConformanceReportV1 {
  readonly validation: {
    readonly emptyRejected: boolean;
    readonly duplicateRejected: boolean;
    readonly duplicateLeftStoreEmpty: boolean;
  };
  readonly singleKey: {
    readonly createdRevision: number;
    readonly stalePutActualRevision: number | null;
    readonly updatedRevision: number;
    readonly staleDeleteActualRevision: number | null;
    readonly deleted: boolean;
  };
  readonly multiKey: {
    readonly conflictNamespace: string;
    readonly conflictKey: string;
    readonly conflictActualRevision: number | null;
    readonly valuesAfterConflict: readonly (readonly number[])[];
    readonly valuesAfterCommit: readonly (readonly number[])[];
    readonly committedRevisions: readonly number[];
  };
  readonly concurrentCas: {
    readonly committedCount: number;
    readonly conflictCount: number;
    readonly conflictActualRevision: number | null;
    readonly storedRevision: number | null;
    readonly storedMatchesCommittedBytes: boolean;
  };
  readonly immutableListing: {
    readonly keys: readonly string[];
    readonly valuesAfterExternalMutation: readonly (readonly number[])[];
    readonly inputBytesDefended: boolean;
    readonly committedBytesDefended: boolean;
    readonly readBytesDefended: boolean;
    readonly listedBytesDefended: boolean;
    readonly envelopesFrozen: boolean;
  };
}

export interface HostRecordStoreReopenConformanceReportV1 {
  readonly firstRevision: number | null;
  readonly firstValue: readonly number[] | null;
  readonly updatedRevision: number;
  readonly secondRevision: number | null;
  readonly secondValue: readonly number[] | null;
}

export const hostRecordStoreConformanceExpectedV1 = Object.freeze({
  validation: Object.freeze({
    emptyRejected: true,
    duplicateRejected: true,
    duplicateLeftStoreEmpty: true,
  }),
  singleKey: Object.freeze({
    createdRevision: 1,
    stalePutActualRevision: 1,
    updatedRevision: 2,
    staleDeleteActualRevision: 2,
    deleted: true,
  }),
  multiKey: Object.freeze({
    conflictNamespace: "lease",
    conflictKey: "conformance.atomic.right",
    conflictActualRevision: 1,
    valuesAfterConflict: Object.freeze([
      Object.freeze([0, 128, 255, 1]),
      Object.freeze([255, 127, 0, 2]),
    ]),
    valuesAfterCommit: Object.freeze([
      Object.freeze([0, 222, 173, 190, 239]),
      Object.freeze([255, 202, 254, 186, 190]),
    ]),
    committedRevisions: Object.freeze([2, 2]),
  }),
  concurrentCas: Object.freeze({
    committedCount: 1,
    conflictCount: 1,
    conflictActualRevision: 1,
    storedRevision: 1,
    storedMatchesCommittedBytes: true,
  }),
  immutableListing: Object.freeze({
    keys: Object.freeze([
      "conformance.concurrent",
      "conformance.list.a",
      "conformance.list.m",
      "conformance.list.x",
      "conformance.list.z",
    ]),
    valuesAfterExternalMutation: Object.freeze([
      Object.freeze([255, 97, 0]),
      Object.freeze([128, 109, 1]),
      Object.freeze([1, 120, 128, 0]),
      Object.freeze([0, 122, 255]),
    ]),
    inputBytesDefended: true,
    committedBytesDefended: true,
    readBytesDefended: true,
    listedBytesDefended: true,
    envelopesFrozen: true,
  }),
}) satisfies DeepReadonly<HostRecordStoreConformanceReportV1>;

export const hostRecordStoreReopenExpectedV1 = Object.freeze({
  firstRevision: 1,
  firstValue: Object.freeze([0, 16, 255, 128]),
  updatedRevision: 2,
  secondRevision: 2,
  secondValue: Object.freeze([255, 32, 0, 129]),
}) satisfies DeepReadonly<HostRecordStoreReopenConformanceReportV1>;

function putV1(
  namespace: HostRecordMutationV1["namespace"],
  key: string,
  expectedRevision: number | null,
  bytes: Uint8Array,
): Extract<HostRecordMutationV1, { readonly kind: "put" }> {
  return Object.freeze({
    kind: "put",
    namespace,
    key: keyV1(key),
    expectedRevision: expectedRevision as HostStoredRecordV1["revision"] | null,
    bytes,
  });
}

function deleteV1(
  namespace: HostRecordMutationV1["namespace"],
  key: string,
  expectedRevision: number,
): Extract<HostRecordMutationV1, { readonly kind: "delete" }> {
  return Object.freeze({
    kind: "delete",
    namespace,
    key: keyV1(key),
    expectedRevision: expectedRevision as HostStoredRecordV1["revision"],
  });
}

async function rejectsTypeErrorV1(operation: () => Promise<unknown>): Promise<boolean> {
  try {
    await operation();
    return false;
  } catch (error) {
    return error instanceof TypeError;
  }
}

function committedV1(
  result: HostAtomicCommitResultV1,
): Extract<HostAtomicCommitResultV1, { readonly kind: "committed" }> {
  if (result.kind !== "committed") {
    throw new TypeError("testkit.host_record_conformance_expected_commit");
  }
  return result;
}

function conflictV1(
  result: HostAtomicCommitResultV1,
): Extract<HostAtomicCommitResultV1, { readonly kind: "conflict" }> {
  if (result.kind !== "conflict") {
    throw new TypeError("testkit.host_record_conformance_expected_conflict");
  }
  return result;
}

function recordV1(
  records: readonly HostStoredRecordV1[],
  key: HostRecordKeyV1,
): HostStoredRecordV1 {
  const record = records.find((candidate) => candidate.key === key);
  if (record === undefined) {
    throw new TypeError("testkit.host_record_conformance_missing_record");
  }
  return record;
}

async function readRequiredV1(
  store: HostAtomicRecordStoreV1,
  namespace: HostRecordMutationV1["namespace"],
  key: HostRecordKeyV1,
): Promise<HostStoredRecordV1> {
  const record = await store.read(namespace, key);
  if (record === null) {
    throw new TypeError("testkit.host_record_conformance_missing_record");
  }
  return record;
}

/**
 * Runs one neutral, deterministic core workload against an empty Host record
 * store. Adapter-specific corruption, crash, and platform-key probes remain
 * separate so candidates cannot hide a failed mandatory case behind a
 * capability flag.
 */
export async function runHostRecordStoreConformanceV1(
  store: HostAtomicRecordStoreV1,
): Promise<DeepReadonly<HostRecordStoreConformanceReportV1>> {
  const duplicateKey = keyV1("conformance.validation.duplicate");
  const emptyRejected = await rejectsTypeErrorV1(() => store.commit([] as never));
  const duplicateRejected = await rejectsTypeErrorV1(() =>
    store.commit([
      putV1("settings", duplicateKey, null, bytesV1(1, 255)),
      putV1("settings", duplicateKey, null, bytesV1(2, 0)),
    ]),
  );
  const duplicateLeftStoreEmpty = (await store.read("settings", duplicateKey)) === null;

  const singleKey = keyV1("conformance.single");
  const created = committedV1(
    await store.commit([putV1("settings", singleKey, null, bytesV1(0, 255, 16))]),
  );
  const stalePut = conflictV1(
    await store.commit([putV1("settings", singleKey, null, bytesV1(255, 0, 1))]),
  );
  const updated = committedV1(
    await store.commit([putV1("settings", singleKey, 1, bytesV1(17, 128, 0))]),
  );
  const staleDelete = conflictV1(await store.commit([deleteV1("settings", singleKey, 1)]));
  committedV1(await store.commit([deleteV1("settings", singleKey, 2)]));

  const leftKey = keyV1("conformance.atomic.left");
  const rightKey = keyV1("conformance.atomic.right");
  committedV1(
    await store.commit([
      putV1("save", leftKey, null, bytesV1(0, 128, 255, 1)),
      putV1("lease", rightKey, null, bytesV1(255, 127, 0, 2)),
    ]),
  );
  const batchConflict = conflictV1(
    await store.commit([
      putV1("save", leftKey, 1, bytesV1(9, 0, 255)),
      putV1("lease", rightKey, 9, bytesV1(10, 255, 0)),
    ]),
  );
  const valuesAfterConflict = Object.freeze([
    byteReportV1((await readRequiredV1(store, "save", leftKey)).bytes),
    byteReportV1((await readRequiredV1(store, "lease", rightKey)).bytes),
  ]);
  const batchCommit = committedV1(
    await store.commit([
      putV1("save", leftKey, 1, bytesV1(0, 222, 173, 190, 239)),
      putV1("lease", rightKey, 1, bytesV1(255, 202, 254, 186, 190)),
    ]),
  );
  const valuesAfterCommit = Object.freeze([
    byteReportV1((await readRequiredV1(store, "save", leftKey)).bytes),
    byteReportV1((await readRequiredV1(store, "lease", rightKey)).bytes),
  ]);

  const concurrentKey = keyV1("conformance.concurrent");
  const concurrent = await Promise.all([
    store.commit([putV1("settings", concurrentKey, null, bytesV1(0, 1, 2, 255))]),
    store.commit([putV1("settings", concurrentKey, null, bytesV1(255, 2, 1, 0))]),
  ]);
  const concurrentCommits = concurrent.filter(
    (result): result is Extract<HostAtomicCommitResultV1, { readonly kind: "committed" }> =>
      result.kind === "committed",
  );
  const concurrentConflicts = concurrent.filter(
    (result): result is Extract<HostAtomicCommitResultV1, { readonly kind: "conflict" }> =>
      result.kind === "conflict",
  );
  const concurrentStored = await store.read("settings", concurrentKey);
  const concurrentCommittedRecord = concurrentCommits[0]?.records[0];
  const storedMatchesCommittedBytes =
    concurrentStored !== null &&
    concurrentCommittedRecord !== undefined &&
    bytesEqualV1(concurrentStored.bytes, concurrentCommittedRecord.bytes);

  const listInputs = Object.freeze([
    Object.freeze({ key: keyV1("conformance.list.z"), bytes: bytesV1(0, 122, 255) }),
    Object.freeze({ key: keyV1("conformance.list.a"), bytes: bytesV1(255, 97, 0) }),
    Object.freeze({ key: keyV1("conformance.list.m"), bytes: bytesV1(128, 109, 1) }),
    Object.freeze({ key: keyV1("conformance.list.x"), bytes: bytesV1(1, 120, 128, 0) }),
  ]);
  const listCommit = committedV1(
    await store.commit(
      listInputs.map(({ key, bytes }) => putV1("settings", key, null, bytes)) as [
        HostRecordMutationV1,
        ...HostRecordMutationV1[],
      ],
    ),
  );
  listInputs[0]!.bytes[0] = 99;
  const committedA = recordV1(listCommit.records, keyV1("conformance.list.a"));
  committedA.bytes[0] = 0;
  const firstReadM = await readRequiredV1(store, "settings", keyV1("conformance.list.m"));
  firstReadM.bytes[0] = 0;
  const listed = await store.list("settings");
  const listedX = recordV1(listed, keyV1("conformance.list.x"));
  listedX.bytes[0] = 0;
  const valuesAfterExternalMutation = Object.freeze(
    await Promise.all(
      ["a", "m", "x", "z"].map(async (suffix) =>
        byteReportV1(
          (await readRequiredV1(store, "settings", keyV1(`conformance.list.${suffix}`))).bytes,
        ),
      ),
    ),
  );

  return Object.freeze({
    validation: Object.freeze({
      emptyRejected,
      duplicateRejected,
      duplicateLeftStoreEmpty,
    }),
    singleKey: Object.freeze({
      createdRevision: recordV1(created.records, singleKey).revision,
      stalePutActualRevision: stalePut.actualRevision,
      updatedRevision: recordV1(updated.records, singleKey).revision,
      staleDeleteActualRevision: staleDelete.actualRevision,
      deleted: (await store.read("settings", singleKey)) === null,
    }),
    multiKey: Object.freeze({
      conflictNamespace: batchConflict.namespace,
      conflictKey: batchConflict.key,
      conflictActualRevision: batchConflict.actualRevision,
      valuesAfterConflict,
      valuesAfterCommit,
      committedRevisions: Object.freeze(batchCommit.records.map((record) => record.revision)),
    }),
    concurrentCas: Object.freeze({
      committedCount: concurrentCommits.length,
      conflictCount: concurrentConflicts.length,
      conflictActualRevision: concurrentConflicts[0]?.actualRevision ?? null,
      storedRevision: concurrentStored?.revision ?? null,
      storedMatchesCommittedBytes,
    }),
    immutableListing: Object.freeze({
      keys: Object.freeze(listed.map((record) => record.key)),
      valuesAfterExternalMutation,
      inputBytesDefended: byteReportsEqualV1(valuesAfterExternalMutation[3]!, [0, 122, 255]),
      committedBytesDefended: byteReportsEqualV1(valuesAfterExternalMutation[0]!, [255, 97, 0]),
      readBytesDefended: byteReportsEqualV1(valuesAfterExternalMutation[1]!, [128, 109, 1]),
      listedBytesDefended: byteReportsEqualV1(valuesAfterExternalMutation[2]!, [1, 120, 128, 0]),
      envelopesFrozen:
        Object.isFrozen(listCommit) &&
        Object.isFrozen(listCommit.records) &&
        listCommit.records.every(Object.isFrozen) &&
        Object.isFrozen(listed) &&
        listed.every(Object.isFrozen),
    }),
  });
}

/** Runs the persistence-only portion with newly constructed adapter handles. */
export async function runHostRecordStoreReopenConformanceV1(
  store: HostAtomicRecordStoreV1,
  reopen: () => HostAtomicRecordStoreV1 | Promise<HostAtomicRecordStoreV1>,
): Promise<DeepReadonly<HostRecordStoreReopenConformanceReportV1>> {
  const key = keyV1("conformance.reopen");
  committedV1(await store.commit([putV1("settings", key, null, bytesV1(0, 16, 255, 128))]));
  const firstReopen = await reopen();
  const first = await firstReopen.read("settings", key);
  const updated = committedV1(
    await firstReopen.commit([putV1("settings", key, 1, bytesV1(255, 32, 0, 129))]),
  );
  const secondReopen = await reopen();
  const second = await secondReopen.read("settings", key);

  return Object.freeze({
    firstRevision: first?.revision ?? null,
    firstValue: first === null ? null : byteReportV1(first.bytes),
    updatedRevision: recordV1(updated.records, key).revision,
    secondRevision: second?.revision ?? null,
    secondValue: second === null ? null : byteReportV1(second.bytes),
  });
}
