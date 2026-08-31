// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import type {
  ProgramCatalogAcceptedDecisionListInputV1,
  ProgramCatalogListInputV1,
} from "./program-catalog-repository.ts";
import type {
  ProcessSummaryListInputV1,
  ProgramDefinitionRevisionV1,
} from "./program-process-repository.ts";
import type { ProgramNetworkAccessMutationV1 } from "./program-network-access.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProgramDataProcessOperationExpectationV1,
  type ProgramDataRepositoryOperationV1,
  type ProgramDataRepositoryV1,
  type ProgramProcessCreateBundleInputV1,
  type ProgramProcessDecisionBundleInputV1,
  type ProgramProcessRevisionBundleInputV1,
  type ProcessWorkspaceCreateBundleInputV1,
  type TranslationBatchCandidateExecutionBundleInputV1,
  type TranslationBatchExecutionAcquireInputV1,
  type TranslationWorksetFinalizeExecutionBundleInputV1,
  type TranslationWorksetImportExecutionAcquireInputV1,
} from "./program-data-repository.ts";
import type {
  ProcessExecutionAcquireInputV1,
  ProcessExecutionLeaseReleaseInputV1,
  ProcessExecutionLeaseRenewInputV1,
  ProcessExecutionTerminalInputV1,
} from "./process-execution-repository.ts";
import type {
  TranslationBatchCandidateAcceptInputV1,
  TranslationBatchCandidateRejectInputV1,
} from "./translation/translation-workset-repository.ts";
import {
  admitProgramDataRepositoryWorkerResponseEnvelopeV1,
  createProgramDataRepositoryWorkerResponseExpectationV1,
  operationForProgramDataRepositoryWorkerMethodV1,
  type ProgramDataRepositoryWorkerRequestEnvelopeV1,
  type ProgramDataRepositoryWorkerRequestV1,
  type ProgramDataRepositoryWorkerResponseExpectationV1,
  type ProgramDataRepositoryWorkerSuccessV1,
} from "./program-data-repository-worker-protocol.ts";

interface ProgramDataRepositoryWorkerMessageEventV1 {
  readonly data: unknown;
}

export interface ProgramDataRepositoryWorkerLikeV1 {
  addEventListener(
    type: "message",
    listener: (event: ProgramDataRepositoryWorkerMessageEventV1) => void,
  ): void;
  addEventListener(type: "error" | "messageerror", listener: () => void): void;
  removeEventListener(
    type: "message",
    listener: (event: ProgramDataRepositoryWorkerMessageEventV1) => void,
  ): void;
  removeEventListener(type: "error" | "messageerror", listener: () => void): void;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface CreateBrowserProgramDataRepositoryOptionsV1 {
  readonly createWorker?: () => ProgramDataRepositoryWorkerLikeV1;
}

interface PendingCallV1 {
  readonly expectation: ProgramDataRepositoryWorkerResponseExpectationV1;
  readonly operation: ProgramDataRepositoryOperationV1;
  readonly mutation: boolean;
  delivered: boolean;
  readonly resolve: (record: ProgramDataRepositoryWorkerSuccessV1) => void;
  readonly reject: (error: unknown) => void;
}

function isMutationMethodV1(method: ProgramDataRepositoryWorkerRequestV1["method"]): boolean {
  return method === "create_program_with_process" ||
    method === "create_process_with_workspace" ||
    method === "apply_program_revision_with_process_transcript" ||
    method === "decide_program_with_process_transcript" ||
    method === "publish_program_definition_revision" ||
    method === "acquire_process_execution" ||
    method === "acquire_translation_workset_import_execution" ||
    method === "acquire_translation_batch_execution" ||
    method === "renew_process_execution_lease" ||
    method === "release_process_execution_lease" ||
    method === "commit_process_execution_terminal" ||
    method === "commit_program_revision_with_process_execution_terminal" ||
    method === "commit_translation_workset_finalize_with_process_execution_terminal" ||
    method === "commit_translation_batch_candidate_with_process_execution_terminal" ||
    method === "accept_translation_batch_candidate" ||
    method === "reject_translation_batch_candidate" ||
    method === "begin_translation_workset_import" ||
    method === "append_translation_workset_import" ||
    method === "set_program_network_access" || method === "reset";
}

function responseRequestIdV1(value: unknown): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, "requestId");
    return descriptor !== undefined && Object.hasOwn(descriptor, "value") &&
        typeof descriptor.value === "string"
      ? descriptor.value
      : null;
  } catch {
    return null;
  }
}

function defaultProgramDataRepositoryWorkerV1(): ProgramDataRepositoryWorkerLikeV1 {
  return new Worker(new URL("./program-data-repository.worker.ts", import.meta.url), {
    type: "module",
    name: "sillyos-program-data-repository-v1",
  });
}

/** Page-side product facade. No IndexedDB handle crosses this boundary. */
export function createBrowserProgramDataRepositoryV1(
  options: CreateBrowserProgramDataRepositoryOptionsV1 = {},
): ProgramDataRepositoryV1 {
  const createWorkerV1 = options.createWorker ?? defaultProgramDataRepositoryWorkerV1;
  let worker = createWorkerV1();
  const pending = new Map<string, PendingCallV1>();
  let nextRequestId = 1n;
  let lifecycle: "active" | "recoverable_lost" | "disposing" | "disposed" = "active";
  let recoveryConsumed = false;
  let disposePromise: Promise<void> | null = null;

  const removeWorkerListenersV1 = (target: ProgramDataRepositoryWorkerLikeV1): void => {
    target.removeEventListener("message", onMessageV1);
    target.removeEventListener("error", onTransportLossV1);
    target.removeEventListener("messageerror", onTransportLossV1);
  };

  const terminateForTransportLossV1 = (readCode: "unavailable" | "disposed"): void => {
    if (lifecycle === "disposed") return;
    const target = worker;
    lifecycle = lifecycle === "disposing" || readCode === "disposed" || recoveryConsumed
      ? "disposed"
      : "recoverable_lost";
    removeWorkerListenersV1(target);
    for (const call of pending.values()) {
      call.reject(
        createProgramDataRepositoryFailureV1(
          call.mutation && call.delivered ? "outcome_unknown" : readCode,
          call.operation,
        ),
      );
    }
    pending.clear();
    target.terminate();
  };

  const terminateForInvalidWireV1 = (): void => {
    if (lifecycle === "disposed") return;
    lifecycle = lifecycle === "disposing" || recoveryConsumed ? "disposed" : "recoverable_lost";
    const target = worker;
    removeWorkerListenersV1(target);
    for (const call of pending.values()) {
      call.reject(
        createProgramDataRepositoryFailureV1(
          call.mutation && call.delivered ? "outcome_unknown" : "wire_invalid",
          call.operation,
        ),
      );
    }
    pending.clear();
    target.terminate();
  };

  function onTransportLossV1(): void {
    terminateForTransportLossV1("unavailable");
  }

  function onMessageV1(event: ProgramDataRepositoryWorkerMessageEventV1): void {
    const requestId = responseRequestIdV1(event.data);
    if (requestId === null) {
      terminateForInvalidWireV1();
      return;
    }
    const call = pending.get(requestId);
    if (call === undefined) {
      terminateForInvalidWireV1();
      return;
    }
    const response = admitProgramDataRepositoryWorkerResponseEnvelopeV1(
      event.data,
      call.expectation,
    );
    if (response.kind === "rejected" || response.value.requestId !== requestId) {
      terminateForInvalidWireV1();
      return;
    }
    pending.delete(requestId);
    if (response.value.record.kind === "failure") {
      call.reject(
        createProgramDataRepositoryFailureV1(
          response.value.record.code,
          response.value.record.operation,
        ),
      );
      return;
    }
    call.resolve(response.value.record);
  }

  const attachWorkerListenersV1 = (target: ProgramDataRepositoryWorkerLikeV1): void => {
    target.addEventListener("message", onMessageV1);
    target.addEventListener("error", onTransportLossV1);
    target.addEventListener("messageerror", onTransportLossV1);
  };
  attachWorkerListenersV1(worker);

  const recoverWorkerForQueryV1 = (): void => {
    if (lifecycle !== "recoverable_lost") return;
    recoveryConsumed = true;
    worker = createWorkerV1();
    attachWorkerListenersV1(worker);
    lifecycle = "active";
  };

  const callV1 = (
    request: ProgramDataRepositoryWorkerRequestV1,
    allowDisposing = false,
    recoverForQuery = false,
  ): Promise<ProgramDataRepositoryWorkerSuccessV1> => {
    const operation = operationForProgramDataRepositoryWorkerMethodV1(request.method);
    if (recoverForQuery) recoverWorkerForQueryV1();
    if (
      lifecycle === "disposed" || lifecycle === "recoverable_lost" ||
      (lifecycle === "disposing" && !allowDisposing)
    ) {
      return Promise.reject(createProgramDataRepositoryFailureV1("disposed", operation));
    }
    const requestId = `program-data-repository.rpc.${String(nextRequestId)}`;
    nextRequestId += 1n;
    const candidate: ProgramDataRepositoryWorkerRequestEnvelopeV1 = {
      revision: 1,
      kind: "rpc_request",
      requestId,
      record: request,
    };
    const expectation = createProgramDataRepositoryWorkerResponseExpectationV1(request);
    // Worker receive is the request admission owner. The page keeps only this
    // compact response binding, so a multi-megabyte import is structured-cloned
    // once into the Worker rather than normalized and deep-cloned beforehand.
    return new Promise((resolve, reject) => {
      const call: PendingCallV1 = {
        expectation,
        operation,
        mutation: isMutationMethodV1(request.method),
        delivered: false,
        resolve,
        reject,
      };
      pending.set(requestId, call);
      try {
        // Worker.postMessage has no targetOrigin parameter.
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
        worker.postMessage(candidate);
        call.delivered = true;
      } catch {
        pending.delete(requestId);
        reject(createProgramDataRepositoryFailureV1("unavailable", operation));
      }
    });
  };

  return {
    async initialize(): Promise<void> {
      const response = await callV1({ method: "initialize" });
      if (response.method !== "initialize") throw new TypeError("invalid initialize response");
    },
    async listPrograms(input: ProgramCatalogListInputV1) {
      const response = await callV1({ method: "list_programs", input });
      if (response.method !== "list_programs") throw new TypeError("invalid list response");
      return response.value;
    },
    async load(programId: string) {
      const response = await callV1({ method: "load_program", programId });
      if (response.method !== "load_program") throw new TypeError("invalid load response");
      return response.value;
    },
    async loadProgramRevision(programId: string, revision: number) {
      const response = await callV1({ method: "load_program_revision", programId, revision });
      if (response.method !== "load_program_revision") {
        throw new TypeError("invalid Program revision response");
      }
      return response.value;
    },
    async loadDecision(programId: string, proposalId: string, programRevision: number) {
      const response = await callV1({
        method: "load_program_decision",
        programId,
        proposalId,
        programRevision,
      });
      if (response.method !== "load_program_decision") {
        throw new TypeError("invalid Program decision response");
      }
      return response.value;
    },
    async loadLatestAcceptedDecision(programId: string) {
      const response = await callV1({
        method: "load_latest_accepted_program_decision",
        programId,
      });
      if (response.method !== "load_latest_accepted_program_decision") {
        throw new TypeError("invalid accepted Program decision response");
      }
      return response.value;
    },
    async listAcceptedDecisions(input: ProgramCatalogAcceptedDecisionListInputV1) {
      const response = await callV1({ method: "list_accepted_program_decisions", input });
      if (response.method !== "list_accepted_program_decisions") {
        throw new TypeError("invalid accepted Program decisions response");
      }
      return response.value;
    },
    async loadContinuation(programId: string) {
      const response = await callV1({ method: "load_workspace_continuation", programId });
      if (response.method !== "load_workspace_continuation") {
        throw new TypeError("invalid continuation response");
      }
      return response.value;
    },
    async createProgramWithProcess(input: ProgramProcessCreateBundleInputV1) {
      const response = await callV1({ method: "create_program_with_process", input });
      if (response.method !== "create_program_with_process") {
        throw new TypeError("invalid Program/Process create response");
      }
      return response.value;
    },
    async createProcessWithWorkspace(input: ProcessWorkspaceCreateBundleInputV1) {
      const response = await callV1({ method: "create_process_with_workspace", input });
      if (response.method !== "create_process_with_workspace") {
        throw new TypeError("invalid Process/Workspace create response");
      }
      return response.value;
    },
    async loadProcessWorkspaceBinding(processId: string) {
      const response = await callV1({ method: "load_process_workspace_binding", processId });
      if (response.method !== "load_process_workspace_binding") {
        throw new TypeError("invalid Process Workspace binding response");
      }
      return response.value;
    },
    async applyProgramRevisionWithProcessTranscript(
      input: ProgramProcessRevisionBundleInputV1,
    ) {
      const response = await callV1({
        method: "apply_program_revision_with_process_transcript",
        input,
      });
      if (response.method !== "apply_program_revision_with_process_transcript") {
        throw new TypeError("invalid Program/Process revision response");
      }
      return response.value;
    },
    async decideProgramWithProcessTranscript(input: ProgramProcessDecisionBundleInputV1) {
      const response = await callV1({
        method: "decide_program_with_process_transcript",
        input,
      });
      if (response.method !== "decide_program_with_process_transcript") {
        throw new TypeError("invalid Program/Process decision response");
      }
      return response.value;
    },
    async publishProgramDefinitionRevision(definition: ProgramDefinitionRevisionV1) {
      const response = await callV1({
        method: "publish_program_definition_revision",
        definition,
      });
      if (response.method !== "publish_program_definition_revision") {
        throw new TypeError("invalid Program definition publish response");
      }
      return response.value;
    },
    async loadProgramDefinitionRevision(programId: string, revision: number) {
      const response = await callV1({
        method: "load_program_definition_revision",
        programId,
        revision,
      });
      if (response.method !== "load_program_definition_revision") {
        throw new TypeError("invalid Program definition response");
      }
      return response.value;
    },
    async loadProcess(processId: string) {
      const response = await callV1({ method: "load_process", processId });
      if (response.method !== "load_process") throw new TypeError("invalid Process response");
      return response.value;
    },
    async listProcessSummaries(input: ProcessSummaryListInputV1) {
      const response = await callV1({ method: "list_process_summaries", input });
      if (response.method !== "list_process_summaries") {
        throw new TypeError("invalid Process summary response");
      }
      return response.value;
    },
    async acquireProcessExecution(input: ProcessExecutionAcquireInputV1) {
      const response = await callV1({ method: "acquire_process_execution", input });
      if (response.method !== "acquire_process_execution") {
        throw new TypeError("invalid Process execution acquire response");
      }
      return response.value;
    },
    async acquireTranslationWorksetImportExecution(
      input: TranslationWorksetImportExecutionAcquireInputV1,
    ) {
      const response = await callV1({
        method: "acquire_translation_workset_import_execution",
        input,
      });
      if (response.method !== "acquire_translation_workset_import_execution") {
        throw new TypeError("invalid Translation workset execution acquire response");
      }
      return response.value;
    },
    async acquireTranslationBatchExecution(input: TranslationBatchExecutionAcquireInputV1) {
      const response = await callV1({ method: "acquire_translation_batch_execution", input });
      if (response.method !== "acquire_translation_batch_execution") {
        throw new TypeError("invalid Translation batch execution acquire response");
      }
      return response.value;
    },
    async renewProcessExecutionLease(input: ProcessExecutionLeaseRenewInputV1) {
      const response = await callV1({ method: "renew_process_execution_lease", input });
      if (response.method !== "renew_process_execution_lease") {
        throw new TypeError("invalid Process execution lease renewal response");
      }
      return response.value;
    },
    async releaseProcessExecutionLease(input: ProcessExecutionLeaseReleaseInputV1) {
      const response = await callV1({ method: "release_process_execution_lease", input });
      if (response.method !== "release_process_execution_lease") {
        throw new TypeError("invalid Process execution lease release response");
      }
      return response.value;
    },
    async loadProcessExecutionLease(processId: string) {
      const response = await callV1({ method: "load_process_execution_lease", processId });
      if (response.method !== "load_process_execution_lease") {
        throw new TypeError("invalid Process execution lease response");
      }
      return response.value;
    },
    async commitProcessExecutionTerminal(input: ProcessExecutionTerminalInputV1) {
      const response = await callV1({ method: "commit_process_execution_terminal", input });
      if (response.method !== "commit_process_execution_terminal") {
        throw new TypeError("invalid Process execution terminal response");
      }
      return response.value;
    },
    async commitProgramRevisionWithProcessExecutionTerminal(input) {
      const response = await callV1({
        method: "commit_program_revision_with_process_execution_terminal",
        input,
      });
      if (response.method !== "commit_program_revision_with_process_execution_terminal") {
        throw new TypeError("invalid Program/Process execution terminal response");
      }
      return response.value;
    },
    async commitTranslationWorksetFinalizeWithProcessExecutionTerminal(
      input: TranslationWorksetFinalizeExecutionBundleInputV1,
    ) {
      const response = await callV1({
        method: "commit_translation_workset_finalize_with_process_execution_terminal",
        input,
      });
      if (
        response.method !==
          "commit_translation_workset_finalize_with_process_execution_terminal"
      ) throw new TypeError("invalid Translation workset/Process terminal response");
      return response.value;
    },
    async commitTranslationBatchCandidateWithProcessExecutionTerminal(
      input: TranslationBatchCandidateExecutionBundleInputV1,
    ) {
      const response = await callV1({
        method: "commit_translation_batch_candidate_with_process_execution_terminal",
        input,
      });
      if (
        response.method !==
          "commit_translation_batch_candidate_with_process_execution_terminal"
      ) throw new TypeError("invalid Translation batch/Process terminal response");
      return response.value;
    },
    async queryProcessOperation(input: ProgramDataProcessOperationExpectationV1) {
      const response = await callV1({ method: "query_process_operation", input }, false, true);
      if (response.method !== "query_process_operation") {
        throw new TypeError("invalid Process operation query response");
      }
      return response.value;
    },
    async beginTranslationWorksetImport(input) {
      const response = await callV1(
        { method: "begin_translation_workset_import", input },
        false,
        true,
      );
      if (response.method !== "begin_translation_workset_import") {
        throw new TypeError("invalid Translation begin response");
      }
      return response.value;
    },
    async appendTranslationWorksetImport(input) {
      const response = await callV1(
        { method: "append_translation_workset_import", input },
        false,
        true,
      );
      if (response.method !== "append_translation_workset_import") {
        throw new TypeError("invalid Translation append response");
      }
      return response.value;
    },
    async loadTranslationWorksetHead(processId) {
      const response = await callV1({ method: "load_translation_workset_head", processId });
      if (response.method !== "load_translation_workset_head") {
        throw new TypeError("invalid Translation head response");
      }
      return response.value;
    },
    async loadTranslationBatchCandidate(processId, candidateId) {
      const response = await callV1({
        method: "load_translation_batch_candidate",
        processId,
        candidateId,
      });
      if (response.method !== "load_translation_batch_candidate") {
        throw new TypeError("invalid Translation batch candidate response");
      }
      return response.value;
    },
    async acceptTranslationBatchCandidate(input: TranslationBatchCandidateAcceptInputV1) {
      const response = await callV1({ method: "accept_translation_batch_candidate", input });
      if (response.method !== "accept_translation_batch_candidate") {
        throw new TypeError("invalid Translation candidate acceptance response");
      }
      return response.value;
    },
    async rejectTranslationBatchCandidate(input: TranslationBatchCandidateRejectInputV1) {
      const response = await callV1({ method: "reject_translation_batch_candidate", input });
      if (response.method !== "reject_translation_batch_candidate") {
        throw new TypeError("invalid Translation candidate rejection response");
      }
      return response.value;
    },
    async loadTranslationWorksetUnitPage(input) {
      const response = await callV1({ method: "load_translation_workset_unit_page", input });
      if (response.method !== "load_translation_workset_unit_page") {
        throw new TypeError("invalid Translation unit page response");
      }
      return response.value;
    },
    async loadTranslationWorksetGlossaryPage(input) {
      const response = await callV1({ method: "load_translation_workset_glossary_page", input });
      if (response.method !== "load_translation_workset_glossary_page") {
        throw new TypeError("invalid Translation glossary page response");
      }
      return response.value;
    },
    async queryTranslationWorksetOperation(input) {
      const response = await callV1(
        { method: "query_translation_workset_operation", input },
        false,
        true,
      );
      if (response.method !== "query_translation_workset_operation") {
        throw new TypeError("invalid Translation operation response");
      }
      return response.value;
    },
    async loadTranscriptPage(input) {
      const response = await callV1({ method: "load_transcript_page", input });
      if (response.method !== "load_transcript_page") {
        throw new TypeError("invalid transcript page response");
      }
      return response.value;
    },
    async loadProgramNetworkAccess(programId: string) {
      const response = await callV1({ method: "load_program_network_access", programId });
      if (response.method !== "load_program_network_access") {
        throw new TypeError("invalid network access response");
      }
      return response.value;
    },
    async setProgramNetworkAccess(input: ProgramNetworkAccessMutationV1) {
      const response = await callV1({ method: "set_program_network_access", input });
      if (response.method !== "set_program_network_access") {
        throw new TypeError("invalid network access mutation response");
      }
      return response.value;
    },
    async reset(): Promise<void> {
      const response = await callV1({ method: "reset" });
      if (response.method !== "reset") throw new TypeError("invalid reset response");
    },
    dispose(): Promise<void> {
      if (lifecycle === "disposed") return Promise.resolve();
      if (disposePromise !== null) return disposePromise;
      lifecycle = "disposing";
      disposePromise = (async () => {
        try {
          const response = await callV1({ method: "dispose" }, true);
          if (response.method !== "dispose") throw new TypeError("invalid dispose response");
        } finally {
          terminateForTransportLossV1("disposed");
        }
      })();
      return disposePromise;
    },
  };
}
