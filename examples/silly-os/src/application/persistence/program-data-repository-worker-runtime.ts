// SPDX-License-Identifier: MIT

import {
  isProgramDataRepositoryFailureV1,
  type ProgramDataRepositoryFailureCodeV1,
  type ProgramDataRepositoryOperationV1,
  type ProgramDataRepositoryV1,
} from "./program-data-repository.ts";
import {
  admitProgramDataRepositoryWorkerRequestEnvelopeV1,
  correlateProgramDataRepositoryWorkerRequestV1,
  operationForProgramDataRepositoryWorkerMethodV1,
  type ProgramDataRepositoryWorkerRequestV1,
  type ProgramDataRepositoryWorkerResponseEnvelopeV1,
  type ProgramDataRepositoryWorkerSuccessV1,
} from "./program-data-repository-worker-protocol.ts";

export interface ProgramDataRepositoryWorkerRuntimeV1 {
  receive(message: unknown): void;
  dispose(): Promise<void>;
}

function failureCodeForRuntimeErrorV1(
  error: unknown,
  operation: ProgramDataRepositoryOperationV1,
): ProgramDataRepositoryFailureCodeV1 {
  if (isProgramDataRepositoryFailureV1(error)) {
    if (
      error.operation === operation &&
      (error.code === "unavailable" || error.code === "database_newer" ||
        error.code === "upgrade_blocked" || error.code === "quota_exceeded" ||
        error.code === "transaction_aborted" || error.code === "request_failed" ||
        error.code === "schema_invalid" || error.code === "disposed" ||
        error.code === "wire_invalid" || error.code === "outcome_unknown" ||
        error.code === "page_budget_too_small")
    ) return error.code;
    return "wire_invalid";
  }
  if (error instanceof TypeError) return "wire_invalid";
  return "request_failed";
}

async function executeRequestV1(
  repository: ProgramDataRepositoryV1,
  request: ProgramDataRepositoryWorkerRequestV1,
  disposeRepository: () => Promise<void>,
): Promise<ProgramDataRepositoryWorkerSuccessV1> {
  const { method } = request;
  if (method === "initialize") {
    await repository.initialize();
    return { kind: "success", method, value: null };
  }
  if (method === "create_process_with_workspace") {
    return {
      kind: "success",
      method,
      value: await repository.createProcessWithWorkspace(request.input),
    };
  }
  if (method === "load_process_workspace_binding") {
    return {
      kind: "success",
      method,
      value: await repository.loadProcessWorkspaceBinding(request.processId),
    };
  }
  if (method === "load_process") {
    return { kind: "success", method, value: await repository.loadProcess(request.processId) };
  }
  if (method === "list_process_summaries") {
    return {
      kind: "success",
      method,
      value: await repository.listProcessSummaries(request.input),
    };
  }
  if (method === "list_recent_process_summaries") {
    return {
      kind: "success",
      method,
      value: await repository.listRecentProcessSummaries(request.input),
    };
  }
  if (method === "acquire_process_execution") {
    return {
      kind: "success",
      method,
      value: await repository.acquireProcessExecution(request.input),
    };
  }
  if (method === "renew_process_execution_lease") {
    return {
      kind: "success",
      method,
      value: await repository.renewProcessExecutionLease(request.input),
    };
  }
  if (method === "release_process_execution_lease") {
    return {
      kind: "success",
      method,
      value: await repository.releaseProcessExecutionLease(request.input),
    };
  }
  if (method === "load_process_execution_lease") {
    return {
      kind: "success",
      method,
      value: await repository.loadProcessExecutionLease(request.processId),
    };
  }
  if (method === "commit_process_execution_terminal") {
    return {
      kind: "success",
      method,
      value: await repository.commitProcessExecutionTerminal(request.input),
    };
  }
  if (method === "query_process_operation") {
    return {
      kind: "success",
      method,
      value: await repository.queryProcessOperation(request.input),
    };
  }
  if (method === "invoke_program_persistence_facet") {
    return {
      kind: "success",
      method,
      value: await repository.invokeProgramPersistenceFacet(request.input),
    };
  }
  if (method === "load_transcript_page") {
    return {
      kind: "success",
      method,
      value: await repository.loadTranscriptPage(request.input),
    };
  }
  if (method === "load_process_settings_override") {
    return {
      kind: "success",
      method,
      value: await repository.loadProcessSettingsOverride(request.processId),
    };
  }
  if (method === "set_process_settings_override") {
    return {
      kind: "success",
      method,
      value: await repository.setProcessSettingsOverride(request.input),
    };
  }
  if (method === "load_process_network_access") {
    return {
      kind: "success",
      method,
      value: await repository.loadProcessNetworkAccess(request.processId),
    };
  }
  if (method === "set_process_network_access") {
    return {
      kind: "success",
      method,
      value: await repository.setProcessNetworkAccess(request.input),
    };
  }
  if (method === "reset") {
    await repository.reset();
    return { kind: "success", method, value: null };
  }
  await disposeRepository();
  return { kind: "success", method, value: null };
}

export function createProgramDataRepositoryWorkerRuntimeV1(input: {
  readonly repository: ProgramDataRepositoryV1;
  readonly postMessage: (message: ProgramDataRepositoryWorkerResponseEnvelopeV1) => void;
  readonly onFatalError?: (error: unknown) => void;
}): ProgramDataRepositoryWorkerRuntimeV1 {
  let accepting = true;
  let tail: Promise<void> = Promise.resolve();
  let repositoryDisposePromise: Promise<void> | null = null;
  let runtimeDisposePromise: Promise<void> | null = null;
  let fatalSignaled = false;

  const disposeRepositoryV1 = (): Promise<void> => {
    if (repositoryDisposePromise === null) {
      repositoryDisposePromise = input.repository.dispose();
    }
    return repositoryDisposePromise;
  };

  const postV1 = (
    requestId: string,
    record: ProgramDataRepositoryWorkerResponseEnvelopeV1["record"],
  ): void => {
    const response: ProgramDataRepositoryWorkerResponseEnvelopeV1 = {
      revision: 1,
      kind: "rpc_response",
      requestId,
      record,
    };
    // The repository/storage boundary owns domain admission. This Worker is the
    // response sender, while the page is the untrusted wire receiver and binds
    // the response to compact request identity/revision/cursor expectations.
    // DedicatedWorkerGlobalScope.postMessage has no targetOrigin parameter.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker has no targetOrigin
    input.postMessage(response);
  };

  const handleV1 = async (message: unknown): Promise<void> => {
    const admitted = admitProgramDataRepositoryWorkerRequestEnvelopeV1(message);
    if (admitted.kind === "rejected") {
      const correlation = correlateProgramDataRepositoryWorkerRequestV1(message);
      if (correlation === null) {
        throw new TypeError("uncorrelatable Program Data Repository Worker request");
      }
      postV1(correlation.requestId, {
        kind: "failure",
        method: correlation.method,
        code: "wire_invalid",
        operation: operationForProgramDataRepositoryWorkerMethodV1(correlation.method),
      });
      return;
    }
    const { requestId, record } = admitted.value;
    const operation = operationForProgramDataRepositoryWorkerMethodV1(record.method);
    let repositorySettled = false;
    try {
      const result = await executeRequestV1(input.repository, record, disposeRepositoryV1);
      repositorySettled = true;
      postV1(requestId, result);
      if (record.method === "dispose") accepting = false;
    } catch (error) {
      if (repositorySettled) throw error;
      postV1(requestId, {
        kind: "failure",
        method: record.method,
        code: failureCodeForRuntimeErrorV1(error, operation),
        operation,
      });
      if (record.method === "dispose") accepting = false;
    }
  };

  const handleFatalV1 = (error: unknown): void => {
    if (fatalSignaled || !accepting && runtimeDisposePromise !== null) return;
    fatalSignaled = true;
    accepting = false;
    if (input.onFatalError !== undefined) {
      input.onFatalError(error);
    } else {
      queueMicrotask(() => {
        throw error;
      });
    }
    void disposeRepositoryV1().catch(() => undefined);
  };

  return {
    receive(message): void {
      if (!accepting) return;
      tail = tail.then(() => handleV1(message));
      void tail.catch(handleFatalV1);
    },
    dispose(): Promise<void> {
      if (runtimeDisposePromise !== null) return runtimeDisposePromise;
      accepting = false;
      const queued = tail;
      runtimeDisposePromise = (async () => {
        await queued.catch(() => undefined);
        await disposeRepositoryV1();
      })();
      return runtimeDisposePromise;
    },
  };
}
