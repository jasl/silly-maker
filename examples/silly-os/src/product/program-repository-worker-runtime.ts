// SPDX-License-Identifier: MIT

import {
  createProgramRepositoryFailureV2,
  isProgramRepositoryFailureV2,
  type ProgramRepositoryFailureCodeV2,
  type ProgramRepositoryV2,
} from "./program-repository.ts";
import {
  admitProgramRepositoryWorkerRequestEnvelopeV2,
  admitProgramRepositoryWorkerResponseEnvelopeV2,
  operationForProgramRepositoryWorkerMethodV2,
  type ProgramRepositoryWorkerMethodV2,
  type ProgramRepositoryWorkerResponseEnvelopeV2,
  type ProgramRepositoryWorkerSuccessV2,
} from "./program-repository-worker-protocol.ts";

export interface ProgramRepositoryWorkerRuntimeV2 {
  receive(message: unknown): void;
  dispose(): void;
}

function failureCodeForRuntimeErrorV2(error: unknown): ProgramRepositoryFailureCodeV2 {
  if (isProgramRepositoryFailureV2(error)) return error.code;
  if (error instanceof TypeError) return "wire_invalid";
  return "request_failed";
}

export function createProgramRepositoryWorkerRuntimeV2(input: {
  readonly repository: ProgramRepositoryV2;
  readonly postMessage: (message: ProgramRepositoryWorkerResponseEnvelopeV2) => void;
  readonly onFatalError?: (error: unknown) => void;
}): ProgramRepositoryWorkerRuntimeV2 {
  let disposed = false;
  let tail = Promise.resolve();

  const postV2 = (
    requestId: string,
    method: ProgramRepositoryWorkerMethodV2,
    record: ProgramRepositoryWorkerSuccessV2,
  ): void => {
    if (disposed) return;
    const response: ProgramRepositoryWorkerResponseEnvelopeV2 = {
      revision: 2,
      kind: "rpc_response",
      requestId,
      record,
    };
    const admitted = admitProgramRepositoryWorkerResponseEnvelopeV2(response, method);
    if (admitted.kind === "rejected") {
      throw createProgramRepositoryFailureV2(
        "wire_invalid",
        operationForProgramRepositoryWorkerMethodV2(method),
      );
    }
    // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
    input.postMessage(admitted.value);
  };

  const handleV2 = async (message: unknown): Promise<void> => {
    if (disposed) return;
    const admitted = admitProgramRepositoryWorkerRequestEnvelopeV2(message);
    if (admitted.kind === "rejected") return;
    const { requestId, record } = admitted.value;
    const { method } = record;
    let repositorySettled = false;
    try {
      if (method === "initialize") {
        await input.repository.initialize();
        repositorySettled = true;
        postV2(requestId, method, { kind: "success", method, value: null });
        return;
      }
      if (method === "list") {
        const value = await input.repository.list();
        repositorySettled = true;
        postV2(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "load") {
        const value = await input.repository.load(record.programId);
        repositorySettled = true;
        postV2(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "create") {
        const value = await input.repository.create(record.input);
        repositorySettled = true;
        postV2(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "apply_revision") {
        const value = await input.repository.applyRevision(record.input);
        repositorySettled = true;
        postV2(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "settle_agent_run") {
        const value = await input.repository.settleAgentRun(record.input);
        repositorySettled = true;
        postV2(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "decide") {
        const value = await input.repository.decide(record.input);
        repositorySettled = true;
        postV2(requestId, method, { kind: "success", method, value });
        return;
      }
      await input.repository.dispose();
      repositorySettled = true;
      postV2(requestId, method, { kind: "success", method, value: null });
    } catch (error) {
      if (disposed) return;
      if (repositorySettled) throw error;
      const operation = operationForProgramRepositoryWorkerMethodV2(method);
      const response: ProgramRepositoryWorkerResponseEnvelopeV2 = {
        revision: 2,
        kind: "rpc_response",
        requestId,
        record: {
          kind: "failure",
          method,
          code: failureCodeForRuntimeErrorV2(error),
          operation,
        },
      };
      const responseAdmission = admitProgramRepositoryWorkerResponseEnvelopeV2(response, method);
      if (responseAdmission.kind === "admitted") {
        // Worker ports have no targetOrigin parameter.
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
        input.postMessage(responseAdmission.value);
      }
    }
  };

  return {
    receive(message): void {
      tail = tail.then(() => handleV2(message)).catch((error: unknown) => {
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
