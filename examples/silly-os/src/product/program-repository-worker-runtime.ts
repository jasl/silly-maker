// SPDX-License-Identifier: MIT

import {
  createProgramRepositoryFailureV1,
  isProgramRepositoryFailureV1,
  type ProgramRepositoryFailureCodeV1,
  type ProgramRepositoryV1,
} from "./program-repository.ts";
import {
  admitProgramRepositoryWorkerRequestEnvelopeV1,
  admitProgramRepositoryWorkerResponseEnvelopeV1,
  operationForProgramRepositoryWorkerMethodV1,
  type ProgramRepositoryWorkerMethodV1,
  type ProgramRepositoryWorkerResponseEnvelopeV1,
  type ProgramRepositoryWorkerSuccessV1,
} from "./program-repository-worker-protocol.ts";

export interface ProgramRepositoryWorkerRuntimeV1 {
  receive(message: unknown): void;
  dispose(): void;
}

function failureCodeForRuntimeErrorV1(error: unknown): ProgramRepositoryFailureCodeV1 {
  if (isProgramRepositoryFailureV1(error)) return error.code;
  if (error instanceof TypeError) return "wire_invalid";
  return "request_failed";
}

export function createProgramRepositoryWorkerRuntimeV1(input: {
  readonly repository: ProgramRepositoryV1;
  readonly postMessage: (message: ProgramRepositoryWorkerResponseEnvelopeV1) => void;
  readonly onFatalError?: (error: unknown) => void;
}): ProgramRepositoryWorkerRuntimeV1 {
  let disposed = false;
  let tail = Promise.resolve();

  const postV1 = (
    requestId: string,
    method: ProgramRepositoryWorkerMethodV1,
    record: ProgramRepositoryWorkerSuccessV1,
  ): void => {
    if (disposed) return;
    const response: ProgramRepositoryWorkerResponseEnvelopeV1 = {
      revision: 1,
      kind: "rpc_response",
      requestId,
      record,
    };
    const admitted = admitProgramRepositoryWorkerResponseEnvelopeV1(response, method);
    if (admitted.kind === "rejected") {
      throw createProgramRepositoryFailureV1(
        "wire_invalid",
        operationForProgramRepositoryWorkerMethodV1(method),
      );
    }
    // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
    input.postMessage(admitted.value);
  };

  const handleV1 = async (message: unknown): Promise<void> => {
    if (disposed) return;
    const admitted = admitProgramRepositoryWorkerRequestEnvelopeV1(message);
    if (admitted.kind === "rejected") return;
    const { requestId, record } = admitted.value;
    const { method } = record;
    let repositorySettled = false;
    try {
      if (method === "initialize") {
        await input.repository.initialize();
        repositorySettled = true;
        postV1(requestId, method, { kind: "success", method, value: null });
        return;
      }
      if (method === "list") {
        const value = await input.repository.list();
        repositorySettled = true;
        postV1(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "load") {
        const value = await input.repository.load(record.programId);
        repositorySettled = true;
        postV1(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "create") {
        const value = await input.repository.create(record.input);
        repositorySettled = true;
        postV1(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "apply_revision") {
        const value = await input.repository.applyRevision(record.input);
        repositorySettled = true;
        postV1(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "decide") {
        const value = await input.repository.decide(record.input);
        repositorySettled = true;
        postV1(requestId, method, { kind: "success", method, value });
        return;
      }
      await input.repository.dispose();
      repositorySettled = true;
      postV1(requestId, method, { kind: "success", method, value: null });
    } catch (error) {
      if (disposed) return;
      if (repositorySettled) throw error;
      const operation = operationForProgramRepositoryWorkerMethodV1(method);
      const response: ProgramRepositoryWorkerResponseEnvelopeV1 = {
        revision: 1,
        kind: "rpc_response",
        requestId,
        record: {
          kind: "failure",
          method,
          code: failureCodeForRuntimeErrorV1(error),
          operation,
        },
      };
      const responseAdmission = admitProgramRepositoryWorkerResponseEnvelopeV1(response, method);
      if (responseAdmission.kind === "admitted") {
        // Worker ports have no targetOrigin parameter.
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
        input.postMessage(responseAdmission.value);
      }
    }
  };

  return {
    receive(message): void {
      tail = tail.then(() => handleV1(message)).catch((error: unknown) => {
        if (disposed) return;
        disposed = true;
        void input.repository.dispose();
        if (input.onFatalError !== undefined) {
          input.onFatalError(error);
          return;
        }
        queueMicrotask(() => {
          throw error;
        });
      });
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      void input.repository.dispose();
    },
  };
}
