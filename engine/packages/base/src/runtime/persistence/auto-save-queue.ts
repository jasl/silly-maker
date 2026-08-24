// SPDX-License-Identifier: MIT
import type { DeepReadonly, NonNegativeSafeInteger } from "../../contracts/values.ts";
import { parseNonNegativeSafeInteger } from "../../contracts/values.ts";

export interface AutoSaveQueueV1<TCandidate> {
  enqueue(candidate: DeepReadonly<TCandidate>): void;
  establishAnchor(candidate: DeepReadonly<TCandidate>): void;
  anchorEpoch(): NonNegativeSafeInteger;
  isIdle(): boolean;
  idle(): Promise<void>;
}

export type AutoSaveAttemptReceiptInternalV1<TResult> =
  | {
    readonly kind: "fulfilled";
    readonly result: TResult;
  }
  | {
    readonly kind: "rejected";
    readonly error: unknown;
  }
  | {
    readonly kind: "superseded";
  };

export interface CreateAutoSaveQueueOptionsV1<TCandidate, TResult> {
  write(candidate: DeepReadonly<TCandidate>): Promise<TResult>;
  isSuccessfulResult?(result: DeepReadonly<TResult>): boolean;
  onCurrentResult?(candidate: DeepReadonly<TCandidate>, result: TResult): void;
  onFailure?(error: unknown): void;
}

interface AutoSaveCandidateV1<TCandidate, TResult> {
  readonly candidate: DeepReadonly<TCandidate>;
  readonly epoch: NonNegativeSafeInteger;
  readonly settleReceipt?: (receipt: AutoSaveAttemptReceiptInternalV1<TResult>) => void;
}

type WriteSettlementV1<TResult> =
  | { readonly kind: "fulfilled"; readonly result: TResult }
  | { readonly kind: "rejected"; readonly error: unknown };

interface AutoSaveReceiptControlInternalV1 {
  enqueue(candidate: unknown): Promise<AutoSaveAttemptReceiptInternalV1<unknown>>;
  establishAnchor(candidate: unknown): Promise<AutoSaveAttemptReceiptInternalV1<unknown>>;
  prepareAnchor(candidate: unknown): {
    readonly prepared: PreparedAutoSaveAnchorInternalV1;
    readonly receipt: Promise<AutoSaveAttemptReceiptInternalV1<unknown>>;
    readonly anchorEpoch: NonNegativeSafeInteger;
  };
}

const receiptControlsInternalV1 = new WeakMap<object, AutoSaveReceiptControlInternalV1>();

export interface PreparedAutoSaveAnchorInternalV1 {
  readonly _preparedAutoSaveAnchor?: never;
}

interface PreparedAutoSaveAnchorControlInternalV1 {
  status: "prepared" | "committing" | "committed" | "completed";
  commit(): void;
  runPostCommit(): void;
}

const preparedAnchorControlsInternalV1 = new WeakMap<
  object,
  PreparedAutoSaveAnchorControlInternalV1
>();

export function enqueueAutoSaveWithReceiptInternalV1<TCandidate, TResult>(
  queue: AutoSaveQueueV1<TCandidate>,
  candidate: DeepReadonly<TCandidate>,
): Promise<AutoSaveAttemptReceiptInternalV1<TResult>> {
  const control = receiptControlsInternalV1.get(queue);
  if (control === undefined) {
    throw new TypeError("Auto Save queue does not support internal receipts");
  }
  return control.enqueue(candidate) as Promise<AutoSaveAttemptReceiptInternalV1<TResult>>;
}

export function establishAutoSaveAnchorWithReceiptInternalV1<TCandidate, TResult>(
  queue: AutoSaveQueueV1<TCandidate>,
  candidate: DeepReadonly<TCandidate>,
): Promise<AutoSaveAttemptReceiptInternalV1<TResult>> {
  const control = receiptControlsInternalV1.get(queue);
  if (control === undefined) {
    throw new TypeError("Auto Save queue does not support internal receipts");
  }
  return control.establishAnchor(candidate) as Promise<AutoSaveAttemptReceiptInternalV1<TResult>>;
}

export function prepareAutoSaveAnchorWithReceiptInternalV1<TCandidate, TResult>(
  queue: AutoSaveQueueV1<TCandidate>,
  candidate: DeepReadonly<TCandidate>,
): {
  readonly prepared: PreparedAutoSaveAnchorInternalV1;
  readonly receipt: Promise<AutoSaveAttemptReceiptInternalV1<TResult>>;
  readonly anchorEpoch: NonNegativeSafeInteger;
} {
  const control = receiptControlsInternalV1.get(queue);
  if (control === undefined) {
    throw new TypeError("Auto Save queue does not support prepared anchors");
  }
  return control.prepareAnchor(candidate) as {
    readonly prepared: PreparedAutoSaveAnchorInternalV1;
    readonly receipt: Promise<AutoSaveAttemptReceiptInternalV1<TResult>>;
    readonly anchorEpoch: NonNegativeSafeInteger;
  };
}

export function commitPreparedAutoSaveAnchorInternalV1(
  prepared: PreparedAutoSaveAnchorInternalV1,
): void {
  const control = preparedAnchorControlsInternalV1.get(prepared);
  if (control === undefined || control.status !== "prepared") {
    throw new TypeError("invalid prepared Auto Save anchor");
  }
  control.status = "committing";
  control.commit();
  control.status = "committed";
}

export function runPreparedAutoSaveAnchorPostCommitInternalV1(
  prepared: PreparedAutoSaveAnchorInternalV1,
): void {
  const control = preparedAnchorControlsInternalV1.get(prepared);
  if (control === undefined || control.status !== "committed") {
    throw new TypeError("invalid committed Auto Save anchor");
  }
  control.status = "completed";
  control.runPostCommit();
}

interface CreateAutoSaveQueueOptionsInternalV1 {
  readonly initialAnchorEpoch?: NonNegativeSafeInteger;
}

export function createAutoSaveQueueV1<TCandidate, TResult>(
  options: CreateAutoSaveQueueOptionsV1<TCandidate, TResult>,
): AutoSaveQueueV1<TCandidate> {
  return createAutoSaveQueueInternalV1(options, {});
}

/** @internal Deterministic construction seam; intentionally absent from barrels. */
export function createAutoSaveQueueInternalV1<TCandidate, TResult>(
  options: CreateAutoSaveQueueOptionsV1<TCandidate, TResult>,
  internalOptions: CreateAutoSaveQueueOptionsInternalV1,
): AutoSaveQueueV1<TCandidate> {
  if (typeof options.write !== "function") {
    throw new TypeError("Auto Save queue requires a writer");
  }
  if (options.onCurrentResult !== undefined && typeof options.onCurrentResult !== "function") {
    throw new TypeError("invalid Auto Save result callback");
  }
  if (
    options.isSuccessfulResult !== undefined &&
    typeof options.isSuccessfulResult !== "function"
  ) {
    throw new TypeError("invalid Auto Save success predicate");
  }
  if (options.onFailure !== undefined && typeof options.onFailure !== "function") {
    throw new TypeError("invalid Auto Save failure callback");
  }

  let epoch = parseNonNegativeSafeInteger(internalOptions.initialAnchorEpoch ?? 0);
  let mutationRevision = 0n;
  let running: AutoSaveCandidateV1<TCandidate, TResult> | null = null;
  let pending: AutoSaveCandidateV1<TCandidate, TResult> | null = null;
  let requiredRepair: AutoSaveCandidateV1<TCandidate, TResult> | null = null;
  let repairOutstanding = false;
  const idleResolvers = new Set<() => void>();

  const reportFailureV1 = (error: unknown): void => {
    try {
      options.onFailure?.(error);
    } catch {
      // Failure reporting is diagnostic and cannot break the queue tail.
    }
  };

  const publishCurrentResultV1 = (
    entry: AutoSaveCandidateV1<TCandidate, TResult>,
    result: TResult,
  ): void => {
    try {
      options.onCurrentResult?.(entry.candidate, result);
    } catch (error) {
      reportFailureV1(error);
    }
  };

  const resolveIdleV1 = (): void => {
    if (running !== null || pending !== null || requiredRepair !== null || repairOutstanding) {
      return;
    }
    const resolvers = [...idleResolvers];
    idleResolvers.clear();
    for (const resolve of resolvers) resolve();
  };

  const resultCompletedWriteV1 = (result: TResult): boolean => {
    try {
      return options.isSuccessfulResult?.(result as DeepReadonly<TResult>) ?? true;
    } catch (error) {
      reportFailureV1(error);
      return false;
    }
  };

  const supersedeV1 = (entry: AutoSaveCandidateV1<TCandidate, TResult>): void => {
    entry.settleReceipt?.({ kind: "superseded" });
  };

  const startV1 = (entry: AutoSaveCandidateV1<TCandidate, TResult>): void => {
    running = entry;
    let write: Promise<TResult>;
    try {
      write = Promise.resolve(options.write(entry.candidate));
    } catch (error) {
      write = Promise.reject(error);
    }

    void write.then(
      (result) => settleV1(entry, { kind: "fulfilled", result }),
      (error: unknown) => settleV1(entry, { kind: "rejected", error }),
    );
  };

  const settleV1 = (
    entry: AutoSaveCandidateV1<TCandidate, TResult>,
    settlement: WriteSettlementV1<TResult>,
  ): void => {
    mutationRevision += 1n;
    if (running !== entry) {
      const error = new TypeError("Auto Save queue settled an inactive write");
      reportFailureV1(error);
      entry.settleReceipt?.({ kind: "rejected", error });
      return;
    }

    let completedWrite = false;
    if (settlement.kind === "rejected") {
      reportFailureV1(settlement.error);
    } else if (entry.epoch === epoch) {
      publishCurrentResultV1(entry, settlement.result);
      if (entry.epoch === epoch) {
        completedWrite = resultCompletedWriteV1(settlement.result);
      }
    }

    // Result, success, and failure callbacks may synchronously establish a new
    // anchor. Re-read the epoch after every callback before acknowledging the
    // exact attempt or mutating repair state for its epoch.
    const isCurrent = entry.epoch === epoch;
    if (isCurrent && completedWrite) repairOutstanding = false;

    if (!isCurrent) {
      supersedeV1(entry);
    } else if (settlement.kind === "fulfilled") {
      entry.settleReceipt?.(
        {
          kind: "fulfilled",
          result: settlement.result,
        },
      );
    } else {
      entry.settleReceipt?.(
        {
          kind: "rejected",
          error: settlement.error,
        },
      );
    }

    // A result/failure callback may synchronously prepare an anchor while the
    // settlement is still in progress. Fence that half-observed plan before
    // the settlement tail mutates running/pending/repair state.
    mutationRevision += 1n;
    running = null;
    const next = requiredRepair ?? pending;
    if (requiredRepair !== null) requiredRepair = null;
    else pending = null;
    if (next !== null) {
      startV1(next);
      return;
    }
    if (entry.epoch === epoch && repairOutstanding) {
      requiredRepair = entry;
      return;
    }
    resolveIdleV1();
  };

  const enqueueV1 = (
    candidate: DeepReadonly<TCandidate>,
    settleReceipt?: (receipt: AutoSaveAttemptReceiptInternalV1<TResult>) => void,
  ): void => {
    mutationRevision += 1n;
    const entry = {
      candidate,
      epoch,
      ...(settleReceipt === undefined ? {} : { settleReceipt }),
    };
    if (running === null) {
      if (repairOutstanding) requiredRepair = null;
      startV1(entry);
      return;
    }
    if (pending !== null) supersedeV1(pending);
    pending = entry;
  };

  const establishAnchorV1 = (
    candidate: DeepReadonly<TCandidate>,
    settleReceipt?: (receipt: AutoSaveAttemptReceiptInternalV1<TResult>) => void,
  ): void => {
    const nextEpoch = parseNonNegativeSafeInteger(epoch + 1);
    mutationRevision += 1n;
    epoch = nextEpoch;
    if (pending !== null) supersedeV1(pending);
    pending = null;
    const repair = {
      candidate,
      epoch: nextEpoch,
      ...(settleReceipt === undefined ? {} : { settleReceipt }),
    };
    if (running === null) {
      if (requiredRepair !== null) supersedeV1(requiredRepair);
      if (repairOutstanding) {
        requiredRepair = null;
        startV1(repair);
      } else {
        requiredRepair = null;
        supersedeV1(repair);
      }
      return;
    }
    repairOutstanding = true;
    if (requiredRepair !== null) supersedeV1(requiredRepair);
    requiredRepair = repair;
  };

  const queue: AutoSaveQueueV1<TCandidate> = {
    enqueue: (candidate: DeepReadonly<TCandidate>) => enqueueV1(candidate),
    establishAnchor: (candidate: DeepReadonly<TCandidate>) => establishAnchorV1(candidate),

    anchorEpoch: () => epoch,

    isIdle: () =>
      running === null && pending === null && requiredRepair === null && !repairOutstanding,

    idle() {
      if (running === null && pending === null && requiredRepair === null && !repairOutstanding) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        idleResolvers.add(resolve);
      });
    },
  };

  const createReceiptV1 = (
    operation: (settle: (receipt: AutoSaveAttemptReceiptInternalV1<TResult>) => void) => void,
  ): Promise<AutoSaveAttemptReceiptInternalV1<unknown>> =>
    new Promise<AutoSaveAttemptReceiptInternalV1<TResult>>((resolve) => {
      let settled = false;
      operation((receipt) => {
        if (settled) return;
        settled = true;
        resolve(receipt);
      });
    }) as Promise<AutoSaveAttemptReceiptInternalV1<unknown>>;

  const prepareAnchorV1 = (
    candidate: DeepReadonly<TCandidate>,
  ): {
    readonly prepared: PreparedAutoSaveAnchorInternalV1;
    readonly receipt: Promise<AutoSaveAttemptReceiptInternalV1<unknown>>;
    readonly anchorEpoch: NonNegativeSafeInteger;
  } => {
    const expectedRevision = mutationRevision;
    const committedRevision = expectedRevision + 1n;
    const nextEpoch = parseNonNegativeSafeInteger(epoch + 1);
    const oldPending = pending;
    const oldRequiredRepair = requiredRepair;
    const shouldStartRepair = running === null && repairOutstanding;
    const shouldSupersedeRepair = running === null && !repairOutstanding;
    let settleReceipt!: (receipt: AutoSaveAttemptReceiptInternalV1<TResult>) => void;
    const receipt = new Promise<AutoSaveAttemptReceiptInternalV1<TResult>>((resolve) => {
      let settled = false;
      settleReceipt = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
    });
    const repair = {
      candidate,
      epoch: nextEpoch,
      settleReceipt,
    };
    const prepared = {} as PreparedAutoSaveAnchorInternalV1;
    const control: PreparedAutoSaveAnchorControlInternalV1 = {
      status: "prepared",
      commit() {
        if (mutationRevision !== expectedRevision) {
          throw new TypeError("stale prepared Auto Save anchor");
        }
        epoch = nextEpoch;
        pending = null;
        if (running === null) {
          requiredRepair = shouldStartRepair ? repair : null;
        } else {
          repairOutstanding = true;
          requiredRepair = repair;
        }
        mutationRevision = committedRevision;
      },
      runPostCommit() {
        mutationRevision += 1n;
        if (oldPending !== null) supersedeV1(oldPending);
        if (oldRequiredRepair !== null) supersedeV1(oldRequiredRepair);
        if (shouldStartRepair) {
          if (running === null && requiredRepair === repair) {
            requiredRepair = null;
            startV1(repair);
          } else if (running !== repair && pending !== repair && requiredRepair !== repair) {
            supersedeV1(repair);
          }
        } else if (shouldSupersedeRepair) {
          supersedeV1(repair);
        }
      },
    };
    preparedAnchorControlsInternalV1.set(prepared, control);
    return {
      prepared,
      receipt: receipt as Promise<AutoSaveAttemptReceiptInternalV1<unknown>>,
      anchorEpoch: nextEpoch,
    };
  };

  receiptControlsInternalV1.set(
    queue,
    {
      enqueue: (candidate: unknown) =>
        createReceiptV1((settle) => enqueueV1(candidate as DeepReadonly<TCandidate>, settle)),
      establishAnchor: (candidate: unknown) =>
        createReceiptV1((settle) =>
          establishAnchorV1(candidate as DeepReadonly<TCandidate>, settle)
        ),
      prepareAnchor: (candidate: unknown) => prepareAnchorV1(candidate as DeepReadonly<TCandidate>),
    },
  );

  return queue;
}
