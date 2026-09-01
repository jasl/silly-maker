// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import type {
  ProcessSettingsOverrideMutationInputV1,
  ProcessSummaryListInputV1,
  RecentProcessSummaryListInputV1,
} from "../../program-platform/process/program-process-repository.ts";
import type { ProcessNetworkAccessMutationV1 } from "../../program-platform/capabilities/process-network-access.ts";
import {
  createProgramDataRepositoryFailureV1,
  type ProgramDataProcessOperationExpectationV1,
  type ProgramDataRepositoryOperationV1,
  type ProgramDataRepositoryV1,
  type ProcessWorkspaceCreateBundleInputV1,
} from "./program-data-repository.ts";
import type { ProgramPersistenceFacetInvocationV1 } from "./program-persistence-facet.ts";
import type {
  ProcessExecutionAcquireInputV1,
  ProcessExecutionLeaseReleaseInputV1,
  ProcessExecutionLeaseRenewInputV1,
  ProcessExecutionTerminalInputV1,
} from "../../program-platform/process/process-execution-repository.ts";
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
  return method === "create_process_with_workspace" ||
    method === "acquire_process_execution" ||
    method === "renew_process_execution_lease" ||
    method === "release_process_execution_lease" ||
    method === "commit_process_execution_terminal" ||
    method === "invoke_program_persistence_facet" ||
    method === "set_process_network_access" || method === "reset";
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
    async listRecentProcessSummaries(input: RecentProcessSummaryListInputV1) {
      const response = await callV1({ method: "list_recent_process_summaries", input });
      if (response.method !== "list_recent_process_summaries") {
        throw new TypeError("invalid recent Process summary response");
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
    async queryProcessOperation(input: ProgramDataProcessOperationExpectationV1) {
      const response = await callV1({ method: "query_process_operation", input }, false, true);
      if (response.method !== "query_process_operation") {
        throw new TypeError("invalid Process operation query response");
      }
      return response.value;
    },
    async invokeProgramPersistenceFacet(input: ProgramPersistenceFacetInvocationV1) {
      const response = await callV1(
        { method: "invoke_program_persistence_facet", input },
        false,
        true,
      );
      if (response.method !== "invoke_program_persistence_facet") {
        throw new TypeError("invalid Program persistence facet response");
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
    async loadProcessSettingsOverride(processId: string) {
      const response = await callV1({ method: "load_process_settings_override", processId });
      if (response.method !== "load_process_settings_override") {
        throw new TypeError("invalid Process settings response");
      }
      return response.value;
    },
    async setProcessSettingsOverride(input: ProcessSettingsOverrideMutationInputV1) {
      const response = await callV1({ method: "set_process_settings_override", input });
      if (response.method !== "set_process_settings_override") {
        throw new TypeError("invalid Process settings mutation response");
      }
      return response.value;
    },
    async loadProcessNetworkAccess(processId: string) {
      const response = await callV1({ method: "load_process_network_access", processId });
      if (response.method !== "load_process_network_access") {
        throw new TypeError("invalid network access response");
      }
      return response.value;
    },
    async setProcessNetworkAccess(input: ProcessNetworkAccessMutationV1) {
      const response = await callV1({ method: "set_process_network_access", input });
      if (response.method !== "set_process_network_access") {
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
