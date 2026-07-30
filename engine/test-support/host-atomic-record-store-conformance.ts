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

export type HostRecordStoreMalformedCaseIdV1 =
  | "non_array_batch"
  | "empty_batch"
  | "sparse_batch"
  | "null_mutation"
  | "non_object_mutation"
  | "unknown_kind"
  | "unknown_namespace"
  | "non_string_key"
  | "array_bytes"
  | "data_view_bytes"
  | "put_undefined_revision"
  | "put_string_revision"
  | "put_nan_revision"
  | "put_infinite_revision"
  | "put_negative_zero_revision"
  | "put_fractional_revision"
  | "put_negative_revision"
  | "put_unsafe_revision"
  | "delete_null_revision"
  | "delete_undefined_revision"
  | "delete_string_revision"
  | "delete_nan_revision"
  | "delete_infinite_revision"
  | "delete_negative_zero_revision"
  | "delete_fractional_revision"
  | "delete_negative_revision"
  | "delete_unsafe_revision"
  | "late_invalid_bytes"
  | "duplicate_identity";

export interface HostRecordStoreMalformedConformanceReportV1 {
  readonly cases: readonly {
    readonly id: HostRecordStoreMalformedCaseIdV1;
    readonly rejectedWithTypeError: boolean;
    readonly statePreserved: boolean;
  }[];
}

export interface HostRecordStoreRevisionOverflowConformanceReportV1 {
  readonly seedMatched: boolean;
  readonly overflowRejectedWithTypeError: boolean;
  readonly earlierMutationPreserved: boolean;
  readonly maximumRecordPreserved: boolean;
}

export interface HostRecordStoreCorruptBackingReadListReportV1 {
  readonly readRejected: boolean;
  readonly neighborPreservedAfterRead: boolean;
  readonly listRejected: boolean;
  readonly neighborPreservedAfterList: boolean;
}

export interface HostRecordStoreCorruptBackingCommitReportV1 {
  readonly commitRejected: boolean;
  readonly recordBackingUnchangedAfterCommit: boolean;
  readonly earlierMutationAbsent: boolean;
  readonly freshHandleEarlierMutationAbsent: boolean;
  readonly freshHandleCorruptReadRejected: boolean;
  readonly freshHandleNeighborPreserved: boolean;
}

export interface HostRecordStoreCorruptBackingCommitFixtureV1<RecordBackingSnapshot> {
  readonly store: HostAtomicRecordStoreV1;
  readonly createFreshStore: () => HostAtomicRecordStoreV1 | Promise<HostAtomicRecordStoreV1>;
  readonly snapshotRecordBacking: () => RecordBackingSnapshot | Promise<RecordBackingSnapshot>;
  readonly recordBackingSnapshotsEqual: (
    left: RecordBackingSnapshot,
    right: RecordBackingSnapshot,
  ) => boolean | Promise<boolean>;
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

const hostRecordStoreMalformedCaseIdsV1 = Object.freeze([
  "non_array_batch",
  "empty_batch",
  "sparse_batch",
  "null_mutation",
  "non_object_mutation",
  "unknown_kind",
  "unknown_namespace",
  "non_string_key",
  "array_bytes",
  "data_view_bytes",
  "put_undefined_revision",
  "put_string_revision",
  "put_nan_revision",
  "put_infinite_revision",
  "put_negative_zero_revision",
  "put_fractional_revision",
  "put_negative_revision",
  "put_unsafe_revision",
  "delete_null_revision",
  "delete_undefined_revision",
  "delete_string_revision",
  "delete_nan_revision",
  "delete_infinite_revision",
  "delete_negative_zero_revision",
  "delete_fractional_revision",
  "delete_negative_revision",
  "delete_unsafe_revision",
  "late_invalid_bytes",
  "duplicate_identity",
] as const satisfies readonly HostRecordStoreMalformedCaseIdV1[]);

export const hostRecordStoreMalformedConformanceExpectedV1 = Object.freeze({
  cases: Object.freeze(
    hostRecordStoreMalformedCaseIdsV1.map((id) =>
      Object.freeze({
        id,
        rejectedWithTypeError: true,
        statePreserved: true,
      }),
    ),
  ),
}) satisfies DeepReadonly<HostRecordStoreMalformedConformanceReportV1>;

export const hostRecordStoreRevisionOverflowConformanceExpectedV1 = Object.freeze({
  seedMatched: true,
  overflowRejectedWithTypeError: true,
  earlierMutationPreserved: true,
  maximumRecordPreserved: true,
}) satisfies DeepReadonly<HostRecordStoreRevisionOverflowConformanceReportV1>;

export const hostRecordStoreCorruptBackingReadListConformanceExpectedV1 = Object.freeze({
  readRejected: true,
  neighborPreservedAfterRead: true,
  listRejected: true,
  neighborPreservedAfterList: true,
}) satisfies DeepReadonly<HostRecordStoreCorruptBackingReadListReportV1>;

export const hostRecordStoreCorruptBackingCommitConformanceExpectedV1 = Object.freeze({
  commitRejected: true,
  recordBackingUnchangedAfterCommit: true,
  earlierMutationAbsent: true,
  freshHandleEarlierMutationAbsent: true,
  freshHandleCorruptReadRejected: true,
  freshHandleNeighborPreserved: true,
}) satisfies DeepReadonly<HostRecordStoreCorruptBackingCommitReportV1>;

export const hostRecordStoreRevisionOverflowEarlierKeyV1 = keyV1("conformance.overflow.earlier");
export const hostRecordStoreCorruptBackingKeyV1 = keyV1("conformance.corrupt.target");
export const hostRecordStoreCorruptBackingEarlierKeyV1 = keyV1("conformance.corrupt.earlier");

export function createHostRecordStoreRevisionOverflowSeedV1(): HostStoredRecordV1 {
  return Object.freeze({
    namespace: "settings",
    key: keyV1("conformance.overflow.maximum"),
    revision: Number.MAX_SAFE_INTEGER as HostStoredRecordV1["revision"],
    bytes: bytesV1(1, 127, 255),
  });
}

export function createHostRecordStoreCorruptBackingNeighborV1(): HostStoredRecordV1 {
  return Object.freeze({
    namespace: "settings",
    key: keyV1("conformance.corrupt.neighbor"),
    revision: 1 as HostStoredRecordV1["revision"],
    bytes: bytesV1(0, 127, 255, 16),
  });
}

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

async function rejectsV1(operation: () => Promise<unknown>): Promise<boolean> {
  try {
    await operation();
    return false;
  } catch {
    return true;
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

type UnsafeMutationV1 = Readonly<Record<PropertyKey, unknown>>;

interface HostRecordStoreMalformedCaseV1 {
  readonly id: HostRecordStoreMalformedCaseIdV1;
  readonly mutations: unknown;
}

function malformedPutV1(
  id: string,
  overrides: Readonly<Record<PropertyKey, unknown>>,
): UnsafeMutationV1 {
  return Object.freeze({
    kind: "put",
    namespace: "settings",
    key: `conformance.malformed.${id}`,
    expectedRevision: null,
    bytes: bytesV1(1, 2, 3),
    ...overrides,
  });
}

function malformedDeleteV1(id: string, expectedRevision: unknown): UnsafeMutationV1 {
  return Object.freeze({
    kind: "delete",
    namespace: "settings",
    key: `conformance.malformed.${id}`,
    expectedRevision,
  });
}

function malformedCasesV1(victimKey: HostRecordKeyV1): readonly HostRecordStoreMalformedCaseV1[] {
  const sparseBatch: unknown[] = [malformedPutV1("sparse-valid-first", {})];
  sparseBatch.length = 2;
  const cases = [
    { id: "non_array_batch", mutations: {} },
    { id: "empty_batch", mutations: [] },
    { id: "sparse_batch", mutations: Object.freeze(sparseBatch) },
    { id: "null_mutation", mutations: [null] },
    { id: "non_object_mutation", mutations: [7] },
    {
      id: "unknown_kind",
      mutations: [
        Object.freeze({
          kind: "replace",
          namespace: "settings",
          key: victimKey,
          expectedRevision: 1,
        }),
      ],
    },
    {
      id: "unknown_namespace",
      mutations: [malformedPutV1("unknown-namespace", { namespace: "unknown" })],
    },
    {
      id: "non_string_key",
      mutations: [malformedPutV1("non-string-key", { key: 7 })],
    },
    {
      id: "array_bytes",
      mutations: [malformedPutV1("array-bytes", { bytes: [1, 2, 3] })],
    },
    {
      id: "data_view_bytes",
      mutations: [
        malformedPutV1("data-view-bytes", {
          bytes: new DataView(Uint8Array.of(1, 2, 3).buffer),
        }),
      ],
    },
    {
      id: "put_undefined_revision",
      mutations: [malformedPutV1("put-undefined-revision", { expectedRevision: undefined })],
    },
    {
      id: "put_string_revision",
      mutations: [malformedPutV1("put-string-revision", { expectedRevision: "1" })],
    },
    {
      id: "put_nan_revision",
      mutations: [malformedPutV1("put-nan-revision", { expectedRevision: Number.NaN })],
    },
    {
      id: "put_infinite_revision",
      mutations: [
        malformedPutV1("put-infinite-revision", { expectedRevision: Number.POSITIVE_INFINITY }),
      ],
    },
    {
      id: "put_negative_zero_revision",
      mutations: [malformedPutV1("put-negative-zero-revision", { expectedRevision: -0 })],
    },
    {
      id: "put_fractional_revision",
      mutations: [malformedPutV1("put-fractional-revision", { expectedRevision: 1.5 })],
    },
    {
      id: "put_negative_revision",
      mutations: [malformedPutV1("put-negative-revision", { expectedRevision: -1 })],
    },
    {
      id: "put_unsafe_revision",
      mutations: [
        malformedPutV1("put-unsafe-revision", {
          expectedRevision: Number.MAX_SAFE_INTEGER + 1,
        }),
      ],
    },
    {
      id: "delete_null_revision",
      mutations: [malformedDeleteV1("delete-null-revision", null)],
    },
    {
      id: "delete_undefined_revision",
      mutations: [malformedDeleteV1("delete-undefined-revision", undefined)],
    },
    {
      id: "delete_string_revision",
      mutations: [malformedDeleteV1("delete-string-revision", "1")],
    },
    {
      id: "delete_nan_revision",
      mutations: [malformedDeleteV1("delete-nan-revision", Number.NaN)],
    },
    {
      id: "delete_infinite_revision",
      mutations: [malformedDeleteV1("delete-infinite-revision", Number.POSITIVE_INFINITY)],
    },
    {
      id: "delete_negative_zero_revision",
      mutations: [malformedDeleteV1("delete-negative-zero-revision", -0)],
    },
    {
      id: "delete_fractional_revision",
      mutations: [malformedDeleteV1("delete-fractional-revision", 1.5)],
    },
    {
      id: "delete_negative_revision",
      mutations: [malformedDeleteV1("delete-negative-revision", -1)],
    },
    {
      id: "delete_unsafe_revision",
      mutations: [malformedDeleteV1("delete-unsafe-revision", Number.MAX_SAFE_INTEGER + 1)],
    },
    {
      id: "late_invalid_bytes",
      mutations: [
        malformedPutV1("late-valid", {}),
        malformedPutV1("late-invalid", { bytes: [4, 5, 6] }),
      ],
    },
    {
      id: "duplicate_identity",
      mutations: [malformedPutV1("duplicate", {}), malformedDeleteV1("duplicate", 1)],
    },
  ] as const satisfies readonly HostRecordStoreMalformedCaseV1[];
  return Object.freeze(cases);
}

async function recordStoreStateV1(store: HostAtomicRecordStoreV1): Promise<readonly string[]> {
  const namespaces = ["save", "lease", "settings"] as const;
  const records = (
    await Promise.all(
      namespaces.map(async (namespace) =>
        (await store.list(namespace)).map(
          (record) =>
            `${record.namespace}\0${record.key as string}\0${String(record.revision)}\0${Array.from(
              record.bytes,
            ).join(",")}`,
        ),
      ),
    )
  ).flat();
  return Object.freeze(records.toSorted());
}

/**
 * Runs malformed Host-mutation probes against one otherwise empty store.
 */
export async function runHostRecordStoreMalformedConformanceV1(
  store: HostAtomicRecordStoreV1,
): Promise<DeepReadonly<HostRecordStoreMalformedConformanceReportV1>> {
  const victimKey = keyV1("conformance.malformed.victim");
  committedV1(await store.commit([putV1("settings", victimKey, null, bytesV1(7, 8, 9, 255))]));
  const cases = [];
  for (const testCase of malformedCasesV1(victimKey)) {
    const beforeState = await recordStoreStateV1(store);
    const rejectedWithTypeError = await rejectsTypeErrorV1(() =>
      store.commit(testCase.mutations as never),
    );
    cases.push(
      Object.freeze({
        id: testCase.id,
        rejectedWithTypeError,
        statePreserved:
          JSON.stringify(await recordStoreStateV1(store)) === JSON.stringify(beforeState),
      }),
    );
  }
  return Object.freeze({
    cases: Object.freeze(cases),
  });
}

/**
 * Runs the matched-revision overflow boundary against a store pre-seeded with
 * createHostRecordStoreRevisionOverflowSeedV1(). Stale-MAX conflict precedence
 * remains intentionally outside this workload.
 */
export async function runHostRecordStoreRevisionOverflowConformanceV1(
  store: HostAtomicRecordStoreV1,
): Promise<DeepReadonly<HostRecordStoreRevisionOverflowConformanceReportV1>> {
  const seed = createHostRecordStoreRevisionOverflowSeedV1();
  const earlierKey = hostRecordStoreRevisionOverflowEarlierKeyV1;
  const beforeMaximum = await store.read(seed.namespace, seed.key);
  const seedMatched =
    beforeMaximum !== null &&
    beforeMaximum.namespace === seed.namespace &&
    beforeMaximum.key === seed.key &&
    beforeMaximum.revision === seed.revision &&
    bytesEqualV1(beforeMaximum.bytes, seed.bytes) &&
    (await store.read("settings", earlierKey)) === null;

  const overflowRejectedWithTypeError = await rejectsTypeErrorV1(() =>
    store.commit([
      putV1("settings", earlierKey, null, bytesV1(2, 128, 254)),
      putV1(seed.namespace, seed.key, seed.revision, bytesV1(3, 129, 253)),
    ]),
  );
  const afterMaximum = await store.read(seed.namespace, seed.key);
  const earlierMutationPreserved = (await store.read("settings", earlierKey)) === null;
  const maximumRecordPreserved =
    afterMaximum !== null &&
    afterMaximum.namespace === seed.namespace &&
    afterMaximum.key === seed.key &&
    afterMaximum.revision === seed.revision &&
    bytesEqualV1(afterMaximum.bytes, seed.bytes);

  return Object.freeze({
    seedMatched,
    overflowRejectedWithTypeError,
    earlierMutationPreserved,
    maximumRecordPreserved,
  });
}

/**
 * Runs read and list fail-closed probes against separately seeded corrupt
 * backings. The factory must also seed createHostRecordStoreCorruptBackingNeighborV1()
 * so the report can prove unrelated valid data remains readable without
 * constraining repair or quarantine behavior for the corrupt record itself.
 */
export async function runHostRecordStoreCorruptBackingReadListConformanceV1(
  createStore: () => HostAtomicRecordStoreV1 | Promise<HostAtomicRecordStoreV1>,
): Promise<DeepReadonly<HostRecordStoreCorruptBackingReadListReportV1>> {
  const neighbor = createHostRecordStoreCorruptBackingNeighborV1();

  const readStore = await createStore();
  const readRejected = await rejectsV1(() =>
    readStore.read(neighbor.namespace, hostRecordStoreCorruptBackingKeyV1),
  );
  const neighborAfterRead = await readStore.read(neighbor.namespace, neighbor.key);

  const listStore = await createStore();
  const listRejected = await rejectsV1(() => listStore.list(neighbor.namespace));
  const neighborAfterList = await listStore.read(neighbor.namespace, neighbor.key);

  const neighborMatchesV1 = (record: HostStoredRecordV1 | null) =>
    record !== null &&
    record.namespace === neighbor.namespace &&
    record.key === neighbor.key &&
    record.revision === neighbor.revision &&
    bytesEqualV1(record.bytes, neighbor.bytes);

  return Object.freeze({
    readRejected,
    neighborPreservedAfterRead: neighborMatchesV1(neighborAfterRead),
    listRejected,
    neighborPreservedAfterList: neighborMatchesV1(neighborAfterList),
  });
}

/**
 * Runs a valid two-put batch against a backing whose target has revision 1 but
 * an objectively invalid persisted bytes representation. Adapter-local
 * snapshots compare the logical record backing immediately after the rejected
 * commit, before any Host read or fresh-handle probe can exercise a separate
 * repair policy.
 */
export async function runHostRecordStoreCorruptBackingCommitConformanceV1<RecordBackingSnapshot>(
  createFixture: () =>
    | HostRecordStoreCorruptBackingCommitFixtureV1<RecordBackingSnapshot>
    | Promise<HostRecordStoreCorruptBackingCommitFixtureV1<RecordBackingSnapshot>>,
): Promise<DeepReadonly<HostRecordStoreCorruptBackingCommitReportV1>> {
  const fixture = await createFixture();
  const beforeCommit = await fixture.snapshotRecordBacking();
  const commitRejected = await rejectsV1(() =>
    fixture.store.commit([
      putV1("settings", hostRecordStoreCorruptBackingEarlierKeyV1, null, bytesV1(2, 128, 254)),
      putV1("settings", hostRecordStoreCorruptBackingKeyV1, 1, bytesV1(3, 129, 253)),
    ]),
  );
  const afterCommit = await fixture.snapshotRecordBacking();
  const recordBackingUnchangedAfterCommit = await fixture.recordBackingSnapshotsEqual(
    beforeCommit,
    afterCommit,
  );
  const earlierMutationAbsent =
    (await fixture.store.read("settings", hostRecordStoreCorruptBackingEarlierKeyV1)) === null;

  const freshStore = await fixture.createFreshStore();
  const freshHandleEarlierMutationAbsent =
    (await freshStore.read("settings", hostRecordStoreCorruptBackingEarlierKeyV1)) === null;
  const freshHandleCorruptReadRejected = await rejectsV1(() =>
    freshStore.read("settings", hostRecordStoreCorruptBackingKeyV1),
  );
  const neighbor = createHostRecordStoreCorruptBackingNeighborV1();
  const freshNeighbor = await freshStore.read(neighbor.namespace, neighbor.key);
  const freshHandleNeighborPreserved =
    freshNeighbor !== null &&
    freshNeighbor.namespace === neighbor.namespace &&
    freshNeighbor.key === neighbor.key &&
    freshNeighbor.revision === neighbor.revision &&
    bytesEqualV1(freshNeighbor.bytes, neighbor.bytes);

  return Object.freeze({
    commitRejected,
    recordBackingUnchangedAfterCommit,
    earlierMutationAbsent,
    freshHandleEarlierMutationAbsent,
    freshHandleCorruptReadRejected,
    freshHandleNeighborPreserved,
  });
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
