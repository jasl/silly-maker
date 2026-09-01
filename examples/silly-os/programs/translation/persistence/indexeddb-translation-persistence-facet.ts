// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  exactJsonValuesEqualV1,
  normalizeProcessIdV1,
} from "../../../src/program-platform/process/program-process-repository.ts";
import type { ProcessExecutionLeaseV1 } from "../../../src/program-platform/process/process-execution-repository.ts";
import {
  cloneProcessWorkspaceBindingV1,
  type ProcessWorkspaceBindingV1,
} from "../../../src/application/persistence/program-data-repository.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryOperationV1,
} from "../../../src/application/persistence/program-data-repository-failure.ts";
import {
  decodeIndexedDbProcessExecutionLeaseV1,
  decodeIndexedDbProcessV1,
  digestIndexedDbOperationV1 as digestV1,
  indexedDbProcessExecutionTransactionStoreNamesV1,
  requestIndexedDbResultV1 as requestResultV1,
} from "../../../src/application/persistence/indexeddb-process-execution-transaction-kernel.ts";
import type { IndexedDbProgramPersistenceFacetOperationsV1 } from "../../../src/application/persistence/program-persistence-facet.ts";
import { translationTargetPreservesProtectedStructureV1 } from "../runtime/translation-document-codec.ts";
import {
  cloneTranslationBatchCandidateRecordV1,
  cloneTranslationWorksetUnitV1,
  normalizeTranslationBatchCandidateAcceptInputV1,
  normalizeTranslationBatchCandidatePublishInputV1,
  normalizeTranslationBatchCandidateRejectInputV1,
  normalizeTranslationWorksetAppendImportInputV1,
  normalizeTranslationWorksetBeginImportInputV1,
  normalizeTranslationWorksetFinalizeImportInputV1,
  normalizeTranslationWorksetOperationExpectationV1,
  normalizeTranslationWorksetPageRequestV1,
  normalizeTranslationWorksetSourceBindingV1,
  translationWorksetRowUtf8ByteLengthV1,
  type TranslationBatchCandidateAcceptInputV1,
  type TranslationBatchCandidateRecordV1,
  type TranslationBatchCandidateRejectInputV1,
  type TranslationWorksetGlossaryEntryV1,
  type TranslationWorksetHeadV1,
  type TranslationWorksetOperationExpectationV1,
  type TranslationWorksetOperationReceiptV1,
  type TranslationWorksetPageRequestV1,
  type TranslationWorksetPageResultV1,
  type TranslationWorksetUnitRecordV1,
} from "../runtime/translation-workset-repository.ts";
import {
  normalizeTranslationBatchCandidateExecutionBundleInputV1,
  normalizeTranslationBatchExecutionAcquireInputV1,
  normalizeTranslationWorksetFinalizeExecutionBundleInputV1,
  normalizeTranslationWorksetImportExecutionAcquireInputV1,
  type TranslationBatchCandidateExecutionCompositeCommitResultV1,
  type TranslationWorksetFinalizeExecutionCompositeCommitResultV1,
} from "./translation-persistence-contract.ts";
import { isProgramPlatformIdentifierV1 } from "../../../src/program-platform/identifier.ts";

const repositoryOperationV1: ProgramDataRepositoryOperationV1 = "invoke_program_persistence_facet";

type PreparedTranslationFinalizeV1 =
  | {
    readonly kind: "unchanged";
    readonly head: TranslationWorksetHeadV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
  }
  | { readonly kind: "conflict"; readonly current: TranslationWorksetHeadV1 | null }
  | {
    readonly kind: "committed";
    readonly head: TranslationWorksetHeadV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
    readonly write: () => Promise<void>;
  };

type PreparedTranslationCandidateV1 =
  | {
    readonly kind: "unchanged";
    readonly head: TranslationWorksetHeadV1;
    readonly candidate: TranslationBatchCandidateRecordV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
  }
  | { readonly kind: "conflict"; readonly current: TranslationWorksetHeadV1 | null }
  | {
    readonly kind: "committed";
    readonly head: TranslationWorksetHeadV1;
    readonly candidate: TranslationBatchCandidateRecordV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
    readonly write: () => Promise<void>;
  };

type PreparedTranslationCandidateReviewV1 =
  | {
    readonly kind: "unchanged";
    readonly head: TranslationWorksetHeadV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
  }
  | { readonly kind: "conflict"; readonly current: TranslationWorksetHeadV1 | null }
  | {
    readonly kind: "committed";
    readonly head: TranslationWorksetHeadV1;
    readonly operationReceipt: TranslationWorksetOperationReceiptV1;
    readonly write: () => Promise<void>;
  };

function identifierV1(value: unknown): value is string {
  return isProgramPlatformIdentifierV1(value);
}

function cursorWalkV1(
  request: IDBRequest<IDBCursorWithValue | null>,
  visit: (cursor: IDBCursorWithValue) => "continue" | "stop",
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    request.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      reject(request.error);
    }, { once: true });
    request.addEventListener("success", () => {
      if (settled) return;
      const cursor = request.result;
      if (cursor === null) {
        settled = true;
        resolve();
        return;
      }
      try {
        if (visit(cursor) === "stop") {
          settled = true;
          resolve();
        } else cursor.continue();
      } catch (error) {
        settled = true;
        reject(error);
      }
    });
  });
}

const loadTranslationHeadTxV1 = async (
  transaction: IDBTransaction,
  processId: string,
): Promise<TranslationWorksetHeadV1 | null> => {
  const row = await requestResultV1(
    transaction.objectStore("translation_workset_heads").get(processId),
  );
  if (row === undefined) return null;
  const head = structuredClone(row) as TranslationWorksetHeadV1;
  if (
    head.schemaVersion !== 2 || head.processId !== processId ||
    !identifierV1(head.importOperationId) ||
    !Number.isSafeInteger(head.revision) || head.revision < 1 ||
    !Number.isSafeInteger(head.acceptedUnitCount) || head.acceptedUnitCount < 0 ||
    head.acceptedUnitCount > head.stagedUnitCount ||
    !Number.isSafeInteger(head.acceptedBatchCount) || head.acceptedBatchCount < 0 ||
    (head.pendingCandidateId !== null && !identifierV1(head.pendingCandidateId))
  ) {
    throw createProgramDataRepositoryFailureV1(
      "schema_invalid",
      "invoke_program_persistence_facet",
    );
  }
  try {
    normalizeTranslationWorksetSourceBindingV1(
      head.sourceBinding,
      head.source.workspacePath,
    );
  } catch {
    throw createProgramDataRepositoryFailureV1(
      "schema_invalid",
      "invoke_program_persistence_facet",
    );
  }
  return head;
};

const loadTranslationCandidateTxV1 = async (
  transaction: IDBTransaction,
  processId: string,
  candidateId: string,
  operation: ProgramDataRepositoryOperationV1,
): Promise<TranslationBatchCandidateRecordV1 | null> => {
  const row = await requestResultV1(
    transaction.objectStore("translation_batch_candidates").get([processId, candidateId]),
  );
  if (row === undefined) return null;
  try {
    const candidate = cloneTranslationBatchCandidateRecordV1(
      row as TranslationBatchCandidateRecordV1,
    );
    if (candidate.processId !== processId || candidate.candidateId !== candidateId) {
      throw new TypeError("candidate identity mismatch");
    }
    return candidate;
  } catch {
    throw createProgramDataRepositoryFailureV1("schema_invalid", operation);
  }
};

const translationReceiptTxV1 = async (
  transaction: IDBTransaction,
  expectation: TranslationWorksetOperationExpectationV1,
  digest: string,
): Promise<TranslationWorksetOperationReceiptV1 | "absent" | "mismatch"> => {
  const row = await requestResultV1(
    transaction.objectStore("translation_workset_operations").get([
      expectation.input.processId,
      expectation.input.operationId,
    ]),
  );
  if (row === undefined) return "absent";
  const stored = structuredClone(row) as TranslationWorksetOperationReceiptV1 & {
    readonly candidateId?: string | null;
  };
  const receipt: TranslationWorksetOperationReceiptV1 = {
    ...stored,
    candidateId: stored.candidateId ?? null,
  };
  if (
    receipt.processId !== expectation.input.processId ||
    receipt.operationId !== expectation.input.operationId
  ) {
    throw createProgramDataRepositoryFailureV1(
      "schema_invalid",
      "invoke_program_persistence_facet",
    );
  }
  return receipt.operation === expectation.operation && receipt.operationDigest === digest
    ? receipt
    : "mismatch";
};

const translationReceiptV1 = (
  expectation: TranslationWorksetOperationExpectationV1,
  digest: string,
  revision: number,
  candidateId: string | null = null,
): TranslationWorksetOperationReceiptV1 => ({
  processId: expectation.input.processId,
  operationId: expectation.input.operationId,
  operation: expectation.operation,
  operationDigest: digest,
  worksetRevision: revision,
  candidateId,
});

const translationImportLeaseIsCurrentTxV1 = async (
  transaction: IDBTransaction,
  input: {
    readonly processId: string;
    readonly lease: ProcessExecutionLeaseV1;
    readonly updatedAt: number;
  },
  operation: ProgramDataRepositoryOperationV1,
): Promise<boolean> => {
  const [processRow, leaseRow] = await Promise.all([
    requestResultV1(transaction.objectStore("processes").get(input.processId)),
    requestResultV1(
      transaction.objectStore("process_execution_leases").get(input.processId),
    ),
  ]);
  if (processRow === undefined || leaseRow === undefined) return false;
  const process = decodeIndexedDbProcessV1(processRow, operation);
  const lease = decodeIndexedDbProcessExecutionLeaseV1(leaseRow, operation);
  return input.updatedAt < input.lease.expiresAt &&
    exactJsonValuesEqualV1(lease, input.lease) &&
    process.activeAttempt?.attemptId === input.lease.attemptId &&
    process.activeAttempt.generation === input.lease.generation;
};

const prepareTranslationCandidateV1 = async (input: {
  readonly transaction: IDBTransaction;
  readonly value: ReturnType<typeof normalizeTranslationBatchCandidatePublishInputV1>;
  readonly digest: string;
}): Promise<PreparedTranslationCandidateV1> => {
  const expectation = { operation: "publish_candidate" as const, input: input.value };
  const [replay, current] = await Promise.all([
    translationReceiptTxV1(input.transaction, expectation, input.digest),
    loadTranslationHeadTxV1(input.transaction, input.value.processId),
  ]);
  if (replay !== "absent") {
    if (
      replay === "mismatch" || current === null || replay.candidateId === null ||
      current.revision !== replay.worksetRevision ||
      current.pendingCandidateId !== replay.candidateId
    ) return { kind: "conflict", current };
    const candidate = await loadTranslationCandidateTxV1(
      input.transaction,
      input.value.processId,
      replay.candidateId,
      repositoryOperationV1,
    );
    if (candidate === null) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperationV1);
    }
    return { kind: "unchanged", head: current, candidate, operationReceipt: replay };
  }

  const leaseIsCurrent = await translationImportLeaseIsCurrentTxV1(
    input.transaction,
    input.value,
    repositoryOperationV1,
  );
  const request = input.value.request;
  if (
    !leaseIsCurrent || current === null || current.phase !== "ready" ||
    current.revision !== input.value.expectedWorksetRevision ||
    current.pendingCandidateId !== null ||
    current.acceptedUnitCount !== input.value.expectedFirstPendingOrder ||
    request.sourceLocale !== current.sourceLocale ||
    request.targetLocale !== current.targetLocale ||
    request.documentPurpose !== current.documentPurpose || request.style !== current.style ||
    request.units[0]?.order !== current.acceptedUnitCount ||
    request.units.at(-1)!.order >= current.stagedUnitCount
  ) return { kind: "conflict", current };

  const unitStore = input.transaction.objectStore("translation_workset_units");
  const authoritativeRows = await Promise.all(
    request.units.map((unit) =>
      requestResultV1(unitStore.get([input.value.processId, unit.order]))
    ),
  );
  if (
    authoritativeRows.some((row, index) =>
      row === undefined || !exactJsonValuesEqualV1(
        (() => {
          const { target: _target, ...source } = cloneTranslationWorksetUnitV1(row);
          return source;
        })(),
        { processId: input.value.processId, ...request.units[index]! },
      )
    )
  ) return { kind: "conflict", current };

  for (
    const neighboring of [
      request.neighboringUnits.preceding,
      request.neighboringUnits.following,
    ]
  ) {
    if (neighboring === null) continue;
    const row = await requestResultV1(
      unitStore.get([input.value.processId, neighboring.order]),
    );
    if (
      row === undefined || !exactJsonValuesEqualV1(
        (() => {
          const { target: _target, ...source } = cloneTranslationWorksetUnitV1(row);
          return source;
        })(),
        { processId: input.value.processId, ...neighboring },
      )
    ) return { kind: "conflict", current };
  }

  // The planner bound applicability to exact unit IDs before dispatch, and
  // the checks above already proved those units against this same workset
  // revision. Dereference only the admitted entry IDs here: this preserves
  // exact stored-term consistency without scanning every Process term again.
  const glossaryIndex = input.transaction.objectStore("translation_glossary_entries")
    .index("by_process_entry_id");
  const referencedGlossary = await Promise.all(
    request.glossary.map((entry) =>
      requestResultV1(glossaryIndex.get([input.value.processId, entry.entryId]))
    ),
  );
  if (
    referencedGlossary.some((row, index) => {
      if (row === undefined) return true;
      const stored = structuredClone(row) as TranslationWorksetGlossaryEntryV1;
      const requested = request.glossary[index]!;
      return stored.processId !== input.value.processId ||
        !Number.isSafeInteger(stored.order) || stored.order < 0 ||
        !exactJsonValuesEqualV1({
          entryId: stored.entryId,
          source: stored.source,
          target: stored.target,
          note: stored.note,
          locked: stored.locked,
        }, {
          entryId: requested.entryId,
          source: requested.source,
          target: requested.target,
          note: requested.note,
          locked: requested.locked,
        });
    })
  ) {
    return { kind: "conflict", current };
  }

  const candidateId = input.value.operationId;
  const candidate: TranslationBatchCandidateRecordV1 = {
    schemaVersion: 1,
    processId: input.value.processId,
    candidateId,
    baseWorksetRevision: input.value.expectedWorksetRevision,
    firstOrder: input.value.expectedFirstPendingOrder,
    unitCount: request.units.length,
    targets: structuredClone(input.value.candidate.targets),
    ambiguities: structuredClone(input.value.candidate.ambiguities),
    attemptId: input.value.lease.attemptId,
    generation: input.value.lease.generation,
    createdAt: input.value.updatedAt,
  };
  const head: TranslationWorksetHeadV1 = {
    ...current,
    revision: current.revision + 1,
    pendingCandidateId: candidateId,
    updatedAt: input.value.updatedAt,
  };
  const receipt = translationReceiptV1(
    expectation,
    input.digest,
    head.revision,
    candidateId,
  );
  return {
    kind: "committed",
    head,
    candidate,
    operationReceipt: receipt,
    write: async () => {
      await Promise.all([
        requestResultV1(
          input.transaction.objectStore("translation_batch_candidates").add(candidate),
        ),
        requestResultV1(
          input.transaction.objectStore("translation_workset_heads").put(head),
        ),
        requestResultV1(
          input.transaction.objectStore("translation_workset_operations").add(receipt),
        ),
      ]);
    },
  };
};

const prepareTranslationCandidateReviewV1 = async (input: {
  readonly transaction: IDBTransaction;
  readonly value: TranslationBatchCandidateAcceptInputV1 | TranslationBatchCandidateRejectInputV1;
  readonly decision: "accept_candidate" | "reject_candidate";
  readonly digest: string;
}): Promise<PreparedTranslationCandidateReviewV1> => {
  const expectation = input.decision === "accept_candidate"
    ? {
      operation: "accept_candidate" as const,
      input: input.value as TranslationBatchCandidateAcceptInputV1,
    }
    : {
      operation: "reject_candidate" as const,
      input: input.value as TranslationBatchCandidateRejectInputV1,
    };
  const [replay, current] = await Promise.all([
    translationReceiptTxV1(input.transaction, expectation, input.digest),
    loadTranslationHeadTxV1(input.transaction, input.value.processId),
  ]);
  if (replay !== "absent") {
    if (
      replay === "mismatch" || current === null ||
      replay.candidateId !== input.value.candidateId ||
      current.revision !== replay.worksetRevision || current.pendingCandidateId !== null
    ) return { kind: "conflict", current };
    return { kind: "unchanged", head: current, operationReceipt: replay };
  }
  if (
    current === null || current.phase !== "ready" ||
    current.revision !== input.value.expectedWorksetRevision ||
    current.pendingCandidateId !== input.value.candidateId
  ) return { kind: "conflict", current };
  const candidate = await loadTranslationCandidateTxV1(
    input.transaction,
    input.value.processId,
    input.value.candidateId,
    repositoryOperationV1,
  );
  if (candidate === null) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperationV1);
  }
  const nextAcceptedUnitCount = current.acceptedUnitCount + candidate.unitCount;
  if (
    candidate.baseWorksetRevision + 1 !== current.revision ||
    candidate.firstOrder !== current.acceptedUnitCount ||
    candidate.targets.length !== candidate.unitCount ||
    !Number.isSafeInteger(nextAcceptedUnitCount) ||
    nextAcceptedUnitCount > current.stagedUnitCount
  ) throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperationV1);

  const unitStore = input.transaction.objectStore("translation_workset_units");
  const units = await Promise.all(
    candidate.targets.map((target, index) =>
      requestResultV1(unitStore.get([
        input.value.processId,
        candidate.firstOrder + index,
      ])).then((row) => {
        if (row === undefined) {
          throw createProgramDataRepositoryFailureV1(
            "schema_invalid",
            repositoryOperationV1,
          );
        }
        const unit = cloneTranslationWorksetUnitV1(row);
        if (
          unit.processId !== input.value.processId ||
          unit.order !== candidate.firstOrder + index || unit.unitId !== target.unitId ||
          unit.target !== null
        ) {
          throw createProgramDataRepositoryFailureV1(
            "schema_invalid",
            repositoryOperationV1,
          );
        }
        return unit;
      })
    ),
  );

  let acceptedTargets: TranslationBatchCandidateAcceptInputV1["targets"] = [];
  if (input.decision === "accept_candidate") {
    const value = input.value as TranslationBatchCandidateAcceptInputV1;
    if (
      value.targets.length !== candidate.unitCount ||
      value.targets.some((target, index) =>
        target.unitId !== candidate.targets[index]?.unitId ||
        target.unitId !== units[index]?.unitId ||
        !translationTargetPreservesProtectedStructureV1(units[index]!, target.target)
      )
    ) return { kind: "conflict", current };
    acceptedTargets = value.targets;
  }

  const acceptedBatchCount = input.decision === "accept_candidate"
    ? current.acceptedBatchCount + 1
    : current.acceptedBatchCount;
  if (!Number.isSafeInteger(acceptedBatchCount)) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperationV1);
  }
  const head: TranslationWorksetHeadV1 = {
    ...current,
    revision: current.revision + 1,
    acceptedUnitCount: input.decision === "accept_candidate"
      ? nextAcceptedUnitCount
      : current.acceptedUnitCount,
    acceptedBatchCount,
    pendingCandidateId: null,
    updatedAt: input.value.updatedAt,
  };
  const receipt = translationReceiptV1(
    expectation,
    input.digest,
    head.revision,
    input.value.candidateId,
  );
  return {
    kind: "committed",
    head,
    operationReceipt: receipt,
    write: async () => {
      const writes: Promise<unknown>[] = [
        requestResultV1(
          input.transaction.objectStore("translation_workset_heads").put(head),
        ),
        requestResultV1(
          input.transaction.objectStore("translation_workset_operations").add(receipt),
        ),
        requestResultV1(
          input.transaction.objectStore("translation_batch_candidates").delete([
            input.value.processId,
            input.value.candidateId,
          ]),
        ),
      ];
      if (input.decision === "accept_candidate") {
        writes.push(...units.map((unit, index) =>
          requestResultV1(unitStore.put({
            ...unit,
            target: acceptedTargets[index]!.target,
          }))
        ));
      }
      await Promise.all(writes);
    },
  };
};

const prepareTranslationFinalizeV1 = async (input: {
  readonly transaction: IDBTransaction;
  readonly value: ReturnType<typeof normalizeTranslationWorksetFinalizeImportInputV1>;
  readonly digest: string;
}): Promise<PreparedTranslationFinalizeV1> => {
  const expectation = { operation: "finalize" as const, input: input.value };
  const [replay, current] = await Promise.all([
    translationReceiptTxV1(input.transaction, expectation, input.digest),
    loadTranslationHeadTxV1(input.transaction, input.value.processId),
  ]);
  if (replay !== "absent") {
    if (
      replay === "mismatch" || current === null || current.phase !== "ready" ||
      current.revision !== replay.worksetRevision ||
      !exactJsonValuesEqualV1(current.sourceBinding, input.value.sourceBinding)
    ) return { kind: "conflict", current };
    return { kind: "unchanged", head: current, operationReceipt: replay };
  }
  const [leaseIsCurrent, bindingRow] = await Promise.all([
    translationImportLeaseIsCurrentTxV1(
      input.transaction,
      input.value,
      repositoryOperationV1,
    ),
    requestResultV1(
      input.transaction.objectStore("process_workspace_bindings").get(input.value.processId),
    ),
  ]);
  if (
    !leaseIsCurrent || current === null || current.phase !== "staging" ||
    current.revision !== input.value.expectedWorksetRevision ||
    current.stagedUnitCount !== current.expectedUnitCount ||
    current.stagedGlossaryCount !== current.expectedGlossaryCount || bindingRow === undefined ||
    cloneProcessWorkspaceBindingV1(bindingRow as ProcessWorkspaceBindingV1).workspaceId !==
      input.value.sourceBinding.workspaceId ||
    !exactJsonValuesEqualV1(current.sourceBinding, input.value.sourceBinding) ||
    current.source.workspacePath !== input.value.sourceBinding.path
  ) return { kind: "conflict", current };
  const revision = current.revision + 1;
  const head: TranslationWorksetHeadV1 = {
    ...current,
    revision,
    phase: "ready",
    updatedAt: input.value.updatedAt,
  };
  const receipt = translationReceiptV1(expectation, input.digest, revision);
  return {
    kind: "committed",
    head,
    operationReceipt: receipt,
    write: async () => {
      await Promise.all([
        requestResultV1(
          input.transaction.objectStore("translation_workset_heads").put(head),
        ),
        requestResultV1(
          input.transaction.objectStore("translation_workset_operations").add(receipt),
        ),
      ]);
    },
  };
};

async function loadTranslationPageTxV1<
  TRow extends { readonly processId: string; readonly order: number },
>(input: {
  readonly transaction: IDBTransaction;
  readonly keyRange: typeof IDBKeyRange;
  readonly request: TranslationWorksetPageRequestV1;
  readonly storeName: "translation_workset_units" | "translation_glossary_entries";
}): Promise<TranslationWorksetPageResultV1<TRow>> {
  const head = await loadTranslationHeadTxV1(input.transaction, input.request.processId);
  if (head === null || head.revision !== input.request.expectedWorksetRevision) {
    return { kind: "conflict", current: head };
  }
  const rows: TRow[] = [];
  let byteLength = 0;
  let stopped = false;
  let expectedOrder = input.request.fromOrder;
  const stagedCount = input.storeName === "translation_workset_units"
    ? head.stagedUnitCount
    : head.stagedGlossaryCount;
  const range = input.keyRange.bound([input.request.processId, input.request.fromOrder], [
    input.request.processId,
    Number.MAX_SAFE_INTEGER,
  ]);
  await cursorWalkV1(input.transaction.objectStore(input.storeName).openCursor(range), (cursor) => {
    const row = (input.storeName === "translation_workset_units"
      ? cloneTranslationWorksetUnitV1(cursor.value)
      : structuredClone(cursor.value)) as TRow;
    if (
      row.processId !== input.request.processId || !Number.isSafeInteger(row.order) ||
      row.order !== expectedOrder
    ) {
      throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperationV1);
    }
    const bytes = translationWorksetRowUtf8ByteLengthV1(row);
    if (byteLength + bytes > input.request.maximumBytes) {
      stopped = true;
      return "stop";
    }
    rows.push(row);
    byteLength += bytes;
    expectedOrder += 1;
    if (rows.length === input.request.maximumRows) {
      stopped = expectedOrder < stagedCount;
      return "stop";
    }
    return "continue";
  });
  if (stopped && rows.length === 0) {
    throw createProgramDataRepositoryFailureV1("page_budget_too_small", repositoryOperationV1);
  }
  if (expectedOrder < stagedCount && !stopped) {
    throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperationV1);
  }
  return {
    kind: "page",
    page: {
      processId: input.request.processId,
      worksetRevision: head.revision,
      fromOrder: input.request.fromOrder,
      rows,
      byteLength,
      nextOrder: expectedOrder < stagedCount ? expectedOrder : null,
    },
  };
}

export const indexedDbTranslationPersistenceFacetOperationsV1:
  IndexedDbProgramPersistenceFacetOperationsV1 = {
    async prepare(operation, rawInput) {
      if (
        operation === "acquire_workset_import_execution" ||
        operation === "acquire_batch_execution"
      ) {
        const value = operation === "acquire_workset_import_execution"
          ? normalizeTranslationWorksetImportExecutionAcquireInputV1(
            rawInput as Parameters<
              typeof normalizeTranslationWorksetImportExecutionAcquireInputV1
            >[0],
          )
          : normalizeTranslationBatchExecutionAcquireInputV1(
            rawInput as Parameters<typeof normalizeTranslationBatchExecutionAcquireInputV1>[0],
          );
        const digest = await digestV1(value);
        return {
          storeNames: [
            ...indexedDbProcessExecutionTransactionStoreNamesV1,
            "translation_workset_heads",
          ],
          mode: "readwrite",
          async invoke({ transaction, processExecution }) {
            const processId = value.execution.attempt.processId;
            const [currentWorkset, currentProcess, currentLease, prepared] = await Promise.all([
              loadTranslationHeadTxV1(transaction, processId),
              processExecution.loadProcess(processId),
              processExecution.loadLease(processId),
              processExecution.prepareAcquire({
                value: value.execution,
                operation: "program_facet_execution_acquire",
                digest,
              }),
            ]);
            if (prepared.kind === "unchanged") {
              return {
                kind: "unchanged",
                process: prepared.process,
                entries: prepared.entries,
                lease: prepared.lease,
                operationReceipt: prepared.operationReceipt,
              };
            }
            let worksetConflict: boolean;
            if (operation === "acquire_workset_import_execution") {
              const importInput = value as ReturnType<
                typeof normalizeTranslationWorksetImportExecutionAcquireInputV1
              >;
              worksetConflict = importInput.expectedWorksetRevision === null
                ? currentWorkset !== null
                : currentWorkset === null || currentWorkset.phase !== "staging" ||
                  currentWorkset.revision !== importInput.expectedWorksetRevision;
            } else {
              const batchInput = value as ReturnType<
                typeof normalizeTranslationBatchExecutionAcquireInputV1
              >;
              worksetConflict = currentWorkset === null || currentWorkset.phase !== "ready" ||
                currentWorkset.revision !== batchInput.expectedWorksetRevision ||
                currentWorkset.acceptedUnitCount !== batchInput.expectedFirstPendingOrder ||
                currentWorkset.pendingCandidateId !== batchInput.expectedPendingCandidateId ||
                currentWorkset.acceptedUnitCount >= currentWorkset.stagedUnitCount;
            }
            if (prepared.kind === "conflict" || worksetConflict) {
              return { kind: "conflict", currentWorkset, currentProcess, currentLease };
            }
            await prepared.write();
            return {
              kind: "committed",
              process: prepared.process,
              entries: prepared.entries,
              lease: prepared.lease,
              operationReceipt: prepared.operationReceipt,
            };
          },
        };
      }

      if (operation === "begin_workset_import") {
        const value = normalizeTranslationWorksetBeginImportInputV1(
          rawInput as Parameters<typeof normalizeTranslationWorksetBeginImportInputV1>[0],
        );
        const expectation = { operation: "begin" as const, input: value };
        const digest = await digestV1(expectation);
        return {
          storeNames: [
            "processes",
            "process_execution_leases",
            "process_workspace_bindings",
            "translation_workset_heads",
            "translation_workset_operations",
          ],
          mode: "readwrite",
          async invoke({ transaction, processExecution }) {
            const [replay, current] = await Promise.all([
              translationReceiptTxV1(transaction, expectation, digest),
              loadTranslationHeadTxV1(transaction, value.processId),
            ]);
            if (replay !== "absent") {
              if (
                replay === "mismatch" || current === null ||
                current.revision !== replay.worksetRevision
              ) return { kind: "conflict", current };
              return { kind: "unchanged", head: current, operationReceipt: replay };
            }
            if (current !== null) return { kind: "conflict", current };
            const [leaseIsCurrent, process, binding] = await Promise.all([
              translationImportLeaseIsCurrentTxV1(transaction, value, repositoryOperationV1),
              processExecution.loadProcess(value.processId),
              requestResultV1(
                transaction.objectStore("process_workspace_bindings").get(value.processId),
              ),
            ]);
            if (!leaseIsCurrent || process === null || binding === undefined) {
              return { kind: "conflict", current: null };
            }
            const workspace = cloneProcessWorkspaceBindingV1(binding as ProcessWorkspaceBindingV1);
            const checkpoint = process.checkpoint;
            if (
              workspace.processId !== value.processId || checkpoint === null ||
              checkpoint.workspaceId !== workspace.workspaceId ||
              value.sourceBinding.workspaceId !== workspace.workspaceId ||
              value.sourceBinding.volumeId !== workspace.volumeId ||
              value.sourceBinding.workspaceFormat !== workspace.workspaceFormat
            ) return { kind: "conflict", current: null };
            const head: TranslationWorksetHeadV1 = {
              schemaVersion: 2,
              processId: value.processId,
              importOperationId: value.operationId,
              revision: 1,
              phase: "staging",
              title: value.title,
              document: structuredClone(value.document),
              source: structuredClone(value.source),
              sourceBinding: structuredClone(value.sourceBinding),
              sourceLocale: value.sourceLocale,
              targetLocale: value.targetLocale,
              documentPurpose: value.documentPurpose,
              style: value.style,
              expectedUnitCount: value.expectedUnitCount,
              stagedUnitCount: 0,
              expectedGlossaryCount: value.expectedGlossaryCount,
              stagedGlossaryCount: 0,
              acceptedUnitCount: 0,
              acceptedBatchCount: 0,
              pendingCandidateId: null,
              createdAt: value.updatedAt,
              updatedAt: value.updatedAt,
            };
            const receipt = translationReceiptV1(expectation, digest, 1);
            await Promise.all([
              requestResultV1(transaction.objectStore("translation_workset_heads").add(head)),
              requestResultV1(
                transaction.objectStore("translation_workset_operations").add(receipt),
              ),
            ]);
            return { kind: "committed", head: structuredClone(head), operationReceipt: receipt };
          },
        };
      }

      if (operation === "append_workset_import") {
        const value = normalizeTranslationWorksetAppendImportInputV1(
          rawInput as Parameters<typeof normalizeTranslationWorksetAppendImportInputV1>[0],
        );
        const expectation = { operation: "append" as const, input: value };
        const digest = await digestV1(expectation);
        return {
          storeNames: [
            "processes",
            "process_execution_leases",
            "translation_workset_heads",
            "translation_workset_units",
            "translation_glossary_entries",
            "translation_workset_operations",
          ],
          mode: "readwrite",
          async invoke({ transaction }) {
            const [replay, current] = await Promise.all([
              translationReceiptTxV1(transaction, expectation, digest),
              loadTranslationHeadTxV1(transaction, value.processId),
            ]);
            if (replay !== "absent") {
              if (
                replay === "mismatch" || current === null ||
                current.revision !== replay.worksetRevision
              ) return { kind: "conflict", current };
              return { kind: "unchanged", head: current, operationReceipt: replay };
            }
            const leaseIsCurrent = await translationImportLeaseIsCurrentTxV1(
              transaction,
              value,
              repositoryOperationV1,
            );
            if (
              !leaseIsCurrent || current === null || current.phase !== "staging" ||
              current.revision !== value.expectedWorksetRevision
            ) return { kind: "conflict", current };
            const orderedUnits = value.units.toSorted((left, right) => left.order - right.order);
            const orderedGlossary = value.glossaryEntries.toSorted((left, right) =>
              left.order - right.order
            );
            if (
              orderedUnits.some((row, index) => row.order !== current.stagedUnitCount + index) ||
              orderedGlossary.some((row, index) =>
                row.order !== current.stagedGlossaryCount + index
              ) || current.stagedUnitCount + orderedUnits.length > current.expectedUnitCount ||
              current.stagedGlossaryCount + orderedGlossary.length > current.expectedGlossaryCount
            ) return { kind: "conflict", current };
            const revision = current.revision + 1;
            const head: TranslationWorksetHeadV1 = {
              ...current,
              revision,
              stagedUnitCount: current.stagedUnitCount + orderedUnits.length,
              stagedGlossaryCount: current.stagedGlossaryCount + orderedGlossary.length,
              updatedAt: value.updatedAt,
            };
            const receipt = translationReceiptV1(expectation, digest, revision);
            const unitStore = transaction.objectStore("translation_workset_units");
            const glossaryStore = transaction.objectStore("translation_glossary_entries");
            await Promise.all([
              ...orderedUnits.map((row) =>
                requestResultV1(unitStore.add({ processId: value.processId, ...row, target: null }))
              ),
              ...orderedGlossary.map((row) =>
                requestResultV1(glossaryStore.add({ processId: value.processId, ...row }))
              ),
              requestResultV1(transaction.objectStore("translation_workset_heads").put(head)),
              requestResultV1(
                transaction.objectStore("translation_workset_operations").add(receipt),
              ),
            ]);
            return { kind: "committed", head: structuredClone(head), operationReceipt: receipt };
          },
        };
      }

      if (operation === "finalize_workset_with_execution_terminal") {
        const value = normalizeTranslationWorksetFinalizeExecutionBundleInputV1(
          rawInput as Parameters<
            typeof normalizeTranslationWorksetFinalizeExecutionBundleInputV1
          >[0],
        );
        const worksetExpectation = { operation: "finalize" as const, input: value.workset };
        const [worksetDigest, processDigest] = await Promise.all([
          digestV1(worksetExpectation),
          digestV1(value.terminal),
        ]);
        return {
          storeNames: [
            ...indexedDbProcessExecutionTransactionStoreNamesV1,
            "process_workspace_bindings",
            "translation_workset_heads",
            "translation_workset_operations",
          ],
          mode: "readwrite",
          async invoke(
            { transaction, processExecution },
          ): Promise<TranslationWorksetFinalizeExecutionCompositeCommitResultV1> {
            const [currentWorkset, currentProcess, currentLease, workset, terminal] = await Promise
              .all([
                loadTranslationHeadTxV1(transaction, value.workset.processId),
                processExecution.loadProcess(value.workset.processId),
                processExecution.loadLease(value.workset.processId),
                prepareTranslationFinalizeV1({
                  transaction,
                  value: value.workset,
                  digest: worksetDigest,
                }),
                processExecution.prepareTerminal({
                  value: value.terminal,
                  operation: "execution_terminal",
                  digest: processDigest,
                }),
              ]);
            if (
              workset.kind === "conflict" || terminal.kind === "conflict" ||
              workset.kind !== terminal.kind
            ) return { kind: "conflict", currentWorkset, currentProcess, currentLease };
            if (workset.kind === "committed" && terminal.kind === "committed") {
              await Promise.all([workset.write(), terminal.write()]);
            }
            return {
              kind: workset.kind,
              head: structuredClone(workset.head),
              worksetOperationReceipt: workset.operationReceipt,
              process: terminal.process,
              entries: terminal.entries,
              processOperationReceipt: terminal.operationReceipt,
            };
          },
        };
      }

      if (operation === "publish_candidate_with_execution_terminal") {
        const value = normalizeTranslationBatchCandidateExecutionBundleInputV1(
          rawInput as Parameters<
            typeof normalizeTranslationBatchCandidateExecutionBundleInputV1
          >[0],
        );
        const worksetExpectation = {
          operation: "publish_candidate" as const,
          input: value.workset,
        };
        const [worksetDigest, processDigest] = await Promise.all([
          digestV1(worksetExpectation),
          digestV1(value.terminal),
        ]);
        return {
          storeNames: [
            ...indexedDbProcessExecutionTransactionStoreNamesV1,
            "translation_workset_heads",
            "translation_workset_operations",
            "translation_workset_units",
            "translation_glossary_entries",
            "translation_batch_candidates",
          ],
          mode: "readwrite",
          async invoke(
            { transaction, processExecution },
          ): Promise<TranslationBatchCandidateExecutionCompositeCommitResultV1> {
            const [currentWorkset, currentProcess, currentLease, workset, terminal] = await Promise
              .all([
                loadTranslationHeadTxV1(transaction, value.workset.processId),
                processExecution.loadProcess(value.workset.processId),
                processExecution.loadLease(value.workset.processId),
                prepareTranslationCandidateV1({
                  transaction,
                  value: value.workset,
                  digest: worksetDigest,
                }),
                processExecution.prepareTerminal({
                  value: value.terminal,
                  operation: "execution_terminal",
                  digest: processDigest,
                }),
              ]);
            if (
              workset.kind === "conflict" || terminal.kind === "conflict" ||
              workset.kind !== terminal.kind
            ) return { kind: "conflict", currentWorkset, currentProcess, currentLease };
            if (workset.kind === "committed" && terminal.kind === "committed") {
              await Promise.all([workset.write(), terminal.write()]);
            }
            return {
              kind: workset.kind,
              head: structuredClone(workset.head),
              candidate: cloneTranslationBatchCandidateRecordV1(workset.candidate),
              worksetOperationReceipt: workset.operationReceipt,
              process: terminal.process,
              entries: terminal.entries,
              processOperationReceipt: terminal.operationReceipt,
            };
          },
        };
      }

      if (operation === "load_workset_head") {
        const processId = normalizeProcessIdV1(rawInput as string);
        return {
          storeNames: ["translation_workset_heads"],
          mode: "readonly",
          invoke: ({ transaction }) => loadTranslationHeadTxV1(transaction, processId),
        };
      }

      if (operation === "load_batch_candidate") {
        if (
          rawInput === null || typeof rawInput !== "object" || Array.isArray(rawInput) ||
          Reflect.ownKeys(rawInput).length !== 2 ||
          !Object.hasOwn(rawInput, "processId") || !Object.hasOwn(rawInput, "candidateId")
        ) throw new TypeError("invalid Translation candidate lookup");
        const row = rawInput as { readonly processId: unknown; readonly candidateId: unknown };
        const processId = normalizeProcessIdV1(row.processId as string);
        if (!identifierV1(row.candidateId)) throw new TypeError("invalid Translation candidate id");
        const candidateId = row.candidateId;
        return {
          storeNames: ["translation_batch_candidates"],
          mode: "readonly",
          invoke: ({ transaction }) =>
            loadTranslationCandidateTxV1(
              transaction,
              processId,
              candidateId,
              repositoryOperationV1,
            ),
        };
      }

      if (operation === "accept_candidate" || operation === "reject_candidate") {
        const value = operation === "accept_candidate"
          ? normalizeTranslationBatchCandidateAcceptInputV1(
            rawInput as Parameters<typeof normalizeTranslationBatchCandidateAcceptInputV1>[0],
          )
          : normalizeTranslationBatchCandidateRejectInputV1(
            rawInput as Parameters<typeof normalizeTranslationBatchCandidateRejectInputV1>[0],
          );
        const expectation: TranslationWorksetOperationExpectationV1 =
          operation === "accept_candidate"
            ? {
              operation: "accept_candidate",
              input: value as TranslationBatchCandidateAcceptInputV1,
            }
            : {
              operation: "reject_candidate",
              input: value as TranslationBatchCandidateRejectInputV1,
            };
        const digest = await digestV1(expectation);
        return {
          storeNames: [
            "translation_workset_heads",
            "translation_workset_operations",
            "translation_workset_units",
            "translation_batch_candidates",
          ],
          mode: "readwrite",
          async invoke({ transaction }) {
            const prepared = await prepareTranslationCandidateReviewV1({
              transaction,
              value,
              decision: operation,
              digest,
            });
            if (prepared.kind === "conflict") return prepared;
            if (prepared.kind === "committed") await prepared.write();
            return {
              kind: prepared.kind,
              head: structuredClone(prepared.head),
              operationReceipt: structuredClone(prepared.operationReceipt),
            };
          },
        };
      }

      if (operation === "load_workset_unit_page" || operation === "load_workset_glossary_page") {
        const value = normalizeTranslationWorksetPageRequestV1(
          rawInput as Parameters<typeof normalizeTranslationWorksetPageRequestV1>[0],
        );
        const storeName = operation === "load_workset_unit_page"
          ? "translation_workset_units" as const
          : "translation_glossary_entries" as const;
        return {
          storeNames: ["translation_workset_heads", storeName],
          mode: "readonly",
          invoke: ({ transaction, keyRange }) =>
            storeName === "translation_workset_units"
              ? loadTranslationPageTxV1<TranslationWorksetUnitRecordV1>({
                transaction,
                keyRange,
                request: value,
                storeName,
              })
              : loadTranslationPageTxV1<TranslationWorksetGlossaryEntryV1>({
                transaction,
                keyRange,
                request: value,
                storeName,
              }),
        };
      }

      if (operation === "query_workset_operation") {
        const value = normalizeTranslationWorksetOperationExpectationV1(
          rawInput as Parameters<typeof normalizeTranslationWorksetOperationExpectationV1>[0],
        );
        const digest = await digestV1(value);
        return {
          storeNames: ["translation_workset_operations"],
          mode: "readonly",
          async invoke({ transaction }) {
            const result = await translationReceiptTxV1(transaction, value, digest);
            if (result === "absent") return { kind: "absent" };
            if (result === "mismatch") {
              const row = await requestResultV1(
                transaction.objectStore("translation_workset_operations").get([
                  value.input.processId,
                  value.input.operationId,
                ]),
              );
              return {
                kind: "mismatch",
                receipt: structuredClone(row) as TranslationWorksetOperationReceiptV1,
              };
            }
            return { kind: "committed", receipt: result };
          },
        };
      }

      if (operation === "query_process_operation") {
        if (
          rawInput === null || typeof rawInput !== "object" || Array.isArray(rawInput) ||
          Reflect.ownKeys(rawInput).length !== 2 || !Object.hasOwn(rawInput, "operation") ||
          !Object.hasOwn(rawInput, "input")
        ) throw new TypeError("invalid Translation Process operation expectation");
        const candidate = rawInput as {
          readonly operation: unknown;
          readonly input: unknown;
        };
        const value = candidate.operation === "workset_import_execution_acquire"
          ? {
            operation: "workset_import_execution_acquire" as const,
            input: normalizeTranslationWorksetImportExecutionAcquireInputV1(
              candidate.input as Parameters<
                typeof normalizeTranslationWorksetImportExecutionAcquireInputV1
              >[0],
            ),
          }
          : candidate.operation === "batch_execution_acquire"
          ? {
            operation: "batch_execution_acquire" as const,
            input: normalizeTranslationBatchExecutionAcquireInputV1(
              candidate.input as Parameters<
                typeof normalizeTranslationBatchExecutionAcquireInputV1
              >[0],
            ),
          }
          : null;
        if (value === null) {
          throw new TypeError("invalid Translation Process operation expectation");
        }
        const digest = await digestV1(value.input);
        const processId = value.input.execution.attempt.processId;
        const operationId = value.input.execution.attempt.commitId;
        return {
          storeNames: [...indexedDbProcessExecutionTransactionStoreNamesV1],
          mode: "readonly",
          async invoke({ transaction, processExecution }) {
            const receipt = await processExecution.loadOperationReceipt(processId, operationId);
            if (receipt === "absent") return { kind: "absent" };
            if (
              receipt === "invalid" || receipt.operation !== "program_facet_execution_acquire" ||
              receipt.operationDigest !== digest
            ) {
              return { kind: "mismatch", receipt: receipt === "invalid" ? null : receipt };
            }
            const process = await processExecution.loadProcess(processId);
            if (
              process === null || process.revision < receipt.processRevision ||
              process.transcriptFrontier < receipt.transcriptFrontier
            ) throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperationV1);
            const trigger = value.input.execution.attempt.trigger;
            if (trigger.kind === "new_entry") {
              const row = await requestResultV1(
                transaction.objectStore("transcript_entries").get([
                  trigger.entry.processId,
                  trigger.entry.sequence,
                ]),
              );
              if (row === undefined || !exactJsonValuesEqualV1(row, trigger.entry)) {
                throw createProgramDataRepositoryFailureV1("schema_invalid", repositoryOperationV1);
              }
            }
            return { kind: "committed", receipt };
          },
        };
      }

      throw new TypeError(`unsupported Translation persistence operation: ${operation}`);
    },
  };
