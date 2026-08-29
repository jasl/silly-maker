// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  createProgramRepositoryFailureV3,
  type ProgramRepositoryApplyRevisionInputV3,
  type ProgramRepositoryCreateInputV3,
  type ProgramRepositoryDecideInputV3,
  type ProgramRepositoryOperationV3,
  type ProgramRepositorySettleAgentRunInputV3,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "./program-repository.ts";
import type { ProgramNetworkAccessMutationV1 } from "./program-network-access.ts";
import {
  admitProgramRepositoryWorkerRequestEnvelopeV6,
  admitProgramRepositoryWorkerResponseEnvelopeV6,
  operationForProgramRepositoryWorkerMethodV6,
  type ProgramRepositoryWorkerMethodV6,
  type ProgramRepositoryWorkerRequestEnvelopeV6,
  type ProgramRepositoryWorkerRequestV6,
  type ProgramRepositoryWorkerSuccessV6,
} from "./program-repository-worker-protocol.ts";

interface ProgramRepositoryWorkerMessageEventV4 {
  readonly data: unknown;
}

export interface ProgramRepositoryWorkerLikeV6 {
  addEventListener(
    type: "message",
    listener: (event: ProgramRepositoryWorkerMessageEventV4) => void,
  ): void;
  addEventListener(type: "error" | "messageerror", listener: () => void): void;
  removeEventListener(
    type: "message",
    listener: (event: ProgramRepositoryWorkerMessageEventV4) => void,
  ): void;
  removeEventListener(type: "error" | "messageerror", listener: () => void): void;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface CreateBrowserProgramRepositoryOptionsV3 {
  readonly createWorker?: () => ProgramRepositoryWorkerLikeV6;
}

interface PendingCallV4 {
  readonly method: ProgramRepositoryWorkerMethodV6;
  readonly operation: ProgramRepositoryOperationV3;
  readonly mutation: boolean;
  delivered: boolean;
  readonly resolve: (record: ProgramRepositoryWorkerSuccessV6) => void;
  readonly reject: (error: unknown) => void;
}

function isMutationMethodV4(method: ProgramRepositoryWorkerMethodV6): boolean {
  return method === "create" || method === "apply_revision" ||
    method === "settle_agent_run" || method === "decide" ||
    method === "set_program_network_access" || method === "reset";
}

function responseRequestIdV4(value: unknown): string | null {
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

function defaultProgramRepositoryWorkerV4(): ProgramRepositoryWorkerLikeV6 {
  return new Worker(new URL("./program-repository.worker.ts", import.meta.url), {
    type: "module",
    name: "sillyos-program-repository-v6",
  });
}

/** Page-side product facade. No IndexedDB handle crosses this boundary. */
export function createBrowserProgramRepositoryV3(
  options: CreateBrowserProgramRepositoryOptionsV3 = {},
): ProgramRepositoryWithWorkspaceContinuationV1 {
  const worker = options.createWorker?.() ?? defaultProgramRepositoryWorkerV4();
  const pending = new Map<string, PendingCallV4>();
  let nextRequestId = 1;
  let lifecycle: "active" | "disposing" | "disposed" = "active";
  let disposePromise: Promise<void> | null = null;

  const removeWorkerListenersV4 = (): void => {
    worker.removeEventListener("message", onMessageV4);
    worker.removeEventListener("error", onTransportLossV4);
    worker.removeEventListener("messageerror", onTransportLossV4);
  };

  const rejectPendingForLossV4 = (readCode: "unavailable" | "disposed"): void => {
    for (const call of pending.values()) {
      call.reject(
        createProgramRepositoryFailureV3(
          call.mutation && call.delivered ? "outcome_unknown" : readCode,
          call.operation,
        ),
      );
    }
    pending.clear();
  };

  const terminateV4 = (readCode: "unavailable" | "disposed"): void => {
    if (lifecycle === "disposed") return;
    lifecycle = "disposed";
    removeWorkerListenersV4();
    rejectPendingForLossV4(readCode);
    worker.terminate();
  };

  function onTransportLossV4(): void {
    terminateV4("unavailable");
  }

  function onMessageV4(event: ProgramRepositoryWorkerMessageEventV4): void {
    const requestId = responseRequestIdV4(event.data);
    if (requestId === null) return;
    const call = pending.get(requestId);
    if (call === undefined) return;
    const response = admitProgramRepositoryWorkerResponseEnvelopeV6(event.data, call.method);
    if (response.kind === "rejected" || response.value.requestId !== requestId) {
      terminateV4("unavailable");
      return;
    }
    pending.delete(requestId);
    if (response.value.record.kind === "failure") {
      call.reject(
        createProgramRepositoryFailureV3(
          response.value.record.code,
          response.value.record.operation,
        ),
      );
      return;
    }
    call.resolve(response.value.record);
  }

  worker.addEventListener("message", onMessageV4);
  worker.addEventListener("error", onTransportLossV4);
  worker.addEventListener("messageerror", onTransportLossV4);

  const callV4 = (
    record: ProgramRepositoryWorkerRequestV6,
    allowDisposing = false,
  ): Promise<ProgramRepositoryWorkerSuccessV6> => {
    const operation = operationForProgramRepositoryWorkerMethodV6(record.method);
    if (lifecycle === "disposed" || (lifecycle === "disposing" && !allowDisposing)) {
      return Promise.reject(createProgramRepositoryFailureV3("disposed", operation));
    }
    const requestId = `program-repository.rpc.${String(nextRequestId++)}`;
    const candidate: ProgramRepositoryWorkerRequestEnvelopeV6 = {
      revision: 6,
      kind: "rpc_request",
      requestId,
      record,
    };
    const admitted = admitProgramRepositoryWorkerRequestEnvelopeV6(candidate);
    if (admitted.kind === "rejected") {
      return Promise.reject(
        new TypeError(`sillyos.program_repository.request.invalid${admitted.path}`),
      );
    }
    return new Promise((resolve, reject) => {
      const call: PendingCallV4 = {
        method: record.method,
        operation,
        mutation: isMutationMethodV4(record.method),
        delivered: false,
        resolve,
        reject,
      };
      pending.set(requestId, call);
      try {
        // Worker.postMessage has no targetOrigin parameter.
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
        worker.postMessage(admitted.value);
        call.delivered = true;
      } catch {
        pending.delete(requestId);
        reject(createProgramRepositoryFailureV3("unavailable", operation));
      }
    });
  };

  return {
    async initialize(): Promise<void> {
      const response = await callV4({ method: "initialize" });
      if (response.method !== "initialize") throw new TypeError("invalid initialize response");
    },

    async list() {
      const response = await callV4({ method: "list" });
      if (response.method !== "list") throw new TypeError("invalid list response");
      return response.value;
    },

    async load(programId) {
      const response = await callV4({ method: "load", programId });
      if (response.method !== "load") throw new TypeError("invalid load response");
      return response.value;
    },

    async loadWorkspaceContinuation(programId) {
      const response = await callV4({ method: "load_workspace_continuation", programId });
      if (response.method !== "load_workspace_continuation") {
        throw new TypeError("invalid workspace continuation load response");
      }
      return response.value;
    },

    async loadProgramNetworkAccess(programId) {
      const response = await callV4({ method: "load_program_network_access", programId });
      if (response.method !== "load_program_network_access") {
        throw new TypeError("invalid Program network access load response");
      }
      return response.value;
    },

    async setProgramNetworkAccess(input: ProgramNetworkAccessMutationV1) {
      const response = await callV4({ method: "set_program_network_access", input });
      if (response.method !== "set_program_network_access") {
        throw new TypeError("invalid Program network access mutation response");
      }
      return response.value;
    },

    async create(input: ProgramRepositoryCreateInputV3) {
      const response = await callV4({ method: "create", input });
      if (response.method !== "create") throw new TypeError("invalid create response");
      return response.value;
    },

    async applyRevision(input: ProgramRepositoryApplyRevisionInputV3) {
      const response = await callV4({ method: "apply_revision", input });
      if (response.method !== "apply_revision") throw new TypeError("invalid apply response");
      return response.value;
    },

    async settleAgentRun(input: ProgramRepositorySettleAgentRunInputV3) {
      const response = await callV4({ method: "settle_agent_run", input });
      if (response.method !== "settle_agent_run") {
        throw new TypeError("invalid Agent terminal response");
      }
      return response.value;
    },

    async decide(input: ProgramRepositoryDecideInputV3) {
      const response = await callV4({ method: "decide", input });
      if (response.method !== "decide") throw new TypeError("invalid decision response");
      return response.value;
    },

    async reset(): Promise<void> {
      const response = await callV4({ method: "reset" });
      if (response.method !== "reset") throw new TypeError("invalid reset response");
    },

    async dispose(): Promise<void> {
      if (lifecycle === "disposed") return;
      if (disposePromise !== null) return disposePromise;
      lifecycle = "disposing";
      disposePromise = (async () => {
        try {
          const response = await callV4({ method: "dispose" }, true);
          if (response.method !== "dispose") throw new TypeError("invalid dispose response");
        } finally {
          terminateV4("disposed");
        }
      })();
      return disposePromise;
    },
  };
}
