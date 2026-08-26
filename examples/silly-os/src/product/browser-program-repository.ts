// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  createProgramRepositoryFailureV2,
  type ProgramRepositoryApplyRevisionInputV2,
  type ProgramRepositoryCreateInputV2,
  type ProgramRepositoryDecideInputV2,
  type ProgramRepositoryOperationV2,
  type ProgramRepositorySettleAgentRunInputV2,
  type ProgramRepositoryV2,
} from "./program-repository.ts";
import {
  admitProgramRepositoryWorkerRequestEnvelopeV2,
  admitProgramRepositoryWorkerResponseEnvelopeV2,
  operationForProgramRepositoryWorkerMethodV2,
  type ProgramRepositoryWorkerMethodV2,
  type ProgramRepositoryWorkerRequestEnvelopeV2,
  type ProgramRepositoryWorkerRequestV2,
  type ProgramRepositoryWorkerSuccessV2,
} from "./program-repository-worker-protocol.ts";

interface ProgramRepositoryWorkerMessageEventV2 {
  readonly data: unknown;
}

export interface ProgramRepositoryWorkerLikeV2 {
  addEventListener(
    type: "message",
    listener: (event: ProgramRepositoryWorkerMessageEventV2) => void,
  ): void;
  addEventListener(type: "error" | "messageerror", listener: () => void): void;
  removeEventListener(
    type: "message",
    listener: (event: ProgramRepositoryWorkerMessageEventV2) => void,
  ): void;
  removeEventListener(type: "error" | "messageerror", listener: () => void): void;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface CreateBrowserProgramRepositoryOptionsV2 {
  readonly createWorker?: () => ProgramRepositoryWorkerLikeV2;
}

interface PendingCallV2 {
  readonly method: ProgramRepositoryWorkerMethodV2;
  readonly operation: ProgramRepositoryOperationV2;
  readonly mutation: boolean;
  delivered: boolean;
  readonly resolve: (record: ProgramRepositoryWorkerSuccessV2) => void;
  readonly reject: (error: unknown) => void;
}

function isMutationMethodV2(method: ProgramRepositoryWorkerMethodV2): boolean {
  return method === "create" || method === "apply_revision" ||
    method === "settle_agent_run" || method === "decide";
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

function defaultProgramRepositoryWorkerV2(): ProgramRepositoryWorkerLikeV2 {
  return new Worker(new URL("./program-repository.worker.ts", import.meta.url), {
    type: "module",
    name: "sillyos-program-repository-v2",
  });
}

/** Page-side product facade. No IndexedDB handle crosses this boundary. */
export function createBrowserProgramRepositoryV2(
  options: CreateBrowserProgramRepositoryOptionsV2 = {},
): ProgramRepositoryV2 {
  const worker = options.createWorker?.() ?? defaultProgramRepositoryWorkerV2();
  const pending = new Map<string, PendingCallV2>();
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

  function onMessageV2(event: ProgramRepositoryWorkerMessageEventV2): void {
    const requestId = responseRequestIdV2(event.data);
    if (requestId === null) return;
    const call = pending.get(requestId);
    if (call === undefined) return;
    const response = admitProgramRepositoryWorkerResponseEnvelopeV2(event.data, call.method);
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
    record: ProgramRepositoryWorkerRequestV2,
    allowDisposing = false,
  ): Promise<ProgramRepositoryWorkerSuccessV2> => {
    const operation = operationForProgramRepositoryWorkerMethodV2(record.method);
    if (lifecycle === "disposed" || (lifecycle === "disposing" && !allowDisposing)) {
      return Promise.reject(createProgramRepositoryFailureV2("disposed", operation));
    }
    const requestId = `program-repository.rpc.${String(nextRequestId++)}`;
    const candidate: ProgramRepositoryWorkerRequestEnvelopeV2 = {
      revision: 2,
      kind: "rpc_request",
      requestId,
      record,
    };
    const admitted = admitProgramRepositoryWorkerRequestEnvelopeV2(candidate);
    if (admitted.kind === "rejected") {
      return Promise.reject(
        new TypeError(`sillyos.program_repository.request.invalid${admitted.path}`),
      );
    }
    return new Promise((resolve, reject) => {
      const call: PendingCallV2 = {
        method: record.method,
        operation,
        mutation: isMutationMethodV2(record.method),
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
