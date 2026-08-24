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
const byteReportV1 = (value: Uint8Array) => (Array.from(value));

function byteReportsEqualV1(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function bytesEqualV1(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.byteLength === right.byteLength && left.every((value, index) => value === right[index])
  );
}

function snapshotRecordsV1(records: readonly HostStoredRecordV1[]): readonly HostStoredRecordV1[] {
  return records.map((record) => ({
    namespace: record.namespace,
    key: record.key,
    revision: record.revision,
    bytes: Uint8Array.from(record.bytes),
  }));
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
  };
}

export interface HostRecordStoreReopenConformanceReportV1 {
  readonly firstRevision: number | null;
  readonly firstValue: readonly number[] | null;
  readonly updatedRevision: number;
  readonly secondRevision: number | null;
  readonly secondValue: readonly number[] | null;
}

export type HostRecordStoreKeyCorpusCaseIdV1 =
  | "case_distinct"
  | "non_ascii"
  | "filesystem_reserved"
  | "representative_long";

export interface HostRecordStoreKeyCorpusReportV1 {
  readonly cases: readonly {
    readonly id: HostRecordStoreKeyCorpusCaseIdV1;
    readonly keyCount: number;
    readonly committedRecordCount: number;
    readonly committedExactCount: number;
    readonly readExactCount: number;
    readonly listedRecordCount: number;
    readonly listedExactCount: number;
    readonly listStable: boolean;
    readonly rejected: boolean;
  }[];
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

export const hostRecordStoreConformanceExpectedV1 = ({
  validation: {
    emptyRejected: true,
    duplicateRejected: true,
    duplicateLeftStoreEmpty: true,
  },
  singleKey: {
    createdRevision: 1,
    stalePutActualRevision: 1,
    updatedRevision: 2,
    staleDeleteActualRevision: 2,
    deleted: true,
  },
  multiKey: {
    conflictNamespace: "lease",
    conflictKey: "conformance.atomic.right",
    conflictActualRevision: 1,
    valuesAfterConflict: [
      [0, 128, 255, 1],
      [255, 127, 0, 2],
    ],
    valuesAfterCommit: [
      [0, 222, 173, 190, 239],
      [255, 202, 254, 186, 190],
    ],
    committedRevisions: [2, 2],
  },
  concurrentCas: {
    committedCount: 1,
    conflictCount: 1,
    conflictActualRevision: 1,
    storedRevision: 1,
    storedMatchesCommittedBytes: true,
  },
  immutableListing: {
    keys: [
      "conformance.concurrent",
      "conformance.list.a",
      "conformance.list.m",
      "conformance.list.x",
      "conformance.list.z",
    ],
    valuesAfterExternalMutation: [
      [255, 97, 0],
      [128, 109, 1],
      [1, 120, 128, 0],
      [0, 122, 255],
    ],
    inputBytesDefended: true,
    committedBytesDefended: true,
    readBytesDefended: true,
    listedBytesDefended: true,
  },
}) satisfies DeepReadonly<HostRecordStoreConformanceReportV1>;

export const hostRecordStoreReopenExpectedV1 = ({
  firstRevision: 1,
  firstValue: [0, 16, 255, 128],
  updatedRevision: 2,
  secondRevision: 2,
  secondValue: [255, 32, 0, 129],
}) satisfies DeepReadonly<HostRecordStoreReopenConformanceReportV1>;

export const hostRecordStoreKeyCorpusExpectedV1 = ({
  cases: [
    {
      id: "case_distinct",
      keyCount: 2,
      committedRecordCount: 2,
      committedExactCount: 2,
      readExactCount: 2,
      listedRecordCount: 2,
      listedExactCount: 2,
      listStable: true,
      rejected: false,
    },
    {
      id: "non_ascii",
      keyCount: 2,
      committedRecordCount: 2,
      committedExactCount: 2,
      readExactCount: 2,
      listedRecordCount: 2,
      listedExactCount: 2,
      listStable: true,
      rejected: false,
    },
    {
      id: "filesystem_reserved",
      keyCount: 4,
      committedRecordCount: 4,
      committedExactCount: 4,
      readExactCount: 4,
      listedRecordCount: 4,
      listedExactCount: 4,
      listStable: true,
      rejected: false,
    },
    {
      id: "representative_long",
      keyCount: 2,
      committedRecordCount: 2,
      committedExactCount: 2,
      readExactCount: 2,
      listedRecordCount: 2,
      listedExactCount: 2,
      listStable: true,
      rejected: false,
    },
  ],
}) satisfies DeepReadonly<HostRecordStoreKeyCorpusReportV1>;

const hostRecordStoreMalformedCaseIdsV1 = [
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
] as const satisfies readonly HostRecordStoreMalformedCaseIdV1[];

export const hostRecordStoreMalformedConformanceExpectedV1 = ({
  cases: hostRecordStoreMalformedCaseIdsV1.map((id) => ({
    id,
    rejectedWithTypeError: true,
    statePreserved: true,
  })),
}) satisfies DeepReadonly<HostRecordStoreMalformedConformanceReportV1>;

export const hostRecordStoreRevisionOverflowConformanceExpectedV1 = ({
  seedMatched: true,
  overflowRejectedWithTypeError: true,
  earlierMutationPreserved: true,
  maximumRecordPreserved: true,
}) satisfies DeepReadonly<HostRecordStoreRevisionOverflowConformanceReportV1>;

export const hostRecordStoreCorruptBackingReadListConformanceExpectedV1 = ({
  readRejected: true,
  neighborPreservedAfterRead: true,
  listRejected: true,
  neighborPreservedAfterList: true,
}) satisfies DeepReadonly<HostRecordStoreCorruptBackingReadListReportV1>;

export const hostRecordStoreCorruptBackingCommitConformanceExpectedV1 = ({
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
  return ({
    namespace: "settings",
    key: keyV1("conformance.overflow.maximum"),
    revision: Number.MAX_SAFE_INTEGER as HostStoredRecordV1["revision"],
    bytes: bytesV1(1, 127, 255),
  });
}

export function createHostRecordStoreCorruptBackingNeighborV1(): HostStoredRecordV1 {
  return ({
    namespace: "settings",
    key: keyV1("conformance.corrupt.neighbor"),
    revision: 1 as HostStoredRecordV1["revision"],
    bytes: bytesV1(0, 127, 255, 16),
  });
}

interface HostRecordStoreKeyCorpusEntryV1 {
  readonly key: string;
  readonly byteValues: readonly number[];
}

interface HostRecordStoreKeyCorpusCaseV1 {
  readonly id: HostRecordStoreKeyCorpusCaseIdV1;
  readonly entries: readonly HostRecordStoreKeyCorpusEntryV1[];
}

const longKeyPrefixV1 = "conformance.keys.long.";
const longKeyBodyV1 = "x".repeat(1024 - longKeyPrefixV1.length - 1);
const hostRecordStoreKeyCorpusV1 = [
  {
    id: "case_distinct",
    entries: [
      {
        key: "conformance.keys.Case",
        byteValues: [1, 0, 255],
      },
      {
        key: "conformance.keys.case",
        byteValues: [2, 0, 254],
      },
    ],
  },
  {
    id: "non_ascii",
    entries: [
      {
        key: "conformance.keys/猫咪/東京",
        byteValues: [3, 128, 253],
      },
      {
        key: "conformance.keys/mañana/Δ",
        byteValues: [4, 129, 252],
      },
    ],
  },
  {
    id: "filesystem_reserved",
    entries: [
      { key: "CON", byteValues: [5, 130, 251] },
      { key: "NUL", byteValues: [6, 131, 250] },
      {
        key: "COM1",
        byteValues: [7, 132, 249],
      },
      {
        key: '<>:"/\\|?*',
        byteValues: [8, 133, 248],
      },
    ],
  },
  {
    id: "representative_long",
    entries: [
      {
        key: `${longKeyPrefixV1}${longKeyBodyV1}a`,
        byteValues: [9, 134, 247],
      },
      {
        key: `${longKeyPrefixV1}${longKeyBodyV1}b`,
        byteValues: [10, 135, 246],
      },
    ],
  },
] as const satisfies readonly HostRecordStoreKeyCorpusCaseV1[];

function putV1(
  namespace: HostRecordMutationV1["namespace"],
  key: string,
  expectedRevision: number | null,
  bytes: Uint8Array,
): Extract<HostRecordMutationV1, { readonly kind: "put" }> {
  return ({
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
  return ({
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
  return ({
    kind: "put",
    namespace: "settings",
    key: `conformance.malformed.${id}`,
    expectedRevision: null,
    bytes: bytesV1(1, 2, 3),
    ...overrides,
  });
}

function malformedDeleteV1(id: string, expectedRevision: unknown): UnsafeMutationV1 {
  return ({
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
    { id: "sparse_batch", mutations: sparseBatch },
    { id: "null_mutation", mutations: [null] },
    { id: "non_object_mutation", mutations: [7] },
    {
      id: "unknown_kind",
      mutations: [
        {
          kind: "replace",
          namespace: "settings",
          key: victimKey,
          expectedRevision: 1,
        },
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
  return cases;
}

async function recordStoreStateV1(store: HostAtomicRecordStoreV1): Promise<readonly string[]> {
  const namespaces = ["save", "lease", "settings"] as const;
  const records = (
    await Promise.all(
      namespaces.map(async (namespace) =>
        (await store.list(namespace)).map(
          (record) =>
            `${record.namespace}\0${record.key as string}\0${String(record.revision)}\0${
              Array.from(
                record.bytes,
              ).join(",")
            }`,
        )
      ),
    )
  ).flat();
  return (records.toSorted());
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
      store.commit(testCase.mutations as never)
    );
    cases.push(
      {
        id: testCase.id,
        rejectedWithTypeError,
        statePreserved:
          JSON.stringify(await recordStoreStateV1(store)) === JSON.stringify(beforeState),
      },
    );
  }
  return ({
    cases: cases,
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
  const seedMatched = beforeMaximum !== null &&
    beforeMaximum.namespace === seed.namespace &&
    beforeMaximum.key === seed.key &&
    beforeMaximum.revision === seed.revision &&
    bytesEqualV1(beforeMaximum.bytes, seed.bytes) &&
    (await store.read("settings", earlierKey)) === null;

  const overflowRejectedWithTypeError = await rejectsTypeErrorV1(() =>
    store.commit([
      putV1("settings", earlierKey, null, bytesV1(2, 128, 254)),
      putV1(seed.namespace, seed.key, seed.revision, bytesV1(3, 129, 253)),
    ])
  );
  const afterMaximum = await store.read(seed.namespace, seed.key);
  const earlierMutationPreserved = (await store.read("settings", earlierKey)) === null;
  const maximumRecordPreserved = afterMaximum !== null &&
    afterMaximum.namespace === seed.namespace &&
    afterMaximum.key === seed.key &&
    afterMaximum.revision === seed.revision &&
    bytesEqualV1(afterMaximum.bytes, seed.bytes);

  return ({
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
    readStore.read(neighbor.namespace, hostRecordStoreCorruptBackingKeyV1)
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

  return ({
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
    ])
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
    freshStore.read("settings", hostRecordStoreCorruptBackingKeyV1)
  );
  const neighbor = createHostRecordStoreCorruptBackingNeighborV1();
  const freshNeighbor = await freshStore.read(neighbor.namespace, neighbor.key);
  const freshHandleNeighborPreserved = freshNeighbor !== null &&
    freshNeighbor.namespace === neighbor.namespace &&
    freshNeighbor.key === neighbor.key &&
    freshNeighbor.revision === neighbor.revision &&
    bytesEqualV1(freshNeighbor.bytes, neighbor.bytes);

  return ({
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
    ])
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
  const valuesAfterConflict = [
    byteReportV1((await readRequiredV1(store, "save", leftKey)).bytes),
    byteReportV1((await readRequiredV1(store, "lease", rightKey)).bytes),
  ];
  const batchCommit = committedV1(
    await store.commit([
      putV1("save", leftKey, 1, bytesV1(0, 222, 173, 190, 239)),
      putV1("lease", rightKey, 1, bytesV1(255, 202, 254, 186, 190)),
    ]),
  );
  const valuesAfterCommit = [
    byteReportV1((await readRequiredV1(store, "save", leftKey)).bytes),
    byteReportV1((await readRequiredV1(store, "lease", rightKey)).bytes),
  ];

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
  const storedMatchesCommittedBytes = concurrentStored !== null &&
    concurrentCommittedRecord !== undefined &&
    bytesEqualV1(concurrentStored.bytes, concurrentCommittedRecord.bytes);

  const listInputs = [
    { key: keyV1("conformance.list.z"), bytes: bytesV1(0, 122, 255) },
    { key: keyV1("conformance.list.a"), bytes: bytesV1(255, 97, 0) },
    { key: keyV1("conformance.list.m"), bytes: bytesV1(128, 109, 1) },
    { key: keyV1("conformance.list.x"), bytes: bytesV1(1, 120, 128, 0) },
  ];
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
  const valuesAfterExternalMutation = await Promise.all(
    ["a", "m", "x", "z"].map(async (suffix) =>
      byteReportV1(
        (await readRequiredV1(store, "settings", keyV1(`conformance.list.${suffix}`))).bytes,
      )
    ),
  );

  return ({
    validation: {
      emptyRejected,
      duplicateRejected,
      duplicateLeftStoreEmpty,
    },
    singleKey: {
      createdRevision: recordV1(created.records, singleKey).revision,
      stalePutActualRevision: stalePut.actualRevision,
      updatedRevision: recordV1(updated.records, singleKey).revision,
      staleDeleteActualRevision: staleDelete.actualRevision,
      deleted: (await store.read("settings", singleKey)) === null,
    },
    multiKey: {
      conflictNamespace: batchConflict.namespace,
      conflictKey: batchConflict.key,
      conflictActualRevision: batchConflict.actualRevision,
      valuesAfterConflict,
      valuesAfterCommit,
      committedRevisions: batchCommit.records.map((record) => record.revision),
    },
    concurrentCas: {
      committedCount: concurrentCommits.length,
      conflictCount: concurrentConflicts.length,
      conflictActualRevision: concurrentConflicts[0]?.actualRevision ?? null,
      storedRevision: concurrentStored?.revision ?? null,
      storedMatchesCommittedBytes,
    },
    immutableListing: {
      keys: listed.map((record) => record.key),
      valuesAfterExternalMutation,
      inputBytesDefended: byteReportsEqualV1(valuesAfterExternalMutation[3]!, [0, 122, 255]),
      committedBytesDefended: byteReportsEqualV1(valuesAfterExternalMutation[0]!, [255, 97, 0]),
      readBytesDefended: byteReportsEqualV1(valuesAfterExternalMutation[1]!, [128, 109, 1]),
      listedBytesDefended: byteReportsEqualV1(valuesAfterExternalMutation[2]!, [1, 120, 128, 0]),
    },
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

  return ({
    firstRevision: first?.revision ?? null,
    firstValue: first === null ? null : byteReportV1(first.bytes),
    updatedRevision: recordV1(updated.records, key).revision,
    secondRevision: second?.revision ?? null,
    secondValue: second === null ? null : byteReportV1(second.bytes),
  });
}

/**
 * Runs collision-sensitive logical-key probes with a fresh empty store per
 * category. The representative long keys are workload inputs, not a public
 * maximum; embedded NUL and cross-runtime collation remain separate contract
 * decisions.
 */
export async function runHostRecordStoreKeyCorpusV1(
  createStore: () => HostAtomicRecordStoreV1 | Promise<HostAtomicRecordStoreV1>,
): Promise<DeepReadonly<HostRecordStoreKeyCorpusReportV1>> {
  const cases = [];
  for (const testCase of hostRecordStoreKeyCorpusV1) {
    const store = await createStore();
    const expectedEntries = testCase.entries.map((entry) => ({
      key: keyV1(entry.key),
      bytes: bytesV1(...entry.byteValues),
    }));
    const matchesExpectedV1 = (
      record: HostStoredRecordV1,
      entry: (typeof expectedEntries)[number],
    ) =>
      record.namespace === "settings" &&
      record.key === entry.key &&
      record.revision === 1 &&
      bytesEqualV1(record.bytes, entry.bytes);
    const exactEntryCountV1 = (records: readonly HostStoredRecordV1[]) =>
      expectedEntries.filter(
        (entry) => records.filter((record) => matchesExpectedV1(record, entry)).length === 1,
      ).length;

    let rejected = false;
    let committedRecords: readonly HostStoredRecordV1[] = [];
    try {
      const result = await store.commit(
        expectedEntries.map((entry) =>
          putV1("settings", entry.key, null, Uint8Array.from(entry.bytes))
        ) as [HostRecordMutationV1, ...HostRecordMutationV1[]],
      );
      if (result.kind === "committed") {
        committedRecords = snapshotRecordsV1(result.records);
      } else {
        rejected = true;
      }
    } catch {
      rejected = true;
    }
    const committedExactCount = exactEntryCountV1(committedRecords);

    let readExactCount = 0;
    for (const entry of expectedEntries) {
      try {
        const record = await store.read("settings", entry.key);
        if (record !== null && matchesExpectedV1(record, entry)) {
          readExactCount += 1;
        }
      } catch {
        rejected = true;
      }
    }

    let firstList: readonly HostStoredRecordV1[] | undefined;
    let secondList: readonly HostStoredRecordV1[] | undefined;
    try {
      firstList = snapshotRecordsV1(await store.list("settings"));
      secondList = snapshotRecordsV1(await store.list("settings"));
    } catch {
      rejected = true;
    }
    const listedExactCount = firstList === undefined ? 0 : exactEntryCountV1(firstList);
    const listStable = firstList !== undefined &&
      secondList !== undefined &&
      firstList.length === secondList.length &&
      firstList.every((record, index) => {
        const repeated = secondList[index];
        return (
          repeated !== undefined &&
          record.namespace === repeated.namespace &&
          record.key === repeated.key &&
          record.revision === repeated.revision &&
          bytesEqualV1(record.bytes, repeated.bytes)
        );
      });

    cases.push(
      {
        id: testCase.id,
        keyCount: expectedEntries.length,
        committedRecordCount: committedRecords.length,
        committedExactCount,
        readExactCount,
        listedRecordCount: firstList?.length ?? 0,
        listedExactCount,
        listStable,
        rejected,
      },
    );
  }
  return ({ cases: cases });
}
