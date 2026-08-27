// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  createProgramRepositoryFailureV2,
  type ProgramRepositoryApplyRevisionInputV2,
  type ProgramRepositoryCreateInputV2,
  type ProgramRepositoryDecideInputV2,
  type ProgramRepositoryOperationV2,
  type ProgramRepositorySettleAgentRunInputV2,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "./program-repository.ts";
import {
  admitProgramRepositoryWorkerRequestEnvelopeV3,
  admitProgramRepositoryWorkerResponseEnvelopeV3,
  operationForProgramRepositoryWorkerMethodV3,
  type ProgramRepositoryWorkerMethodV3,
  type ProgramRepositoryWorkerRequestEnvelopeV3,
  type ProgramRepositoryWorkerRequestV3,
  type ProgramRepositoryWorkerSuccessV3,
} from "./program-repository-worker-protocol.ts";

interface ProgramRepositoryWorkerMessageEventV3 {
  readonly data: unknown;
}

export interface ProgramRepositoryWorkerLikeV3 {
  addEventListener(
    type: "message",
    listener: (event: ProgramRepositoryWorkerMessageEventV3) => void,
  ): void;
  addEventListener(type: "error" | "messageerror", listener: () => void): void;
  removeEventListener(
    type: "message",
    listener: (event: ProgramRepositoryWorkerMessageEventV3) => void,
  ): void;
  removeEventListener(type: "error" | "messageerror", listener: () => void): void;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface CreateBrowserProgramRepositoryOptionsV2 {
  readonly createWorker?: () => ProgramRepositoryWorkerLikeV3;
}

interface PendingCallV3 {
  readonly method: ProgramRepositoryWorkerMethodV3;
  readonly operation: ProgramRepositoryOperationV2;
  readonly mutation: boolean;
  delivered: boolean;
  readonly resolve: (record: ProgramRepositoryWorkerSuccessV3) => void;
  readonly reject: (error: unknown) => void;
}

function isMutationMethodV3(method: ProgramRepositoryWorkerMethodV3): boolean {
  return method === "create" || method === "apply_revision" ||
    method === "settle_agent_run" || method === "decide" ||
    method === "insert_workspace_continuation";
}

function responseRequestIdV2(value: unknown): string | null {
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

function defaultProgramRepositoryWorkerV3(): ProgramRepositoryWorkerLikeV3 {
  return new Worker(new URL("./program-repository.worker.ts", import.meta.url), {
    type: "module",
    name: "sillyos-program-repository-v3",
  });
}

/** Page-side product facade. No IndexedDB handle crosses this boundary. */
export function createBrowserProgramRepositoryV2(
  options: CreateBrowserProgramRepositoryOptionsV2 = {},
): ProgramRepositoryWithWorkspaceContinuationV1 {
  const worker = options.createWorker?.() ?? defaultProgramRepositoryWorkerV3();
  const pending = new Map<string, PendingCallV3>();
  let nextRequestId = 1;
  let lifecycle: "active" | "disposing" | "disposed" = "active";
  let disposePromise: Promise<void> | null = null;

  const removeWorkerListenersV2 = (): void => {
    worker.removeEventListener("message", onMessageV2);
    worker.removeEventListener("error", onTransportLossV2);
    worker.removeEventListener("messageerror", onTransportLossV2);
  };

  const rejectPendingForLossV2 = (readCode: "unavailable" | "disposed"): void => {
    for (const call of pending.values()) {
      call.reject(
        createProgramRepositoryFailureV2(
          call.mutation && call.delivered ? "outcome_unknown" : readCode,
          call.operation,
        ),
      );
    }
    pending.clear();
  };

  const terminateV2 = (readCode: "unavailable" | "disposed"): void => {
    if (lifecycle === "disposed") return;
    lifecycle = "disposed";
    removeWorkerListenersV2();
    rejectPendingForLossV2(readCode);
    worker.terminate();
  };

  function onTransportLossV2(): void {
    terminateV2("unavailable");
  }

  function onMessageV2(event: ProgramRepositoryWorkerMessageEventV3): void {
    const requestId = responseRequestIdV2(event.data);
    if (requestId === null) return;
    const call = pending.get(requestId);
    if (call === undefined) return;
    const response = admitProgramRepositoryWorkerResponseEnvelopeV3(event.data, call.method);
    if (response.kind === "rejected" || response.value.requestId !== requestId) {
      terminateV2("unavailable");
      return;
    }
    pending.delete(requestId);
    if (response.value.record.kind === "failure") {
      call.reject(
        createProgramRepositoryFailureV2(
          response.value.record.code,
          response.value.record.operation,
        ),
      );
      return;
    }
    call.resolve(response.value.record);
  }

  worker.addEventListener("message", onMessageV2);
  worker.addEventListener("error", onTransportLossV2);
  worker.addEventListener("messageerror", onTransportLossV2);

  const callV2 = (
    record: ProgramRepositoryWorkerRequestV3,
    allowDisposing = false,
  ): Promise<ProgramRepositoryWorkerSuccessV3> => {
    const operation = operationForProgramRepositoryWorkerMethodV3(record.method);
    if (lifecycle === "disposed" || (lifecycle === "disposing" && !allowDisposing)) {
      return Promise.reject(createProgramRepositoryFailureV2("disposed", operation));
    }
    const requestId = `program-repository.rpc.${String(nextRequestId++)}`;
    const candidate: ProgramRepositoryWorkerRequestEnvelopeV3 = {
      revision: 3,
      kind: "rpc_request",
      requestId,
      record,
    };
    const admitted = admitProgramRepositoryWorkerRequestEnvelopeV3(candidate);
    if (admitted.kind === "rejected") {
      return Promise.reject(
        new TypeError(`sillyos.program_repository.request.invalid${admitted.path}`),
      );
    }
    return new Promise((resolve, reject) => {
      const call: PendingCallV3 = {
        method: record.method,
        operation,
        mutation: isMutationMethodV3(record.method),
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
        reject(createProgramRepositoryFailureV2("unavailable", operation));
      }
    });
  };

  return {
    async initialize(): Promise<void> {
      const response = await callV2({ method: "initialize" });
      if (response.method !== "initialize") throw new TypeError("invalid initialize response");
    },

    async list() {
      const response = await callV2({ method: "list" });
      if (response.method !== "list") throw new TypeError("invalid list response");
      return response.value;
    },

    async load(programId) {
      const response = await callV2({ method: "load", programId });
      if (response.method !== "load") throw new TypeError("invalid load response");
      return response.value;
    },

    async loadWorkspaceContinuation(programId) {
      const response = await callV2({ method: "load_workspace_continuation", programId });
      if (response.method !== "load_workspace_continuation") {
        throw new TypeError("invalid workspace continuation load response");
      }
      return response.value;
    },

    async create(input: ProgramRepositoryCreateInputV2) {
      const response = await callV2({ method: "create", input });
      if (response.method !== "create") throw new TypeError("invalid create response");
      return response.value;
    },

    async applyRevision(input: ProgramRepositoryApplyRevisionInputV2) {
      const response = await callV2({ method: "apply_revision", input });
      if (response.method !== "apply_revision") throw new TypeError("invalid apply response");
      return response.value;
    },

    async settleAgentRun(input: ProgramRepositorySettleAgentRunInputV2) {
      const response = await callV2({ method: "settle_agent_run", input });
      if (response.method !== "settle_agent_run") {
        throw new TypeError("invalid Agent terminal response");
      }
      return response.value;
    },

    async decide(input: ProgramRepositoryDecideInputV2) {
      const response = await callV2({ method: "decide", input });
      if (response.method !== "decide") throw new TypeError("invalid decision response");
      return response.value;
    },

    async insertWorkspaceContinuation(continuation) {
      const response = await callV2({
        method: "insert_workspace_continuation",
        continuation,
      });
      if (response.method !== "insert_workspace_continuation") {
        throw new TypeError("invalid workspace continuation insert response");
      }
      return response.value;
    },

    async dispose(): Promise<void> {
      if (lifecycle === "disposed") return;
      if (disposePromise !== null) return disposePromise;
      lifecycle = "disposing";
      disposePromise = (async () => {
        try {
          const response = await callV2({ method: "dispose" }, true);
          if (response.method !== "dispose") throw new TypeError("invalid dispose response");
        } finally {
          terminateV2("disposed");
        }
      })();
      return disposePromise;
    },
  };
}
