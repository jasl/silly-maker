// SPDX-License-Identifier: MIT

import {
  createProgramRepositoryFailureV3,
  isProgramRepositoryFailureV3,
  type ProgramRepositoryFailureCodeV3,
  type ProgramRepositoryWithWorkspaceContinuationV1,
} from "./program-repository.ts";
import {
  admitProgramRepositoryWorkerRequestEnvelopeV4,
  admitProgramRepositoryWorkerResponseEnvelopeV4,
  operationForProgramRepositoryWorkerMethodV4,
  type ProgramRepositoryWorkerMethodV4,
  type ProgramRepositoryWorkerResponseEnvelopeV4,
  type ProgramRepositoryWorkerSuccessV4,
} from "./program-repository-worker-protocol.ts";

export interface ProgramRepositoryWorkerRuntimeV4 {
  receive(message: unknown): void;
  dispose(): void;
}

function failureCodeForRuntimeErrorV4(error: unknown): ProgramRepositoryFailureCodeV3 {
  if (isProgramRepositoryFailureV3(error)) return error.code;
  if (error instanceof TypeError) return "wire_invalid";
  return "request_failed";
}

export function createProgramRepositoryWorkerRuntimeV4(input: {
  readonly repository: ProgramRepositoryWithWorkspaceContinuationV1;
  readonly postMessage: (message: ProgramRepositoryWorkerResponseEnvelopeV4) => void;
  readonly onFatalError?: (error: unknown) => void;
}): ProgramRepositoryWorkerRuntimeV4 {
  let disposed = false;
  let tail = Promise.resolve();

  const postV4 = (
    requestId: string,
    method: ProgramRepositoryWorkerMethodV4,
    record: ProgramRepositoryWorkerSuccessV4,
  ): void => {
    if (disposed) return;
    const response: ProgramRepositoryWorkerResponseEnvelopeV4 = {
      revision: 4,
      kind: "rpc_response",
      requestId,
      record,
    };
    const admitted = admitProgramRepositoryWorkerResponseEnvelopeV4(response, method);
    if (admitted.kind === "rejected") {
      throw createProgramRepositoryFailureV3(
        "wire_invalid",
        operationForProgramRepositoryWorkerMethodV4(method),
      );
    }
    // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
    input.postMessage(admitted.value);
  };

  const handleV4 = async (message: unknown): Promise<void> => {
    if (disposed) return;
    const admitted = admitProgramRepositoryWorkerRequestEnvelopeV4(message);
    if (admitted.kind === "rejected") return;
    const { requestId, record } = admitted.value;
    const { method } = record;
    let repositorySettled = false;
    try {
      if (method === "initialize") {
        await input.repository.initialize();
        repositorySettled = true;
        postV4(requestId, method, { kind: "success", method, value: null });
        return;
      }
      if (method === "list") {
        const value = await input.repository.list();
        repositorySettled = true;
        postV4(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "load") {
        const value = await input.repository.load(record.programId);
        repositorySettled = true;
        postV4(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "load_workspace_continuation") {
        const value = await input.repository.loadWorkspaceContinuation(record.programId);
        repositorySettled = true;
        postV4(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "create") {
        const value = await input.repository.create(record.input);
        repositorySettled = true;
        postV4(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "apply_revision") {
        const value = await input.repository.applyRevision(record.input);
        repositorySettled = true;
        postV4(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "settle_agent_run") {
        const value = await input.repository.settleAgentRun(record.input);
        repositorySettled = true;
        postV4(requestId, method, { kind: "success", method, value });
        return;
      }
      if (method === "decide") {
        const value = await input.repository.decide(record.input);
        repositorySettled = true;
        postV4(requestId, method, { kind: "success", method, value });
        return;
      }
      await input.repository.dispose();
      repositorySettled = true;
      postV4(requestId, method, { kind: "success", method, value: null });
    } catch (error) {
      if (disposed) return;
      if (repositorySettled) throw error;
      const operation = operationForProgramRepositoryWorkerMethodV4(method);
      const response: ProgramRepositoryWorkerResponseEnvelopeV4 = {
        revision: 4,
        kind: "rpc_response",
        requestId,
        record: {
          kind: "failure",
          method,
          code: failureCodeForRuntimeErrorV4(error),
          operation,
        },
      };
      const responseAdmission = admitProgramRepositoryWorkerResponseEnvelopeV4(response, method);
      if (responseAdmission.kind === "admitted") {
        // Worker ports have no targetOrigin parameter.
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
        input.postMessage(responseAdmission.value);
      }
    }
  };

  return {
    receive(message): void {
      tail = tail.then(() => handleV4(message)).catch((error: unknown) => {
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
