// SPDX-License-Identifier: MIT

import { createReadTool, createWriteTool } from "./pi-workspace-runtime-bridge.js";

import {
  admitCreatorAgentSubmitTextV1,
  admitCreatorProgramRevisionCandidateV1,
} from "../product/creator-agent-admission.ts";
import {
  creatorAgentFinalReplyMaximumCharactersV1,
  type CreatorAgentSubmitV1,
  type CreatorProgramRevisionCandidateV1,
} from "../product/contracts.ts";
import {
  createDisposableWorkspaceRuntimeV1,
  type DisposableWorkspaceRuntimeV1,
  type WorkspaceAgentRunV1,
  type WorkspaceExecutionDescriptorV1,
  type WorkspaceMutationRecordV1,
} from "../workspace/index.ts";
import { browserPiDistributionIdentityV1 } from "./browser-pi-distribution.ts";
import { createOpenAiPiAgentV1 } from "./browser-pi-openai-runtime-bridge.js";
import { createDeterministicPiAgentV1 } from "./browser-pi-runtime-bridge.js";
import {
  admitBrowserPiEngineRequestV1,
  admitBrowserPiWorkerInboundMessageV1,
  type BrowserPiWorkerAnyOutboundMessageV1,
  type BrowserPiWorkerExecutionBindingV1,
  type BrowserPiWorkerRuntimeV1,
  type BrowserPiWorkspaceFailureCodeV1,
  type BrowserPiWorkspaceMutationReceiptWireV1,
  type BrowserPiWorkspaceSnapshotWireV1,
} from "./browser-pi-worker-protocol.ts";
import {
  bindPiWorkspaceReadToolV1,
  bindPiWorkspaceWriteToolV1,
} from "./pi-workspace-tool-binder.ts";

type RunFailureCodeV1 =
  | "cancelled"
  | "replaced"
  | "draft_limit"
  | "candidate_missing"
  | "candidate_invalid"
  | "candidate_context_mismatch"
  | "candidate_duplicate"
  | "pi_failed";

interface ActivePiRunV1 {
  readonly sessionId: string;
  readonly runId: string;
  readonly agent: PiAgentPortV1;
  readonly workspaceRun: WorkspaceAgentRunV1;
  readonly workspaceSessionId: string;
  readonly admittedWorkspaceGeneration: number;
  sequence: number;
  draft: string;
  candidate: CreatorProgramRevisionCandidateV1 | null;
  candidateFailure:
    | "candidate_invalid"
    | "candidate_context_mismatch"
    | "candidate_duplicate"
    | null;
  requestedFailure: RunFailureCodeV1 | null;
  terminal: boolean;
  settlement: Promise<void> | null;
}

interface PiAgentPortV1 {
  prompt(text: string): Promise<{ readonly stopReason: "stop" | "error" | "aborted" }>;
  abort(): void;
  dispose(): void;
}

export interface BrowserPiWorkerRuntimePortV1 {
  receive(message: unknown): void;
  dispose(): void;
}

export function createBrowserPiWorkerRuntimeV1(input: {
  readonly postMessage: (message: BrowserPiWorkerAnyOutboundMessageV1) => void;
}): BrowserPiWorkerRuntimePortV1 {
  let credentialKey: string | null = null;
  let configuredRuntime: BrowserPiWorkerRuntimeV1 | null = null;
  let initialized = false;
  let disposed = false;
  let nextSessionId = 1;
  let nextRunId = 1;
  let nextWorkspaceSessionId = 1;
  let activeSessionId: string | null = null;
  let activeRun: ActivePiRunV1 | null = null;
  let operationQueue = Promise.resolve();
  const emittedWorkspaceReceipts = new Set<string>();
  const workspaceRuntime: DisposableWorkspaceRuntimeV1 = createDisposableWorkspaceRuntimeV1({
    createWorkspaceSessionId: () => `sillyos.workspace.session.${String(nextWorkspaceSessionId++)}`,
    onMutationRecord: (record) => {
      queueMicrotask(() => {
        if (disposed) return;
        const key = `${record.workspaceSessionId}\u0000${String(record.sequence)}`;
        if (emittedWorkspaceReceipts.has(key)) return;
        emittedWorkspaceReceipts.add(key);
        post(Object.freeze({
          revision: 1,
          kind: "workspace_receipt",
          receipt: mutationReceiptWireV1(record),
        }));
      });
    },
  });

  const post = (message: BrowserPiWorkerAnyOutboundMessageV1): void => {
    // This is a Worker-port callback, not Window.postMessage.
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- Worker port has no targetOrigin
    if (!disposed) input.postMessage(message);
  };

  const enqueue = (operation: () => Promise<void> | void): void => {
    operationQueue = operationQueue.then(operation, operation).catch(() => undefined);
  };

  const postProtocolFailure = (
    code: "invalid_message" | "already_initialized" | "distribution_mismatch",
  ): void => {
    post(Object.freeze({ revision: 1, kind: "protocol_failure", code }));
  };

  const respondRpcFailure = (
    requestId: number,
    code: "not_initialized" | "invalid_request" | "session_mismatch",
  ): void => {
    post(Object.freeze({ revision: 1, kind: "rpc_response", requestId, ok: false, code }));
  };

  const respondWorkspaceFailure = (
    requestId: number,
    code: BrowserPiWorkspaceFailureCodeV1,
  ): void => {
    post(Object.freeze({ revision: 1, kind: "workspace_response", requestId, ok: false, code }));
  };

  const emitRecord = (
    run: ActivePiRunV1,
    record: Readonly<Record<string, unknown>>,
  ): void => {
    if (run.terminal) return;
    run.sequence += 1;
    post(Object.freeze({
      revision: 1,
      kind: "rpc_record",
      record: Object.freeze({
        ...record,
        sessionId: run.sessionId,
        runId: run.runId,
        sequence: run.sequence,
      }),
    }));
  };

  const mutationReceiptWireV1 = (
    record: WorkspaceMutationRecordV1,
  ): BrowserPiWorkspaceMutationReceiptWireV1 =>
    Object.freeze({
      revision: 1,
      sequence: record.sequence,
      programId: record.programId,
      workspaceId: record.workspaceId,
      workspaceSessionId: record.workspaceSessionId,
      sessionId: record.piSessionId,
      runId: record.piRunId,
      toolCallId: record.toolCallId,
      tool: "write",
      expectedGeneration: record.expectedGeneration,
      baseGeneration: record.baseGeneration,
      resultingGeneration: record.resultingGeneration,
      outcome: record.outcome,
      effect: record.effect,
      changedPaths: Object.freeze([...record.changedPaths]),
      diagnosticCode: record.diagnosticCode,
    });

  const workspaceSnapshotV1 = (
    descriptor: WorkspaceExecutionDescriptorV1,
    phase: "open" | "closed",
  ): BrowserPiWorkspaceSnapshotWireV1 =>
    Object.freeze({
      revision: 1,
      phase,
      programId: descriptor.programId,
      workspaceId: descriptor.workspaceId,
      workspaceSessionId: descriptor.workspaceSessionId,
      generation: descriptor.generation,
      receipts: Object.freeze(
        workspaceRuntime.queryMutationRecords(descriptor.workspaceSessionId).map(
          mutationReceiptWireV1,
        ),
      ),
    });

  const flushWorkspaceReceipts = (run: ActivePiRunV1): void => {
    const records = workspaceRuntime.queryMutationRecords(run.workspaceSessionId);
    for (const record of records) {
      if (record.piSessionId !== run.sessionId || record.piRunId !== run.runId) continue;
      const key = `${record.workspaceSessionId}\u0000${String(record.sequence)}`;
      if (emittedWorkspaceReceipts.has(key)) continue;
      emittedWorkspaceReceipts.add(key);
      post(Object.freeze({
        revision: 1,
        kind: "workspace_receipt",
        receipt: mutationReceiptWireV1(record),
      }));
    }
  };

  const settleRun = async (
    run: ActivePiRunV1,
    submitText: string,
  ): Promise<void> => {
    let outcome: Awaited<ReturnType<PiAgentPortV1["prompt"]>> | null = null;
    let promptFailed = false;
    try {
      outcome = await run.agent.prompt(submitText);
    } catch {
      promptFailed = true;
    }

    await run.workspaceRun.abortAndDrain();
    flushWorkspaceReceipts(run);
    let failure = run.requestedFailure;
    if (failure === null && run.candidateFailure !== null) failure = run.candidateFailure;
    if (failure === null && (promptFailed || outcome?.stopReason === "error")) {
      failure = "pi_failed";
    }
    if (failure === null && outcome?.stopReason === "aborted") failure = "cancelled";
    if (failure === null && run.candidate === null) failure = "candidate_missing";

    if (failure !== null) {
      emitRecord(run, { kind: "run_failed", code: failure });
    } else {
      emitRecord(run, { kind: "artifact_complete", candidate: run.candidate });
      emitRecord(run, { kind: "run_completed" });
    }
    run.terminal = true;
    run.workspaceRun.finish();
    run.agent.dispose();
    if (activeRun === run) activeRun = null;
  };

  const requestRunFailure = (
    run: ActivePiRunV1,
    code: RunFailureCodeV1,
  ): Promise<void> => {
    if (!run.terminal && run.requestedFailure === null) {
      run.requestedFailure = code;
      run.agent.abort();
      void run.workspaceRun.abortAndDrain();
    }
    return run.settlement ?? Promise.resolve();
  };

  const createRun = (
    submit: CreatorAgentSubmitV1,
    execution: BrowserPiWorkerExecutionBindingV1,
    sessionId: string,
    runId: string,
  ): ActivePiRunV1 | null => {
    const runtime = configuredRuntime;
    const apiKey = credentialKey;
    if (runtime === null || apiKey === null) return null;
    const begun = workspaceRuntime.beginAgentRun({
      binding: execution,
      piSessionId: sessionId,
      piRunId: runId,
    });
    if (begun.kind !== "started") return null;
    const workspaceRun = begun.run;
    const workspaceTools = [
      bindPiWorkspaceReadToolV1(createReadTool(), workspaceRun),
      bindPiWorkspaceWriteToolV1(createWriteTool(), workspaceRun),
    ];
    let run!: ActivePiRunV1;
    const agentInput = {
      submit,
      workspaceTools,
      onCandidate(value: unknown): void {
        if (activeRun !== run || run.terminal || run.requestedFailure !== null) {
          throw new Error("Creator run was cancelled");
        }
        if (run.candidate !== null) {
          run.candidateFailure = "candidate_duplicate";
          throw new Error("Only one Program revision candidate is allowed");
        }
        const admitted = admitCreatorProgramRevisionCandidateV1(value);
        if (admitted.kind === "rejected") {
          run.candidateFailure = "candidate_invalid";
          throw new TypeError(`Invalid Program revision candidate${admitted.path}`);
        }
        if (
          admitted.value.revision !== submit.revision ||
          admitted.value.proposalId !== submit.proposalId ||
          admitted.value.programId !== submit.programId ||
          admitted.value.baseProgramRevision !== submit.baseProgramRevision ||
          admitted.value.text !== submit.text
        ) {
          run.candidateFailure = "candidate_context_mismatch";
          throw new TypeError(
            "Program revision candidate does not match the admitted submit context",
          );
        }
        run.candidate = Object.freeze(admitted.value);
      },
      onTextDelta(delta: string): void {
        if (
          activeRun !== run || run.terminal || run.requestedFailure !== null || delta.length === 0
        ) return;
        if (run.draft.length + delta.length > creatorAgentFinalReplyMaximumCharactersV1) {
          void requestRunFailure(run, "draft_limit");
          return;
        }
        run.draft += delta;
        emitRecord(run, { kind: "artifact_chunk", text: delta });
      },
    };
    let agent: PiAgentPortV1;
    try {
      const runNumber = Number(runId.slice(runId.lastIndexOf(".") + 1));
      agent = (runtime === "deterministic_test"
        ? createDeterministicPiAgentV1({ ...agentInput, runNumber })
        : createOpenAiPiAgentV1({ ...agentInput, apiKey })) as PiAgentPortV1;
    } catch {
      workspaceRun.finish();
      return null;
    }
    run = {
      sessionId,
      runId,
      agent,
      workspaceRun,
      workspaceSessionId: execution.workspaceSessionId,
      admittedWorkspaceGeneration: execution.expectedGeneration,
      sequence: 0,
      draft: "",
      candidate: null,
      candidateFailure: null,
      requestedFailure: null,
      terminal: false,
      settlement: null,
    };
    return run;
  };

  type SubmitRequestV1 = Extract<
    NonNullable<ReturnType<typeof admitBrowserPiEngineRequestV1>>,
    { method: "submit" }
  >;

  const handleSubmit = async (
    requestId: number,
    request: SubmitRequestV1,
    execution: BrowserPiWorkerExecutionBindingV1,
  ): Promise<void> => {
    if (disposed) return;
    if (activeSessionId === null || request.params.sessionId !== activeSessionId) {
      respondRpcFailure(requestId, "session_mismatch");
      return;
    }
    const admittedSubmit = admitCreatorAgentSubmitTextV1(request.params.text);
    if (admittedSubmit.kind === "rejected") {
      respondRpcFailure(requestId, "invalid_request");
      return;
    }
    const predecessor = activeRun;
    const descriptorBeforeDrain = workspaceRuntime.getCurrentDescriptor();
    const matchesCurrentWorkspace = descriptorBeforeDrain !== null &&
      descriptorBeforeDrain.programId === execution.programId &&
      descriptorBeforeDrain.workspaceId === execution.workspaceId &&
      descriptorBeforeDrain.workspaceSessionId === execution.workspaceSessionId;
    const followsUnpublishedPredecessorGeneration = predecessor !== null &&
      !predecessor.terminal &&
      predecessor.workspaceSessionId === execution.workspaceSessionId &&
      predecessor.admittedWorkspaceGeneration === execution.expectedGeneration;
    if (
      !matchesCurrentWorkspace ||
      (descriptorBeforeDrain.generation !== execution.expectedGeneration &&
        !followsUnpublishedPredecessorGeneration)
    ) {
      respondRpcFailure(requestId, "invalid_request");
      return;
    }
    if (predecessor !== null && !predecessor.terminal) {
      await requestRunFailure(predecessor, "replaced");
    }
    if (disposed || activeSessionId !== request.params.sessionId) return;
    const descriptorAfterDrain = workspaceRuntime.getCurrentDescriptor();
    if (
      descriptorAfterDrain === null ||
      descriptorAfterDrain.programId !== execution.programId ||
      descriptorAfterDrain.workspaceId !== execution.workspaceId ||
      descriptorAfterDrain.workspaceSessionId !== execution.workspaceSessionId
    ) {
      respondRpcFailure(requestId, "invalid_request");
      return;
    }
    const effectiveExecution = descriptorAfterDrain.generation === execution.expectedGeneration
      ? execution
      : Object.freeze({
        ...execution,
        expectedGeneration: descriptorAfterDrain.generation,
      });
    const runId = `sillyos.run.${String(nextRunId++)}`;
    const run = createRun(
      admittedSubmit.value,
      effectiveExecution,
      request.params.sessionId,
      runId,
    );
    if (run === null) {
      respondRpcFailure(requestId, "invalid_request");
      return;
    }
    activeRun = run;
    post(Object.freeze({
      revision: 1,
      kind: "rpc_response",
      requestId,
      ok: true,
      response: Object.freeze({ kind: "submitted", runId }),
    }));
    run.settlement = Promise.resolve().then(() => settleRun(run, admittedSubmit.value.text));
  };

  type WorkspaceRequestV1 = Extract<
    NonNullable<ReturnType<typeof admitBrowserPiWorkerInboundMessageV1>>,
    { kind: "workspace_request" }
  >;

  const handleWorkspaceRequest = async (message: WorkspaceRequestV1): Promise<void> => {
    if (!initialized || credentialKey === null) {
      respondWorkspaceFailure(message.requestId, "not_initialized");
      return;
    }
    const record = message.record;
    if (record.method === "open_workspace") {
      const result = workspaceRuntime.openWorkspace(record);
      if (result.kind === "rejected") {
        respondWorkspaceFailure(
          message.requestId,
          result.code === "workspace_busy" ? "workspace_busy" : "invalid_request",
        );
        return;
      }
      post(Object.freeze({
        revision: 1,
        kind: "workspace_response",
        requestId: message.requestId,
        ok: true,
        response: Object.freeze({
          method: "open_workspace",
          snapshot: workspaceSnapshotV1(result.descriptor, "open"),
        }),
      }));
      return;
    }
    if (record.method === "close_workspace") {
      const run = activeRun;
      if (run !== null && !run.terminal && run.workspaceSessionId === record.workspaceSessionId) {
        await requestRunFailure(run, "cancelled");
      }
      const result = await workspaceRuntime.closeWorkspace(record.workspaceSessionId);
      if (result.kind === "rejected") {
        respondWorkspaceFailure(message.requestId, "workspace_mismatch");
        return;
      }
      post(Object.freeze({
        revision: 1,
        kind: "workspace_response",
        requestId: message.requestId,
        ok: true,
        response: Object.freeze({
          method: "close_workspace",
          snapshot: workspaceSnapshotV1(result.descriptor, "closed"),
        }),
      }));
      return;
    }
    const descriptor = workspaceRuntime.getDescriptor(record.workspaceSessionId);
    if (descriptor === null) {
      respondWorkspaceFailure(message.requestId, "workspace_mismatch");
      return;
    }
    if (record.method === "acknowledge_workspace_receipts") {
      const acknowledged = workspaceRuntime.acknowledgeMutationRecords(record);
      if (acknowledged.kind === "rejected") {
        respondWorkspaceFailure(message.requestId, "receipt_sequence_invalid");
        return;
      }
      const current = workspaceRuntime.getCurrentDescriptor();
      post(Object.freeze({
        revision: 1,
        kind: "workspace_response",
        requestId: message.requestId,
        ok: true,
        response: Object.freeze({
          method: "acknowledge_workspace_receipts",
          throughSequence: acknowledged.throughSequence,
          snapshot: workspaceSnapshotV1(
            descriptor,
            current?.workspaceSessionId === descriptor.workspaceSessionId ? "open" : "closed",
          ),
        }),
      }));
      return;
    }
    const current = workspaceRuntime.getCurrentDescriptor();
    post(Object.freeze({
      revision: 1,
      kind: "workspace_response",
      requestId: message.requestId,
      ok: true,
      response: Object.freeze({
        method: "query_workspace",
        snapshot: workspaceSnapshotV1(
          descriptor,
          current?.workspaceSessionId === descriptor.workspaceSessionId ? "open" : "closed",
        ),
      }),
    }));
  };

  const receive = (raw: unknown): void => {
    if (disposed) return;
    const message = admitBrowserPiWorkerInboundMessageV1(raw);
    if (message === null) {
      postProtocolFailure("invalid_message");
      return;
    }
    if (message.kind === "initialize") {
      if (initialized) {
        postProtocolFailure("already_initialized");
        return;
      }
      credentialKey = message.credential.value;
      configuredRuntime = message.runtime;
      initialized = true;
      post(Object.freeze({
        revision: 1,
        kind: "ready",
        requestId: message.requestId,
        runtime: message.runtime,
        distribution: browserPiDistributionIdentityV1,
      }));
      return;
    }
    if (message.kind === "workspace_request") {
      enqueue(() => handleWorkspaceRequest(message));
      return;
    }
    if (!initialized || credentialKey === null) {
      respondRpcFailure(message.requestId, "not_initialized");
      return;
    }
    const request = admitBrowserPiEngineRequestV1(message.record);
    if (request === null) {
      respondRpcFailure(message.requestId, "invalid_request");
      return;
    }
    if (request.method === "start") {
      enqueue(async () => {
        const predecessor = activeRun;
        if (predecessor !== null && !predecessor.terminal) {
          await requestRunFailure(predecessor, "replaced");
        }
        activeRun = null;
        activeSessionId = `sillyos.session.${String(nextSessionId++)}`;
        post(Object.freeze({
          revision: 1,
          kind: "rpc_response",
          requestId: message.requestId,
          ok: true,
          response: Object.freeze({ kind: "started", sessionId: activeSessionId }),
        }));
      });
      return;
    }
    if (activeSessionId === null || request.params.sessionId !== activeSessionId) {
      respondRpcFailure(message.requestId, "session_mismatch");
      return;
    }
    if (request.method === "cancel") {
      const run = activeRun;
      if (run === null || run.runId !== request.params.runId) {
        respondRpcFailure(message.requestId, "session_mismatch");
        return;
      }
      post(Object.freeze({
        revision: 1,
        kind: "rpc_response",
        requestId: message.requestId,
        ok: true,
        response: Object.freeze({ kind: "cancel_requested" }),
      }));
      void requestRunFailure(run, "cancelled");
      return;
    }
    if (!("execution" in message)) {
      respondRpcFailure(message.requestId, "invalid_request");
      return;
    }
    enqueue(() => handleSubmit(message.requestId, request, message.execution));
  };

  return {
    receive,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      credentialKey = null;
      configuredRuntime = null;
      initialized = false;
      const run = activeRun;
      activeRun = null;
      activeSessionId = null;
      if (run !== null && !run.terminal) {
        run.requestedFailure ??= "cancelled";
        run.agent.abort();
        void run.workspaceRun.abortAndDrain();
        run.agent.dispose();
      }
      void workspaceRuntime.forget();
    },
  };
}

export { creatorProgramRevisionToolNameV1 } from "./browser-pi-runtime-bridge.js";
