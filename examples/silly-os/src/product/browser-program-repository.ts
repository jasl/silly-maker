// SPDX-License-Identifier: MIT
/// <reference lib="dom" />

import {
  createProgramRepositoryFailureV1,
  type ProgramRepositoryApplyRevisionInputV1,
  type ProgramRepositoryCreateInputV1,
  type ProgramRepositoryDecideInputV1,
  type ProgramRepositoryOperationV1,
  type ProgramRepositoryV1,
} from "./program-repository.ts";
import {
  admitProgramRepositoryWorkerRequestEnvelopeV1,
  admitProgramRepositoryWorkerResponseEnvelopeV1,
  operationForProgramRepositoryWorkerMethodV1,
  type ProgramRepositoryWorkerMethodV1,
  type ProgramRepositoryWorkerRequestEnvelopeV1,
  type ProgramRepositoryWorkerRequestV1,
  type ProgramRepositoryWorkerSuccessV1,
} from "./program-repository-worker-protocol.ts";

interface ProgramRepositoryWorkerMessageEventV1 {
  readonly data: unknown;
}

export interface ProgramRepositoryWorkerLikeV1 {
  addEventListener(
    type: "message",
    listener: (event: ProgramRepositoryWorkerMessageEventV1) => void,
  ): void;
  addEventListener(type: "error" | "messageerror", listener: () => void): void;
  removeEventListener(
    type: "message",
    listener: (event: ProgramRepositoryWorkerMessageEventV1) => void,
  ): void;
  removeEventListener(type: "error" | "messageerror", listener: () => void): void;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface CreateBrowserProgramRepositoryOptionsV1 {
  readonly createWorker?: () => ProgramRepositoryWorkerLikeV1;
}

interface PendingCallV1 {
  readonly method: ProgramRepositoryWorkerMethodV1;
  readonly operation: ProgramRepositoryOperationV1;
  readonly mutation: boolean;
  delivered: boolean;
  readonly resolve: (record: ProgramRepositoryWorkerSuccessV1) => void;
  readonly reject: (error: unknown) => void;
}

function isMutationMethodV1(method: ProgramRepositoryWorkerMethodV1): boolean {
  return method === "create" || method === "apply_revision" || method === "decide";
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

function defaultProgramRepositoryWorkerV1(): ProgramRepositoryWorkerLikeV1 {
  return new Worker(new URL("./program-repository.worker.ts", import.meta.url), {
    type: "module",
    name: "sillyos-program-repository-v1",
  });
}

/** Page-side product facade. No IndexedDB handle crosses this boundary. */
export function createBrowserProgramRepositoryV1(
  options: CreateBrowserProgramRepositoryOptionsV1 = {},
): ProgramRepositoryV1 {
  const worker = options.createWorker?.() ?? defaultProgramRepositoryWorkerV1();
  const pending = new Map<string, PendingCallV1>();
  let nextRequestId = 1;
  let lifecycle: "active" | "disposing" | "disposed" = "active";
  let disposePromise: Promise<void> | null = null;

  const removeWorkerListenersV1 = (): void => {
    worker.removeEventListener("message", onMessageV1);
    worker.removeEventListener("error", onTransportLossV1);
    worker.removeEventListener("messageerror", onTransportLossV1);
  };

  const rejectPendingForLossV1 = (readCode: "unavailable" | "disposed"): void => {
    for (const call of pending.values()) {
      call.reject(
        createProgramRepositoryFailureV1(
          call.mutation && call.delivered ? "outcome_unknown" : readCode,
          call.operation,
        ),
      );
    }
    pending.clear();
  };

  const terminateV1 = (readCode: "unavailable" | "disposed"): void => {
    if (lifecycle === "disposed") return;
    lifecycle = "disposed";
    removeWorkerListenersV1();
    rejectPendingForLossV1(readCode);
    worker.terminate();
  };

  function onTransportLossV1(): void {
    terminateV1("unavailable");
  }

  function onMessageV1(event: ProgramRepositoryWorkerMessageEventV1): void {
    const requestId = responseRequestIdV1(event.data);
    if (requestId === null) return;
    const call = pending.get(requestId);
    if (call === undefined) return;
    const response = admitProgramRepositoryWorkerResponseEnvelopeV1(event.data, call.method);
    if (response.kind === "rejected" || response.value.requestId !== requestId) {
      terminateV1("unavailable");
      return;
    }
    pending.delete(requestId);
    if (response.value.record.kind === "failure") {
      call.reject(
        createProgramRepositoryFailureV1(
          response.value.record.code,
          response.value.record.operation,
        ),
      );
      return;
    }
    call.resolve(response.value.record);
  }

  worker.addEventListener("message", onMessageV1);
  worker.addEventListener("error", onTransportLossV1);
  worker.addEventListener("messageerror", onTransportLossV1);

  const callV1 = (
    record: ProgramRepositoryWorkerRequestV1,
    allowDisposing = false,
  ): Promise<ProgramRepositoryWorkerSuccessV1> => {
    const operation = operationForProgramRepositoryWorkerMethodV1(record.method);
    if (lifecycle === "disposed" || (lifecycle === "disposing" && !allowDisposing)) {
      return Promise.reject(createProgramRepositoryFailureV1("disposed", operation));
    }
    const requestId = `program-repository.rpc.${String(nextRequestId++)}`;
    const candidate: ProgramRepositoryWorkerRequestEnvelopeV1 = {
      revision: 1,
      kind: "rpc_request",
      requestId,
      record,
    };
    const admitted = admitProgramRepositoryWorkerRequestEnvelopeV1(candidate);
    if (admitted.kind === "rejected") {
      return Promise.reject(
        new TypeError(`sillyos.program_repository.request.invalid${admitted.path}`),
      );
    }
    return new Promise((resolve, reject) => {
      const call: PendingCallV1 = {
        method: record.method,
        operation,
        mutation: isMutationMethodV1(record.method),
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
        reject(createProgramRepositoryFailureV1("unavailable", operation));
      }
    });
  };

  return {
    async initialize(): Promise<void> {
      const response = await callV1({ method: "initialize" });
      if (response.method !== "initialize") throw new TypeError("invalid initialize response");
    },

    async list() {
      const response = await callV1({ method: "list" });
      if (response.method !== "list") throw new TypeError("invalid list response");
      return response.value;
    },

    async load(programId) {
      const response = await callV1({ method: "load", programId });
      if (response.method !== "load") throw new TypeError("invalid load response");
      return response.value;
    },

    async create(input: ProgramRepositoryCreateInputV1) {
      const response = await callV1({ method: "create", input });
      if (response.method !== "create") throw new TypeError("invalid create response");
      return response.value;
    },

    async applyRevision(input: ProgramRepositoryApplyRevisionInputV1) {
      const response = await callV1({ method: "apply_revision", input });
      if (response.method !== "apply_revision") throw new TypeError("invalid apply response");
      return response.value;
    },

    async decide(input: ProgramRepositoryDecideInputV1) {
      const response = await callV1({ method: "decide", input });
      if (response.method !== "decide") throw new TypeError("invalid decision response");
      return response.value;
    },

    async dispose(): Promise<void> {
      if (lifecycle === "disposed") return;
      if (disposePromise !== null) return disposePromise;
      lifecycle = "disposing";
      disposePromise = (async () => {
        try {
          const response = await callV1({ method: "dispose" }, true);
          if (response.method !== "dispose") throw new TypeError("invalid dispose response");
        } finally {
          terminateV1("disposed");
        }
      })();
      return disposePromise;
    },
  };
}
