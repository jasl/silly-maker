// SPDX-License-Identifier: MIT
import type {
  HostAtomicRecordStoreV1,
  HostRecordMutationV1,
  HostStoredRecordV1,
} from "@sillymaker/base";

type HostRecordKeyV1 = HostStoredRecordV1["key"];

export type HostRecordStoreTransactionPhaseIdV1 =
  | "before_transaction"
  | "between_checks_and_writes"
  | "between_mutations"
  | "after_durable_write_before_response";

export type HostRecordStoreTransactionPhaseV1 =
  | { readonly kind: "before_transaction" }
  | { readonly kind: "between_checks_and_writes" }
  | {
    readonly kind: "between_mutations";
    readonly completedMutationCount: number;
    readonly remainingMutationCount: number;
  }
  | { readonly kind: "after_durable_write_before_response" };

export interface HostRecordStoreTransactionPhaseObserverV1 {
  reached(phase: HostRecordStoreTransactionPhaseV1): void | Promise<void>;
}

export interface HostRecordStoreTransactionFaultHandleV1 {
  readonly store: HostAtomicRecordStoreV1;
  close(): void | Promise<void>;
}

export interface HostRecordStoreTransactionFaultFixtureV1 {
  readonly current: HostRecordStoreTransactionFaultHandleV1;
  readonly observedPhases: () => readonly HostRecordStoreTransactionPhaseV1[];
  readonly reopen: () =>
    | HostRecordStoreTransactionFaultHandleV1
    | Promise<HostRecordStoreTransactionFaultHandleV1>;
}

interface HostRecordStoreTransactionFaultRecordReportV1 {
  readonly namespace: HostStoredRecordV1["namespace"];
  readonly key: HostRecordKeyV1;
  readonly revision: number;
  readonly bytes: readonly number[];
}

interface HostRecordStoreTransactionFaultRetryReportV1 {
  readonly kind: "committed" | "conflict";
  readonly namespace?: HostStoredRecordV1["namespace"];
  readonly key?: HostRecordKeyV1;
  readonly actualRevision?: number | null;
  readonly committedRevisions?: readonly number[];
}

export interface HostRecordStoreTransactionFaultReportV1 {
  readonly cases: readonly {
    readonly targetPhase: HostRecordStoreTransactionPhaseIdV1;
    readonly commitRejected: boolean;
    readonly observedPhases: readonly HostRecordStoreTransactionPhaseV1[];
    readonly reopenedRecords: readonly [
      HostRecordStoreTransactionFaultRecordReportV1 | null,
      HostRecordStoreTransactionFaultRecordReportV1 | null,
    ];
    readonly retry: HostRecordStoreTransactionFaultRetryReportV1 | null;
  }[];
}

const leftKeyV1 = "conformance.fault.left" as HostRecordKeyV1;
const rightKeyV1 = "conformance.fault.right" as HostRecordKeyV1;
const oldLeftBytesV1 = [0, 127, 255];
const oldRightBytesV1 = [255, 128, 0];
const newLeftBytesV1 = [1, 2, 3, 4];
const newRightBytesV1 = [4, 3, 2, 1];

const targetPhasesV1 = [
  "before_transaction",
  "between_checks_and_writes",
  "between_mutations",
  "after_durable_write_before_response",
] as const satisfies readonly HostRecordStoreTransactionPhaseIdV1[];

function phaseV1(
  kind: Exclude<HostRecordStoreTransactionPhaseIdV1, "between_mutations">,
): HostRecordStoreTransactionPhaseV1 {
  return ({ kind });
}

const beforeTransactionTraceV1 = [phaseV1("before_transaction")];
const betweenChecksTraceV1 = [
  ...beforeTransactionTraceV1,
  phaseV1("between_checks_and_writes"),
];
const betweenMutationsTraceV1 = [
  ...betweenChecksTraceV1,
  {
    kind: "between_mutations" as const,
    completedMutationCount: 1,
    remainingMutationCount: 1,
  },
];
const afterDurableWriteTraceV1 = [
  ...betweenMutationsTraceV1,
  phaseV1("after_durable_write_before_response"),
];

function recordReportV1(
  namespace: HostStoredRecordV1["namespace"],
  key: HostRecordKeyV1,
  revision: number,
  bytes: readonly number[],
): HostRecordStoreTransactionFaultRecordReportV1 {
  return ({
    namespace,
    key,
    revision,
    bytes: [...bytes],
  });
}

const allOldRecordsV1 = [
  recordReportV1("save", leftKeyV1, 1, oldLeftBytesV1),
  recordReportV1("lease", rightKeyV1, 1, oldRightBytesV1),
] as const;
const allNewRecordsV1 = [
  recordReportV1("save", leftKeyV1, 2, newLeftBytesV1),
  recordReportV1("lease", rightKeyV1, 2, newRightBytesV1),
] as const;

export const hostRecordStoreTransactionFaultExpectedV1 = ({
  cases: [
    {
      targetPhase: "before_transaction",
      commitRejected: true,
      observedPhases: beforeTransactionTraceV1,
      reopenedRecords: allOldRecordsV1,
      retry: null,
    },
    {
      targetPhase: "between_checks_and_writes",
      commitRejected: true,
      observedPhases: betweenChecksTraceV1,
      reopenedRecords: allOldRecordsV1,
      retry: null,
    },
    {
      targetPhase: "between_mutations",
      commitRejected: true,
      observedPhases: betweenMutationsTraceV1,
      reopenedRecords: allOldRecordsV1,
      retry: null,
    },
    {
      targetPhase: "after_durable_write_before_response",
      commitRejected: true,
      observedPhases: afterDurableWriteTraceV1,
      reopenedRecords: allNewRecordsV1,
      retry: {
        kind: "conflict",
        namespace: "save",
        key: leftKeyV1,
        actualRevision: 2,
      },
    },
  ],
}) satisfies HostRecordStoreTransactionFaultReportV1;

function putV1(
  namespace: HostRecordMutationV1["namespace"],
  key: HostRecordKeyV1,
  bytes: readonly number[],
): Extract<HostRecordMutationV1, { readonly kind: "put" }> {
  return ({
    kind: "put",
    namespace,
    key,
    expectedRevision: 1 as HostStoredRecordV1["revision"],
    bytes: Uint8Array.from(bytes),
  });
}

function updateBatchV1(): readonly [HostRecordMutationV1, HostRecordMutationV1] {
  return [
    putV1("save", leftKeyV1, newLeftBytesV1),
    putV1("lease", rightKeyV1, newRightBytesV1),
  ];
}

function phaseSnapshotV1(
  phase: HostRecordStoreTransactionPhaseV1,
): HostRecordStoreTransactionPhaseV1 {
  return phase.kind === "between_mutations"
    ? ({
      kind: phase.kind,
      completedMutationCount: phase.completedMutationCount,
      remainingMutationCount: phase.remainingMutationCount,
    })
    : phaseV1(phase.kind);
}

async function recordSnapshotV1(
  store: HostAtomicRecordStoreV1,
  namespace: HostRecordMutationV1["namespace"],
  key: HostRecordKeyV1,
): Promise<HostRecordStoreTransactionFaultRecordReportV1 | null> {
  const record = await store.read(namespace, key);
  if (record === null) return null;
  return recordReportV1(record.namespace, record.key, record.revision, Array.from(record.bytes));
}

function retryReportV1(
  result: Awaited<ReturnType<HostAtomicRecordStoreV1["commit"]>>,
): HostRecordStoreTransactionFaultRetryReportV1 {
  return result.kind === "conflict"
    ? ({
      kind: result.kind,
      namespace: result.namespace,
      key: result.key,
      actualRevision: result.actualRevision,
    })
    : ({
      kind: result.kind,
      committedRevisions: result.records.map((record) => record.revision),
    });
}

/**
 * Runs four deterministic transaction/response-loss phases. Recovery/reopen
 * fault placement and real process termination remain separate evidence.
 */
export async function runHostRecordStoreTransactionFaultConformanceV1(
  createFixture: (
    targetPhase: HostRecordStoreTransactionPhaseIdV1,
  ) => HostRecordStoreTransactionFaultFixtureV1 | Promise<HostRecordStoreTransactionFaultFixtureV1>,
): Promise<HostRecordStoreTransactionFaultReportV1> {
  const cases = [];
  for (const targetPhase of targetPhasesV1) {
    const fixture = await createFixture(targetPhase);
    let commitRejected = false;
    try {
      await fixture.current.store.commit(updateBatchV1());
    } catch {
      commitRejected = true;
    } finally {
      await fixture.current.close();
    }

    const observedPhases = fixture.observedPhases();
    const reopened = await fixture.reopen();
    try {
      const reopenedRecords = [
        await recordSnapshotV1(reopened.store, "save", leftKeyV1),
        await recordSnapshotV1(reopened.store, "lease", rightKeyV1),
      ] as const;
      const retry = targetPhase === "after_durable_write_before_response"
        ? retryReportV1(await reopened.store.commit(updateBatchV1()))
        : null;
      cases.push(
        {
          targetPhase,
          commitRejected,
          observedPhases: observedPhases.map(phaseSnapshotV1),
          reopenedRecords,
          retry,
        },
      );
    } finally {
      await reopened.close();
    }
  }
  return ({
    cases: cases,
  });
}
